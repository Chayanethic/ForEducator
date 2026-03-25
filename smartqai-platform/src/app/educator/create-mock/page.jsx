"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateMockPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState([]);
  
  // --- NEW: Toggle for AI Explanations ---
  const [generateExplanations, setGenerateExplanations] = useState(false);
  
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedRoomId, setPublishedRoomId] = useState(null);
  const [copied, setCopied] = useState(false); 
  
  const [examSections, setExamSections] = useState([]);

  const [examTitle, setExamTitle] = useState("GATE 2026 - Custom AI Mock");
  const [duration, setDuration] = useState(60); 
  const [allowCalculator, setAllowCalculator] = useState(true);
  const [availability, setAvailability] = useState("permanent"); 
  const [visibility, setVisibility] = useState("private"); 
  const [examCategory, setExamCategory] = useState("GATE ECE"); 

  const handleExtract = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a PDF first.");

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("pdf", file);
    // --- NEW: Send the toggle status to the API ---
    formData.append("generateExplanations", generateExplanations);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Server crashed.");
      
      const data = await res.json();
      if (data.questions) {
        // Normalize the AI output to ensure correctAnswer is used
        const enrichedQuestions = data.questions.map(q => ({
            ...q, 
            marks: 2, 
            negativeMarks: 0.66,
            correctAnswer: q.correctAnswer || q.correctOption || ""
        }));
        setQuestions(enrichedQuestions);
        setExamSections([{ name: "Section 1", count: enrichedQuestions.length }]);
      } else {
        alert("Could not extract questions.");
      }
    } catch (error) {
      alert(`AI Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (imageFile, qIndex, optIndex = null) => {
    if (!imageFile) return;
    const fileRef = ref(storage, `mocks/images/${Date.now()}-${imageFile.name}`);
    try {
      const snapshot = await uploadBytes(fileRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const updated = [...questions];
      if (optIndex !== null) {
        updated[qIndex].options[optIndex].imageUrl = downloadURL;
        updated[qIndex].options[optIndex].hasImage = true;
      } else {
        updated[qIndex].imageUrl = downloadURL;
        updated[qIndex].hasImage = true;
      }
      setQuestions(updated);
    } catch (error) {
      alert("Failed to upload image.");
    }
  };

  // --- Handle Question Type Changes Safely ---
  const handleTypeChange = (qIndex, newType) => {
    const updated = [...questions];
    updated[qIndex].type = newType;
    
    if (newType === 'MSQ') {
      updated[qIndex].correctAnswer = Array.isArray(updated[qIndex].correctAnswer) ? updated[qIndex].correctAnswer : [];
    } else if (newType === 'NAT') {
      updated[qIndex].options = [];
      updated[qIndex].correctAnswer = "";
    } else {
      updated[qIndex].correctAnswer = typeof updated[qIndex].correctAnswer === 'string' ? updated[qIndex].correctAnswer : "";
    }
    setQuestions(updated);
  };

  // --- Toggle Logic for MSQ Checkboxes ---
  const toggleMsqAnswer = (qIndex, optId) => {
    const updated = [...questions];
    let currentAns = updated[qIndex].correctAnswer || [];
    if (!Array.isArray(currentAns)) currentAns = []; 
    
    if (currentAns.includes(optId)) {
      updated[qIndex].correctAnswer = currentAns.filter(id => id !== optId);
    } else {
      updated[qIndex].correctAnswer = [...currentAns, optId];
    }
    setQuestions(updated);
  };

  const updateQuestionField = (qIndex, field, value) => {
    const updated = [...questions];
    updated[qIndex][field] = value;
    setQuestions(updated);
  };
  const updateOptionText = (qIndex, optIndex, newText) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].text = newText;
    setQuestions(updated);
  }
  const removeQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(publishedRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); 
  };

  const updateSection = (index, field, value) => {
    const newSecs = [...examSections];
    newSecs[index][field] = value;
    setExamSections(newSecs);
  };
  const addSection = () => {
    setExamSections([...examSections, { name: `Section ${examSections.length + 1}`, count: 0 }]);
  };
  const removeSection = (index) => {
    setExamSections(examSections.filter((_, i) => i !== index));
  };
  
  const totalSectionQuestions = examSections.reduce((acc, sec) => acc + (parseInt(sec.count) || 0), 0);

  const getSectionForIndex = (index) => {
    let passed = 0;
    for (const sec of examSections) {
      passed += (parseInt(sec.count) || 0);
      if (index < passed) return sec.name;
    }
    return "Unassigned";
  };

  const saveToDatabase = async () => {
    if (questions.length === 0) return alert("No questions to save!");
    if (!isSignedIn) return alert("Please log in first.");
    
    if (totalSectionQuestions !== questions.length) {
      return alert(`Error: Your sections assign ${totalSectionQuestions} questions, but you have ${questions.length} extracted questions. Please adjust the counts.`);
    }

    setIsPublishing(true);

    try {
      const mockRef = await addDoc(collection(db, "mocks"), {
        educatorId: user.id,
        educatorName: user.fullName || "Educator",
        title: examTitle,
        duration: Number(duration),
        allowCalculator: allowCalculator,
        availability: availability,
        visibility: visibility,
        examCategory: examCategory,
        createdAt: new Date(),
        status: "published", 
      });

      const questionsRef = collection(db, "mocks", mockRef.id, "questions");
      let currentSecIdx = 0;
      let qAssignedToCurrentSec = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let assignedSection = "General";
        
        if (currentSecIdx < examSections.length) {
          assignedSection = examSections[currentSecIdx].name;
          qAssignedToCurrentSec++;
          if (qAssignedToCurrentSec >= parseInt(examSections[currentSecIdx].count)) {
            currentSecIdx++;
            qAssignedToCurrentSec = 0;
          }
        }

        await addDoc(questionsRef, {
           text: q.text, 
           type: q.type || "MCQ", 
           options: q.options || [], 
           correctAnswer: q.correctAnswer,
           explanation: q.explanation || "",
           imageUrl: q.imageUrl || null, 
           hasImage: q.hasImage || false,
           marks: Number(q.marks) || 2, 
           negativeMarks: Number(q.negativeMarks) || 0.66,
           section: assignedSection 
        });
      }

      setPublishedRoomId(mockRef.id);
      
    } catch (error) {
      alert("Failed to save mock.");
      setIsPublishing(false); 
    }
  };

  if (!isLoaded) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative">
      
     {/* ENHANCED SUCCESS SCREEN OVERLAY */}
      {publishedRoomId && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2rem] shadow-2xl text-center max-w-md w-full border border-slate-100 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                <i className="fas fa-check"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Exam is Live!</h2>
              <p className="text-slate-700 mb-8 font-medium">
                {visibility === "private" ? "This exam is private. Share the Room ID below with your students." : "This exam is public and available on the platform!"}
              </p>
              
              <div className="bg-slate-50 p-5 rounded-2xl mb-8 flex items-center justify-between border-2 border-slate-200 shadow-inner">
                <span className="text-3xl font-mono font-black tracking-widest text-indigo-700">{publishedRoomId}</span>
                <button 
                  onClick={handleCopyCode} 
                  className={`p-3 rounded-xl shadow-sm transition-all font-bold flex items-center gap-2 ${copied ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-white text-slate-800 hover:text-indigo-700 hover:border-indigo-300 border border-slate-300'}`} 
                  title="Copy Room ID"
                >
                  {copied ? <><i className="fas fa-check"></i> Copied!</> : <i className="fas fa-copy"></i>}
                </button>
              </div>
              
              <div className="flex gap-4">
                <button onClick={() => window.location.reload()} className="flex-1 bg-white text-slate-800 border-2 border-slate-200 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm">
                  Create New
                </button>
                <button onClick={() => router.push(`/educator/live-rooms/${publishedRoomId}`)} className="flex-1 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3.5 rounded-xl font-bold hover:from-indigo-700 hover:to-indigo-800 transition shadow-lg shadow-indigo-600/30">
                  View Room <i className="fas fa-arrow-right ml-1"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDUCATOR SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex shrink-0">
        <Link href="/onboarding?switch=true" className="p-6 text-2xl font-bold flex items-center gap-2 border-b border-slate-800 hover:text-emerald-400 transition cursor-pointer block">
            <i className="fas fa-chalkboard-teacher text-emerald-400"></i> SmartQAI
        </Link>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button onClick={() => router.push('/educator/create-mock')} className="w-full flex items-center gap-3 bg-slate-800 text-white p-3 rounded-lg font-medium border-l-4 border-emerald-500">
                <i className="fas fa-file-pdf w-5"></i> AI PDF Extractor
            </button>
            <button onClick={() => router.push('/educator/live-rooms')} className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-lg transition">
                <i className="fas fa-door-open w-5"></i> Live Rooms
            </button>
        </nav>
        
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800 shadow-inner">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Educator"} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700" />
                <div className="text-sm font-medium truncate flex-1 text-slate-300">{user?.fullName || "Account"}</div>
            </div>
            <button onClick={() => router.push('/onboarding?switch=true')} className="w-full flex items-center justify-center gap-2 text-slate-400 hover:bg-slate-800 hover:text-white p-2.5 rounded-lg transition text-sm font-bold border border-transparent hover:border-slate-700 shadow-sm">
                <i className="fas fa-exchange-alt"></i> Switch Role
            </button>
            <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-600 hover:text-white p-2.5 rounded-lg transition text-sm font-bold border border-rose-900/50 hover:border-rose-500 bg-rose-950/20 shadow-sm">
                <i className="fas fa-sign-out-alt"></i> Log Out
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-white shadow-sm p-6 flex justify-between items-center z-10 sticky top-0">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Mock Test Studio</h1>
            <input type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} className="text-sm font-bold text-emerald-600 bg-transparent border-b-2 border-slate-200 outline-none focus:border-emerald-500 mt-2 pb-1 w-80" placeholder="Enter Exam Title..." />
          </div>
          <button onClick={saveToDatabase} disabled={questions.length === 0 || isPublishing} className={`px-6 py-2.5 rounded-xl font-bold shadow-sm transition flex items-center gap-2 ${questions.length > 0 && !isPublishing ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
            {isPublishing ? "Publishing..." : "Publish to Live Room"} <i className="fas fa-arrow-right"></i>
          </button>
        </header>

        <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto w-full">
          {questions.length === 0 && (
            <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              
              {/* 1. The Drag & Drop Area (Strictly for the file now) */}
              <label className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition p-12 flex flex-col items-center justify-center text-center cursor-pointer group mb-8">
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                <div className="w-20 h-20 bg-white text-emerald-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm group-hover:scale-110 transition-transform border border-emerald-100"><i className="fas fa-file-pdf"></i></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">{file ? file.name : "Drag & Drop your Exam PDF here"}</h3>
                <p className="text-sm font-medium text-slate-600">Gemini 2.5 will auto-extract images, text, and options.</p>
              </label>

              {/* 2. The Controls (Moved OUTSIDE the label to prevent click conflicts) */}
              <div className="flex flex-col items-center justify-center gap-6">
                
                {/* The AI Toggle */}
                <div className="flex items-center gap-3 bg-emerald-50/50 px-6 py-4 rounded-xl border border-emerald-100 shadow-inner w-full max-w-lg justify-center">
                   <input 
                     type="checkbox" 
                     id="ai-toggle"
                     checked={generateExplanations} 
                     onChange={(e) => setGenerateExplanations(e.target.checked)} 
                     className="w-5 h-5 accent-emerald-600 cursor-pointer"
                   />
                   <label htmlFor="ai-toggle" className="text-sm font-bold text-slate-800 cursor-pointer select-none">
                     Generate AI Explanations <span className="text-rose-600 font-black ml-1">(Turn OFF for 20+ Qs)</span>
                   </label>
                </div>

                {/* The Extract Button */}
                <button 
                  onClick={handleExtract} 
                  disabled={isProcessing || !file} 
                  className="bg-slate-900 text-white px-10 py-4 rounded-xl font-black hover:bg-slate-800 transition disabled:bg-slate-400 shadow-lg shadow-slate-900/20 w-full max-w-lg"
                >
                  {isProcessing ? "AI is Analyzing..." : "Commence Extraction"}
                </button>
                
              </div>
            </section>
          )}

          {questions.length > 0 && (
            <>
              {/* SECTION MANAGER */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4 mb-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider"><i className="fas fa-layer-group text-emerald-500 mr-2"></i> Section Architecture</h3>
                  <div className={`text-xs font-bold px-4 py-2 rounded-full border ${totalSectionQuestions === questions.length ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'}`}>
                    Assigned: {totalSectionQuestions} / {questions.length} Extracted
                  </div>
                </div>
                <div className="space-y-4">
                  {examSections.map((sec, i) => (
                    <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">{i+1}</div>
                      <input type="text" value={sec.name} onChange={(e) => updateSection(i, 'name', e.target.value)} placeholder="Section Name (e.g. Math)" className="flex-1 bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 shadow-sm min-w-[200px]"/>
                      <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-1.5 pr-4 shadow-sm">
                        <input type="number" value={sec.count} onChange={(e) => updateSection(i, 'count', parseInt(e.target.value) || 0)} className="w-16 bg-transparent p-1 text-center text-sm font-black text-emerald-700 outline-none"/>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Questions</span>
                      </div>
                      {examSections.length > 1 && (
                        <button onClick={() => removeSection(i)} className="w-10 h-10 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-full transition shrink-0"><i className="fas fa-times"></i></button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addSection} className="mt-5 text-sm font-bold text-indigo-700 bg-indigo-50 px-5 py-2.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition shadow-sm"><i className="fas fa-plus mr-1"></i> Add Another Section</button>
              </div>

              <div className="space-y-6">
                {questions.map((q, qIndex) => (
                  <div key={qIndex} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative hover:border-emerald-400 transition group">
                    <button onClick={() => removeQuestion(qIndex)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 transition opacity-0 group-hover:opacity-100"><i className="fas fa-trash text-lg"></i></button>

                    <div className="flex flex-wrap gap-4 mb-5 items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="bg-slate-800 text-white text-xs font-black px-3 py-1.5 rounded">Q{qIndex + 1}</span>
                      
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-4 py-1.5 rounded-full border border-emerald-200 shadow-sm truncate max-w-[150px]">
                         {getSectionForIndex(qIndex)}
                      </span>

                      {/* --- QUESTION TYPE TOGGLE --- */}
                      <select value={q.type || "MCQ"} onChange={(e) => handleTypeChange(qIndex, e.target.value)} className="bg-white border border-slate-300 rounded-lg text-xs px-3 py-2 text-slate-900 font-bold outline-none shadow-sm ml-auto cursor-pointer focus:border-indigo-500">
                          <option value="MCQ">MCQ (Single Choice)</option>
                          <option value="MSQ">MSQ (Multiple Select)</option>
                          <option value="NAT">NAT (Numerical)</option>
                      </select>
                      
                      <div className="flex items-center gap-2 border-l-2 border-slate-200 pl-4">
                        <span className="text-xs font-bold text-emerald-700 uppercase">+ Mark:</span>
                        <input type="number" step="0.5" value={q.marks} onChange={(e) => updateQuestionField(qIndex, 'marks', e.target.value)} className="w-16 bg-white border border-emerald-300 rounded-md text-sm px-2 py-1 text-emerald-900 font-black outline-none shadow-sm"/>
                      </div>
                      <div className="flex items-center gap-2 border-l-2 border-slate-200 pl-4">
                        <span className="text-xs font-bold text-rose-700 uppercase">- Mark:</span>
                        <input type="number" step="0.1" value={q.negativeMarks} onChange={(e) => updateQuestionField(qIndex, 'negativeMarks', e.target.value)} className="w-16 bg-white border border-rose-300 rounded-md text-sm px-2 py-1 text-rose-900 font-black outline-none shadow-sm"/>
                      </div>
                    </div>

                    <textarea value={q.text} onChange={(e) => updateQuestionField(qIndex, 'text', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-base text-slate-900 mb-4 focus:ring-2 focus:ring-emerald-500 outline-none resize-y font-bold shadow-inner leading-relaxed" rows="3"/>

                    {/* --- AI Fallback Explanation Viewer --- */}
                    <div className="mb-5 bg-indigo-50/70 border border-indigo-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-indigo-700 text-xs font-black mb-2 uppercase tracking-wide">
                        <i className="fas fa-robot"></i> AI Explanation / Solution
                      </div>
                      <textarea 
                        value={q.explanation || ""} 
                        onChange={(e) => updateQuestionField(qIndex, 'explanation', e.target.value)} 
                        className="w-full bg-white border border-indigo-200 rounded-lg p-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 resize-y shadow-sm" 
                        rows="2" 
                        placeholder="Add a solution or let the AI explain why this is the answer..."
                      />
                    </div>

                    <div className="mb-6">
                      {q.hasImage || q.imageUrl ? (
                        <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-100 p-3 group/mainimg shadow-inner">
                          {q.imageUrl ? <img src={q.imageUrl} alt="Q" className="max-h-40 mx-auto object-contain" /> : <div className="flex flex-col items-center justify-center p-8 text-slate-500"><i className="fas fa-image text-4xl mb-3"></i><span className="text-sm font-bold">Image Missing</span></div>}
                          <label className="absolute inset-0 w-full h-full bg-slate-900/80 flex items-center justify-center opacity-0 group-hover/mainimg:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                            <span className="bg-white text-slate-900 text-sm font-bold px-5 py-2.5 rounded-xl shadow-xl"><i className="fas fa-upload mr-2"></i> Replace Image</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex)} />
                          </label>
                        </div>
                      ) : (
                        <label className="mb-4 text-sm font-bold text-indigo-700 bg-indigo-50 px-5 py-2.5 rounded-xl inline-flex items-center gap-2 border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition shadow-sm">
                          <i className="fas fa-camera"></i> Attach Diagram to Question
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex)} />
                        </label>
                      )}
                    </div>

                    {/* --- DYNAMIC OPTIONS RENDERER --- */}
                    {q.type === 'NAT' ? (
                      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-inner">
                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Numerical Answer</label>
                        <input 
                          type="text" 
                          value={q.correctAnswer || ''} 
                          onChange={(e) => updateQuestionField(qIndex, 'correctAnswer', e.target.value)}
                          className="w-full max-w-xs bg-white border-2 border-slate-300 rounded-lg p-3 text-xl font-black text-slate-900 outline-none focus:border-emerald-500 shadow-sm"
                          placeholder="e.g. 4.5"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
                        {q.options?.map((opt, optIndex) => {
                          const isCorrect = q.type === 'MSQ' 
                            ? (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id))
                            : q.correctAnswer === opt.id;

                          return (
                            <div key={optIndex} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition shadow-sm bg-white ${isCorrect ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-300 hover:border-slate-400'}`}>
                              
                              <input 
                                type={q.type === 'MSQ' ? "checkbox" : "radio"} 
                                name={q.type === 'MSQ' ? `q-${qIndex}-${optIndex}` : `q-${qIndex}-correct`} 
                                checked={isCorrect} 
                                onChange={() => q.type === 'MSQ' ? toggleMsqAnswer(qIndex, opt.id) : updateQuestionField(qIndex, 'correctAnswer', opt.id)} 
                                className={`mt-2.5 w-5 h-5 cursor-pointer shrink-0 accent-emerald-600 ${q.type === 'MSQ' ? 'rounded-sm' : ''}`} 
                              />
                              
                              <div className="flex-1 relative">
                                <input type="text" value={opt.text} onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none font-bold text-slate-900 focus:border-indigo-400 focus:bg-white transition shadow-inner" />
                                <div className="mt-3">
                                  {opt.hasImage || opt.imageUrl ? (
                                    <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-slate-100 mt-2 p-1.5 group/optimg shadow-inner">
                                      {opt.imageUrl ? <img src={opt.imageUrl} alt="Opt" className="max-h-24 mx-auto object-contain" /> : <div className="h-12 flex items-center justify-center text-slate-500 text-xs font-bold bg-slate-200 rounded">No Image Found</div>}
                                      <label className="absolute inset-0 w-full h-full bg-slate-900/80 text-white text-xs font-bold opacity-0 group-hover/optimg:opacity-100 flex items-center justify-center cursor-pointer backdrop-blur-sm transition">
                                        Upload New <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, optIndex)} />
                                      </label>
                                    </div>
                                  ) : (
                                     <label className="text-xs font-bold text-slate-600 cursor-pointer mt-1 inline-flex items-center gap-1.5 bg-white border border-slate-300 px-3 py-2 rounded-md hover:bg-slate-100 hover:text-indigo-700 transition shadow-sm">
                                       <i className="fas fa-image"></i> Add Image
                                       <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, optIndex)} />
                                     </label>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-10 mb-6 border-t border-slate-200 pt-8">
                <h2 className="text-xl font-black text-slate-900 mb-6"><i className="fas fa-cog text-slate-400 mr-2"></i> Exam Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Exam Category</label>
                    <select value={examCategory} onChange={(e) => setExamCategory(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg p-3 text-sm text-slate-900 font-bold outline-none focus:border-emerald-500 cursor-pointer">
                      <option value="GATE ECE">GATE ECE</option>
                      <option value="GATE CS">GATE CS</option>
                      <option value="GATE EE">GATE EE</option>
                      <option value="GATE ME">GATE ME</option>
                      <option value="JEE Mains">JEE Mains</option>
                      <option value="SSC CGL">SSC CGL</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Visibility</label>
                    <div className="flex bg-slate-100 p-1.5 rounded-xl">
                      <button onClick={() => setVisibility("private")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${visibility === "private" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}><i className="fas fa-lock mr-1"></i> Private</button>
                      <button onClick={() => setVisibility("public")} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${visibility === "public" ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}><i className="fas fa-globe mr-1"></i> Public</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Duration (Mins)</label>
                    <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg p-3 text-sm text-slate-900 font-bold outline-none focus:border-emerald-500"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Availability</label>
                    <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-lg p-3 text-sm text-slate-900 font-bold outline-none focus:border-emerald-500 cursor-pointer">
                      <option value="24h">Open for 24 Hours</option><option value="48h">Open for 48 Hours</option><option value="permanent">Permanent</option>
                    </select>
                  </div>
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Tools</label>
                    <div onClick={() => setAllowCalculator(!allowCalculator)} className={`flex items-center justify-between p-3.5 border-2 rounded-xl cursor-pointer transition ${allowCalculator ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200"}`}>
                      <div className="flex items-center gap-3"><i className={`fas fa-calculator text-lg ${allowCalculator ? "text-emerald-600" : "text-slate-400"}`}></i><div className={`text-sm font-bold ${allowCalculator ? "text-emerald-900" : "text-slate-700"}`}>Virtual Calc</div></div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${allowCalculator ? "bg-emerald-500" : "bg-slate-300"}`}><div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${allowCalculator ? "right-1" : "left-1"}`}></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}