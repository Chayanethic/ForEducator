import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.error("CRITICAL ERROR: GEMINI_API_KEY is missing from .env.local");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const formData = await request.formData();
    const pdfFile = formData.get("pdf");
    
    const generateExplanations = formData.get("generateExplanations") === "true";

    if (!pdfFile) {
      return NextResponse.json({ error: "No PDF uploaded" }, { status: 400 });
    }

    const arrayBuffer = await pdfFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    // --- UPGRADED: Forcing the absolute Maximum Output Limit ---
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        maxOutputTokens: 8192, // Forces the AI to use its maximum output memory
        temperature: 0.1,      // Low temperature makes it strictly analytical and less likely to skip data
      }
    });

    // --- UPGRADED PROMPT: Explicit 100 Question Target ---
    const prompt = `
      You are an expert exam parser. Read the attached PDF and extract the exam questions.

      CRITICAL INSTRUCTION - EXHAUSTIVE EXTRACTION:
      You MUST extract EVERY SINGLE QUESTION present in the document, up to a maximum of 100 questions. 
      DO NOT stop early. DO NOT summarize. If there are 65 questions, output exactly 65 objects. If there are 100, output 100. 
      Scan every single page of the document until you reach the very end.

      INSTRUCTIONS:
      1. QUESTION TYPES: Categorize every question strictly as "MCQ", "MSQ", or "NAT".
      ${generateExplanations 
        ? '2. EXPLANATIONS: Provide a brief "explanation" for the correct answer.' 
        : '2. NO EXPLANATIONS: To save memory for processing up to 100 questions, DO NOT generate explanations. Set "explanation": "".'}
      3. IMAGES: Set "hasImage" to true if a question/option refers to a diagram.

      Return strictly a JSON array. Do not use markdown blocks.
      Format exactly like this:
      [
        {
          "text": "Question text...",
          "type": "MCQ",
          "hasImage": true,
          "imageUrl": "",
          "options": [
             {"id": "A", "text": "Option text", "hasImage": false, "imageUrl": ""}
          ],
          "correctAnswer": "A",
          "explanation": ${generateExplanations ? '"Brief explanation here"' : '""'}
        }
      ]
    `;

    const result = await model.generateContent([
      { inlineData: { data: base64Data, mimeType: "application/pdf" } },
      prompt,
    ]);

    const responseText = result.response.text();
    let cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Failsafe: If it hits the absolute 8192 limit and cuts off the very last bracket
    if (!cleanJson.endsWith("]")) {
       const lastBrace = cleanJson.lastIndexOf("}");
       if (lastBrace !== -1) {
           cleanJson = cleanJson.substring(0, lastBrace + 1) + "]";
       } else {
           cleanJson += "]";
       }
    }
    
    const parsedQuestions = JSON.parse(cleanJson);

    return NextResponse.json({ questions: parsedQuestions }, { status: 200 });
  } catch (error) {
    console.error("GEMINI EXTRACTION ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to process PDF with AI" }, { status: 500 });
  }
}