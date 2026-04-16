"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk, useOrganizationList } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, orderBy, limit, startAfter } from "firebase/firestore";
import { db } from "@/lib/firebase";

// --- MATH RENDERING IMPORTS ---
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// --- PRODUCT TOUR INTEGRATION ---
import ProductTour from "@/components/ProductTour";

const CATEGORIES = ["GATE ECE", "GATE CS", "GATE EE", "GATE ME", "JEE Mains", "SSC CGL"];

export default function StudentDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk(); 
  const router = useRouter();
  
  // ⚡ FIX: Added hook to handle Workspace Reset
  const { setActive, isLoaded: isOrgListLoaded } = useOrganizationList();

  // --- UI & FEED STATE ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("GATE ECE");
  const [publicMocks, setPublicMocks] = useState([]);
  const [activeProgress, setActiveProgress] = useState([]);
  
  // --- PAGINATION STATE FOR RECENT EXAMS ---
  const [pastResults, setPastResults] = useState([]); 
  const [lastVisibleDoc, setLastVisibleDoc] = useState(null);
  const [hasMoreResults, setHasMoreResults] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLoadingMain, setIsLoadingMain] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // --- PROFESSIONAL ALERT/TOAST SYSTEM ---
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- ACTIVE ROADMAP & CALENDAR STATE ---
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [justCompletedDay, setJustCompletedDay] = useState(null);

  // --- STUDENT DEEP-DIVE MODAL STATE ---
  const [selectedResult, setSelectedResult] = useState(null);
  const [modalQuestions, setModalQuestions] = useState([]); 
  const [isFetchingReport, setIsFetchingReport] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("solutions"); 
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState(null);

  // --- CALENDAR HELPERS ---
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // ⚡ FIX: Force Clerk into Personal Workspace (Solo Mode) on Load
  useEffect(() => {
    if (isOrgListLoaded && setActive) {
      setActive({ organization: null });
    }
  }, [isOrgListLoaded, setActive]);

  useEffect(() => {
    const fetchPersonalData = async () => {
      if (!user) return;
      try {
        // 1. Fetch In-Progress Exams
        const progressRef = collection(db, "progress");
        const qProgress = query(progressRef, where("studentId", "==", user.id), where("isSubmitted", "==", false));
        const progressSnap = await getDocs(qProgress);
        setActiveProgress(progressSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 2. Fetch Recent Completed Exams (PAGINATED)
        const resultsRef = collection(db, "results");
        const qResults = query(
          resultsRef, 
          where("studentId", "==", user.id),
          orderBy("submittedAt", "desc"),
          limit(5)
        );
        const resultsSnap = await getDocs(qResults);
        
        let fetchedResults = resultsSnap.docs.map(d => ({ 
            id: d.id, ...d.data(), submittedDate: d.data().submittedAt?.toDate() || new Date()
        }));
        
        setPastResults(fetchedResults);
        setLastVisibleDoc(resultsSnap.docs[resultsSnap.docs.length - 1]); 
        if (resultsSnap.docs.length < 5) setHasMoreResults(false);

        // 3. Fetch Active Roadmap
        const rmRef = collection(db, "roadmaps");
        const qRm = query(rmRef, where("studentId", "==", user.id));
        const rmSnap = await getDocs(qRm);
        if (!rmSnap.empty) {
          setActiveRoadmap({ id: rmSnap.docs[0].id, ...rmSnap.docs[0].data() });
        }
      } catch (error) {
        console.error("Error fetching personal data:", error);
      } finally {
        setIsLoadingMain(false);
      }
    };
    if (isLoaded && isSignedIn) fetchPersonalData();
  }, [user, isLoaded, isSignedIn]);

  const loadMoreExams = async () => {
    if (!lastVisibleDoc) return;
    setIsLoadingMore(true);
    try {
      const resultsRef = collection(db, "results");
      const qResults = query(
        resultsRef, 
        where("studentId", "==", user.id),
        orderBy("submittedAt", "desc"),
        startAfter(lastVisibleDoc),
        limit(5)
      );
      const resultsSnap = await getDocs(qResults);
      
      let fetchedResults = resultsSnap.docs.map(d => ({ 
          id: d.id, ...d.data(), submittedDate: d.data().submittedAt?.toDate() || new Date()
      }));
      
      setPastResults(prev => [...prev, ...fetchedResults]);
      setLastVisibleDoc(resultsSnap.docs[resultsSnap.docs.length - 1]);
      if (resultsSnap.docs.length < 5) setHasMoreResults(false);
      
    } catch (error) {
      showToast("Failed to load more exams.", "error");
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const fetchPublicFeed = async () => {
      setIsLoadingFeed(true);
      try {
        const mocksRef = collection(db, "mocks");
        const qPublic = query(mocksRef, where("visibility", "==", "public"), where("status", "==", "published"), where("examCategory", "==", selectedCategory));
        const publicSnap = await getDocs(qPublic);
        let fetchedPublic = publicSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        fetchedPublic = fetchedPublic.filter(mock => !mock.isPYQ || mock.showInLiveFeed);
        setPublicMocks(fetchedPublic);
      } catch (error) {
        console.error("Error fetching public feed:", error);
      } finally {
        setIsLoadingFeed(false);
      }
    };
    if (isLoaded) fetchPublicFeed();
  }, [selectedCategory, isLoaded]);

  // --- CALENDAR LOGIC ---
  const getRoadmapDayForDate = (targetDateObj, roadmapStartDate, timeframe) => {
    if (!roadmapStartDate) return null;
    const start = new Date(roadmapStartDate.toDate ? roadmapStartDate.toDate() : roadmapStartDate);
    start.setHours(0, 0, 0, 0);
    const target = new Date(targetDateObj);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 0 && diffDays < timeframe) return diffDays + 1;
    return null;
  };

  const toggleRoadmapDay = async (dayNumber, isToday) => {
    if (!activeRoadmap || !activeRoadmap.plan) return;
    if (!isToday) {
      showToast("You can only check off today's goal!", "error");
      return;
    }
    
    let newCompletedDays = [...(activeRoadmap.completedDays || [])];
    let newStreak = activeRoadmap.streak || 0;

    if (newCompletedDays.includes(dayNumber)) {
      newCompletedDays = newCompletedDays.filter(d => d !== dayNumber);
      newStreak = Math.max(0, newStreak - 1);
      setJustCompletedDay(null);
    } else {
      newCompletedDays.push(dayNumber);
      newStreak += 1;
      setJustCompletedDay(dayNumber);
      showToast("Day completed! Streak increased! 🔥");
    }

    const updatedData = { ...activeRoadmap, completedDays: newCompletedDays, streak: newStreak };
    setActiveRoadmap(updatedData);

    try {
      await updateDoc(doc(db, "roadmaps", activeRoadmap.id), {
        completedDays: newCompletedDays,
        streak: newStreak
      });
    } catch (e) {
      showToast("Failed to sync progress.", "error");
    }
  };

  const requestDeleteRoadmap = () => {
    setConfirmDialog({
      title: "End Study Plan?",
      message: "This will clear your current roadmap. Don't worry, your overall streak will be saved securely.",
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, "roadmaps", activeRoadmap.id), { plan: null });
          setActiveRoadmap({ ...activeRoadmap, plan: null });
          showToast("Study plan ended successfully.");
        } catch (e) {
          showToast("Failed to clear plan.", "error");
        }
      }
    });
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);
    try {
      const mockRef = doc(db, "mocks", joinCode.trim());
      const mockSnap = await getDoc(mockRef);
      if (mockSnap.exists()) router.push(`/student/exam/${joinCode.trim()}`);
      else showToast("Invalid Room ID.", "error");
    } catch (error) {
      showToast("Failed to join room.", "error");
    } finally {
      setIsJoining(false);
    }
  };

  const navigateTo = (path) => {
    setIsMobileMenuOpen(false);
    router.push(path);
  };

  // --- REPORT & DIAGNOSTIC LOGIC ---
  const openReportModal = async (result) => {
    setIsFetchingReport(true);
    setSelectedResult(result);
    setActiveModalTab("solutions");
    setDiagnosticReport(null);
    try {
      const targetExamId = result.mockId || result.examId || result.roomId || result.quizId;
      if (targetExamId) {
        const qRef = collection(db, "mocks", targetExamId, "questions");
        const qSnap = await getDocs(qRef);
        setModalQuestions(qSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setModalQuestions([]);
      }
    } catch (e) {
      showToast("Error loading original questions.", "error");
    } finally {
      setIsFetchingReport(false);
    }
  };

  const activeAnswersList = selectedResult ? (Array.isArray(selectedResult.answers) ? selectedResult.answers : Object.values(selectedResult.answers || {})) : [];

  const fullExamReview = modalQuestions.length > 0 ? modalQuestions.map((q, idx) => {
    let studentAnsRaw = null;
    if (selectedResult && selectedResult.answers) {
      if (Array.isArray(selectedResult.answers)) {
        studentAnsRaw = selectedResult.answers.find(a => a && (a.questionId === q.id || a.id === q.id));
        if (studentAnsRaw === undefined) studentAnsRaw = selectedResult.answers[idx];
      } else if (typeof selectedResult.answers === 'object') {
        studentAnsRaw = selectedResult.answers[q.id];
        if (studentAnsRaw === undefined) studentAnsRaw = Object.values(selectedResult.answers)[idx];
      }
    }
    
    let extractedAnswer = "";
    if (studentAnsRaw !== null && studentAnsRaw !== undefined) {
       if (typeof studentAnsRaw === 'string' || typeof studentAnsRaw === 'number') extractedAnswer = String(studentAnsRaw);
       else if (Array.isArray(studentAnsRaw)) extractedAnswer = studentAnsRaw;
       else if (typeof studentAnsRaw === 'object') extractedAnswer = studentAnsRaw.userAnswer ?? studentAnsRaw.selectedOption ?? studentAnsRaw.answer ?? studentAnsRaw.studentAnswer ?? "";
    }
    
    const isUnattempted = extractedAnswer === null || extractedAnswer === undefined || extractedAnswer === "" || (Array.isArray(extractedAnswer) && extractedAnswer.length === 0);
    const correctAnsRaw = q.correctAnswer ?? q.correctOption ?? "";
    let isCorrect = false;
    
    if (studentAnsRaw && typeof studentAnsRaw.isCorrect === 'boolean') {
      isCorrect = studentAnsRaw.isCorrect;
    } else if (!isUnattempted) {
      const safeUser = Array.isArray(extractedAnswer) ? extractedAnswer.map(String).sort() : [String(extractedAnswer).trim()];
      const safeCorrect = Array.isArray(correctAnsRaw) ? correctAnsRaw.map(String).sort() : [String(correctAnsRaw).trim()];
      isCorrect = JSON.stringify(safeUser) === JSON.stringify(safeCorrect);
    }
    
    return {
      question: q, 
      userAnswer: extractedAnswer, 
      isCorrect: isCorrect, 
      isUnattempted: isUnattempted,
      correctAnswer: correctAnsRaw, 
      explanation: q.explanation || "", 
      explanationImage: q.explanationImage || null
    };
  }) : activeAnswersList.map(ans => ({
      question: ans.question || ans, 
      userAnswer: ans.userAnswer || ans.selectedOption || ans.answer || "",
      isCorrect: ans.isCorrect, 
      isUnattempted: !ans.userAnswer || ans.userAnswer.length === 0,
      correctAnswer: (ans.question && ans.question.correctAnswer) || ans.correctAnswer || "N/A",
      explanation: (ans.question && ans.question.explanation) || ans.explanation || "",
      explanationImage: (ans.question && ans.question.explanationImage) || ans.explanationImage || null
  }));

  const generateAIDiagnostics = async () => {
    if (!selectedResult || fullExamReview.length === 0) return;
    setIsAnalyzing(true);
    try {
      const analysisPayload = {
        examTitle: selectedResult.examTitle,
        examCategory: selectedResult.examCategory,
        totalScore: selectedResult.score,
        accuracy: Math.round((selectedResult.correct / ((selectedResult.correct || 0) + (selectedResult.incorrect || 0))) * 100) || 0,
        detailedAnswers: fullExamReview.map(item => ({
            questionText: item.question?.text || "Unknown",
            studentAnswer: item.userAnswer,
            correctAnswer: item.correctAnswer,
            status: item.isCorrect ? "Correct" : item.isUnattempted ? "Skipped" : "Incorrect"
        }))
      };

      const response = await fetch("/api/analyze-result", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(analysisPayload)
      });
      
      if (!response.ok) throw new Error("Failed to fetch diagnostics.");
      const data = await response.json();
      
      if (data.diagnostics && data.diagnostics.topics) {
        setDiagnosticReport(data.diagnostics);
      } else {
        throw new Error("Invalid AI Format");
      }
    } catch (error) {
      showToast("AI server busy. Try again.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalExams = pastResults.length;
  const avgScore = totalExams > 0 ? (pastResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalExams).toFixed(1) : 0;
  let totalCorrect = 0; let totalAttempted = 0;
  pastResults.forEach(r => { totalCorrect += (r.correct || 0); totalAttempted += (r.correct || 0) + (r.incorrect || 0); });
  const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  let currentRoadmapDayIndex = -1;
  if (activeRoadmap?.plan && activeRoadmap?.startDate) {
    const start = new Date(activeRoadmap.startDate.toDate ? activeRoadmap.startDate.toDate() : activeRoadmap.startDate);
    start.setHours(0, 0, 0, 0);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const diffDays = Math.round((t.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays < activeRoadmap.timeframe) {
      currentRoadmapDayIndex = diffDays;
    }
  }
  const todaysPlan = currentRoadmapDayIndex >= 0 ? activeRoadmap?.plan?.[currentRoadmapDayIndex] : null;

  // --- BRANDED LOADING SCREEN ---
  if (!isLoaded || isLoadingMain) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 flex-col animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 text-indigo-50 rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-xl shadow-indigo-900/30 border border-indigo-400/30 transform -rotate-3 animate-pulse">
        <i className="fas fa-book-open-reader"></i>
      </div>
      <h2 className="text-xl font-black text-slate-900 tracking-tight animate-pulse">Loading Workspace...</h2>
    </div>
  );

  if (!isSignedIn) return <div className="p-10 text-center text-sm font-bold text-slate-500">Please log in to view your dashboard.</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden">
      
      {/* THE PRODUCT TOUR WITH USER ID */}
      <ProductTour userId={user?.id} />

      {/* --- PREMIUM GLASSMORPHISM TOAST --- */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-4 animate-in slide-in-from-bottom-5 backdrop-blur-xl border border-white/20 
          ${toast.type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-rose-600/90 text-white'}`}>
          <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
             <i className={`fas ${toast.type === 'success' ? 'fa-check' : 'fa-exclamation'} text-sm`}></i>
          </div>
          <span className="font-bold text-sm tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* --- PREMIUM DELETE CONFIRMATION MODAL --- */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-8 max-w-sm w-[95%] shadow-2xl border border-slate-200 animate-in zoom-in-95 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto"><i className="fas fa-exclamation-triangle"></i></div>
              <h3 className="text-xl font-black text-slate-800 mb-2 text-center">{confirmDialog.title}</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 text-center leading-relaxed">{confirmDialog.message}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                 <button onClick={() => setConfirmDialog(null)} className="px-6 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition w-full sm:w-1/2">Cancel</button>
                 <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="px-6 py-3 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition shadow-md shadow-rose-500/20 w-full sm:w-1/2">Confirm</button>
              </div>
           </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {isFetchingReport && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex flex-col items-center justify-center">
           <div className="relative w-20 h-20 mb-4">
             <div className="absolute inset-0 border-4 border-slate-200/20 rounded-full"></div>
             <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
             <i className="fas fa-file-alt absolute inset-0 flex items-center justify-center text-2xl text-indigo-400"></i>
           </div>
           <h2 className="text-white font-bold tracking-widest uppercase text-sm">Compiling Report...</h2>
        </div>
      )}

      {/* --- FULLY UPGRADED DEEP-DIVE REPORT MODAL --- */}
      {selectedResult && !isFetchingReport && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="bg-slate-50 rounded-[2rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col h-full max-h-[95vh] border border-slate-700 animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 flex justify-between items-center shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-4 text-white">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-2xl border border-indigo-400/30 text-indigo-300"><i className="fas fa-chart-line"></i></div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black tracking-tight">{selectedResult.examTitle}</h2>
                  <p className="text-xs font-bold text-indigo-200/70 mt-1">Submitted {selectedResult.submittedDate?.toLocaleDateString()} at {selectedResult.submittedDate?.toLocaleTimeString()}</p>
                </div>
              </div>
              <button onClick={() => { setSelectedResult(null); setDiagnosticReport(null); setModalQuestions([]); }} className="w-10 h-10 bg-white/5 hover:bg-rose-500 text-slate-300 hover:text-white rounded-xl transition-all flex items-center justify-center shadow-sm border border-white/10 hover:border-rose-500"><i className="fas fa-times text-lg"></i></button>
            </div>

            {/* Quick Stats Bar & Tabs */}
            <div className="bg-white p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 shrink-0 shadow-sm z-10 relative">
              
              {/* Custom Tabs */}
              <div className="flex gap-2 bg-slate-100 p-1.5 rounded-xl w-full md:w-auto border border-slate-200">
                 <button onClick={() => setActiveModalTab('solutions')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${activeModalTab === 'solutions' ? 'bg-white text-indigo-700 shadow-md border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>
                   <i className="fas fa-list-check mr-2"></i>Solutions
                 </button>
                 <button onClick={() => setActiveModalTab('diagnostics')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${activeModalTab === 'diagnostics' ? 'bg-white text-indigo-700 shadow-md border border-slate-200/50' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>
                   <i className="fas fa-brain mr-2"></i>AI Analysis
                 </button>
              </div>
              
              {/* Score Badges */}
              <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto">
                 <div className="bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-200 flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><i className="fas fa-bullseye"></i></div>
                   <div>
                     <span className="block text-[9px] uppercase font-black text-slate-400 tracking-widest">Total Score</span>
                     <span className="block text-lg font-black text-indigo-700 leading-none">{selectedResult.score}</span>
                   </div>
                 </div>
                 <div className="bg-emerald-50 px-5 py-2.5 rounded-xl border border-emerald-100 flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-emerald-200/50 text-emerald-600 flex items-center justify-center"><i className="fas fa-percentage"></i></div>
                   <div>
                     <span className="block text-[9px] uppercase font-black text-emerald-600/70 tracking-widest">Accuracy</span>
                     <span className="block text-lg font-black text-emerald-700 leading-none">{Math.round((selectedResult.correct / ((selectedResult.correct || 0) + (selectedResult.incorrect || 0))) * 100) || 0}%</span>
                   </div>
                 </div>
              </div>
            </div>

            {/* Modal Body Area */}
            <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50/50 scroll-smooth">
              
              {/* --- TAB 1: SOLUTIONS --- */}
              {activeModalTab === 'solutions' && (
                <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto pb-10">
                  {fullExamReview.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <i className="fas fa-ghost text-4xl text-slate-300 mb-3"></i>
                      <p className="font-bold text-sm text-slate-500">Failed to load detailed question data.</p>
                    </div>
                  ) : fullExamReview.map((item, idx) => {
                    const isCorrect = item.isCorrect;
                    const isUnattempted = item.isUnattempted;
                    
                    // Determine border/header colors based on result
                    const cardTheme = isCorrect 
                        ? 'border-emerald-200 shadow-emerald-900/5' 
                        : isUnattempted ? 'border-slate-300 shadow-slate-900/5' : 'border-rose-200 shadow-rose-900/5';

                    return (
                      <div key={idx} className={`bg-white border-2 rounded-2xl p-6 shadow-sm transition-all hover:shadow-md ${cardTheme}`}>
                        
                        {/* Question Header */}
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                          <div className="flex items-center gap-3">
                            <span className="bg-slate-900 text-white w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-sm">Q{idx + 1}</span>
                            {isCorrect ? <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-wider border border-emerald-200"><i className="fas fa-check mr-1.5"></i> Correct</span> : 
                             isUnattempted ? <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-wider border border-slate-200"><i className="fas fa-minus mr-1.5"></i> Skipped</span> : 
                             <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-wider border border-rose-200"><i className="fas fa-times mr-1.5"></i> Incorrect</span>}
                          </div>
                          <div className="text-xs font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            {isCorrect ? <span className="text-emerald-600">+{item.question?.marks || 2} Marks</span> : 
                             isUnattempted ? <span>0 Marks</span> : 
                             <span className="text-rose-600">-{item.question?.negativeMarks || 0.66} Marks</span>}
                          </div>
                        </div>

                        {/* Question Content */}
                        <div className="text-slate-800 font-bold mb-6 text-sm md:text-base leading-relaxed overflow-x-auto">
                          <Latex>{item.question?.text || "Missing question text"}</Latex>
                        </div>
                        {item.question?.imageUrl && (
                          <div className="mb-6 p-2 bg-slate-50 rounded-xl border border-slate-200 inline-block">
                            <img src={item.question.imageUrl} alt="Question Diagram" className="max-h-48 rounded object-contain" />
                          </div>
                        )}
                        
                        {/* Answers Comparison */}
                        {item.question?.type === 'NAT' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><i className="fas fa-user-edit"></i> Your Answer</div>
                                <div className={`text-base font-black ${isUnattempted ? 'text-slate-400' : isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {isUnattempted ? "--" : Array.isArray(item.userAnswer) ? item.userAnswer.join(", ") : String(item.userAnswer)}
                                </div>
                              </div>
                              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
                                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><i className="fas fa-check-double"></i> Correct Answer</div>
                                <div className="text-base font-black text-emerald-700">
                                  {Array.isArray(item.correctAnswer) ? item.correctAnswer.join(", ") : String(item.correctAnswer)}
                                </div>
                              </div>
                            </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                            {(item.question?.options || []).map((opt, optIndex) => {
                               const correctArr = Array.isArray(item.correctAnswer) ? item.correctAnswer.map(String) : [String(item.correctAnswer)];
                               const userArr = Array.isArray(item.userAnswer) ? item.userAnswer.map(String) : [String(item.userAnswer)];
                               const isCorrectOption = correctArr.includes(String(opt.id));
                               const isUserSelected = userArr.includes(String(opt.id));
                               
                               let borderClass = "border-slate-200 bg-slate-50 opacity-60"; 
                               let icon = null;

                               if (isCorrectOption) { 
                                 borderClass = "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm opacity-100"; 
                                 icon = <i className="fas fa-check-circle text-emerald-500 text-xl shrink-0"></i>; 
                               } else if (isUserSelected && !isCorrectOption) { 
                                 borderClass = "border-rose-500 bg-rose-50 ring-2 ring-rose-200 shadow-sm opacity-100"; 
                                 icon = <i className="fas fa-times-circle text-rose-500 text-xl shrink-0"></i>; 
                               } else if (isUserSelected && isCorrectOption) {
                                 borderClass = "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 shadow-sm opacity-100"; 
                                 icon = <i className="fas fa-check-circle text-emerald-500 text-xl shrink-0"></i>; 
                               }

                               return (
                                 <div key={optIndex} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${borderClass}`}>
                                   <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${isCorrectOption ? 'bg-emerald-500 text-white' : isUserSelected ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{opt.id}</div>
                                   <div className="flex-1 overflow-x-auto">
                                     <div className={`text-sm font-bold ${isCorrectOption ? 'text-emerald-900' : isUserSelected ? 'text-rose-900' : 'text-slate-600'}`}>
                                       <Latex>{opt.text}</Latex>
                                     </div>
                                     {opt.imageUrl && <img src={opt.imageUrl} alt="Option" className="mt-2 max-h-20 rounded border border-slate-200 bg-white p-1" />}
                                   </div>
                                   {icon}
                                 </div>
                               )
                            })}
                          </div>
                        )}

                        {/* Official Solution Section */}
                        {(item.explanation || item.explanationImage) && (
                          <div className="bg-indigo-50/70 p-5 rounded-xl border border-indigo-100 mt-6 shadow-inner">
                            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2"><i className="fas fa-lightbulb text-amber-500 text-sm"></i> Official Solution Explanation</h4>
                            {item.explanation && <div className="text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed overflow-x-auto"><Latex>{item.explanation}</Latex></div>}
                            {item.explanationImage && <img src={item.explanationImage} alt="Solution Diagram" className="mt-4 max-h-48 rounded-lg border border-indigo-200 bg-white p-1.5 object-contain shadow-sm" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* --- TAB 2: ADVANCED AI DIAGNOSTICS --- */}
              {activeModalTab === 'diagnostics' && (
                <div className="animate-in fade-in max-w-6xl mx-auto pb-10">
                  
                  {/* Generate Button State */}
                  {!diagnosticReport && !isAnalyzing && (
                    <div className="bg-white p-12 rounded-[2rem] border border-slate-200 shadow-sm text-center max-w-2xl mx-auto">
                      <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 text-indigo-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner border border-indigo-100/50"><i className="fas fa-brain"></i></div>
                      <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Generate AI Performance Report</h2>
                      <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto font-medium leading-relaxed">Gemini will scan every question you answered, analyze your logic, and pinpoint your exact strengths and vulnerabilities to generate a personalized study plan.</p>
                      <button onClick={generateAIDiagnostics} className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 text-base flex items-center justify-center gap-3 mx-auto hover:-translate-y-1">
                        <i className="fas fa-wand-magic-sparkles text-lg"></i> Run Deep Analysis
                      </button>
                    </div>
                  )}

                  {/* Analyzing State */}
                  {isAnalyzing && (
                    <div className="bg-white p-16 rounded-[2rem] border border-slate-200 shadow-sm text-center max-w-2xl mx-auto">
                      <div className="relative w-24 h-24 mx-auto mb-6">
                         <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                         <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                         <i className="fas fa-cogs absolute inset-0 flex items-center justify-center text-3xl text-indigo-400"></i>
                      </div>
                      <h2 className="text-xl font-black text-slate-900 mb-2">Scanning Neural Pathways...</h2>
                      <p className="text-sm font-bold text-slate-400">Cross-referencing mistakes and calculating topic mastery.</p>
                    </div>
                  )}

                  {/* Results Grid State */}
                  {diagnosticReport && !isAnalyzing && (
                    <div>
                      <div className="flex items-center gap-3 mb-6 px-2">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md"><i className="fas fa-chart-radar"></i></div>
                        <div>
                          <h2 className="text-xl font-black text-slate-900">Skill Matrix Breakdown</h2>
                          <p className="text-xs font-bold text-slate-500">AI-identified strengths, gaps, and actionable next steps.</p>
                        </div>
                      </div>
                      
                      {/* OVERALL ASSESSMENT HERO CARD */}
                      {diagnosticReport.overallAssessment && (
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 shadow-lg text-white relative overflow-hidden mb-6">
                          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                          <h2 className="text-2xl font-black mb-3 flex items-center gap-3"><i className="fas fa-chart-line text-indigo-300"></i> Performance Summary</h2>
                          <p className="text-indigo-100 text-base font-medium leading-relaxed max-w-3xl relative z-10">
                            {diagnosticReport.overallAssessment}
                          </p>
                        </div>
                      )}
                      
                      {/* ADVANCED DIAGNOSTIC GRID */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {(diagnosticReport.topics || diagnosticReport).map((item, i) => {
                          const theme = {
                            emerald: { bg: 'bg-emerald-50/50', border: 'border-emerald-200', text: 'text-emerald-700', bar: 'bg-emerald-500', icon: 'fa-check-circle', badgeBg: 'bg-emerald-100' },
                            amber: { bg: 'bg-amber-50/50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-400', icon: 'fa-exclamation-circle', badgeBg: 'bg-amber-100' },
                            rose: { bg: 'bg-rose-50/50', border: 'border-rose-200', text: 'text-rose-700', bar: 'bg-rose-500', icon: 'fa-exclamation-triangle', badgeBg: 'bg-rose-100' }
                          }[item.color] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', bar: 'bg-slate-500', icon: 'fa-info-circle', badgeBg: 'bg-slate-200' };

                          return (
                            <div key={i} className={`p-6 rounded-3xl border-2 transition-all hover:shadow-lg bg-white ${theme.border} flex flex-col h-full`}>
                              
                              {/* Card Header & Progress Bar */}
                              <div className="mb-6">
                                <div className="flex justify-between items-start mb-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${theme.badgeBg} ${theme.text} border ${theme.border}`}>
                                    <i className={`fas ${theme.icon}`}></i>
                                  </div>
                                  <span className={`font-black text-3xl tracking-tight ${theme.text}`}>{item.score}%</span>
                                </div>
                                <h3 className="font-black text-slate-900 text-lg mb-4 leading-tight">{item.name}</h3>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                                  <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${item.score}%` }}></div>
                                </div>
                              </div>
                              
                              {/* Insight Sections */}
                              <div className="space-y-3 flex-1 flex flex-col">
                                {/* Strength */}
                                <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100/50 flex items-start gap-3">
                                  <i className="fas fa-arrow-trend-up text-emerald-500 mt-0.5"></i>
                                  <div>
                                    <span className="text-[10px] font-black text-emerald-700/70 uppercase tracking-widest block mb-0.5">Mastered Concept</span>
                                    <div className="text-xs font-bold text-slate-700 leading-relaxed"><div className="text-[10px] font-bold text-slate-500 mb-5 flex items-center gap-1.5"><div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center"></div>{item.strength || "Solid foundational knowledge demonstrated."}</div></div>
                                  </div>
                                </div>

                                {/* Weakness */}
                                <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-100/50 flex items-start gap-3">
                                  <i className="fas fa-link-slash text-rose-400 mt-0.5"></i>
                                  <div>
                                    <span className="text-[10px] font-black text-rose-700/70 uppercase tracking-widest block mb-0.5">Knowledge Gap</span>
                                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{item.weakness !== "None" ? item.weakness : "No critical gaps identified."}</p>
                                  </div>
                                </div>

                                {/* Action Plan */}
                                <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100/50 flex items-start gap-3 mt-auto">
                                  <i className="fas fa-book-open text-indigo-500 mt-0.5"></i>
                                  <div>
                                    <span className="text-[10px] font-black text-indigo-700/70 uppercase tracking-widest block mb-0.5">Actionable Next Step</span>
                                    <p className="text-xs font-bold text-slate-800 leading-relaxed">{item.recommendedAction || "Continue practicing mixed questions."}</p>
                                  </div>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && ( <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} /> )}

      {/* --- UNIFIED PREMIUM STUDENT SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-950 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-indigo-900">
          <Link href="/onboarding?switch=true" className="text-xl font-black flex items-center gap-2 hover:text-emerald-400 transition cursor-pointer tracking-tight">
            <i className="fas fa-book-open-reader text-emerald-400"></i> OZONE
          </Link>
          <button className="md:hidden text-indigo-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><i className="fas fa-times text-lg"></i></button>
        </div>
        
       <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
    {/* Dashboard */}
    <button onClick={() => navigateTo('/student')} className="w-full flex items-center text-left gap-3 bg-indigo-800 text-white p-2.5 rounded-xl text-sm font-bold border-l-4 border-emerald-400 shadow-inner">
        <i className="fas fa-home w-4 text-emerald-400"></i> Dashboard
    </button>

    {/* AI Exam Generator */}
    <button onClick={() => navigateTo('/student/examgenerateusingai')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition group">
        <i className="fas fa-brain w-4 text-fuchsia-400 group-hover:animate-pulse"></i> AI Exam Generator
        <span className="ml-auto bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">New</span>
    </button>

    {/* --- NEW: SMART FLASHCARDS BUTTON --- */}
    <button onClick={() => navigateTo('/student/flashcard-generator')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition group">
        <i className="fas fa-bolt w-4 text-amber-400 group-hover:animate-pulse"></i> Smart Flashcards
        <span className="ml-auto bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">New</span>
    </button>
    {/* ------------------------------------ */}

    {/* PYQ Practice */}
    <button id="tour-sidebar-pyq" onClick={() => navigateTo('/student/pyq')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
        <i className="fas fa-book-open w-4"></i> PYQ Practice
    </button>

    {/* Study Planner */}
    <button id="tour-sidebar-planner" onClick={() => navigateTo('/student/planner')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
        <i className="fas fa-calendar-check w-4"></i> Study Planner
    </button>

       {/* --- LIVE QUIZ POLL --- */}
    <button onClick={() => navigateTo('/student/quiz-poll')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition group">
        <i className="fas fa-satellite-dish w-4 text-teal-400 group-hover:animate-pulse"></i> Live Quiz Poll
        <span className="ml-auto bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Live</span>
    </button>
    {/* ---------------------- */}

    {/* Quiz Battle */}
    <button id="tour-sidebar-quiz" onClick={() => navigateTo('/student/quiz-battle')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition group">
        <i className="fas fa-gamepad w-4 text-rose-400 group-hover:animate-bounce"></i> Quiz Battle
    </button>

 
</nav>
        
        <div className="p-3 border-t border-indigo-900 bg-indigo-900/30 space-y-1.5">
            <div className="flex items-center gap-2.5 p-2.5 bg-indigo-950/50 rounded-xl border border-indigo-800/50 shadow-inner">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Student"} alt="Avatar" className="w-7 h-7 rounded-full border border-indigo-700" />
                <div className="text-xs font-bold truncate flex-1 text-indigo-100">{user?.fullName || "Student"}</div>
            </div>
            <button onClick={() => router.push('/onboarding?switch=true')} className="w-full flex items-center justify-center gap-2 text-indigo-300 hover:bg-indigo-800 hover:text-white p-2 rounded-xl transition text-xs font-bold border border-transparent hover:border-indigo-700 shadow-sm">
                <i className="fas fa-exchange-alt"></i> Switch Role
            </button>
            <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-600 hover:text-white p-2 rounded-xl transition text-xs font-bold border border-rose-900/50 hover:border-rose-500 bg-rose-950/20 shadow-sm">
                <i className="fas fa-sign-out-alt"></i> Log Out
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-y-auto w-full bg-slate-50">
        
        <header className="bg-white shadow-sm p-4 md:p-5 flex justify-between items-center z-10 sticky top-0 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-slate-600 hover:text-indigo-600 transition" onClick={() => setIsMobileMenuOpen(true)}>
              <i className="fas fa-bars text-xl"></i>
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-800">Welcome, {user?.firstName || "Student"}!</h1>
              <p className="text-[10px] md:text-xs font-bold text-slate-500 hidden sm:block">Let's dominate your prep today.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             {activeRoadmap?.streak !== undefined && (
               <div id="tour-streak" className="bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2 hover:shadow-md transition-all cursor-default">
                 <div className="w-8 h-8 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center text-lg shadow-inner"><i className="fas fa-fire animate-pulse"></i></div>
                 <div className="flex flex-col hidden sm:flex">
                   <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest leading-none">Streak</span>
                   <span className="text-sm font-black text-rose-600 leading-tight">{activeRoadmap.streak} Days</span>
                 </div>
               </div>
             )}
             <div className="text-[10px] md:text-xs font-bold text-slate-700 border border-slate-200 px-3 py-2 rounded-xl bg-white shadow-sm flex items-center gap-2">
               <div className="w-6 h-6 bg-indigo-50 text-indigo-500 rounded-lg flex items-center justify-center"><i className="fas fa-layer-group"></i></div>
               <div className="flex flex-col">
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Exams</span>
                 <span className="text-sm font-black leading-tight">{totalExams}</span>
               </div>
             </div>
          </div>
        </header>

        {/* --- MAIN STRUCTURED 2-COLUMN DASHBOARD --- */}
        <div className="p-4 md:p-5 lg:p-6 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
            
            {/* LEFT COLUMN: Main Content (8 spans) */}
            <div className="lg:col-span-8 space-y-5 lg:space-y-6">
              
              {/* JOIN PRIVATE MOCK (BANNER) WITH HOVER & TOUR ID */}
              <div id="tour-join-room" className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-colors duration-700"></div>
                <div className="relative z-10">
                  <h2 className="text-xl md:text-2xl font-black text-white mb-1 tracking-tight flex items-center gap-2">
                     <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm backdrop-blur-sm"><i className="fas fa-door-open"></i></div>
                     Join a Private Room
                  </h2>
                  <p className="text-indigo-200 text-xs md:text-sm font-medium max-w-sm">Enter the secure Room ID provided by your educator to instantly access your scheduled live exam.</p>
                </div>
                <form onSubmit={handleJoinRoom} className="flex gap-2 w-full md:w-auto relative z-10">
                  <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. 8xV9-2mB" className="w-full md:w-56 bg-white/10 border border-white/20 rounded-xl p-3 md:p-3.5 text-white placeholder-indigo-200 outline-none focus:bg-white/20 focus:border-white/40 transition font-mono text-sm font-bold shadow-inner" required />
                  <button type="submit" disabled={isJoining} className="bg-white text-indigo-700 px-6 py-3 md:py-3.5 rounded-xl font-black hover:bg-indigo-50 transition shadow-lg disabled:opacity-70 flex items-center justify-center gap-2 shrink-0">{isJoining ? <i className="fas fa-spinner fa-spin"></i> : "Join"}</button>
                </form>
              </div>

              {/* IN-PROGRESS EXAMS WITH HOVER */}
              {activeProgress.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span></div>
                    <h2 className="text-base font-black text-slate-900 tracking-tight">In-Progress Exams</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeProgress.map((prog) => (
                      <div key={prog.id} onClick={() => router.push(`/student/exam/${prog.mockId}`)} className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm relative overflow-hidden group hover:-translate-y-1 hover:shadow-md hover:border-amber-400 transition-all duration-200 cursor-pointer">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider border border-amber-200"><i className="fas fa-pause-circle mr-1"></i> Resumable</span>
                          <span className="text-[10px] font-black text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded"><i className="fas fa-clock text-amber-500 mr-1"></i> {Math.floor(prog.timeLeft / 60)}m left</span>
                        </div>
                        <h3 className="font-bold text-slate-900 mt-1 mb-4 truncate text-sm">{prog.mockTitle || "Live Mock Exam"}</h3>
                        <button className="w-full bg-slate-900 text-white py-2 rounded-lg text-xs font-black group-hover:bg-indigo-600 transition-colors shadow-sm flex items-center justify-center gap-1.5">Resume Exam <i className="fas fa-play text-[10px]"></i></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LIVE PUBLIC FEED WITH TOUR ID & HOVER */}
              <div id="tour-feed">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 gap-2">
                  <h2 className="text-base font-black text-slate-900 tracking-tight"><i className="fas fa-globe-americas text-indigo-500 mr-1.5"></i> Live Public Feed</h2>
                  <div className="relative w-full md:w-auto">
                    <select 
                      value={selectedCategory} 
                      onChange={(e) => setSelectedCategory(e.target.value)} 
                      className="appearance-none w-full bg-white border border-slate-200 text-slate-700 text-xs font-bold py-2 pl-3 pr-8 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm cursor-pointer transition-all"
                    >
                      {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                    <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
                  </div>
                </div>
                
                {isLoadingFeed ? (
                  <div className="py-10 text-center"><i className="fas fa-circle-notch fa-spin text-2xl text-indigo-400"></i></div>
                ) : publicMocks.length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500 shadow-sm">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-slate-100"><i className="fas fa-folder-open text-xl text-slate-400"></i></div>
                    <h3 className="text-sm font-black text-slate-800 mb-1">No public exams found</h3>
                    <div className="font-medium text-[10px]">No active exams for <strong className="text-indigo-600">{selectedCategory}</strong> right now.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {publicMocks.map((mock) => (
                      <div key={mock.id} onClick={() => router.push(`/student/exam/${mock.id}`)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:-translate-y-1 hover:shadow-md transition-all duration-200 flex flex-col h-full relative overflow-hidden group cursor-pointer">
                        {mock.isPYQ && <div className="absolute top-3 right-3 bg-rose-100 text-rose-800 text-[8px] uppercase font-black px-2 py-0.5 rounded shadow-sm border border-rose-200"><i className="fas fa-star text-rose-500 mr-1"></i> Official PYQ</div>}
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-3">
                            <span className="bg-emerald-100 text-emerald-800 text-[8px] uppercase tracking-widest font-black px-2 py-0.5 rounded border border-emerald-200">Live</span>
                            <span className="text-[10px] font-bold text-slate-500 mt-0.5 bg-slate-100 px-1.5 py-0.5 rounded"><i className="fas fa-clock mr-1 text-slate-400"></i> {mock.duration}m</span>
                          </div>
                          <h3 className="font-black text-slate-900 text-sm mb-1.5 leading-tight pr-10 group-hover:text-indigo-600 transition-colors">{mock.title}</h3>
                          <div className="text-[10px] font-bold text-slate-500 mb-5 flex items-center gap-1.5"><div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center"><i className="fas fa-user text-slate-400 text-[8px]"></i></div> By {mock.educatorName || "Platform Educator"}</div>
                        </div>
                        <button className="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 py-2 rounded-lg text-xs font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm">Start Mock Test</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PAST RESULTS (PAGINATED) */}
              <div>
                <h2 className="text-base font-black text-slate-900 mb-3 tracking-tight"><i className="fas fa-history text-slate-400 mr-1.5"></i> Exam History</h2>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  
                  {pastResults.length === 0 && !isLoadingMore ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                        <i className="fas fa-clipboard-list text-xl text-slate-400"></i>
                      </div>
                      <h3 className="text-sm font-black text-slate-800 mb-1">No completed exams yet</h3>
                      <p className="text-xs font-medium text-slate-500">Take your first mock test to start tracking your progress here.</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto scrollbar-hide">
                        <table className="w-full text-left min-w-[600px]">
                          <thead>
                            <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase tracking-widest font-black border-b border-slate-100">
                              <th className="p-4 pl-5">Exam Title</th>
                              <th className="p-4 text-center">Date</th>
                              <th className="p-4 text-center">Score</th>
                              <th className="p-4 text-center">Accuracy</th>
                              <th className="p-4 text-right pr-5">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {pastResults.map((result) => {
                               const resultAccuracy = (result.correct + result.incorrect) > 0 ? Math.round((result.correct / (result.correct + result.incorrect)) * 100) : 0;
                               return (
                                <tr key={result.id} className="hover:bg-indigo-50/30 transition-colors group">
                                  <td className="p-4 pl-5">
                                    <div className="font-bold text-slate-900 text-xs group-hover:text-indigo-700 transition-colors">{result.examTitle || "Mock Exam"}</div>
                                    <div className="text-[9px] font-bold text-slate-400 mt-0.5">{result.examCategory || "General"}</div>
                                  </td>
                                  <td className="p-4 text-center text-[10px] font-bold text-slate-500">
                                    {result.submittedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td className="p-4 text-center font-black text-indigo-600 text-sm">{result.score}</td>
                                  <td className="p-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${resultAccuracy >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : resultAccuracy >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                      {resultAccuracy}%
                                    </span>
                                  </td>
                                  <td className="p-4 text-right pr-5">
                                    <button onClick={() => openReportModal(result)} className="text-[10px] bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg font-black hover:bg-slate-50 hover:border-indigo-300 transition shadow-sm hover:text-indigo-600">
                                      View Report
                                    </button>
                                  </td>
                                </tr>
                               )
                            })}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* LOAD MORE BUTTON */}
                      {hasMoreResults && (
                        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-center">
                          <button 
                            onClick={loadMoreExams} 
                            disabled={isLoadingMore}
                            className="text-[10px] font-black text-indigo-600 bg-indigo-50/50 border border-indigo-100 px-4 py-2 rounded-lg hover:bg-indigo-100 transition shadow-sm disabled:opacity-50 flex items-center gap-2"
                          >
                            {isLoadingMore ? <><i className="fas fa-circle-notch fa-spin"></i> Loading...</> : "Show Next 5 Exams"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Sidebar (4 spans) */}
            <div className="lg:col-span-4 space-y-5 lg:space-y-6">
              
              {/* --- ACTIVE ROADMAP WIDGET WITH TOUR ID --- */}
              <div id="tour-roadmap">
                {activeRoadmap && activeRoadmap.plan ? (
                  <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col text-white animate-in zoom-in-95 border border-slate-800">
                    <div className="absolute right-0 top-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="flex items-start justify-between gap-2 relative z-10 mb-4">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="bg-emerald-500 text-white text-[8px] uppercase font-black px-1.5 py-0.5 rounded tracking-widest">Active</span>
                          <span className="text-indigo-300 font-bold text-[9px]">{activeRoadmap.exam}</span>
                        </div>
                        <h2 className="text-base font-black leading-tight">{activeRoadmap.timeframe}-Day Plan</h2>
                      </div>
                      <button onClick={requestDeleteRoadmap} className="w-7 h-7 rounded-md bg-slate-800 hover:bg-rose-500 text-slate-400 hover:text-white transition flex items-center justify-center border border-slate-700 hover:border-rose-400 shadow-sm shrink-0" title="End Roadmap">
                        <i className="fas fa-trash-alt text-[10px]"></i>
                      </button>
                    </div>

                    {/* Today's Focus Card */}
                    {todaysPlan ? (
                      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-3.5 rounded-xl mb-4 relative z-10 shadow-sm">
                        <h4 className="text-[8px] font-black text-indigo-300 uppercase tracking-widest mb-1.5 flex items-center gap-1"><i className="far fa-calendar-check text-emerald-400"></i> Day {todaysPlan.day} Focus</h4>
                        <p className="font-bold text-white text-sm leading-tight mb-1">{todaysPlan.theme}</p>
                        <p className="text-[10px] text-slate-300 font-medium leading-snug mb-3">{todaysPlan.studyFocus}</p>
                        <button onClick={() => router.push('/student/planner')} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-1.5 rounded-lg transition shadow-sm text-[10px]">
                          Open Planner
                        </button>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/20 border border-emerald-500/30 p-3 rounded-xl mb-4 relative z-10 text-center shadow-inner">
                        <h4 className="font-black text-emerald-400 text-xs mb-0.5"><i className="fas fa-trophy mr-1"></i>Completed!</h4>
                      </div>
                    )}

                    {/* COMPACT CALENDAR WIDGET */}
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 relative z-10 shadow-inner">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-black text-indigo-100 text-xs"><i className="far fa-calendar-alt mr-1.5 text-indigo-400"></i> {monthNames[currentMonth]} {currentYear}</h3>
                        <div className="text-[8px] font-black bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                          <i className="fas fa-check-circle"></i> {activeRoadmap.completedDays?.length || 0} / {activeRoadmap.timeframe}
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                          <div key={day} className="text-[8px] font-black text-indigo-300/50 uppercase tracking-widest">{day}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                          <div key={`empty-${i}`} className="h-7"></div>
                        ))}
                        
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const dateNum = i + 1;
                          const currentDateObj = new Date(currentYear, currentMonth, dateNum);
                          currentDateObj.setHours(0,0,0,0);
                          
                          const isTodayDate = dateNum === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                          const roadmapDayNum = getRoadmapDayForDate(currentDateObj, activeRoadmap.startDate, activeRoadmap.timeframe);
                          const isCompleted = roadmapDayNum && activeRoadmap.completedDays?.includes(roadmapDayNum);
                          
                          const todayObj = new Date(); todayObj.setHours(0,0,0,0);
                          const isMissed = roadmapDayNum && !isCompleted && currentDateObj < todayObj;

                          let cellClass = "h-7 rounded flex items-center justify-center font-black transition-all relative select-none ";
                          let content = <span className="text-[10px]">{dateNum}</span>;

                          if (roadmapDayNum) {
                            if (isCompleted) {
                              cellClass += "bg-rose-500/20 border border-rose-500/50 text-rose-400 cursor-pointer hover:bg-rose-500/30";
                              content = <i className={`fas fa-fire text-[11px] ${justCompletedDay === roadmapDayNum ? 'animate-bounce text-rose-500 scale-125' : ''}`}></i>;
                            } else if (isTodayDate) {
                              cellClass += "bg-indigo-500 border border-indigo-400 text-white cursor-pointer hover:bg-indigo-400 z-10 shadow-sm";
                              content = <span className="text-[10px]">D{roadmapDayNum}</span>;
                            } else if (isMissed) {
                              cellClass += "bg-slate-800/80 border border-slate-700/80 text-slate-500";
                              content = <span className="text-[9px] opacity-50 line-through">D{roadmapDayNum}</span>;
                            } else {
                              cellClass += "bg-white/5 border border-white/10 text-indigo-200/50 cursor-not-allowed";
                              content = <span className="text-[9px]">D{roadmapDayNum}</span>;
                            }
                          } else {
                            if (isTodayDate) cellClass += "bg-white/10 border border-white/20 text-white";
                            else cellClass += "bg-transparent border border-transparent text-slate-500/30";
                          }

                          return (
                            <div 
                              key={dateNum} 
                              className={cellClass}
                              onClick={() => {
                                 if (roadmapDayNum && (isTodayDate || isCompleted)) toggleRoadmapDay(roadmapDayNum, isTodayDate);
                                 else if (roadmapDayNum && !isTodayDate) showToast(isMissed ? "You missed this day!" : "This day hasn't unlocked yet!", "error");
                              }}
                              title={roadmapDayNum ? `Roadmap Day ${roadmapDayNum}` : ""}
                            >
                              {content}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 text-center shadow-sm">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center text-xl mx-auto mb-3"><i className="fas fa-map-marked-alt"></i></div>
                    <h3 className="text-sm font-black text-indigo-900 mb-1">No Active Roadmap</h3>
                    <p className="text-[10px] font-medium text-indigo-700 mb-3">Generate an AI schedule to track your daily progress.</p>
                    <button onClick={() => router.push('/student/planner')} className="w-full bg-indigo-600 text-white text-xs font-black py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm">Create Plan</button>
                  </div>
                )}
              </div>

              {/* PERFORMANCE STATS WITH TOUR ID */}
              <div id="tour-stats" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4"><i className="fas fa-chart-line mr-1"></i> Quick Stats</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="text-[9px] text-slate-500 font-bold mb-0.5 uppercase tracking-wide">Avg Score</div>
                    <div className="text-2xl font-black text-indigo-600">{avgScore}</div>
                  </div>
                  <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-right">
                    <div className="text-[9px] text-emerald-600 font-bold mb-0.5 uppercase tracking-wide">Accuracy</div>
                    <div className="text-2xl font-black text-emerald-600">{accuracy}%</div>
                  </div>
                </div>
                <button className="w-full text-[10px] font-black text-slate-600 bg-slate-50 py-2 rounded-lg hover:bg-slate-100 transition border border-slate-200">Full Analytics</button>
              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}