"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { doc, getDoc, collection, getDocs, addDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// --- MATH RENDERING IMPORTS ---
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

// --- DRAGGABLE CALCULATOR COMPONENT ---
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

export default function ExamInterface() {
  const params = useParams();
  const mockId = params?.mockId || params?.['mock-id'] || params?.id; 
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [mockDetails, setMockDetails] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const [examPhase, setExamPhase] = useState('loading'); 
  const [hasAcceptedRules, setHasAcceptedRules] = useState(false);
  
  const [modal, setModal] = useState({ 
    show: false, type: "", title: "", message: "", 
    confirmText: "OK", onConfirm: null, 
    cancelText: "Cancel", onCancel: null, 
    hideCancel: false, dangerCancel: false 
  });
  
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const [activeSection, setActiveSection] = useState("");
  const [uniqueSections, setUniqueSections] = useState([]);

  const [currentIndex, setCurrentIndex] = useState(0); 
  const [answers, setAnswers] = useState({}); 
  const [statuses, setStatuses] = useState([]); 
  const [timeLeft, setTimeLeft] = useState(3600); 
  
  const [showCalculator, setShowCalculator] = useState(false);
  const containerRef = useRef(null);
  const [isSubmittingEngine, setIsSubmittingEngine] = useState(false);

  // --- SECURITY STATE & REFS ---
  const videoRef = useRef(null); 
  
  const [mediaStream, setMediaStream] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [violationCount, setViolationCount] = useState(0);

  // This flag prevents false "Window Blur" alarms during the fullscreen transition
  const [isStrictProctoringActive, setIsStrictProctoringActive] = useState(false); 

  // --- AI PROCTORING STATE ---
  const [aiModel, setAiModel] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(true);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

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
        showToast("Failed to load AI Engine. Exam cannot start.", "error");
      }
    };
    loadAiModel();
  }, []);

  // --- CAMERA ACTIVATION LOGIC ---
  const requestCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: "user" 
        }, 
        audio: false 
      });
      setMediaStream(stream);
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      showToast("Camera accessed securely.", "success");
    } catch (err) {
      console.error("Camera access denied:", err);
      showToast("Camera access is mandatory for this exam.", "error");
    }
  };

  // --- CLEANUP CAMERA ON UNMOUNT ---
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaStream]);

  // --- ACTIVATE STRICT PROCTORING (WITH GRACE PERIOD) ---
  useEffect(() => {
    if (examPhase === 'active') {
      const timer = setTimeout(() => setIsStrictProctoringActive(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setIsStrictProctoringActive(false);
    }
  }, [examPhase]);

  // ⚡ ULTRA-FAST AI PROCTORING DETECTION LOOP (500ms) ⚡
  useEffect(() => {
    let isDetecting = true; // Control flag to prevent memory leaks

    const runAiDetection = async () => {
      if (!isDetecting || !isStrictProctoringActive || !isCameraActive || !aiModel || modal.show) return;

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
            handleViolation("AI Detection: Mobile Phone or unauthorized device detected");
          } else if (personCount > 1) {
            handleViolation("AI Detection: Multiple persons detected in camera frame");
          }
        } catch (error) {
          console.error("Detection error:", error);
        }
      }

      // Loop: Wait 500ms and run again safely
      if (isDetecting) {
        setTimeout(runAiDetection, 500);
      }
    };

    // Kickstart the loop
    if (isStrictProctoringActive && isCameraActive && aiModel && !modal.show) {
      runAiDetection();
    }

    return () => {
      isDetecting = false; 
    };
  }, [isStrictProctoringActive, isCameraActive, aiModel, modal.show]);

  // --- TAB SWITCH & SPLIT SCREEN DETECTION ---
  useEffect(() => {
    if (!isStrictProctoringActive || modal.show) return;

    const handleVisibilityChange = () => {
      if (document.hidden) handleViolation("Tab Switch Detected");
    };

    const handleBlur = () => {
      handleViolation("Window Lost Focus / Split Screen Detected");
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isStrictProctoringActive, modal.show]);

  const handleViolation = (reason) => {
    setViolationCount(prev => {
      const newCount = prev + 1;
      
      if (newCount >= 3) {
        setModal({
          show: true,
          type: "warning",
          title: "Exam Terminated",
          message: "You have exceeded the maximum number of security violations. Your exam is being submitted automatically.",
          hideCancel: true,
          confirmText: "Close",
          onConfirm: () => executeSubmit()
        });
      } else {
        setModal({
          show: true,
          type: "warning",
          title: "Security Violation Logged",
          message: `${reason}. Please return to the exam environment immediately. Strike ${newCount} of 3.`,
          hideCancel: true,
          confirmText: "Acknowledge",
          onConfirm: () => {
              enterFullScreen();
              setModal({ show: false, type: "" });
          }
        });
      }
      return newCount;
    });
  };

  const triggerExitWarning = () => {
    if (!isStrictProctoringActive || modal.show) return;
    handleViolation("Exited Fullscreen Mode");
  };

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (examPhase === 'active') {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your exam is in progress.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [examPhase]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && examPhase === 'active') {
        triggerExitWarning();
      }
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, [examPhase, isStrictProctoringActive]);

  useEffect(() => {
    if (examPhase === 'active') {
      window.history.pushState(null, null, window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, null, window.location.href);
        exitFullScreen(); 
        triggerExitWarning(); 
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [examPhase, isStrictProctoringActive]);

  const enterFullScreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) elem.requestFullscreen();
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
  };

  const exitFullScreen = () => {
    if (document.fullscreenElement) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }
  };

  useEffect(() => {
    const fetchExamAndProgress = async () => {
      if (!mockId) return;
      try {
        const mockRef = doc(db, "mocks", mockId);
        const mockSnap = await getDoc(mockRef);
        
        if (!mockSnap.exists()) {
          showToast("Exam not found!", "error");
          router.push("/student");
          return;
        }
        
        const mockData = { id: mockSnap.id, ...mockSnap.data() };
        setMockDetails(mockData);
        const initialDurationSeconds = (mockData.duration || 60) * 60;

        const qRef = collection(db, "mocks", mockId, "questions");
        const qSnap = await getDocs(qRef);
        const fetchedQuestions = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQuestions(fetchedQuestions);
        
        const sections = [...new Set(fetchedQuestions.map(q => q.section || "General"))];
        setUniqueSections(sections);
        if (sections.length > 0) setActiveSection(sections[0]);

        const initialStatuses = Array(fetchedQuestions.length).fill('not-visited');
        if (fetchedQuestions.length > 0) initialStatuses[0] = 'not-answered';

        if (user) {
          const progressRef = doc(db, "progress", `${user.id}_${mockId}`);
          const progressSnap = await getDoc(progressRef);
          
          if (progressSnap.exists() && !progressSnap.data().isSubmitted) {
            const savedData = progressSnap.data();
            setAnswers(savedData.answers || {});
            setStatuses(savedData.statuses || initialStatuses);
            setTimeLeft(savedData.timeLeft || initialDurationSeconds);
          } else {
            setStatuses(initialStatuses);
            setTimeLeft(initialDurationSeconds);
          }
        } else {
          setStatuses(initialStatuses);
          setTimeLeft(initialDurationSeconds);
        }

        setExamPhase('instructions');
        
      } catch (error) {
        console.error("Error fetching exam:", error);
        showToast("Error loading exam.", "error");
      }
    };

    if (mockId && isLoaded) fetchExamAndProgress();
  }, [mockId, router, user, isLoaded]);

  useEffect(() => {
    if (examPhase !== 'active' || questions.length === 0 || isSubmittingEngine) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (!isSubmittingEngine) {
             setIsSubmittingEngine(true);
             handleAutoSubmit(); 
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examPhase, questions.length, isSubmittingEngine]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const saveProgressToCloud = async (newAnswers, newStatuses) => {
    if (user && mockDetails) {
      const progressRef = doc(db, "progress", `${user.id}_${mockId}`);
      await setDoc(progressRef, {
        studentId: user.id, mockId: mockId, mockTitle: mockDetails.title,
        answers: newAnswers, statuses: newStatuses, timeLeft: timeLeft,
        lastUpdated: new Date(), isSubmitted: false
      }, { merge: true });
    }
  };

  const handleStartExam = () => {
    if (!hasAcceptedRules || !isCameraActive || isAiLoading) return;
    enterFullScreen();
    setExamPhase('active');
    
    // Ensure the stream is firmly attached when UI swaps over
    if (videoRef.current && mediaStream && videoRef.current.srcObject !== mediaStream) {
      videoRef.current.srcObject = mediaStream;
    }
  };

  const navigateQuestion = (targetIndex, forcedCurrentStatus = null) => {
    setStatuses(prevStatuses => {
      const updated = [...prevStatuses];
      const currentQType = questions[currentIndex]?.type || 'MCQ';

      if (forcedCurrentStatus) {
         updated[currentIndex] = forcedCurrentStatus;
      } else {
         if (updated[currentIndex] !== 'marked' && updated[currentIndex] !== 'answered-marked') {
            updated[currentIndex] = checkHasAnswer(answers, currentIndex, currentQType) ? 'answered' : 'not-answered';
         }
      }

      if (updated[targetIndex] === 'not-visited') {
         updated[targetIndex] = 'not-answered';
      }

      saveProgressToCloud(answers, updated);
      return updated;
    });

    setCurrentIndex(targetIndex);
    const nextSection = questions[targetIndex].section || "General";
    if (nextSection !== activeSection) setActiveSection(nextSection);
  };

  const handleSectionTabClick = (sec) => {
    if (sec === activeSection) return;
    const firstQuestionIndex = questions.findIndex(q => (q.section || "General") === sec);
    if (firstQuestionIndex !== -1) navigateQuestion(firstQuestionIndex, null);
  };

  const checkHasAnswer = (ansObj, index, qType) => {
    const ans = ansObj[index];
    if (ans === undefined || ans === null) return false;
    if (qType === 'MSQ' && Array.isArray(ans)) return ans.length > 0;
    return String(ans).trim() !== '';
  };

  const handleAnswerChange = (val, type) => {
    const newAnswers = { ...answers };
    if (type === 'MSQ') {
      const currentAns = Array.isArray(newAnswers[currentIndex]) ? newAnswers[currentIndex] : [];
      if (currentAns.includes(val)) {
        newAnswers[currentIndex] = currentAns.filter(item => item !== val);
      } else {
        newAnswers[currentIndex] = [...currentAns, val];
      }
    } else {
      newAnswers[currentIndex] = val;
    }
    
    setAnswers(newAnswers);

    setStatuses(prev => {
      const updated = [...prev];
      const hasAns = checkHasAnswer(newAnswers, currentIndex, type);
      if (updated[currentIndex] === 'marked' || updated[currentIndex] === 'answered-marked') {
        updated[currentIndex] = hasAns ? 'answered-marked' : 'marked';
      } else {
        updated[currentIndex] = hasAns ? 'answered' : 'not-answered';
      }
      saveProgressToCloud(newAnswers, updated);
      return updated;
    });
  };

  const clearResponse = () => {
    const newAnswers = { ...answers };
    delete newAnswers[currentIndex];
    setAnswers(newAnswers);
    
    setStatuses(prev => {
      const updated = [...prev];
      updated[currentIndex] = 'not-answered';
      saveProgressToCloud(newAnswers, updated);
      return updated;
    });
  };

  const saveAndNext = () => {
    const currentQType = questions[currentIndex]?.type || 'MCQ';
    const newStatus = checkHasAnswer(answers, currentIndex, currentQType) ? 'answered' : 'not-answered';
    
    const currentSectionQs = questions.map((q, i) => ({...q, globalIdx: i})).filter(q => (q.section || "General") === activeSection);
    const isLastInSection = currentSectionQs[currentSectionQs.length - 1].globalIdx === currentIndex;

    if (isLastInSection) {
      const sectionIdx = uniqueSections.indexOf(activeSection);
      if (sectionIdx < uniqueSections.length - 1) {
        const nextSecName = uniqueSections[sectionIdx + 1];
        const firstInNext = questions.findIndex(q => (q.section || "General") === nextSecName);
        navigateQuestion(firstInNext, newStatus);
      } else {
         navigateQuestion(currentIndex, newStatus); 
      }
    } else {
      if (currentIndex < questions.length - 1) navigateQuestion(currentIndex + 1, newStatus);
    }
  };

  const markAndNext = () => {
    const currentQType = questions[currentIndex]?.type || 'MCQ';
    const newStatus = checkHasAnswer(answers, currentIndex, currentQType) ? 'answered-marked' : 'marked';
    
    const currentSectionQs = questions.map((q, i) => ({...q, globalIdx: i})).filter(q => (q.section || "General") === activeSection);
    const isLastInSection = currentSectionQs[currentSectionQs.length - 1].globalIdx === currentIndex;

    if (isLastInSection) {
      const sectionIdx = uniqueSections.indexOf(activeSection);
      if (sectionIdx < uniqueSections.length - 1) {
        const nextSecName = uniqueSections[sectionIdx + 1];
        const firstInNext = questions.findIndex(q => (q.section || "General") === nextSecName);
        navigateQuestion(firstInNext, newStatus);
      } else {
         navigateQuestion(currentIndex, newStatus); 
      }
    } else {
      if (currentIndex < questions.length - 1) navigateQuestion(currentIndex + 1, newStatus);
    }
  };

  const triggerSubmitConfirmation = () => {
    let answeredCount = 0;
    questions.forEach((q, idx) => {
      if (checkHasAnswer(answers, idx, q.type)) answeredCount++;
    });
    
    const unattempted = questions.length - answeredCount;
    setModal({
      show: true,
      type: "confirm",
      title: "Submit Exam?",
      message: `You have answered ${answeredCount} questions and left ${unattempted} unattempted. Are you sure you want to submit?`,
      confirmText: "Yes, Submit Exam",
      cancelText: "Resume Exam",
      hideCancel: false,
      dangerCancel: false,
      onConfirm: () => {
        setModal({ show: false });
        executeSubmit();
      },
      onCancel: () => setModal({ show: false })
    });
  };

  const handleAutoSubmit = () => {
    setModal({
      show: true,
      type: "info",
      title: "Time's Up!",
      message: "The duration of the exam has elapsed. Your responses are being automatically submitted.",
      confirmText: "View Results",
      hideCancel: true,
      onConfirm: () => executeSubmit()
    });
  };

  const executeSubmit = async () => {
    setExamPhase('submitting');
    exitFullScreen();
    
    if (mediaStream) {
       mediaStream.getTracks().forEach(track => track.stop());
    }
    
    try {
      let score = 0; let correct = 0; let incorrect = 0;
      
      questions.forEach((q, index) => {
        const hasAns = checkHasAnswer(answers, index, q.type);
        if (hasAns) {
          let isCorrect = false;
          const studentAns = answers[index];
          
          if (q.type === 'MSQ') {
            const correctArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
            const studentArr = Array.isArray(studentAns) ? studentAns : [];
            if (correctArr.length === studentArr.length && correctArr.every(val => studentArr.includes(val))) {
              isCorrect = true;
            }
          } else if (q.type === 'NAT') {
            isCorrect = parseFloat(studentAns) === parseFloat(q.correctAnswer);
          } else {
            isCorrect = studentAns === q.correctAnswer || studentAns === q.correctOption;
          }

          if (isCorrect) { 
            score += Number(q.marks) || 2; 
            correct++; 
          } else { 
            score -= Number(q.negativeMarks) || 0.66; 
            incorrect++; 
          }
        }
      });

      // NO SNAPSHOTS SAVED HERE
      await addDoc(collection(db, "results"), {
        studentId: user?.id || "anonymous", studentName: user?.fullName || "Student",
        studentEmail: user?.primaryEmailAddress?.emailAddress || "No Email", studentAvatar: user?.imageUrl || "",
        mockId: mockId, examTitle: mockDetails?.title, score: parseFloat(score.toFixed(2)),
        correct, incorrect, unattempted: questions.length - (correct + incorrect),
        violations: violationCount,
        submittedAt: new Date(), answers 
      });

      if (user) {
        const progressRef = doc(db, "progress", `${user.id}_${mockId}`);
        await setDoc(progressRef, { isSubmitted: true }, { merge: true });
      }

      setExamPhase('submitted');
      setTimeout(() => router.replace("/student"), 3000); 
    } catch (error) {
      console.error("Error submitting exam:", error);
      showToast("Failed to submit exam.", "error");
      setExamPhase('active');
    }
  };

  const getPaletteClass = (status) => {
    switch (status) {
      case 'answered': return 'bg-emerald-500 text-white clip-answered border-emerald-600';
      case 'not-answered': return 'bg-rose-500 text-white clip-not-answered border-rose-600';
      case 'marked': return 'bg-indigo-600 text-white rounded-full border-indigo-700';
      case 'answered-marked': return 'bg-indigo-600 text-white rounded-full relative after:absolute after:bottom-0 after:right-0 after:w-2.5 after:h-2.5 after:bg-emerald-400 after:rounded-full after:border-2 after:border-white';
      default: return 'bg-slate-100 text-slate-700 border border-slate-300 rounded-md'; 
    }
  };

  const getStatusCount = (targetStatus) => statuses.filter(s => s === targetStatus).length;

  if (examPhase === 'loading' || !isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;
  if (questions.length === 0) return <div className="p-10 text-center">No questions found for this exam.</div>;

  if (examPhase === 'instructions') {
    return (
      <div className="bg-slate-50 min-h-screen font-sans flex flex-col items-center py-10 px-4 select-none">
        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold"><i className="fas fa-shield-halved text-indigo-400 mr-2"></i> AI Secure Exam Environment</h1>
            <div className="text-sm font-bold bg-slate-800 px-3 py-1 rounded">Duration: {mockDetails?.duration} mins</div>
          </div>
          
          <div className="p-8 text-slate-700 space-y-6 max-h-[60vh] overflow-y-auto">
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <h3 className="font-black text-rose-700 flex items-center gap-2 mb-2"><i className="fas fa-robot"></i> AI Proctoring Requirements</h3>
                <p className="text-sm font-medium text-rose-900 mb-3">
                  This exam utilizes advanced AI computer vision. <strong>Webcam access is mandatory.</strong> The system actively scans for:
                </p>
                <ul className="list-disc pl-5 text-sm font-medium text-rose-900 mb-4 space-y-1">
                  <li>Mobile phones or unauthorized devices in the frame.</li>
                  <li>Multiple persons present in the camera view.</li>
                  <li>Tab switching, window unfocusing, and exiting fullscreen.</li>
                </ul>
                <p className="text-sm font-bold text-rose-900">3 violations will result in automatic test termination.</p>
                
                <div className="mt-4 flex flex-col gap-3">
                  {!isCameraActive ? (
                    <button onClick={requestCameraAccess} className="bg-rose-600 w-fit text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-rose-700 transition">
                      Grant Camera Permission
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 border border-emerald-200 rounded-lg w-fit">
                      <i className="fas fa-check-circle"></i> Camera Active
                    </div>
                  )}

                  {isAiLoading ? (
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                      <i className="fas fa-circle-notch fa-spin"></i> Initializing AI Proctoring Model...
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-indigo-600 font-bold bg-indigo-50 px-4 py-2 border border-indigo-200 rounded-lg w-fit">
                      <i className="fas fa-brain"></i> AI Engine Ready
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE PREVIEW BOX IN INSTRUCTIONS */}
              {isCameraActive && (
                <div className="w-full md:w-64 shrink-0 bg-slate-900 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-lg relative flex flex-col">
                   <div className="bg-slate-800 text-white text-xs font-bold text-center py-1">Live Camera Preview</div>
                   {/* ⚡ FIXED: Auto-attach stream on the instruction screen ⚡ */}
                   <video 
                     ref={(el) => {
                       if (el && mediaStream && el.srcObject !== mediaStream) {
                         el.srcObject = mediaStream;
                         videoRef.current = el; 
                       }
                     }} 
                     autoPlay playsInline muted 
                     className="w-full h-40 object-cover transform scale-x-[-1]"
                   ></video>
                </div>
              )}
            </div>

            <p className="font-bold text-lg text-slate-900 mt-6">Please read the following instructions carefully.</p>
            <ul className="list-decimal pl-5 space-y-3 font-medium">
              <li>The clock will be set at the server. The countdown timer will display the remaining time.</li>
              <li>When the timer reaches zero, the examination will end automatically.</li>
              <li>This examination uses a strict Fullscreen Anti-Cheat mechanism.</li>
              <li><strong>Copying text and right-clicking are strictly prohibited.</strong></li>
            </ul>

            <h3 className="font-bold text-slate-900 mt-6 text-lg">Question Palette Legend:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-slate-100 text-slate-500 border border-slate-300 rounded-md flex justify-center items-center font-bold">1</div> <span>You have not visited the question yet.</span></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-rose-500 text-white clip-not-answered flex justify-center items-center font-bold">2</div> <span>You have not answered the question.</span></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-emerald-500 text-white clip-answered flex justify-center items-center font-bold">3</div> <span>You have answered the question.</span></div>
              <div className="flex items-center gap-3"><div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex justify-center items-center font-bold">4</div> <span>You have NOT answered the question, but marked it for review.</span></div>
              <div className="flex items-center gap-3 md:col-span-2"><div className="w-8 h-8 bg-indigo-600 text-white rounded-full relative after:absolute after:bottom-0 after:right-0 after:w-2.5 after:h-2.5 after:bg-emerald-400 after:rounded-full after:border-2 after:border-white flex justify-center items-center font-bold">5</div> <span>The question is answered and marked for review.</span></div>
            </div>
          </div>

          <div className="p-6 bg-slate-100 border-t border-slate-200">
            <label className="flex items-start gap-3 cursor-pointer p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-400 transition shadow-sm">
              <input type="checkbox" checked={hasAcceptedRules} onChange={(e) => setHasAcceptedRules(e.target.checked)} className="mt-1 w-5 h-5 accent-indigo-600 cursor-pointer" />
              <span className="text-sm font-bold text-slate-700">I have read and understood the instructions. I agree that in case of not adhering to the instructions, including AI detection of unauthorized devices or persons, I will be disqualified.</span>
            </label>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleStartExam} 
                disabled={!hasAcceptedRules || !isCameraActive || isAiLoading}
                className={`px-8 py-3.5 rounded-xl font-black shadow-md transition transform flex items-center gap-2 ${(hasAcceptedRules && isCameraActive && !isAiLoading) ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5 shadow-indigo-600/30' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}
              >
                {(!isCameraActive || isAiLoading) ? 'Waiting for System Readiness' : 'I am ready to begin'} <i className="fas fa-play ml-1"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (examPhase === 'submitting' || examPhase === 'submitted') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 font-sans p-6 text-center">
        <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl transform transition-all scale-100">
          {examPhase === 'submitting' ? (
            <>
              <i className="fas fa-circle-notch fa-spin text-5xl text-indigo-600 mb-6"></i>
              <h2 className="text-2xl font-black text-slate-800 animate-pulse">Submitting Exam...</h2>
              <p className="text-slate-500 mt-2">Please do not close this window.</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6"><i className="fas fa-check-double"></i></div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">Submission Successful</h2>
              <p className="text-slate-500 mb-6">Your responses have been securely recorded. Redirecting to your dashboard...</p>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full w-full animate-[progress_3s_linear]"></div></div>
            </>
          )}
        </div>
        <style dangerouslySetInnerHTML={{__html: `@keyframes progress { from { width: 0%; } to { width: 100%; } }`}} />
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const currentQType = currentQ.type || 'MCQ';
  const currentSectionQuestions = questions.map((q, idx) => ({ ...q, globalIndex: idx })).filter(q => (q.section || "General") === activeSection);
  const localQuestionNumber = currentSectionQuestions.findIndex(q => q.globalIndex === currentIndex) + 1;

  return (
    <div 
      ref={containerRef} 
      className="bg-slate-50 text-slate-900 font-sans h-screen flex flex-col overflow-hidden select-none"
      onContextMenu={(e) => e.preventDefault()} 
      onCopy={(e) => e.preventDefault()} 
    >
      
      <style dangerouslySetInnerHTML={{__html: `
        .clip-answered { clip-path: polygon(100% 0, 100% 75%, 50% 100%, 0 75%, 0 0); }
        .clip-not-answered { clip-path: polygon(100% 0, 100% 75%, 50% 100%, 0 75%, 0 0); }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
      `}} />

      {showCalculator && <DraggableCalculator onClose={() => setShowCalculator(false)} />}

      {toast.show && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl z-[99999] flex items-center gap-3 animate-slide-up ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-xl`}></i>
          <span className="font-bold tracking-wide">{toast.message}</span>
        </div>
      )}

      {modal.show && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 ${modal.type === 'warning' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
              <i className={`fas ${modal.type === 'warning' ? 'fa-exclamation-triangle' : modal.type === 'info' ? 'fa-info-circle' : 'fa-question-circle'}`}></i>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-3">{modal.title}</h2>
            <p className="text-slate-600 mb-8 font-medium leading-relaxed">{modal.message}</p>
            <div className="flex gap-4">
              {!modal.hideCancel && (
                <button 
                  onClick={modal.onCancel ? modal.onCancel : () => setModal({ show: false, type: "" })} 
                  className={`flex-1 py-3.5 rounded-xl font-bold transition ${modal.dangerCancel ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  {modal.cancelText}
                </button>
              )}
              <button 
                onClick={modal.onConfirm} 
                className={`flex-1 text-white py-3.5 rounded-xl font-bold transition shadow-lg ${modal.type === 'warning' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'}`}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-slate-900 text-white p-3 flex justify-between items-center shrink-0 shadow-md z-20">
        <div className="text-xl font-bold flex items-center gap-2">
            <i className="fas fa-book-open-reader text-emerald-400"></i> OZONE
        </div>
        <div className="text-lg font-bold tracking-wide">
            {mockDetails?.title || "Live Exam"}
        </div>
        <div className="flex items-center gap-4">
            
            <div className="flex flex-col items-end mr-2">
              <span className={`text-[10px] font-bold tracking-widest uppercase ${isStrictProctoringActive ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                {isStrictProctoringActive ? 'Strict Mode ON' : 'Initializing...'}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <i className="fas fa-brain text-indigo-400"></i> AI Scanning
              </div>
            </div>

            {/* LARGER VISIBLE CAMERA FEED */}
            <div className="w-24 h-16 rounded overflow-hidden bg-black border-2 border-emerald-500 relative shadow-inner shadow-black/50">
               {/* ⚡ ACTIVE EXAM FEED ⚡ */}
               <video 
                 ref={(el) => {
                   if (el && mediaStream && el.srcObject !== mediaStream) {
                     el.srcObject = mediaStream;
                     videoRef.current = el; // Bind to TFJS ref
                   }
                 }} 
                 autoPlay playsInline muted 
                 className="w-full h-full object-cover transform scale-x-[-1]"
               ></video>
               <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse shadow-rose-500 shadow-sm"></div>
            </div>

            {mockDetails?.allowCalculator !== false && (
              <button onClick={() => setShowCalculator(!showCalculator)} className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition border ${showCalculator ? 'bg-indigo-600 text-white border-indigo-500 shadow-inner' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border-slate-700'}`}>
                  <i className="fas fa-calculator text-indigo-300"></i> Calculator
              </button>
            )}
        </div>
      </header>

      <div className={`flex flex-1 overflow-hidden ${modal.show ? 'filter blur-sm pointer-events-none' : ''} transition-all`}>
        
        <main className="flex-1 flex flex-col bg-white border-r border-slate-300 relative">
          
          <div className="bg-slate-100 pt-2 px-2 flex justify-between items-end border-b border-slate-300 shrink-0">
            <div className="flex gap-1 overflow-x-auto">
              {uniqueSections.map((sec) => (
                <button key={sec} onClick={() => handleSectionTabClick(sec)} className={`px-5 py-2.5 text-sm font-bold rounded-t-xl transition-colors border border-b-0 ${activeSection === sec ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 shadow-inner'}`}>
                  {sec}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pr-4 pb-1">
                <span className="text-slate-500 text-sm font-bold uppercase tracking-wide">Time Left:</span>
                <div className={`px-4 py-1.5 rounded-lg text-lg font-mono font-black shadow-inner border ${timeLeft < 300 ? 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse' : 'bg-slate-800 text-white border-slate-900'}`}>
                    {formatTime(timeLeft)}
                </div>
            </div>
          </div>

          <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-indigo-50 shrink-0">
            <div className="flex items-center gap-4">
               <h2 className="text-lg font-black text-slate-800">Question No. {localQuestionNumber || 1}</h2>
               <span className="px-3 py-1 bg-white text-indigo-600 rounded-lg text-xs font-black uppercase tracking-wider border border-indigo-200 shadow-sm">{currentQType}</span>
            </div>
            
            <div className="flex gap-6 text-sm font-bold text-slate-600 bg-white px-4 py-1.5 rounded-full border border-indigo-100 shadow-sm">
                <div className="flex items-center gap-1"><i className="fas fa-plus-circle text-emerald-500"></i> {currentQ.marks || 2} Marks</div>
                <div className="flex items-center gap-1"><i className="fas fa-minus-circle text-rose-500"></i> {currentQ.negativeMarks || 0.66} Marks</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 text-base">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <div className="font-bold text-slate-900 leading-relaxed text-lg whitespace-pre-wrap overflow-x-auto">
                    <Latex>{currentQ.text}</Latex>
                  </div>
                  
                  {currentQ.imageUrl && (
                    <div className="mt-4 p-3 border border-slate-200 rounded-xl bg-slate-50 inline-block shadow-sm">
                      <img src={currentQ.imageUrl} alt="Question Diagram" className="max-h-[350px] object-contain pointer-events-none" draggable="false" />
                    </div>
                  )}
                </div>
                
                {currentQType === 'NAT' ? (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mt-6 shadow-inner w-full max-w-sm">
                    <label className="block text-sm font-bold text-slate-600 uppercase tracking-wider mb-4">Enter Numerical Value:</label>
                    <input 
                      type="number" 
                      value={answers[currentIndex] || ''} 
                      onChange={(e) => handleAnswerChange(e.target.value, 'NAT')}
                      className="w-full bg-white border-2 border-slate-300 rounded-xl p-4 text-2xl font-black text-slate-800 outline-none focus:border-indigo-500 shadow-sm transition"
                      placeholder="e.g. 4.5"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      {currentQ.options?.map((opt, i) => {
                        const isSelected = currentQType === 'MSQ' 
                          ? (Array.isArray(answers[currentIndex]) && answers[currentIndex].includes(opt.id))
                          : answers[currentIndex] === opt.id;

                        return (
                          <label key={i} className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all shadow-sm ${isSelected ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                              <input 
                                type={currentQType === 'MSQ' ? "checkbox" : "radio"} 
                                name={currentQType === 'MSQ' ? `q-${currentIndex}-${i}` : `q-${currentIndex}`} 
                                checked={isSelected} 
                                onChange={() => handleAnswerChange(opt.id, currentQType)} 
                                className={`mt-1 w-5 h-5 cursor-pointer shrink-0 accent-indigo-600 ${currentQType === 'MSQ' ? 'rounded-sm' : ''}`} 
                              />
                              <div className="flex-1 overflow-x-auto">
                                <div className="font-bold text-slate-800 text-base"><Latex>{opt.text}</Latex></div>
                                
                                {opt.imageUrl && (
                                  <div className="mt-3 inline-block">
                                    <img src={opt.imageUrl} alt={`Option ${opt.id} Diagram`} className="max-h-32 object-contain border border-slate-200 rounded-lg p-1.5 bg-white shadow-sm pointer-events-none" draggable="false" />
                                  </div>
                                )}
                              </div>
                          </label>
                        )
                      })}
                  </div>
                )}
            </div>
          </div>

          <div className="p-4 bg-slate-100 border-t border-slate-300 flex justify-between items-center shrink-0">
            <div className="flex gap-3">
                <button onClick={clearResponse} className="bg-white border border-slate-300 text-slate-700 px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 shadow-sm transition">
                    Clear Response
                </button>
                <button onClick={markAndNext} className="bg-amber-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-600 shadow-sm transition">
                    Mark for Review & Next
                </button>
            </div>
            <button onClick={saveAndNext} className="bg-emerald-600 text-white px-8 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm transition flex items-center gap-2">
                Save & Next <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
        </main>

        <aside className="w-[320px] bg-slate-50 flex flex-col shrink-0 border-l border-slate-200 overflow-hidden">
          <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-4 shrink-0">
            <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Student&background=4F46E5&color=fff"} alt="Candidate" className="w-14 h-14 rounded-lg border border-slate-200 shadow-sm pointer-events-none" />
            <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-0.5">Candidate</div>
                <div className="text-sm font-bold text-slate-800 truncate w-48">{user?.fullName || "Student"}</div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-200 bg-white shrink-0">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Total Questions</span>
              <span className="text-sm font-black text-indigo-700 bg-indigo-100/50 border border-indigo-200 px-3 py-1 rounded-lg">{questions.length}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-3">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-emerald-500 clip-answered shadow-sm"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Answered</span>
                </div>
                <span className="text-xs font-black text-slate-900">{getStatusCount('answered')}</span>
              </div>
              
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-rose-500 clip-not-answered shadow-sm"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Not Ans</span>
                </div>
                <span className="text-xs font-black text-slate-900">{getStatusCount('not-answered')}</span>
              </div>
              
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-white border border-slate-300 rounded shadow-sm"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Not Visited</span>
                </div>
                <span className="text-xs font-black text-slate-900">{getStatusCount('not-visited')}</span>
              </div>
              
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-indigo-600 rounded-full shadow-sm"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Marked</span>
                </div>
                <span className="text-xs font-black text-slate-900">{getStatusCount('marked')}</span>
              </div>
            </div>

            <div className="mt-3 bg-slate-50 border border-slate-100 p-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-indigo-600 rounded-full relative flex shrink-0 shadow-sm after:absolute after:bottom-0 after:right-0 after:w-2 after:h-2 after:bg-emerald-400 after:rounded-full after:border border-white"></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">Ans & Marked</span>
                  <span className="text-[8px] text-slate-500 font-medium tracking-wide">Will be evaluated</span>
                </div>
              </div>
              <span className="text-sm font-black text-slate-900">{getStatusCount('answered-marked')}</span>
            </div>
          </div>

          <div className="bg-indigo-600 text-white py-3 px-5 text-sm font-bold flex justify-between items-center shadow-sm z-10 shrink-0">
            <span>{activeSection}</span>
            <span className="bg-indigo-800 px-2 py-0.5 rounded text-xs">{currentSectionQuestions.length} Qs</span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 bg-slate-100/50">
            <div className="grid grid-cols-5 gap-3">
              {currentSectionQuestions.map((q, localIndex) => {
                const isCurrent = q.globalIndex === currentIndex;
                return (
                  <div 
                    key={q.globalIndex} 
                    className={`relative flex items-center justify-center w-12 h-12 rounded-lg transition-all 
                      ${isCurrent ? 'bg-slate-300 border-2 border-slate-500 shadow-inner' : ''}
                    `}
                  >
                    <button 
                      onClick={() => navigateQuestion(q.globalIndex)}
                      className={`w-10 h-10 font-black flex items-center justify-center transition-transform shadow-sm
                        ${getPaletteClass(statuses[q.globalIndex])}
                        ${isCurrent ? 'scale-105 z-10 shadow-md' : 'hover:opacity-80 hover:scale-105'}
                      `}
                    >
                      {localIndex + 1}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="p-5 bg-white border-t border-slate-200 flex justify-center shrink-0">
            <button 
              onClick={triggerSubmitConfirmation}
              className="w-full bg-indigo-600 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition transform hover:-translate-y-0.5"
            >
                Submit Exam
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
}