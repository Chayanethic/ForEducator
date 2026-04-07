import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    
    // 1. Safely extract with strict fallbacks
    const topic = body.topic || "General Subject";
    const category = body.category || "General";
    const difficulty = body.difficulty || "Medium";
    const numQuestions = Number(body.numQuestions) || 5;
    const duration = Number(body.duration) || 60;
    const isPublic = Boolean(body.isPublic);
    const allowCalculator = Boolean(body.allowCalculator);
    
    // ⚡ SMART ID ROUTING: Catches both Student and Educator requests natively
    const finalUserId = body.educatorId || body.studentId || "anonymous";
    const creatorRole = body.educatorId ? "educator" : "student";
    const status = body.status || (creatorRole === "student" ? "published" : "draft");

    if (!body.topic) {
      return NextResponse.json({ error: "Missing required field: topic" }, { status: 400 });
    }

    // 2. Build Prompt
    const textPrompt = `You are an expert ${category} professor creating an official mock exam.
    
    PARAMETERS:
    - Topic: ${topic}
    - Difficulty: ${difficulty}
    - Number of Questions: ${numQuestions}
    - Calculator Allowed: ${allowCalculator ? "Yes" : "No"}

    INSTRUCTIONS:
    1. Generate exactly ${numQuestions} high-quality questions on the topic.
    2. Mix Multiple Choice Questions (MCQ), Multiple Select Questions (MSQ), and Numerical Answer Type (NAT) appropriately.
    3. Ensure distractors represent common student misconceptions.
    4. Provide the correct answer/options for every question.
    5. Output a JSON array containing the questions using the schema below.

    SCHEMA:
    [
      {
        "type": "MCQ", 
        "text": "Question text here (use LaTeX for math, wrapped in $$)",
        "marks": 2,
        "negativeMarks": 0.66,
        "options": [
          { "id": "A", "text": "Option A text" },
          { "id": "B", "text": "Option B text" },
          { "id": "C", "text": "Option C text" },
          { "id": "D", "text": "Option D text" }
        ],
        "correctAnswer": "B", 
        "section": "Core Concept" 
      }
    ]`;

    // 3. Call Gemini API (Forcing application/json format)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json", 
      }
    });

    const result = await model.generateContent([{ text: textPrompt }]);
    let rawJson = result.response.text();
    
    // 4. ⚡ SAFE PARSING ⚡
    // We REMOVED the regex that was crashing the Educator's Math/CS exams.
    // We only strip accidental markdown code blocks. Gemini's native JSON mode handles the rest.
    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const questionsArray = JSON.parse(rawJson);

    if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
      throw new Error("AI failed to return a valid question array.");
    }

    // 5. Create a new Document in Firebase
    const newMockRef = doc(collection(db, "mock_exams")); 
    const mockId = newMockRef.id;

    // 6. BULLETPROOF PAYLOAD
    const mockDataPayload = {
      title: `${topic} Assessment`,
      topic: topic,
      category: category,
      difficulty: difficulty,
      duration: duration,
      isPublic: isPublic,
      allowCalculator: allowCalculator,
      totalQuestions: questionsArray.length,
      educatorId: finalUserId,  // This links the exam to whoever requested it (Student or Educator)
      creatorRole: creatorRole, // Keeps the database organized
      status: status,
      createdAt: new Date(),
      orgName: "OZONE Academy" 
    };

    await setDoc(newMockRef, mockDataPayload);

    // 7. BULLETPROOF SUBCOLLECTION
    const writePromises = questionsArray.map((q, i) => {
      const safeQuestion = {
        type: q.type || "MCQ",
        text: q.text || "Question generated without text.",
        marks: Number(q.marks) || 2,
        negativeMarks: Number(q.negativeMarks) || 0,
        correctAnswer: q.correctAnswer || "A",
        section: q.section || "General",
        order: i
      };

      if (q.options && Array.isArray(q.options)) {
        safeQuestion.options = q.options.map(opt => ({
          id: opt.id || "Unknown",
          text: opt.text || "Empty Option"
        }));
      }

      const qRef = doc(db, "mock_exams", mockId, "questions", `q_${i}`);
      return setDoc(qRef, safeQuestion);
    });
    
    await Promise.all(writePromises);

    // 8. Return Success to the Frontend
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