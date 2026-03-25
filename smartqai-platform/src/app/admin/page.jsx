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
  
  // --- HYBRID MODULE STATE ---
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1);
  const [generateExplanations, setGenerateExplanations] = useState(false);
  
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedRoomId, setPublishedRoomId] = useState(null); 
  const [copied, setCopied] = useState(false);
  
  // --- PROFESSIONAL TOAST STATE ---
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  const [questions, setQuestions] = useState([]);
  const [examSections, setExamSections] = useState([]);
  const [examTitle, setExamTitle] = useState("GATE ECE 2023 - Official PYQ");
  const [duration, setDuration] = useState(180); 
  const [allowCalculator, setAllowCalculator] = useState(true);
  
  const [examCategory, setExamCategory] = useState("GATE ECE");
  const [showInLiveFeed, setShowInLiveFeed] = useState(false);

  const [adminMocks, setAdminMocks] = useState([]);
  const [isLoadingMocks, setIsLoadingMocks] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

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
      showToast("Error fetching admin mocks.", "error");
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
      showToast("Official PYQ Deleted.", "success");
      fetchAdminMocks(); 
    } catch (error) {
      showToast("Failed to delete mock.", "error");
    }
  };

  // --- 1. BULLETPROOF AI EXTRACTION ---
  const handleExtract = async (e) => {
    e.preventDefault();
    if (!file) return showToast("Please select a PDF first.", "warning");

    let sPage = parseInt(startPage) || 1;
    let ePage = parseInt(endPage) || sPage;
    if (sPage > ePage) { const temp = sPage; sPage = ePage; ePage = temp; }
    setStartPage(sPage); setEndPage(ePage);

    setIsProcessing(true);
    
    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("generateExplanations", generateExplanations);
    formData.append("startPage", sPage);
    formData.append("endPage", ePage);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Server crashed.");
      }
      
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        const enrichedQuestions = data.questions.map(q => ({
            ...q, marks: 2, negativeMarks: 0.66,
            correctAnswer: q.correctAnswer || q.correctOption || "",
            imageUrl: q.imageUrl && q.imageUrl.trim() !== "" ? q.imageUrl.trim() : null,
            explanationImage: null,
            options: (q.options || []).map(opt => ({
              ...opt, imageUrl: opt.imageUrl && opt.imageUrl.trim() !== "" ? opt.imageUrl.trim() : null
            }))
        }));
        
        setQuestions(prev => {
          const updated = [...prev, ...enrichedQuestions];
          setExamSections([{ name: examSections[0]?.name || "General", count: updated.length }]);
          return updated;
        });
        
        showToast(`Successfully added ${enrichedQuestions.length} questions from page ${sPage} to ${ePage}!`, "success");
      } else {
        showToast(`No questions found on pages ${sPage}-${ePage}.`, "warning");
      }
    } catch (error) {
      showToast(`AI Error: ${error.message}`, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 2. ADD CUSTOM BLANK QUESTION ---
  const handleAddCustomQuestion = () => {
    setQuestions(prev => {
      const updated = [...prev, {
        text: "", type: "MCQ", hasImage: false, imageUrl: null,
        options: [
          { id: "A", text: "", hasImage: false, imageUrl: null },
          { id: "B", text: "", hasImage: false, imageUrl: null },
          { id: "C", text: "", hasImage: false, imageUrl: null },
          { id: "D", text: "", hasImage: false, imageUrl: null }
        ],
        correctAnswer: "A", explanation: "", explanationImage: null, marks: 2, negativeMarks: 0.66
      }];
      setExamSections([{ name: examSections[0]?.name || "General", count: updated.length }]);
      showToast("Blank question added.", "success");
      return updated;
    });
  };

  const handleImageUpload = async (imageFile, qIndex, type = 'question', optIndex = null) => {
    if (!imageFile) return;
    const fileRef = ref(storage, `mocks/images/admin-${Date.now()}-${imageFile.name}`);
    try {
      const snapshot = await uploadBytes(fileRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const updated = [...questions];
      
      if (type === 'option' && optIndex !== null) {
        updated[qIndex].options[optIndex].imageUrl = downloadURL;
        updated[qIndex].options[optIndex].hasImage = true;
      } else if (type === 'explanation') {
        updated[qIndex].explanationImage = downloadURL;
      } else {
        updated[qIndex].imageUrl = downloadURL;
        updated[qIndex].hasImage = true;
      }
      setQuestions(updated);
      showToast("Image uploaded successfully!", "success");
    } catch (error) {
      showToast("Image upload failed.", "error");
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
      updated[qIndex].options = updated[qIndex].options?.length > 0 ? updated[qIndex].options : [
        { id: "A", text: "" }, { id: "B", text: "" }, { id: "C", text: "" }, { id: "D", text: "" }
      ];
      updated[qIndex].correctAnswer = typeof updated[qIndex].correctAnswer === 'string' ? updated[qIndex].correctAnswer : "A";
    }
    setQuestions(updated);
  };

  const toggleMsqAnswer = (qIndex, optId) => {
    const updated = [...questions];
    let currentAns = updated[qIndex].correctAnswer || [];
    if (!Array.isArray(currentAns)) currentAns = []; 
    if (currentAns.includes(optId)) updated[qIndex].correctAnswer = currentAns.filter(id => id !== optId);
    else updated[qIndex].correctAnswer = [...currentAns, optId];
    setQuestions(updated);
  };

  const updateQuestionField = (qIndex, field, value) => { const updated = [...questions]; updated[qIndex][field] = value; setQuestions(updated); };
  const updateOptionText = (qIndex, optIndex, newText) => { const updated = [...questions]; updated[qIndex].options[optIndex].text = newText; setQuestions(updated); }
  
  const removeQuestion = (index) => {
    setQuestions(prev => {
      const updated = prev.filter((_, i) => i !== index);
      setExamSections([{ name: examSections[0]?.name || "General", count: updated.length }]);
      return updated;
    });
    showToast("Question removed.", "warning");
  };

  const updateSection = (index, field, value) => { const newSecs = [...examSections]; newSecs[index][field] = value; setExamSections(newSecs); };
  const addSection = () => { setExamSections([...examSections, { name: `Section ${examSections.length + 1}`, count: 0 }]); };
  const removeSection = (index) => { setExamSections(examSections.filter((_, i) => i !== index)); };
  
  const handleCopyCode = () => { navigator.clipboard.writeText(publishedRoomId); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const totalSectionQuestions = examSections.reduce((acc, sec) => acc + (parseInt(sec.count) || 0), 0);
  const getSectionForIndex = (index) => {
    let passed = 0;
    for (const sec of examSections) { passed += (parseInt(sec.count) || 0); if (index < passed) return sec.name; }
    return "Unassigned";
  };

  const saveToDatabase = async () => {
    if (questions.length === 0) return showToast("No questions to save!", "warning");
    if (totalSectionQuestions !== questions.length) {
      return showToast(`Error: Sections assign ${totalSectionQuestions} Qs, but you have ${questions.length} total Qs.`, "error");
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
      let currentSecIdx = 0; let qAssignedToCurrentSec = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let assignedSection = "General";
        if (currentSecIdx < examSections.length) {
          assignedSection = examSections[currentSecIdx].name;
          qAssignedToCurrentSec++;
          if (qAssignedToCurrentSec >= parseInt(examSections[currentSecIdx].count)) { currentSecIdx++; qAssignedToCurrentSec = 0; }
        }

        await addDoc(questionsRef, {
           text: q.text, type: q.type || "MCQ", options: q.options || [], correctAnswer: q.correctAnswer,
           explanation: q.explanation || "", explanationImage: q.explanationImage || null, 
           imageUrl: q.imageUrl || null, hasImage: q.hasImage || false,
           marks: Number(q.marks) || 2, negativeMarks: Number(q.negativeMarks) || 0.66, section: assignedSection 
        });
      }

      setPublishedRoomId(mockRef.id);
    } catch (error) {
      showToast("Database Error. Failed to publish.", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  // --- LOGIN UI ---
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

  // --- MAIN ADMIN PORTAL ---
  return (
    <div className="flex h-screen bg-slate-50 font-sans relative selection:bg-rose-100 selection:text-rose-900">
      
      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-top-5 fade-in duration-300 backdrop-blur-md
          ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 
            toast.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : 
            'bg-amber-400/90 border-amber-300 text-slate-900'}
        `}>
          <i className={`text-xl fas ${toast.type === 'success' ? 'fa-check-circle' : toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}`}></i>
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2rem] shadow-2xl flex flex-col items-center max-w-sm w-full border border-slate-100 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-rose-400/20 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-rose-600 rounded-full border-t-transparent animate-spin"></div>
                <i className="fas fa-microchip absolute inset-0 flex items-center justify-center text-3xl text-rose-600 animate-pulse"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3 text-center tracking-tight">System Analyzing</h3>
              <p className="text-slate-500 text-center font-medium text-sm leading-relaxed">
                Extracting Official PYQ data from pages {startPage || 1} to {endPage || startPage || 1}...
              </p>
            </div>
          </div>
        </div>
      )}

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
                <span className="text-3xl font-mono font-black tracking-widest text-indigo-700 truncate">{publishedRoomId}</span>
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
                  setPublishedRoomId(null); setQuestions([]); setFile(null); setExamTitle(""); 
                  setExamSections([{ name: "General", count: 0 }]); setActiveTab("manage");
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

      <main className="flex-1 flex flex-col overflow-y-auto relative">
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

            <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto w-full relative z-0">
              
              {/* ADMIN EXAM SETTINGS */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase mb-2 block tracking-wide">Category</label>
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
                  <label className="text-xs font-bold text-slate-700 uppercase mb-2 block tracking-wide">Duration</label>
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

              {/* --- HYBRID QUESTION INJECTION MODULE --- */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-6">
                
                <div className="flex-1 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4"><i className="fas fa-robot text-rose-500 mr-2"></i> AI PYQ Extraction</h3>
                  <div className="flex items-center gap-3 mb-4">
                    <label className="flex-1 border border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition p-3 flex items-center justify-center text-center cursor-pointer">
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                      <i className="fas fa-file-pdf text-rose-500 text-xl mr-2"></i>
                      <span className="text-sm font-bold text-slate-700 truncate">{file ? file.name : "Select Official PYQ PDF"}</span>
                    </label>
                  </div>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 bg-slate-50 border border-slate-200 p-2 rounded-lg flex items-center justify-between">
                       <span className="text-xs font-bold text-slate-500 uppercase ml-2">Extract Pages</span>
                       <div className="flex items-center gap-2">
                         <input 
                           type="number" min="1" 
                           value={startPage === "" ? "" : startPage} 
                           onChange={e => {
                             const val = e.target.value === "" ? "" : parseInt(e.target.value);
                             setStartPage(val);
                             if (val !== "" && val > endPage) setEndPage(val);
                           }} 
                           onBlur={() => { if(startPage === "" || startPage < 1) setStartPage(1); }}
                           className="w-12 bg-white border border-slate-300 rounded p-1 text-center text-sm font-bold outline-none focus:border-rose-500"
                         />
                         <span className="text-slate-400 font-bold">-</span>
                         <input 
                           type="number" min={startPage || 1} 
                           value={endPage === "" ? "" : endPage} 
                           onChange={e => setEndPage(e.target.value === "" ? "" : parseInt(e.target.value))} 
                           onBlur={() => { if(endPage === "" || endPage < startPage) setEndPage(startPage || 1); }}
                           className="w-12 bg-white border border-slate-300 rounded p-1 text-center text-sm font-bold outline-none focus:border-rose-500"
                         />
                       </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4 px-2">
                     <label htmlFor="admin-ai-toggle" className="text-xs font-bold text-slate-600 cursor-pointer select-none">Generate AI Solutions</label>
                     <input type="checkbox" id="admin-ai-toggle" checked={generateExplanations} onChange={(e) => setGenerateExplanations(e.target.checked)} className="w-4 h-4 accent-rose-600 cursor-pointer" />
                  </div>

                  <button onClick={handleExtract} disabled={isProcessing || !file} className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl font-black hover:bg-rose-600 transition disabled:bg-slate-400 text-sm shadow-md flex justify-center items-center gap-2">
                    {isProcessing ? "Analyzing..." : "Extract & Append"} <i className="fas fa-magic"></i>
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                   <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-2xl mb-4"><i className="fas fa-pen-fancy"></i></div>
                   <h3 className="text-lg font-black text-slate-800 mb-2">Build from Scratch</h3>
                   <p className="text-sm text-slate-500 mb-6 font-medium">Manually insert questions, upload custom diagrams, and construct your own solutions.</p>
                   <button onClick={handleAddCustomQuestion} className="bg-indigo-50 text-indigo-700 border-2 border-indigo-200 px-6 py-3 rounded-xl font-black hover:bg-indigo-600 hover:text-white transition shadow-sm w-full">
                     <i className="fas fa-plus mr-2"></i> Add Blank Question
                   </button>
                </div>
              </div>

              {/* QUESTIONS LIST */}
              {questions.length > 0 && (
                <div className="space-y-6">
                  
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

                  {questions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm relative hover:border-rose-400 transition group">
                      <button onClick={() => removeQuestion(qIndex)} className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 transition bg-rose-50 p-2 rounded-lg opacity-0 group-hover:opacity-100"><i className="fas fa-trash text-lg"></i></button>

                      <div className="flex flex-wrap gap-4 mb-5 items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                        <span className="bg-slate-800 text-white text-xs font-black px-3 py-1.5 rounded">Q{qIndex + 1}</span>
                        <span className="bg-indigo-100 text-indigo-800 text-xs font-black px-4 py-1.5 rounded-full border border-indigo-200 shadow-sm truncate max-w-[150px]">{getSectionForIndex(qIndex)}</span>
                        <select value={q.type || "MCQ"} onChange={(e) => handleTypeChange(qIndex, e.target.value)} className="bg-white border border-slate-300 rounded-lg text-xs px-3 py-2 text-slate-900 font-bold outline-none shadow-sm ml-auto cursor-pointer focus:border-rose-500">
                            <option value="MCQ">MCQ</option>
                            <option value="MSQ">MSQ</option>
                            <option value="NAT">NAT</option>
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

                      <div className="mb-6">
                        {q.imageUrl && q.imageUrl.trim() !== "" ? (
                          <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-100 p-3 group/mainimg shadow-inner inline-block min-w-[200px]">
                            <img src={q.imageUrl} alt="Q" className="max-h-40 mx-auto object-contain" />
                            <label className="absolute inset-0 w-full h-full bg-slate-900/80 flex items-center justify-center opacity-0 group-hover/mainimg:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                              <span className="bg-white text-slate-900 text-sm font-bold px-5 py-2.5 rounded-xl shadow-xl"><i className="fas fa-upload mr-2"></i> Replace Image</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'question')} />
                            </label>
                          </div>
                        ) : (
                          <label className="mb-4 text-sm font-bold text-indigo-700 bg-indigo-50 px-5 py-2.5 rounded-xl inline-flex items-center gap-2 border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition shadow-sm">
                            <i className="fas fa-camera"></i> Attach Diagram to Question
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'question')} />
                          </label>
                        )}
                      </div>

                      {q.type === 'NAT' ? (
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-inner mb-6">
                          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Numerical Answer</label>
                          <input 
                            type="text" value={q.correctAnswer || ''} onChange={(e) => updateQuestionField(qIndex, 'correctAnswer', e.target.value)}
                            className="w-full max-w-xs bg-white border-2 border-slate-300 rounded-lg p-3 text-xl font-black text-slate-900 outline-none focus:border-rose-500 shadow-sm"
                            placeholder="e.g. 4.5"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
                          {q.options?.map((opt, optIndex) => {
                            const isCorrect = q.type === 'MSQ' ? (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id)) : q.correctAnswer === opt.id;
                            return (
                              <div key={optIndex} className={`flex items-start gap-4 p-4 rounded-xl border-2 transition shadow-sm bg-white ${isCorrect ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-300 hover:border-slate-400'}`}>
                                <input type={q.type === 'MSQ' ? "checkbox" : "radio"} name={q.type === 'MSQ' ? `q-${qIndex}-${optIndex}` : `q-${qIndex}-correct`} checked={isCorrect} onChange={() => q.type === 'MSQ' ? toggleMsqAnswer(qIndex, opt.id) : updateQuestionField(qIndex, 'correctAnswer', opt.id)} className={`mt-2.5 w-5 h-5 cursor-pointer shrink-0 accent-emerald-600 ${q.type === 'MSQ' ? 'rounded-sm' : ''}`} />
                                <div className="flex-1 relative">
                                  <input type="text" value={opt.text} onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none font-bold text-slate-900 focus:border-indigo-400 focus:bg-white transition shadow-inner" />
                                  <div className="mt-3">
                                    {opt.imageUrl && opt.imageUrl.trim() !== "" ? (
                                      <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-slate-100 mt-2 p-1.5 group/optimg shadow-inner">
                                        <img src={opt.imageUrl} alt="Opt" className="max-h-24 mx-auto object-contain" />
                                        <label className="absolute inset-0 w-full h-full bg-slate-900/80 text-white text-xs font-bold opacity-0 group-hover/optimg:opacity-100 flex items-center justify-center cursor-pointer backdrop-blur-sm transition">
                                          Upload New <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'option', optIndex)} />
                                        </label>
                                      </div>
                                    ) : (
                                       <label className="text-xs font-bold text-slate-600 cursor-pointer mt-1 inline-flex items-center gap-1.5 bg-white border border-slate-300 px-3 py-2 rounded-md hover:bg-slate-100 hover:text-indigo-700 transition shadow-sm">
                                         <i className="fas fa-image"></i> Add Image
                                         <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'option', optIndex)} />
                                       </label>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-indigo-700 text-xs font-black uppercase tracking-wide"><i className="fas fa-robot mr-1"></i> Official Solution / Explanation</span>
                          {(!q.explanationImage || q.explanationImage.trim() === "") && (
                            <label className="text-[10px] font-bold text-indigo-600 cursor-pointer inline-flex items-center gap-1 bg-white border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-100 transition shadow-sm">
                              <i className="fas fa-image"></i> Attach Solution Diagram
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'explanation')} />
                            </label>
                          )}
                        </div>
                        
                        <textarea 
                          value={q.explanation || ""} 
                          onChange={(e) => updateQuestionField(qIndex, 'explanation', e.target.value)} 
                          className="w-full bg-white border border-indigo-200 rounded-lg p-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 resize-y shadow-sm mb-3" 
                          rows="2" 
                          placeholder="Provide the official solution or let the AI explain..."
                        />

                        {q.explanationImage && q.explanationImage.trim() !== "" && (
                          <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-white p-2 group/expimg shadow-inner inline-block min-w-[200px]">
                            <img src={q.explanationImage} alt="Explanation" className="max-h-32 object-contain" />
                            <label className="absolute inset-0 w-full h-full bg-slate-900/80 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover/expimg:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                              Replace Image
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'explanation')} />
                            </label>
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "manage" && (
          <div className="p-6 md:p-8 max-w-5xl mx-auto w-full relative z-0">
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