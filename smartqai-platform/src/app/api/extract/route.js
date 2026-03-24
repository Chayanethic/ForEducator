import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    // 1. Safety Check: Is the API key actually loaded?
    if (!process.env.GEMINI_API_KEY) {
      console.error("CRITICAL ERROR: GEMINI_API_KEY is missing from .env.local");
      return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const formData = await request.formData();
    const pdfFile = formData.get("pdf");

    if (!pdfFile) {
      return NextResponse.json({ error: "No PDF uploaded" }, { status: 400 });
    }

    const arrayBuffer = await pdfFile.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    
    const prompt = `
      You are an expert exam parser. Read the attached PDF.
      If a question or an option refers to a circuit, diagram, graph, or image, set "hasImage" to true.
      Return strictly a JSON array. Do not use markdown blocks.
      Format:
      [
        {
          "text": "Question text...",
          "type": "MCQ",
          "hasImage": true, // Set true ONLY if a diagram/figure belongs to this question
          "imageUrl": "",
          "options": [
             {"id": "A", "text": "Option text", "hasImage": false, "imageUrl": ""}
          ],
          "correctOption": "A"
        }
      ]
    `;


    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Data,
          mimeType: "application/pdf",
        },
      },
      prompt,
    ]);

    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsedQuestions = JSON.parse(cleanJson);

    return NextResponse.json({ questions: parsedQuestions }, { status: 200 });
  } catch (error) {
    // 2. Safely catch the error and return it as JSON
    console.error("GEMINI EXTRACTION ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to process PDF with AI" }, { status: 500 });
  }
}