import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60; // Allow AI time to build the schedule

export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const { exam, timeframe, subjects, topics } = await request.json();

    if (!exam || !timeframe || !subjects || subjects.length === 0) {
      return NextResponse.json({ error: "Please provide exam, timeframe, and at least one subject." }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
    });

    const prompt = `
      You are an elite academic planner and AI tutor for students preparing for the "${exam}" exam.
      
      The student has requested a highly optimized ${timeframe}-day study schedule.
      Target Subjects: ${subjects.join(", ")}
      Specific Topics to emphasize: ${topics || "General comprehensive review"}

      YOUR MISSION:
      Create a strict, day-by-day study plan. For each day, provide a motivational theme, the exact topics they should study, and the type of mock exam they should take to validate their learning.

      OUTPUT STRICTLY A JSON ARRAY. Format exactly like this:
      [
        {
          "day": 1,
          "theme": "Building the Foundation",
          "studyFocus": "Read chapter 1 of Analog Circuits. Focus on MOSFET Biasing.",
          "mockType": "15-Minute Topic Quiz on Biasing"
        },
        {
          "day": 2,
          ...
        }
      ]
      Ensure the array contains exactly ${timeframe} items (one for each day).
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    let cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const studyPlan = JSON.parse(cleanJson);
    return NextResponse.json({ plan: studyPlan }, { status: 200 });

  } catch (error) {
    console.error("PLANNER API ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}