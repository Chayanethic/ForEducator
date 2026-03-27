import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

export const maxDuration = 60; 

export async function POST(request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing Gemini API Key" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const formData = await request.formData();
    
    // This could be a PDF OR a Camera Image!
    const uploadedFile = formData.get("pdf"); 
    const generateExplanations = formData.get("generateExplanations") === "true";
    
    if (!uploadedFile) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const isImage = uploadedFile.type.startsWith("image/");
    let aiPayload = [];

    // ==========================================
    // ROUTE A: CAMERA SCAN (IMAGE) -> Direct to Gemini Vision
    // ==========================================
    if (isImage) {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");
      
      aiPayload.push({
        inlineData: {
          data: base64Data,
          mimeType: uploadedFile.type
        }
      });
    } 
    // ==========================================
    // ROUTE B: PDF FILE -> LlamaParse Engine
    // ==========================================
    else {
      if (!process.env.LLAMA_CLOUD_API_KEY) return NextResponse.json({ error: "Missing LlamaCloud API Key" }, { status: 500 });

      const arrayBuffer = await uploadedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const totalPages = pdfDoc.getPageCount();

      let startPage = parseInt(formData.get("startPage"), 10) || 1;
      let endPage = parseInt(formData.get("endPage"), 10) || startPage;
      
      startPage = Math.max(1, Math.min(startPage, totalPages));
      endPage = Math.max(startPage, Math.min(endPage, totalPages));

      const subPdf = await PDFDocument.create();
      for (let i = startPage - 1; i <= endPage - 1; i++) {
          const [copiedPage] = await subPdf.copyPages(pdfDoc, [i]);
          subPdf.addPage(copiedPage);
      }
      
      const subPdfBytes = await subPdf.save();
      const blob = new Blob([subPdfBytes], { type: "application/pdf" });

      const llamaFormData = new FormData();
      llamaFormData.append("file", blob, "exam.pdf");

      const uploadRes = await fetch("https://api.cloud.llamaindex.ai/api/v1/parsing/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.LLAMA_CLOUD_API_KEY}` },
        body: llamaFormData
      });

      if (!uploadRes.ok) throw new Error("LlamaParse upload failed.");
      const uploadData = await uploadRes.json();
      const jobId = uploadData.id;

      let isCompleted = false;
      let attemptLlama = 0;
      while (!isCompleted && attemptLlama < 15) { 
        await new Promise(r => setTimeout(r, 3000)); 
        const statusRes = await fetch(`https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}`, {
          headers: { "Authorization": `Bearer ${process.env.LLAMA_CLOUD_API_KEY}` }
        });
        const statusData = await statusRes.json();
        
        if (statusData.status === "SUCCESS") isCompleted = true;
        else if (statusData.status === "ERROR") throw new Error("LlamaParse failed to read this PDF.");
        attemptLlama++;
      }

      if (!isCompleted) throw new Error("LlamaParse took too long. Try extracting fewer pages at once.");

      const markdownRes = await fetch(`https://api.cloud.llamaindex.ai/api/v1/parsing/job/${jobId}/result/markdown`, {
        headers: { "Authorization": `Bearer ${process.env.LLAMA_CLOUD_API_KEY}` }
      });
      const markdownData = await markdownRes.json();
      
      aiPayload.push(`RAW EXAM MARKDOWN:\n"""\n${markdownData.markdown}\n"""`);
    }

    // ==========================================
    // THE AI FORMATTER (With Anti-Skipping Directives)
    // ==========================================
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash", 
      generationConfig: { 
        maxOutputTokens: 8192, 
        temperature: 0.1, 
        responseMimeType: "application/json" 
      }
    });

    const prompt = `
      You are an expert exam extraction AI. I am providing you with an exam document.
      Your job is to extract the questions into a strict JSON array.

      CRITICAL ORDERING & ANTI-SKIPPING RULES (STRICTLY ENFORCED):
      1. You MUST extract EVERY SINGLE QUESTION in STRICT NUMERICAL ORDER (e.g., Q1, then Q2, then Q3).
      2. DO NOT SKIP ANY NUMBERS. If you extract Q1 and Q3, you have failed. You MUST find Q2 and extract it before Q3.
      3. TWO-COLUMN LAYOUTS: Exam papers often use two columns. If the numbers jump suddenly, read the other column!
      4. Ensure the final JSON array is sorted sequentially by question number.

      ADVANCED MATH & LATEX RULES:
      1. Use strict, textbook-quality LaTeX for all equations.
      2. NEVER use inline slashes for complex fractions. Instead of $V_{GS}/2.1 V_t$, you MUST use \\frac{V_{GS}}{2.1 V_t}.
      3. Use \\left( and \\right) for scaling parentheses.
      4. Always use \\times for multiplication, never "x".
      5. Escape all JSON backslashes (e.g., \\\\frac).

      DATA STRUCTURE RULES:
      1. Extract ALL questions.
      2. type: "MCQ", "MSQ", or "NAT".
      3. options: Provide 4 options. If NAT, output [].
      4. correctAnswer: ID of correct option (A,B,C,D) or numeric answer.
      5. explanation: ${generateExplanations ? 'Provide a brief step-by-step solution.' : 'Hardcode as ""'}
      6. hasImage: false, imageUrl: ""

      Output ONLY a valid JSON array of objects.
    `;

    // Add prompt to the beginning of the payload array
    aiPayload.unshift(prompt);

    // ==========================================
    // BULLETPROOF RETRY & JSON SANITIZER
    // ==========================================
    const MAX_RETRIES = 3;
    let attempt = 0;
    let cleanJson = "";

    while (attempt < MAX_RETRIES) {
      try {
        const result = await model.generateContent(aiPayload);
        cleanJson = result.response.text().trim();
        break; 
      } catch (error) {
        attempt++;
        if ((error.message?.includes("503") || error.message?.includes("429")) && attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1500));
        } else {
          throw error;
        }
      }
    }

    if (!cleanJson) throw new Error("AI servers are overloaded.");

    // THE JSON HEALER: Fixes missing quotes and trailing commas that crash JSON.parse
    cleanJson = cleanJson.replace(/```json/gi, "").replace(/```/g, "").trim();
    
    const firstBracket = cleanJson.indexOf('[');
    const lastBracket = cleanJson.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      cleanJson = cleanJson.substring(firstBracket, lastBracket + 1);
    }

    // Fix trailing commas (The #1 cause of the "Expected double-quoted property" error)
    cleanJson = cleanJson.replace(/,\s*([\]}])/g, '$1');

    let parsedQuestions = [];
    try {
      parsedQuestions = JSON.parse(cleanJson);
    } catch (e) {
      console.error("AI format failed. Raw output:", cleanJson);
      throw new Error("AI returned malformed data. Try extracting 1-2 pages at a time.");
    }

    return NextResponse.json({ questions: parsedQuestions }, { status: 200 });

  } catch (error) {
    console.error("EXTRACTION PIPELINE ERROR:", error);
    return NextResponse.json({ error: error.message || "Failed to process document." }, { status: 500 });
  }
}