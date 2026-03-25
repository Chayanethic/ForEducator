"use client";

import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, doc, deleteDoc, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

// Extracting credentials from .env.local
const ADMIN_USERNAME = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

export default function AdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [activeTab, setActiveTab] = useState("create"); 
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- NEW: AI Explanations Toggle for Admin ---
  const [generateExplanations, setGenerateExplanations] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);
  
  const [publishedRoomId, setPublishedRoomId] = useState(null); 
  const [copied, setCopied] = useState(false);
  
  const [questions, setQuestions] = useState([]);
  const [examSections, setExamSections] = useState([]);
  const [examTitle, setExamTitle] = useState("GATE ECE 2023 - Official PYQ");
  const [duration, setDuration] = useState(180); 
  const [allowCalculator, setAllowCalculator] = useState(true);
  
  const [examCategory, setExamCategory] = useState("GATE ECE");
  const [showInLiveFeed, setShowInLiveFeed] = useState(false);

  const [adminMocks, setAdminMocks] = useState([]);
  const [isLoadingMocks, setIsLoadingMocks] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Invalid credentials. Access denied.");
    }
  };

  const fetchAdminMocks = async () => {
    setIsLoadingMocks(true);
    try {
      const q = query(collection(db, "mocks"), where("educatorId", "==", "admin_official"));
      const snap = await getDocs(q);
      const mocks = snap.docs.map(d => ({ id: d.id, ...d.data(), createdAtDate: d.data().createdAt?.toDate() }));
      mocks.sort((a, b) => b.createdAtDate - a.createdAtDate);
      setAdminMocks(mocks);
    } catch (error) {
      console.error("Error fetching admin mocks:", error);
    } finally {
      setIsLoadingMocks(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === "manage") fetchAdminMocks();
  }, [isAuthenticated, activeTab]);

  const handleDeleteMock = async (mockId) => {
    if (!confirm("Are you sure you want to permanently delete this PYQ?")) return;
    try {
      const qRef = collection(db, "mocks", mockId, "questions");
      const qSnap = await getDocs(qRef);
      const deletePromises = qSnap.docs.map(d => deleteDoc(doc(db, "mocks", mockId, "questions", d.id)));
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, "mocks", mockId));
      fetchAdminMocks(); 
    } catch (error) {
      alert("Failed to delete mock.");
    }
  };

  const handleExtract = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a PDF first.");
    setIsProcessing(true);
    
    const formData = new FormData();
    formData.append("pdf", file);
    // --- NEW: Send toggle state to API ---
    formData.append("generateExplanations", generateExplanations);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Server crashed.");
      const data = await res.json();
      if (data.questions) {
        const enrichedQuestions = data.questions.map(q => ({
            ...q, 
            marks: 2, 
            negativeMarks: 0.66,
            correctAnswer: q.correctAnswer || q.correctOption || ""
        }));
        setQuestions(enrichedQuestions);
        setExamSections([{ name: "Section 1", count: enrichedQuestions.length }]);
      } else {
        alert("Extraction failed.");
      }
    } catch (error) {
      alert(`AI Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (imageFile, qIndex, optIndex = null) => {
    if (!imageFile) return;
    const fileRef = ref(storage, `mocks/images/admin-${Date.now()}-${imageFile.name}`);
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
      alert("Image upload failed.");
    }
  };

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
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(publishedRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); 
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
    if (totalSectionQuestions !== questions.length) {
      return alert(`Error: Your sections assign ${totalSectionQuestions} questions, but you have ${questions.length} extracted questions. Please adjust the section counts to match exactly.`);
    }

    setIsPublishing(true);

    try {
      const mockRef = await addDoc(collection(db, "mocks"), {
        educatorId: "admin_official", 
        educatorName: "SmartQAI Official",
        title: examTitle,
        duration: Number(duration),
        allowCalculator: allowCalculator,
        examCategory: examCategory, 
        availability: "permanent", 
        visibility: "public", 
        createdAt: new Date(),
        status: "published", 
        isPYQ: true,
        showInLiveFeed: showInLiveFeed 
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
      alert("Database Error.");
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200">
          <div className="flex justify-center mb-6 text-rose-600 text-4xl"><i className="fas fa-user-shield"></i></div>
          <h1 className="text-2xl font-black text-center text-slate-800 mb-2">Admin Override</h1>
          <p className="text-center text-slate-600 mb-8 font-medium">Restricted access portal for PYQ Management.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm font-bold text-center border border-rose-200">{loginError}</div>}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Admin ID</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold rounded-lg p-3 outline-none focus:border-rose-500 mt-1" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Passcode</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-bold rounded-lg p-3 outline-none focus:border-rose-500 mt-1" required />
            </div>
            <button type="submit" className="w-full bg-rose-600 text-white font-bold py-3.5 rounded-lg hover:bg-rose-700 transition mt-4 shadow-lg shadow-rose-500/30">Access Portal</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative selection:bg-rose-100 selection:text-rose-900">
      
      {publishedRoomId && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2rem] shadow-2xl text-center max-w-md w-full border border-slate-100 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-rose-400/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="w-24 h-24 bg-gradient-to-br from-rose-500 to-rose-700 text-white rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg shadow-rose-500/30">
                <i className="fas fa-check"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">PYQ Published!</h2>
              <p className="text-slate-700 mb-8 font-medium">
                This Official PYQ is now live under the <strong className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{examCategory}</strong> category.
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
              
              <button 
                onClick={() => {
                  setPublishedRoomId(null);
                  setQuestions([]); 
                  setFile(null); 
                  setExamTitle(""); 
                  setExamSections([]); 
                  setActiveTab("manage");
                }}
                className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold hover:bg-slate-700 transition shadow-md text-lg"
              >
                Go to Manage Mocks
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="w-64 bg-slate-950 text-white flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-6 text-2xl font-black flex items-center gap-2 border-b border-slate-800 text-rose-500 tracking-tight">
            <i className="fas fa-shield-alt"></i> Command Center
        </div>
        <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => setActiveTab("create")} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition ${activeTab === 'create' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'text-slate-300 hover:bg-slate-900 hover:text-rose-400'}`}>
                <i className="fas fa-upload w-5"></i> Upload PYQ
            </button>
            <button onClick={() => setActiveTab("manage")} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition ${activeTab === 'manage' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'text-slate-300 hover:bg-slate-900 hover:text-rose-400'}`}>
                <i className="fas fa-database w-5"></i> Manage Mocks
            </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
            <button onClick={() => setIsAuthenticated(false)} className="w-full flex items-center gap-3 text-slate-400 hover:text-white p-3 rounded-lg font-bold transition">
                <i className="fas fa-sign-out-alt w-5"></i> Lock Portal
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto">
        {activeTab === "create" && (
          <>
            <header className="bg-white shadow-sm p-6 flex justify-between items-center z-10 sticky top-0">
              <div>
                <h1 className="text-2xl font-black text-slate-900">PYQ Generation Studio</h1>
                <input 
                    type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)}
                    className="text-sm font-bold text-rose-600 bg-transparent border-b-2 border-slate-200 outline-none focus:border-rose-500 mt-2 pb-1 w-80"
                    placeholder="e.g. GATE CS 2021 Official"
                />
              </div>
              <button onClick={saveToDatabase} disabled={questions.length === 0 || isPublishing} className={`px-6 py-2.5 rounded-xl font-bold shadow-sm transition flex items-center gap-2 ${questions.length > 0 && !isPublishing ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
                {isPublishing ? "Deploying..." : "Deploy to Students"} <i className="fas fa-globe"></i>
              </button>
            </header>

            <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto w-full">
              
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase mb-2 block tracking-wide">Exam Category</label>
                  <select value={examCategory} onChange={(e) => setExamCategory(e.target.value)} className="border-2 border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-rose-500 bg-slate-50 text-rose-700 cursor-pointer">
                    <option value="GATE ECE">GATE ECE</option>
                    <option value="GATE CS">GATE CS</option>
                    <option value="GATE EE">GATE EE</option>
                    <option value="GATE ME">GATE ME</option>
                    <option value="JEE Mains">JEE Mains</option>
                    <option value="SSC CGL">SSC CGL</option>
                  </select>
                </div>
                <div className="border-l-2 border-slate-100 pl-6">
                  <label className="text-xs font-bold text-slate-700 uppercase mb-2 block tracking-wide">Duration (Mins)</label>
                  <input type="number" value={duration} onChange={(e)=>setDuration(e.target.value)} className="w-24 border-2 border-slate-200 rounded-lg p-2 text-sm font-bold outline-none focus:border-rose-500 bg-slate-50 text-slate-900"/>
                </div>
                <div className="border-l-2 border-slate-100 pl-6">
                  <label className="text-xs font-bold text-slate-700 uppercase block mb-2 tracking-wide">Tools</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={allowCalculator} onChange={(e)=>setAllowCalculator(e.target.checked)} className="w-5 h-5 accent-rose-600 cursor-pointer"/>
                    <span className="text-sm font-bold text-slate-800">Virtual Calc</span>
                  </div>
                </div>
                <div className="border-l-2 border-slate-100 pl-6 flex-1">
                  <label className="text-xs font-bold text-rose-600 uppercase block mb-2 tracking-wide">Live Feed Visibility</label>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={showInLiveFeed} onChange={(e)=>setShowInLiveFeed(e.target.checked)} className="w-5 h-5 accent-rose-600 cursor-pointer"/>
                    <span className="text-sm font-bold text-slate-800">Push to Student Dashboard 'Live' section</span>
                  </div>
                </div>
              </div>

              {questions.length === 0 && (
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                  
                  {/* --- FIXED: The Drag & Drop Area (Strictly for the file now) --- */}
                  <label className="border-2 border-dashed border-rose-300 rounded-2xl bg-rose-50/50 hover:bg-rose-50 transition p-12 flex flex-col items-center justify-center text-center cursor-pointer group mb-8">
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                    <div className="w-20 h-20 bg-white text-rose-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm group-hover:scale-110 transition-transform border border-rose-100"><i className="fas fa-file-pdf"></i></div>
                    <h3 className="text-xl font-black text-slate-800 mb-2">{file ? file.name : "Upload Official PYQ PDF"}</h3>
                    <p className="text-sm font-medium text-slate-600">Gemini will auto-extract images, text, and options.</p>
                  </label>

                  {/* --- FIXED: Controls moved OUTSIDE the label so the Checkbox is clickable! --- */}
                  <div className="flex flex-col items-center justify-center gap-6">
                    
                    <div className="flex items-center gap-3 bg-rose-50/50 px-6 py-4 rounded-xl border border-rose-100 shadow-inner w-full max-w-lg justify-center">
                       <input 
                         type="checkbox" 
                         id="admin-ai-toggle"
                         checked={generateExplanations} 
                         onChange={(e) => setGenerateExplanations(e.target.checked)} 
                         className="w-5 h-5 accent-rose-600 cursor-pointer"
                       />
                       <label htmlFor="admin-ai-toggle" className="text-sm font-bold text-slate-800 cursor-pointer select-none">
                         Generate AI Explanations <span className="text-rose-600 font-black ml-1">(Turn OFF for 20+ Qs)</span>
                       </label>
                    </div>

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
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4 mb-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider"><i className="fas fa-layer-group text-indigo-500 mr-2"></i> Section Architecture</h3>
                    <div className={`text-xs font-bold px-4 py-2 rounded-full border ${totalSectionQuestions === questions.length ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'}`}>
                      Assigned: {totalSectionQuestions} / {questions.length} Extracted
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {examSections.map((sec, i) => (
                      <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">{i+1}</div>
                        <input type="text" value={sec.name} onChange={(e) => updateSection(i, 'name', e.target.value)} placeholder="Section Name (e.g. General Aptitude)" className="flex-1 bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-bold text-slate-900 outline-none focus:border-rose-500 shadow-sm min-w-[200px]"/>
                        <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-1.5 pr-4 shadow-sm">
                          <input type="number" value={sec.count} onChange={(e) => updateSection(i, 'count', parseInt(e.target.value) || 0)} className="w-16 bg-transparent p-1 text-center text-sm font-black text-indigo-700 outline-none"/>
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
              )}

              {questions.length > 0 && (
                <div className="space-y-6">
                  {questions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative hover:border-rose-400 transition group">
                      <button onClick={() => removeQuestion(qIndex)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 transition opacity-0 group-hover:opacity-100"><i className="fas fa-trash text-lg"></i></button>

                      <div className="flex flex-wrap gap-4 mb-5 items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="bg-slate-800 text-white text-xs font-black px-3 py-1.5 rounded">Q{qIndex + 1}</span>
                        
                        <span className="bg-indigo-100 text-indigo-800 text-xs font-black px-4 py-1.5 rounded-full border border-indigo-200 shadow-sm truncate max-w-[150px]">
                           {getSectionForIndex(qIndex)}
                        </span>

                        <select value={q.type || "MCQ"} onChange={(e) => handleTypeChange(qIndex, e.target.value)} className="bg-white border border-slate-300 rounded-lg text-xs px-3 py-2 text-slate-900 font-bold outline-none shadow-sm ml-auto cursor-pointer focus:border-rose-500">
                            <option value="MCQ">MCQ (Single)</option>
                            <option value="MSQ">MSQ (Multiple)</option>
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

                      <textarea value={q.text} onChange={(e) => updateQuestionField(qIndex, 'text', e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-base text-slate-900 mb-4 focus:ring-2 focus:ring-rose-500 outline-none resize-y font-bold shadow-inner leading-relaxed" rows="3"/>

                      <div className="mb-5 bg-indigo-50/70 border border-indigo-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-indigo-700 text-xs font-black mb-2 uppercase tracking-wide">
                          <i className="fas fa-robot"></i> AI Official Solution / Explanation
                        </div>
                        <textarea 
                          value={q.explanation || ""} 
                          onChange={(e) => updateQuestionField(qIndex, 'explanation', e.target.value)} 
                          className="w-full bg-white border border-indigo-200 rounded-lg p-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 resize-y shadow-sm" 
                          rows="2" 
                          placeholder="Provide the official solution or let the AI explain..."
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

                      {q.type === 'NAT' ? (
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-inner">
                          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Numerical Answer</label>
                          <input 
                            type="text" 
                            value={q.correctAnswer || ''} 
                            onChange={(e) => updateQuestionField(qIndex, 'correctAnswer', e.target.value)}
                            className="w-full max-w-xs bg-white border-2 border-slate-300 rounded-lg p-3 text-xl font-black text-slate-900 outline-none focus:border-rose-500 shadow-sm"
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
              )}
            </div>
          </>
        )}

        {activeTab === "manage" && (
          <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
            <h1 className="text-2xl font-black text-slate-900 mb-8">Manage Official PYQs</h1>
            
            {isLoadingMocks ? (
              <div className="text-center p-10"><i className="fas fa-spinner fa-spin text-4xl text-rose-600"></i></div>
            ) : adminMocks.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm"><i className="fas fa-folder-open text-5xl text-slate-300 mb-4"></i><p className="text-slate-600 font-bold text-lg">No Official PYQs published yet.</p></div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-xs uppercase tracking-wider font-black border-b-2 border-slate-200">
                      <th className="p-4 pl-6">Mock Title</th>
                      <th className="p-4 text-center">Category</th>
                      <th className="p-4 text-center">Date Published</th>
                      <th className="p-4 text-right pr-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminMocks.map(mock => (
                      <tr key={mock.id} className="hover:bg-slate-50 transition">
                        <td className="p-4 pl-6 font-bold text-slate-900 text-sm">
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-black uppercase px-2.5 py-1 rounded mr-3 border border-rose-200 shadow-sm">Official</span>
                          {mock.title}
                          {mock.showInLiveFeed && <span className="ml-3 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase px-2.5 py-1 rounded border border-indigo-200"><i className="fas fa-satellite-dish mr-1"></i> Feed</span>}
                        </td>
                        <td className="p-4 text-center font-bold text-slate-700 text-sm">{mock.examCategory || "General"}</td>
                        <td className="p-4 text-center text-sm font-semibold text-slate-500">{mock.createdAtDate?.toLocaleDateString()}</td>
                        <td className="p-4 text-right pr-6">
                          <button onClick={() => handleDeleteMock(mock.id)} className="text-rose-600 hover:text-white hover:bg-rose-600 p-2.5 rounded-lg transition shadow-sm border border-transparent hover:border-rose-700" title="Delete PYQ"><i className="fas fa-trash-alt"></i></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}