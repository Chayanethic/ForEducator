"use client";

import { useState, useEffect, use, useRef } from "react";
import { doc, getDoc, collection, getDocs, addDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";

// --- MATH RENDERING ---
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// --- DRAGGABLE TCS iON CALCULATOR COMPONENT ---
const DraggableCalculator = ({ onClose }) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [display, setDisplay] = useState("");

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
  }, [isDragging, dragOffset]);

  const handleInput = (val) => setDisplay((prev) => prev + val);
  const handleClear = () => setDisplay("");
  const handleBackspace = () => setDisplay((prev) => prev.slice(0, -1));
  
  const handleCalculate = () => {
    try {
      const sanitized = display.replace(/\^/g, '**');
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + sanitized)();
      setDisplay(String(Number(result.toFixed(6))));
    } catch (error) {
      setDisplay("Error");
      setTimeout(() => setDisplay(""), 1500);
    }
  };

  return (
    <div style={{ left: position.x, top: position.y, position: 'fixed', zIndex: 9999 }} className="w-80 bg-slate-100 rounded-lg shadow-2xl border border-slate-300 overflow-hidden flex flex-col font-sans">
      <div onMouseDown={handleMouseDown} className="bg-indigo-600 text-white px-4 py-2 cursor-grab active:cursor-grabbing flex justify-between items-center select-none">
        <div className="font-bold text-sm tracking-wide"><i className="fas fa-calculator mr-2"></i> Scientific Calculator</div>
        <button onClick={onClose} className="hover:text-rose-300 transition"><i className="fas fa-times"></i></button>
      </div>
      <div className="p-4 bg-white border-b border-slate-200">
        <div className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-right font-mono text-xl text-slate-800 h-10 overflow-hidden tracking-wider shadow-inner">{display || "0"}</div>
      </div>
      <div className="p-3 grid grid-cols-5 gap-2 bg-slate-200">
        <button onClick={() => handleInput('Math.sin(')} className="bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold rounded py-2 shadow-sm transition">sin</button>
        <button onClick={() => handleInput('Math.cos(')} className="bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold rounded py-2 shadow-sm transition">cos</button>
        <button onClick={() => handleInput('Math.tan(')} className="bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold rounded py-2 shadow-sm transition">tan</button>
        <button onClick={() => handleInput('(')} className="bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold rounded py-2 shadow-sm transition">(</button>
        <button onClick={() => handleInput(')')} className="bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold rounded py-2 shadow-sm transition">)</button>
        <button onClick={() => handleInput('Math.sqrt(')} className="bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold rounded py-2 shadow-sm transition">√</button>
        <button onClick={() => handleInput('^')} className="bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold rounded py-2 shadow-sm transition">x^y</button>
        <button onClick={() => handleInput('Math.log10(')} className="bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-bold rounded py-2 shadow-sm transition">log</button>
        <button onClick={handleClear} className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded py-2 shadow-sm transition col-span-2">Clear</button>
        <button onClick={() => handleInput('7')} className="bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded py-2 shadow-sm transition">7</button>
        <button onClick={() => handleInput('8')} className="bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded py-2 shadow-sm transition">8</button>
        <button onClick={() => handleInput('9')} className="bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded py-2 shadow-sm transition">9</button>
        <button onClick={handleBackspace} className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded py-2 shadow-sm transition"><i className="fas fa-backspace"></i></button>
        <button onClick={() => handleInput('/')} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-bold rounded py-2 shadow-sm transition">/</button>
        <button onClick={() => handleInput('4')} className="bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded py-2 shadow-sm transition">4</button>
        <button onClick={() => handleInput('5')} className="bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded py-2 shadow-sm transition">5</button>
        <button onClick={() => handleInput('6')} className="bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded py-2 shadow-sm transition">6</button>
        <button onClick={() => handleInput('*')} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-bold rounded py-2 shadow-sm transition">*</button>
        <button onClick={() => handleInput('-')} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-bold rounded py-2 shadow-sm transition">-</button>
        <button onClick={() => handleInput('1')} className="bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded py-2 shadow-sm transition">1</button>
        <button onClick={() => handleInput('2')} className="bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded py-2 shadow-sm transition">2</button>
        <button onClick={() => handleInput('3')} className="bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded py-2 shadow-sm transition">3</button>
        <button onClick={() => handleInput('+')} className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm font-bold rounded py-2 shadow-sm transition row-span-2 flex items-center justify-center h-full">+</button>
        <button onClick={handleCalculate} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded py-2 shadow-sm transition row-span-2 flex items-center justify-center h-full">=</button>
        <button onClick={() => handleInput('0')} className="bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded py-2 shadow-sm transition col-span-2">0</button>
        <button onClick={() => handleInput('.')} className="bg-white hover:bg-slate-100 text-slate-800 text-sm font-bold rounded py-2 shadow-sm transition">.</button>
      </div>
    </div>
  );
};

export default function IframeStudentPlayer({ params }) {
  const unwrappedParams = use(params);
  const mockId = unwrappedParams.id;
  const playerRef = useRef(null); 
  const router = useRouter();
  const { user, isLoaded } = useUser();

  // Exam & Student Data
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [studentInfo, setStudentInfo] = useState({ name: "", email: "", phone: "" });
  const [formError, setFormError] = useState(""); 
  
  // Exam Engine State
  const [hasStarted, setHasStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [examPhase, setExamPhase] = useState('loading'); 
  const [isSubmittingEngine, setIsSubmittingEngine] = useState(false);
  
  // Tracking Matrices
  const [answers, setAnswers] = useState({});
  const [visited, setVisited] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [statuses, setStatuses] = useState([]); 
  
  // Security & UI Modal State
  const [warnings, setWarnings] = useState(0);
  const MAX_WARNINGS = 3;
  const [warningAlert, setWarningAlert] = useState({ show: false, reason: "", count: 0, isFinal: false });
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const [activeSection, setActiveSection] = useState("");
  const [uniqueSections, setUniqueSections] = useState([]);

  // --- AI PROCTORING & CAMERA STATE ---
  const videoRef = useRef(null); 
  const [mediaStream, setMediaStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [aiModel, setAiModel] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(true);
  const [isStrictProctoringActive, setIsStrictProctoringActive] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // 1. Fetch Exam Data
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await fetch(`/api/exam/${mockId}`);
        if (!res.ok) throw new Error("Exam not found or server error");
        
        const data = await res.json();
        setExamData(data.examData);
        setQuestions(data.questions);
        setTimeLeft(data.examData.duration * 60);
        
        const sections = [...new Set(data.questions.map(q => q.section || "General"))];
        setUniqueSections(sections);
        if (sections.length > 0) setActiveSection(sections[0]);

        const initialStatuses = Array(data.questions.length).fill('not-visited');
        if (data.questions.length > 0) initialStatuses[0] = 'not-answered';
        setStatuses(initialStatuses);
        
        if (data.questions.length > 0) setVisited({ 0: true });

        // Pre-fill if logged in
        if (user) {
          setStudentInfo({
             name: user.fullName || "",
             email: user.primaryEmailAddress?.emailAddress || "",
             phone: ""
          });
        }

        setExamPhase('instructions');

      } catch (error) {
        console.error("Error loading exam:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (mockId && isLoaded) fetchExam();
  }, [mockId, user, isLoaded]);

  // --- LOAD TENSORFLOW AI MODEL ---
  useEffect(() => {
    const loadAiModel = async () => {
      try {
        const tf = await import('@tensorflow/tfjs');
        const cocoSsd = await import('@tensorflow-models/coco-ssd');
        await tf.ready(); 
        const model = await cocoSsd.load();
        setAiModel(model);
        setIsAiLoading(false);
      } catch (error) {
        console.error("Error loading AI Proctoring model:", error);
        setFormError("Failed to load AI Engine. Exam cannot start.");
      }
    };
    loadAiModel();
  }, []);

  // --- CAMERA ACTIVATION LOGIC ---
  const requestCameraAccess = async (e) => {
    if (e) e.preventDefault();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, 
        audio: false 
      });
      setMediaStream(stream);
      setIsCameraActive(true);
      setFormError(""); 
    } catch (err) {
      console.error("Camera access denied:", err);
      setFormError("Camera access is mandatory for this exam. Please allow it in your browser settings.");
    }
  };

  // Keep Video Stream Attached to Ref
  useEffect(() => {
    if (videoRef.current && mediaStream && videoRef.current.srcObject !== mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  }, [mediaStream, hasStarted]);

  // Clean up Camera on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  // 2. Timer Engine
  useEffect(() => {
    if (!hasStarted || isFinished || timeLeft <= 0 || warningAlert.show || isSubmittingEngine) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { 
          setIsSubmittingEngine(true);
          submitExam(true); 
          return 0; 
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasStarted, isFinished, timeLeft, warningAlert.show, isSubmittingEngine]);

  // ==========================================
  // AGGRESSIVE ANTI-CHEAT ENGINE
  // ==========================================

  const issueWarning = (reason) => {
    setWarnings(prev => {
      const newWarnings = prev + 1;
      if (newWarnings >= MAX_WARNINGS) {
        setWarningAlert({ show: true, reason, count: newWarnings, isFinal: true });
        setTimeout(() => submitExam(true), 3000); 
      } else {
        setWarningAlert({ show: true, reason, count: newWarnings, isFinal: false });
      }
      return newWarnings;
    });
  };

  useEffect(() => {
    if (hasStarted && !isFinished) {
      const timer = setTimeout(() => setIsStrictProctoringActive(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setIsStrictProctoringActive(false);
    }
  }, [hasStarted, isFinished]);

  useEffect(() => {
    if (!isStrictProctoringActive || isFinished || warningAlert.show) return;

    const handleVisibilityChange = () => {
      if (document.hidden) issueWarning("Tab switching detected");
    };

    const handleBlur = () => {
      issueWarning("Window focus lost (Possible split-screen or external app clicked)");
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        issueWarning("Exited full screen mode");
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        navigator.clipboard.writeText(''); 
        issueWarning("Screenshot attempt detected");
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'p')) e.preventDefault();
      if (e.key === 'F12' || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I')) e.preventDefault();
    };

    const preventAction = (e) => e.preventDefault();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange); 
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", preventAction);
    document.addEventListener("copy", preventAction);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", preventAction);
      document.removeEventListener("copy", preventAction);
    };
  }, [isStrictProctoringActive, isFinished, warningAlert.show]);

  // AI Proctoring Loop
  useEffect(() => {
    if (!isStrictProctoringActive || isFinished || warningAlert.show || !aiModel || !isCameraActive) return;

    const runAiDetection = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        try {
          const predictions = await aiModel.detect(videoRef.current);
          let personCount = 0;
          let phoneDetected = false;

          predictions.forEach(prediction => {
            if (prediction.score > 0.45) { 
              if (prediction.class === 'person') personCount++;
              if (prediction.class === 'cell phone') phoneDetected = true;
            }
          });

          if (phoneDetected) {
            issueWarning("AI Detection: Mobile Phone or unauthorized device detected");
          } else if (personCount > 1) {
            issueWarning("AI Detection: Multiple persons detected in camera frame");
          }
        } catch (error) {
          console.error("AI Detection error:", error);
        }
      }
    };

    const detectionInterval = setInterval(runAiDetection, 2500); 
    return () => clearInterval(detectionInterval);
  }, [isStrictProctoringActive, isFinished, warningAlert.show, aiModel, isCameraActive]);

  // ==========================================
  // EXAM CONTROLS & FORM VALIDATION
  // ==========================================

  const startSecureExam = (e) => {
    e.preventDefault();
    setFormError(""); 

    if (!isCameraActive) {
      setFormError("You must grant camera permission to start the secure exam.");
      return;
    }
    if (isAiLoading) {
      setFormError("Please wait for the AI Security Engine to load.");
      return;
    }

    const { name, email, phone } = studentInfo;
    if (name.trim().length < 3) {
      setFormError("Please enter your full, real name.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormError("Please enter a valid email address (e.g., student@gmail.com).");
      return;
    }

    const phoneClean = phone.replace(/\D/g, ''); 
    if (phoneClean.length < 10 || phoneClean.length > 15) {
      setFormError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const elem = playerRef.current || document.documentElement;
    try {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => console.warn(err));
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen API issue:", err);
    }
    setHasStarted(true);
    setExamPhase('active');
  };

  const handleAnswerSelect = (optId) => {
    const q = questions[currentQIndex];
    if (q.type === 'MSQ') {
      let currentAns = answers[currentQIndex] || [];
      if (!Array.isArray(currentAns)) currentAns = [];
      const newAns = currentAns.includes(optId) ? currentAns.filter(id => id !== optId) : [...currentAns, optId];
      setAnswers({ ...answers, [currentQIndex]: newAns });
    } else {
      setAnswers({ ...answers, [currentQIndex]: optId });
    }
  };

  const handleNatInput = (val) => {
    setAnswers({ ...answers, [currentQIndex]: val });
  };

  const clearResponse = () => {
    const newAnswers = { ...answers };
    delete newAnswers[currentQIndex];
    setAnswers(newAnswers);
  };

  const toggleReview = () => {
    setMarkedForReview(prev => ({ ...prev, [currentQIndex]: !prev[currentQIndex] }));
  };

  const navigateTo = (index) => {
    setVisited(prev => ({ ...prev, [index]: true }));
    setCurrentQIndex(index);
  };

  // ⚡ UPDATED EXECUTE SUBMIT ⚡
  const submitExam = async (isForced = false) => {
    setIsFinished(true);
    setShowSubmitConfirm(false);
    setExamPhase('submitting');
    
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }

    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(e => console.log(e));
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }

    let score = 0;
    let correct = 0;
    let incorrect = 0;
    const totalMarks = questions.reduce((acc, q) => acc + Number(q.marks || 2), 0);

    questions.forEach((q, i) => {
      const studentAns = answers[i];
      const isAttempted = q.type === 'MSQ' ? (Array.isArray(studentAns) && studentAns.length > 0) : (studentAns !== undefined && studentAns !== "");

      if (isAttempted) {
        let isRight = false;
        if (q.type === 'MSQ') {
          const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
          isRight = studentAns.length === correctArr.length && studentAns.every(v => correctArr.includes(v));
        } else if (q.type === 'NAT') {
          isRight = parseFloat(studentAns) === parseFloat(q.correctAnswer);
        } else {
          isRight = studentAns === q.correctAnswer || studentAns === q.correctOption;
        }

        if (isRight) {
          score += Number(q.marks || 2);
          correct++;
        } else {
          score -= Number(q.negativeMarks || 0.66);
          incorrect++;
        }
      }
    });

    const finalScoreFixed = score.toFixed(2);

    try {
      // Note: Kept collection path consistent with your request structure
      await addDoc(collection(db, "mock_exams", mockId, "submissions"), {
        studentName: studentInfo.name?.trim() || "Student",
        studentEmail: studentInfo.email?.trim() || "No Email",
        studentPhone: studentInfo.phone?.trim() || "",
        orgId: examData?.orgId || "N/A", 
        score: finalScoreFixed,
        totalMarks: totalMarks,
        correct, incorrect,
        unattempted: questions.length - (correct + incorrect),
        warnings, forcedSubmit: isForced,
        submittedAt: new Date(),
        answers
      });

      // ⚡ FAIL-SAFE EMAIL API PAYLOAD ⚡
      // This ensures we always pass safe strings, even if examData properties are occasionally undefined
      await fetch('/api/send-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentEmail: studentInfo.email?.trim() || user?.primaryEmailAddress?.emailAddress || "no-reply@test.com",
          studentName: studentInfo.name?.trim() || user?.fullName || "Student",
          score: finalScoreFixed,
          totalMarks: totalMarks,
          orgName: examData?.orgName || "OZONE Academy",
          examTitle: examData?.title || "AI Mock Assessment"
        })
      });

    } catch (error) { 
      console.error("Failed to process submission:", error); 
    } finally {
      setExamPhase('submitted');
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // --- STATUS CALCULATIONS ---
  const totalQs = questions.length;
  let answeredCount = 0;
  let notAnsweredCount = 0;
  let markedCount = 0;
  let notVisitedCount = 0;

  questions.forEach((q, i) => {
    const isAnswered = q.type === 'MSQ' ? (Array.isArray(answers[i]) && answers[i].length > 0) : (answers[i] !== undefined && answers[i] !== "");
    const isMarked = markedForReview[i];
    const isVisited = visited[i];

    if (!isVisited) notVisitedCount++;
    else if (isMarked) markedCount++; 
    else if (isAnswered) answeredCount++;
    else notAnsweredCount++;
  });

  // --- UI SCREENS ---

  if (isLoading || examPhase === 'loading') return <div className="flex h-screen items-center justify-center bg-white"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;
  if (!examData || questions.length === 0) return <div className="flex h-screen items-center justify-center bg-white text-slate-500 font-bold">This exam is unavailable.</div>;

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-100 font-sans flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-8 text-center relative border-b-4 border-indigo-500">
            {examData.orgLogo ? (
               <img src={examData.orgLogo} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4 bg-white p-2 rounded-xl shadow-md" />
            ) : (
               <div className="w-16 h-16 bg-indigo-500 text-white rounded-xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-md"><i className="fas fa-building"></i></div>
            )}
            <h1 className="text-2xl font-black text-white mb-1">{examData.title}</h1>
            <p className="text-slate-400 font-bold text-sm">Powered by {examData.orgName || "OZONE Academy"}</p>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* LEFT: SECURITY RULES & CAMERA SETUP */}
            <div className="space-y-6">
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-5 rounded-xl shadow-sm">
                 <h3 className="font-black flex items-center gap-2 mb-3 text-lg"><i className="fas fa-robot text-rose-600"></i> AI Proctoring Rules</h3>
                 <ul className="ml-5 list-disc font-bold opacity-90 space-y-1.5 text-sm">
                   <li>Camera access is mandatory.</li>
                   <li>Mobile phones or extra people will be flagged.</li>
                   <li>Browser will lock into Full Screen mode.</li>
                   <li>Switching tabs will flag your exam.</li>
                 </ul>
              </div>

              <div className="flex flex-col gap-3">
                {!isCameraActive ? (
                  <button onClick={requestCameraAccess} className="w-full bg-rose-600 text-white px-5 py-3 rounded-xl font-black shadow-md hover:bg-rose-700 transition flex justify-center items-center gap-2">
                    <i className="fas fa-camera"></i> Grant Camera Permission
                  </button>
                ) : (
                  <div className="bg-slate-900 rounded-xl overflow-hidden border-[3px] border-emerald-500 shadow-lg relative flex flex-col w-full h-48">
                     <div className="absolute top-2 right-2 bg-emerald-500/20 backdrop-blur text-emerald-400 text-[10px] font-black uppercase px-2 py-1 rounded border border-emerald-500/50 z-10 flex items-center gap-1">
                       <i className="fas fa-video"></i> Active
                     </div>
                     <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]"></video>
                  </div>
                )}

                {isCameraActive && (
                  <div className={`p-3 rounded-xl border flex items-center gap-3 font-bold text-sm ${isAiLoading ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    {isAiLoading ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-brain"></i>}
                    {isAiLoading ? 'Initializing AI Engine...' : 'AI Proctoring Ready'}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: STUDENT FORM */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-inner">
              <h3 className="font-black text-slate-800 mb-6 text-xl border-b border-slate-200 pb-3">Student Details</h3>
              <form onSubmit={startSecureExam} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Full Name</label>
                  <input required type="text" value={studentInfo.name} onChange={e => setStudentInfo({...studentInfo, name: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 transition-colors shadow-sm" placeholder="e.g. Rahul Sharma" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Email</label>
                  <input required type="email" value={studentInfo.email} onChange={e => setStudentInfo({...studentInfo, email: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 transition-colors shadow-sm" placeholder="rahul@example.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Mobile Number</label>
                  <input required type="tel" value={studentInfo.phone} onChange={e => setStudentInfo({...studentInfo, phone: e.target.value})} className="w-full bg-white border border-slate-300 rounded-xl p-3.5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 transition-colors shadow-sm" placeholder="9876543210" />
                </div>

                {/* ⚡ INLINE FORM ERROR DISPLAY ⚡ */}
                {formError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-black flex items-center gap-2 animate-in fade-in slide-in-from-top-2 mt-2">
                    <i className="fas fa-exclamation-circle text-base"></i> {formError}
                  </div>
                )}

                <button type="submit" disabled={!isCameraActive || isAiLoading} className={`w-full mt-4 text-white py-4 rounded-xl font-black text-lg shadow-lg transition flex items-center justify-center gap-2 ${(!isCameraActive || isAiLoading) ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 shadow-indigo-600/30'}`}>
                  <i className="fas fa-lock"></i> {(!isCameraActive || isAiLoading) ? 'Waiting for Security' : 'Start Secure Exam'}
                </button>
              </form>
            </div>

          </div>
        </div>
      </div>
    );
  }

  if (examPhase === 'submitting' || examPhase === 'submitted') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-400/20 rounded-full blur-[100px] animate-pulse pointer-events-none"></div>
        
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 max-w-lg w-full overflow-hidden border border-slate-100 relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-2xl"></div>
            {examPhase === 'submitting' ? (
              <div className="text-emerald-400 text-5xl mb-6 animate-spin flex justify-center"><i className="fas fa-circle-notch"></i></div>
            ) : (
              <div className="w-20 h-20 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-[0_0_30px_rgba(52,211,153,0.3)] animate-bounce" style={{ animationDuration: '2s' }}>
                <i className="fas fa-check"></i>
              </div>
            )}
            
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
              {examPhase === 'submitting' ? 'Submitting...' : 'Assessment Complete'}
            </h2>
            <p className="text-emerald-300 font-medium text-sm">Secure session terminated.</p>
          </div>
          
          <div className="p-8 md:p-10 text-center">
            <p className="text-slate-600 font-medium text-lg mb-8 leading-relaxed">
              Thank you, <strong>{studentInfo.name || "Student"}</strong>. Your responses have been encrypted and submitted securely.
            </p>
            
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 shadow-inner">
              <div className="flex items-center justify-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl shadow-sm shrink-0">
                   <i className="fas fa-envelope-open-text"></i>
                 </div>
                 <div className="text-left">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Steps</p>
                   <p className="text-sm font-bold text-slate-800">Scorecard sent to your email</p>
                 </div>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                An automated diagnostic report has been dispatched to <strong className="text-slate-700">{studentInfo.email}</strong> by the {examData.orgName || "OZONE"} team.
              </p>
            </div>

            <button onClick={() => window.close()} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-xl font-black transition-colors border border-slate-200 shadow-sm flex items-center justify-center gap-2">
              <i className="fas fa-times-circle"></i> Close Tab
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQIndex];

  return (
    <div ref={playerRef} className="h-screen flex flex-col bg-white font-sans select-none overflow-hidden relative">
      
      {/* ⚡ PROFESSIONAL SECURITY WARNING MODAL ⚡ */}
      {warningAlert.show && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[999999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-[3px] border-rose-500 animate-in zoom-in-95 fade-in duration-300">
            <div className="bg-rose-500 p-6 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-20"></div>
              <i className="fas fa-exclamation-triangle text-5xl mb-3 relative z-10 animate-pulse"></i>
              <h2 className="text-2xl font-black relative z-10 tracking-tight">Security Violation</h2>
            </div>
            <div className="p-8 text-center bg-white">
              <p className="text-slate-800 font-bold text-lg mb-2 leading-tight">{warningAlert.reason}</p>
              <div className="inline-block bg-rose-100 text-rose-700 px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-widest mb-6 border border-rose-200">
                Warning {warningAlert.count} of {MAX_WARNINGS}
              </div>
              
              {warningAlert.isFinal ? (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                  <p className="text-slate-600 font-bold text-sm flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin text-rose-500"></i> Auto-submitting exam...
                  </p>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setWarningAlert({ show: false, reason: "", count: 0, isFinal: false });
                    const elem = playerRef.current || document.documentElement;
                    if (elem.requestFullscreen) elem.requestFullscreen().catch(e=>console.log(e));
                  }} 
                  className="w-full bg-rose-600 text-white font-black py-4 rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2"
                >
                  <i className="fas fa-shield-alt"></i> I Understand, Return
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ⚡ PROFESSIONAL SMART SUBMIT CONFIRMATION MODAL ⚡ */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 fade-in duration-300">
            <div className="p-8 md:p-10 text-center">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner border border-indigo-100">
                <i className="fas fa-paper-plane"></i>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Submit Assessment?</h2>
              
              <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200 text-left space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-500">Total Questions:</span>
                  <span className="text-slate-900">{totalQs}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-emerald-600">Answered:</span>
                  <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">{answeredCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-rose-500">Left Blank:</span>
                  <span className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded">{totalQs - answeredCount}</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 font-bold mb-8 uppercase tracking-widest">You cannot change your answers after submitting.</p>
              
              <div className="flex gap-4">
                <button onClick={() => setShowSubmitConfirm(false)} className="flex-1 bg-slate-100 text-slate-700 font-black py-4 rounded-xl hover:bg-slate-200 transition">Cancel</button>
                <button onClick={() => submitExam()} className="flex-1 bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition flex items-center justify-center gap-2">
                  <i className="fas fa-check"></i> Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCalculator && <DraggableCalculator onClose={() => setShowCalculator(false)} />}

      {/* SECURE HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 h-16 px-4 md:px-6 flex justify-between items-center shrink-0 z-10 text-white">
        <div className="flex items-center gap-3">
          {examData.orgLogo && <img src={examData.orgLogo} alt="Logo" className="h-8 bg-white p-1 rounded-md" />}
          <span className="font-black text-sm tracking-wide hidden sm:block">{examData.title}</span>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6">
          
          <div className="flex flex-col items-end mr-1 hidden sm:flex">
            <span className={`text-[10px] font-bold tracking-widest uppercase ${isStrictProctoringActive ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
              {isStrictProctoringActive ? 'Strict Mode ON' : 'Initializing...'}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <i className="fas fa-brain text-indigo-400"></i> AI Scanning
            </div>
          </div>

          {/* TINY LIVE CAMERA PREVIEW IN HEADER */}
          <div className="w-16 h-10 rounded overflow-hidden bg-black border border-emerald-500 relative shadow-inner shadow-black/50">
             <video ref={(el) => {
               if (el && mediaStream && el.srcObject !== mediaStream) {
                 el.srcObject = mediaStream;
                 videoRef.current = el; // Bind to TFJS ref
               }
             }} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]"></video>
             <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-rose-500 shadow-sm"></div>
          </div>

          {examData.allowCalculator && (
             <button onClick={() => setShowCalculator(!showCalculator)} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2">
               <i className="fas fa-calculator text-indigo-300"></i> <span className="hidden md:block">Calculator</span>
             </button>
          )}
          <div className={`font-mono text-lg md:text-2xl font-black flex items-center gap-2 tracking-wider ${timeLeft < 300 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
            <i className="far fa-clock"></i> {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* LEFT: QUESTION AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col bg-white">
          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col">
            
            <div className="flex justify-between items-center mb-6 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-xl font-black text-slate-800">Question {currentQIndex + 1}</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black tracking-widest border border-slate-200">{currentQ.type}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded text-xs font-black">+{currentQ.marks || 2}</span>
                <span className="text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded text-xs font-black">-{currentQ.negativeMarks || 0.66}</span>
              </div>
            </div>

            {/* --- UPGRADED QUESTION AND DIAGRAM RENDERER --- */}
            <div className="mb-8">
              <div className="font-bold text-slate-900 leading-relaxed text-lg whitespace-pre-wrap overflow-x-auto">
                <Latex>{currentQ.text}</Latex>
              </div>
              
              {/* Dedicated Question Diagram Container */}
              {currentQ.imageUrl && (
                <div className="mt-4 p-3 border border-slate-200 rounded-xl bg-slate-50 inline-block shadow-sm">
                  <img src={currentQ.imageUrl} alt="Question Diagram" className="max-h-[350px] object-contain pointer-events-none" draggable="false" />
                </div>
              )}
            </div>

            <div className="flex-1">
              {currentQ.type === 'NAT' ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 shadow-inner w-full max-w-sm">
                  <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">Enter Numerical Value:</label>
                  <input 
                    type="number" 
                    value={answers[currentQIndex] || ''} 
                    onChange={(e) => handleNatInput(e.target.value)} 
                    className="w-full bg-white border-2 border-slate-300 rounded-xl p-4 text-2xl font-black text-slate-800 outline-none focus:border-indigo-500 shadow-sm transition" 
                    placeholder="e.g. 4.5"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {currentQ.options?.map((opt, idx) => {
                    const isSelected = currentQ.type === 'MSQ' 
                      ? (Array.isArray(answers[currentQIndex]) && answers[currentQIndex].includes(opt.id))
                      : answers[currentQIndex] === opt.id;

                    return (
                      <label key={idx} className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all shadow-sm ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 hover:border-slate-400 bg-white'}`}>
                        <div className={`w-6 h-6 shrink-0 mt-0.5 flex items-center justify-center border-2 ${currentQ.type === 'MSQ' ? 'rounded' : 'rounded-full'} ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-400 text-transparent'}`}>
                          <i className={`fas ${currentQ.type === 'MSQ' ? 'fa-check text-[10px]' : 'fa-circle text-[8px]'}`}></i>
                        </div>
                        <input 
                          type={currentQ.type === 'MSQ' ? "checkbox" : "radio"} 
                          checked={isSelected} 
                          onChange={() => handleAnswerSelect(opt.id)} 
                          className="hidden" 
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800 leading-relaxed"><Latex>{opt.text}</Latex></div>
                          
                          {/* Dedicated Option Diagram Container */}
                          {opt.imageUrl && (
                            <div className="mt-3 inline-block">
                              <img src={opt.imageUrl} alt={`Option ${opt.id} Diagram`} className="max-h-32 object-contain border border-slate-200 rounded-lg p-1.5 bg-white shadow-sm pointer-events-none" draggable="false" />
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BOTTOM CONTROLS */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap justify-between gap-4">
              <div className="flex gap-3">
                <button 
                  onClick={toggleReview} 
                  className={`px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition border ${markedForReview[currentQIndex] ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}
                >
                  <i className="fas fa-bookmark mr-1.5"></i> {markedForReview[currentQIndex] ? "Unmark Review" : "Mark for Review"}
                </button>
                <button onClick={clearResponse} className="bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-black shadow-sm hover:bg-slate-200 transition">
                  Clear
                </button>
              </div>
              
              <div className="flex gap-3">
                <button onClick={() => navigateTo(Math.max(0, currentQIndex - 1))} disabled={currentQIndex === 0} className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-black shadow-md hover:bg-slate-700 transition disabled:opacity-50">
                  <i className="fas fa-arrow-left"></i>
                </button>
                <button onClick={() => navigateTo(Math.min(questions.length - 1, currentQIndex + 1))} disabled={currentQIndex === questions.length - 1} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-sm font-black shadow-md hover:bg-indigo-700 transition disabled:opacity-50">
                  Next <i className="fas fa-arrow-right ml-2"></i>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* RIGHT: QUESTION PALETTE */}
        <aside className="w-72 bg-slate-50 border-l border-slate-200 hidden lg:flex flex-col shrink-0">
          
          <div className="p-4 grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wide border-b border-slate-200 bg-white">
             <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2 rounded-lg flex justify-between items-center">
               <span>Answered</span> <span className="text-sm">{answeredCount}</span>
             </div>
             <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2 rounded-lg flex justify-between items-center">
               <span>Not Ans</span> <span className="text-sm">{notAnsweredCount}</span>
             </div>
             <div className="bg-slate-100 border border-slate-200 text-slate-600 p-2 rounded-lg flex justify-between items-center">
               <span>Not Visit</span> <span className="text-sm">{notVisitedCount}</span>
             </div>
             <div className="bg-purple-50 border border-purple-200 text-purple-700 p-2 rounded-lg flex justify-between items-center">
               <span>Review</span> <span className="text-sm">{markedCount}</span>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-widest">Question Palette</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, i) => {
                const isAnswered = questions[i].type === 'MSQ' ? (Array.isArray(answers[i]) && answers[i].length > 0) : (answers[i] !== undefined && answers[i] !== "");
                const isMarked = markedForReview[i];
                const isVis = visited[i];
                const isCurrent = currentQIndex === i;
                
                let btnStyle = "bg-white border-slate-300 text-slate-500"; 
                if (isVis && !isAnswered) btnStyle = "bg-rose-100 border-rose-300 text-rose-700"; 
                if (isAnswered) btnStyle = "bg-emerald-500 border-emerald-500 text-white"; 
                if (isMarked) btnStyle = "bg-purple-500 border-purple-500 text-white"; 
                if (isMarked && isAnswered) btnStyle = "bg-purple-600 border-purple-600 text-white shadow-[inset_0_-4px_0_0_#34d399]"; 

                return (
                  <button 
                    key={i}
                    onClick={() => navigateTo(i)}
                    className={`h-10 rounded-lg text-xs font-black transition-all border-2 flex items-center justify-center shadow-sm relative
                      ${btnStyle} 
                      ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110 z-10' : 'hover:scale-105'}`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-white">
            <button onClick={() => setShowSubmitConfirm(true)} className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl text-sm font-black shadow-lg transition uppercase tracking-widest flex items-center justify-center gap-2">
              <i className="fas fa-paper-plane"></i> Final Submit
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
}