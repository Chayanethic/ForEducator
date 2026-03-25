import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Allow the AI some time to think and process the entire exam
export const maxDuration = 60; 

export async function POST(request) {
  try {
    // 1. Check for API Key
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY in environment variables." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const body = await request.json();
    const { answers, examTitle, examCategory } = body;

    if (!answers || answers.length === 0) {
      return NextResponse.json({ error: "No exam data provided for analysis." }, { status: 400 });
    }

    // 2. Compress the Exam Data
    // We don't send heavy images or huge option arrays to the AI. 
    // We only send the question text and whether the student got it Right, Wrong, or Skipped it.
    const performanceData = answers.map((ans, index) => {
      const qText = ans.question?.text?.substring(0, 200) || "Unknown Question";
      
      let status = "UNATTEMPTED";
      if (!ans.isUnattempted) {
         status = ans.isCorrect ? "CORRECT" : "INCORRECT";
      }
      
      return `Q${index + 1}: ${qText} | Status: ${status}`;
    }).join("\n");

    // 3. Initialize Gemini 2.5 Flash for ultra-fast JSON generation
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { 
        temperature: 0.1, // Keep it highly analytical and mathematical
        responseMimeType: "application/json" // Force strict JSON output
      }
    });

    // 4. The Master Diagnostic Prompt
    const prompt = `
      You are an expert Academic AI Data Analyst evaluating a student's performance on the exam "${examTitle}" (${examCategory}).

      Here is the student's exact performance data on every question:
      ${performanceData}

      YOUR MISSION:
      1. Analyze the text of every question to identify its core academic Subject or micro-Topic.
      2. Group the questions into 3 to 6 logical thematic categories (e.g., "Analog Circuits", "Network Theory", "General Aptitude").
      3. Calculate the EXACT percentage score for each category.
         - Formula: (Number of CORRECT questions in this category / TOTAL questions in this category) * 100.
         - NOTE: "UNATTEMPTED" and "INCORRECT" both count against the student (they earn 0 points). Round to the nearest whole number.
      4. Assign a status based on the score:
         - 80% to 100% = "STRONG"
         - 50% to 79% = "AVERAGE"
         - 0% to 49% = "CRITICAL"
      5. Assign a UI color based on the status:
         - "STRONG" = "emerald"
         - "AVERAGE" = "amber"
         - "CRITICAL" = "rose"
      6. Identify the specific sub-concepts they failed at to list as their "weakness". Look at the specific questions they got INCORRECT or UNATTEMPTED. If they scored 100%, write "None".

      RETURN STRICTLY A JSON ARRAY. Format exactly like this:
      [
        {
          "name": "Signals & Systems",
          "score": 45,
          "status": "CRITICAL",
          "weakness": "Z-Transforms, Fourier Series",
          "color": "rose"
        },
        {
          "name": "Digital Logic",
          "score": 85,
          "status": "STRONG",
          "weakness": "None",
          "color": "emerald"
        }
      ]
    `;

    // 5. Generate and Parse the AI Report
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let diagnosticReport = [];
    try {
      diagnosticReport = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", responseText);
      throw new Error("AI returned malformed diagnostic data.");
    }

    // 6. Return to Frontend
    return NextResponse.json({ diagnostics: diagnosticReport }, { status: 200 });

  } catch (error) {
    console.error("DIAGNOSTIC API ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to generate diagnostics" }, { status: 500 });
  }
}