"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { doc, getDoc, collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

// --- MATH RENDERING ---
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

export default function EducatorMockDetails({ params }) {
  const unwrappedParams = use(params);
  const mockId = unwrappedParams.id;
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmissionsLoading, setIsSubmissionsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // UI State for Tabs
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'submissions'

  // Fetch Exam Details & Questions
  useEffect(() => {
    const fetchExamDetails = async () => {
      if (!mockId) return;
      try {
        // 1. Fetch Exam Meta
        const examRef = doc(db, "mock_exams", mockId);
        const examSnap = await getDoc(examRef);
        
        if (!examSnap.exists()) {
          console.error("Exam not found");
          setIsLoading(false);
          return;
        }
        setExam({ id: examSnap.id, ...examSnap.data() });

        // 2. Fetch Exam Questions
        const qRef = collection(db, "mock_exams", mockId, "questions");
        const qSnap = await getDocs(qRef);
        
        let fetchedQuestions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedQuestions.sort((a, b) => a.order - b.order);
        setQuestions(fetchedQuestions);

      } catch (error) {
        console.error("Error fetching exam:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExamDetails();
  }, [mockId]);

  // Fetch Student Submissions
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!mockId) return;
      try {
        const resultsRef = collection(db, "results");
        const q = query(resultsRef, where("mockId", "==", mockId));
        const snap = await getDocs(q);
        
        let fetchedSubmissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Sort by submission date (newest first)
        fetchedSubmissions.sort((a, b) => {
          const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(0);
          const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(0);
          return dateB - dateA;
        });
        
        setSubmissions(fetchedSubmissions);
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setIsSubmissionsLoading(false);
      }
    };

    fetchSubmissions();
  }, [mockId]);

  const copyToClipboard = () => {
    if (exam?.id) {
      navigator.clipboard.writeText(exam.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading || !isLoaded) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;
  }

  if (!exam) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 flex-col">
        <h2 className="text-2xl font-black text-slate-800 mb-2">Exam Not Found</h2>
        <button onClick={() => router.push('/educator/exam-generator')} className="text-indigo-600 font-bold hover:underline">Return to Studio</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#FAFAFA] font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden relative">
      
      {/* Subtle Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/40 via-[#FAFAFA] to-[#FAFAFA] pointer-events-none"></div>

      {/* Header Area (Full Width, No Sidebar) */}
      <header className="relative z-20 px-6 md:px-10 py-5 flex justify-between items-center w-full border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-600/20">
            O
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">OZONE Educator</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Portal Management</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={() => router.push('/educator/dashboard')} className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition flex items-center gap-2">
             <i className="fas fa-home"></i> Dashboard
           </button>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10">
        <div className="max-w-6xl mx-auto w-full">
          
          <button 
            onClick={() => router.push('/educator/exam-generator')} 
            className="mb-8 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-200 px-5 py-2.5 rounded-full shadow-sm transition-all w-fit"
          >
            <i className="fas fa-arrow-left"></i> Back to Exam Studio
          </button>

          {/* TOP HEADER CARD */}
          <div className="bg-white rounded-3xl p-8 md:p-10 shadow-xl shadow-indigo-900/5 border border-slate-100 mb-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${exam.isPublic ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                    {exam.isPublic ? 'Public Exam' : 'Private Exam'}
                  </span>
                  <span className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                    {exam.category}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${exam.status === 'draft' ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'}`}>
                    {exam.status === 'draft' ? 'Draft' : 'Published'}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">{exam.title || `${exam.topic} Assessment`}</h2>
                <p className="text-slate-500 font-bold text-sm flex items-center gap-2">
                  <i className="fas fa-bullseye text-indigo-400"></i> Core Concept: {exam.topic}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-inner w-full lg:w-auto shrink-0">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <i className="fas fa-key text-indigo-400"></i> Shareable Exam ID
                </span>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm gap-6">
                  <code className="text-xl font-mono font-black text-indigo-600 tracking-wider pl-3 select-all">
                    {exam.id}
                  </code>
                  <button 
                    onClick={copyToClipboard}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${copied ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}
                  >
                    <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-lg`}></i>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 pt-8 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shadow-sm border border-indigo-100"><i className="fas fa-list-ol"></i></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Questions</p>
                  <p className="text-base font-black text-slate-800">{questions.length} Qs</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xl shadow-sm border border-amber-100"><i className="fas fa-stopwatch"></i></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration</p>
                  <p className="text-base font-black text-slate-800">{exam.duration} Mins</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center text-xl shadow-sm border border-violet-100"><i className="fas fa-layer-group"></i></div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Difficulty</p>
                  <p className="text-base font-black text-slate-800">{exam.difficulty}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm border ${exam.allowCalculator ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                  <i className={exam.allowCalculator ? "fas fa-calculator" : "fas fa-ban"}></i>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculator</p>
                  <p className="text-base font-black text-slate-800">{exam.allowCalculator ? "Allowed" : "Disabled"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* TABS NAVIGATION */}
          <div className="flex gap-2 border-b-2 border-slate-200 mb-8 overflow-x-auto custom-scrollbar">
             <button 
               onClick={() => setActiveTab('overview')} 
               className={`pb-4 px-4 text-sm font-black uppercase tracking-widest whitespace-nowrap transition-colors relative ${activeTab === 'overview' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
             >
               <i className="fas fa-file-alt mr-2"></i> Master Key & Preview
               {activeTab === 'overview' && <div className="absolute bottom-[-2px] left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
             </button>
             <button 
               onClick={() => setActiveTab('submissions')} 
               className={`pb-4 px-4 text-sm font-black uppercase tracking-widest whitespace-nowrap transition-colors relative flex items-center gap-2 ${activeTab === 'submissions' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
             >
               <i className="fas fa-users"></i> Student Submissions 
               <span className={`px-2 py-0.5 rounded text-[10px] ${activeTab === 'submissions' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>{submissions.length}</span>
               {activeTab === 'submissions' && <div className="absolute bottom-[-2px] left-0 w-full h-1 bg-indigo-600 rounded-t-full"></div>}
             </button>
          </div>

          {/* TAB 1: OVERVIEW & KEY */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {questions.map((q, index) => (
                <div key={q.id} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                    <span className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-sm font-black uppercase tracking-widest shadow-sm">
                      Question {index + 1}
                    </span>
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200">{q.type || 'MCQ'}</span>
                  </div>
                  
                  <div className="font-bold text-slate-800 leading-relaxed mb-8 text-base lg:text-lg">
                    <Latex>{q.text || ""}</Latex>
                  </div>

                  {/* Render Options if MCQ/MSQ */}
                  {q.options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {q.options.map((opt) => {
                        let isCorrect = false;
                        if (q.type === 'MSQ' && Array.isArray(q.correctAnswer)) {
                          isCorrect = q.correctAnswer.includes(opt.id);
                        } else {
                          isCorrect = q.correctAnswer === opt.id;
                        }

                        return (
                          <div key={opt.id} className={`p-4 rounded-xl border-2 flex items-start gap-4 text-sm transition-all ${isCorrect ? 'bg-emerald-50 border-emerald-400 shadow-sm' : 'bg-white border-slate-200'}`}>
                            <span className={`font-black mt-0.5 ${isCorrect ? 'text-emerald-600' : 'text-slate-400'}`}>{opt.id})</span>
                            <span className={`font-bold ${isCorrect ? 'text-emerald-950' : 'text-slate-700'}`}>
                              <Latex>{opt.text}</Latex>
                            </span>
                            {isCorrect && <i className="fas fa-check-circle text-emerald-500 text-lg ml-auto"></i>}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Render NAT Answer */}
                  {!q.options && q.type === 'NAT' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8 inline-block shadow-sm">
                      <span className="text-xs font-black text-emerald-700 uppercase tracking-widest block mb-1">Correct Numerical Answer</span>
                      <span className="text-2xl font-black text-emerald-900">{q.correctAnswer}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100 text-xs font-bold">
                    <span className="text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"><i className="fas fa-plus-circle mr-1"></i> {q.marks || 2} Marks</span>
                    <span className="text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100"><i className="fas fa-minus-circle mr-1"></i> {q.negativeMarks || 0.66} Negative</span>
                    <span className="text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 ml-auto"><i className="fas fa-tag mr-1"></i> {q.section || "General"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: STUDENT SUBMISSIONS */}
          {activeTab === 'submissions' && (
            <div className="animate-in fade-in duration-500">
              {isSubmissionsLoading ? (
                <div className="flex justify-center items-center py-20">
                   <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : submissions.length === 0 ? (
                <div className="bg-white border border-slate-200 border-dashed rounded-[2rem] p-16 text-center">
                  <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-inner">
                    <i className="fas fa-inbox"></i>
                  </div>
                  <h3 className="text-xl font-black text-slate-700 mb-2">No Submissions Yet</h3>
                  <p className="text-slate-500 font-medium">When students complete this exam using your unique ID, their results will instantly appear here.</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500">
                          <th className="p-5 font-black whitespace-nowrap">Candidate Name</th>
                          <th className="p-5 font-black whitespace-nowrap">Final Score</th>
                          <th className="p-5 font-black whitespace-nowrap">Accuracy</th>
                          <th className="p-5 font-black whitespace-nowrap">AI Trust Score</th>
                          <th className="p-5 font-black whitespace-nowrap">Submitted At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {submissions.map((sub) => {
                          const totalAttempted = (sub.correct || 0) + (sub.incorrect || 0);
                          const accuracy = totalAttempted > 0 ? Math.round(((sub.correct || 0) / totalAttempted) * 100) : 0;
                          
                          // Determine Trust Status based on violations
                          const isHighRisk = (sub.violations || 0) >= 3;
                          const isWarning = (sub.violations || 0) > 0 && (sub.violations || 0) < 3;

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="p-5">
                                <div className="font-black text-slate-800 text-sm mb-0.5">{sub.studentName}</div>
                                <div className="text-[10px] font-bold text-slate-400 tracking-wide">{sub.studentEmail}</div>
                              </td>
                              <td className="p-5">
                                <div className="inline-flex items-center justify-center bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-black text-sm">
                                  {sub.score} <span className="text-[10px] text-indigo-400 ml-1">/ {sub.totalMarks}</span>
                                </div>
                              </td>
                              <td className="p-5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden w-24">
                                      <div className="bg-emerald-500 h-full" style={{ width: `${accuracy}%` }}></div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">{accuracy}%</span>
                                  </div>
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                    <span className="text-emerald-500">{sub.correct || 0} Correct</span> • <span className="text-rose-500">{sub.incorrect || 0} Wrong</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-5">
                                {isHighRisk ? (
                                  <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    <i className="fas fa-exclamation-triangle"></i> Terminated ({sub.violations} Flags)
                                  </span>
                                ) : isWarning ? (
                                  <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    <i className="fas fa-exclamation-circle"></i> Warned ({sub.violations} Flags)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm">
                                    <i className="fas fa-shield-check"></i> Clean (0 Flags)
                                  </span>
                                )}
                              </td>
                              <td className="p-5 text-xs font-bold text-slate-500">
                                {formatDate(sub.submittedAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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