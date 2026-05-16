"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import jsPDF from "jspdf";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ⚡ IMPORT GUEST BLOCKER ⚡
import GuestBlocker from "@/components/GuestBlocker";

const LOADING_STEPS = [
  "Initializing Educator Console...",
  "Analyzing core concepts and boundaries...",
  "Drafting questions and distractors...",
  "Calibrating difficulty & parameters...",
  "Structuring official solutions...",
  "Finalizing Draft..."
];

export default function EducatorAIExamGenerator() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // --- WORKFLOW STATE ---
  // 1 = Form, 2 = Review/Draft, 3 = Published
  const [examStep, setExamStep] = useState(1); 
  const [showPreview, setShowPreview] = useState(false);

  // --- FORM STATE (Step 1) ---
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("Computer Science");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [numQuestions, setNumQuestions] = useState(10);
  const [isCustomQuestions, setIsCustomQuestions] = useState(false);
  const [duration, setDuration] = useState(30);
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  // --- EDUCATOR SETTINGS (Step 2) ---
  const [isPublic, setIsPublic] = useState(false);
  const [allowCalculator, setAllowCalculator] = useState(false);
  
  // --- ENGINE STATE ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [generatedExam, setGeneratedExam] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // --- RECENT EXAMS STATE ---
  const [recentExams, setRecentExams] = useState([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [isLoadingExams, setIsLoadingExams] = useState(true);

  // Fetch Recent Exams on Load
  useEffect(() => {
    const fetchRecentExams = async () => {
      // ⚡ If guest, stop loading and show empty state ⚡
      if (!user?.id) {
        setIsLoadingExams(false);
        return; 
      }
      
      try {
        const examsRef = collection(db, "mock_exams");
        const qExams = query(examsRef, where("educatorId", "==", user.id));
        const snap = await getDocs(qExams);
        
        let fetchedExams = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdDate: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now())
          };
        });

        // Sort latest first
        fetchedExams.sort((a, b) => b.createdDate - a.createdDate);
        setRecentExams(fetchedExams);
      } catch (err) {
        console.error("Error fetching recent exams:", err);
      } finally {
        setIsLoadingExams(false);
      }
    };

    if (isLoaded) fetchRecentExams();
  }, [user, isLoaded]);

  // Cycle through loading messages
  useEffect(() => {
    let interval;
    if (isGenerating) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 1500); // Faster loading cycle for a snappier feel
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // STEP 1: GENERATE DRAFT
  const handleGenerateDraft = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return setError("Target topic is required.");
    if (numQuestions < 1 || numQuestions > 50) return setError("Please select between 1 and 50 questions.");
    if (duration < 5 || duration > 180) return setError("Duration must be between 5 and 180 minutes.");
    
    setIsGenerating(true);
    setError("");
    setGeneratedExam(null);
    setShowPreview(false);

    // ⚡ GUEST MODE SIMULATION: Bypasses API to save costs ⚡
    if (!user) {
      setTimeout(() => {
        const dummyQuestions = Array.from({ length: numQuestions }).map((_, i) => ({
          text: `In the context of ${topic}, what is the optimal approach for scenario ${i + 1}?`,
          options: [
            { id: "A", text: "Standard operational procedure" },
            { id: "B", text: "Theoretical alternative" },
            { id: "C", text: "Common misconception" },
            { id: "D", text: "Outdated methodology" }
          ],
          correctAnswer: "A",
          explanation: "In guest mode, this is a placeholder explanation demonstrating the AI's intended output format and structure."
        }));

        setGeneratedExam({
          mockId: "GUEST-PREVIEW",
          topic: topic,
          category: category,
          questions: dummyQuestions,
          duration: duration
        });
        
        setExamStep(2); // Move to Review Phase
        setIsGenerating(false);
      }, 4500); // 4.5 seconds simulates "AI generation time"
      return;
    }

    // ⚡ REAL AI GENERATION (For Logged In Users) ⚡
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
          allowCalculator: false,
          educatorId: user.id,
          status: "draft"
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate exam draft.");
      
      setGeneratedExam({
        mockId: data.mockId,
        topic: topic,
        category: category,
        questions: data.questions,
        duration: duration
      });

      setExamStep(2); // Move to Review Phase

    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // STEP 2: PUBLISH EXAM
  const handlePublish = async () => {
    if (!generatedExam || !user) return;
    setIsPublishing(true);
    
    try {
      const examRef = doc(db, "mock_exams", generatedExam.mockId); 
      await updateDoc(examRef, {
        isPublic: isPublic,
        allowCalculator: allowCalculator,
        status: "published"
      });

      // Add to recent exams state locally so it shows immediately
      const newExamObj = {
        id: generatedExam.mockId,
        title: `${generatedExam.topic} Assessment`,
        category: category,
        difficulty: difficulty,
        duration: duration,
        totalQuestions: generatedExam.questions.length,
        isPublic: isPublic,
        status: "published",
        createdDate: new Date()
      };
      
      setRecentExams(prev => [newExamObj, ...prev]);
      setExamStep(3); 
    } catch (err) {
      console.error("Publishing error:", err);
      setExamStep(3); 
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedExam?.mockId) {
      navigator.clipboard.writeText(generatedExam.mockId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadPDF = () => {
    if (!generatedExam) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); 
    doc.text(`OZONE AI Assessment (Educator Copy)`, pageWidth / 2, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`TOPIC: ${generatedExam.topic.toUpperCase()}   |   CATEGORY: ${generatedExam.category.toUpperCase()}   |   TIME: ${duration} MINS`, pageWidth / 2, 28, { align: "center" });
    
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 36, pageWidth - 20, 36);

    let yPos = 45;
    doc.setTextColor(15, 23, 42);

    generatedExam.questions.forEach((q, index) => {
      if (yPos > 260) { doc.addPage(); yPos = 20; }

      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      const splitQuestion = doc.splitTextToSize(`Q${index + 1}. ${q.text || ""}`, pageWidth - 40);
      doc.text(splitQuestion, 20, yPos);
      yPos += (splitQuestion.length * 6) + 4;

      doc.setFont(undefined, "normal");
      
      if (q.options) {
        q.options.forEach(opt => {
          if (yPos > 275) { doc.addPage(); yPos = 20; }
          const splitOpt = doc.splitTextToSize(`${opt.id}) ${opt.text}`, pageWidth - 50);
          doc.text(splitOpt, 25, yPos);
          yPos += (splitOpt.length * 6) + 2;
        });
      }
      
      if (q.correctAnswer) {
        doc.setTextColor(16, 185, 129);
        doc.text(`Answer: ${q.correctAnswer}`, 25, yPos);
        doc.setTextColor(15, 23, 42); 
        yPos += 8;
      }
      
      yPos += 8; 
    });

    doc.save(`OZONE_Educator_${generatedExam.topic.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    // ⚡ Removed outer h-screen and redundant layout wrappers ⚡
    <div className="flex flex-col relative overflow-hidden bg-slate-50 min-h-screen">
      
      {/* Dynamic Backgrounds */}
      <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-100/60 via-slate-50/80 to-transparent pointer-events-none"></div>
      <div className="absolute -top-48 -left-48 w-96 h-96 bg-violet-400/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header Area */}
      <header className="relative z-20 px-4 md:px-8 py-6 flex justify-between items-center max-w-[1400px] w-full mx-auto">
        <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <i className="fas fa-brain text-indigo-500"></i> AI Exam Architect
        </h1>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 overflow-y-auto px-4 md:px-8 pb-20 relative z-10 flex flex-col items-center">
        <div className="max-w-6xl w-full">
          
          <button 
            onClick={() => router.push('/educator/dashboard')} 
            className="mb-6 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 px-4 py-2 rounded-full shadow-sm transition-all w-fit"
          >
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            
            {/* LEFT COLUMN: WORKFLOW ENGINE */}
            <div className="w-full lg:col-span-7">
              
              {/* ---------------------------------------------------------
                  STEP 1: CONFIGURATION FORM 
              --------------------------------------------------------- */}
              {examStep === 1 && (
                <>
                  <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold uppercase tracking-wider mb-5 shadow-sm border border-indigo-200">
                      <i className="fas fa-sparkles text-indigo-500"></i> Step 1: Draft Mode
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4 leading-tight">
                      Design a secure <br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-500 font-black">mock assessment.</span>
                    </h2>
                    <p className="text-slate-600 font-medium text-base leading-relaxed max-w-md">
                      Configure the baseline parameters. Our AI will synthesize the content so you can review it before publishing.
                    </p>
                  </div>

                  <form onSubmit={handleGenerateDraft} className="space-y-6">
                    
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
                            <option value="Computer Science">Computer Science</option>
                            <option value="Electrical Engineering">Electrical Engineering</option>
                            <option value="Mechanical Engineering">Mechanical Engineering</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="General Aptitude">General Aptitude</option>
                          </select>
                          <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs"></i>
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-2 uppercase tracking-wide">
                          <i className="fas fa-bullseye text-indigo-400"></i> Target Concept
                        </label>
                        <input 
                          type="text" 
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          disabled={isGenerating}
                          placeholder="e.g., Signal Processing, React Hooks..."
                          className="w-full bg-transparent border-b-2 border-slate-200 focus:border-indigo-600 py-3 text-xl md:text-2xl font-bold text-slate-900 placeholder-slate-300 outline-none transition-colors disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {/* DIFFICULTY SECTION */}
                    <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md focus-within:shadow-xl focus-within:border-violet-500 focus-within:ring-4 focus-within:ring-violet-500/10 transition-all duration-300">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-500 mb-4 uppercase tracking-wide">
                        <i className="fas fa-layer-group text-violet-400"></i> Difficulty Profile
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
                              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200 disabled:opacity-50 ${isActive ? 'bg-white border-slate-200 text-violet-700 shadow-md ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}
                            >
                              {level}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* METRICS GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Question Count Card */}
                      <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md focus-within:border-indigo-500 transition-all duration-300">
                        <div className="flex justify-between items-center mb-5">
                          <label className="text-sm font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                            <i className="fas fa-list-ol text-indigo-400"></i> Questions
                          </label>
                          <span className="bg-indigo-50 text-indigo-700 text-sm font-bold px-3 py-1 rounded-lg border border-indigo-200">{numQuestions} Qs</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2.5">
                          {[15, 30, 65].map(num => (
                            <button
                              key={num}
                              type="button"
                              disabled={isGenerating}
                              onClick={() => { setNumQuestions(num); setIsCustomQuestions(false); }}
                              className={`py-3 rounded-xl border text-sm font-bold transition-all ${numQuestions === num && !isCustomQuestions ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                            >
                              {num}
                            </button>
                          ))}
                          <div className="col-span-3 relative mt-1">
                            <input 
                              type="number" min="1" max="150"
                              value={isCustomQuestions ? numQuestions : ""}
                              onChange={(e) => {
                                setIsCustomQuestions(true);
                                setNumQuestions(e.target.value === "" ? "" : Number(e.target.value));
                              }}
                              disabled={isGenerating} placeholder="Custom Count"
                              className="w-full text-center py-3 rounded-xl border text-sm font-bold outline-none border-slate-200 bg-slate-50 text-slate-500 focus:bg-white focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Duration Card */}
                      <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md focus-within:border-amber-500 transition-all duration-300">
                        <div className="flex justify-between items-center mb-5">
                          <label className="text-sm font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                            <i className="fas fa-stopwatch text-amber-400"></i> Time Limit
                          </label>
                          <span className="bg-amber-50 text-amber-700 text-sm font-bold px-3 py-1 rounded-lg border border-amber-200">{duration} Mins</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2.5">
                          {[30, 60, 180].map(time => (
                            <button
                              key={time}
                              type="button"
                              disabled={isGenerating}
                              onClick={() => { setDuration(time); setIsCustomDuration(false); }}
                              className={`py-3 rounded-xl border text-sm font-bold transition-all ${duration === time && !isCustomDuration ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                            >
                              {time}m
                            </button>
                          ))}
                          <div className="col-span-3 relative mt-1">
                            <input 
                              type="number" min="5" max="300"
                              value={isCustomDuration ? duration : ""}
                              onChange={(e) => {
                                setIsCustomDuration(true);
                                setDuration(e.target.value === "" ? "" : Number(e.target.value));
                              }}
                              disabled={isGenerating} placeholder="Custom Mins"
                              className="w-full text-center py-3 rounded-xl border text-sm font-bold outline-none border-slate-200 bg-slate-50 text-slate-500 focus:bg-white focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-rose-50 text-rose-600 px-5 py-4 rounded-xl text-sm font-bold flex items-center gap-3 border border-rose-200">
                        <i className="fas fa-exclamation-circle text-lg"></i><span>{error}</span>
                      </div>
                    )}

                    <div className="pt-2">
                      <button 
                        type="submit" 
                        disabled={isGenerating}
                        className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-slate-900/20 hover:-translate-y-1 transition-all duration-300 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none flex justify-center items-center gap-3"
                      >
                        {isGenerating ? (
                          <><i className="fas fa-circle-notch fa-spin"></i> Generating Content...</>
                        ) : (
                          <>Generate Exam Draft <i className="fas fa-arrow-right"></i></>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* ---------------------------------------------------------
                  STEP 2: REVIEW & PUBLISH (Draft State)
              --------------------------------------------------------- */}
              {examStep === 2 && generatedExam && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold uppercase tracking-wider mb-5 shadow-sm border border-amber-200">
                      <i className="fas fa-search text-amber-500"></i> Step 2: Review & Configure
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2">
                      Exam Content Generated.
                    </h2>
                    <p className="text-slate-500 font-medium">Review the material, set access rules, and publish to the portal.</p>
                  </div>

                  <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-slate-200 mb-6">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-inner border border-indigo-100">
                          <i className="fas fa-file-alt"></i>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{generatedExam.topic}</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{generatedExam.questions.length} Qs • {generatedExam.duration} Mins</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {/* ⚡ GUEST BLOCKER FOR DOWNLOAD ⚡ */}
                        <GuestBlocker role="educator">
                          <button onClick={downloadPDF} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2">
                            <i className="fas fa-download"></i> PDF
                          </button>
                        </GuestBlocker>

                        <button onClick={() => setShowPreview(!showPreview)} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 border border-indigo-200">
                          <i className={showPreview ? "fas fa-eye-slash" : "fas fa-eye"}></i> {showPreview ? "Hide" : "Preview"}
                        </button>
                      </div>
                    </div>

                    {/* Question Preview Modal/Accordion */}
                    {showPreview && (
                      <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-5 h-80 overflow-y-auto custom-scrollbar">
                        {generatedExam.questions.map((q, i) => (
                          <div key={i} className="mb-5 pb-5 border-b border-slate-200 last:border-0 last:mb-0 last:pb-0">
                            <p className="font-bold text-slate-800 text-sm mb-3">Q{i + 1}. {q.text}</p>
                            
                            {q.options && (
                              <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                                {q.options.map(opt => (
                                  <p key={opt.id} className={`text-xs font-medium ${opt.id === q.correctAnswer ? 'text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md inline-block border border-emerald-100' : 'text-slate-500'}`}>
                                    {opt.id}) {opt.text}
                                  </p>
                                ))}
                              </div>
                            )}
                            
                            {!q.options && (
                              <div className="pl-4 border-l-2 border-emerald-200 mt-2">
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                                  Answer: {q.correctAnswer}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* EXAM CONFIGURATION SETTINGS */}
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <i className="fas fa-cog text-slate-400"></i> Publishing Rules
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">
                          <i className="fas fa-eye text-emerald-400"></i> Visibility
                        </label>
                        <div className="flex bg-white p-1.5 rounded-xl border border-slate-200">
                          <button type="button" onClick={() => setIsPublic(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${isPublic ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Public</button>
                          <button type="button" onClick={() => setIsPublic(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!isPublic ? 'bg-amber-50 border border-amber-200 text-amber-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Private (ID)</button>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">
                          <i className="fas fa-calculator text-blue-400"></i> Calculator
                        </label>
                        <div className="flex bg-white p-1.5 rounded-xl border border-slate-200">
                          <button type="button" onClick={() => setAllowCalculator(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${allowCalculator ? 'bg-blue-50 border border-blue-200 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Allowed</button>
                          <button type="button" onClick={() => setAllowCalculator(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!allowCalculator ? 'bg-slate-100 border border-slate-200 text-slate-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>Disabled</button>
                        </div>
                      </div>
                    </div>

                    {/* ⚡ GUEST BLOCKER FOR PUBLISH ⚡ */}
                    <GuestBlocker role="educator">
                      <button 
                        onClick={handlePublish} 
                        disabled={isPublishing}
                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                      >
                        {isPublishing ? "Saving Settings..." : "Publish to Mock Portal"}
                      </button>
                    </GuestBlocker>
                    
                    <button onClick={() => { setExamStep(1); setGeneratedExam(null); setTopic(""); }} className="w-full mt-4 text-xs font-bold text-slate-400 hover:text-rose-500 transition">
                      Discard & Start Over
                    </button>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------------
                  STEP 3: SUCCESS & DEPLOYMENT
              --------------------------------------------------------- */}
              {examStep === 3 && generatedExam && (
                <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-indigo-900/5 border border-slate-200 animate-in zoom-in-95 duration-500 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                  
                  <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-6">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-emerald-100">
                      <i className="fas fa-check"></i>
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">Exam Published</h3>
                      <p className="text-slate-500 font-medium text-sm">Your assessment is now live in the system.</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 relative group">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <i className="fas fa-key text-indigo-400"></i> Unique Exam ID
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${isPublic ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isPublic ? 'Public Access' : 'Private (ID Required)'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                      <code className="text-xl md:text-2xl font-mono font-black text-indigo-600 tracking-wider">
                        {generatedExam.mockId}
                      </code>
                      <button 
                        onClick={copyToClipboard}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${copied ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'}`}
                      >
                        <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-lg`}></i>
                      </button>
                    </div>
                    {!isPublic && (
                      <p className="text-xs text-slate-500 font-medium mt-3 flex items-center gap-1.5">
                        <i className="fas fa-info-circle text-amber-500"></i> Share this exact ID with your students.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button 
                      onClick={() => router.push(`/educator/mocks/${generatedExam.mockId}`)}
                      className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:bg-indigo-600 hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2"
                    >
                      <i className="fas fa-satellite-dish"></i> View in Portal
                    </button>
                    <button 
                      onClick={downloadPDF}
                      className="w-full bg-white border-2 border-slate-200 text-slate-700 py-4 rounded-xl font-bold hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex justify-center items-center gap-2"
                    >
                      <i className="fas fa-file-pdf"></i> Download PDF
                    </button>
                  </div>
                  
                  <button onClick={() => { setExamStep(1); setGeneratedExam(null); setTopic(""); }} className="mt-8 text-xs font-bold text-slate-400 hover:text-indigo-600 transition flex items-center justify-center gap-2 mx-auto">
                    <i className="fas fa-plus"></i> Create Another Exam
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: LIVE TERMINAL / INFO */}
            <div className="hidden lg:block h-[720px] lg:col-span-5 sticky top-6">
              <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl shadow-indigo-900/20 relative overflow-hidden h-full flex flex-col border border-slate-800">
                
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-violet-500/15 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="flex items-center justify-between mb-10 border-b border-slate-800 pb-5 relative z-10">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] tracking-widest bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700 uppercase">
                    <i className="fas fa-lock text-indigo-400"></i> Admin_Engine
                  </div>
                </div>

                {isGenerating ? (
                  <div className="flex-1 flex flex-col justify-center relative z-10 font-mono">
                    <i className="fas fa-server text-5xl text-indigo-400 mb-8 animate-pulse drop-shadow-[0_0_15px_rgba(99,102,241,0.4)]"></i>
                    <div className="text-emerald-400 text-sm mb-2 flex items-center gap-2"><i className="fas fa-check-circle"></i> Educator Privileges Verified</div>
                    <div className="text-slate-400 text-sm mb-8 flex flex-col gap-1">
                      <span>Encoding parameters for:</span> 
                      <span className="text-white bg-slate-800 px-3 py-1 rounded inline-block w-fit mt-1 border border-slate-700">"{topic}"</span>
                    </div>
                    
                    <div className="space-y-4 border-l-2 border-slate-800 pl-5">
                      {LOADING_STEPS.map((step, i) => (
                        <div key={i} className={`text-sm transition-all duration-500 flex items-center gap-3
                          ${i < loadingStep ? 'text-slate-600' : i === loadingStep ? 'text-violet-400 font-bold' : 'opacity-0 h-0 hidden'}`}>
                          {i < loadingStep ? <i className="fas fa-check text-[10px]"></i> : <i className="fas fa-chevron-right text-[10px] animate-pulse"></i>}
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-center relative z-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-2xl text-indigo-400 mb-8 shadow-inner shadow-indigo-500/20">
                      <i className="fas fa-chalkboard-teacher"></i>
                    </div>
                    <h3 className="text-white font-bold text-2xl mb-4 leading-tight tracking-tight">OZONE Test<br/>Deployment</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-10 font-normal">
                      Generate production-ready mock exams. Our system structures questions specifically to measure higher-order thinking, ready to be deployed to your students instantly.
                    </p>

                    <div className="space-y-4">
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center gap-5 hover:bg-slate-800/60 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <i className="fas fa-eye text-sm"></i>
                        </div>
                        <div>
                          <div className="text-white text-sm font-semibold mb-1">Pre-Publish Review</div>
                          <div className="text-slate-500 text-xs font-normal leading-relaxed">Analyze all generated questions and correct answers before pushing live.</div>
                        </div>
                      </div>
                      <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-5 flex items-center gap-5 hover:bg-slate-800/60 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                          <i className="fas fa-file-pdf text-sm"></i>
                        </div>
                        <div>
                          <div className="text-white text-sm font-semibold mb-1">Master PDF Output</div>
                          <div className="text-slate-500 text-xs font-normal leading-relaxed">Download a formatted physical copy complete with an answer key for your records.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* =========================================
              HIGHLIGHTED RECENT EXAMS SECTION
          ========================================= */}
          {user && (
            <div className="w-full mt-20 pb-10 relative z-10 animate-in fade-in duration-700 delay-300">
              <div className="bg-white border-t border-slate-200 pt-10 rounded-t-[3rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                <div className="max-w-6xl mx-auto px-4 md:px-8">
                  <div className="flex justify-between items-center mb-8 px-2">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                      <i className="fas fa-layer-group text-indigo-500"></i> Your Published Exams
                    </h2>
                  </div>
                  
                  {isLoadingExams ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  ) : recentExams.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-12 text-center">
                      <div className="w-16 h-16 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center text-2xl mx-auto mb-4"><i className="fas fa-archive"></i></div>
                      <h3 className="text-base font-bold text-slate-700 mb-1">Your library is empty</h3>
                      <p className="text-slate-500 font-medium text-sm">Generate your first mock assessment above.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2">
                        {recentExams.slice(0, visibleCount).map(exam => (
                          <div 
                            key={exam.id} 
                            onClick={() => router.push(`/educator/mocks/${exam.id}`)} 
                            className="bg-white border-2 border-slate-100 rounded-2xl p-6 cursor-pointer hover:border-indigo-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            <div className="flex items-center justify-between mb-5">
                              <div className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest ${exam.isPublic ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                {exam.isPublic ? 'Public' : 'Private'}
                              </div>
                              
                              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors border border-slate-200 group-hover:border-indigo-600">
                                <i className="fas fa-arrow-right text-[10px]"></i>
                              </div>
                            </div>
                            
                            <h3 className="font-black text-slate-800 text-lg leading-snug mb-2 group-hover:text-indigo-600 transition-colors">
                              {exam.title || `${exam.topic} Exam`}
                            </h3>
                            
                            <p className="text-xs text-slate-500 font-bold mb-6 line-clamp-1">
                              <i className="fas fa-folder text-slate-300 mr-1"></i> {exam.category}
                            </p>
                            
                            <div className="flex items-center gap-3 pt-4 border-t border-slate-100 mt-auto">
                              <div className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-1 rounded flex items-center gap-1.5">
                                <i className="fas fa-list-ol text-indigo-400"></i> {exam.totalQuestions} Qs
                              </div>
                              <div className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-1 rounded flex items-center gap-1.5">
                                <i className="fas fa-stopwatch text-amber-400"></i> {exam.duration}m
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {visibleCount < recentExams.length && (
                        <div className="mt-10 flex justify-center animate-in fade-in duration-500">
                          <button 
                            onClick={() => setVisibleCount(prev => prev + 3)}
                            className="bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 hover:border-indigo-200 px-8 py-3 rounded-full text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
                          >
                            <i className="fas fa-chevron-down"></i> Load More ({recentExams.length - visibleCount} remaining)
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}