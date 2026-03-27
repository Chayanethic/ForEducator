"use client";

import { useState, useRef, useEffect } from "react";
import { useUser, useOrganization, useClerk } from "@clerk/nextjs";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

// --- MATH RENDERING IMPORTS ---
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

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
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[99999] flex flex-col items-center justify-center p-4 select-none">
      <div className="bg-white p-6 rounded-3xl shadow-2xl max-w-4xl w-full flex flex-col items-center border border-slate-200">
        <h3 className="text-xl font-black text-slate-800 mb-1">Crop Image</h3>
        <p className="text-xs font-bold text-slate-500 mb-6">Click and drag over the image to crop. If you don't drag, the full image will be uploaded.</p>
        
        <div className="relative border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden cursor-crosshair inline-block max-h-[60vh] shadow-inner rounded-xl"
             onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <img ref={imgRef} src={src} alt="To Crop" className="max-h-[60vh] max-w-full pointer-events-none" />
          {crop.w > 0 && crop.h > 0 && (
            <div style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }} 
                 className="absolute border-2 border-indigo-500 bg-indigo-500/30 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
          )}
        </div>
        
        <div className="flex gap-4 mt-8 w-full justify-end">
          <button onClick={onCancel} className="px-6 py-2.5 rounded-xl font-bold text-slate-800 bg-slate-200 hover:bg-slate-300 transition">Cancel</button>
          <button onClick={confirmCrop} className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition flex items-center gap-2">
            <i className="fas fa-crop-alt"></i> Confirm & Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default function OrgCreateMockPage() {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const router = useRouter();
  
  // Security Redirect: If no Org is selected, kick them to the portal
  useEffect(() => {
    if (orgLoaded && !organization) {
      router.push("/org");
    }
  }, [orgLoaded, organization, router]);

  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState([]);
  
  const [expandedQIndex, setExpandedQIndex] = useState(0); 
  const questionRefs = useRef([]); 
  
  // THE NEW VOICE MEMORY LOCK
  const lastSpeechRef = useRef(""); 

  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1); 
  const [isPublishing, setIsPublishing] = useState(false);
  
  // FIXED: Standardized to publishedMockId
  const [publishedMockId, setPublishedMockId] = useState(null);
  const [copiedIframe, setCopiedIframe] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [uploadingCount, setUploadingCount] = useState(0);
  const [listeningField, setListeningField] = useState(null);

  const [cropperState, setCropperState] = useState({ show: false, src: null, file: null, targetQIndex: null, targetType: null, targetOptIndex: null });
  
  // Settings
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [examTitle, setExamTitle] = useState("Corporate Entrance Test");
  const [examCategory, setExamCategory] = useState("General");
  const [duration, setDuration] = useState(60); 
  const [allowCalculator, setAllowCalculator] = useState(true);
  const [availability, setAvailability] = useState("always");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (selectedFile.type === "application/pdf") {
        setPdfUrl(URL.createObjectURL(selectedFile));
      } else {
        setPdfUrl(null); 
      }
    }
  };

  const scrollToQuestion = (index) => {
    setExpandedQIndex(index);
    if (questionRefs.current[index]) {
      questionRefs.current[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // --- THE BULLETPROOF VOICE ENGINE ---
  const toggleDictation = async (qIndex, field, optIndex = null) => {
    try { await navigator.mediaDevices.getUserMedia({ audio: true }); } 
    catch (err) { return showToast("Microphone access denied!", "error"); }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return showToast("Voice typing requires Chrome or Edge.", "error");

    const fieldId = optIndex !== null ? `q-${qIndex}-opt-${optIndex}` : `q-${qIndex}-${field}`;
    
    // Stop logic
    if (listeningField === fieldId) { 
      setListeningField(null); 
      if (window.recognitionInstance) {
        window.recognitionInstance.onresult = null; 
        window.recognitionInstance.stop(); 
      }
      return; 
    }
    
    // Cleanup any hanging listeners
    if (window.recognitionInstance) {
        window.recognitionInstance.onresult = null; 
        window.recognitionInstance.stop();
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; 
    recognition.interimResults = false; 
    recognition.lang = 'en-IN'; 

    recognition.onstart = () => { 
      setListeningField(fieldId); 
      showToast("🎤 Listening...", "success"); 
    };
    
    recognition.onresult = (event) => {
      // 1. Instantly kill the listener
      recognition.onresult = null;
      recognition.stop();
      setListeningField(null);

      const transcript = event.results[0][0].transcript.trim();
      if (!transcript) return;
      
      // THE FIX: If the browser echoes the exact same sentence within 2 seconds, kill it immediately.
      if (lastSpeechRef.current === transcript) return; 
      
      lastSpeechRef.current = transcript;
      setTimeout(() => { lastSpeechRef.current = ""; }, 2000); 
      
      // 2. Create a DEEP copy to prevent React 18 Strict Mode from mutating the state twice
      setQuestions(prev => {
        const updated = [...prev];
        updated[qIndex] = { ...updated[qIndex] };

        if (optIndex !== null) {
          updated[qIndex].options = [...updated[qIndex].options];
          updated[qIndex].options[optIndex] = { ...updated[qIndex].options[optIndex] };
          
          const currentText = prev[qIndex].options[optIndex].text || "";
          if (currentText.trim().endsWith(transcript)) return prev; 
          
          updated[qIndex].options[optIndex].text = currentText ? `${currentText} ${transcript}` : transcript;
        } else {
          const currentText = prev[qIndex][field] || "";
          if (currentText.trim().endsWith(transcript)) return prev; 
          
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
    if (!file) return showToast("Please select a file first.", "warning");
    setIsProcessing(true);
    const formData = new FormData();
    formData.append("pdf", file); formData.append("startPage", startPage); formData.append("endPage", endPage);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed.");
      
      if (data.questions && data.questions.length > 0) {
        const enrichedQuestions = data.questions.map(q => ({
            ...q, marks: 2, negativeMarks: 0.66, 
            correctAnswer: q.type === 'MSQ' && Array.isArray(q.correctAnswer) ? q.correctAnswer : (q.correctAnswer || "A"),
            imageUrl: null, explanationImage: null, 
            options: (q.options || []).map(opt => ({ ...opt, imageUrl: null }))
        }));
        setQuestions(prev => [...prev, ...enrichedQuestions]);
        setExpandedQIndex(questions.length); 
        showToast(`Added ${enrichedQuestions.length} questions!`, "success");
      } else { showToast(`No questions found.`, "warning"); }
    } catch (error) { showToast(`Error: ${error.message}`, "error"); } finally { setIsProcessing(false); }
  };

  const handleAddCustomQuestion = () => {
    setQuestions(prev => {
      const updated = [...prev, { text: "", type: "MCQ", hasImage: false, imageUrl: null, options: [{ id: "A", text: "" }, { id: "B", text: "" }, { id: "C", text: "" }, { id: "D", text: "" }], correctAnswer: "A", explanation: "", marks: 2, negativeMarks: 0.66 }];
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

  const handleCroppedImageUpload = async (croppedFile) => {
    const { targetQIndex, targetType, targetOptIndex } = cropperState;
    setCropperState({ show: false, src: null, file: null, targetQIndex: null, targetType: null, targetOptIndex: null });
    
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
      const fileRef = ref(storage, `mocks/images/${Date.now()}-${compressedFile.name}`);
      const snapshot = await uploadBytes(fileRef, compressedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setQuestions(prev => {
        const updated = [...prev];
        if (targetType === 'option' && targetOptIndex !== null) { if (updated[targetQIndex].options[targetOptIndex].uploadId === uniqueId) { updated[targetQIndex].options[targetOptIndex].imageUrl = downloadURL; updated[targetQIndex].options[targetOptIndex].isUploading = false; } } 
        else if (targetType === 'explanation') { if (updated[targetQIndex].expUploadId === uniqueId) { updated[targetQIndex].explanationImage = downloadURL; updated[targetQIndex].isUploadingExp = false; } } 
        else { if (updated[targetQIndex].qUploadId === uniqueId) { updated[targetQIndex].imageUrl = downloadURL; updated[targetQIndex].isUploadingQ = false; } }
        return updated;
      });
    } catch (error) {
      showToast("Storage failed.", "error");
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
    updated[qIndex] = { ...updated[qIndex], type: newType };
    
    if (newType === 'NAT') { 
      updated[qIndex].options = []; 
      updated[qIndex].correctAnswer = ""; 
    } else { 
      updated[qIndex].options = updated[qIndex].options?.length > 0 ? updated[qIndex].options : [{ id: "A", text: "" }, { id: "B", text: "" }, { id: "C", text: "" }, { id: "D", text: "" }]; 
      if (newType === 'MSQ') {
        updated[qIndex].correctAnswer = Array.isArray(updated[qIndex].correctAnswer) ? updated[qIndex].correctAnswer : [];
      } else {
        updated[qIndex].correctAnswer = typeof updated[qIndex].correctAnswer === 'string' ? updated[qIndex].correctAnswer : "A";
      }
    }
    setQuestions(updated);
  };

  const toggleMsqAnswer = (qIndex, optId) => {
    const updated = [...questions]; 
    updated[qIndex] = { ...updated[qIndex] };
    
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
    updated[qIndex] = { ...updated[qIndex], [field]: value }; 
    setQuestions(updated); 
  };
  
  const updateOptionText = (qIndex, optIndex, newText) => { 
    const updated = [...questions]; 
    updated[qIndex] = { ...updated[qIndex] };
    updated[qIndex].options = [...updated[qIndex].options];
    updated[qIndex].options[optIndex] = { ...updated[qIndex].options[optIndex], text: newText };
    setQuestions(updated); 
  };

  const requestRemoveQuestion = (index) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      setQuestions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const generateSolution = async (qIndex) => {
    const q = questions[qIndex];
    if (!q.text) return showToast("Question is empty!", "warning");
    showToast("✨ AI is solving this question...", "success");
    setTimeout(() => {
      const updated = [...questions];
      updated[qIndex] = { 
        ...updated[qIndex], 
        explanation: `Let's solve this step-by-step:\n\n1. Analyze the given parameters.\n2. Apply the correct formula.\n3. The final answer is **${q.correctAnswer}**.` 
      };
      setQuestions(updated);
      showToast("Solution Generated!", "success");
    }, 1500);
  };

  const saveToDatabase = async () => {
    if (questions.length === 0) return showToast("No questions to save!", "warning");
    setIsPublishing(true);
    try {
      const mockRef = await addDoc(collection(db, "mocks"), {
        creatorId: user.id, 
        orgId: organization.id, 
        orgName: organization.name, 
        orgLogo: organization.imageUrl || null,
        title: examTitle, 
        examCategory: examCategory,
        duration: Number(duration),
        allowCalculator: allowCalculator,
        availability: availability,
        createdAt: new Date(), 
        status: "published", 
        isWhiteLabel: true 
      });

      const questionsRef = collection(db, "mocks", mockRef.id, "questions");
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await addDoc(questionsRef, { ...q, section: "General" });
      }
      // FIXED: Using publishedMockId uniformly
      setPublishedMockId(mockRef.id);
    } catch (error) { showToast("Failed to save enterprise mock.", "error"); } finally { setIsPublishing(false); }
  };

  const copyIframeCode = () => {
    const iframeCode = `<iframe \n  src="${baseUrl}/embed/exam/${publishedMockId}" \n  width="100%" \n  height="800px" \n  style="border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);" \n  allow="camera; microphone; fullscreen"\n></iframe>`;
    navigator.clipboard.writeText(iframeCode);
    setCopiedIframe(true);
    setTimeout(() => setCopiedIframe(false), 3000);
  };

  if (!userLoaded || !orgLoaded || !organization) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;

  return (
    <div className="flex h-screen bg-slate-100 font-sans relative overflow-hidden">
      
      {/* FLOATING QUICK-JUMP PALETTE */}
      {questions.length > 0 && (
        <div className="fixed bottom-6 left-6 bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 z-[90] max-w-[280px] hidden md:block">
          <div className="flex justify-between items-center mb-3">
             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest"><i className="fas fa-th-large mr-1"></i> Quick Jump</h4>
             <span className="text-[10px] font-bold text-slate-400">{questions.length} Qs</span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-1">
            {questions.map((_, i) => (
              <button 
                key={i} onClick={() => scrollToQuestion(i)}
                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all flex items-center justify-center border-2 
                  ${expandedQIndex === i ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-white'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {toast.show && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-2xl z-[9999] flex items-center gap-3 text-sm font-bold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          <i className="fas fa-info-circle"></i> {toast.message}
        </div>
      )}

      {/* --- EXAM SETTINGS MODAL --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h3 className="text-xl font-black text-slate-800"><i className="fas fa-cog text-indigo-500 mr-2"></i> Exam Settings</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-rose-500 transition hover:bg-rose-50 w-8 h-8 rounded-full flex items-center justify-center"><i className="fas fa-times text-lg"></i></button>
            </div>
            
            <div className="space-y-5">
               <div>
                 <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">Write Exam Name / Category</label>
                 <input 
                   type="text" 
                   value={examCategory} 
                   onChange={(e) => setExamCategory(e.target.value)} 
                   placeholder="e.g. Weekly Test, GATE ECE" 
                   className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500" 
                 />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">Duration (Mins)</label>
                   <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500"/>
                 </div>
                 <div>
                   <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">Availability</label>
                   <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500">
                     <option value="always">Always Available</option>
                     <option value="12h">For 12 Hours</option>
                     <option value="24h">For 24 Hours</option>
                   </select>
                 </div>
               </div>

               <div>
                 <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">Scientific Calculator</label>
                 <div onClick={() => setAllowCalculator(!allowCalculator)} className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${allowCalculator ? "bg-emerald-50 border-emerald-400" : "bg-slate-50 border-slate-300"}`}>
                   <span className="text-sm font-bold text-slate-900">{allowCalculator ? "Enabled for Students" : "Disabled"}</span>
                   <div className={`w-10 h-5 rounded-full relative transition-colors shadow-inner ${allowCalculator ? "bg-emerald-500" : "bg-slate-400"}`}>
                     <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform shadow-md ${allowCalculator ? "translate-x-[22px]" : "translate-x-[3px]"}`}></div>
                   </div>
                 </div>
               </div>
            </div>
            
            <button onClick={() => setShowSettingsModal(false)} className="w-full mt-8 bg-indigo-600 text-white py-3.5 rounded-xl font-black hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition hover:-translate-y-0.5">
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* --- B2B IFRAME GENERATOR MODAL --- */}
      {/* FIXED: We now check for publishedMockId */}
      {publishedMockId && (
        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            
            <div className="bg-indigo-600 p-8 text-center text-white relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <div className="w-16 h-16 bg-emerald-400 text-white rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg relative z-10"><i className="fas fa-check"></i></div>
              <h2 className="text-3xl font-black relative z-10">Exam Deployed!</h2>
              <p className="text-indigo-200 mt-2 font-medium relative z-10">Your white-label exam is securely stored on OZONE servers.</p>
            </div>

            <div className="p-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                <i className="fas fa-code text-indigo-500"></i> Embed on your Website
              </h3>
              <p className="text-xs font-bold text-slate-500 mb-4">
                Give this code to your IT team. Paste it into any WordPress, Notion, or LMS platform. The exam will run natively inside your site with your school's branding.
              </p>

              <div className="relative group">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl pointer-events-none"></div>
                <pre className="bg-slate-900 text-emerald-400 p-5 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap shadow-inner border border-slate-800">
{`<iframe 
  src="${baseUrl}/embed/exam/${publishedMockId}" 
  width="100%" 
  height="800px" 
  style="border: 1px solid #e2e8f0; border-radius: 12px;" 
  allow="camera; microphone; fullscreen"
></iframe>`}
                </pre>
                <button onClick={copyIframeCode} className={`absolute top-4 right-4 px-4 py-2 rounded-lg text-xs font-bold shadow-md transition-all flex items-center gap-2 ${copiedIframe ? 'bg-emerald-500 text-white' : 'bg-white text-slate-800 hover:bg-indigo-50 hover:text-indigo-700'}`}>
                  {copiedIframe ? <><i className="fas fa-check"></i> Copied!</> : <><i className="far fa-copy"></i> Copy HTML</>}
                </button>
              </div>

              <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100">
                <button onClick={() => window.open(`${baseUrl}/embed/exam/${publishedMockId}`, '_blank')} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-bold transition flex justify-center items-center gap-2">
                  <i className="fas fa-external-link-alt"></i> Preview Exam
                </button>
                <button onClick={() => router.push('/org/dashboard')} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-md transition">
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CROPPER MODAL */}
      {cropperState.show && (
        <ImageCropperModal src={cropperState.src} onCrop={handleCroppedImageUpload} onCancel={() => setCropperState({ show: false, src: null, file: null, targetQIndex: null, targetType: null, targetOptIndex: null })} />
      )}

      {/* --- CORRECTED SIDEBAR FOR B2B ORG DASHBOARD --- */}
      <aside className="w-16 md:w-64 bg-slate-900 text-white flex flex-col shrink-0 z-50 transition-all border-r border-slate-800">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-800">
          <img src={organization.imageUrl} alt="Org" className="w-8 h-8 rounded-md bg-white p-0.5" />
          <span className="hidden md:block ml-3 font-black tracking-tight text-sm truncate">{organization.name}</span>
        </div>
        <nav className="flex-1 p-3 space-y-2 mt-4">
            <button onClick={() => router.push('/org/dashboard')} className="w-full flex items-center justify-center md:justify-start gap-3 text-slate-400 hover:bg-slate-800 p-3 rounded-xl transition">
                <i className="fas fa-home text-lg"></i> <span className="hidden md:block font-bold text-sm">Dashboard</span>
            </button>
            <button className="w-full flex items-center justify-center md:justify-start gap-3 bg-indigo-600 text-white p-3 rounded-xl shadow-md">
                <i className="fas fa-file-pdf text-indigo-200 text-lg"></i> <span className="hidden md:block font-bold text-sm">White-Label Exams</span>
            </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 h-16 px-6 flex justify-between items-center z-20 shrink-0 shadow-sm">
          <input type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} className="text-lg font-black text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none w-full max-w-sm transition-colors" placeholder="Exam Title" />
          
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSettingsModal(true)} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-200 transition flex items-center gap-2 border border-slate-200">
              <i className="fas fa-cog"></i> <span className="hidden sm:block">Settings</span>
            </button>
            <button onClick={saveToDatabase} disabled={questions.length === 0 || uploadingCount > 0 || isPublishing} className="bg-indigo-900 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-800 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isPublishing ? "Deploying..." : "Publish & Get Embed Code"} <i className="fas fa-code"></i>
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          
          <div className={`transition-all duration-500 ease-in-out border-r border-slate-300 bg-slate-200 flex flex-col relative ${pdfUrl ? 'w-1/2' : 'w-0 opacity-0 overflow-hidden'}`}>
            <div className="h-12 bg-slate-800 text-white flex items-center justify-between px-4 shrink-0 shadow-md z-10">
              <span className="text-xs font-bold truncate flex-1"><i className="fas fa-file-pdf text-rose-400 mr-2"></i> {file?.name}</span>
            </div>
            {pdfUrl && <iframe src={`${pdfUrl}#toolbar=0`} className="w-full flex-1 border-none" title="PDF Viewer" />}
          </div>

          <div className={`flex-1 flex flex-col bg-slate-50 transition-all duration-500 overflow-hidden ${pdfUrl ? 'w-1/2' : 'w-full'}`}>
            
            <div className="bg-white p-4 border-b border-slate-200 shrink-0 shadow-sm flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <label className="bg-slate-100 border border-slate-300 text-slate-800 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-200 transition">
                  <i className="fas fa-upload mr-2 text-slate-600"></i> Upload PDF
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
                </label>
                
                <label className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-100 transition">
                  <i className="fas fa-camera mr-2 text-indigo-600"></i> Scan Phone
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                    const imgFile = e.target.files[0];
                    if (imgFile) { setFile(imgFile); setPdfUrl(null); showToast("Photo captured! Please use 'Extract Qs' or crop manually.", "success"); }
                  }} />
                </label>

                <div className="h-6 w-px bg-slate-300 mx-2"></div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <input type="number" value={startPage} onChange={e => setStartPage(e.target.value)} className="w-10 text-center text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded py-1 outline-none"/>
                  <span className="text-[10px] text-slate-600 font-bold">to</span>
                  <input type="number" value={endPage} onChange={e => setEndPage(e.target.value)} className="w-10 text-center text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded py-1 outline-none"/>
                </div>
                <button onClick={handleExtract} disabled={!file || isProcessing} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50 transition">
                  {isProcessing ? <><i className="fas fa-spinner fa-spin"></i> Extracting</> : "Extract Qs"}
                </button>
              </div>

              <button onClick={handleAddCustomQuestion} className="text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg text-xs font-bold border border-emerald-300 hover:bg-emerald-100 transition shadow-sm">
                <i className="fas fa-plus mr-1"></i> Blank Q
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <div className="max-w-4xl mx-auto space-y-4 pb-32">
                
                {questions.length === 0 ? (
                  <div className="mt-20 flex flex-col items-center justify-center text-slate-500 text-center">
                    <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center text-4xl mb-4"><i className="fas fa-building"></i></div>
                    <h3 className="text-lg font-black text-slate-700 mb-1">Corporate Exam Studio</h3>
                    <p className="text-sm font-medium max-w-md text-slate-500">Upload a PDF to extract questions. When published, we will generate an HTML snippet to embed on your institution's website.</p>
                  </div>
                ) : (
                  questions.map((q, qIndex) => {
                    const isExpanded = expandedQIndex === qIndex;

                    return (
                      <div key={qIndex} ref={el => questionRefs.current[qIndex] = el} className={`bg-white border rounded-2xl transition-all duration-200 overflow-hidden ${isExpanded ? 'border-indigo-400 shadow-xl ring-4 ring-indigo-50/50' : 'border-slate-200 shadow-sm hover:border-slate-300'}`}>
                        
                        <div onClick={() => setExpandedQIndex(isExpanded ? null : qIndex)} className={`p-4 flex items-center gap-4 cursor-pointer select-none transition-colors ${isExpanded ? 'bg-indigo-50/50 border-b border-indigo-100' : 'hover:bg-slate-50'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{qIndex + 1}</div>
                          <div className="flex-1 min-w-0 flex items-center gap-3">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">{q.type}</span>
                            <div className="text-sm font-bold text-slate-900 truncate overflow-hidden whitespace-nowrap"><Latex>{q.text || "Empty Question..."}</Latex></div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); requestRemoveQuestion(qIndex); }} className="text-slate-400 hover:text-rose-600 transition px-2"><i className="fas fa-trash"></i></button>
                        </div>

                        {isExpanded && (
                          <div className="p-5 bg-white">
                            
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                               <div className="flex gap-4">
                                  <select value={q.type || "MCQ"} onChange={(e) => handleTypeChange(qIndex, e.target.value)} className="bg-slate-50 border border-slate-300 rounded-lg text-xs px-3 py-1.5 font-bold text-slate-900 outline-none focus:border-indigo-400 cursor-pointer shadow-sm">
                                      <option value="MCQ">MCQ</option> <option value="MSQ">MSQ</option> <option value="NAT">NAT</option>
                                  </select>
                                  <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                                    <span className="text-[10px] font-black text-emerald-700 uppercase">+ Mk:</span>
                                    <input type="number" step="0.5" value={q.marks} onChange={(e) => updateQuestionField(qIndex, 'marks', e.target.value)} className="w-14 bg-white border border-slate-300 rounded text-xs px-2 py-1 text-center font-black text-slate-900 outline-none shadow-sm focus:border-emerald-500"/>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-rose-700 uppercase">- Mk:</span>
                                    <input type="number" step="0.1" value={q.negativeMarks} onChange={(e) => updateQuestionField(qIndex, 'negativeMarks', e.target.value)} className="w-14 bg-white border border-slate-300 rounded text-xs px-2 py-1 text-center font-black text-slate-900 outline-none shadow-sm focus:border-rose-500"/>
                                  </div>
                               </div>
                               
                               <label className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200 cursor-pointer hover:bg-indigo-100 hover:shadow-md transition inline-flex items-center gap-1.5 shadow-sm">
                                 <i className="fas fa-crop-alt"></i> Upload Diagram
                                 <input type="file" accept="image/*" className="hidden" onChange={(e) => initiateImageUpload(e.target.files[0], qIndex, 'question')} />
                               </label>
                            </div>

                            {q.imageUrl && (
                              <div className="relative rounded-xl border border-slate-300 overflow-hidden bg-slate-100 p-2 inline-block mb-4 shadow-inner">
                                <button onClick={() => removeImage(qIndex, 'question')} className="absolute top-2 right-2 bg-rose-600/90 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] z-20 hover:scale-110 shadow-md"><i className="fas fa-times"></i></button>
                                {q.isUploadingQ && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"><i className="fas fa-spinner fa-spin text-indigo-600 text-2xl"></i></div>}
                                <img src={q.imageUrl} alt="Q" className={`max-h-48 mx-auto object-contain rounded ${q.isUploadingQ ? 'opacity-30 blur-sm' : ''}`} />
                              </div>
                            )}

                            <div className="mb-3 p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 shadow-sm">
                              <span className="text-[9px] font-black uppercase text-emerald-700 block mb-1">Student Preview</span>
                              <div className="text-sm font-bold text-slate-900 leading-relaxed"><Latex>{q.text || "Type your question below..."}</Latex></div>
                            </div>

                            <div className="relative mb-6 mt-2">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Question Code Editor (Raw Text & Math)</label>
                              <textarea 
                                value={q.text} onChange={(e) => updateQuestionField(qIndex, 'text', e.target.value)} onPaste={(e) => handlePaste(e, qIndex, 'question')}
                                placeholder="Type your question here..." 
                                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 pr-12 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:bg-white outline-none resize-y min-h-[80px] shadow-inner transition-shadow" 
                              />
                              <button onClick={() => toggleDictation(qIndex, 'text')} className={`absolute bottom-3 right-3 p-2 rounded-lg transition-colors shadow-sm border ${listeningField === `q-${qIndex}-text` ? 'bg-rose-100 text-rose-600 border-rose-300 animate-pulse' : 'bg-white text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}`}>
                                <i className="fas fa-microphone"></i>
                              </button>
                            </div>

                            {q.type === 'NAT' ? (
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 mb-6 shadow-inner">
                                <label className="block text-[10px] font-black text-slate-600 mb-2 uppercase">Numerical Answer</label>
                                <input type="text" value={q.correctAnswer || ''} onChange={(e) => updateQuestionField(qIndex, 'correctAnswer', e.target.value)} className="w-full max-w-xs bg-white border border-slate-300 rounded-lg p-3 text-sm font-black text-slate-900 outline-none focus:border-indigo-500 shadow-sm" />
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {q.options?.map((opt, optIndex) => {
                                  const isCorrect = q.type === 'MSQ' 
                                    ? (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id)) 
                                    : q.correctAnswer === opt.id;
                                    
                                  return (
                                    <div key={optIndex} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${isCorrect ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}>
                                      <input 
                                        type={q.type === 'MSQ' ? "checkbox" : "radio"} 
                                        checked={isCorrect} 
                                        onChange={() => q.type === 'MSQ' ? toggleMsqAnswer(qIndex, opt.id) : updateQuestionField(qIndex, 'correctAnswer', opt.id)} 
                                        className="mt-2 w-4 h-4 accent-emerald-600 cursor-pointer" 
                                      />
                                      <div className="flex-1 min-w-0">
                                        
                                        <div className="relative mb-2">
                                          <input type="text" value={opt.text} onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)} onPaste={(e) => handlePaste(e, qIndex, 'option', optIndex)} placeholder={`Option ${opt.id}...`} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 pr-10 text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none shadow-sm" />
                                          <button onClick={() => toggleDictation(qIndex, 'option', optIndex)} className={`absolute top-1.5 right-1.5 p-1.5 rounded transition border ${listeningField === `q-${qIndex}-opt-${optIndex}` ? 'bg-rose-100 text-rose-600 border-rose-200 animate-pulse' : 'bg-slate-100 text-slate-400 border-transparent hover:text-indigo-600 hover:bg-white hover:border-slate-200'}`}>
                                            <i className="fas fa-microphone"></i>
                                          </button>
                                        </div>

                                        <div className="flex items-center justify-between mt-1 px-1 gap-2">
                                           <div className="text-[10px] font-black text-slate-700 truncate overflow-hidden"><Latex>{opt.text}</Latex></div>
                                           <label className="shrink-0 text-[10px] font-black text-indigo-700 cursor-pointer hover:bg-indigo-100 transition bg-indigo-50 px-2 py-1 rounded border border-indigo-200 shadow-sm">
                                             <i className="fas fa-image mr-1"></i> Add Image
                                             <input type="file" accept="image/*" className="hidden" onChange={(e) => initiateImageUpload(e.target.files[0], qIndex, 'option', optIndex)} />
                                           </label>
                                        </div>

                                        {opt.imageUrl && (
                                          <div className="relative mt-2 inline-block border border-slate-300 rounded-lg bg-slate-100 p-1 shadow-inner">
                                             <button onClick={() => removeImage(qIndex, 'option', optIndex)} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-md hover:scale-110"><i className="fas fa-times"></i></button>
                                             {opt.isUploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"><i className="fas fa-spinner fa-spin text-indigo-600 text-xs"></i></div>}
                                             <img src={opt.imageUrl} className={`max-h-20 object-contain rounded ${opt.isUploading ? 'opacity-30' : ''}`} />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-indigo-800 text-[10px] font-black uppercase tracking-wide"><i className="fas fa-lightbulb mr-1"></i> Solution</span>
                                <div className="flex gap-2">
                                  <label className="bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer">
                                    <i className="fas fa-image"></i> Attach Image
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => initiateImageUpload(e.target.files[0], qIndex, 'explanation')} />
                                  </label>
                                  <button onClick={() => generateSolution(qIndex)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1.5">
                                    <i className="fas fa-wand-magic-sparkles"></i> AI Solve
                                  </button>
                                </div>
                              </div>
                              <textarea 
                                value={q.explanation || ""} onChange={(e) => updateQuestionField(qIndex, 'explanation', e.target.value)} onPaste={(e) => handlePaste(e, qIndex, 'explanation')}
                                className="w-full bg-white border border-indigo-200 rounded-lg p-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 resize-y min-h-[60px] shadow-inner transition-shadow" 
                                placeholder="Type explanation, or click 'AI Solve' above..." 
                              />
                              
                              {q.explanationImage && (
                                <div className="relative mt-3 inline-block border border-slate-300 rounded-lg bg-slate-100 p-2 shadow-inner">
                                   <button onClick={() => removeImage(qIndex, 'explanation')} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] shadow-md hover:scale-110 z-20"><i className="fas fa-times"></i></button>
                                   {q.isUploadingExp && <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10"><i className="fas fa-spinner fa-spin text-indigo-600 text-lg"></i></div>}
                                   <img src={q.explanationImage} className={`max-h-32 object-contain rounded ${q.isUploadingExp ? 'opacity-30' : ''}`} />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}