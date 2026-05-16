"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ⚡ IMPORT GUEST BLOCKER ⚡
import GuestBlocker from "@/components/GuestBlocker";

const LOADING_STEPS = [
  "Initializing Student Neural Engine...",
  "Analyzing core concepts and boundaries...",
  "Drafting personalized questions...",
  "Calibrating difficulty level...",
  "Structuring AI Action Plan...",
  "Finalizing Exam Package..."
];

export default function StudentAIExamGenerator() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // --- FORM STATE ---
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("Computer Science");
  const [difficulty, setDifficulty] = useState("Intermediate");
  
  const [numQuestions, setNumQuestions] = useState(10);
  const [isCustomQuestions, setIsCustomQuestions] = useState(false);
  
  const [duration, setDuration] = useState(30);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  
  // --- ENGINE STATE ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [generatedExam, setGeneratedExam] = useState(null);
  const [error, setError] = useState("");

  // --- RECENT EXAMS STATE ---
  const [recentExams, setRecentExams] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);

  // Fetch recent exams function
  const fetchRecentExams = async () => {
    if (!user?.id) {
        setIsLoadingRecent(false);
        return;
    }
    
    setIsLoadingRecent(true);
    try {
      const q = query(
        collection(db, "mock_exams"),
        where("educatorId", "==", user.id) // Students generating exams tag themselves as educatorId
      );
      const snap = await getDocs(q);
      const exams = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      exams.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setRecentExams(exams.slice(0, 6)); // Keep 6 most recent
    } catch (err) {
      console.error("Failed to fetch recent exams:", err);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  // Load recent exams on mount
  useEffect(() => {
    if (isLoaded) {
      fetchRecentExams();
    }
  }, [user, isLoaded]);

  // Cycle through loading messages
  useEffect(() => {
    let interval;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 1500); // Fast, snappy loading cycle for better UX
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // STEP 1: GENERATE EXAM (REAL OR SIMULATED)
  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic.trim()) {
      setError("Target topic is required.");
      return;
    }
    if (numQuestions < 1 || numQuestions > 50) {
      setError("Please select between 1 and 50 questions.");
      return;
    }
    if (duration < 5 || duration > 180) {
      setError("Duration must be between 5 and 180 minutes.");
      return;
    }
    
    setIsGenerating(true);
    setError("");
    setGeneratedExam(null);

    // ⚡ GUEST MODE SIMULATION: Bypasses API to save costs! ⚡
    if (!user) {
      setTimeout(() => {
        const dummyQuestions = Array.from({ length: numQuestions }).map((_, i) => ({
          text: `In the context of ${topic}, how does variable X affect the overall outcome in scenario ${i + 1}?`,
          options: [
            { id: "A", text: "It increases proportionally." },
            { id: "B", text: "It decreases inversely." },
            { id: "C", text: "It has no measurable effect." },
            { id: "D", text: "It causes a system overload." }
          ],
          correctAnswer: "A",
          explanation: "In guest mode, this is a placeholder explanation demonstrating the AI's intended output format."
        }));

        setGeneratedExam({
          mockId: "DEMO-STUDENT-EXAM",
          topic: topic,
          category: category,
          questions: dummyQuestions,
          duration: duration
        });
        
        setIsGenerating(false);
      }, 4500); // Wait 4.5 seconds to simulate AI generation
      return;
    }

    // ⚡ REAL AI GENERATION (For Logged In Students) ⚡
    try {
      const res = await fetch("/api/generate-exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          category,
          difficulty,
          numQuestions: Number(numQuestions),
          duration: Number(duration),
          isPublic: false, 
          allowCalculator: true,
          educatorId: user.id, // Student generates it for themselves
          status: "published"  // Ready to take immediately
        })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to generate exam.");
      
      setGeneratedExam({
        mockId: data.mockId,
        topic: topic,
        category: category,
        questions: data.questions,
        duration: duration
      });

      // Refresh recent exams so the new one appears immediately
      fetchRecentExams();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // PDF Generator for newly created exam
  const downloadPDF = () => {
    if (!generatedExam) return;
    generatePDFDocument(generatedExam.topic, difficulty, duration, generatedExam.questions);
  };

  // PDF Downloader for Recent Exams (Fetches questions from Firebase)
  const downloadRecentPDF = async (exam) => {
    setDownloadingPdfId(exam.id);
    try {
      const qSnap = await getDocs(collection(db, "mock_exams", exam.id, "questions"));
      const questions = qSnap.docs.map(doc => doc.data()).sort((a, b) => a.order - b.order);
      
      generatePDFDocument(exam.title || exam.topic || "Exam", exam.difficulty || "Medium", exam.duration || 60, questions);
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Reusable PDF Generation Logic
  const generatePDFDocument = (examTopic, examDifficulty, examDuration, questionsList) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); 
    doc.text(`OZONE Personal AI Assessment`, pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`TOPIC: ${examTopic.toUpperCase()}   |   DIFFICULTY: ${examDifficulty.toUpperCase()}   |   TIME: ${examDuration} MINS`, pageWidth / 2, 28, { align: "center" });
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 36, pageWidth - 20, 36);

    let yPos = 45;
    doc.setTextColor(15, 23, 42);

    questionsList.forEach((q, index) => {
      if (yPos > 260) { doc.addPage(); yPos = 20; }

      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      const splitQuestion = doc.splitTextToSize(`Q${index + 1}. ${q.text || ""}`, pageWidth - 40);
      doc.text(splitQuestion, 20, yPos);
      yPos += (splitQuestion.length * 6) + 4;

      doc.setFont(undefined, "normal");
      
      if (q.options && Array.isArray(q.options) && q.options.length > 0) {
        q.options.forEach(opt => {
          if (yPos > 275) { doc.addPage(); yPos = 20; }
          const splitOpt = doc.splitTextToSize(`${opt.id}) ${opt.text}`, pageWidth - 50);
          doc.text(splitOpt, 25, yPos);
          yPos += (splitOpt.length * 6) + 2;
        });
      } else {
        if (yPos > 275) { doc.addPage(); yPos = 20; }
        doc.setTextColor(148, 163, 184); 
        doc.text("[Numerical Answer Type - No Options]", 25, yPos);
        doc.setTextColor(15, 23, 42); 
        yPos += 8;
      }
      
      yPos += 8; 
    });

    doc.save(`OZONE_Practice_${examTopic.replace(/\s+/g, '_')}.pdf`);
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-circle-notch fa-spin text-4xl text-indigo-600"></i></div>;

  return (
    // ⚡ Removed outer layout sidebars and absolute positioning so it slots into layout.jsx perfectly ⚡
    <div className="flex flex-col relative overflow-hidden bg-slate-50 min-h-full">
      
      {/* Dynamic Backgrounds */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-100/60 via-slate-50/80 to-transparent pointer-events-none"></div>
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-violet-400/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header Area */}
      <header className="relative z-20 px-4 md:px-8 py-6 flex justify-between items-center max-w-[1400px] w-full mx-auto">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <i className="fas fa-brain text-fuchsia-500"></i> Personal AI Exam Generator
        </h1>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-20 relative z-10 flex flex-col items-center">
        <div className="max-w-6xl w-full">
          
          <button 
            onClick={() => router.push('/student')} 
            className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 px-4 py-2 rounded-full shadow-sm transition-all w-fit"
          >
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* LEFT COLUMN: WORKFLOW ENGINE */}
            <div className="w-full lg:col-span-7">
              
              {!generatedExam && (
                <>
                  <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wider mb-5 shadow-sm border border-indigo-200">
                      <i className="fas fa-sparkles text-indigo-500"></i> Powered by Gemini 2.5
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4 leading-tight">
                      Craft your perfect <br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-fuchsia-500 font-black">practice test.</span>
                    </h2>
                    <p className="text-slate-600 font-medium text-base leading-relaxed max-w-md">
                      Tell our AI what you want to study. It will instantly generate a highly accurate, bespoke exam to test your skills.
                    </p>
                  </div>

                  <form onSubmit={handleGenerate} className="space-y-6">
                    
                    {/* TOPIC & CATEGORY SECTION */}
                    <div className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 md:p-8 shadow-sm hover:shadow-md focus-within:shadow-xl focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-300">
                      <div className="mb-6">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">
                          <i className="fas fa-folder-open text-indigo-400"></i> Category
                        </label>
                        <div className="relative">
                          <select 
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            disabled={isGenerating}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-4 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all appearance-none cursor-pointer disabled:opacity-50"
                          >
                            <option value="GATE ECE">GATE ECE</option>
                            <option value="GATE CS">GATE CS</option>
                            <option value="GATE EE">GATE EE</option>
                            <option value="GATE ME">GATE ME</option>
                            <option value="JEE Mains">JEE Mains</option>
                            <option value="UPSC">UPSC</option>
                            <option value="General Aptitude">General Aptitude</option>
                          </select>
                          <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">
                          <i className="fas fa-bullseye text-indigo-400"></i> Weak Topic to Practice
                        </label>
                        <input 
                          type="text" 
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          disabled={isGenerating}
                          placeholder="e.g., Fourier Transforms, Thermodynamics..."
                          className="w-full bg-transparent border-b-2 border-slate-200 focus:border-indigo-600 py-3 text-xl md:text-2xl font-bold text-slate-900 placeholder-slate-300 outline-none transition-colors disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* DIFFICULTY SECTION */}
                    <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md focus-within:shadow-xl focus-within:border-fuchsia-500 focus-within:ring-4 focus-within:ring-fuchsia-500/10 transition-all duration-300">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-4 uppercase tracking-wide">
                        <i className="fas fa-layer-group text-fuchsia-400"></i> Challenge Level
                      </label>
                      <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-200/60">
                        {["Beginner", "Intermediate", "Expert"].map((level) => {
                          const isActive = difficulty === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              disabled={isGenerating}
                              onClick={() => setDifficulty(level)}
                              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50 ${isActive ? 'bg-white border-slate-200 text-fuchsia-700 shadow-md ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                            >
                              {level}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* METRICS GRID (Questions & Time) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Question Count Card */}
                      <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md focus-within:shadow-xl focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all duration-300">
                        <div className="flex justify-between items-center mb-5">
                          <label className="text-sm font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                            <i className="fas fa-list-ol text-emerald-400"></i> Questions
                          </label>
                          <span className="bg-emerald-50 text-emerald-700 text-sm font-bold px-3 py-1 rounded-lg border border-emerald-200">{numQuestions} Qs</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2.5">
                          {[5, 10, 15].map(num => (
                            <button
                              key={num}
                              type="button"
                              disabled={isGenerating}
                              onClick={() => { setNumQuestions(num); setIsCustomQuestions(false); }}
                              className={`py-3 rounded-xl border text-sm font-bold transition-all
                                ${numQuestions === num && !isCustomQuestions ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:border-emerald-300'}`}
                            >
                              {num}
                            </button>
                          ))}
                          <div className="col-span-3 relative mt-1">
                            <input 
                              type="number"
                              min="1" max="50"
                              value={isCustomQuestions ? numQuestions : ""}
                              onChange={(e) => {
                                setIsCustomQuestions(true);
                                setNumQuestions(e.target.value === "" ? "" : Number(e.target.value));
                              }}
                              disabled={isGenerating}
                              placeholder="Custom Count (Max 50)"
                              className={`w-full text-center py-3 rounded-xl border text-sm font-bold outline-none transition-all
                                ${isCustomQuestions ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Duration Card */}
                      <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md focus-within:shadow-xl focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-500/10 transition-all duration-300">
                        <div className="flex justify-between items-center mb-5">
                          <label className="text-sm font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                            <i className="fas fa-stopwatch text-amber-400"></i> Time Limit
                          </label>
                          <span className="bg-amber-50 text-amber-700 text-sm font-bold px-3 py-1 rounded-lg border border-amber-200">{duration} Mins</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2.5">
                          {[15, 30, 60].map(time => (
                            <button
                              key={time}
                              type="button"
                              disabled={isGenerating}
                              onClick={() => { setDuration(time); setIsCustomDuration(false); }}
                              className={`py-3 rounded-xl border text-sm font-bold transition-all
                                ${duration === time && !isCustomDuration ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:border-amber-300'}`}
                            >
                              {time}m
                            </button>
                          ))}
                          <div className="col-span-3 relative mt-1">
                            <input 
                              type="number"
                              min="5" max="180"
                              value={isCustomDuration ? duration : ""}
                              onChange={(e) => {
                                setIsCustomDuration(true);
                                setDuration(e.target.value === "" ? "" : Number(e.target.value));
                              }}
                              disabled={isGenerating}
                              placeholder="Custom Mins"
                              className={`w-full text-center py-3 rounded-xl border text-sm font-bold outline-none transition-all
                                ${isCustomDuration ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-500 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'}`}
                            />
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="bg-rose-50 text-rose-600 px-5 py-4 rounded-xl text-sm font-bold flex items-center gap-3 border border-rose-200 animate-in fade-in">
                        <i className="fas fa-exclamation-circle text-lg"></i>
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-4">
                      {/* Notice: NO Guest Blocker here! Guests are allowed to trigger the Demo Simulation */}
                      <button 
                        type="submit" 
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-5 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-indigo-600/30 hover:-translate-y-1 transition-all duration-300 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:transform-none disabled:cursor-not-allowed flex justify-center items-center gap-3"
                      >
                        {isGenerating ? (
                          <><i className="fas fa-circle-notch fa-spin text-white/70"></i> Synthesizing Assessment...</>
                        ) : (
                          <>Generate Exam Package <i className="fas fa-arrow-right"></i></>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* ---------------------------------------------------------
                  STEP 2: EXAM READY
              --------------------------------------------------------- */}
              {generatedExam && !isGenerating && (
                <div className="bg-white rounded-3xl p-10 shadow-2xl shadow-indigo-900/5 border border-slate-200 animate-in zoom-in-95 duration-500 text-center relative overflow-hidden mt-8">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                  
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner border border-emerald-100">
                    <i className="fas fa-check"></i>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Synthesis Complete</h3>
                  <p className="text-slate-500 font-medium mb-8 text-sm">
                    <strong>{generatedExam.questions.length}</strong> questions generated for <strong className="text-slate-800">"{generatedExam.topic}"</strong> ({duration} mins).
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {/* ⚡ GUEST BLOCKER FOR TAKING EXAM ⚡ */}
                    <GuestBlocker role="student">
                      <button 
                        onClick={() => router.push(`/student/exam/${generatedExam.mockId}`)}
                        className="w-full sm:flex-1 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-600/30 hover:-translate-y-1 transition-all flex justify-center items-center gap-2"
                      >
                        Take Test <i className="fas fa-arrow-right text-xs"></i>
                      </button>
                    </GuestBlocker>
                    
                    {/* ⚡ GUEST BLOCKER FOR DOWNLOADING ⚡ */}
                    <GuestBlocker role="student">
                      <button 
                        onClick={downloadPDF}
                        className="w-full sm:flex-1 bg-white border-2 border-slate-200 text-slate-700 py-4 rounded-xl font-bold hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex justify-center items-center gap-2"
                      >
                        <i className="fas fa-file-pdf"></i> Download PDF
                      </button>
                    </GuestBlocker>
                  </div>
                  
                  <button onClick={() => setGeneratedExam(null)} className="mt-8 text-xs font-bold text-slate-400 hover:text-indigo-600 transition flex items-center justify-center gap-2 mx-auto">
                    <i className="fas fa-redo-alt"></i> Create Another Exam
                  </button>
                </div>
              )}

            </div>

            {/* =========================================
                RIGHT COLUMN: LIVE TERMINAL / INFO
            ========================================= */}
            <div className="hidden lg:block h-[640px] lg:col-span-5 sticky top-6">
              <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-900/20 relative overflow-hidden h-full flex flex-col border border-slate-800">
                
                {/* Soft Inner Glows */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-fuchsia-500/15 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Terminal Header */}
                <div className="flex items-center justify-between mb-10 border-b border-slate-800 pb-5 relative z-10">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700 uppercase">
                    <i className="fas fa-lock text-fuchsia-400"></i> NEURAL_ENGINE
                  </div>
                </div>

                {isGenerating ? (
                  /* Active Terminal State */
                  <div className="flex-1 flex flex-col justify-center relative z-10 font-mono">
                    <i className="fas fa-microchip text-5xl text-fuchsia-400 mb-8 animate-pulse drop-shadow-[0_0_15px_rgba(217,70,239,0.4)]"></i>
                    <div className="text-emerald-400 text-sm mb-2 flex items-center gap-2"><i className="fas fa-check-circle"></i> Student Profile Verified</div>
                    <div className="text-slate-400 text-sm mb-8 flex flex-col gap-1">
                      <span>Compiling parameters for:</span> 
                      <span className="text-white bg-slate-800 px-3 py-1 rounded inline-block w-fit mt-1 border border-slate-700">"{topic}"</span>
                    </div>
                    
                    <div className="space-y-4 border-l-2 border-slate-800 pl-5">
                      {LOADING_STEPS.map((step, i) => (
                        <div key={i} className={`text-sm transition-all duration-500 flex items-center gap-3
                          ${i < loadingStep ? 'text-slate-600' : i === loadingStep ? 'text-fuchsia-400 font-bold' : 'opacity-0 h-0 hidden'}`}>
                          {i < loadingStep ? <i className="fas fa-check text-[10px]"></i> : <i className="fas fa-chevron-right text-[10px] animate-pulse"></i>}
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Idle Info State */
                  <div className="flex-1 flex flex-col justify-center relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-fuchsia-500/30 rounded-2xl flex items-center justify-center text-2xl text-fuchsia-400 mb-8 shadow-inner shadow-fuchsia-500/20">
                      <i className="fas fa-user-graduate"></i>
                    </div>
                    <h3 className="text-white font-bold text-2xl mb-4 leading-tight tracking-tight">Adaptive Knowledge<br/>Synthesis</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-10 font-normal">
                      Our engine generates dynamically scaled assessments using advanced neural logic. Distractors are specifically mapped to common mathematical and conceptual errors.
                    </p>

                    <div className="space-y-4">
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center gap-5 hover:bg-slate-800/60 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <i className="fas fa-stopwatch text-sm"></i>
                        </div>
                        <div>
                          <div className="text-white text-sm font-semibold mb-1">Strict Time Mapping</div>
                          <div className="text-slate-500 text-xs font-normal leading-relaxed">Exams are accurately calibrated to your chosen duration.</div>
                        </div>
                      </div>
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center gap-5 hover:bg-slate-800/60 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center shrink-0 border border-fuchsia-500/20">
                          <i className="fas fa-brain text-sm"></i>
                        </div>
                        <div>
                          <div className="text-white text-sm font-semibold mb-1">Smart Distractors</div>
                          <div className="text-slate-500 text-xs font-normal leading-relaxed">Options are engineered to test deep conceptual mastery.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* =========================================
            BOTTOM SECTION: RECENT EXAMS GRID
        ========================================= */}
        {user && (
          <div className="max-w-6xl w-full mt-16 z-10 relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                <i className="fas fa-history"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-800">Recent Assessments</h3>
            </div>

            {isLoadingRecent ? (
               <div className="flex justify-center items-center py-12">
                 <i className="fas fa-circle-notch fa-spin text-indigo-500 text-3xl"></i>
               </div>
            ) : recentExams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentExams.map(exam => {
                  const dateObj = exam.createdAt?.seconds 
                    ? new Date(exam.createdAt.seconds * 1000) 
                    : new Date();
                  
                  return (
                    <div key={exam.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-indigo-300 transition-all duration-300 group flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          exam.difficulty === 'Expert' ? 'bg-rose-100 text-rose-700' :
                          exam.difficulty === 'Intermediate' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {exam.difficulty}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          {dateObj.toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-slate-800 text-lg mb-2 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                        {exam.title || `${exam.topic} Exam`}
                      </h4>
                      
                      <div className="flex items-center gap-4 text-sm font-medium text-slate-500 mb-6 mt-auto">
                        <span className="flex items-center gap-1.5"><i className="fas fa-list-ol text-slate-400"></i> {exam.questions?.length || 0} Qs</span>
                        <span className="flex items-center gap-1.5"><i className="fas fa-clock text-slate-400"></i> {exam.duration || 0} Mins</span>
                      </div>
                      
                      <div className="flex gap-2 mt-auto">
                        <button 
                          onClick={() => router.push(`/student/exam/${exam.id}`)}
                          className="flex-1 flex justify-center items-center gap-1 text-center bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white py-3 rounded-xl text-sm font-bold transition-all border border-indigo-100 hover:border-indigo-600 shadow-sm"
                        >
                          Take Test <i className="fas fa-play text-xs opacity-70"></i>
                        </button>
                        
                        <button 
                          onClick={() => downloadRecentPDF(exam)}
                          disabled={downloadingPdfId === exam.id}
                          className="flex-1 flex justify-center items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 py-3 rounded-xl text-sm font-bold transition-all border border-slate-200 shadow-sm disabled:opacity-50"
                        >
                          {downloadingPdfId === exam.id ? (
                            <i className="fas fa-circle-notch fa-spin text-indigo-500"></i>
                          ) : (
                            <><i className="fas fa-file-pdf text-rose-500"></i> PDF</>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white/60 backdrop-blur-sm border-2 border-slate-200 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-sm">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-2xl mb-4">
                  <i className="fas fa-folder-open"></i>
                </div>
                <h4 className="text-lg font-bold text-slate-700 mb-1">No Recent Exams</h4>
                <p className="text-slate-500 text-sm max-w-sm">
                  You haven't generated any AI assessments yet. Use the engine above to create your first mock exam.
                </p>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}