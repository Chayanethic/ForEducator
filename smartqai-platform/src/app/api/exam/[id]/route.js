import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function GET(request, { params }) {
  try {
    // Await params in newer Next.js versions
    const { id: mockId } = await params; 
    
    if (!mockId) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // 1. Try to get from Redis
    try {
      const cached = await redis.get(`exam:${mockId}`);
      if (cached) {
        return NextResponse.json(cached, { status: 200 });
      }
    } catch (redisError) {
      console.error("Redis unreachable, falling back to Firebase:", redisError);
    }

    // 2. Fetch from Firebase
    const mockSnap = await getDoc(doc(db, "mocks", mockId));
    if (!mockSnap.exists()) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const examData = mockSnap.data();
    const qSnap = await getDocs(collection(db, "mocks", mockId, "questions"));
    const questions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const payload = { examData, questions };

    // 3. Save to Redis for next time
    try {
      await redis.set(`exam:${mockId}`, payload, { ex: 86400 });
    } catch (e) { console.error("Failed to cache:", e); }

    return NextResponse.json(payload, { status: 200 });

  } catch (error) {
    console.error("API ROUTE ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}