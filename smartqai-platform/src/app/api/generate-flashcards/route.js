import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { YoutubeTranscript } from 'youtube-transcript';
import fs from "fs";
import path from "path";
import os from "os";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

export async function POST(req) {
  let filePath = null;

  try {
    const formData = await req.formData();
    
    const mode = formData.get("mode");
    const difficulty = formData.get("difficulty");
    const numCards = parseInt(formData.get("numCards"), 10);
    const studentId = formData.get("studentId") || "anonymous";
    
    let promptContext = "";
    let deckTitle = "AI Generated Deck";
    let uploadedFileUri = null;
    let uploadedFileMimeType = null;

    // --- 1. EXTRACT DATA BASED ON MODE ---
    if (mode === "topic") {
      deckTitle = formData.get("topic");
      promptContext = `Topic: ${deckTitle}`;
    } 
    else if (mode === "youtube") {
      const youtubeUrl = formData.get("youtubeUrl");
      deckTitle = "YouTube Video Summary";
      try {
        const transcriptList = await YoutubeTranscript.fetchTranscript(youtubeUrl);
        promptContext = transcriptList.map(t => t.text).join(" ");
      } catch (err) {
        throw new Error("Could not extract YouTube transcript. Ensure the video has closed captions.");
      }
    } 
    else if (mode === "pdf") {
      const file = formData.get("file");
      if (!file) throw new Error("No PDF file uploaded.");
      
      deckTitle = file.name.replace('.pdf', '');
      
      // Save file temporarily to send to Google
      const tmpDir = os.tmpdir();
      filePath = path.join(tmpDir, `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, buffer);

      // Upload directly to Gemini to save server RAM
      const uploadResponse = await fileManager.uploadFile(filePath, {
        mimeType: "application/pdf",
        displayName: deckTitle,
      });
      
      uploadedFileUri = uploadResponse.file.uri;
      uploadedFileMimeType = uploadResponse.file.mimeType;
      promptContext = `[USER INSTRUCTION: Extract concepts from the attached PDF document.]`;
    }

    // --- 2. CALL GEMINI 2.5 FLASH ---
    const safeContext = promptContext.substring(0, 150000);
    const textPrompt = `You are an expert academic tutor. Generate a high-yield active recall flashcard deck.
    Mode: ${mode} | Difficulty: ${difficulty} | Target Cards: ${numCards}
    
    CONTEXT:
    ${safeContext}
    
    INSTRUCTIONS:
    1. Extract the most important, testable facts, definitions, and concepts.
    2. Format as Question/Answer pairs.
    3. Return ONLY a raw JSON array. NO markdown blocks like \`\`\`json, NO conversational text.
    
    [
      { "front": "Question here", "back": "Answer here" }
    ]`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const generativeParts = [];
    if (uploadedFileUri) {
      generativeParts.push({ fileData: { mimeType: uploadedFileMimeType, fileUri: uploadedFileUri } });
    }
    generativeParts.push({ text: textPrompt });

    const result = await model.generateContent(generativeParts);
    let rawJson = result.response.text();
    
    // Clean up JSON safely
    const match = rawJson.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (match) {
      rawJson = match[0];
    } else {
      rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    const flashcards = JSON.parse(rawJson);

    // --- 3. STRICT FIREBASE SAVING ---
    // Pre-generate ID to avoid race conditions
    const newDeckRef = doc(collection(db, "flashcard_decks"));
    const deckId = newDeckRef.id;

    await setDoc(newDeckRef, {
      title: deckTitle,
      mode: mode,
      difficulty: difficulty,
      cardCount: flashcards.length,
      createdAt: new Date(),
      studentId: studentId
    });

    // Wait for ALL cards to save before returning success
    const writePromises = flashcards.map((card, i) => {
      const cardRef = doc(db, "flashcard_decks", deckId, "cards", `card_${i}`);
      return setDoc(cardRef, {
        ...card,
        order: i,
        masteryLevel: 0 
      });
    });
    
    await Promise.all(writePromises);

    // Clean up temp file
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return NextResponse.json({ success: true, deckId: deckId, title: deckTitle, count: flashcards.length });

  } catch (error) {
    console.error("Flashcard Generation Error:", error);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); // Cleanup on error
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}