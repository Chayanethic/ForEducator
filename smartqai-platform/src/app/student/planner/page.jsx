"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, addDoc, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function StudyPlannerPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // --- FORM STATE ---
  const [exam, setExam] = useState("GATE ECE");
  const [timeframe, setTimeframe] = useState("7");
  const [subjects, setSubjects] = useState([]);
  const [currentSubject, setCurrentSubject] = useState("");
  const [topics, setTopics] = useState("");

  // --- AI & PLAN STATE ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [studyPlan, setStudyPlan] = useState(null);
  
  // --- EDIT MODE STATE ---
  const [isEditingPlan, setIsEditingPlan] = useState(false);

  const handleAddSubject = (e) => {
    e.preventDefault();
    if (currentSubject.trim() && !subjects.includes(currentSubject.trim())) {
      setSubjects([...subjects, currentSubject.trim()]);
      setCurrentSubject("");
    }
  };

  const handleRemoveSubject = (sub) => {
    setSubjects(subjects.filter(s => s !== sub));
  };

  const generatePlan = async () => {
    if (subjects.length === 0) return alert("Please add at least one subject to focus on.");
    setIsGenerating(true);
    setStudyPlan(null);
    setIsEditingPlan(false);

    try {
      const response = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam, timeframe: parseInt(timeframe), subjects, topics })
      });

      if (!response.ok) throw new Error("Failed to generate plan");
      const data = await response.json();
      setStudyPlan(data.plan);
    } catch (error) {
      console.error(error);
      alert("AI failed to build the schedule. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- HANDLE MANUAL EDITS ---
  const updatePlanItem = (index, field, value) => {
    const newPlan = [...studyPlan];
    newPlan[index][field] = value;
    setStudyPlan(newPlan);
  };

  // --- SAVE ROADMAP TO FIREBASE ---
  const saveRoadmap = async () => {
    if (!studyPlan || !user) return;
    setIsSaving(true);
    try {
      const rmRef = collection(db, "roadmaps");
      const qExisting = query(rmRef, where("studentId", "==", user.id));
      const existingSnap = await getDocs(qExisting);
      existingSnap.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });

      await addDoc(rmRef, {
        studentId: user.id,
        exam: exam,
        timeframe: parseInt(timeframe),
        subjects: subjects,
        plan: studyPlan,
        startDate: new Date(),
        completedDays: [],
        streak: 0,
        isActive: true
      });
      router.push("/student");
    } catch (error) {
      console.error("Error saving roadmap:", error);
      alert("Failed to save roadmap. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-circle-notch fa-spin text-4xl text-indigo-600"></i></div>;
  if (!isSignedIn) return <div className="p-10 text-center text-sm font-bold text-slate-500">Please log in.</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {isMobileMenuOpen && ( <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} /> )}

      {/* STUDENT SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-950 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-indigo-900">
          <Link href="/onboarding?switch=true" className="text-xl font-black flex items-center gap-2 hover:text-indigo-400 transition cursor-pointer tracking-tight">
              <i className="fas fa-book-open-reader text-emerald-400"></i> OZONE
          </Link>
          <button className="md:hidden text-indigo-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><i className="fas fa-times"></i></button>
        </div>

            <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button onClick={() => navigateTo('/student')} className="w-full flex items-center text-left gap-3 bg-indigo-800 text-white p-2.5 rounded-xl text-sm font-bold border-l-4 border-emerald-400 shadow-inner">
                <i className="fas fa-home w-4 text-emerald-400"></i> Dashboard
            </button>

            {/* --- NEW AI EXAM GENERATOR BUTTON INSTALLED HERE --- */}
            <button onClick={() => navigateTo('/student/examgenerateusingai')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition group">
                <i className="fas fa-brain w-4 text-fuchsia-400 group-hover:animate-pulse"></i> AI Exam Generator
                <span className="ml-auto bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">New</span>
            </button>
            {/* -------------------------------------------------- */}
          {/* --- NEW: SMART FLASHCARDS BUTTON --- */}
    <button onClick={() => navigateTo('/student/flashcard-generator')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition group">
        <i className="fas fa-bolt w-4 text-amber-400 group-hover:animate-pulse"></i> Smart Flashcards
        <span className="ml-auto bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">New</span>
    </button>
    {/* ------------------------------------ */}
            <button id="tour-sidebar-pyq" onClick={() => navigateTo('/student/pyq')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-book-open w-4"></i> PYQ Practice
            </button>
            <button id="tour-sidebar-planner" onClick={() => navigateTo('/student/planner')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-calendar-check w-4"></i> Study Planner
            </button>
            <button id="tour-sidebar-quiz" onClick={() => navigateTo('/student/quiz-battle')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition group">
                <i className="fas fa-gamepad w-4 text-rose-400 group-hover:animate-bounce"></i> Quiz Battle
            </button>
        </nav>
        
        <div className="p-3 border-t border-indigo-900 bg-indigo-900/30 space-y-1.5">
            <div className="flex items-center gap-2 p-2 bg-indigo-950/50 rounded-lg border border-indigo-800/50 shadow-inner">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=User"} alt="Avatar" className="w-6 h-6 rounded-full border border-indigo-700" />
                <div className="text-xs font-bold truncate flex-1 text-indigo-100">{user?.fullName || "Account"}</div>
            </div>
            <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-600 hover:text-white p-2 rounded-lg transition text-xs font-bold border border-rose-900/50 hover:border-rose-500 bg-rose-950/20 shadow-sm">
                <i className="fas fa-sign-out-alt"></i> Log Out
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto w-full bg-slate-50">
        
        {/* HEADER */}
        <header className="bg-white shadow-sm p-4 md:p-5 flex justify-between items-center z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-slate-600 hover:text-indigo-600 transition" onClick={() => setIsMobileMenuOpen(true)}>
              <i className="fas fa-bars text-xl"></i>
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-900">AI Action Planner</h1>
              <p className="text-[10px] md:text-xs font-medium text-slate-500">Configure and generate your custom study roadmap.</p>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            
            {/* LEFT: CONFIGURATION FORM */}
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
                    <i className="fas fa-sliders-h"></i>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Plan Parameters</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Setup Configuration</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Exam Target</label>
                    <input 
                      type="text" 
                      value={exam} 
                      onChange={e => setExam(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Timeframe</label>
                    <select 
                      value={timeframe} 
                      onChange={e => setTimeframe(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                      <option value="3">3 Days (Crash Course)</option>
                      <option value="7">7 Days (Standard)</option>
                      <option value="14">14 Days (In-Depth)</option>
                      <option value="30">30 Days (Mastery)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Target Subjects</label>
                    <div className="flex flex-wrap gap-2 mb-2.5">
                      {subjects.map((sub, i) => (
                        <span key={i} className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-indigo-100 shadow-sm">
                          {sub} <i className="fas fa-times cursor-pointer hover:text-rose-500 transition ml-1 opacity-50 hover:opacity-100" onClick={() => handleRemoveSubject(sub)}></i>
                        </span>
                      ))}
                    </div>
                    <form onSubmit={handleAddSubject} className="flex gap-2">
                      <input 
                        type="text" 
                        value={currentSubject} 
                        onChange={e => setCurrentSubject(e.target.value)} 
                        placeholder="e.g. Network Theory" 
                        // --- FIX: text-slate-900 added so typing is visible ---
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 transition-all" 
                      />
                      <button type="submit" className="bg-slate-900 text-white px-4 rounded-xl font-bold hover:bg-indigo-600 transition shadow-sm">
                        <i className="fas fa-plus"></i>
                      </button>
                    </form>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Specific Weaknesses (Optional)</label>
                    <textarea 
                      value={topics} 
                      onChange={e => setTopics(e.target.value)} 
                      placeholder="e.g. MOSFET Biasing, KCL/KVL..." 
                      rows="2" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 transition-all resize-none" 
                    />
                  </div>

                  <button 
                    onClick={generatePlan} 
                    disabled={isGenerating || subjects.length === 0} 
                    className="w-full bg-indigo-600 text-white font-black py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 text-sm"
                  >
                    {isGenerating ? <><i className="fas fa-circle-notch fa-spin"></i> Architecting Plan...</> : <><i className="fas fa-magic"></i> Generate Roadmap</>}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: PREVIEW & EDITOR */}
            <div className="lg:col-span-8">
              {!studyPlan && !isGenerating ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                   <div className="w-20 h-20 bg-slate-50 border border-slate-100 text-slate-400 rounded-full flex items-center justify-center text-3xl mb-5 shadow-sm"><i className="fas fa-calendar-alt"></i></div>
                   <h2 className="text-xl font-black text-slate-800 mb-2">No Plan Generated</h2>
                   <p className="text-slate-500 font-medium text-sm max-w-sm mx-auto leading-relaxed">Add your target subjects on the left and click "Generate" to let Gemini build your day-by-day roadmap.</p>
                </div>
              ) : isGenerating ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                   <i className="fas fa-cog fa-spin text-5xl text-indigo-600 mb-5"></i>
                   <h2 className="text-lg font-black text-slate-800 mb-2">Analyzing Topics & Dependencies...</h2>
                   <p className="text-slate-500 text-sm font-medium animate-pulse">Structuring your optimized study schedule.</p>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 pb-8">
                  
                  {/* --- ACTION HEADER --- */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4 sticky top-0 z-20">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 mb-1">Blueprint Ready</h2>
                      <p className="text-slate-500 font-medium text-xs">Review the AI plan below. You can edit any field before saving.</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={() => setIsEditingPlan(!isEditingPlan)} 
                        className={`px-5 py-2.5 rounded-xl font-black text-xs transition border ${isEditingPlan ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-inner' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-indigo-600'}`}
                      >
                        {isEditingPlan ? <><i className="fas fa-check mr-1.5"></i> Finish Editing</> : <><i className="fas fa-pen mr-1.5"></i> Edit Plan</>}
                      </button>
                      <button 
                        onClick={saveRoadmap} 
                        disabled={isSaving || isEditingPlan} 
                        className="bg-slate-900 text-white font-black px-6 py-2.5 rounded-xl hover:bg-indigo-600 transition shadow-md flex items-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>} 
                        {isSaving ? "Saving..." : "Save to Dashboard"}
                      </button>
                    </div>
                  </div>

                  {/* PREVIEW TIMELINE */}
                  <div className="relative border-l-2 border-indigo-100 ml-5 space-y-6 pt-4">
                    {studyPlan.map((day, idx) => (
                      <div key={idx} className="relative pl-8">
                        
                        {/* Day Marker */}
                        <div className="absolute -left-[17px] top-2 w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full border-2 border-white flex items-center justify-center font-black text-[10px] shadow-sm">
                          {day.day}
                        </div>
                        
                        <div className={`bg-white rounded-2xl shadow-sm border p-5 transition-all ${isEditingPlan ? 'border-amber-300 ring-4 ring-amber-50' : 'border-slate-200 hover:border-indigo-200'}`}>
                          
                          {/* IF EDITING */}
                          {isEditingPlan ? (
                            <div className="space-y-4">
                              <div>
                                <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 block">Day Theme</label>
                                <input 
                                  type="text" 
                                  value={day.theme} 
                                  onChange={(e) => updatePlanItem(idx, 'theme', e.target.value)} 
                                  className="w-full bg-amber-50/50 border border-amber-200 rounded-lg p-2.5 text-sm font-bold text-slate-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all" 
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 block">Study Focus</label>
                                <textarea 
                                  value={day.studyFocus} 
                                  onChange={(e) => updatePlanItem(idx, 'studyFocus', e.target.value)} 
                                  rows="2" 
                                  className="w-full bg-amber-50/50 border border-amber-200 rounded-lg p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none" 
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1.5 block">Mock Test Assignment</label>
                                <input 
                                  type="text" 
                                  value={day.mockType} 
                                  onChange={(e) => updatePlanItem(idx, 'mockType', e.target.value)} 
                                  className="w-full bg-amber-50/50 border border-amber-200 rounded-lg p-2.5 text-xs font-bold text-indigo-700 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all" 
                                />
                              </div>
                            </div>
                          ) : (
                            /* READ ONLY PREVIEW */
                            <>
                              <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                                <h3 className="text-base font-black text-slate-900 leading-tight">{day.theme}</h3>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><i className="fas fa-book-reader text-indigo-400"></i> Topic Focus</h4>
                                  <p className="text-sm font-bold text-slate-700 leading-relaxed">{day.studyFocus}</p>
                                </div>
                                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-500 flex items-center justify-center shrink-0">
                                    <i className="fas fa-laptop-code text-xs"></i>
                                  </div>
                                  <div>
                                    <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Assigned Mock</h4>
                                    <p className="text-xs font-bold text-indigo-900">{day.mockType}</p>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}