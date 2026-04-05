import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const { question } = await request.json();

    if (!question || question.trim() === "") {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7, // Slightly higher temperature for creative, tricky distractors
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      You are an expert exam creator. I will give you a question.
      Your task is to generate exactly 4 plausible answer options for a Multiple Choice Question (MCQ).
      - One option MUST be the objectively correct answer.
      - The other three MUST be highly realistic distractors (common misconceptions, common calculation errors, or related concepts).
      - Keep the text concise. Do not label which one is correct.
      
      Question: "${question}"
      
      Return STRICTLY a JSON array containing 4 strings. 
      Example: ["42", "24", "12", "0"]
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    // Clean up any accidental markdown formatting from the AI
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    let options = JSON.parse(responseText);

    if (!Array.isArray(options) || options.length !== 4) {
         throw new Error("AI did not return exactly 4 options.");
    }

    return NextResponse.json({ options }, { status: 200 });

  } catch (error) {
    console.error("GENERATE OPTIONS ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}