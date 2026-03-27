"use client";

import { useState, useEffect, use, useRef } from "react";
import { doc, getDoc, collection, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// --- MATH RENDERING ---
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

export default function IframeStudentPlayer({ params }) {
  const unwrappedParams = use(params);
  const mockId = unwrappedParams.id;
  const playerRef = useRef(null); // Ref for full-screen wrapper

  // Exam & Student Data
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState({ name: "", email: "", phone: "" });
  
  // Exam Engine State
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Tracking Matrices
  const [answers, setAnswers] = useState({});
  const [visited, setVisited] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  
  // Security State
  const [warnings, setWarnings] = useState(0);
  const MAX_WARNINGS = 3;

  // 1. Fetch Exam Data (NOW POWERED BY REDIS CACHING ⚡)
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await fetch(`/api/exam/${mockId}`);
        if (!res.ok) throw new Error("Exam not found or server error");
        
        const data = await res.json();
        setExamData(data.examData);
        setQuestions(data.questions);
        setTimeLeft(data.examData.duration * 60);
        
        // Mark first question as visited
        if (data.questions.length > 0) setVisited({ 0: true });

      } catch (error) {
        console.error("Error loading exam:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (mockId) fetchExam();
  }, [mockId]);

  // 2. Timer Engine
  useEffect(() => {
    if (!hasStarted || isFinished || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { submitExam(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, isFinished, timeLeft]);

  // ==========================================
  // AGGRESSIVE ANTI-CHEAT ENGINE
  // ==========================================
  useEffect(() => {
    if (!hasStarted || isFinished) return;

    const issueWarning = (reason) => {
      setWarnings(prev => {
        const newWarnings = prev + 1;
        if (newWarnings >= MAX_WARNINGS) {
          alert(`SECURITY VIOLATION: ${reason}. Maximum warnings reached. Auto-submitting exam.`);
          submitExam(true);
        } else {
          alert(`WARNING (${newWarnings}/${MAX_WARNINGS}): ${reason}. Do not leave the exam window!`);
        }
        return newWarnings;
      });
    };

    // A. Detect Tab Switching
    const handleVisibilityChange = () => {
      if (document.hidden) issueWarning("Tab switching detected");
    };

    // B. Detect Split Screen / Window clicking
    const handleBlur = () => {
      issueWarning("Window focus lost (Possible split-screen or external app clicked)");
    };

    // C. Enforce Full Screen
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        issueWarning("Exited full screen mode");
      }
    };

    // D. Block Keyboard Shortcuts (PrintScreen, Copy, Inspect)
    const handleKeyDown = (e) => {
      // PrintScreen Key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        navigator.clipboard.writeText(''); // Clear clipboard instantly
        issueWarning("Screenshot attempt detected");
        e.preventDefault();
      }
      // Ctrl+C, Cmd+C, F12, Ctrl+Shift+I
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'p')) e.preventDefault();
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I')) e.preventDefault();
    };

    // E. Block Right Click & Text Selection
    const preventAction = (e) => e.preventDefault();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", preventAction);
    document.addEventListener("copy", preventAction);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", preventAction);
      document.removeEventListener("copy", preventAction);
    };
  }, [hasStarted, isFinished]);

  // ==========================================
  // EXAM CONTROLS
  // ==========================================

  const startSecureExam = async (e) => {
    e.preventDefault();
    try {
      // Force Fullscreen Request
      if (playerRef.current && playerRef.current.requestFullscreen) {
        await playerRef.current.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen denied. They must be viewing inside an iframe without allow='fullscreen'");
    }
    setHasStarted(true);
  };

  const handleAnswerSelect = (optId) => {
    const q = questions[currentQIndex];
    if (q.type === 'MSQ') {
      let currentAns = answers[currentQIndex] || [];
      if (!Array.isArray(currentAns)) currentAns = [];
      const newAns = currentAns.includes(optId) ? currentAns.filter(id => id !== optId) : [...currentAns, optId];
      setAnswers({ ...answers, [currentQIndex]: newAns });
    } else {
      setAnswers({ ...answers, [currentQIndex]: optId });
    }
  };

  const handleNatInput = (val) => {
    setAnswers({ ...answers, [currentQIndex]: val });
  };

  const clearResponse = () => {
    const newAnswers = { ...answers };
    delete newAnswers[currentQIndex];
    setAnswers(newAnswers);
  };

  const toggleReview = () => {
    setMarkedForReview(prev => ({ ...prev, [currentQIndex]: !prev[currentQIndex] }));
  };

  const navigateTo = (index) => {
    setVisited(prev => ({ ...prev, [index]: true }));
    setCurrentQIndex(index);
  };

  const submitExam = async (isForced = false) => {
    setIsFinished(true);
    
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(e => console.log(e));
    }

    let score = 0;
    let correct = 0;
    let incorrect = 0;
    const totalMarks = questions.reduce((acc, q) => acc + Number(q.marks || 2), 0);

    questions.forEach((q, i) => {
      const studentAns = answers[i];
      
      const isAttempted = q.type === 'MSQ' ? (Array.isArray(studentAns) && studentAns.length > 0) : (studentAns !== undefined && studentAns !== "");

      if (isAttempted) {
        let isRight = false;
        if (q.type === 'MSQ') {
          const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
          isRight = studentAns.length === correctArr.length && studentAns.every(v => correctArr.includes(v));
        } else {
          isRight = studentAns === q.correctAnswer;
        }

        if (isRight) {
          score += Number(q.marks || 2);
          correct++;
        } else {
          score -= Number(q.negativeMarks || 0.66);
          incorrect++;
        }
      }
    });

    const finalScoreFixed = score.toFixed(2);

    try {
      // 1. Save to Database
      await addDoc(collection(db, "mocks", mockId, "submissions"), {
        studentName: studentInfo.name,
        studentEmail: studentInfo.email,
        studentPhone: studentInfo.phone,
        orgId: examData.orgId, 
        score: finalScoreFixed,
        totalMarks: totalMarks,
        correct, incorrect,
        unattempted: questions.length - (correct + incorrect),
        warnings, forcedSubmit: isForced,
        submittedAt: new Date(),
        answers
      });

      // 2. ⚡ TRIGGER AUTOMATED SCORECARD EMAIL ⚡
      await fetch('/api/send-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: studentInfo.email,
          studentName: studentInfo.name,
          score: finalScoreFixed,
          totalMarks: totalMarks,
          orgName: examData.orgName,
          examTitle: examData.title
        })
      });

    } catch (error) { 
      console.error("Failed to process submission:", error); 
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // --- STATUS CALCULATIONS ---
  const totalQs = questions.length;
  let answeredCount = 0;
  let notAnsweredCount = 0;
  let markedCount = 0;
  let notVisitedCount = 0;

  questions.forEach((q, i) => {
    const isAnswered = q.type === 'MSQ' ? (Array.isArray(answers[i]) && answers[i].length > 0) : (answers[i] !== undefined && answers[i] !== "");
    const isMarked = markedForReview[i];
    const isVisited = visited[i];

    if (!isVisited) notVisitedCount++;
    else if (isMarked) markedCount++; // Marked overrides purely answered/not answered in the legend visually
    else if (isAnswered) answeredCount++;
    else notAnsweredCount++;
  });

  // --- UI SCREENS ---

  if (isLoading) return <div className="flex h-screen items-center justify-center bg-white"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;
  if (!examData || questions.length === 0) return <div className="flex h-screen items-center justify-center bg-white text-slate-500 font-bold">This exam is unavailable.</div>;

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-100 font-sans flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-8 text-center relative border-b-4 border-indigo-500">
            {examData.orgLogo ? (
               <img src={examData.orgLogo} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4 bg-white p-1 rounded-xl shadow-md" />
            ) : (
               <div className="w-16 h-16 bg-indigo-500 text-white rounded-xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-md"><i className="fas fa-building"></i></div>
            )}
            <h1 className="text-2xl font-black text-white mb-1">{examData.title}</h1>
            <p className="text-slate-400 font-bold text-sm">Powered by {examData.orgName}</p>
          </div>

          <div className="p-8">
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl mb-6 text-xs font-black shadow-sm">
               <i className="fas fa-shield-alt mr-1"></i> STRICT ANTI-CHEAT ENABLED
               <ul className="mt-2 ml-4 list-disc font-bold opacity-80 space-y-1">
                 <li>Browser will lock into Full Screen mode.</li>
                 <li>Switching tabs or clicking other apps will flag your exam.</li>
                 <li>Screenshots, Copy, and Paste are disabled.</li>
               </ul>
            </div>

            <form onSubmit={startSecureExam} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
                <input required type="text" value={studentInfo.name} onChange={e => setStudentInfo({...studentInfo, name: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500" placeholder="John Doe" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Email</label>
                  <input required type="email" value={studentInfo.email} onChange={e => setStudentInfo({...studentInfo, email: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500" placeholder="john@email.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Phone</label>
                  <input required type="tel" value={studentInfo.phone} onChange={e => setStudentInfo({...studentInfo, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500" placeholder="9876543210" />
                </div>
              </div>
              <button type="submit" className="w-full mt-6 bg-indigo-600 text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-indigo-700 transition hover:-translate-y-0.5 flex items-center justify-center gap-2">
                <i className="fas fa-lock"></i> Start Secure Exam
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-10 text-center border border-slate-200">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"><i className="fas fa-check-circle"></i></div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Exam Submitted Successfully!</h2>
          <p className="text-slate-500 font-medium mb-6">Your responses have been securely recorded by {examData.orgName}.</p>
          <div className="bg-slate-100 text-slate-400 p-4 rounded-xl text-xs font-bold">You may now exit full screen and close this tab.</div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];

  return (
    <div ref={playerRef} className="h-screen flex flex-col bg-white font-sans select-none overflow-hidden">
      
      {/* SECURE HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 h-14 md:h-16 px-4 md:px-6 flex justify-between items-center shrink-0 z-10 text-white">
        <div className="flex items-center gap-3">
          {examData.orgLogo && <img src={examData.orgLogo} alt="Logo" className="h-8 bg-white p-1 rounded-md" />}
          <span className="font-black text-sm tracking-wide hidden sm:block">{examData.title}</span>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8">
          {warnings > 0 && (
            <div className="bg-rose-500/20 text-rose-300 px-3 py-1 rounded border border-rose-500/50 text-[10px] font-black animate-pulse">
              <i className="fas fa-exclamation-triangle"></i> WARNING: {warnings}/{MAX_WARNINGS}
            </div>
          )}
          <div className={`font-mono text-lg md:text-2xl font-black flex items-center gap-2 tracking-wider ${timeLeft < 300 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            <i className="far fa-clock"></i> {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* SUB-HEADER (SECTIONS) */}
      <div className="bg-slate-50 border-b border-slate-200 h-10 px-4 flex items-center gap-2 overflow-x-auto hide-scrollbar">
         {/* Mapping sections if they exist, otherwise default to General */}
         {Array.from(new Set(questions.map(q => q.section || "General"))).map((sec, idx) => (
           <button key={idx} className="bg-indigo-600 text-white px-4 py-1 rounded text-xs font-black shadow-sm shrink-0 uppercase tracking-widest">{sec}</button>
         ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: QUESTION AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col">
            
            <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-slate-800">Question {currentQIndex + 1}</span>
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">{currentQ.type}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded text-xs font-black">+{currentQ.marks || 2}</span>
                <span className="text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded text-xs font-black">-{currentQ.negativeMarks || 0.66}</span>
              </div>
            </div>

            <div className="text-base md:text-lg font-bold text-slate-900 leading-relaxed mb-6">
              <Latex>{currentQ.text}</Latex>
            </div>

            {currentQ.imageUrl && (
              <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-inner">
                <img src={currentQ.imageUrl} alt="Diagram" className="max-h-80 mx-auto object-contain pointer-events-none" />
              </div>
            )}

            <div className="flex-1">
              {currentQ.type === 'NAT' ? (
                <div className="bg-slate-50 border border-slate-300 rounded-xl p-6 shadow-inner">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Numerical Value</label>
                  <input 
                    type="number" 
                    value={answers[currentQIndex] || ''} 
                    onChange={(e) => handleNatInput(e.target.value)} 
                    className="w-full max-w-xs bg-white border-2 border-slate-300 rounded-xl p-3 text-xl font-black text-slate-900 outline-none focus:border-indigo-500 shadow-sm" 
                    placeholder="Enter answer..."
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {currentQ.options?.map((opt, idx) => {
                    const isSelected = currentQ.type === 'MSQ' 
                      ? (Array.isArray(answers[currentQIndex]) && answers[currentQIndex].includes(opt.id))
                      : answers[currentQIndex] === opt.id;

                    return (
                      <div 
                        key={idx} 
                        onClick={() => handleAnswerSelect(opt.id)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-4 ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 hover:border-slate-400 bg-white'}`}
                      >
                        <div className={`w-6 h-6 shrink-0 mt-0.5 flex items-center justify-center border-2 ${currentQ.type === 'MSQ' ? 'rounded' : 'rounded-full'} ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-400 text-transparent'}`}>
                          <i className={`fas ${currentQ.type === 'MSQ' ? 'fa-check text-[10px]' : 'fa-circle text-[8px]'}`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 leading-relaxed"><Latex>{opt.text}</Latex></div>
                          {opt.imageUrl && <img src={opt.imageUrl} alt="Option" className="max-h-32 mt-3 rounded-lg border border-slate-200 pointer-events-none" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* BOTTOM CONTROLS */}
          <div className="max-w-4xl w-full mx-auto mt-8 border-t border-slate-200 pt-4 flex flex-wrap justify-between gap-4">
            <div className="flex gap-3">
              <button 
                onClick={toggleReview} 
                className={`px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition border ${markedForReview[currentQIndex] ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
              >
                <i className="fas fa-bookmark mr-1.5"></i> {markedForReview[currentQIndex] ? "Unmark Review" : "Mark for Review"}
              </button>
              <button onClick={clearResponse} className="bg-white border border-slate-300 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black shadow-sm hover:bg-slate-50 transition">
                Clear Response
              </button>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => navigateTo(Math.max(0, currentQIndex - 1))} disabled={currentQIndex === 0} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-black shadow-md hover:bg-slate-700 transition disabled:opacity-50">
                <i className="fas fa-arrow-left mr-2"></i> Prev
              </button>
              <button onClick={() => navigateTo(Math.min(questions.length - 1, currentQIndex + 1))} disabled={currentQIndex === questions.length - 1} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-black shadow-md hover:bg-indigo-700 transition disabled:opacity-50">
                Save & Next <i className="fas fa-arrow-right ml-2"></i>
              </button>
            </div>
          </div>
        </main>

        {/* RIGHT: QUESTION PALETTE & STATUS */}
        <aside className="w-72 bg-slate-50 border-l border-slate-200 hidden lg:flex flex-col shrink-0">
          
          {/* Status Tracker */}
          <div className="p-4 grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wide border-b border-slate-200">
             <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 p-2 rounded-lg flex justify-between items-center">
               <span>Answered</span> <span className="text-sm">{answeredCount}</span>
             </div>
             <div className="bg-rose-100 border border-rose-300 text-rose-800 p-2 rounded-lg flex justify-between items-center">
               <span>Not Ans</span> <span className="text-sm">{notAnsweredCount}</span>
             </div>
             <div className="bg-slate-200 border border-slate-300 text-slate-700 p-2 rounded-lg flex justify-between items-center">
               <span>Not Visit</span> <span className="text-sm">{notVisitedCount}</span>
             </div>
             <div className="bg-purple-100 border border-purple-300 text-purple-800 p-2 rounded-lg flex justify-between items-center">
               <span>Review</span> <span className="text-sm">{markedCount}</span>
             </div>
          </div>

          {/* Palette Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-widest">Questions</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, i) => {
                const isAnswered = questions[i].type === 'MSQ' ? (Array.isArray(answers[i]) && answers[i].length > 0) : (answers[i] !== undefined && answers[i] !== "");
                const isMarked = markedForReview[i];
                const isVis = visited[i];
                const isCurrent = currentQIndex === i;
                
                // Color Logic mapped exactly to professional standards
                let btnStyle = "bg-white border-slate-300 text-slate-500"; // Not Visited
                if (isVis && !isAnswered) btnStyle = "bg-rose-100 border-rose-400 text-rose-800"; // Visited, Not Answered
                if (isAnswered) btnStyle = "bg-emerald-500 border-emerald-600 text-white"; // Answered
                if (isMarked) btnStyle = "bg-purple-500 border-purple-600 text-white"; // Marked for review (overrides answered color in palette)
                if (isMarked && isAnswered) btnStyle = "bg-purple-500 border-purple-600 text-white ring-2 ring-emerald-400 ring-offset-1"; // Marked AND Answered

                return (
                  <button 
                    key={i}
                    onClick={() => navigateTo(i)}
                    className={`h-10 rounded-lg text-xs font-black transition-all border-2 flex items-center justify-center shadow-sm relative
                      ${btnStyle} 
                      ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110 z-10' : 'hover:scale-105'}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-slate-200">
            <button onClick={() => { if(window.confirm("Are you sure you want to final submit? You cannot undo this.")) submitExam(); }} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl text-sm font-black shadow-lg transition uppercase tracking-widest">
              Submit Exam
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
}