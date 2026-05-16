"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { collection, addDoc, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ⚡ IMPORT GUEST BLOCKER ⚡
import GuestBlocker from "@/components/GuestBlocker";

export default function StudyPlannerPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

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

    // ⚡ GUEST MODE SIMULATION: Bypasses Real AI API to save costs! ⚡
    if (!user) {
      setTimeout(() => {
        // Creates a dummy timeline based on the exact inputs the guest typed!
        const dummyPlan = Array.from({ length: parseInt(timeframe) }).map((_, i) => ({
          day: i + 1,
          theme: `Phase ${i + 1}: ${subjects[0] || 'Core'} Mastery`,
          studyFocus: `Deep dive into foundational concepts of ${subjects.join(", ")}. Focus on solving at least 30 MCQs related to ${topics || 'the main syllabus'}.`,
          mockType: (i + 1) % 3 === 0 ? "Full Length Mock Exam" : "Topic-wise Practice Quiz"
        }));
        setStudyPlan(dummyPlan);
        setIsGenerating(false);
      }, 3500); // 3.5s delay to simulate "AI Processing"
      return;
    }

    // ⚡ REAL AI GENERATION (For Logged In Students) ⚡
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
      
      // Clear old roadmap if it exists
      existingSnap.forEach(async (docSnap) => {
        await deleteDoc(docSnap.ref);
      });

      // Save new active roadmap
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

  return (
    // ⚡ Removed outer layout sidebars to flow seamlessly inside layout.jsx ⚡
    <div className="flex flex-col min-h-full bg-slate-50 font-sans relative overflow-hidden">
      
      {/* HEADER */}
      <header className="bg-white shadow-sm p-4 md:p-6 flex justify-between items-center z-10 sticky top-0 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/student')} className="text-slate-400 hover:text-slate-700 transition-colors bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 shadow-sm">
            <i className="fas fa-arrow-left text-xs"></i>
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 leading-tight">AI Action Planner</h1>
            <p className="text-[10px] md:text-xs font-medium text-slate-500">Configure and generate your custom study roadmap.</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
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
                    disabled={isGenerating}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50" 
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Timeframe</label>
                  <select 
                    value={timeframe} 
                    onChange={e => setTimeframe(e.target.value)} 
                    disabled={isGenerating}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all cursor-pointer disabled:opacity-50"
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
                      disabled={isGenerating}
                      placeholder="e.g. Network Theory" 
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 transition-all disabled:opacity-50" 
                    />
                    <button type="submit" disabled={isGenerating || !currentSubject.trim()} className="bg-slate-900 text-white px-4 rounded-xl font-bold hover:bg-indigo-600 transition shadow-sm disabled:opacity-50">
                      <i className="fas fa-plus"></i>
                    </button>
                  </form>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Specific Weaknesses (Optional)</label>
                  <textarea 
                    value={topics} 
                    onChange={e => setTopics(e.target.value)} 
                    disabled={isGenerating}
                    placeholder="e.g. MOSFET Biasing, KCL/KVL..." 
                    rows="2" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 transition-all resize-none disabled:opacity-50" 
                  />
                </div>

                {/* ⚡ NO GUEST BLOCKER HERE: Let them simulate generation! ⚡ */}
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
                 <p className="text-slate-500 font-medium text-sm max-w-sm mx-auto leading-relaxed">Add your target subjects on the left and click "Generate" to let our AI build your day-by-day roadmap.</p>
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
                <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4 sticky top-4 z-20">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 mb-1">Blueprint Ready</h2>
                    <p className="text-slate-500 font-medium text-xs">Review the AI plan below. You can edit any field before saving.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button 
                      onClick={() => setIsEditingPlan(!isEditingPlan)} 
                      className={`px-5 py-2.5 rounded-xl font-black text-xs transition border flex-1 md:flex-none justify-center flex items-center gap-1.5 ${isEditingPlan ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-inner' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-indigo-600'}`}
                    >
                      {isEditingPlan ? <><i className="fas fa-check"></i> Finish Editing</> : <><i className="fas fa-pen"></i> Edit Plan</>}
                    </button>

                    {/* ⚡ GUEST BLOCKER APPLIED ONLY TO SAVING THE PLAN ⚡ */}
                    <GuestBlocker role="student">
                      <button 
                        onClick={saveRoadmap} 
                        disabled={isSaving || isEditingPlan} 
                        className="bg-slate-900 text-white font-black px-6 py-2.5 rounded-xl hover:bg-indigo-600 transition shadow-md flex items-center justify-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed flex-1 md:flex-none"
                      >
                        {isSaving ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-upload-alt"></i>} 
                        {isSaving ? "Saving..." : "Save to Dashboard"}
                      </button>
                    </GuestBlocker>
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
    </div>
  );
}