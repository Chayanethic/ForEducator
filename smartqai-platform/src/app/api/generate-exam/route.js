import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { topic, difficulty, numQuestions, studentId } = await req.json();

    // Enforce strict JSON structure and require a "subTopic" for later strength/weakness analysis
    const prompt = `You are an expert academic examiner. Create a mock exam about "${topic}".
    Difficulty Level: ${difficulty}.
    Total Questions: ${numQuestions}.
    
    Return ONLY a valid JSON array of objects. Do NOT wrap the response in markdown blocks like \`\`\`json. 
    Each object MUST have this exact structure:
    {
      "text": "The question text here",
      "type": "MCQ",
      "marks": 2,
      "negativeMarks": 0.66,
      "options": [
        { "id": "A", "text": "Option A text" },
        { "id": "B", "text": "Option B text" },
        { "id": "C", "text": "Option C text" },
        { "id": "D", "text": "Option D text" }
      ],
      "correctAnswer": "A",
      "explanation": "Brief explanation of the correct answer.",
      "subTopic": "A 1-2 word specific sub-concept this tests (e.g., Thermodynamics, Kinetics, React Hooks)"
    }`;

    // Utilizing the requested Gemini 2.5 Flash model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const result = await model.generateContent(prompt);
    let rawJson = result.response.text();
    
    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(rawJson);

    // 1. Create the Mock Exam Document in Firestore
    const mockRef = await addDoc(collection(db, "mocks"), {
      title: `AI Mock: ${topic}`,
      difficulty: difficulty,
      duration: numQuestions * 2, // Allocating 2 mins per generated question
      createdAt: new Date(),
      createdBy: studentId,
      isAIGenerated: true,
      allowCalculator: true
    });

    // 2. Add questions to the subcollection so your existing Exam Viewer can read them
    for (let i = 0; i < questions.length; i++) {
      const qData = { ...questions[i], section: "AI Generated" };
      await setDoc(doc(db, "mocks", mockRef.id, "questions", `q${i}`), qData);
    }

    return NextResponse.json({ success: true, mockId: mockRef.id, questions });

  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ success: false, error: "Failed to generate exam using Gemini. Please try again." }, { status: 500 });
  }
}