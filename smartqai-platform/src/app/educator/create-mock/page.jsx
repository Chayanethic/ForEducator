"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

// --- MATH RENDERING IMPORTS ---
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// --- COMPONENTS ---
import EducatorTour from "@/components/EducatorTour";
import GuestBlocker from "@/components/GuestBlocker";

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
          <button onClick={confirmCrop} className="px-8 py-3 rounded-xl font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 hover:-translate-y-0.5 w-full sm:w-auto">
            <i className="fas fa-crop-alt"></i> Confirm & Upload
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CreateMockPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState([]);
  
  const [expandedQIndex, setExpandedQIndex] = useState(0); 
  const questionRefs = useRef([]); 
  const voiceLock = useRef(false);

  const [startPage, setStartPage] = useState(1);
  const [endPage, setEndPage] = useState(1); 
  const [generateExplanations, setGenerateExplanations] = useState(false);
  
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedRoomId, setPublishedRoomId] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  
  const [uploadingCount, setUploadingCount] = useState(0);
  const [listeningField, setListeningField] = useState(null);

  const [cropperState, setCropperState] = useState({ show: false, src: null, file: null, targetQIndex: null, targetType: null, targetOptIndex: null });
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  // --- SETTINGS STATE ---
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [examTitle, setExamTitle] = useState("Custom Mock Exam");
  const [examCategory, setExamCategory] = useState("GATE ECE");
  const [duration, setDuration] = useState(60); 
  const [allowCalculator, setAllowCalculator] = useState(true);
  const [visibility, setVisibility] = useState("private"); 
  const [availability, setAvailability] = useState("always");
  const [examSections, setExamSections] = useState([{ name: "General", count: 0 }]);

  // ⚡ SECURITY SETTINGS ⚡
  const [blockMobile, setBlockMobile] = useState(true);
  const [blockMultiple, setBlockMultiple] = useState(true);
  const [blockTabSwitch, setBlockTabSwitch] = useState(true);
  const [enableWatermark, setEnableWatermark] = useState(true);
  const [spotlightMode, setSpotlightMode] = useState(false);

  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showDeployConfirm, setShowDeployConfirm] = useState(false);

  const isAllStrict = blockMobile && blockMultiple && blockTabSwitch && enableWatermark && spotlightMode;

  const toggleAllSecurity = () => {
    const newState = !isAllStrict;
    setBlockMobile(newState);
    setBlockMultiple(newState);
    setBlockTabSwitch(newState);
    setEnableWatermark(newState);
    setSpotlightMode(newState);
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 4000);
  };

  useEffect(() => {
    if (isLoaded) {
      const draftKey = `ozone_mock_draft_${user?.id || 'guest'}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.questions && parsed.questions.length > 0) {
            setQuestions(parsed.questions);
            if (parsed.examTitle) setExamTitle(parsed.examTitle);
            if (parsed.examCategory) setExamCategory(parsed.examCategory);
            if (parsed.duration) setDuration(parsed.duration);
            if (parsed.allowCalculator !== undefined) setAllowCalculator(parsed.allowCalculator);
            if (parsed.visibility) setVisibility(parsed.visibility);
            if (parsed.availability) setAvailability(parsed.availability);
            
            if (parsed.blockMobile !== undefined) setBlockMobile(parsed.blockMobile);
            if (parsed.blockMultiple !== undefined) setBlockMultiple(parsed.blockMultiple);
            if (parsed.blockTabSwitch !== undefined) setBlockTabSwitch(parsed.blockTabSwitch);
            if (parsed.enableWatermark !== undefined) setEnableWatermark(parsed.enableWatermark);
            if (parsed.spotlightMode !== undefined) setSpotlightMode(parsed.spotlightMode);

            showToast("Workspace restored from draft!", "success");
          }
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }
    }
  }, [user, isLoaded]);

  const handleBackNavigation = () => {
    if (questions.length > 0) {
      setShowDraftModal(true);
    } else {
      router.push('/educator/dashboard');
    }
  };

  const saveDraftAndLeave = () => {
    const draftData = {
      examTitle, examCategory, duration, allowCalculator, visibility, availability, questions,
      blockMobile, blockMultiple, blockTabSwitch, enableWatermark, spotlightMode
    };
    localStorage.setItem(`ozone_mock_draft_${user?.id || 'guest'}`, JSON.stringify(draftData));
    router.push('/educator/dashboard');
  };

  const discardDraftAndLeave = () => {
    localStorage.removeItem(`ozone_mock_draft_${user?.id || 'guest'}`);
    setQuestions([]);
    router.push('/educator/dashboard');
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

  const parseCSV = (text) => {
    const result = [];
    let row = [];
    let inQuotes = false;
    let val = "";
    for (let i = 0; i < text.length; i++) {
      let char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (i < text.length - 1 && text[i + 1] === '"') { val += '"'; i++; } 
          else { inQuotes = false; }
        } else { val += char; }
      } else {
        if (char === '"') { inQuotes = true; }
        else if (char === ',') { row.push(val); val = ""; }
        else if (char === '\n' || char === '\r') {
          row.push(val); val = "";
          if (row.length > 1 || row[0] !== "") result.push(row);
          row = [];
          if (char === '\r' && i < text.length - 1 && text[i + 1] === '\n') i++; 
        } else { val += char; }
      }
    }
    if (val || row.length > 0) { row.push(val); result.push(row); }
    return result;
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvData = parseCSV(event.target.result);
        const parsedQs = [];

        let ansIdx = 6; let marksIdx = 7; let negMarksIdx = 8; let expIdx = 9;
        const headerRow = csvData.find(row => row.some(cell => typeof cell === 'string' && cell.toLowerCase().includes('question text')));
        
        if (headerRow) {
            ansIdx = headerRow.findIndex(cell => typeof cell === 'string' && cell.toLowerCase().includes('correct answer'));
            marksIdx = headerRow.findIndex(cell => typeof cell === 'string' && cell.toLowerCase().includes('positive marks'));
            negMarksIdx = headerRow.findIndex(cell => typeof cell === 'string' && cell.toLowerCase().includes('negative marks'));
            expIdx = headerRow.findIndex(cell => typeof cell === 'string' && cell.toLowerCase().includes('explanation'));
            
            if (ansIdx === -1) ansIdx = 6;
            if (marksIdx === -1) marksIdx = ansIdx + 1;
            if (negMarksIdx === -1) negMarksIdx = ansIdx + 2;
            if (expIdx === -1) expIdx = ansIdx + 3;
        }

        const maxPossibleOptions = Math.max(4, ansIdx - 2); 

        for (let i = 0; i < csvData.length; i++) {
          let row = csvData[i];
          
          if (row.length < 2 || !row[1] || row[1].trim() === "") continue; 
          if (row[0].toUpperCase().includes("INSTRUCTION") || row[1].toLowerCase().includes("question text")) continue;

          const qType = row[0]?.toUpperCase().trim();
          if (!['MCQ', 'MSQ', 'NAT'].includes(qType)) continue;

          const qText = row[1] || '';
          let parsedOptions = [];
          let correctAns = "";
          let marks = 2;
          let negMarks = 0.66;
          let explanation = "";

          if (qType === 'NAT') {
            correctAns = row[ansIdx]?.trim() || '';
            marks = parseFloat(row[marksIdx]) || 2;
            negMarks = parseFloat(row[negMarksIdx]) || 0;
            explanation = row[expIdx] || '';
          } else {
            let lastValidOpt = -1;
            for (let j = 0; j < maxPossibleOptions; j++) {
               if ((row[2 + j] || '').trim() !== '') lastValidOpt = j;
            }
            
            const optionsToCreate = Math.max(4, lastValidOpt + 1);

            for (let j = 0; j < optionsToCreate; j++) {
              parsedOptions.push({
                id: String.fromCharCode(65 + j),
                text: (row[2 + j] || '').trim(),
                imageUrl: null
              });
            }
            
            correctAns = row[ansIdx]?.trim().toUpperCase() || '';
            marks = parseFloat(row[marksIdx]) || 2;
            negMarks = parseFloat(row[negMarksIdx]) || 0.66;
            explanation = row[expIdx] || '';
          }

          if (qType === 'MSQ') {
              correctAns = correctAns.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
          }

          parsedQs.push({
            text: qText,
            type: qType,
            hasImage: false,
            imageUrl: null,
            options: parsedOptions,
            correctAnswer: correctAns,
            explanation: explanation,
            explanationImage: null,
            marks: marks,
            negativeMarks: negMarks,
            isGeneratingOptions: false,
            isGeneratingSolution: false
          });
        }

        if (parsedQs.length > 0) {
          setQuestions(prev => [...prev, ...parsedQs]);
          setExpandedQIndex(questions.length); 
          showToast(`Successfully extracted ${parsedQs.length} questions!`, "success");
        } else {
          showToast("No valid questions found. Ensure Column A is MCQ, MSQ, or NAT.", "warning");
        }
      } catch (error) {
        console.error(error);
        showToast("Failed to parse CSV. Please check the format.", "error");
      } finally {
        setIsProcessing(false);
        e.target.value = null; 
      }
    };
    reader.readAsText(file);
  };

  const downloadCsvTemplate = () => {
    const instructions = [
      "🛑 INSTRUCTIONS (DO NOT EDIT OR DELETE HEADERS)",
      "1. Column A MUST be either MCQ, MSQ, or NAT.",
      "2. To add more options (like Option F, Option G), just insert new columns BEFORE the 'Correct Answer' column.",
      "3. For NAT (Numerical Answer Type), leave all Option columns blank.",
      "4. For MSQ (Multiple Select), separate correct answers with commas (e.g. A,C,E)",
      "5. Save as .csv and upload.",
      "", "", "", "", ""
    ];

    const headers = [
      "📝 Type (MCQ/MSQ/NAT)",
      "❓ Question Text",
      "🅰️ Option A",
      "🅱️ Option B",
      "©️ Option C",
      "🎯 Option D",
      "✨ Option E",
      "✅ Correct Answer (e.g. A or A,C)",
      "➕ Positive Marks",
      "➖ Negative Marks",
      "💡 Explanation (Optional)"
    ];

    const example1 = ["MCQ", "What is the capital of India?", "Mumbai", "New Delhi", "Chennai", "Kolkata", "", "B", "2", "0.66", "New Delhi is the capital."];
    const example2 = ["MSQ", "Which of these are programming languages?", "Python", "HTML", "Java", "CSS", "C++", "A,C,E", "2", "0", "Python, Java, and C++ are programming languages."];
    const example3 = ["MCQ", "Which planet is closest to the sun?", "Venus", "Earth", "Mars", "Mercury", "Jupiter", "D", "1", "0.33", "Mercury is the closest planet."];
    const example4 = ["NAT", "Calculate: 15 + 27", "", "", "", "", "", "42", "2", "0", "Simple addition."];
    
    const emptyRow = ["MCQ", "", "", "", "", "", "", "", "2", "0.66", ""];

    const csvContent = [
      instructions.map(e => `"${e}"`).join(","),
      headers.map(h => `"${h}"`).join(","),
      example1.map(e => `"${e}"`).join(","),
      example2.map(e => `"${e}"`).join(","),
      example3.map(e => `"${e}"`).join(","),
      example4.map(e => `"${e}"`).join(","),
      emptyRow.map(e => `"${e}"`).join(","),
      emptyRow.map(e => `"${e}"`).join(",")
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Ozone_Bulk_Upload_Template.csv";
    link.click();
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

  // ⚡ GUEST MODE SIMULATION FOR AI EXTRACT ⚡
  const handleExtract = async (e) => {
    e.preventDefault();
    if (!file) return showToast("Please select a PDF file first.", "warning");

    setIsProcessing(true);

    if (!user) {
      setTimeout(() => {
        const dummyQs = [
          { text: "Based on the uploaded document, what is the primary function of the core architecture?", type: "MCQ", options: [{id:"A", text:"Data routing"}, {id:"B", text:"State management"}, {id:"C", text:"Process termination"}, {id:"D", text:"Redundancy"}], correctAnswer: "B", marks: 2, negativeMarks: 0.66, imageUrl: null, explanationImage: null, isGeneratingOptions: false, isGeneratingSolution: false },
          { text: "Identify the false statement regarding the module parameters.", type: "MCQ", options: [{id:"A", text:"It requires async operations"}, {id:"B", text:"It is synchronous only"}, {id:"C", text:"It returns a Promise"}, {id:"D", text:"None of the above"}], correctAnswer: "B", marks: 2, negativeMarks: 0.66, imageUrl: null, explanationImage: null, isGeneratingOptions: false, isGeneratingSolution: false }
        ];
        setQuestions(prev => [...prev, ...dummyQs]);
        setExpandedQIndex(questions.length);
        setIsProcessing(false);
        showToast("Extracted 2 questions! (Guest Simulation)", "success");
      }, 2500);
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file); 
    formData.append("startPage", startPage); 
    formData.append("endPage", endPage);
    formData.append("generateExplanations", generateExplanations);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Extraction failed.");
      
      if (data.questions && data.questions.length > 0) {
        const enrichedQuestions = data.questions.map(q => ({
            ...q, marks: 2, negativeMarks: 0.66,
            correctAnswer: q.correctAnswer || "A",
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
      const updated = [...prev, {
        text: "", type: "MCQ", hasImage: false, imageUrl: null,
        options: [{ id: "A", text: "" }, { id: "B", text: "" }, { id: "C", text: "" }, { id: "D", text: "" }],
        correctAnswer: "A", explanation: "", explanationImage: null, marks: 2, negativeMarks: 0.66,
        isGeneratingOptions: false, isGeneratingSolution: false
      }];
      setExpandedQIndex(updated.length - 1); 
      return updated;
    });
    setTimeout(() => scrollToQuestion(questions.length), 100); 
  };

  const addOption = (qIndex) => {
    setQuestions(prev => {
        const updated = [...prev];
        const currentOptions = updated[qIndex].options || [];
        if (currentOptions.length >= 10) {
            showToast("Maximum of 10 options allowed.", "warning");
            return updated;
        }
        const nextId = String.fromCharCode(65 + currentOptions.length); 
        updated[qIndex].options.push({ id: nextId, text: "", imageUrl: null });
        return updated;
    });
  };

  const removeOption = (qIndex, optIndex) => {
    setQuestions(prev => {
        const updated = [...prev];
        updated[qIndex].options.splice(optIndex, 1);
        
        updated[qIndex].options.forEach((opt, idx) => {
            opt.id = String.fromCharCode(65 + idx);
        });
        
        if (updated[qIndex].type === 'MCQ') {
           const validIds = updated[qIndex].options.map(o => o.id);
           if (!validIds.includes(updated[qIndex].correctAnswer)) {
               updated[qIndex].correctAnswer = validIds[0] || "";
           }
        }
        return updated;
    });
  };

  const initiateImageUpload = (imageFile, qIndex, type = 'question', optIndex = null) => {
    if (!imageFile) return;
    const objectUrl = URL.createObjectURL(imageFile);
    setCropperState({ show: true, src: objectUrl, file: imageFile, targetQIndex: qIndex, targetType: type, targetOptIndex: optIndex });
  };

  const handleCroppedImageUpload = async (croppedFile) => {
    const { targetQIndex, targetType, targetOptIndex } = cropperState;
    setCropperState({ show: false, src: null, file: null, targetQIndex: null, targetType: null, targetOptIndex: null });
    
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      showToast("Cloudinary configuration missing in env!", "error");
      return;
    }
    
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

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

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
    const updated = [...questions]; updated[qIndex].type = newType;
    if (newType === 'NAT') { updated[qIndex].options = []; updated[qIndex].correctAnswer = ""; } 
    else { 
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

  const updateQuestionField = (qIndex, field, value) => { const updated = [...questions]; updated[qIndex][field] = value; setQuestions(updated); };
  const updateOptionText = (qIndex, optIndex, newText) => { const updated = [...questions]; updated[qIndex].options[optIndex].text = newText; setQuestions(updated); };

  const requestRemoveQuestion = (index) => {
    setConfirmDialog({
      title: "Delete Question?",
      message: "Are you sure you want to remove this question? This action cannot be undone.",
      onConfirm: () => {
        setQuestions(prev => {
          const updated = prev.filter((_, i) => i !== index);
          setExamSections([{ name: examSections[0]?.name || "General", count: updated.length }]);
          return updated;
        });
        showToast("Question removed.", "success");
      }
    });
  };

  // ⚡ GUEST MODE SIMULATION FOR AI AUTO-FILL ⚡
  const generateOptions = async (qIndex) => {
    const q = questions[qIndex];
    if (!q.text || q.text.trim() === "") return showToast("Type a question first!", "warning");
    
    const updatedLoading = [...questions];
    updatedLoading[qIndex].isGeneratingOptions = true;
    setQuestions(updatedLoading);
    showToast("✨ AI is crafting contextual options...", "success");

    if (!user) {
      setTimeout(() => {
        const finalQuestions = [...questions];
        const fallbackOptions = [
          "Hypothetical correct statement related to question",
          "Common misconception often chosen by students",
          "Mathematically correct but irrelevant derivative",
          "Inverse relation or opposite logical conclusion"
        ].sort(() => Math.random() - 0.5);

        finalQuestions[qIndex].options = fallbackOptions.map((text, idx) => ({
            id: String.fromCharCode(65 + idx),
            text: text,
            hasImage: false,
            imageUrl: null
        }));
        
        finalQuestions[qIndex].correctAnswer = "";
        finalQuestions[qIndex].isGeneratingOptions = false;
        setQuestions(finalQuestions);
        showToast("Options Generated & Shuffled (Guest Simulation)", "success");
      }, 1500);
      return;
    }

    try {
      const response = await fetch("/api/generate-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.text })
      });
      
      if (!response.ok) throw new Error("API Route Missing");
      const data = await response.json();
      
      if (data.options && data.options.length >= 4) {
          const finalQuestions = [...questions];
          const shuffledOptions = [...data.options].sort(() => Math.random() - 0.5);
          
          finalQuestions[qIndex].options = shuffledOptions.map((text, idx) => ({
              id: String.fromCharCode(65 + idx),
              text: text,
              hasImage: false,
              imageUrl: null
          }));
          
          finalQuestions[qIndex].correctAnswer = "";
          finalQuestions[qIndex].isGeneratingOptions = false;
          
          setQuestions(finalQuestions);
          showToast("Options Generated & Shuffled!", "success");
      }
    } catch (error) {
      showToast("AI Generation Failed. Please try again.", "error");
      const finalQuestions = [...questions];
      finalQuestions[qIndex].isGeneratingOptions = false;
      setQuestions(finalQuestions);
    }
  };

  // ⚡ GUEST MODE SIMULATION FOR AI SOLVE ⚡
  const generateSolution = async (qIndex) => {
    const q = questions[qIndex];
    if (!q.text || q.text.trim() === "") return showToast("Question is empty!", "warning");
    
    const updatedLoading = [...questions];
    updatedLoading[qIndex].isGeneratingSolution = true;
    setQuestions(updatedLoading);
    showToast("✨ AI is analyzing and solving...", "success");
    
    if (!user) {
      setTimeout(() => {
        const finalQuestions = [...questions];
        finalQuestions[qIndex].explanation = `**Step 1: Extract Given Data**\nWe analyze the core parameters provided in the question.\n\n**Step 2: Apply Governing Formula**\nWe use the formula: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n**Step 3: Final Calculation**\nThe final derived value matches exactly with the expected concept.\n\nTherefore, this is the correct logical path.`;
        finalQuestions[qIndex].isGeneratingSolution = false;
        setQuestions(finalQuestions);
        showToast("Solution Generated (Guest Simulation)", "success");
      }, 2000);
      return;
    }

    try {
      const response = await fetch("/api/solve-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.text, type: q.type, options: q.options })
      });
      
      if (!response.ok) throw new Error("API Route Missing");
      const data = await response.json();
      
      const finalQuestions = [...questions];
      finalQuestions[qIndex].explanation = data.explanation;
      finalQuestions[qIndex].isGeneratingSolution = false;
      
      setQuestions(finalQuestions);
      showToast("Solution Generated Successfully!", "success");
      
    } catch (error) {
       showToast("AI Solution Generation Failed.", "error");
       const finalQuestions = [...questions];
       finalQuestions[qIndex].isGeneratingSolution = false;
       setQuestions(finalQuestions);
    }
  };

  const saveToDatabase = async () => {
    setShowDeployConfirm(false);
    if (questions.length === 0) return showToast("No questions to save!", "warning");
    setIsPublishing(true);
    try {
      const mockRef = await addDoc(collection(db, "mocks"), {
        educatorId: user.id, 
        educatorName: user.fullName || "Educator", 
        title: examTitle, 
        examCategory: examCategory,
        duration: Number(duration),
        allowCalculator: allowCalculator,
        visibility: visibility,
        availability: availability,
        blockMobile: blockMobile,
        blockMultiple: blockMultiple,
        blockTabSwitch: blockTabSwitch,
        enableWatermark: enableWatermark,
        spotlightMode: spotlightMode,
        createdAt: new Date(), 
        status: "published", 
      });

      const questionsRef = collection(db, "mocks", mockRef.id, "questions");
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        await addDoc(questionsRef, { ...q, section: "General" });
      }
      
      localStorage.removeItem(`ozone_mock_draft_${user.id}`);
      
      setPublishedRoomId(mockRef.id);
    } catch (error) { showToast("Failed to save mock.", "error"); } finally { setIsPublishing(false); }
  };

  const confirmDeploy = () => {
    if (questions.length === 0) return showToast("No questions to save!", "warning");
    setShowDeployConfirm(true); 
  };

  if (!isLoaded) return (
    <div className="flex h-full items-center justify-center bg-slate-50 flex-col animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 text-indigo-50 rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-xl shadow-indigo-900/30 border border-indigo-400/30 transform -rotate-3 animate-pulse">
        <i className="fas fa-book-open-reader"></i>
      </div>
      <h2 className="text-xl font-black text-slate-900 tracking-tight animate-pulse">Loading Workspace...</h2>
    </div>
  );

  return (
    // ⚡ FIXED: Absolute Inset-0 overrides standard scrolling so the 2-column layout perfectly fills the layout.jsx container ⚡
    <div className="absolute inset-0 flex flex-col bg-slate-100 font-sans overflow-hidden">
      
      <EducatorTour userId={user?.id} />

      {/* QUICK JUMP NAV (Visible when questions > 0) */}
      {questions.length > 0 && (
        <div className="absolute bottom-6 left-6 bg-white p-4 rounded-2xl shadow-2xl border border-slate-200 z-[90] max-w-[280px] hidden md:block animate-in slide-in-from-left-5">
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

      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-4 animate-in slide-in-from-bottom-5 backdrop-blur-xl border border-white/20 
          ${toast.type === 'success' ? 'bg-emerald-600/90 text-white' : toast.type === 'error' ? 'bg-rose-600/90 text-white' : 'bg-amber-500/90 text-slate-900'}`}>
          <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
             <i className={`fas ${toast.type === 'success' ? 'fa-check' : toast.type === 'error' ? 'fa-exclamation' : 'fa-exclamation-triangle'}`}></i>
          </div>
          <span className="font-bold text-sm tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* --- DEPLOY CONFIRMATION MODAL --- */}
      {showDeployConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-[95%] shadow-2xl border border-slate-200 animate-in zoom-in-95 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500"></div>
              <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto"><i className="fas fa-paper-plane"></i></div>
              <h3 className="text-xl font-black text-slate-800 mb-2 text-center">Ready to Publish?</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 text-center leading-relaxed">
                Your exam will be secured and pushed to the live server. Don't worry, you can always edit the security settings and visibility later from your dashboard.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                 <button onClick={() => setShowDeployConfirm(false)} className="px-6 py-3.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition w-full sm:w-1/2">Review Settings</button>
                 
                 {/* ⚡ GUEST BLOCKER FOR PUBLISHING ⚡ */}
                 <GuestBlocker role="educator">
                    <button onClick={saveToDatabase} className="px-6 py-3.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 rounded-xl transition w-full">Yes, Publish</button>
                 </GuestBlocker>
              </div>
           </div>
        </div>
      )}

      {/* DRAFT MODAL */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-[95%] shadow-2xl border border-slate-200 animate-in zoom-in-95 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-amber-400"></div>
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto"><i className="fas fa-save"></i></div>
              <h3 className="text-xl font-black text-slate-800 mb-2 text-center">Unsaved Exam</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 text-center leading-relaxed">You have unsaved questions in your workspace. Do you want to save them as a draft to finish later?</p>
              <div className="flex flex-col gap-3 w-full">
                 <button onClick={saveDraftAndLeave} className="px-6 py-3.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-lg shadow-indigo-600/20 w-full flex items-center justify-center gap-2 hover:-translate-y-0.5"><i className="fas fa-cloud-download-alt"></i> Save to Drafts</button>
                 <button onClick={discardDraftAndLeave} className="px-6 py-3.5 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition w-full">Discard & Leave</button>
                 <button onClick={() => setShowDraftModal(false)} className="px-6 py-3.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition w-full">Cancel</button>
              </div>
           </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-[95%] shadow-2xl border border-slate-200 animate-in zoom-in-95 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto"><i className="fas fa-trash-alt"></i></div>
              <h3 className="text-xl font-black text-slate-800 mb-2 text-center">{confirmDialog.title}</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 text-center leading-relaxed">{confirmDialog.message}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                 <button onClick={() => setConfirmDialog(null)} className="px-6 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition w-full sm:w-1/2">Cancel</button>
                 <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }} className="px-6 py-3 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition shadow-md shadow-rose-500/20 w-full sm:w-1/2">Delete</button>
              </div>
           </div>
        </div>
      )}

      {cropperState.show && (
        <ImageCropperModal src={cropperState.src} onCrop={handleCroppedImageUpload} onCancel={() => setCropperState({ show: false, src: null, file: null, targetQIndex: null, targetType: null, targetOptIndex: null })} />
      )}

      {/* --- EXAM SETTINGS MODAL --- */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[99999] flex justify-center items-start md:items-center pt-10 pb-10 md:pt-0 p-4 animate-in fade-in overflow-y-auto">
          <div id="tour-exam-settings" className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-[95%] shadow-2xl border border-slate-200 my-auto">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-black text-slate-800"><i className="fas fa-cog text-indigo-500 mr-2"></i> Exam Configuration</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-rose-500 transition hover:bg-rose-50 w-8 h-8 rounded-full flex items-center justify-center"><i className="fas fa-times text-lg"></i></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* LEFT COLUMN: GENERAL SETTINGS */}
               <div className="space-y-5">
                 <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">General Info</h4>
                 <div>
                   <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">Exam Category</label>
                   <select value={examCategory} onChange={(e) => setExamCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500">
                     <option value="GATE ECE">GATE ECE</option>
                     <option value="GATE CS">GATE CS</option>
                     <option value="JEE Mains">JEE Mains</option>
                     <option value="UPSC">UPSC</option>
                     <option value="General">General Mock</option>
                   </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">Duration (Mins)</label>
                     <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500"/>
                   </div>
                   <div>
                     <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">Visibility</label>
                     <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500">
                       <option value="private">Private (Code)</option>
                       <option value="public">Public Feed</option>
                     </select>
                   </div>
                 </div>

                 <div>
                   <label className="block text-xs font-black text-slate-600 mb-1.5 uppercase tracking-wide">Availability</label>
                   <select value={availability} onChange={(e) => setAvailability(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500">
                     <option value="always">Always Available</option>
                     <option value="12h">Available for 12 Hours</option>
                     <option value="24h">Available for 24 Hours</option>
                   </select>
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

               {/* RIGHT COLUMN: SECURITY SETTINGS */}
               <div className="space-y-4">
                 <div className="flex justify-between items-end border-b border-slate-100 pb-2">
                   <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest"><i className="fas fa-shield-alt text-rose-400"></i> Security Engine</h4>
                   <button onClick={toggleAllSecurity} className={`text-[10px] font-black uppercase px-2 py-1 rounded transition ${isAllStrict ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}>
                     {isAllStrict ? "Disable All" : "Enable All"}
                   </button>
                 </div>

                 <div onClick={() => setBlockMobile(!blockMobile)} className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${blockMobile ? "bg-rose-50 border-rose-400" : "bg-slate-50 border-slate-200"}`}>
                   <div>
                     <span className="text-xs font-black text-slate-900 block">Block Mobile Phones</span>
                     <span className="text-[9px] font-bold text-slate-500">AI flags visible smart devices</span>
                   </div>
                   <div className={`w-8 h-4 rounded-full relative transition-colors ${blockMobile ? "bg-rose-500" : "bg-slate-300"}`}>
                     <div className={`w-3 h-3 bg-white rounded-full absolute top-[2px] transition-transform ${blockMobile ? "translate-x-[18px]" : "translate-x-[2px]"}`}></div>
                   </div>
                 </div>

                 <div onClick={() => setBlockMultiple(!blockMultiple)} className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${blockMultiple ? "bg-rose-50 border-rose-400" : "bg-slate-50 border-slate-200"}`}>
                   <div>
                     <span className="text-xs font-black text-slate-900 block">Block Multiple Persons</span>
                     <span className="text-[9px] font-bold text-slate-500">AI flags 2+ faces in camera</span>
                   </div>
                   <div className={`w-8 h-4 rounded-full relative transition-colors ${blockMultiple ? "bg-rose-500" : "bg-slate-300"}`}>
                     <div className={`w-3 h-3 bg-white rounded-full absolute top-[2px] transition-transform ${blockMultiple ? "translate-x-[18px]" : "translate-x-[2px]"}`}></div>
                   </div>
                 </div>

                 <div onClick={() => setBlockTabSwitch(!blockTabSwitch)} className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${blockTabSwitch ? "bg-rose-50 border-rose-400" : "bg-slate-50 border-slate-200"}`}>
                   <div>
                     <span className="text-xs font-black text-slate-900 block">Block Tab Switching</span>
                     <span className="text-[9px] font-bold text-slate-500">Blurs screen if focus is lost</span>
                   </div>
                   <div className={`w-8 h-4 rounded-full relative transition-colors ${blockTabSwitch ? "bg-rose-500" : "bg-slate-300"}`}>
                     <div className={`w-3 h-3 bg-white rounded-full absolute top-[2px] transition-transform ${blockTabSwitch ? "translate-x-[18px]" : "translate-x-[2px]"}`}></div>
                   </div>
                 </div>

                 <div onClick={() => setEnableWatermark(!enableWatermark)} className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${enableWatermark ? "bg-rose-50 border-rose-400" : "bg-slate-50 border-slate-200"}`}>
                   <div>
                     <span className="text-xs font-black text-slate-900 block">Forensic Watermarks</span>
                     <span className="text-[9px] font-bold text-slate-500">Embeds student details on screen</span>
                   </div>
                   <div className={`w-8 h-4 rounded-full relative transition-colors ${enableWatermark ? "bg-rose-500" : "bg-slate-300"}`}>
                     <div className={`w-3 h-3 bg-white rounded-full absolute top-[2px] transition-transform ${enableWatermark ? "translate-x-[18px]" : "translate-x-[2px]"}`}></div>
                   </div>
                 </div>

                 <div onClick={() => setSpotlightMode(!spotlightMode)} className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition-all ${spotlightMode ? "bg-rose-50 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]" : "bg-slate-50 border-slate-200"}`}>
                   <div>
                     <span className="text-xs font-black text-slate-900 block text-rose-600">Anti-Camera Spotlight</span>
                     <span className="text-[9px] font-bold text-slate-500">Defeats Google Lens & ChatGPT</span>
                   </div>
                   <div className={`w-8 h-4 rounded-full relative transition-colors ${spotlightMode ? "bg-rose-500" : "bg-slate-300"}`}>
                     <div className={`w-3 h-3 bg-white rounded-full absolute top-[2px] transition-transform ${spotlightMode ? "translate-x-[18px]" : "translate-x-[2px]"}`}></div>
                   </div>
                 </div>
               </div>

            </div>
            
            <button onClick={() => setShowSettingsModal(false)} className="w-full mt-8 bg-indigo-600 text-white py-3.5 rounded-xl font-black hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition hover:-translate-y-0.5 sticky bottom-0">
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* PUBLISHING PROGRESS MODAL */}
      {isPublishing && !publishedRoomId && (
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-sm w-[95%] border border-slate-100 relative overflow-hidden">
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

      {/* PUBLISHED SUCCESS MODAL */}
      {publishedRoomId && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-[99999] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center max-w-md w-[95%] relative overflow-hidden">
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg shadow-emerald-500/30 border-4 border-white"><i className="fas fa-check"></i></div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 tracking-tight">Exam is Live!</h2>
              <p className="text-slate-500 font-medium mb-6 text-sm">Share this Room ID with your students:</p>
              <div className="bg-slate-50 p-4 rounded-2xl mb-8 border-2 border-slate-200 shadow-inner flex items-center justify-center gap-4 group cursor-copy" onClick={() => { navigator.clipboard.writeText(publishedRoomId); showToast("Room ID Copied!", "success"); }} title="Click to copy">
                <span className="text-3xl md:text-4xl font-mono font-black text-indigo-700 tracking-wider">{publishedRoomId}</span>
                <i className="fas fa-copy text-slate-300 group-hover:text-indigo-500 text-xl transition-colors"></i>
              </div>
              <div className="flex flex-col gap-3 md:gap-4">
                <button onClick={() => router.push(`/educator/live-rooms/${publishedRoomId}`)} className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3.5 rounded-xl font-black hover:from-indigo-700 shadow-md transition hover:-translate-y-0.5 text-sm md:text-base">View Live Room Dashboard</button>
                <button onClick={() => window.location.reload()} className="w-full bg-slate-100 text-slate-600 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition text-sm md:text-base">Create Another Exam</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="bg-white border-b border-slate-200 h-auto md:h-16 py-3 px-4 md:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 z-20 shrink-0 shadow-sm">
        <div className="flex items-center gap-3 w-full md:max-w-[60%]">
           
           <button onClick={handleBackNavigation} className="shrink-0 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold shadow-sm" title="Back to Dashboard">
             <i className="fas fa-arrow-left"></i> <span className="hidden sm:block">Back</span>
           </button>
           
           <input type="text" value={examTitle} onChange={(e) => setExamTitle(e.target.value)} className="text-base md:text-lg font-black text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none w-full transition-colors truncate" placeholder="Untitled Exam" />
        </div>
        
        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end shrink-0">
          <button onClick={() => setShowSettingsModal(true)} className="flex-1 md:flex-none justify-center bg-slate-100 text-slate-600 px-3 py-2 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold shadow-sm hover:bg-slate-200 transition flex items-center gap-2 border border-slate-200">
            <i className="fas fa-cog"></i> <span>Settings</span>
          </button>
          
          <button id="tour-publish" onClick={confirmDeploy} disabled={questions.length === 0 || uploadingCount > 0 || isPublishing} className="flex-1 md:flex-none justify-center bg-emerald-600 text-white px-4 py-2 md:px-6 md:py-2 rounded-lg text-xs md:text-sm font-bold shadow-md hover:bg-emerald-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {isPublishing ? <><i className="fas fa-spinner fa-spin"></i> <span>Deploying...</span></> : <><i className="fas fa-paper-plane"></i> Publish</>}
          </button>
        </div>
      </header>

      {/* --- TWO COLUMN LAYOUT --- */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* PDF VIEW */}
        <div className={`transition-all duration-500 ease-in-out border-b lg:border-b-0 lg:border-r border-slate-300 bg-slate-200 flex flex-col relative ${pdfUrl ? 'h-1/2 lg:h-full lg:w-1/2' : 'h-0 lg:w-0 lg:h-full opacity-0 overflow-hidden'}`}>
          <div className="h-10 md:h-12 bg-slate-800 text-white flex items-center justify-between px-4 shrink-0 shadow-md z-10">
            <span className="text-[10px] md:text-xs font-bold truncate flex-1"><i className="fas fa-file-pdf text-rose-400 mr-2"></i> {file?.name}</span>
          </div>
          {pdfUrl && <iframe src={`${pdfUrl}#toolbar=0`} className="w-full flex-1 border-none" title="PDF Viewer" />}
        </div>

        {/* EDITOR VIEW */}
        <div className={`flex-1 flex flex-col bg-slate-50 transition-all duration-500 overflow-hidden ${pdfUrl ? 'h-1/2 lg:h-full lg:w-1/2' : 'h-full w-full'}`}>
          
          {/* BULK UPLOAD BAR */}
          <div id="tour-pdf-extract" className="bg-white p-3 md:p-4 border-b border-slate-200 shrink-0 shadow-sm flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between z-10">
            <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0">
              <label className="flex-1 xl:flex-none justify-center bg-emerald-50 border border-emerald-300 text-emerald-700 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-emerald-100 transition flex items-center shadow-sm whitespace-nowrap">
                <i className="fas fa-file-csv mr-2 text-emerald-600"></i> <span>Bulk CSV</span>
                <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
              </label>
              <label className="flex-1 xl:flex-none justify-center bg-slate-100 border border-slate-300 text-slate-800 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-200 transition flex items-center shadow-sm whitespace-nowrap">
                <i className="fas fa-upload mr-2 text-rose-500"></i> <span>Upload PDF</span>
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
              </label>
              <label className="flex-1 xl:flex-none justify-center bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-100 transition flex items-center shadow-sm whitespace-nowrap">
                <i className="fas fa-camera mr-2 text-indigo-600"></i> <span>Scan Phone</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                  const imgFile = e.target.files[0];
                  if (imgFile) { setFile(imgFile); setPdfUrl(null); showToast("Photo captured! Use 'Extract Qs' or crop.", "success"); }
                }} />
              </label>
            </div>

            <div className="flex items-center gap-3 w-full xl:w-auto justify-between xl:justify-end">
               <div id="tour-page-range" className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                 <input type="number" min="1" value={startPage} onChange={e => setStartPage(e.target.value)} className="w-10 text-center text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded py-1 outline-none focus:border-indigo-500 shadow-inner"/>
                 <span className="text-[10px] text-slate-400 font-black uppercase">To</span>
                 <input type="number" min="1" value={endPage} onChange={e => setEndPage(e.target.value)} className="w-10 text-center text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded py-1 outline-none focus:border-indigo-500 shadow-inner"/>
               </div>
               
               <div id="tour-ai-solutions" className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                  <span className="text-[10px] font-black text-indigo-700 hidden sm:block">AI Solutions</span>
                  <i className="fas fa-brain text-indigo-500 sm:hidden"></i>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={generateExplanations} onChange={(e) => setGenerateExplanations(e.target.checked)} className="sr-only peer" />
                    <div className="w-7 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
               </div>

               <button onClick={handleExtract} disabled={!file || isProcessing} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-indigo-600 disabled:opacity-50 disabled:bg-slate-400 transition flex items-center gap-1.5">
                 {isProcessing ? <><i className="fas fa-spinner fa-spin"></i></> : <><i className="fas fa-magic"></i> <span className="hidden sm:block">Extract</span></>}
               </button>
            </div>
          </div>

          {/* QUESTIONS LIST */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6 scroll-smooth bg-slate-50/50">
            <div className="max-w-4xl mx-auto space-y-4 pb-32">
              
              {questions.length === 0 ? (
                <div className="mt-10 md:mt-20 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 px-4">
                   <div className="w-24 h-24 bg-indigo-50 text-indigo-400 rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-inner border border-indigo-100/50 transform -rotate-3"><i className="fas fa-file-signature"></i></div>
                   <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-3 text-center tracking-tight">Your Exam is Empty</h2>
                   <p className="text-sm font-medium text-slate-500 max-w-md text-center mb-8 leading-relaxed">Upload a document to the top bar to extract questions using AI, upload a CSV file, or start building manually.</p>
                   
                   <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                     <button id="tour-manual-build" onClick={handleAddCustomQuestion} disabled={isProcessing} className="bg-emerald-500 text-white px-8 py-3.5 rounded-xl font-black hover:bg-emerald-600 hover:-translate-y-1 transition-all text-sm md:text-base shadow-lg shadow-emerald-500/30 flex items-center gap-3 group relative overflow-hidden w-full sm:w-auto justify-center">
                       <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                       <i className="fas fa-plus text-lg"></i> Build from Scratch
                     </button>
                     <button onClick={downloadCsvTemplate} className="bg-white text-slate-700 border border-slate-300 px-8 py-3.5 rounded-xl font-bold hover:bg-slate-50 hover:-translate-y-1 transition-all text-sm shadow-sm flex items-center gap-3 w-full sm:w-auto justify-center">
                       <i className="fas fa-download text-emerald-500"></i> Download CSV Template
                     </button>
                   </div>
                </div>
              ) : (
                questions.map((q, qIndex) => {
                  const isExpanded = expandedQIndex === qIndex;

                  return (
                    <div key={qIndex} ref={el => questionRefs.current[qIndex] = el} className={`bg-white border rounded-2xl transition-all duration-200 overflow-hidden ${isExpanded ? 'border-indigo-400 shadow-xl ring-4 ring-indigo-50/50' : 'border-slate-200 shadow-sm hover:border-slate-300'}`}>
                      
                      <div onClick={() => setExpandedQIndex(isExpanded ? null : qIndex)} className={`p-4 flex items-center gap-3 md:gap-4 cursor-pointer select-none transition-colors ${isExpanded ? 'bg-indigo-50/50 border-b border-indigo-100' : 'hover:bg-slate-50'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{qIndex + 1}</div>
                        <div className="flex-1 min-w-0 flex items-center gap-2 md:gap-3">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 shrink-0">{q.type}</span>
                          <div className="text-sm font-bold text-slate-900 truncate overflow-hidden whitespace-nowrap"><Latex>{q.text || "Empty Question..."}</Latex></div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); requestRemoveQuestion(qIndex); }} className="text-slate-400 hover:text-rose-600 transition px-2"><i className="fas fa-trash"></i></button>
                      </div>

                      {isExpanded && (
                        <div className="p-4 md:p-5 bg-white">
                          
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-4 border-b border-slate-100 gap-4">
                             <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                                <select value={q.type || "MCQ"} onChange={(e) => handleTypeChange(qIndex, e.target.value)} className="bg-slate-50 border border-slate-300 rounded-lg text-xs px-3 py-1.5 font-bold text-slate-900 outline-none focus:border-indigo-400 cursor-pointer shadow-sm">
                                    <option value="MCQ">MCQ</option> <option value="MSQ">MSQ</option> <option value="NAT">NAT</option>
                                </select>
                                <div className="flex items-center gap-2 sm:border-l border-slate-200 sm:pl-4">
                                  <span className="text-[10px] font-black text-emerald-700 uppercase">+ Mk:</span>
                                  <input type="number" step="0.5" value={q.marks} onChange={(e) => updateQuestionField(qIndex, 'marks', e.target.value)} className="w-14 bg-white border border-slate-300 rounded text-xs px-2 py-1 text-center font-black text-slate-900 outline-none shadow-sm focus:border-emerald-500"/>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-rose-700 uppercase">- Mk:</span>
                                  <input type="number" step="0.1" value={q.negativeMarks} onChange={(e) => updateQuestionField(qIndex, 'negativeMarks', e.target.value)} className="w-14 bg-white border border-slate-300 rounded text-xs px-2 py-1 text-center font-black text-slate-900 outline-none shadow-sm focus:border-rose-500"/>
                                </div>
                             </div>
                             
                             <label className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200 cursor-pointer hover:bg-indigo-100 hover:shadow-md transition inline-flex items-center justify-center gap-1.5 shadow-sm w-full sm:w-auto">
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
                            <div className="text-sm font-bold text-slate-900 leading-relaxed overflow-x-auto"><Latex>{q.text || "Type your question below..."}</Latex></div>
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
                              <input type="text" value={q.correctAnswer || ''} onChange={(e) => updateQuestionField(qIndex, 'correctAnswer', e.target.value)} className="w-full sm:max-w-xs bg-white border border-slate-300 rounded-lg p-3 text-lg font-black text-slate-900 outline-none focus:border-indigo-500 shadow-sm" />
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Answer Choices</span>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                  <button onClick={() => addOption(qIndex)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm border border-emerald-200 flex-1 sm:flex-none">
                                    <i className="fas fa-plus"></i> Add Option
                                  </button>
                                  
                                  <button onClick={() => generateOptions(qIndex)} disabled={q.isGeneratingOptions} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black px-3 py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm border border-indigo-200 disabled:opacity-50 flex-1 sm:flex-none">
                                    {q.isGeneratingOptions ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>} 
                                    <span className="hidden sm:inline">AI Auto-Fill</span>
                                  </button>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                {q.options?.map((opt, optIndex) => {
                                  const isCorrect = q.type === 'MSQ' ? (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id)) : q.correctAnswer === opt.id;
                                  return (
                                    <div key={optIndex} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${isCorrect ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-300' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}>
                                      <input type={q.type === "MSQ" ? "checkbox" : "radio"} checked={isCorrect} onChange={() => q.type === "MSQ" ? toggleMsqAnswer(qIndex, opt.id) : updateQuestionField(qIndex, 'correctAnswer', opt.id)} className="mt-2 w-4 h-4 accent-emerald-600 cursor-pointer shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <div className="relative mb-2">
                                          <input type="text" value={opt.text} onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)} onPaste={(e) => handlePaste(e, qIndex, 'option', optIndex)} placeholder={`Option ${opt.id}...`} className={`w-full bg-white border border-slate-300 rounded-lg p-2.5 pr-16 text-xs font-bold text-slate-900 focus:border-indigo-500 outline-none shadow-sm ${q.isGeneratingOptions ? 'opacity-50 animate-pulse' : ''}`} disabled={q.isGeneratingOptions} />
                                          <div className="absolute top-1.5 right-1.5 flex gap-1">
                                              <button onClick={() => toggleDictation(qIndex, 'option', optIndex)} className={`p-1.5 rounded transition border ${listeningField === `q-${qIndex}-opt-${optIndex}` ? 'bg-rose-100 text-rose-600 border-rose-200 animate-pulse' : 'bg-slate-100 text-slate-400 border-transparent hover:text-indigo-600 hover:bg-white hover:border-slate-200'}`}>
                                                <i className="fas fa-microphone"></i>
                                              </button>
                                              {q.options.length > 2 && (
                                                  <button onClick={() => removeOption(qIndex, optIndex)} className="p-1.5 rounded transition border bg-slate-100 text-rose-400 border-transparent hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200" title="Remove Option">
                                                      <i className="fas fa-trash"></i>
                                                  </button>
                                              )}
                                          </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-1 px-1 gap-2">
                                           <div className="text-[10px] font-black text-slate-700 truncate overflow-x-auto max-w-[150px]"><Latex>{opt.text}</Latex></div>
                                           <label className="shrink-0 text-[10px] font-black text-indigo-700 cursor-pointer hover:bg-indigo-100 transition bg-indigo-50 px-2 py-1 rounded border border-indigo-200 shadow-sm self-start sm:self-auto">
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
                            </>
                          )}

                          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3">
                              <span className="text-indigo-800 text-[10px] font-black uppercase tracking-wide"><i className="fas fa-lightbulb mr-1"></i> Solution</span>
                              <div className="flex flex-wrap gap-2">
                                <label className="bg-white border border-indigo-300 hover:bg-indigo-50 text-indigo-700 text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer flex-1 sm:flex-none text-center">
                                  <i className="fas fa-image"></i> Attach Image
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => initiateImageUpload(e.target.files[0], qIndex, 'explanation')} />
                                </label>
                                
                                <button onClick={() => generateSolution(qIndex)} disabled={q.isGeneratingSolution} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 flex-1 sm:flex-none disabled:opacity-50">
                                  {q.isGeneratingSolution ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>} 
                                  AI Solve
                                </button>
                              </div>
                            </div>
                            
                            {q.explanation && (
                              <div className="mb-3 p-4 bg-white rounded-xl border border-indigo-100 shadow-sm">
                                <span className="text-[9px] font-black uppercase text-indigo-400 block mb-1">Solution Preview</span>
                                <div className="text-sm font-medium text-slate-800 leading-relaxed overflow-x-auto">
                                  <Latex>{q.explanation}</Latex>
                                </div>
                              </div>
                            )}

                            <textarea 
                              value={q.explanation || ""} onChange={(e) => updateQuestionField(qIndex, 'explanation', e.target.value)} onPaste={(e) => handlePaste(e, qIndex, 'explanation')}
                              className={`w-full bg-white border border-indigo-200 rounded-lg p-3 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 resize-y min-h-[60px] shadow-inner transition-shadow ${q.isGeneratingSolution ? 'opacity-50 animate-pulse' : ''}`} 
                              placeholder="Type explanation, or click 'AI Solve' above..." 
                              disabled={q.isGeneratingSolution}
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

              {questions.length > 0 && (
                <div className="pt-6 pb-12 flex justify-center animate-in fade-in">
                  <button 
                    onClick={handleAddCustomQuestion} 
                    disabled={isProcessing} 
                    className="bg-white border-2 border-dashed border-emerald-300 text-emerald-600 px-8 py-4 rounded-2xl font-black hover:bg-emerald-50 hover:border-emerald-500 hover:-translate-y-1 transition-all shadow-sm flex items-center gap-3 group w-full max-w-md justify-center disabled:opacity-50"
                  >
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fas fa-plus text-emerald-600 text-lg"></i></div>
                    Add Another Question
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}