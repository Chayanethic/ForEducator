import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Gemini API using the environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to pause execution (for our retry loop)
const delay = (ms) => new Promise(res => setTimeout(res, ms));

export async function POST(req) {
  try {
    const { topic, numQuestions } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const questionCount = numQuestions || 10;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `Create a multiple-choice quiz about "${topic}" with ${questionCount} questions. 
    For each question, provide 4 options with only one correct answer.
    
    You must respond using this exact JSON schema:
    [
      {
        "question": "Question text here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": 2
      }
    ]`;

    let result;
    let retries = 3; // We will try 3 times before giving up

    // ⚡ RETRY LOOP FOR 503 ERRORS ⚡
    while (retries > 0) {
      try {
        result = await model.generateContent(prompt);
        break; // Success! Break out of the retry loop.
      } catch (e) {
        if (e.message?.includes('503') || e.status === 503) {
          retries -= 1;
          if (retries === 0) throw e; // If we run out of retries, trigger the fallback below
          console.warn(`[Gemini API] 503 Server Busy. Retrying in 2 seconds... (${retries} retries left)`);
          await delay(2000); // Wait 2 seconds before asking Google again
        } else {
          throw e; // If it's a 400 or 401 (bad API key), fail immediately
        }
      }
    }

    const text = await result.response.text();
    const quizData = JSON.parse(text);

    return NextResponse.json({ questions: quizData }, { status: 200 });

  } catch (error) {
    console.error('Error generating quiz with Gemini:', error);
    
    // ⚡ FALLBACK: IF GOOGLE IS COMPLETELY DOWN, DON'T BREAK THE GAME ⚡
    // Send back placeholder questions so the UI continues working smoothly.
    const fallbackQuestions = Array.from({ length: 5 }).map((_, i) => ({
      question: `Google AI is currently busy. This is a fallback question about ${topic} (#${i + 1}). Which option is correct?`,
      options: ["Correct Option", "Wrong Option 1", "Wrong Option 2", "Wrong Option 3"],
      correctAnswer: 0
    }));

    // We still return a 200 OK so the frontend game launches, 
    // but the questions will be these safe fallbacks instead of crashing.
    return NextResponse.json({ 
      questions: fallbackQuestions, 
      warning: "Google AI was busy, used fallback questions." 
    }, { status: 200 });
  }
}