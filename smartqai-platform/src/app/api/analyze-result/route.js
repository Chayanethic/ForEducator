import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const maxDuration = 60; 

export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY in environment variables." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const body = await request.json();
    
    const { answers, detailedAnswers, examTitle, examCategory } = body;
    const examData = detailedAnswers || answers;

    if (!examData || examData.length === 0) {
      return NextResponse.json({ error: "No exam data provided for analysis." }, { status: 400 });
    }

    // Compress data for the AI
    const performanceData = examData.map((ans, index) => {
      const qText = (ans.questionText || ans.question?.text || "Unknown Question").substring(0, 200);
      const status = ans.status || (ans.isUnattempted ? "UNATTEMPTED" : (ans.isCorrect ? "CORRECT" : "INCORRECT"));
      return `Q${index + 1}: ${qText} | Status: ${status}`;
    }).join("\n");

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { 
        temperature: 0.2, 
        responseMimeType: "application/json" 
      }
    });

    // UPGRADED MASTER PROMPT
    const prompt = `
      You are an expert Academic AI Data Analyst evaluating a student's performance on the exam "${examTitle}" (${examCategory}).

      Here is the student's exact performance data on every question:
      ${performanceData}

      YOUR MISSION:
      1. Write a 2-sentence "overallAssessment" summarizing their performance, praising their effort, and setting a tone for improvement.
      2. Analyze the text of every question to identify its core academic Subject or micro-Topic.
      3. Group the questions into 3 to 6 logical thematic categories.
      4. Calculate the EXACT percentage score for each category ((Correct / Total) * 100). "UNATTEMPTED" and "INCORRECT" earn 0 points.
      5. Assign a UI color based on the score: 80-100 = "emerald", 50-79 = "amber", 0-49 = "rose".
      6. For each category, identify their "strength" (what they got right).
      7. For each category, identify their "weakness" (what they got wrong/skipped).
      8. For each category, provide a "recommendedAction" (a highly specific, actionable study instruction, e.g., "Read chapter 4 on Op-Amps and practice nodal analysis").

      RETURN STRICTLY THIS JSON FORMAT:
      {
        "overallAssessment": "Your overall text here...",
        "topics": [
          {
            "name": "Signals & Systems",
            "score": 45,
            "color": "rose",
            "strength": "Understands basic classifications of signals.",
            "weakness": "Struggles with Z-Transforms and Region of Convergence.",
            "recommendedAction": "Review Z-Transform properties and solve 10 inverse transform practice problems."
          }
        ]
      }
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let diagnosticReport = {};
    try {
      diagnosticReport = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", responseText);
      throw new Error("AI returned malformed diagnostic data.");
    }

    return NextResponse.json({ diagnostics: diagnosticReport }, { status: 200 });

  } catch (error) {
    console.error("DIAGNOSTIC API ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to generate diagnostics" }, { status: 500 });
  }
}