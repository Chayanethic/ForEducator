"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { collection, addDoc, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

import EducatorTour from "@/components/EducatorTour";

// --- EXTREME COMPRESSION ENGINE ---
// Optimized for maximum speed: Drops massive 5MB screenshots to ~40KB in milliseconds
const compressImage = async (imageFile, maxWidth = 800, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(imageFile);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Canvas to Blob failed"));
            const safeName = (imageFile.name || `pasted-${Date.now()}`).replace(/\.[^/.]+$/, "");
            const compressedFile = new File([blob], `${safeName}.jpeg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export default function CreateMockPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState([]);
  
  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1); 
  
  const [generateExplanations, setGenerateExplanations] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedRoomId, setPublishedRoomId] = useState(null);
  const [copied, setCopied] = useState(false); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [recentRooms, setRecentRooms] = useState([]);
  const [listeningField, setListeningField] = useState(null);

  // --- Global Uploading State to block the Publish button ---
  const [uploadingCount, setUploadingCount] = useState(0);

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

  useEffect(() => {
    const fetchRecentRooms = async () => {
      if (!user) return;
      try {
        const qRef = query(collection(db, "mocks"), where("educatorId", "==", user.id), orderBy("createdAt", "desc"), limit(3));
        const snap = await getDocs(qRef);
        setRecentRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching recent rooms:", error);
      }
    };
    if (isLoaded && isSignedIn) fetchRecentRooms();
  }, [user, isLoaded, isSignedIn]);

  const toggleDictation = async (qIndex, field, optIndex = null) => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      return showToast("Microphone access denied! Please click the lock icon in your URL bar to allow the mic.", "error");
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return showToast("Voice typing requires Chrome or Edge.", "error");

    const fieldId = optIndex !== null ? `q-${qIndex}-opt-${optIndex}` : `q-${qIndex}-${field}`;

    if (listeningField === fieldId) {
      setListeningField(null);
      if (window.recognitionInstance) window.recognitionInstance.stop();
      return;
    }

    if (window.recognitionInstance) window.recognitionInstance.stop();

    const recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.interimResults = false;
    recognition.lang = 'en-IN'; 

    recognition.onstart = () => {
      setListeningField(fieldId);
      showToast("🎤 Listening... Speak clearly now.", "success");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuestions(prev => {
        const updated = [...prev];
        if (optIndex !== null) {
          const currentText = updated[qIndex].options[optIndex].text || "";
          updated[qIndex].options[optIndex].text = currentText ? `${currentText} ${transcript}` : transcript;
        } else {
          const currentText = updated[qIndex][field] || "";
          updated[qIndex][field] = currentText ? `${currentText} ${transcript}` : transcript;
        }
        return updated;
      });
    };

    recognition.onerror = (event) => {
      setListeningField(null);
      if (event.error === 'not-allowed' || event.error === 'audio-capture') {
        showToast("Browser could not capture audio.", "error");
      }
    };

    recognition.onend = () => setListeningField(null);
    window.recognitionInstance = recognition;
    recognition.start();
  };

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
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.error || "Server crashed or invalid page range."); }
      
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        const enrichedQuestions = data.questions.map(q => ({
            ...q, marks: 2, negativeMarks: 0.66,
            correctAnswer: q.correctAnswer || q.correctOption || "",
            imageUrl: q.imageUrl && q.imageUrl.trim() !== "" ? q.imageUrl.trim() : null, explanationImage: null,
            options: (q.options || []).map(opt => ({ ...opt, imageUrl: opt.imageUrl && opt.imageUrl.trim() !== "" ? opt.imageUrl.trim() : null }))
        }));
        setQuestions(prev => {
          const updated = [...prev, ...enrichedQuestions];
          setExamSections([{ name: examSections[0]?.name || "General", count: updated.length }]);
          return updated;
        });
        showToast(`Successfully added ${enrichedQuestions.length} questions from page ${sPage} to ${ePage}!`, "success");
      } else { showToast(`No questions found on pages ${sPage}-${ePage}.`, "warning"); }
    } catch (error) { showToast(`AI Error: ${error.message}`, "error"); } finally { setIsProcessing(false); }
  };

  const handleAddCustomQuestion = () => {
    setQuestions(prev => {
      const updated = [...prev, {
        text: "", type: "MCQ", hasImage: false, imageUrl: null,
        options: [{ id: "A", text: "", hasImage: false, imageUrl: null }, { id: "B", text: "", hasImage: false, imageUrl: null }, { id: "C", text: "", hasImage: false, imageUrl: null }, { id: "D", text: "", hasImage: false, imageUrl: null }],
        correctAnswer: "A", explanation: "", explanationImage: null, marks: 2, negativeMarks: 0.66
      }];
      setExamSections([{ name: examSections[0]?.name || "General", count: updated.length }]);
      showToast("Blank question added to the bottom.", "success"); return updated;
    });
  };

  // --- HIGH SPEED UPLOAD HANDLER ---
  const handleImageUpload = async (imageFile, qIndex, type = 'question', optIndex = null) => {
    if (!imageFile) return;

    setUploadingCount(prev => prev + 1); // Lock Publish button

    // 1. Instant local preview
    const localUrl = URL.createObjectURL(imageFile);
    const uniqueId = Date.now().toString(); // Track this exact upload instance
    
    setQuestions(prev => {
      const updated = [...prev];
      if (type === 'option' && optIndex !== null) {
        updated[qIndex].options[optIndex].imageUrl = localUrl;
        updated[qIndex].options[optIndex].isUploading = true;
        updated[qIndex].options[optIndex].uploadId = uniqueId;
      } else if (type === 'explanation') {
        updated[qIndex].explanationImage = localUrl;
        updated[qIndex].isUploadingExp = true;
        updated[qIndex].expUploadId = uniqueId;
      } else {
        updated[qIndex].imageUrl = localUrl;
        updated[qIndex].isUploadingQ = true;
        updated[qIndex].qUploadId = uniqueId;
      }
      return updated;
    });

    try {
      // 2. Ultra-fast compression
      const compressedFile = await compressImage(imageFile);
      const fileRef = ref(storage, `mocks/images/${Date.now()}-${compressedFile.name}`);

      // 3. Fast Upload (This is where it will fail safely if Firebase Storage is not activated)
      const snapshot = await uploadBytes(fileRef, compressedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // 4. Update UI with final URL (Only if user didn't cancel it)
      setQuestions(prev => {
        const updated = [...prev];
        if (type === 'option' && optIndex !== null) {
          if (updated[qIndex].options[optIndex].uploadId === uniqueId) {
            updated[qIndex].options[optIndex].imageUrl = downloadURL;
            updated[qIndex].options[optIndex].hasImage = true;
            updated[qIndex].options[optIndex].isUploading = false;
          }
        } else if (type === 'explanation') {
          if (updated[qIndex].expUploadId === uniqueId) {
            updated[qIndex].explanationImage = downloadURL;
            updated[qIndex].isUploadingExp = false;
          }
        } else {
          if (updated[qIndex].qUploadId === uniqueId) {
            updated[qIndex].imageUrl = downloadURL;
            updated[qIndex].hasImage = true;
            updated[qIndex].isUploadingQ = false;
          }
        }
        return updated;
      });
      showToast("Image uploaded quickly!", "success");
    } catch (error) {
      console.error(error);
      showToast("Storage not enabled. Image reverted.", "error");
      removeImage(qIndex, type, optIndex); // Remove broken image automatically
    } finally {
      setUploadingCount(prev => prev > 0 ? prev - 1 : 0); // Unlock Publish Button
    }
  };

  // --- CANCEL / REMOVE IMAGE HANDLER ---
  const removeImage = (qIndex, type = 'question', optIndex = null) => {
    setQuestions(prev => {
      const updated = [...prev];
      if (type === 'option' && optIndex !== null) {
        updated[qIndex].options[optIndex].imageUrl = null;
        updated[qIndex].options[optIndex].isUploading = false;
        updated[qIndex].options[optIndex].uploadId = null;
        updated[qIndex].options[optIndex].hasImage = false;
      } else if (type === 'explanation') {
        updated[qIndex].explanationImage = null;
        updated[qIndex].isUploadingExp = false;
        updated[qIndex].expUploadId = null;
      } else {
        updated[qIndex].imageUrl = null;
        updated[qIndex].isUploadingQ = false;
        updated[qIndex].qUploadId = null;
        updated[qIndex].hasImage = false;
      }
      return updated;
    });
  };

  const handlePaste = (e, qIndex, type = 'question', optIndex = null) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault(); 
        const blob = items[i].getAsFile();
        handleImageUpload(blob, qIndex, type, optIndex);
        break; 
      }
    }
  };

  const handleTypeChange = (qIndex, newType) => {
    const updated = [...questions]; 
    updated[qIndex].type = newType;
    
    if (newType === 'NAT') { 
      updated[qIndex].options = []; 
      updated[qIndex].correctAnswer = ""; 
    } else { 
      updated[qIndex].options = updated[qIndex].options?.length > 0 ? updated[qIndex].options : [
        { id: "A", text: "" }, { id: "B", text: "" }, { id: "C", text: "" }, { id: "D", text: "" }
      ]; 
      if (newType === 'MSQ') {
        updated[qIndex].correctAnswer = Array.isArray(updated[qIndex].correctAnswer) ? updated[qIndex].correctAnswer : [];
      } else {
        updated[qIndex].correctAnswer = (typeof updated[qIndex].correctAnswer === 'string' && updated[qIndex].correctAnswer !== "") ? updated[qIndex].correctAnswer : "A"; 
      }
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
  const updateOptionText = (qIndex, optIndex, newText) => { const updated = [...questions]; updated[qIndex].options[optIndex].text = newText; setQuestions(updated); };
  
  const requestRemoveQuestion = (index) => {
    setConfirmDialog({
      title: "Delete Question?", message: "Are you sure you want to remove this question? This action cannot be undone.",
      onConfirm: () => { setQuestions(prev => { const updated = prev.filter((_, i) => i !== index); setExamSections([{ name: examSections[0]?.name || "General", count: updated.length }]); return updated; }); showToast("Question removed.", "warning"); }
    });
  };

  const updateSection = (index, field, value) => { const newSecs = [...examSections]; newSecs[index][field] = value; setExamSections(newSecs); };
  const addSection = () => { setExamSections([...examSections, { name: `Section ${examSections.length + 1}`, count: 0 }]); };
  const removeSection = (index) => { setExamSections(examSections.filter((_, i) => i !== index)); };
  const totalSectionQuestions = examSections.reduce((acc, sec) => acc + (parseInt(sec.count) || 0), 0);
  const getSectionForIndex = (index) => { let passed = 0; for (const sec of examSections) { passed += (parseInt(sec.count) || 0); if (index < passed) return sec.name; } return "Unassigned"; };

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
        if (currentSecIdx < examSections.length) { assignedSection = examSections[currentSecIdx].name; qAssignedToCurrentSec++; if (qAssignedToCurrentSec >= parseInt(examSections[currentSecIdx].count)) { currentSecIdx++; qAssignedToCurrentSec = 0; } }
        await addDoc(questionsRef, { text: q.text, type: q.type || "MCQ", options: q.options || [], correctAnswer: q.correctAnswer, explanation: q.explanation || "", explanationImage: q.explanationImage || null, imageUrl: q.imageUrl || null, hasImage: q.hasImage || false, marks: Number(q.marks) || 2, negativeMarks: Number(q.negativeMarks) || 0.66, section: assignedSection });
      }
      setPublishedRoomId(mockRef.id);
    } catch (error) { showToast("Failed to save mock.", "error"); } finally { setIsPublishing(false); }
  };

  if (!isLoaded) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 flex-col animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 text-indigo-50 rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-xl shadow-indigo-900/30 border border-indigo-400/30 transform -rotate-3 animate-pulse">
        <i className="fas fa-book-open-reader"></i>
      </div>
      <h2 className="text-xl font-black text-slate-900 tracking-tight animate-pulse">Loading Workspace...</h2>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden">
      
      <EducatorTour userId={user?.id} />

      {toast.show && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-2xl z-[200] flex items-center gap-3 animate-in slide-in-from-bottom-5 text-sm font-bold text-white 
          ${toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-rose-600' : 'bg-amber-500 text-slate-900'}`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}`}></i>
          {toast.message}
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
              <h3 className="text-lg font-black text-slate-800 mb-2">{confirmDialog.title}</h3>
              <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex gap-3 justify-end">
                 <button onClick={() => setConfirmDialog(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                 <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition shadow-md">Confirm</button>
              </div>
           </div>
        </div>
      )}

      {isProcessing && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2rem] shadow-2xl flex flex-col items-center max-w-sm w-full border border-slate-100">
            <div className="relative w-24 h-24 mb-6">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
              <i className="fas fa-robot absolute inset-0 flex items-center justify-center text-3xl text-emerald-600 animate-pulse"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3 text-center tracking-tight">AI is Analyzing</h3>
            <p className="text-slate-500 text-center font-medium text-sm leading-relaxed">Extracting questions from pages {startPage || 1} to {endPage || startPage || 1}...</p>
          </div>
        </div>
      )}

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
              <p className="text-slate-500 text-center font-medium text-sm leading-relaxed">Saving questions and securing the live room.</p>
            </div>
          </div>
        </div>
      )}

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

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-950 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-indigo-900">
          <Link href="/onboarding?switch=true" className="text-xl font-black flex items-center gap-2 hover:text-emerald-400 transition cursor-pointer tracking-tight">
            <i className="fas fa-book-open-reader text-emerald-400"></i> OZONE
          </Link>
          <button className="md:hidden text-indigo-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><i className="fas fa-times text-lg"></i></button>
        </div>
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button onClick={() => router.push('/educator/create-mock')} className="w-full flex items-center gap-3 bg-indigo-800 text-white p-2.5 rounded-xl text-sm font-bold border-l-4 border-emerald-400 shadow-inner">
                <i className="fas fa-file-pdf w-4 text-emerald-400"></i> Exam Studio
            </button>
            <button id="tour-sidebar-live-rooms" onClick={() => router.push('/educator/live-rooms')} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-door-open w-4"></i> Live Rooms
            </button>
            <button id="tour-sidebar-quiz-poll" onClick={() => router.push('/educator/quiz-poll')} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-bolt w-4"></i> Live Quiz Poll
            </button>
        </nav>
        
        <div className="p-3 border-t border-indigo-900 bg-indigo-900/30 space-y-1.5">
            <div className="flex items-center gap-2.5 p-2.5 bg-indigo-950/50 rounded-xl border border-indigo-800/50 shadow-inner">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Educator"} alt="Avatar" className="w-7 h-7 rounded-full border border-indigo-700" />
                <div className="text-xs font-bold truncate flex-1 text-indigo-100">{user?.fullName || "Account"}</div>
            </div>
            <button onClick={() => router.push('/onboarding?switch=true')} className="w-full flex items-center justify-center gap-2 text-indigo-300 hover:bg-indigo-800 hover:text-white p-2 rounded-xl transition text-xs font-bold border border-transparent hover:border-indigo-700 shadow-sm">
                <i className="fas fa-exchange-alt"></i> Switch Role
            </button>
            <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-600 hover:text-white p-2 rounded-xl transition text-xs font-bold border border-rose-900/50 hover:border-rose-500 bg-rose-950/20 shadow-sm">
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
          
          <button 
            id="tour-publish" 
            onClick={saveToDatabase} 
            disabled={questions.length === 0 || isPublishing || isProcessing || uploadingCount > 0} 
            className={`w-full sm:w-auto px-6 py-3 md:py-2.5 rounded-xl font-bold shadow-sm transition flex items-center justify-center gap-2 ${questions.length > 0 && !isPublishing && !isProcessing && uploadingCount === 0 ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/20 hover:-translate-y-0.5' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
          >
            {uploadingCount > 0 ? (
              <><i className="fas fa-spinner fa-spin"></i> Uploading Images...</>
            ) : isPublishing ? (
              "Deploying..."
            ) : (
              <>"Publish Exam" <i className="fas fa-arrow-right"></i></>
            )}
          </button>
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 mt-4">
            
            <div className="lg:col-span-8 space-y-5 lg:space-y-6">
              
              <div id="tour-pdf-extract" className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide mb-3"><i className="fas fa-robot text-indigo-500 mr-2"></i> AI PDF Extraction</h3>
                
                <label className={`w-full border border-dashed border-indigo-300 rounded-xl bg-indigo-50/50 p-4 mb-4 flex items-center gap-4 transition-all ${isPublishing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-50 hover:border-indigo-400 cursor-pointer'}`}>
                  <input type="file" accept="application/pdf" disabled={isPublishing} className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                  <div className="w-12 h-12 bg-white shadow-sm text-rose-500 rounded-xl flex items-center justify-center text-2xl shrink-0"><i className="fas fa-file-pdf"></i></div>
                  <div className="flex-1 overflow-hidden">
                    <span className="text-sm font-black text-slate-900 block truncate">{file ? file.name : "Select Exam Document"}</span>
                    <span className="text-[10px] font-bold text-slate-500 mt-0.5 block">Supports standard text-based PDFs</span>
                  </div>
                  {!file && <div className="hidden sm:flex bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black text-slate-600 shadow-sm shrink-0">Browse</div>}
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                   <div id="tour-page-range" className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl shadow-inner flex flex-col justify-center">
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2"><i className="fas fa-file-alt text-indigo-500 mr-1"></i> Target Pages</div>
                     <div className="flex items-center gap-2">
                       <input type="number" min="1" disabled={isPublishing} value={startPage === "" ? "" : startPage} onChange={e => { const val = e.target.value === "" ? "" : parseInt(e.target.value); setStartPage(val); if (val !== "" && val > endPage) setEndPage(val); }} onBlur={() => { if(startPage === "" || startPage < 1) setStartPage(1); }} className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-center text-xs font-black text-slate-900 outline-none focus:border-indigo-500 shadow-sm disabled:bg-slate-100"/>
                       <span className="text-slate-400 font-black text-xs">to</span>
                       <input type="number" min={startPage || 1} disabled={isPublishing} value={endPage === "" ? "" : endPage} onChange={e => setEndPage(e.target.value === "" ? "" : parseInt(e.target.value))} onBlur={() => { if(endPage === "" || endPage < startPage) setEndPage(startPage || 1); }} className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-center text-xs font-black text-slate-900 outline-none focus:border-indigo-500 shadow-sm disabled:bg-slate-100"/>
                     </div>
                   </div>

                   <div id="tour-ai-solutions" className={`border ${generateExplanations ? 'bg-indigo-50/80 border-indigo-200' : 'bg-slate-50 border-slate-200'} p-3.5 rounded-xl shadow-sm flex flex-col justify-center transition-colors`}>
                      <div className="flex items-center justify-between h-full">
                         <div>
                           <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5"><i className="fas fa-brain mr-1"></i> AI Engine</div>
                           <div className="text-xs font-black text-slate-800">Generate Solutions</div>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" disabled={isPublishing} checked={generateExplanations} onChange={(e) => setGenerateExplanations(e.target.checked)} className="sr-only peer" />
                          <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                   </div>
                </div>

                <button onClick={handleExtract} disabled={isProcessing || isPublishing || !file} className="w-full bg-slate-900 text-white px-4 py-3 rounded-xl font-black hover:bg-indigo-600 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed text-sm shadow-sm flex justify-center items-center gap-2">
                  {isProcessing ? "Analyzing Document..." : "Extract Questions"} <i className="fas fa-magic"></i>
                </button>
              </div>

              <div id="tour-manual-build" className="bg-white p-6 rounded-2xl shadow-sm border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all flex flex-col sm:flex-row justify-between items-center gap-6 group relative overflow-hidden">
                 <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-200/50 transition-colors"></div>
                 <div className="relative z-10 flex items-start gap-4">
                   <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-xl shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all shadow-sm"><i className="fas fa-pen-nib"></i></div>
                   <div>
                     <h3 className="text-base font-black text-slate-900 mb-1">Build from Scratch</h3>
                     <p className="text-xs font-medium text-slate-500 max-w-sm">Manually create custom questions, upload diagrams, and write detailed solutions.</p>
                   </div>
                 </div>
                 <button onClick={handleAddCustomQuestion} disabled={isPublishing || isProcessing} className="relative z-10 bg-emerald-500 text-white px-6 py-3 rounded-xl font-black hover:bg-emerald-600 hover:-translate-y-0.5 transition-all shrink-0 text-sm shadow-lg shadow-emerald-500/30 disabled:opacity-50 disabled:translate-y-0 disabled:cursor-not-allowed flex items-center gap-2 overflow-hidden before:absolute before:inset-0 before:bg-white/20 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500">
                   <i className="fas fa-plus"></i> Add Blank Question
                 </button>
              </div>

              <div id="tour-exam-settings" className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm ${isPublishing ? 'opacity-50 pointer-events-none' : ''}`}>
                 <h2 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wide"><i className="fas fa-cog text-slate-400 mr-2"></i> Exam Configuration</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Category</label>
                    <select disabled={isPublishing} value={examCategory} onChange={(e) => setExamCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition shadow-sm cursor-pointer disabled:bg-slate-100">
                      <option value="GATE ECE">GATE ECE</option>
                      <option value="GATE CS">GATE CS</option>
                      <option value="JEE Mains">JEE Mains</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Visibility</label>
                    <select disabled={isPublishing} value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition shadow-sm cursor-pointer disabled:bg-slate-100">
                      <option value="private">Private (Code)</option>
                      <option value="public">Public Feed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Duration (Mins)</label>
                    <input disabled={isPublishing} type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition shadow-inner disabled:bg-slate-100"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-widest">Virtual Calc</label>
                    <div onClick={() => !isPublishing && setAllowCalculator(!allowCalculator)} className={`flex items-center justify-between p-2.5 border rounded-lg transition-all shadow-sm ${allowCalculator ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-300"} ${isPublishing ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}>
                      <span className="text-xs font-bold text-slate-900">{allowCalculator ? "Enabled" : "Disabled"}</span>
                      <div className={`w-8 h-4 rounded-full relative transition-colors ${allowCalculator ? "bg-emerald-500" : "bg-slate-400"}`}><div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-[3px] transition-transform ${allowCalculator ? "right-[3px]" : "left-[3px]"}`}></div></div>
                    </div>
                  </div>
                </div>
              </div>

              {questions.length > 0 && (
                <div className="space-y-4 md:space-y-6">
                  <div className={`bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm ${isPublishing ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-100 pb-4 mb-4 gap-3">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider"><i className="fas fa-layer-group text-emerald-500 mr-2"></i> Section Architecture</h3>
                      <div className={`text-[10px] md:text-xs font-bold px-3 md:px-4 py-1.5 md:py-2 rounded-full border transition-colors ${totalSectionQuestions === questions.length ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm' : 'bg-rose-50 text-rose-800 border-rose-300 shadow-sm'}`}>
                        Assigned: {totalSectionQuestions} / {questions.length} Total
                      </div>
                    </div>
                    <div className="space-y-3">
                      {examSections.map((sec, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors">
                          <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">{i+1}</div>
                          <input type="text" disabled={isPublishing} value={sec.name} onChange={(e) => updateSection(i, 'name', e.target.value)} placeholder="Section Name" className="flex-1 bg-white border border-slate-300 rounded-lg p-2 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500 shadow-sm min-w-[120px] disabled:bg-slate-100"/>
                          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-1.5 pr-3 shadow-sm">
                            <input type="number" disabled={isPublishing} value={sec.count} onChange={(e) => updateSection(i, 'count', parseInt(e.target.value) || 0)} className="w-12 bg-transparent p-1 text-center text-sm font-black text-emerald-700 outline-none disabled:text-slate-400"/>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Qs</span>
                          </div>
                          {examSections.length > 1 && (
                            <button onClick={() => removeSection(i)} disabled={isPublishing} className="w-8 h-8 text-rose-500 hover:bg-rose-100 hover:scale-110 rounded-full transition-all shrink-0 disabled:opacity-50"><i className="fas fa-times"></i></button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button onClick={addSection} disabled={isPublishing} className="mt-4 text-xs font-bold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-100 hover:-translate-y-0.5 transition-all shadow-sm w-full sm:w-auto disabled:opacity-50"><i className="fas fa-plus mr-1"></i> Add Section</button>
                  </div>

                  {questions.map((q, qIndex) => (
                    <div key={qIndex} className={`bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm relative transition-all duration-300 group ${isPublishing ? 'opacity-70 pointer-events-none' : 'hover:border-indigo-300 hover:shadow-md'}`}>
                      <button onClick={() => requestRemoveQuestion(qIndex)} disabled={isPublishing} className="absolute top-3 right-3 text-rose-400 hover:text-rose-600 hover:bg-rose-100 transition-all bg-rose-50 p-2 rounded-lg z-10"><i className="fas fa-trash"></i></button>

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
                          <input type="number" step="0.5" disabled={isPublishing} value={q.marks} onChange={(e) => updateQuestionField(qIndex, 'marks', e.target.value)} className="w-14 bg-white border border-emerald-300 rounded text-xs px-2 py-1 text-emerald-900 font-black outline-none shadow-sm disabled:bg-slate-100 focus:ring-1 focus:ring-emerald-400"/>
                        </div>
                        <div className="flex items-center gap-2 border-l-2 border-slate-200 pl-4">
                          <span className="text-xs font-bold text-rose-700">- Mark:</span>
                          <input type="number" step="0.1" disabled={isPublishing} value={q.negativeMarks} onChange={(e) => updateQuestionField(qIndex, 'negativeMarks', e.target.value)} className="w-14 bg-white border border-rose-300 rounded text-xs px-2 py-1 text-rose-900 font-black outline-none shadow-sm disabled:bg-slate-100 focus:ring-1 focus:ring-rose-400"/>
                        </div>
                      </div>

                      <div className="relative w-full mb-3">
                        <textarea 
                          disabled={isPublishing} 
                          value={q.text} 
                          onChange={(e) => updateQuestionField(qIndex, 'text', e.target.value)} 
                          onPaste={(e) => handlePaste(e, qIndex, 'question')}
                          placeholder="Type text, use voice, or Ctrl+V to paste image..." 
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 pr-12 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-y font-bold shadow-inner disabled:bg-slate-100 transition-shadow" 
                          rows="3"
                        />
                        <button 
                          onClick={() => toggleDictation(qIndex, 'text')}
                          className={`absolute bottom-3 right-3 p-2 rounded-lg transition-colors shadow-sm ${listeningField === `q-${qIndex}-text` ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-200 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'}`}
                          title="Voice Typing"
                        >
                          <i className={`fas ${listeningField === `q-${qIndex}-text` ? 'fa-microphone' : 'fa-microphone-alt'}`}></i>
                        </button>
                      </div>

                      <div className="mb-6">
                        {q.imageUrl ? (
                          <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-100 p-2 group/mainimg shadow-inner inline-block min-w-[200px]">
                            <button onClick={() => removeImage(qIndex, 'question')} className="absolute top-2 right-2 bg-rose-500/90 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] z-20 hover:bg-rose-600 shadow-md transition-transform hover:scale-110 backdrop-blur-md">
                                <i className="fas fa-times"></i>
                            </button>

                            {q.isUploadingQ && (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                <i className="fas fa-spinner fa-spin text-indigo-600 text-3xl drop-shadow-md mb-2"></i>
                                <span className="text-[10px] font-black text-indigo-800 tracking-widest animate-pulse">OPTIMIZING & UPLOADING</span>
                              </div>
                            )}
                            <img src={q.imageUrl} alt="Q" className={`max-h-48 mx-auto object-contain transition-opacity ${q.isUploadingQ ? 'opacity-30 blur-sm' : ''}`} />
                            
                            {!q.isUploadingQ && (
                              <label className={`absolute inset-0 w-full h-full bg-slate-900/80 flex items-center justify-center opacity-0 group-hover/mainimg:opacity-100 transition-opacity backdrop-blur-sm ${isPublishing ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                <span className="bg-white text-slate-900 text-xs font-bold px-4 py-2 rounded-xl shadow-xl hover:scale-105 transition-transform"><i className="fas fa-upload mr-2"></i> Replace Image</span>
                                <input type="file" accept="image/*" disabled={isPublishing} className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'question')} />
                              </label>
                            )}
                          </div>
                        ) : (
                          <label className={`text-xs font-bold text-indigo-700 bg-indigo-50 px-4 py-2 rounded-lg inline-flex items-center gap-2 border border-indigo-200 transition-all shadow-sm ${isPublishing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-100 hover:shadow-md hover:-translate-y-0.5'}`}><i className="fas fa-camera"></i> Attach Diagram<input type="file" accept="image/*" disabled={isPublishing} className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'question')} /></label>
                        )}
                      </div>

                      {q.type === 'NAT' ? (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner mb-6">
                          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">Numerical Answer</label>
                          <input disabled={isPublishing} type="text" value={q.correctAnswer || ''} onChange={(e) => updateQuestionField(qIndex, 'correctAnswer', e.target.value)} className="w-full sm:max-w-xs bg-white border-2 border-slate-300 rounded-lg p-3 text-lg font-black text-slate-900 outline-none focus:border-emerald-500 shadow-sm disabled:bg-slate-100 transition-shadow" placeholder="e.g. 4.5" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          {q.options?.map((opt, optIndex) => {
                            const isCorrect = q.type === 'MSQ' ? (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id)) : q.correctAnswer === opt.id;
                            return (
                              <div key={optIndex} className={`flex items-start gap-3 p-3 rounded-xl border transition-all shadow-sm bg-white ${isCorrect ? 'border-emerald-500 ring-1 ring-emerald-200' : 'border-slate-300 hover:border-indigo-300'}`}>
                                <input disabled={isPublishing} type={q.type === 'MSQ' ? "checkbox" : "radio"} name={q.type === 'MSQ' ? `q-${qIndex}-${optIndex}` : `q-${qIndex}-correct`} checked={isCorrect} onChange={() => q.type === 'MSQ' ? toggleMsqAnswer(qIndex, opt.id) : updateQuestionField(qIndex, 'correctAnswer', opt.id)} className={`mt-2 w-5 h-5 accent-emerald-600 transition-transform ${isPublishing ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`} />
                                <div className="flex-1 relative">
                                  <input 
                                    disabled={isPublishing} 
                                    type="text" 
                                    value={opt.text} 
                                    onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)} 
                                    onPaste={(e) => handlePaste(e, qIndex, 'option', optIndex)}
                                    placeholder={`Option ${opt.id} (Ctrl+V image)`} 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pr-8 text-xs outline-none font-bold text-slate-900 focus:border-indigo-400 focus:bg-white disabled:bg-slate-100 transition-shadow" 
                                  />
                                  <button 
                                    onClick={() => toggleDictation(qIndex, 'option', optIndex)}
                                    className={`absolute top-[5px] right-[5px] p-1 rounded transition-colors ${listeningField === `q-${qIndex}-opt-${optIndex}` ? 'text-rose-500 animate-pulse' : 'text-slate-400 hover:text-indigo-600'}`}
                                  >
                                    <i className="fas fa-microphone"></i>
                                  </button>

                                  <div className="mt-2">
                                    {opt.imageUrl ? (
                                      <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-slate-100 p-1 group/optimg min-h-[60px]">
                                        <button onClick={() => removeImage(qIndex, 'option', optIndex)} className="absolute top-1 right-1 bg-rose-500/90 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px] z-20 hover:bg-rose-600 shadow-md transition-transform hover:scale-110 backdrop-blur-md">
                                            <i className="fas fa-times"></i>
                                        </button>

                                        {opt.isUploading && (
                                          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                            <i className="fas fa-spinner fa-spin text-indigo-600 text-xl drop-shadow-md mb-1"></i>
                                            <span className="text-[8px] font-black text-indigo-800 tracking-widest animate-pulse">UPLOADING</span>
                                          </div>
                                        )}
                                        <img src={opt.imageUrl} alt="Opt" className={`max-h-24 mx-auto object-contain transition-opacity ${opt.isUploading ? 'opacity-30 blur-sm' : ''}`} />
                                        
                                        {!opt.isUploading && (
                                          <label className={`absolute inset-0 w-full h-full bg-slate-900/80 text-white text-[10px] font-bold opacity-0 group-hover/optimg:opacity-100 flex items-center justify-center backdrop-blur-sm transition-all ${isPublishing ? 'cursor-not-allowed' : 'cursor-pointer hover:text-emerald-300'}`}>
                                            Upload
                                            <input type="file" disabled={isPublishing} accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'option', optIndex)} />
                                          </label>
                                        )}
                                      </div>
                                    ) : (<label className={`text-[10px] font-bold text-slate-600 inline-flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded transition-all ${isPublishing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100 hover:shadow-sm'}`}><i className="fas fa-image"></i> Add Image<input disabled={isPublishing} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'option', optIndex)} /></label>)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 transition-colors hover:bg-indigo-50/80">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-indigo-700 text-xs font-black uppercase tracking-wide"><i className="fas fa-robot mr-1"></i> Solution / Explanation</span>
                          {(!q.explanationImage || q.explanationImage.trim() === "") && (
                            <label className={`text-[10px] font-bold text-indigo-600 inline-flex items-center gap-1 bg-white border border-indigo-200 px-2 py-1 rounded transition-all shadow-sm ${isPublishing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-indigo-100 hover:shadow-md hover:-translate-y-0.5'}`}>
                              <i className="fas fa-image"></i> Attach Diagram
                              <input disabled={isPublishing} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'explanation')} />
                            </label>
                          )}
                        </div>
                        
                        <textarea 
                          disabled={isPublishing} 
                          value={q.explanation || ""} 
                          onChange={(e) => updateQuestionField(qIndex, 'explanation', e.target.value)} 
                          onPaste={(e) => handlePaste(e, qIndex, 'explanation')}
                          className="w-full bg-white border border-indigo-200 rounded-lg p-3 text-xs font-medium text-slate-800 outline-none focus:border-indigo-400 resize-y shadow-sm mb-3 disabled:bg-slate-50 transition-shadow" 
                          rows="2" 
                          placeholder="Type explanation, or Ctrl+V to paste image..."
                        />
                        
                        {q.explanationImage && q.explanationImage.trim() !== "" && (
                          <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-white p-2 group/expimg shadow-inner inline-block min-w-[200px]">
                            <button onClick={() => removeImage(qIndex, 'explanation')} className="absolute top-2 right-2 bg-rose-500/90 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] z-20 hover:bg-rose-600 shadow-md transition-transform hover:scale-110 backdrop-blur-md">
                                <i className="fas fa-times"></i>
                            </button>

                            {q.isUploadingExp && (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                <i className="fas fa-spinner fa-spin text-indigo-600 text-3xl drop-shadow-md mb-2"></i>
                                <span className="text-[10px] font-black text-indigo-800 tracking-widest animate-pulse">OPTIMIZING & UPLOADING</span>
                              </div>
                            )}
                            <img src={q.explanationImage} alt="Explanation" className={`max-h-32 mx-auto object-contain transition-opacity ${q.isUploadingExp ? 'opacity-30 blur-sm' : ''}`} />
                            
                            {!q.isUploadingExp && (
                              <label className={`absolute inset-0 w-full h-full bg-slate-900/80 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover/expimg:opacity-100 transition-opacity backdrop-blur-sm ${isPublishing ? 'cursor-not-allowed' : 'cursor-pointer hover:text-emerald-300'}`}>
                                Replace Image
                                <input disabled={isPublishing || q.isUploadingExp} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, 'explanation')} />
                              </label>
                            )}
                          </div>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN (4 SPANS) - SIDEBAR WIDGETS */}
            <div className="lg:col-span-4 space-y-5 lg:space-y-6">
               
               <div id="tour-recent-rooms" className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 shadow-xl relative overflow-hidden border border-indigo-500 text-white">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-400/30 rounded-full blur-3xl pointer-events-none"></div>
                  <h3 className="font-black text-sm uppercase tracking-widest text-indigo-100 mb-4 flex items-center relative z-10"><i className="fas fa-broadcast-tower text-emerald-400 mr-2 animate-pulse"></i> Active Live Rooms</h3>
                  
                  <div className="relative z-10">
                    {recentRooms.length > 0 ? recentRooms.map(room => (
                       <div key={room.id} onClick={() => router.push(`/educator/live-rooms/${room.id}`)} className="bg-white/10 border border-white/20 rounded-xl p-3 mb-3 cursor-pointer hover:bg-white/20 hover:-translate-y-0.5 hover:shadow-lg transition-all">
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-xs font-bold text-white truncate pr-2">{room.title}</span>
                           <span className="text-[9px] bg-indigo-900/50 text-indigo-200 px-2 py-0.5 rounded font-black border border-indigo-500/50">{room.id}</span>
                         </div>
                         <div className="text-[10px] text-indigo-200 font-bold flex justify-between">
                            <span><i className="fas fa-layer-group mr-1"></i> {room.examCategory}</span>
                            <span>{room.createdAt?.toDate().toLocaleDateString() || "Recently"}</span>
                         </div>
                       </div>
                    )) : <p className="text-xs font-bold text-indigo-200 bg-indigo-900/40 p-4 rounded-xl border border-indigo-500/30 text-center">No recent exams found. Publish one to see it here!</p>}
                  </div>
                  
                  <button onClick={() => router.push('/educator/live-rooms')} className="w-full mt-2 bg-indigo-800 hover:bg-indigo-900 text-white text-xs font-black py-2.5 rounded-lg transition-colors shadow-sm relative z-10">Manage All Rooms</button>
               </div>

               <div id="tour-quick-poll" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-amber-300 transition-all group cursor-pointer" onClick={() => router.push('/educator/quiz-poll')}>
                  <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-xl mb-4 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm"><i className="fas fa-bolt"></i></div>
                  <h3 className="font-black text-slate-900 text-base mb-1.5">Instant Quiz Poll</h3>
                  <p className="text-xs font-bold text-slate-500 mb-5 leading-relaxed">Launch a quick, single-question real-time poll for your class to gauge understanding instantly.</p>
                  <div className="text-xs font-black text-amber-600 flex items-center gap-1 group-hover:gap-2 transition-all bg-amber-50 inline-flex px-4 py-2 rounded-lg">Launch Now <i className="fas fa-arrow-right"></i></div>
               </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}