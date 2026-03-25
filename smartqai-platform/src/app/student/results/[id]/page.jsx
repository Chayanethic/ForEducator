"use client";

import { useState, useEffect, use } from "react";
import { useUser } from "@clerk/nextjs";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
  }, [id, isLoaded, router]);

  // --- THE FIX: Master Array Merger ---
  // We loop over the ORIGINAL questions to guarantee we show Unattempted ones too.
  const rawAnswersList = result && result.answers ? (Array.isArray(result.answers) ? result.answers : Object.values(result.answers)) : [];
  
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
  })); // Fallback if original questions fail to load

  const generateAIDiagnostics = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: fullExamReview, // Pass the FULL review to AI
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
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-64 bg-indigo-950 text-white flex flex-col shrink-0 hidden md:flex">
        <div className="p-6 flex items-center gap-3 border-b border-indigo-900/50">
          <i className="fas fa-book-open-reader text-emerald-400"></i> OZONE
          
        </div>
        <div className="p-4">
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-3">Core Analysis</div>
          <button onClick={() => setActiveTab("diagnostics")} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition ${activeTab === 'diagnostics' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-indigo-200 hover:bg-indigo-900'}`}>
            <i className="fas fa-chart-line w-5"></i> Diagnostics & Plans
          </button>
        </div>
        <div className="p-4 pt-0">
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 px-3">Exam Prep</div>
          <button onClick={() => setActiveTab("solutions")} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold transition ${activeTab === 'solutions' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-indigo-200 hover:bg-indigo-900'}`}>
            <i className="fas fa-check-circle w-5"></i> Review Solutions
          </button>
          <Link href="/student" className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-900 p-3 rounded-xl font-bold transition mt-1">
            <i className="fas fa-home w-5"></i> Dashboard
          </Link>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto">
        
        <header className="bg-white shadow-sm p-6 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Exam Results: {result.examTitle}</h1>
            <p className="text-sm font-bold text-slate-500 mt-1">Submitted on {result.submittedAt?.toDate().toLocaleString()}</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-slate-50 border border-slate-200 px-5 py-2 rounded-xl text-center shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Score</div>
              <div className="text-xl font-black text-indigo-700">{result.score}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-5 py-2 rounded-xl text-center shadow-sm">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accuracy</div>
              <div className={`text-xl font-black ${accuracy >= 70 ? 'text-emerald-600' : accuracy >= 40 ? 'text-amber-500' : 'text-rose-600'}`}>{accuracy}%</div>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8">

          {/* TAB 1: SOLUTIONS REVIEW */}
          {activeTab === "solutions" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 p-5 rounded-2xl">
                <div>
                  <h2 className="text-lg font-black text-indigo-900">Review Your Answers</h2>
                  <p className="text-sm font-medium text-indigo-700 mt-1">Check the official solutions and explanations below.</p>
                </div>
                <button onClick={() => setActiveTab("diagnostics")} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition flex items-center gap-2">
                  Analyze Strongest & Weakness <i className="fas fa-magic"></i>
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
                  <div key={idx} className={`bg-white border-2 rounded-2xl p-6 shadow-sm ${isCorrect ? 'border-emerald-200' : isUnattempted ? 'border-slate-200' : 'border-rose-200'}`}>
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="bg-slate-800 text-white text-xs font-black px-3 py-1.5 rounded">Q{idx + 1}</span>
                        {isCorrect ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded uppercase tracking-wider"><i className="fas fa-check mr-1"></i> Correct</span>
                        ) : isUnattempted ? (
                          <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded uppercase tracking-wider"><i className="fas fa-minus mr-1"></i> Unattempted</span>
                        ) : (
                          <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-3 py-1 rounded uppercase tracking-wider"><i className="fas fa-times mr-1"></i> Incorrect</span>
                        )}
                      </div>
                      <div className="text-sm font-black text-slate-500">
                        {isCorrect ? `+${qMarks}` : isUnattempted ? `0` : `-${qNegMarks}`} Marks
                      </div>
                    </div>

                    <p className="text-slate-800 font-bold mb-4 whitespace-pre-wrap">{qText}</p>
                    {qImage && <img src={qImage} alt="Question" className="max-h-48 mb-6 rounded-lg border border-slate-200 object-contain" />}

                    {/* Rich Options Rendering */}
                    {qType === 'NAT' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Your Answer</div>
                          <div className={`text-lg font-black ${isUnattempted ? 'text-slate-400' : isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isUnattempted ? "Not Answered" : Array.isArray(uAns) ? uAns.join(", ") : uAns}
                          </div>
                        </div>
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Correct Answer</div>
                          <div className="text-lg font-black text-emerald-700">{Array.isArray(qCorrectAnswer) ? qCorrectAnswer.join(", ") : qCorrectAnswer}</div>
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
                           
                           let borderClass = "border-slate-200 bg-slate-50";
                           if (isCorrectOption) borderClass = "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm";
                           else if (isUserSelected && !isCorrectOption) borderClass = "border-rose-400 bg-rose-50 ring-2 ring-rose-100";

                           return (
                             <div key={optIndex} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition ${borderClass}`}>
                               <div className={`w-7 h-7 rounded flex items-center justify-center text-sm font-black shrink-0 ${isCorrectOption ? 'bg-emerald-500 text-white' : isUserSelected ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                 {opt.id}
                               </div>
                               <div className="flex-1">
                                 <div className={`text-sm font-bold ${isCorrectOption ? 'text-emerald-900' : isUserSelected ? 'text-rose-900' : 'text-slate-800'}`}>
                                   {opt.text}
                                 </div>
                                 {opt.imageUrl && <img src={opt.imageUrl} alt="Option" className="max-h-24 mt-3 rounded-lg border border-slate-200 object-contain bg-white p-1" />}
                               </div>
                               {isCorrectOption && <i className="fas fa-check-circle text-emerald-500 text-2xl"></i>}
                               {isUserSelected && !isCorrectOption && <i className="fas fa-times-circle text-rose-500 text-2xl"></i>}
                             </div>
                           )
                        })}
                      </div>
                    )}

                    {/* Explanation */}
                    {(qExplanation || qExplanationImage) && (
                      <div className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100">
                        <h4 className="text-xs font-black text-indigo-800 uppercase tracking-wider mb-2"><i className="fas fa-lightbulb text-amber-500 mr-2"></i> Official Solution</h4>
                        {qExplanation && <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{qExplanation}</p>}
                        {qExplanationImage && <img src={qExplanationImage} alt="Solution" className="mt-4 max-h-64 rounded-lg border border-indigo-200 bg-white p-2 object-contain" />}
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
                  <div className="w-24 h-24 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                    <i className="fas fa-brain"></i>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-3">Analyze Strongest & Weakness</h2>
                  <p className="text-slate-500 mb-8 max-w-md mx-auto font-medium">Let Gemini analyze your correct and incorrect answers to pinpoint exactly which topics or subjects you need to focus on.</p>
                  <button onClick={generateAIDiagnostics} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/30 text-lg">
                    Run AI Analysis <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              ) : isAnalyzing ? (
                <div className="bg-white p-16 rounded-[2rem] border border-slate-200 shadow-sm text-center">
                  <i className="fas fa-cog fa-spin text-5xl text-indigo-600 mb-6"></i>
                  <h2 className="text-xl font-black text-slate-900">Scanning Exam Responses...</h2>
                  <p className="text-slate-500 mt-2">Correlating topics, calculating weakness metrics, and building action plan.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* LEFT: AI DIAGNOSTIC REPORT LIST */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <i className="fas fa-microscope text-indigo-600"></i> Performance Breakdown
                      </h2>
                      <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full">Based on recent Mock</span>
                    </div>

                    <div className="space-y-6">
                      {diagnosticReport.map((item, i) => (
                        <div key={i} className={`p-5 rounded-xl border ${item.color === 'rose' ? 'bg-rose-50/30 border-rose-100' : item.color === 'amber' ? 'bg-amber-50/30 border-amber-100' : 'bg-emerald-50/30 border-emerald-100'}`}>
                          
                          <div className="flex justify-between items-end mb-2">
                            <h3 className="font-black text-slate-900 text-lg">{item.name}</h3>
                            <span className={`font-black text-xl ${item.color === 'rose' ? 'text-rose-600' : item.color === 'amber' ? 'text-amber-500' : 'text-emerald-600'}`}>{item.score}%</span>
                          </div>

                          <div className="w-full bg-slate-200 h-2 rounded-full mb-4 overflow-hidden">
                            <div className={`h-full rounded-full ${item.color === 'rose' ? 'bg-rose-500' : item.color === 'amber' ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${item.score}%` }}></div>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded tracking-wider ${item.color === 'rose' ? 'bg-rose-100 text-rose-700' : item.color === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {item.status}
                              </span>
                              <span className="text-xs font-bold text-slate-600">
                                {item.weakness !== "None" ? `Review: ${item.weakness}` : "No immediate review needed."}
                              </span>
                            </div>
                            
                            {item.color !== 'emerald' && (
                              <button className={`px-4 py-2 rounded-lg text-xs font-black transition ${item.color === 'rose' ? 'bg-slate-900 text-white shadow-md' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                                Auto-Plan <i className="fas fa-magic ml-1"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT: CUSTOM ACTION PLAN */}
                  <div className="bg-indigo-950 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl"><i className="fas fa-border-all"></i></div>
                    <div className="relative z-10 flex-1">
                      <h3 className="text-xl font-black mb-2 flex items-center gap-2"><i className="fas fa-tools text-indigo-400"></i> Custom Action Plan</h3>
                      <p className="text-xs text-indigo-200 mb-6 font-medium">Select specific topics and a timeframe to generate a custom daily schedule.</p>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Exam</label>
                            <div className="bg-indigo-900/50 border border-indigo-800 rounded-lg p-2.5 text-sm font-bold">{result.examCategory || "General"}</div>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Timeframe</label>
                            <select className="w-full bg-indigo-900/50 border border-indigo-800 rounded-lg p-2.5 text-sm font-bold text-white outline-none cursor-pointer">
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
                                .filter(r => r.status === "CRITICAL")
                                .slice(0, 2)
                                .map((item, idx) => (
                                  <span key={idx} className="bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-2">
                                    {item.name.substring(0, 10)}... <i className="fas fa-times opacity-50 cursor-pointer"></i>
                                  </span>
                            ))}
                            <button className="border border-indigo-700 text-indigo-300 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-indigo-900 transition">+ Add Subject</button>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Specific Topics (Optional)</label>
                          <input type="text" placeholder="e.g., MOSFET biasing..." className="w-full bg-indigo-900/50 border border-indigo-800 rounded-lg p-3 text-sm font-medium text-white placeholder-indigo-400/50 outline-none focus:border-indigo-500"/>
                        </div>
                      </div>
                    </div>
                    
                    <button className="w-full bg-indigo-500 text-white font-black py-4 rounded-xl mt-6 hover:bg-indigo-400 transition shadow-lg shadow-indigo-500/20 relative z-10">
                      Generate Custom Plan
                    </button>
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