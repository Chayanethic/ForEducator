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
  
  // --- Page Range Selection ---
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1); 
  
  const [generateExplanations, setGenerateExplanations] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedRoomId, setPublishedRoomId] = useState(null);
  const [copied, setCopied] = useState(false); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const [examSections, setExamSections] = useState([{ name: "General", count: 0 }]);
  const [examTitle, setExamTitle] = useState("Custom AI & Manual Mock");
  const [duration, setDuration] = useState(60); 
  const [allowCalculator, setAllowCalculator] = useState(true);
  const [availability, setAvailability] = useState("permanent"); 
  const [visibility, setVisibility] = useState("private"); 
  const [examCategory, setExamCategory] = useState("GATE ECE"); 

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  const handleExtract = async (e) => {
    e.preventDefault();
    if (!file) return showToast("Please select a PDF first.", "warning");

    let sPage = parseInt(startPage) || 1;
    let ePage = parseInt(endPage) || sPage;
    
    if (sPage > ePage) {
      const temp = sPage;
      sPage = ePage;
      ePage = temp;
    }
    
    setStartPage(sPage);
    setEndPage(ePage);

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
        throw new Error(errData.error || "Server crashed or invalid page range.");
      }
      
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        const enrichedQuestions = data.questions.map(q => ({
            ...q, 
            marks: 2, 
            negativeMarks: 0.66,
            correctAnswer: q.correctAnswer || q.correctOption || "",
            imageUrl: q.imageUrl && q.imageUrl.trim() !== "" ? q.imageUrl.trim() : null,
            explanationImage: null,
            options: (q.options || []).map(opt => ({
              ...opt,
              imageUrl: opt.imageUrl && opt.imageUrl.trim() !== "" ? opt.imageUrl.trim() : null
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
      showToast("Blank question added to the bottom.", "success");
      return updated;
    });
  };

  const handleImageUpload = async (imageFile, qIndex, type = 'question', optIndex = null) => {
    if (!imageFile) return;
    const fileRef = ref(storage, `mocks/images/${Date.now()}-${imageFile.name}`);
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
      showToast("Failed to upload image.", "error");
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

  const handleCopyCode = () => { navigator.clipboard.writeText(publishedRoomId); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const updateSection = (index, field, value) => { const newSecs = [...examSections]; newSecs[index][field] = value; setExamSections(newSecs); };
  const addSection = () => { setExamSections([...examSections, { name: `Section ${examSections.length + 1}`, count: 0 }]); };
  const removeSection = (index) => { setExamSections(examSections.filter((_, i) => i !== index)); };
  
  const totalSectionQuestions = examSections.reduce((acc, sec) => acc + (parseInt(sec.count) || 0), 0);

  const getSectionForIndex = (index) => {
    let passed = 0;
    for (const sec of examSections) { passed += (parseInt(sec.count) || 0); if (index < passed) return sec.name; }
    return "Unassigned";
  };

  const saveToDatabase = async () => {
    if (questions.length === 0) return showToast("No questions to save!", "warning");
    if (!isSignedIn) return showToast("Please log in first.", "error");
    if (totalSectionQuestions !== questions.length) return showToast(`Error: Sections assign ${totalSectionQuestions} Qs, but you have ${questions.length} total Qs.`, "error");

    setIsPublishing(true);

    try {
      const mockRef = await addDoc(collection(db, "mocks"), {
        educatorId: user.id, educatorName: user.fullName || "Educator", title: examTitle, duration: Number(duration),
        allowCalculator: allowCalculator, availability: availability, visibility: visibility, examCategory: examCategory,
        createdAt: new Date(), status: "published", 
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
      showToast("Failed to save mock.", "error"); 
    } finally {
      setIsPublishing(false); 
    }
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-circle-notch fa-spin text-5xl text-emerald-600"></i></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden">
      
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-bottom-5 fade-in duration-300 backdrop-blur-md
          ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 
            toast.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : 
            'bg-amber-400/90 border-amber-300 text-slate-900'}
        `}>
          <i className={`text-xl fas ${toast.type === 'success' ? 'fa-check-circle' : toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}`}></i>
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* --- AI PROCESSING SHIELD --- */}
      {isProcessing && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2rem] shadow-2xl flex flex-col items-center max-w-sm w-full border border-slate-100">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
              <i className="fas fa-robot absolute inset-0 flex items-center justify-center text-3xl text-emerald-600 animate-pulse"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 text-center tracking-tight">AI is Analyzing</h3>
            <p className="text-slate-500 text-center font-medium text-sm leading-relaxed">
              Extracting questions from pages {startPage || 1} to {endPage || startPage || 1}...
            </p>
          </div>
        </div>
      )}

      {/* --- NEW: PUBLISHING DATABASE SHIELD --- */}
      {isPublishing && !publishedRoomId && (
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2rem] shadow-2xl flex flex-col items-center max-w-sm w-full border border-slate-100 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                <i className="fas fa-cloud-upload-alt absolute inset-0 flex items-center justify-center text-3xl text-indigo-600 animate-pulse"></i>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-3 text-center tracking-tight">Deploying Exam...</h3>
              <p className="text-slate-500 text-center font-medium text-sm leading-relaxed">
                Saving questions and securing the live room. Please do not close this window.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- SUCCESS SCREEN --- */}
      {publishedRoomId && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
          <div className="bg-white p-8 md:p-10 rounded-[2rem] shadow-2xl text-center max-w-md w-full border border-slate-100 relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg"><i className="fas fa-check"></i></div>
              <h2 className="text-3xl font-black text-slate-900 mb-3">Exam is Live!</h2>
              <div className="bg-slate-50 p-4 rounded-2xl mb-8 border-2 border-slate-200"><span className="text-3xl font-mono font-black text-indigo-700">{publishedRoomId}</span></div>
              <div className="flex flex-col gap-4">
                <button onClick={() => window.location.reload()} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-700 transition">Create New</button>
                <button onClick={() => router.push(`/educator/live-rooms/${publishedRoomId}`)} className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-xl font-bold hover:from-indigo-700 transition">View Live Room</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isMobileMenuOpen && ( <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} /> )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <Link href="/onboarding?switch=true" className="text-2xl font-bold flex items-center gap-2 hover:text-emerald-400 transition cursor-pointer tracking-tight">
            <i className="fas fa-chalkboard-teacher text-emerald-400"></i> OZONE
          </Link>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><i className="fas fa-times text-xl"></i></button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button onClick={() => router.push('/educator/create-mock')} className="w-full flex items-center gap-3 bg-slate-800 text-white p-3 rounded-lg font-medium border-l-4 border-emerald-500 shadow-sm"><i className="fas fa-file-pdf w-5 text-emerald-400"></i> Exam Studio</button>
            <button onClick={() => router.push('/educator/live-rooms')} className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-lg transition font-medium"><i className="fas fa-door-open w-5"></i> Live Rooms</button>
            <button onClick={() => router.push('/educator/quiz-poll')} className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-lg transition font-medium"><i className="fas fa-bolt w-5"></i> Live Quiz Poll</button>
        </nav>
        
        {/* --- FIXED: Full User Profile & Switch Role added to mobile sidebar --- */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800 shadow-inner">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Educator"} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700" />
                <div className="text-sm font-medium truncate flex-1 text-slate-300">{user?.fullName || "Account"}</div>
            </div>
            <button onClick={() => router.push('/onboarding?switch=true')} className="w-full flex items-center justify-center gap-2 text-slate-400 hover:bg-slate-800 hover:text-white p-2.5 rounded-lg transition text-sm font-bold border border-transparent hover:border-slate-700 shadow-sm">
                <i className="fas fa-exchange-alt"></i> Switch Role
            </button>
            <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-600 hover:text-white p-2.5 rounded-lg transition text-sm font-bold border border-rose-900/50">
                <i className="fas fa-sign-out-alt"></i> Log Out
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto w-full">
        
        <header className="bg-white shadow-sm p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 sticky top-0">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button className="md:hidden text-slate-600 hover:text-emerald-600 transition" onClick={() => setIsMobileMenuOpen(true)}><i className="fas fa-bars text-2xl"></i></button>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-black text-slate-900">Mock Test Studio</h1>
              <input type="text" disabled={isPublishing} value={examTitle} onChange={(e) => setExamTitle(e.target.value)} className="text-sm font-bold text-emerald-600 bg-transparent border-b-2 border-slate-200 outline-none focus:border-emerald-500 mt-1 md:mt-2 pb-1 w-full max-w-[250px] md:max-w-xs disabled:opacity-50" placeholder="Enter Exam Title..." />
            </div>
          </div>
          <button onClick={saveToDatabase} disabled={questions.length === 0 || isPublishing || isProcessing} className={`w-full sm:w-auto px-6 py-3 md:py-2.5 rounded-xl font-bold shadow-sm transition flex items-center justify-center gap-2 ${questions.length > 0 && !isPublishing && !isProcessing ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
            {isPublishing ? "Deploying..." : "Publish Exam"} <i className="fas fa-arrow-right"></i>
          </button>
        </header>

        <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-5xl mx-auto w-full">
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-6">
            <div className="flex-1 border-b lg:border-b-0 lg:border-r border-slate-100 pb-6 lg:pb-0 lg:pr-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-4"><i className="fas fa-robot text-indigo-500 mr-2"></i> AI PDF Extraction</h3>
              <div className="flex items-center gap-3 mb-4">
                <label className={`flex-1 border-2 border-slate-300 rounded-xl bg-slate-50 transition p-3 flex items-center justify-center text-center shadow-sm ${isPublishing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'}`}>
                  <input type="file" accept="application/pdf" disabled={isPublishing} className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                  <i className="fas fa-file-pdf text-rose-500 text-xl mr-2"></i>
                  <span className="text-sm font-black text-slate-900 truncate">{file ? file.name : "Select PDF File"}</span>
                </label>
              </div>
              
              <div className="flex items-center gap-3 mb-5">
                <div className={`flex-1 bg-slate-50 border-2 border-slate-300 p-3 rounded-xl flex items-center justify-between shadow-sm ${isPublishing ? 'opacity-50' : ''}`}>
                   <span className="text-sm font-black text-slate-800 uppercase ml-2"><i className="fas fa-file-alt text-emerald-500 mr-2"></i> Extract Pages</span>
                   <div className="flex items-center gap-2">
                     <input 
                       type="number" min="1" disabled={isPublishing}
                       value={startPage === "" ? "" : startPage} 
                       onChange={e => {
                         const val = e.target.value === "" ? "" : parseInt(e.target.value);
                         setStartPage(val);
                         if (val !== "" && val > endPage) setEndPage(val);
                       }} 
                       onBlur={() => { if(startPage === "" || startPage < 1) setStartPage(1); }}
                       className="w-14 bg-white border-2 border-slate-300 rounded-lg p-2 text-center text-sm font-black text-slate-900 outline-none focus:border-emerald-500 shadow-inner disabled:bg-slate-100"
                     />
                     <span className="text-slate-500 font-black">-</span>
                     <input 
                       type="number" min={startPage || 1} disabled={isPublishing}
                       value={endPage === "" ? "" : endPage} 
                       onChange={e => setEndPage(e.target.value === "" ? "" : parseInt(e.target.value))} 
                       onBlur={() => { if(endPage === "" || endPage < startPage) setEndPage(startPage || 1); }}
                       className="w-14 bg-white border-2 border-slate-300 rounded-lg p-2 text-center text-sm font-black text-slate-900 outline-none focus:border-emerald-500 shadow-inner disabled:bg-slate-100"
                     />
                   </div>
                </div>
              </div>

              <div className={`flex items-center justify-between mb-5 px-3 bg-indigo-50 border border-indigo-100 p-3 rounded-xl shadow-sm ${isPublishing ? 'opacity-50' : ''}`}>
                 <label htmlFor="ai-toggle" className="text-sm font-black text-slate-800 cursor-pointer select-none">Generate AI Solutions</label>
                 <input type="checkbox" id="ai-toggle" disabled={isPublishing} checked={generateExplanations} onChange={(e) => setGenerateExplanations(e.target.checked)} className="w-5 h-5 accent-emerald-600 cursor-pointer disabled:cursor-not-allowed" />
              </div>

              <button onClick={handleExtract} disabled={isProcessing || isPublishing || !file} className="w-full bg-slate-900 text-white px-4 py-4 rounded-xl font-black hover:bg-indigo-600 transition disabled:bg-slate-400 disabled:cursor-not-allowed text-base shadow-lg flex justify-center items-center gap-2">
                {isProcessing ? "Analyzing..." : "Extract & Append"} <i className="fas fa-magic"></i>
              </button>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
               <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-3xl mb-4 border-2 border-emerald-100 shadow-sm"><i className="fas fa-pen-fancy"></i></div>
               <h3 className="text-xl font-black text-slate-900 mb-2">Build from Scratch</h3>
               <p className="text-sm text-slate-600 mb-6 font-bold max-w-xs">Manually insert questions, upload custom diagrams, and construct your own solutions.</p>
               <button onClick={handleAddCustomQuestion} disabled={isPublishing || isProcessing} className="bg-emerald-50 text-emerald-700 border-2 border-emerald-300 px-6 py-4 rounded-xl font-black hover:bg-emerald-600 hover:text-white transition shadow-sm w-full text-base disabled:opacity-50 disabled:cursor-not-allowed">
                 <i className="fas fa-plus mr-2"></i> Add Blank Question
               </button>
            </div>
          </div>

          {/* HIGH CONTRAST EXAM SETTINGS */}
          <div className={`bg-white p-6 rounded-2xl border-2 border-slate-200 shadow-md ${isPublishing ? 'opacity-50 pointer-events-none' : ''}`}>
             <h2 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-wide"><i className="fas fa-cog text-emerald-500 mr-2"></i> Exam Settings</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-xs font-black text-slate-800 mb-2 uppercase tracking-wider">Category</label>
                <select disabled={isPublishing} value={examCategory} onChange={(e) => setExamCategory(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition shadow-sm cursor-pointer disabled:bg-slate-100">
                  <option value="GATE ECE">GATE ECE</option>
                  <option value="GATE CS">GATE CS</option>
                  <option value="JEE Mains">JEE Mains</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-800 mb-2 uppercase tracking-wider">Visibility</label>
                <select disabled={isPublishing} value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition shadow-sm cursor-pointer disabled:bg-slate-100">
                  <option value="private">Private (Code)</option>
                  <option value="public">Public Feed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-800 mb-2 uppercase tracking-wider">Duration (Mins)</label>
                <input disabled={isPublishing} type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-300 rounded-xl p-3 text-sm font-black text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition shadow-inner disabled:bg-slate-100"/>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-800 mb-2 uppercase tracking-wider">Virtual Calc</label>
                <div onClick={() => !isPublishing && setAllowCalculator(!allowCalculator)} className={`flex items-center justify-between p-3 border-2 rounded-xl transition shadow-sm ${allowCalculator ? "bg-emerald-50 border-emerald-400" : "bg-slate-50 border-slate-300"} ${isPublishing ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <span className="text-sm font-black text-slate-900">{allowCalculator ? "Enabled" : "Disabled"}</span>
                  <div className={`w-10 h-5 rounded-full relative ${allowCalculator ? "bg-emerald-500" : "bg-slate-400"}`}><div className={`w-3 h-3 bg-white rounded-full absolute top-[4px] transition-transform ${allowCalculator ? "right-1" : "left-1"}`}></div></div>
                </div>
              </div>
            </div>
          </div>

          {questions.length > 0 && (
            <div className="space-y-4 md:space-y-6">
              <div className={`bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm ${isPublishing ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-100 pb-4 mb-4 gap-3">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider"><i className="fas fa-layer-group text-emerald-500 mr-2"></i> Section Architecture</h3>
                  <div className={`text-[10px] md:text-xs font-bold px-3 md:px-4 py-1.5 md:py-2 rounded-full border ${totalSectionQuestions === questions.length ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'}`}>
                    Assigned: {totalSectionQuestions} / {questions.length} Total
                  </div>
                </div>
                <div className="space-y-3">
                  {examSections.map((sec, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">{i+1}</div>
                      <input type="text" disabled={isPublishing} value={sec.name} onChange={(e) => updateSection(i, 'name', e.target.value)} placeholder="Section Name" className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 shadow-sm min-w-[120px] disabled:bg-slate-100"/>
                      <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-1.5 pr-3 shadow-sm">
                        <input type="number" disabled={isPublishing} value={sec.count} onChange={(e) => updateSection(i, 'count', parseInt(e.target.value) || 0)} className="w-12 bg-transparent p-1 text-center text-sm font-black text-emerald-700 outline-none disabled:text-slate-400"/>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Qs</span>
                      </div>
                      {examSections.length > 1 && (
                        <button onClick={() => removeSection(i)} disabled={isPublishing} className="w-8 h-8 text-rose-500 hover:bg-rose-100 rounded-full transition shrink-0 disabled:opacity-50"><i className="fas fa-times"></i></button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={addSection} disabled={isPublishing} className="mt-4 text-xs font-bold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition shadow-sm w-full sm:w-auto disabled:opacity-50"><i className="fas fa-plus mr-1"></i> Add Section</button>
              </div>

              {questions.map((q, qIndex) => (
                <div key={qIndex} className={`bg-white border-2 border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm relative transition group ${isPublishing ? 'opacity-70 pointer-events-none' : 'hover:border-emerald-400'}`}>
                  <button onClick={() => removeQuestion(qIndex)} disabled={isPublishing} className="absolute top-3 right-3 text-rose-400 hover:text-rose-600 transition bg-rose-50 p-2 rounded-lg"><i className="fas fa-trash"></i></button>

                  <div className="flex flex-wrap gap-2 md:gap-4 mb-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-200 pr-12">
                    <span className="bg-slate-800 text-white text-xs font-black px-3 py-1.5 rounded">Q{qIndex + 1}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1.5 rounded-full border border-emerald-200 shadow-sm truncate max-w-[100px]">{getSectionForIndex(qIndex)}</span>
                    <select value={q.type || "MCQ"} onChange={(e) => handleTypeChange(qIndex, e.target.value)} disabled={isPublishing} className="bg-white border border-slate-300 rounded-lg text-xs px-3 py-2 text-slate-900 font-bold outline-none shadow-sm cursor-pointer focus:border-indigo-500 disabled:bg-slate-100">
                        <option value="MCQ">MCQ</option>
                        <option value="MSQ">MSQ</option>
                        <option value="NAT">NAT</option>
                    </select>
                    
                    <div className="flex items-center gap-2 border-l-2 border-slate-200 pl-4">
                      <span className="text-xs font-bold text-emerald-700">+ Mark:</span>
                      <input type="number" step="0.5" disabled={isPublishing} value={q.marks} onChange={(e) => updateQuestionField(qIndex, 'marks', e.target.value)} className="w-14 bg-white border border-emerald-300 rounded text-xs px-2 py-1 text-emerald-900 font-black outline-none shadow-sm disabled:bg-slate-100"/>
                    </div>
                    <div className="flex items-center gap-2 border-l-2 border-slate-200 pl-4">
                      <span className="text-xs font-bold text-rose-700">- Mark:</span>
                      <input type="number" step="0.1" disabled={isPublishing} value={q.negativeMarks} onChange={(e) => updateQuestionField(qIndex, 'negativeMarks', e.target.value)} className="w-14 bg-white border border-rose-300 rounded text-xs px-2 py-1 text-rose-900 font-black outline-none shadow-sm disabled:bg-slate-100"/>
                    </div>
                  </div>

                  <textarea disabled={isPublishing} value={q.text} onChange={(e) => updateQuestionField(qIndex, 'text', e.target.value)} placeholder="Type question text here..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 mb-3 focus:ring-2 focus:ring-emerald-500 outline-none resize-y font-bold shadow-inner disabled:bg-slate-100" rows="3"/>
                  <div className="mb-6">
                    {q.imageUrl ? (
                      <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-100 p-2 group/mainimg shadow-inner inline-block min-w-[200px]">
                        <img src={q.imageUrl} alt="Q" className="max-h-32 mx-auto object-contain" />
                        <label className={`absolute inset-0 w-full h-full bg-slate-900/80 flex items-center justify-center opacity-0 group-hover/mainimg:opacity-100 transition-opacity backdrop-blur-sm ${isPublishing ? 'cursor-not-allowed' : 'cursor-pointer'}`}><span className="bg-white text-slate-900 text-xs font-bold px-4 py-2 rounded-xl shadow-xl"><i className="fas fa-upload mr-2"></i> Replace Image</span><input type="file" accept="image/*" disabled={isPublishing} className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'question')} /></label>
                      </div>
                    ) : (
                      <label className={`text-xs font-bold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg inline-flex items-center gap-2 border border-indigo-200 transition shadow-sm ${isPublishing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-100'}`}><i className="fas fa-camera"></i> Attach Diagram<input type="file" accept="image/*" disabled={isPublishing} className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'question')} /></label>
                    )}
                  </div>

                  {q.type === 'NAT' ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner mb-6">
                      <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Numerical Answer</label>
                      <input disabled={isPublishing} type="text" value={q.correctAnswer || ''} onChange={(e) => updateQuestionField(qIndex, 'correctAnswer', e.target.value)} className="w-full sm:max-w-xs bg-white border-2 border-slate-300 rounded-lg p-3 text-lg font-black text-slate-900 outline-none focus:border-emerald-500 shadow-sm disabled:bg-slate-100" placeholder="e.g. 4.5" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      {q.options?.map((opt, optIndex) => {
                        const isCorrect = q.type === 'MSQ' ? (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id)) : q.correctAnswer === opt.id;
                        return (
                          <div key={optIndex} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition shadow-sm bg-white ${isCorrect ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-300'}`}>
                            <input disabled={isPublishing} type={q.type === 'MSQ' ? "checkbox" : "radio"} name={q.type === 'MSQ' ? `q-${qIndex}-${optIndex}` : `q-${qIndex}-correct`} checked={isCorrect} onChange={() => q.type === 'MSQ' ? toggleMsqAnswer(qIndex, opt.id) : updateQuestionField(qIndex, 'correctAnswer', opt.id)} className={`mt-2 w-5 h-5 accent-emerald-600 ${isPublishing ? 'cursor-not-allowed' : 'cursor-pointer'}`} />
                            <div className="flex-1 relative">
                              <input disabled={isPublishing} type="text" value={opt.text} onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)} placeholder={`Option ${opt.id}`} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs outline-none font-bold text-slate-900 focus:border-indigo-400 focus:bg-white disabled:bg-slate-100" />
                              <div className="mt-2">
                                {opt.imageUrl ? (
                                  <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-slate-100 p-1 group/optimg">
                                    <img src={opt.imageUrl} alt="Opt" className="max-h-16 mx-auto object-contain" />
                                    <label className={`absolute inset-0 w-full h-full bg-slate-900/80 text-white text-[10px] font-bold opacity-0 group-hover/optimg:opacity-100 flex items-center justify-center backdrop-blur-sm ${isPublishing ? 'cursor-not-allowed' : 'cursor-pointer'}`}>Upload<input type="file" disabled={isPublishing} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'option', optIndex)} /></label>
                                  </div>
                                ) : (<label className={`text-[10px] font-bold text-slate-600 inline-flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded transition ${isPublishing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100'}`}><i className="fas fa-image"></i> Add Image<input disabled={isPublishing} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'option', optIndex)} /></label>)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-indigo-700 text-xs font-black uppercase tracking-wide"><i className="fas fa-robot mr-1"></i> Solution / Explanation</span>
                      {(!q.explanationImage || q.explanationImage.trim() === "") && (
                        <label className={`text-[10px] font-bold text-indigo-600 inline-flex items-center gap-1 bg-white border border-indigo-200 px-2 py-1 rounded transition shadow-sm ${isPublishing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-100'}`}>
                          <i className="fas fa-image"></i> Attach Solution Diagram
                          <input disabled={isPublishing} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'explanation')} />
                        </label>
                      )}
                    </div>
                    
                    <textarea disabled={isPublishing} value={q.explanation || ""} onChange={(e) => updateQuestionField(qIndex, 'explanation', e.target.value)} className="w-full bg-white border border-indigo-200 rounded-lg p-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-400 resize-y shadow-sm mb-3 disabled:bg-slate-50" rows="2" placeholder="Type explanation here..."/>
                    
                    {q.explanationImage && q.explanationImage.trim() !== "" && (
                      <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-white p-2 group/expimg shadow-inner inline-block min-w-[200px]">
                        <img src={q.explanationImage} alt="Explanation" className="max-h-32 object-contain" />
                        <label className={`absolute inset-0 w-full h-full bg-slate-900/80 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover/expimg:opacity-100 transition-opacity backdrop-blur-sm ${isPublishing ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                          Replace Image
                          <input disabled={isPublishing} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'explanation')} />
                        </label>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
}