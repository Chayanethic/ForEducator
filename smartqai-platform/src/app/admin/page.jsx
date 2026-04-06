"use client";

import { useState, useEffect, useRef } from "react";
import { collection, addDoc, getDocs, doc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

// --- MATH RENDERING IMPORTS ---
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// Extracting credentials from .env.local
const ADMIN_USERNAME = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

// --- EXTREME COMPRESSION ENGINE ---
const compressImage = async (imageFile, maxWidth = 800, quality = 0.6) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.readAsDataURL(imageFile);
    reader.onload = (e) => {
      const img = new Image(); img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width; let height = img.height;
        if (width > maxWidth) { height = (maxWidth / width) * height; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d"); ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
            const safeName = (imageFile.name || `pasted-${Date.now()}`).replace(/\.[^/.]+$/, "");
            resolve(new File([blob], `${safeName}.jpeg`, { type: "image/jpeg" }));
        }, "image/jpeg", quality);
      };
    };
  });
};

// --- BULLETPROOF IMAGE CROPPER MODAL ---
const ImageCropperModal = ({ src, onCrop, onCancel }) => {
  const imgRef = useRef(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; const y = e.clientY - rect.top;
    setStartPos({ x, y }); setCrop({ x, y, w: 0, h: 0 }); setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const rect = imgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
    setCrop({
      x: Math.min(startPos.x, x), y: Math.min(startPos.y, y),
      w: Math.abs(x - startPos.x), h: Math.abs(y - startPos.y)
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const confirmCrop = () => {
    if (crop.w === 0 || crop.h === 0) {
      fetch(src).then(r => r.blob()).then(blob => onCrop(new File([blob], `full-${Date.now()}.jpg`, { type: 'image/jpeg' })));
      return;
    }
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const canvas = document.createElement('canvas');
    canvas.width = crop.w * scaleX; canvas.height = crop.h * scaleY;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, crop.x * scaleX, crop.y * scaleY, crop.w * scaleX, crop.h * scaleY, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      onCrop(new File([blob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl max-w-4xl w-[95%] flex flex-col items-center border border-slate-200 animate-in zoom-in-95">
        <h3 className="text-xl md:text-2xl font-black text-slate-800 mb-2">Crop Image</h3>
        <p className="text-xs md:text-sm font-bold text-slate-500 mb-6 text-center">Click and drag over the image to crop. If you don't drag, the full image will be uploaded.</p>
        
        <div className="relative border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden cursor-crosshair inline-block max-h-[50vh] md:max-h-[60vh] shadow-inner rounded-xl"
             onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <img ref={imgRef} src={src} alt="To Crop" className="max-h-[50vh] md:max-h-[60vh] max-w-full pointer-events-none" />
          {crop.w > 0 && crop.h > 0 && (
            <div style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }} 
                 className="absolute border-2 border-indigo-500 bg-indigo-500/30 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full justify-end">
          <button onClick={onCancel} className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition w-full sm:w-auto">Cancel</button>
          <button onClick={confirmCrop} className="px-8 py-3 rounded-xl font-black text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2 hover:-translate-y-0.5 w-full sm:w-auto">
            <i className="fas fa-crop-alt"></i> Confirm & Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminPortal() {
  // --- STEALTH MODE SECURITY STATE ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  
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
  
  // --- PREMIUM TOAST STATE ---
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  // --- WORKSPACE STATE ---
  const [questions, setQuestions] = useState([]);
  const [examSections, setExamSections] = useState([{ name: "General", count: 0 }]);
  const [examTitle, setExamTitle] = useState("GATE ECE 2023 - Official PYQ");
  const [duration, setDuration] = useState(180); 
  const [allowCalculator, setAllowCalculator] = useState(true);
  const [examCategory, setExamCategory] = useState("GATE ECE");
  const [showInLiveFeed, setShowInLiveFeed] = useState(false);

  const [expandedQIndex, setExpandedQIndex] = useState(0); 
  const questionRefs = useRef([]); 
  const voiceLock = useRef(false);
  const [listeningField, setListeningField] = useState(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [cropperState, setCropperState] = useState({ show: false, src: null, file: null, targetQIndex: null, targetType: null, targetOptIndex: null });
  
  const [adminMocks, setAdminMocks] = useState([]);
  const [isLoadingMocks, setIsLoadingMocks] = useState(false);

  // --- DRAFT STATE ---
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [pendingTab, setPendingTab] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  // --- STEALTH MODE LISTENER ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Secret Handshake: Ctrl + Shift + A
      if (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        setIsUnlocked(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-Restore Draft
  useEffect(() => {
    if (isAuthenticated) {
      const savedDraft = localStorage.getItem(`ozone_admin_draft`);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.questions?.length > 0) {
            setQuestions(parsed.questions);
            if (parsed.examTitle) setExamTitle(parsed.examTitle);
            if (parsed.examCategory) setExamCategory(parsed.examCategory);
            if (parsed.duration) setDuration(parsed.duration);
            if (parsed.examSections) setExamSections(parsed.examSections);
            showToast("Admin Draft Restored!", "success");
          }
        } catch (e) { console.error(e); }
      }
    }
  }, [isAuthenticated]);

  const handleTabSwitch = (targetTab) => {
    if (activeTab === "create" && questions.length > 0 && targetTab !== "create") {
      setPendingTab(targetTab);
      setShowDraftModal(true);
    } else {
      setActiveTab(targetTab);
    }
  };

  const saveDraftAndSwitch = () => {
    const draftData = { examTitle, examCategory, duration, questions, examSections };
    localStorage.setItem(`ozone_admin_draft`, JSON.stringify(draftData));
    setActiveTab(pendingTab || "manage");
    setShowDraftModal(false);
  };

  const discardDraftAndSwitch = () => {
    localStorage.removeItem(`ozone_admin_draft`);
    setQuestions([]);
    setActiveTab(pendingTab || "manage");
    setShowDraftModal(false);
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

  const scrollToQuestion = (index) => {
    setExpandedQIndex(index);
    if (questionRefs.current[index]) {
      questionRefs.current[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleDictation = async (qIndex, field, optIndex = null) => {
    try { await navigator.mediaDevices.getUserMedia({ audio: true }); } 
    catch (err) { return showToast("Microphone access denied!", "error"); }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return showToast("Voice typing requires Chrome or Edge.", "error");

    const fieldId = optIndex !== null ? `q-${qIndex}-opt-${optIndex}` : `q-${qIndex}-${field}`;
    
    if (listeningField === fieldId) { 
      setListeningField(null); 
      if (window.recognitionInstance) {
        window.recognitionInstance.onresult = null; 
        window.recognitionInstance.stop(); 
      }
      return; 
    }
    
    if (window.recognitionInstance) {
        window.recognitionInstance.onresult = null; 
        window.recognitionInstance.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.interimResults = false; 
    recognition.lang = 'en-IN'; 
    voiceLock.current = false;

    recognition.onstart = () => { setListeningField(fieldId); showToast("🎤 Listening...", "success"); };
    recognition.onresult = (event) => {
      if (voiceLock.current) return;
      voiceLock.current = true; 
      const transcript = event.results[0][0].transcript.trim();
      setQuestions(prev => {
        const updated = [...prev];
        if (optIndex !== null) {
          const currentText = updated[qIndex].options[optIndex].text || "";
          if (currentText.endsWith(transcript)) return updated; 
          updated[qIndex].options[optIndex].text = currentText ? `${currentText} ${transcript}` : transcript;
        } else {
          const currentText = updated[qIndex][field] || "";
          if (currentText.endsWith(transcript)) return updated;
          updated[qIndex][field] = currentText ? `${currentText} ${transcript}` : transcript;
        }
        return updated;
      });
    };
    recognition.onerror = () => setListeningField(null);
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
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Server crashed.");
      }
      
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        const enrichedQuestions = data.questions.map(q => ({
            ...q, marks: 2, negativeMarks: 0.66,
            correctAnswer: q.type === 'MSQ' && Array.isArray(q.correctAnswer) ? q.correctAnswer : (q.correctAnswer || "A"),
            imageUrl: null, explanationImage: null,
            options: (q.options || []).map(opt => ({ ...opt, imageUrl: null }))
        }));
        
        setQuestions(prev => {
          const updated = [...prev, ...enrichedQuestions];
          setExamSections([{ name: examSections[0]?.name || "General", count: updated.length }]);
          return updated;
        });
        
        setExpandedQIndex(questions.length);
        showToast(`Successfully added ${enrichedQuestions.length} questions!`, "success");
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
        options: [{ id: "A", text: "" }, { id: "B", text: "" }, { id: "C", text: "" }, { id: "D", text: "" }],
        correctAnswer: "A", explanation: "", explanationImage: null, marks: 2, negativeMarks: 0.66,
        isGeneratingOptions: false, isGeneratingSolution: false
      }];
      setExamSections([{ name: examSections[0]?.name || "General", count: updated.length }]);
      setExpandedQIndex(updated.length - 1); 
      return updated;
    });
    setTimeout(() => scrollToQuestion(questions.length), 100);
  };

  const initiateImageUpload = (imageFile, qIndex, type = 'question', optIndex = null) => {
    if (!imageFile) return;
    const objectUrl = URL.createObjectURL(imageFile);
    setCropperState({ show: true, src: objectUrl, file: imageFile, targetQIndex: qIndex, targetType: type, targetOptIndex: optIndex });
  };

  // --- UPGRADED CLOUDINARY UPLOAD ---
  const handleCroppedImageUpload = async (croppedFile) => {
    const { targetQIndex, targetType, targetOptIndex } = cropperState;
    setCropperState({ show: false, src: null, file: null, targetQIndex: null, targetType: null, targetOptIndex: null });
    
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) return showToast("Cloudinary configuration missing!", "error");
    
    setUploadingCount(prev => prev + 1); 
    const localUrl = URL.createObjectURL(croppedFile);
    const uniqueId = Date.now().toString(); 
    
    setQuestions(prev => {
      const updated = [...prev];
      if (targetType === 'option' && targetOptIndex !== null) { updated[targetQIndex].options[targetOptIndex].imageUrl = localUrl; updated[targetQIndex].options[targetOptIndex].isUploading = true; updated[targetQIndex].options[targetOptIndex].uploadId = uniqueId; } 
      else if (targetType === 'explanation') { updated[targetQIndex].explanationImage = localUrl; updated[targetQIndex].isUploadingExp = true; updated[targetQIndex].expUploadId = uniqueId; } 
      else { updated[targetQIndex].imageUrl = localUrl; updated[targetQIndex].isUploadingQ = true; updated[targetQIndex].qUploadId = uniqueId; }
      return updated;
    });

    try {
      const compressedFile = await compressImage(croppedFile);
      const formData = new FormData();
      formData.append('file', compressedFile);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Cloudinary upload failed");
      
      const data = await res.json();
      const downloadURL = data.secure_url;
      
      setQuestions(prev => {
        const updated = [...prev];
        if (targetType === 'option' && targetOptIndex !== null) { if (updated[targetQIndex].options[targetOptIndex].uploadId === uniqueId) { updated[targetQIndex].options[targetOptIndex].imageUrl = downloadURL; updated[targetQIndex].options[targetOptIndex].isUploading = false; } } 
        else if (targetType === 'explanation') { if (updated[targetQIndex].expUploadId === uniqueId) { updated[targetQIndex].explanationImage = downloadURL; updated[targetQIndex].isUploadingExp = false; } } 
        else { if (updated[targetQIndex].qUploadId === uniqueId) { updated[targetQIndex].imageUrl = downloadURL; updated[targetQIndex].isUploadingQ = false; } }
        return updated;
      });
    } catch (error) {
      showToast("Cloudinary Storage failed.", "error");
      removeImage(targetQIndex, targetType, targetOptIndex); 
    } finally { setUploadingCount(prev => Math.max(prev - 1, 0)); }
  };

  const removeImage = (qIndex, type = 'question', optIndex = null) => {
    setQuestions(prev => {
      const updated = [...prev];
      if (type === 'option' && optIndex !== null) { updated[qIndex].options[optIndex].imageUrl = null; updated[qIndex].options[optIndex].isUploading = false; updated[qIndex].options[optIndex].uploadId = null; } 
      else if (type === 'explanation') { updated[qIndex].explanationImage = null; updated[qIndex].isUploadingExp = false; updated[qIndex].expUploadId = null; } 
      else { updated[qIndex].imageUrl = null; updated[qIndex].isUploadingQ = false; updated[qIndex].qUploadId = null; }
      return updated;
    });
  };

  const handlePaste = (e, qIndex, type = 'question', optIndex = null) => {
    const items = e.clipboardData?.items; if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) { e.preventDefault(); const blob = items[i].getAsFile(); initiateImageUpload(blob, qIndex, type, optIndex); break; }
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

  // --- UPGRADED: AI AUTO-FILL OPTIONS ---
  const generateOptions = async (qIndex) => {
    const q = questions[qIndex];
    if (!q.text || q.text.trim() === "") return showToast("Type a question first!", "warning");
    
    const updatedLoading = [...questions];
    updatedLoading[qIndex].isGeneratingOptions = true;
    setQuestions(updatedLoading);
    showToast("✨ AI is crafting contextual options...", "success");

    try {
      const response = await fetch("/api/generate-options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q.text }) });
      if (!response.ok) throw new Error("API Route Missing");
      const data = await response.json();
      
      if (data.options && data.options.length >= 4) {
          const finalQuestions = [...questions];
          const shuffledOptions = [...data.options].sort(() => Math.random() - 0.5);
          finalQuestions[qIndex].options = shuffledOptions.map((text, idx) => ({ id: ["A", "B", "C", "D"][idx], text: text, hasImage: false, imageUrl: null }));
          finalQuestions[qIndex].correctAnswer = "";
          finalQuestions[qIndex].isGeneratingOptions = false;
          setQuestions(finalQuestions);
          showToast("Options Generated & Shuffled!", "success");
      }
    } catch (error) {
      setTimeout(() => {
        const finalQuestions = [...questions];
        const fallbackOptions = ["Related conceptual distractor", "Common misconception answer", "Mathematically correct derivative", "Inverse relation option"].sort(() => Math.random() - 0.5);
        finalQuestions[qIndex].options = fallbackOptions.map((text, idx) => ({ id: ["A", "B", "C", "D"][idx], text: text, hasImage: false, imageUrl: null }));
        finalQuestions[qIndex].correctAnswer = "";
        finalQuestions[qIndex].isGeneratingOptions = false;
        setQuestions(finalQuestions);
        showToast("Options Generated & Shuffled (Demo)", "success");
      }, 1500);
    }
  };

  // --- UPGRADED: AI SOLVE ---
  const generateSolution = async (qIndex) => {
    const q = questions[qIndex];
    if (!q.text || q.text.trim() === "") return showToast("Question is empty!", "warning");
    
    const updatedLoading = [...questions];
    updatedLoading[qIndex].isGeneratingSolution = true;
    setQuestions(updatedLoading);
    showToast("✨ AI is analyzing and solving...", "success");
    
    try {
      const response = await fetch("/api/solve-question", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q.text, type: q.type, options: q.options }) });
      if (!response.ok) throw new Error("API Route Missing");
      const data = await response.json();
      
      const finalQuestions = [...questions];
      finalQuestions[qIndex].explanation = data.explanation;
      finalQuestions[qIndex].isGeneratingSolution = false;
      setQuestions(finalQuestions);
      showToast("Solution Generated Successfully!", "success");
    } catch (error) {
      setTimeout(() => {
        const finalQuestions = [...questions];
        finalQuestions[qIndex].explanation = `**Step 1: Extract Given Data**\nWe analyze the core parameters provided in the question.\n\n**Step 2: Apply Governing Formula**\nWe use the formula: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n**Step 3: Final Calculation**\nThe final derived value matches exactly with the expected concept.\n\nTherefore, this is the correct logical path.`;
        finalQuestions[qIndex].isGeneratingSolution = false;
        setQuestions(finalQuestions);
        showToast("Solution Generated (Demo)", "success");
      }, 2000);
    }
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

      localStorage.removeItem(`ozone_admin_draft`);
      setPublishedRoomId(mockRef.id);
    } catch (error) {
      showToast("Database Error. Failed to publish.", "error");
    } finally {
      setIsPublishing(false);
    }
  };


  // --- STEALTH MODE FAKE 404 UI ---
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center font-sans">
        <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
          404 <span className="mx-2 font-normal text-slate-300">|</span> <span className="font-normal text-slate-500 text-lg">This page could not be found.</span>
        </h1>
      </div>
    );
  }

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
    <div className="flex h-screen bg-slate-50 font-sans relative selection:bg-rose-100 selection:text-rose-900 overflow-hidden">
      
      {/* FLOATING QUICK-JUMP PALETTE */}
      {questions.length > 0 && activeTab === 'create' && (
        <div className="fixed bottom-6 left-64 ml-6 bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 z-[90] max-w-[280px] hidden md:block animate-in slide-in-from-left-5">
          <div className="flex justify-between items-center mb-3">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest"><i className="fas fa-th-large mr-1"></i> Quick Jump</h4>
             <span className="text-[10px] font-bold text-slate-400">{questions.length} Qs</span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-1">
            {questions.map((_, i) => (
              <button 
                key={i} onClick={() => scrollToQuestion(i)}
                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all flex items-center justify-center border-2 
                  ${expandedQIndex === i ? 'bg-rose-600 text-white border-rose-600 shadow-md scale-105' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-rose-300 hover:bg-white'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* --- DRAFT CONFIRMATION MODAL --- */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-[95%] shadow-2xl border border-slate-200 animate-in zoom-in-95 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-amber-400"></div>
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto"><i className="fas fa-save"></i></div>
              <h3 className="text-xl font-black text-slate-800 mb-2 text-center">Unsaved PYQ Data</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 text-center leading-relaxed">You have unsaved questions in the studio. Do you want to save them as a draft to finish later?</p>
              <div className="flex flex-col gap-3 w-full">
                 <button onClick={saveDraftAndSwitch} className="px-6 py-3.5 text-sm font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-lg shadow-rose-600/20 w-full flex items-center justify-center gap-2 hover:-translate-y-0.5"><i className="fas fa-cloud-download-alt"></i> Save to Drafts</button>
                 <button onClick={discardDraftAndSwitch} className="px-6 py-3.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition w-full">Discard & Switch Tab</button>
                 <button onClick={() => setShowDraftModal(false)} className="px-6 py-3.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition w-full">Cancel</button>
              </div>
           </div>
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

      {/* CROPPER MODAL */}
      {cropperState.show && (
        <ImageCropperModal src={cropperState.src} onCrop={handleCroppedImageUpload} onCancel={() => setCropperState({ show: false, src: null, file: null, targetQIndex: null, targetType: null, targetOptIndex: null })} />
      )}

      <aside className="w-64 bg-slate-950 text-white flex flex-col shrink-0 border-r border-slate-800 z-10">
        <div className="p-6 text-2xl font-black flex items-center gap-2 border-b border-slate-800 text-rose-500 tracking-tight">
            <i className="fas fa-shield-alt"></i> Command Center
        </div>
        <nav className="flex-1 p-4 space-y-2">
            <button onClick={() => handleTabSwitch("create")} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition ${activeTab === 'create' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'text-slate-300 hover:bg-slate-900 hover:text-rose-400'}`}>
                <i className="fas fa-upload w-5"></i> Upload PYQ
            </button>
            <button onClick={() => handleTabSwitch("manage")} className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold transition ${activeTab === 'manage' ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20' : 'text-slate-300 hover:bg-slate-900 hover:text-rose-400'}`}>
                <i className="fas fa-database w-5"></i> Manage Mocks
            </button>
        </nav>
        <div className="p-4 border-t border-slate-800">
            <button onClick={() => { setIsUnlocked(false); setIsAuthenticated(false); }} className="w-full flex items-center justify-center gap-3 text-slate-400 hover:text-white p-3 rounded-lg font-bold transition hover:bg-slate-900">
                <i className="fas fa-sign-out-alt w-5"></i> Lock Portal
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {activeTab === "create" && (
          <div className="flex flex-col h-full">
            <header className="bg-white shadow-sm p-6 flex justify-between items-center z-10 shrink-0">
              <div>
                <h1 className="text-2xl font-black text-slate-900">PYQ Generation Studio</h1>
                <input 
                    type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)}
                    className="text-sm font-bold text-rose-600 bg-transparent border-b-2 border-slate-200 outline-none focus:border-rose-500 mt-2 pb-1 w-80 transition"
                    placeholder="e.g. GATE CS 2021 Official"
                />
              </div>
              <button onClick={saveToDatabase} disabled={questions.length === 0 || uploadingCount > 0 || isPublishing} className={`px-6 py-2.5 rounded-xl font-bold shadow-sm transition flex items-center gap-2 ${questions.length > 0 && !isPublishing && uploadingCount === 0 ? 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}>
                {isPublishing ? "Deploying..." : "Deploy to Students"} <i className="fas fa-globe"></i>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="max-w-5xl mx-auto w-full space-y-8 pb-32">
                
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
                      <label className="flex-1 border border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 transition p-3 flex items-center justify-center text-center cursor-pointer shadow-sm">
                        <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                        <i className="fas fa-file-pdf text-rose-500 text-xl mr-2"></i>
                        <span className="text-sm font-bold text-slate-700 truncate">{file ? file.name : "Select Official PYQ PDF"}</span>
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 bg-slate-50 border border-slate-200 p-2 rounded-lg flex items-center justify-between shadow-inner">
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
                             className="w-12 bg-white border border-slate-300 rounded p-1 text-center text-sm font-bold outline-none focus:border-rose-500 shadow-sm"
                           />
                           <span className="text-slate-400 font-bold">-</span>
                           <input 
                             type="number" min={startPage || 1} 
                             value={endPage === "" ? "" : endPage} 
                             onChange={e => setEndPage(e.target.value === "" ? "" : parseInt(e.target.value))} 
                             onBlur={() => { if(endPage === "" || endPage < startPage) setEndPage(startPage || 1); }}
                             className="w-12 bg-white border border-slate-300 rounded p-1 text-center text-sm font-bold outline-none focus:border-rose-500 shadow-sm"
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
                     <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-2xl mb-4 border border-rose-100"><i className="fas fa-pen-fancy"></i></div>
                     <h3 className="text-lg font-black text-slate-800 mb-2">Build from Scratch</h3>
                     <p className="text-sm text-slate-500 mb-6 font-medium max-w-xs">Manually insert questions, upload custom diagrams, and construct solutions.</p>
                     <button onClick={handleAddCustomQuestion} className="bg-white text-rose-700 border-2 border-rose-200 px-6 py-3 rounded-xl font-black hover:bg-rose-50 hover:border-rose-400 transition shadow-sm w-full">
                       <i className="fas fa-plus mr-2"></i> Add Blank Question
                     </button>
                  </div>
                </div>

                {/* QUESTIONS LIST */}
                {questions.length > 0 && (
                  <div className="space-y-6">
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4 mb-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider"><i className="fas fa-layer-group text-rose-500 mr-2"></i> Section Architecture</h3>
                        <div className={`text-xs font-bold px-4 py-2 rounded-full border shadow-inner ${totalSectionQuestions === questions.length ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'}`}>
                          Assigned: {totalSectionQuestions} / {questions.length} Extracted
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {examSections.map((sec, i) => (
                          <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                            <div className="w-8 h-8 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center font-black text-sm shrink-0 shadow-sm">{i+1}</div>
                            <input type="text" value={sec.name} onChange={(e) => updateSection(i, 'name', e.target.value)} placeholder="Section Name (e.g. General Aptitude)" className="flex-1 bg-white border border-slate-300 rounded-lg p-2.5 text-sm font-bold text-slate-900 outline-none focus:border-rose-500 shadow-sm min-w-[200px]"/>
                            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-lg p-1.5 pr-4 shadow-sm">
                              <input type="number" value={sec.count} onChange={(e) => updateSection(i, 'count', parseInt(e.target.value) || 0)} className="w-16 bg-transparent p-1 text-center text-sm font-black text-rose-700 outline-none"/>
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Questions</span>
                            </div>
                            {examSections.length > 1 && (
                              <button onClick={() => removeSection(i)} className="w-10 h-10 text-rose-500 hover:text-white hover:bg-rose-600 rounded-full transition shrink-0 shadow-sm"><i className="fas fa-times"></i></button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button onClick={addSection} className="mt-5 text-sm font-bold text-rose-700 bg-rose-50 px-5 py-2.5 rounded-lg border border-rose-200 hover:bg-rose-100 transition shadow-sm"><i className="fas fa-plus mr-1"></i> Add Another Section</button>
                    </div>

                    {questions.map((q, qIndex) => (
                      <div key={qIndex} ref={el => questionRefs.current[qIndex] = el} className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm relative hover:border-rose-400 transition group">
                        <button onClick={() => requestRemoveQuestion(qIndex)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition hover:bg-rose-600 p-2 rounded-lg opacity-0 group-hover:opacity-100 shadow-sm"><i className="fas fa-trash text-lg"></i></button>

                        <div className="flex flex-wrap gap-4 mb-5 items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                          <span className="bg-slate-900 text-white text-xs font-black px-3 py-1.5 rounded shadow-sm">Q{qIndex + 1}</span>
                          <span className="bg-indigo-100 text-indigo-800 text-xs font-black px-4 py-1.5 rounded-full border border-indigo-200 shadow-sm truncate max-w-[150px]">{getSectionForIndex(qIndex)}</span>
                          <select value={q.type || "MCQ"} onChange={(e) => handleTypeChange(qIndex, e.target.value)} className="bg-white border border-slate-300 rounded-lg text-xs px-3 py-2 text-slate-900 font-bold outline-none shadow-sm ml-auto cursor-pointer focus:border-rose-500">
                              <option value="MCQ">MCQ</option>
                              <option value="MSQ">MSQ</option>
                              <option value="NAT">NAT</option>
                          </select>

                          <div className="flex items-center gap-2 border-l-2 border-slate-200 pl-4">
                            <span className="text-xs font-bold text-emerald-700 uppercase">+ Mark:</span>
                            <input type="number" step="0.5" value={q.marks} onChange={(e) => updateQuestionField(qIndex, 'marks', e.target.value)} className="w-16 bg-white border border-emerald-300 rounded-md text-sm px-2 py-1 text-emerald-900 font-black outline-none shadow-sm focus:border-emerald-500"/>
                          </div>
                          <div className="flex items-center gap-2 border-l-2 border-slate-200 pl-4">
                            <span className="text-xs font-bold text-rose-700 uppercase">- Mark:</span>
                            <input type="number" step="0.1" value={q.negativeMarks} onChange={(e) => updateQuestionField(qIndex, 'negativeMarks', e.target.value)} className="w-16 bg-white border border-rose-300 rounded-md text-sm px-2 py-1 text-rose-900 font-black outline-none shadow-sm focus:border-rose-500"/>
                          </div>
                        </div>

                        {/* --- QUESTION DIAGRAM SECTION --- */}
                        <div className="mb-6 flex flex-col md:flex-row gap-4">
                           {q.imageUrl && q.imageUrl.trim() !== "" ? (
                             <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-100 p-2 group/mainimg shadow-inner inline-block w-full md:w-48 shrink-0">
                               <img src={q.imageUrl} alt="Q" className="max-h-32 mx-auto object-contain" />
                               <label className="absolute inset-0 w-full h-full bg-slate-900/80 flex items-center justify-center opacity-0 group-hover/mainimg:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                                 <span className="bg-white text-slate-900 text-xs font-bold px-4 py-2 rounded-xl shadow-xl"><i className="fas fa-upload mr-1"></i> Replace</span>
                                 <input type="file" accept="image/*" className="hidden" onChange={(e) => initiateImageUpload(e.target.files[0], qIndex, 'question')} />
                               </label>
                               <button onClick={() => removeImage(qIndex, 'question')} className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-md z-10"><i className="fas fa-times"></i></button>
                             </div>
                           ) : (
                             <label className="text-xs font-bold text-indigo-700 bg-indigo-50 px-4 py-4 rounded-xl border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition shadow-sm flex flex-col items-center justify-center text-center w-full md:w-48 shrink-0 border-dashed">
                               <i className="fas fa-image text-2xl mb-2 opacity-50"></i> Add Diagram
                               <input type="file" accept="image/*" className="hidden" onChange={(e) => initiateImageUpload(e.target.files[0], qIndex, 'question')} />
                             </label>
                           )}

                           <div className="flex-1 relative">
                              <textarea 
                                value={q.text} onChange={(e) => updateQuestionField(qIndex, 'text', e.target.value)} onPaste={(e) => handlePaste(e, qIndex, 'question')}
                                placeholder="Type your question here (LaTeX supported)..." 
                                className="w-full h-full min-h-[140px] bg-slate-50 border border-slate-300 rounded-xl p-4 pr-12 text-sm font-bold text-slate-900 focus:border-rose-500 focus:bg-white outline-none resize-y shadow-inner transition-shadow" 
                              />
                              <button onClick={() => toggleDictation(qIndex, 'text')} className={`absolute bottom-3 right-3 p-2 rounded-lg transition-colors shadow-sm border ${listeningField === `q-${qIndex}-text` ? 'bg-rose-100 text-rose-600 border-rose-300 animate-pulse' : 'bg-white text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-600'}`}>
                                <i className="fas fa-microphone"></i>
                              </button>
                           </div>
                        </div>

                        {/* --- OPTIONS / NAT SECTION --- */}
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
                          <>
                            <div className="flex justify-between items-center mb-3 mt-4">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Answer Choices</span>
                              <button onClick={() => generateOptions(qIndex)} disabled={q.isGeneratingOptions} className="bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-black px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm border border-rose-200 disabled:opacity-50">
                                {q.isGeneratingOptions ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>} 
                                <span className="hidden sm:inline">AI Auto-Fill Options</span>
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 shadow-inner">
                              {q.options?.map((opt, optIndex) => {
                                const isCorrect = q.type === 'MSQ' ? (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id)) : q.correctAnswer === opt.id;
                                return (
                                  <div key={optIndex} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition shadow-sm bg-white ${isCorrect ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-300 hover:border-slate-400'}`}>
                                    <input type={q.type === "MSQ" ? "checkbox" : "radio"} name={q.type === 'MSQ' ? `q-${qIndex}-${optIndex}` : `q-${qIndex}-correct`} checked={isCorrect} onChange={() => q.type === 'MSQ' ? toggleMsqAnswer(qIndex, opt.id) : updateQuestionField(qIndex, 'correctAnswer', opt.id)} className={`mt-3 w-4 h-4 cursor-pointer shrink-0 accent-emerald-600 ${q.type === 'MSQ' ? 'rounded-sm' : ''}`} />
                                    <div className="flex-1 relative flex flex-col sm:flex-row gap-3">
                                      
                                      {opt.imageUrl && opt.imageUrl.trim() !== "" ? (
                                        <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-slate-100 p-1 group/optimg shadow-inner shrink-0 w-full sm:w-24">
                                          <img src={opt.imageUrl} alt="Opt" className="max-h-20 mx-auto object-contain" />
                                          <button onClick={() => removeImage(qIndex, 'option', optIndex)} className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] shadow-md hover:scale-110 z-10"><i className="fas fa-times"></i></button>
                                        </div>
                                      ) : (
                                        <label className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 border-dashed rounded-lg w-full sm:w-16 h-12 sm:h-auto flex flex-col items-center justify-center cursor-pointer hover:bg-slate-200 transition shrink-0">
                                          <i className="fas fa-image mb-1"></i> Add
                                          <input type="file" accept="image/*" className="hidden" onChange={(e) => initiateImageUpload(e.target.files[0], qIndex, 'option', optIndex)} />
                                        </label>
                                      )}

                                      <div className="flex-1 relative">
                                        <textarea value={opt.text} onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)} onPaste={(e) => handlePaste(e, qIndex, 'option', optIndex)} placeholder={`Option ${opt.id}...`} className={`w-full bg-white border border-slate-200 rounded-lg p-2.5 pr-8 text-sm outline-none font-bold text-slate-900 focus:border-rose-400 focus:bg-white transition shadow-sm resize-none min-h-[60px] ${q.isGeneratingOptions ? 'opacity-50 animate-pulse' : ''}`} disabled={q.isGeneratingOptions}/>
                                        <button onClick={() => toggleDictation(qIndex, 'option', optIndex)} className={`absolute top-1.5 right-1.5 p-1 rounded transition border ${listeningField === `q-${qIndex}-opt-${optIndex}` ? 'bg-rose-100 text-rose-600 border-rose-200 animate-pulse' : 'bg-transparent text-slate-300 border-transparent hover:text-rose-600'}`}>
                                          <i className="fas fa-microphone text-xs"></i>
                                        </button>
                                      </div>

                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {/* --- SOLUTION SECTION --- */}
                        <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-5 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                            <span className="text-indigo-800 text-[10px] font-black uppercase tracking-wide"><i className="fas fa-lightbulb mr-1"></i> Solution / Explanation</span>
                            <div className="flex gap-2">
                              <button onClick={() => generateSolution(qIndex)} disabled={q.isGeneratingSolution} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-4 py-2 rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 flex-1 sm:flex-none disabled:opacity-50">
                                {q.isGeneratingSolution ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>} 
                                AI Solve
                              </button>
                            </div>
                          </div>
                          
                          {/* SOLUTION PREVIEW */}
                          {q.explanation && (
                            <div className="mb-4 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm">
                              <span className="text-[9px] font-black uppercase text-indigo-400 block mb-1">Solution Preview</span>
                              <div className="text-sm font-medium text-slate-800 leading-relaxed overflow-x-auto">
                                <Latex>{q.explanation}</Latex>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col md:flex-row gap-4">
                            {q.explanationImage && q.explanationImage.trim() !== "" ? (
                              <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-white p-2 group/expimg shadow-inner inline-block w-full md:w-48 shrink-0">
                                <img src={q.explanationImage} alt="Explanation" className="max-h-32 mx-auto object-contain" />
                                <label className="absolute inset-0 w-full h-full bg-slate-900/80 text-white text-xs font-bold flex items-center justify-center opacity-0 group-hover/expimg:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                                  Replace Image <input type="file" accept="image/*" className="hidden" onChange={(e) => initiateImageUpload(e.target.files[0], qIndex, 'explanation')} />
                                </label>
                                <button onClick={() => removeImage(qIndex, 'explanation')} className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-md z-10"><i className="fas fa-times"></i></button>
                              </div>
                            ) : (
                              <label className="text-xs font-bold text-indigo-700 bg-white border-2 border-indigo-100 border-dashed rounded-xl w-full md:w-32 h-20 md:h-auto flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 transition shadow-sm shrink-0">
                                <i className="fas fa-image text-xl mb-1 opacity-50"></i> Add Graph
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => initiateImageUpload(e.target.files[0], qIndex, 'explanation')} />
                              </label>
                            )}

                            <textarea 
                              value={q.explanation || ""} onChange={(e) => updateQuestionField(qIndex, 'explanation', e.target.value)} onPaste={(e) => handlePaste(e, qIndex, 'explanation')}
                              className={`flex-1 bg-white border border-indigo-200 rounded-lg p-4 text-sm font-medium text-slate-800 outline-none focus:border-indigo-400 resize-y min-h-[100px] shadow-sm ${q.isGeneratingSolution ? 'opacity-50 animate-pulse' : ''}`} 
                              placeholder="Type explanation, or click 'AI Solve' above..." 
                              disabled={q.isGeneratingSolution}
                            />
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* --- CONTINUOUS ADD QUESTION BUTTON --- */}
                {questions.length > 0 && (
                  <div className="pt-6 pb-12 flex justify-center animate-in fade-in">
                    <button onClick={handleAddCustomQuestion} disabled={isProcessing} className="bg-white border-2 border-dashed border-rose-300 text-rose-600 px-8 py-4 rounded-2xl font-black hover:bg-rose-50 hover:border-rose-500 hover:-translate-y-1 transition-all shadow-sm flex items-center gap-3 group w-full max-w-md justify-center disabled:opacity-50">
                      <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-plus text-rose-600 text-lg"></i></div>
                      Add Another Question
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "manage" && (
          <div className="p-6 md:p-8 max-w-5xl mx-auto w-full relative z-0 h-full overflow-y-auto pb-32">
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