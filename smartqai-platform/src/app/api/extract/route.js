import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

// Allow the server more time to process during high-traffic periods
export const maxDuration = 60; 

export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const formData = await request.formData();
    const pdfFile = formData.get("pdf");
    const generateExplanations = formData.get("generateExplanations") === "true";
    
    if (!pdfFile) return NextResponse.json({ error: "No PDF uploaded" }, { status: 400 });

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const totalPages = pdfDoc.getPageCount();

    let startPage = parseInt(formData.get("startPage"), 10) || 1;
    let endPage = parseInt(formData.get("endPage"), 10) || startPage;
    
    startPage = Math.max(1, Math.min(startPage, totalPages));
    endPage = Math.max(startPage, Math.min(endPage, totalPages));

    const subPdf = await PDFDocument.create();
    const pageIndices = [];
    for (let i = startPage - 1; i <= endPage - 1; i++) {
        pageIndices.push(i);
    }
    
    if (pageIndices.length === 0) {
        return NextResponse.json({ error: "Invalid page range selected." }, { status: 400 });
    }

    const copiedPages = await subPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach((page) => subPdf.addPage(page));

    const subPdfBytes = await subPdf.save();
    const base64Data = Buffer.from(subPdfBytes).toString("base64");

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { maxOutputTokens: 8192, temperature: 0.1, responseMimeType: "application/json" }
    });

    const prompt = `
      You are an expert exam extraction AI. You have been provided EXACTLY ${pageIndices.length} page(s) of an exam document.

      CRITICAL MISSION - DO NOT MISS ANY QUESTIONS:
      1. Extract EVERY SINGLE QUESTION on these pages. There are often 2 to 10 questions per page. YOU MUST FIND ALL OF THEM.
      2. If you only extract 1 question when there are more, you will fail the mission. Keep looking down the page until the very bottom.
      3. Look for sequential numbering (e.g., Q.1, Q.2, Q.3) and extract them sequentially.
      4. IGNORE standard page headers ("GATE 2021", etc.) and footers.
      5. If a page ONLY has a title or syllabus, return [].

      DATA STRUCTURE RULES:
      1. type: Categorize as "MCQ", "MSQ", or "NAT".
      2. options: If MCQ/MSQ, provide 4 options. If NAT, output [].
      3. hasImage: Set to true if the question refers to a diagram.
      4. correctAnswer: If you can solve it, put the answer here.
      ${generateExplanations ? '5. explanation: Provide a brief solution.' : '5. explanation: Hardcode as "".'}

      You MUST output a valid JSON array. Example of extracting MULTIPLE questions:
      [
        {
          "text": "What is the speed of light?",
          "type": "MCQ",
          "hasImage": false,
          "imageUrl": "",
          "options": [
             {"id": "A", "text": "3x10^8 m/s", "hasImage": false, "imageUrl": ""},
             {"id": "B", "text": "3x10^5 m/s", "hasImage": false, "imageUrl": ""}
          ],
          "correctAnswer": "A",
          "explanation": ""
        },
        {
          "text": "What is the capital of France?",
          "type": "MCQ",
          "hasImage": false,
          "imageUrl": "",
          "options": [
             {"id": "A", "text": "London", "hasImage": false, "imageUrl": ""},
             {"id": "B", "text": "Paris", "hasImage": false, "imageUrl": ""}
          ],
          "correctAnswer": "B",
          "explanation": ""
        }
      ]
    `;

    // --- UPGRADED: 5 Retries with Longer Delays ---
    const MAX_RETRIES = 5;
    let attempt = 0; let result = null;
    
    while (attempt < MAX_RETRIES) {
      try {
        result = await model.generateContent([{ inlineData: { data: base64Data, mimeType: "application/pdf" } }, prompt]);
        break; 
      } catch (e) {
        attempt++;
        if (e.message.includes("503") || e.message.includes("429")) {
          if (attempt >= MAX_RETRIES) {
            throw new Error("Google's AI servers are experiencing extremely high global demand right now. Please extract 1 page at a time.");
          }
          // Wait 3s, then 6s, then 12s...
          const delayTime = Math.pow(2, attempt) * 1500; 
          console.warn(`[WARNING] Gemini Server Busy (503). Retrying in ${delayTime/1000}s... (Attempt ${attempt}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delayTime));
        } else {
          throw e; 
        }
      }
    }

    const responseText = result.response.text();
    let cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let parsedQuestions = [];
    try {
      parsedQuestions = JSON.parse(cleanJson);
    } catch (e) {
        let braceDepth = 0; let inString = false; let isEscaped = false; let startIdx = -1;
        for (let i = 0; i < cleanJson.length; i++) {
            let char = cleanJson[i];
            if (isEscaped) { isEscaped = false; continue; }
            if (char === '\\') { isEscaped = true; continue; }
            if (char === '"') { inString = !inString; continue; }
            if (!inString) {
                if (char === '{') {
                    if (braceDepth === 0) startIdx = i;
                    braceDepth++;
                } else if (char === '}') {
                    braceDepth--;
                    if (braceDepth === 0 && startIdx !== -1) {
                        try { parsedQuestions.push(JSON.parse(cleanJson.substring(startIdx, i + 1))); } catch (err) {}
                        startIdx = -1;
                    }
                }
            }
        }
    }

    return NextResponse.json({ questions: parsedQuestions }, { status: 200 });

  } catch (error) {
    console.error("GEMINI EXTRACTION ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to process PDF. Try extracting fewer pages." }, { status: 500 });
  }
}