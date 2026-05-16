"use client";

import { useState, useEffect, use } from "react";
import { useUser } from "@clerk/nextjs";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

// --- MATH RENDERING IMPORTS ---
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// ⚡ IMPORT GUEST BLOCKER ⚡
import GuestBlocker from "@/components/GuestBlocker";

export default function ExamResultsPage({ params }) {
  const { id } = use(params);
  const { user, isLoaded } = useUser();
  const router = useRouter();
  
  const [result, setResult] = useState(null);
  const [originalQuestions, setOriginalQuestions] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState("solutions");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState(null);

  useEffect(() => {
    const fetchResultAndQuestions = async () => {
      // ⚡ GUEST MODE SIMULATION: Inject Premium Dummy Data! ⚡
      if (!user || id.startsWith("DEMO")) {
        setTimeout(() => {
          setResult({
            id: "DEMO-RESULT",
            examTitle: "AI Assessment (Demo Mode)",
            examCategory: "General Science & Math",
            submittedAt: { toDate: () => new Date() },
            score: 4,
            correct: 2,
            incorrect: 0
          });

          setOriginalQuestions([
            { 
              id: "q1", text: "Based on the provided context, which of the following best describes the principle of conservation of energy?", type: "MCQ", 
              options: [{id:"A", text:"Energy can be created but not destroyed."}, {id:"B", text:"Energy can neither be created nor destroyed, only transformed."}, {id:"C", text:"Energy is constantly increasing in a closed system."}], 
              correctAnswer: "B", marks: 2, negativeMarks: 0.66, 
              explanation: "The law of conservation of energy states that the total energy of an isolated system remains constant; it is said to be conserved over time." 
            },
            { 
              id: "q2", text: "Calculate the value of $x$ if $3x + 9 = 24$.", type: "NAT", 
              correctAnswer: "5", marks: 2, negativeMarks: 0, 
              explanation: "Subtract 9 from both sides to get $3x = 15$. Divide by 3 to get $x = 5$." 
            }
          ]);
          setLoading(false);
        }, 1200);
        return;
      }

      // ⚡ REAL FIREBASE FETCH FOR LOGGED IN USERS ⚡
      try {
        const resDoc = await getDoc(doc(db, "results", id));
        if (resDoc.exists()) {
          const resData = { id: resDoc.id, ...resDoc.data() };
          setResult(resData);

          const targetExamId = resData.mockId || resData.examId || resData.roomId || resData.quizId;
          
          if (targetExamId) {
            const qRef = collection(db, "mocks", targetExamId, "questions");
            const qSnap = await getDocs(qRef);
            const fetchedQuestions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setOriginalQuestions(fetchedQuestions);
          }
        } else {
          alert("Result not found!");
          router.push("/student");
        }
      } catch (error) {
        console.error("Error fetching result:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (isLoaded) fetchResultAndQuestions();
  }, [id, isLoaded, router, user]);

  // --- THE FIX: Master Array Merger ---
  // We loop over the ORIGINAL questions to guarantee we show Unattempted ones too.
  // GUEST FIX: If it's the dummy guest, we inject dummy answers manually!
  const rawAnswersList = result && result.id === "DEMO-RESULT" 
    ? [{ questionId: "q1", userAnswer: "B", isCorrect: true }, { questionId: "q2", userAnswer: "5", isCorrect: true }]
    : result && result.answers ? (Array.isArray(result.answers) ? result.answers : Object.values(result.answers)) : [];
  
  const fullExamReview = originalQuestions.length > 0 ? originalQuestions.map((q, idx) => {
    // Try to find the student's answer by ID or index
    let studentAns = rawAnswersList.find(a => a.questionId === q.id || a.id === q.id) || rawAnswersList[idx] || null;
    
    const uAns = studentAns ? (studentAns.userAnswer || studentAns.selectedOption || studentAns.answer || studentAns.studentAnswer || "") : "";
    const isUnattempted = !uAns || (Array.isArray(uAns) && uAns.length === 0) || String(uAns).trim() === "";
    
    // Safe correct check
    let isCorrect = false;
    if (studentAns && typeof studentAns.isCorrect === 'boolean') {
      isCorrect = studentAns.isCorrect;
    } else if (!isUnattempted) {
      const safeUser = Array.isArray(uAns) ? uAns.map(String).sort() : [String(uAns).trim()];
      const correctAnsRaw = q.correctAnswer || q.correctOption || "";
      const safeCorrect = Array.isArray(correctAnsRaw) ? correctAnsRaw.map(String).sort() : [String(correctAnsRaw).trim()];
      isCorrect = JSON.stringify(safeUser) === JSON.stringify(safeCorrect);
    }

    return {
      question: q,
      userAnswer: uAns,
      isCorrect: isCorrect,
      isUnattempted: isUnattempted
    };
  }) : rawAnswersList.map(ans => ({
      question: ans.question || ans,
      userAnswer: ans.userAnswer || ans.selectedOption || "",
      isCorrect: ans.isCorrect,
      isUnattempted: !ans.userAnswer || ans.userAnswer.length === 0
  })); 

  const generateAIDiagnostics = async () => {
    setIsAnalyzing(true);

    // ⚡ GUEST MODE SIMULATION: Bypasses API to save costs! ⚡
    if (!user || result.id === "DEMO-RESULT") {
      setTimeout(() => {
        setDiagnosticReport([
          { name: "Core Fundamentals", score: 100, color: "emerald", status: "MASTERED", weakness: "None", strength: "Solid grasp of foundational theory.", recommendedAction: "Proceed to advanced topics." },
          { name: "Mathematical Application", score: 85, color: "emerald", status: "EXCELLENT", weakness: "None", strength: "Accurate NAT computation.", recommendedAction: "Maintain current practice pace." },
          { name: "Time Management", score: 45, color: "amber", status: "NEEDS REVIEW", weakness: "Spent disproportionate time on simple MCQs.", strength: "Accurate when time is not an issue.", recommendedAction: "Take timed mini-quizzes to improve speed." }
        ]);
        setIsAnalyzing(false);
      }, 3500); // Simulate AI thought process
      return;
    }

    // ⚡ REAL AI FETCH ⚡
    try {
      const response = await fetch("/api/analyze-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: fullExamReview, 
          examTitle: result.examTitle,
          examCategory: result.examCategory
        })
      });

      if (!response.ok) throw new Error("Failed to fetch diagnostics.");
      const data = await response.json();
      
      if (Array.isArray(data.diagnostics)) {
        setDiagnosticReport(data.diagnostics);
      } else {
        throw new Error("Invalid format received from AI");
      }
    } catch (error) {
      console.error(error);
      alert("AI failed to analyze the exam. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (loading || !isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-circle-notch fa-spin text-4xl text-indigo-600"></i></div>;
  if (!result) return null;

  const accuracy = Math.round((result.correct / ((result.correct || 0) + (result.incorrect || 0))) * 100) || 0;

  return (
    // ⚡ Removed Sidebar and h-screen constraints so it flows perfectly into layout.jsx ⚡
    <div className="flex flex-col min-h-full bg-slate-50 font-sans relative overflow-hidden">
      
      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {/* --- HEADER --- */}
        <header className="bg-white shadow-sm px-6 py-6 md:py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10">
          <div>
            <button onClick={() => router.push('/student')} className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors bg-slate-100 w-fit px-3 py-1.5 rounded-full border border-slate-200">
              <i className="fas fa-arrow-left"></i> Back to Dashboard
            </button>
            <h1 className="text-2xl font-black text-slate-900">Exam Results: {result.examTitle}</h1>
            <p className="text-sm font-bold text-slate-500 mt-1">Submitted on {result.submittedAt?.toDate().toLocaleString()}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl text-center shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Score</div>
              <div className="text-3xl font-black text-indigo-700 leading-none">{result.score}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-6 py-3 rounded-2xl text-center shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Accuracy</div>
              <div className={`text-3xl font-black leading-none ${accuracy >= 70 ? 'text-emerald-600' : accuracy >= 40 ? 'text-amber-500' : 'text-rose-600'}`}>{accuracy}%</div>
            </div>
          </div>
        </header>

        {/* --- SLEEK HORIZONTAL TABS (Replacing Sidebar) --- */}
        <div className="bg-white border-b border-slate-200 px-6 md:px-8 flex gap-6 z-10 sticky top-0 shadow-sm">
            <button onClick={() => setActiveTab("solutions")} className={`py-4 font-black text-sm transition-colors border-b-2 ${activeTab === 'solutions' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              <i className="fas fa-check-circle mr-2"></i> Review Solutions
            </button>
            <button onClick={() => setActiveTab("diagnostics")} className={`py-4 font-black text-sm transition-colors border-b-2 ${activeTab === 'diagnostics' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              <i className="fas fa-chart-line mr-2"></i> AI Diagnostics & Plans
            </button>
        </div>

        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-8 pb-20">

          {/* TAB 1: SOLUTIONS REVIEW */}
          {activeTab === "solutions" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-indigo-50 border border-indigo-100 p-6 rounded-3xl shadow-sm gap-4">
                <div>
                  <h2 className="text-xl font-black text-indigo-900">Review Your Answers</h2>
                  <p className="text-sm font-medium text-indigo-700 mt-1">Check the official solutions and explanations below.</p>
                </div>
                <button onClick={() => setActiveTab("diagnostics")} className="bg-indigo-600 text-white px-6 py-3.5 rounded-xl font-black shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2 w-full sm:w-auto">
                  Run AI Diagnostics <i className="fas fa-magic"></i>
                </button>
              </div>

              {fullExamReview.map((item, idx) => {
                const questionData = item.question || {}; 
                const qText = questionData.text || "Question details missing.";
                const qType = questionData.type || "MCQ";
                const qMarks = questionData.marks || 2;
                const qNegMarks = questionData.negativeMarks || 0.66;
                const qImage = questionData.imageUrl;
                const qOptions = questionData.options || [];
                const qCorrectAnswer = questionData.correctAnswer || questionData.correctOption || "N/A";
                const qExplanation = questionData.explanation || "";
                const qExplanationImage = questionData.explanationImage || null;

                const isCorrect = item.isCorrect;
                const isUnattempted = item.isUnattempted;
                const uAns = item.userAnswer;

                return (
                  <div key={idx} className={`bg-white border-2 rounded-3xl p-6 md:p-8 shadow-sm ${isCorrect ? 'border-emerald-200' : isUnattempted ? 'border-slate-200' : 'border-rose-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
                      <div className="flex items-center gap-3">
                        <span className="bg-slate-800 text-white text-sm font-black px-4 py-2 rounded-lg shadow-sm">Q{idx + 1}</span>
                        {isCorrect ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] md:text-xs font-black px-3 py-1.5 rounded uppercase tracking-wider"><i className="fas fa-check mr-1"></i> Correct</span>
                        ) : isUnattempted ? (
                          <span className="bg-slate-100 text-slate-600 text-[10px] md:text-xs font-black px-3 py-1.5 rounded uppercase tracking-wider"><i className="fas fa-minus mr-1"></i> Unattempted</span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 text-[10px] md:text-xs font-black px-3 py-1.5 rounded uppercase tracking-wider"><i className="fas fa-times mr-1"></i> Incorrect</span>
                        )}
                      </div>
                      <div className="text-sm font-black text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        {isCorrect ? `+${qMarks}` : isUnattempted ? `0` : `-${qNegMarks}`} Marks
                      </div>
                    </div>

                    <div className="text-slate-800 font-bold mb-6 text-base md:text-lg whitespace-pre-wrap leading-relaxed"><Latex>{qText}</Latex></div>
                    {qImage && <img src={qImage} alt="Question" className="max-h-48 mb-6 rounded-lg border border-slate-200 object-contain p-2" />}

                    {/* Rich Options Rendering */}
                    {qType === 'NAT' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 shadow-inner">
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Your Answer</div>
                          <div className={`text-xl font-black ${isUnattempted ? 'text-slate-400' : isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isUnattempted ? "Not Answered" : Array.isArray(uAns) ? uAns.join(", ") : uAns}
                          </div>
                        </div>
                        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm">
                          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Correct Answer</div>
                          <div className="text-xl font-black text-emerald-700">{Array.isArray(qCorrectAnswer) ? qCorrectAnswer.join(", ") : qCorrectAnswer}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {qOptions.map((opt, optIndex) => {
                           // Safely compare arrays vs strings
                           const correctArr = Array.isArray(qCorrectAnswer) ? qCorrectAnswer.map(String) : [String(qCorrectAnswer)];
                           const userArr = Array.isArray(uAns) ? uAns.map(String) : [String(uAns)];
                           
                           const isCorrectOption = correctArr.includes(String(opt.id));
                           const isUserSelected = userArr.includes(String(opt.id));
                           
                           let borderClass = "border-slate-200 bg-slate-50 opacity-60";
                           let icon = null;

                           if (isCorrectOption) { 
                             borderClass = "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm opacity-100"; 
                             icon = <i className="fas fa-check-circle text-emerald-500 text-2xl shrink-0"></i>; 
                           } else if (isUserSelected && !isCorrectOption) { 
                             borderClass = "border-rose-400 bg-rose-50 ring-2 ring-rose-100 opacity-100"; 
                             icon = <i className="fas fa-times-circle text-rose-500 text-2xl shrink-0"></i>; 
                           } else if (isUserSelected && isCorrectOption) {
                             borderClass = "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm opacity-100"; 
                             icon = <i className="fas fa-check-circle text-emerald-500 text-2xl shrink-0"></i>; 
                           }

                           return (
                             <div key={optIndex} className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${borderClass}`}>
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${isCorrectOption ? 'bg-emerald-500 text-white' : isUserSelected ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                 {opt.id}
                               </div>
                               <div className="flex-1 overflow-x-auto">
                                 <div className={`text-sm font-bold ${isCorrectOption ? 'text-emerald-900' : isUserSelected ? 'text-rose-900' : 'text-slate-800'}`}>
                                   <Latex>{opt.text}</Latex>
                                 </div>
                                 {opt.imageUrl && <img src={opt.imageUrl} alt="Option" className="max-h-24 mt-3 rounded-lg border border-slate-200 object-contain bg-white p-1.5 shadow-sm" />}
                               </div>
                               {icon}
                             </div>
                           )
                        })}
                      </div>
                    )}

                    {/* Explanation */}
                    {(qExplanation || qExplanationImage) && (
                      <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 shadow-inner">
                        <h4 className="text-xs font-black text-indigo-800 uppercase tracking-wider mb-3 flex items-center gap-2"><i className="fas fa-lightbulb text-amber-500"></i> Official Solution</h4>
                        {qExplanation && <div className="text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed"><Latex>{qExplanation}</Latex></div>}
                        {qExplanationImage && <img src={qExplanationImage} alt="Solution" className="mt-4 max-h-64 rounded-lg border border-indigo-200 bg-white p-2 object-contain shadow-sm" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: AI DIAGNOSTICS */}
          {activeTab === "diagnostics" && (
            <div className="animate-in fade-in slide-in-from-right-8">
              
              {!diagnosticReport && !isAnalyzing ? (
                <div className="bg-white p-12 rounded-[2rem] border border-slate-200 shadow-sm text-center">
                  <div className="w-24 h-24 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner border border-indigo-100">
                    <i className="fas fa-brain"></i>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 tracking-tight">Analyze Strongest & Weakness</h2>
                  <p className="text-slate-500 mb-8 max-w-lg mx-auto font-medium leading-relaxed">Let Gemini analyze your correct and incorrect answers to pinpoint exactly which topics or subjects you need to focus on.</p>
                  <button onClick={generateAIDiagnostics} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/30 text-lg flex items-center justify-center gap-3 mx-auto hover:-translate-y-1">
                    Run AI Analysis <i className="fas fa-arrow-right text-sm"></i>
                  </button>
                </div>
              ) : isAnalyzing ? (
                <div className="bg-white p-16 rounded-[2rem] border border-slate-200 shadow-sm text-center">
                  <i className="fas fa-cog fa-spin text-5xl text-indigo-600 mb-6 drop-shadow-md"></i>
                  <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Scanning Exam Responses...</h2>
                  <p className="text-slate-500 font-medium">Correlating topics, calculating weakness metrics, and building action plan.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* LEFT: AI DIAGNOSTIC REPORT LIST */}
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
                    <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                      <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <i className="fas fa-microscope text-indigo-600"></i> Performance Breakdown
                      </h2>
                      <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full border border-slate-200">Based on recent Mock</span>
                    </div>

                    <div className="space-y-6">
                      {diagnosticReport.map((item, i) => (
                        <div key={i} className={`p-6 rounded-2xl border-2 ${item.color === 'rose' ? 'bg-rose-50/30 border-rose-100 shadow-sm' : item.color === 'amber' ? 'bg-amber-50/30 border-amber-100 shadow-sm' : 'bg-emerald-50/30 border-emerald-100 shadow-sm'}`}>
                          
                          <div className="flex justify-between items-end mb-3">
                            <h3 className="font-black text-slate-900 text-lg md:text-xl tracking-tight">{item.name}</h3>
                            <span className={`font-black text-2xl ${item.color === 'rose' ? 'text-rose-600' : item.color === 'amber' ? 'text-amber-500' : 'text-emerald-600'}`}>{item.score}%</span>
                          </div>

                          <div className="w-full bg-slate-200 h-2.5 rounded-full mb-5 overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full ${item.color === 'rose' ? 'bg-rose-500' : item.color === 'amber' ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${item.score}%` }}></div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded tracking-wider border ${item.color === 'rose' ? 'bg-rose-100 text-rose-700 border-rose-200' : item.color === 'amber' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                                {item.status}
                              </span>
                              <span className="text-xs font-bold text-slate-600 leading-tight">
                                {item.weakness !== "None" ? `Review: ${item.weakness}` : "No immediate review needed."}
                              </span>
                            </div>
                            
                            {item.color !== 'emerald' && (
                              <button className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${item.color === 'rose' ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800 hover:-translate-y-0.5' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm hover:-translate-y-0.5'}`}>
                                Auto-Plan <i className="fas fa-magic"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT: CUSTOM ACTION PLAN */}
                  <div className="bg-gradient-to-br from-indigo-950 to-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden flex flex-col border border-indigo-900 h-fit sticky top-6">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-8xl pointer-events-none"><i className="fas fa-border-all"></i></div>
                    <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] pointer-events-none"></div>

                    <div className="relative z-10 flex-1">
                      <h3 className="text-2xl font-black mb-2 flex items-center gap-2 tracking-tight"><i className="fas fa-tools text-indigo-400"></i> Custom Action Plan</h3>
                      <p className="text-xs text-indigo-200 mb-8 font-medium leading-relaxed">Select specific topics and a timeframe to generate a custom daily schedule based on this diagnostic report.</p>

                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1.5">Target Exam</label>
                            <div className="bg-indigo-900/40 border border-indigo-800/60 rounded-xl p-3 text-sm font-bold text-slate-200 shadow-inner">{result.examCategory || "General"}</div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1.5">Timeframe</label>
                            <select className="w-full bg-indigo-900/40 border border-indigo-800/60 rounded-xl p-3 text-sm font-bold text-white outline-none cursor-pointer focus:border-indigo-500 shadow-inner">
                              <option>7 Days</option>
                              <option>14 Days</option>
                              <option>30 Days</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Target Subjects</label>
                          <div className="flex flex-wrap gap-2">
                            {/* Pre-fill with critical weaknesses if any */}
                            {diagnosticReport
                                .filter(r => r.status === "CRITICAL" || r.status === "NEEDS REVIEW" || r.status === "REVIEW")
                                .slice(0, 2)
                                .map((item, idx) => (
                                  <span key={idx} className="bg-indigo-500/20 border border-indigo-400/50 text-indigo-100 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                                    {item.name.substring(0, 15)}... <i className="fas fa-times opacity-50 cursor-pointer hover:opacity-100 transition-opacity"></i>
                                  </span>
                            ))}
                            <button className="border border-indigo-700/50 bg-indigo-900/20 text-indigo-300 text-xs font-bold px-4 py-1.5 rounded-full hover:bg-indigo-800/50 transition-colors shadow-sm">+ Add Subject</button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1.5">Specific Topics (Optional)</label>
                          <input type="text" placeholder="e.g., MOSFET biasing..." className="w-full bg-indigo-900/40 border border-indigo-800/60 rounded-xl p-3.5 text-sm font-medium text-white placeholder-indigo-400/50 outline-none focus:border-indigo-500 transition-colors shadow-inner"/>
                        </div>
                      </div>
                    </div>
                    
                    {/* ⚡ GUEST BLOCKER PROTECTING THE PLAN GENERATOR ⚡ */}
                    <GuestBlocker role="student">
                      <button onClick={() => router.push('/student/planner')} className="w-full bg-indigo-500 text-white font-black py-4 rounded-xl mt-8 hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20 relative z-10 hover:-translate-y-0.5 flex items-center justify-center gap-2">
                        Generate Custom Plan <i className="fas fa-arrow-right text-xs"></i>
                      </button>
                    </GuestBlocker>
                  </div>

                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}