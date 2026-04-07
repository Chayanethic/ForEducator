import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    
    // 1. Extract the new fields from the Educator Frontend payload
    const { 
      topic, 
      category, 
      difficulty, 
      numQuestions, 
      duration, 
      isPublic = false, 
      allowCalculator = false, 
      educatorId = "anonymous",
      status = "draft"
    } = body;

    if (!topic || !numQuestions) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2. Build a highly specific Prompt for Gemini 2.5 Flash
    const textPrompt = `You are an expert ${category} professor creating an official mock exam.
    
    PARAMETERS:
    - Topic: ${topic}
    - Difficulty: ${difficulty}
    - Number of Questions: ${numQuestions}
    - Calculator Allowed: ${allowCalculator ? "Yes" : "No"}

    INSTRUCTIONS:
    1. Generate exactly ${numQuestions} high-quality questions on the topic.
    2. Mix Multiple Choice Questions (MCQ), Multiple Select Questions (MSQ), and Numerical Answer Type (NAT) appropriately.
    3. Ensure distractors (wrong options) represent common student misconceptions.
    4. Provide the correct answer/options for every question.
    5. Return ONLY a valid, raw JSON array. DO NOT wrap it in \`\`\`json markdown blocks.

    JSON SCHEMA REQUIREMENT:
    [
      {
        "type": "MCQ", // Can be MCQ, MSQ, or NAT
        "text": "Question text here (use LaTeX for math, wrapped in $$)",
        "marks": 2, // 1 or 2
        "negativeMarks": 0.66,
        "options": [ // Only for MCQ/MSQ
          { "id": "A", "text": "Option A text" },
          { "id": "B", "text": "Option B text" },
          { "id": "C", "text": "Option C text" },
          { "id": "D", "text": "Option D text" }
        ],
        "correctAnswer": "B", // For MCQ (String), MSQ (Array of Strings like ["A", "C"]), or NAT (String of number)
        "section": "Core Concept" // General section tag
      }
    ]`;

    // 3. Call Gemini API
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([{ text: textPrompt }]);
    let rawJson = result.response.text();
    
    // 4. Safely Parse Gemini's Response
    const match = rawJson.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (match) {
      rawJson = match[0];
    } else {
      rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    }
    
    const questionsArray = JSON.parse(rawJson);

    if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
      throw new Error("AI failed to return a valid question array.");
    }

    // 5. Create a new Document in Firebase
    const newMockRef = doc(collection(db, "mock_exams")); // Ensure this matches the collection name in your app
    const mockId = newMockRef.id;

    // Save the configuration and metadata to the main document
    await setDoc(newMockRef, {
      title: `${topic} Assessment`,
      topic: topic,
      category: category,
      difficulty: difficulty,
      duration: duration,
      isPublic: isPublic,
      allowCalculator: allowCalculator,
      totalQuestions: questionsArray.length,
      educatorId: educatorId,
      status: status,
      createdAt: new Date(),
      orgName: "OZONE Academy" // You can make this dynamic later
    });

    // Save the actual questions into a subcollection (Highly recommended for large exams)
    const writePromises = questionsArray.map((q, i) => {
      const qRef = doc(db, "mock_exams", mockId, "questions", `q_${i}`);
      return setDoc(qRef, {
        ...q,
        order: i
      });
    });
    
    await Promise.all(writePromises);

    // 6. Return Success to the Frontend
    return NextResponse.json({ 
      success: true, 
      mockId: mockId, 
      questions: questionsArray 
    });

  } catch (error) {
    console.error("Exam Generation Backend Error:", error);
    return NextResponse.json({ error: "Failed to generate exam using AI. Please try again." }, { status: 500 });
  }
}