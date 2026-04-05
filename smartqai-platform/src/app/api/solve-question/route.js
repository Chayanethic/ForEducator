import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const { question, type, options } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.1, // Low temperature for strict mathematical accuracy
        responseMimeType: "application/json",
      }
    });

    const optionsText = options && options.length > 0 
      ? options.map(o => `Option ${o.id}: ${o.text}`).join(", ") 
      : "None (This is a Numerical Answer Type)";

    const prompt = `
      You are an expert academic solver.
      
      Question: "${question}"
      Question Type: ${type} (MCQ = Single Correct, MSQ = Multiple Correct, NAT = Numerical)
      Options provided: ${optionsText}

      YOUR MISSION:
      1. Provide a step-by-step detailed explanation of how to solve this. Use LaTeX formatting wrapped in $ or $$ for math formulas.
      2. Identify the correct answer. 
         - If it's an MCQ, return the exact ID string ("A", "B", "C", or "D").
         - If it's an MSQ, return a JSON array of ID strings (e.g., ["A", "C"]).
         - If it's a NAT (Numerical), return the exact numerical value as a string (e.g., "4.5").

      Return STRICTLY in this JSON format:
      {
        "explanation": "Step 1: ... \n\n Step 2: ... \n\n Therefore the answer is...",
        "correctAnswerId": "B" 
      }
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    let data = JSON.parse(responseText);

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("SOLVE QUESTION ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}