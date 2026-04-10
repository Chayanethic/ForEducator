"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Latex from "react-latex-next";
import 'katex/dist/katex.min.css';

// FIREBASE IMPORTS
import { doc, setDoc, updateDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function EducatorQuizPollPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- ENGINE STATE ---
  const [roomCode, setRoomCode] = useState(null);
  const [view, setView] = useState("create"); // 'create', 'dashboard', 'leaderboard'
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // --- FORM STATE ---
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState("multiple-choice");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctMcqIndex, setCorrectMcqIndex] = useState(0); // Tracks which MCQ option is correct
  const [correctNumeric, setCorrectNumeric] = useState("");
  const [timerDuration, setTimerDuration] = useState(30);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formError, setFormError] = useState("");

  // --- LIVE DATA FROM FIREBASE ---
  const [roomData, setRoomData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // Real-time Firebase Listener
  useEffect(() => {
    if (!roomCode) return;

    const roomRef = doc(db, "live_polls", roomCode);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomData(snapshot.data());
      } else {
        setRoomData(null);
      }
    });

    return () => unsubscribe();
  }, [roomCode]);

  // Local Timer Engine (Driven by Firebase expiresAt timestamp)
  useEffect(() => {
    let interval;
    if (roomData?.status === "active" && roomData?.expiresAt) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((roomData.expiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 200);
    } else {
      setTimeLeft(0);
    }
    return () => clearInterval(interval);
  }, [roomData]);

  const handleCreateRoom = async () => {
    if (!user) return;
    setIsConnecting(true);
    
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const roomRef = doc(db, "live_polls", code);
      
      await setDoc(roomRef, {
        educatorId: user.id,
        educatorName: user.fullName || "Educator",
        status: "waiting",
        students: {},
        responses: {},
        scores: {}, // Tracks student points!
        createdAt: Date.now()
      });
      
      setRoomCode(code);
      setView("dashboard");
    } catch (err) {
      console.error("Error creating room:", err);
      alert("Failed to create room. Check database permissions.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleStartPoll = async () => {
    if (!questionText.trim()) {
      setFormError("Question text is required.");
      return;
    }
    if (timerDuration < 10) {
      setFormError("Timer must be at least 10 seconds.");
      return;
    }

    let validOptions = [];
    if (questionType === "multiple-choice") {
      validOptions = options.filter(opt => opt.trim() !== "");
      if (validOptions.length < 2) {
        setFormError("Provide at least 2 options.");
        return;
      }
      if (!validOptions[correctMcqIndex]) {
         setFormError("The selected correct answer cannot be blank.");
         return;
      }
    }

    setFormError("");

    let imageData = null;
    if (imageFile) {
      imageData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(imageFile);
      });
    }

    const correctAns = questionType === "multiple-choice" ? validOptions[correctMcqIndex] : correctNumeric;

    try {
      const roomRef = doc(db, "live_polls", roomCode);
      await updateDoc(roomRef, {
        status: "active",
        expiresAt: Date.now() + (timerDuration * 1000),
        question: {
          text: questionText,
          type: questionType,
          options: validOptions,
          image: imageData,
          timer: timerDuration,
          correctAnswer: correctAns,
        },
        responses: {} // Reset responses for new question, but keep scores!
      });

      setQuestionText("");
      setOptions(["", "", "", ""]);
      setCorrectNumeric("");
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error("Error starting poll:", err);
      setFormError("Failed to push poll to students.");
    }
  };

  // Syncs the entire classroom to the Leaderboard screen
  const handleShowLeaderboard = async () => {
    setView("leaderboard");
    if (roomCode) {
       await updateDoc(doc(db, "live_polls", roomCode), { status: "leaderboard" });
    }
  };

  // Syncs the entire classroom back to the Waiting screen
  const handleBackToStudio = async () => {
    setView("dashboard");
    if (roomCode) {
       await updateDoc(doc(db, "live_polls", roomCode), { status: "waiting" });
    }
  };

  const handleEndRoom = async () => {
    if (confirm("Are you sure you want to close this room? All students will be disconnected.")) {
      try {
        await deleteDoc(doc(db, "live_polls", roomCode));
        setRoomCode(null);
        setRoomData(null);
        setView("create");
      } catch (err) {
        console.error("Failed to end room", err);
      }
    }
  };

  const copyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;

  const liveStudents = Object.keys(roomData?.students || {});
  
  // Calculate Leaderboard Rankings
  const leaderboard = Object.entries(roomData?.scores || {})
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden selection:bg-teal-100 selection:text-teal-900">
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-950 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-indigo-900">
          <Link href="/onboarding?switch=true" className="text-xl font-black flex items-center gap-2 hover:text-teal-400 transition cursor-pointer tracking-tight">
            <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/50">
                <i className="fas fa-book-open-reader text-white text-sm"></i>
            </div>
            OZONE
          </Link>
          <button className="md:hidden text-indigo-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><i className="fas fa-times text-lg"></i></button>
        </div>
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button onClick={() => router.push('/educator/dashboard')} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-home w-4"></i> Dashboard
            </button>
            <button onClick={() => router.push('/educator/create-mock')} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-file-pdf w-4"></i> Exam Studio
            </button>
            <button className="w-full flex items-center gap-3 bg-indigo-800 text-white p-2.5 rounded-xl text-sm font-bold border-l-4 border-teal-400 shadow-inner">
                <i className="fas fa-bolt w-4 text-teal-400"></i> Live Quiz Poll
            </button>
        </nav>
        <div className="p-3 border-t border-indigo-900 space-y-1.5">
            <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-600 hover:text-white p-2 rounded-xl transition text-xs font-bold bg-rose-950/20 shadow-sm border border-rose-900/30 hover:border-rose-500">
                <i className="fas fa-sign-out-alt"></i> Log Out
            </button>
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <header className="bg-white border-b border-slate-200 h-16 px-4 md:px-6 flex justify-between items-center z-20 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
             <button className="md:hidden text-slate-600 shrink-0" onClick={() => setIsMobileMenuOpen(true)}><i className="fas fa-bars text-xl"></i></button>
             <div>
               <h1 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2">
                 <i className="fas fa-satellite-dish text-indigo-600"></i> Live Poll Studio
               </h1>
             </div>
          </div>
          {roomCode && (
            <div className="flex gap-2">
              <span className="hidden sm:flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 text-xs font-black">
                Room: {roomCode}
              </span>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">

            {/* --- VIEW: CREATE ROOM --- */}
            {view === "create" && (
              <div className="bg-white p-8 md:p-12 rounded-[2rem] border border-slate-200 shadow-sm text-center mt-10 max-w-2xl mx-auto">
                <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-inner border border-indigo-100">
                  <i className="fas fa-bolt"></i>
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">Start a Live Classroom Poll</h2>
                <p className="text-slate-500 font-medium mb-8">Create an instant room. Students join via a 6-digit code, answer questions, and compete on the leaderboard!</p>
                
                <button 
                  onClick={handleCreateRoom}
                  disabled={isConnecting}
                  className="w-full max-w-sm mx-auto bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 text-lg"
                >
                  {isConnecting ? <><i className="fas fa-circle-notch fa-spin"></i> Generating Room...</> : <><i className="fas fa-play"></i> Create Live Room</>}
                </button>
              </div>
            )}

            {/* --- VIEW: DASHBOARD --- */}
            {view === "dashboard" && (
              <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                
                {/* Room Status Bar */}
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden border border-slate-800">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="text-center sm:text-left">
                      <p className="text-indigo-300 text-xs font-black uppercase tracking-widest mb-1">Students join at ozoneprep.com/join with code:</p>
                      <h2 className="text-4xl md:text-5xl font-black tracking-widest text-teal-400 drop-shadow-md">{roomCode}</h2>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 relative z-10 w-full sm:w-auto">
                    <button onClick={copyCode} className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 border border-slate-700 px-5 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 text-white">
                      {copied ? <><i className="fas fa-check text-emerald-400"></i> Copied!</> : <><i className="fas fa-copy text-indigo-400"></i> Copy Code</>}
                    </button>
                    <button onClick={handleEndRoom} className="flex-1 sm:flex-none bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/50 text-rose-400 px-5 py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2">
                      <i className="fas fa-power-off"></i> End Session
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left: Question Creator Form */}
                  <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <i className="fas fa-pen-nib text-indigo-600"></i> Draft Question
                      </h3>
                      <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">Editor</span>
                    </div>
                    
                    <div className="space-y-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex justify-between">
                           <span>Question Text</span>
                           <span className="text-indigo-400"><i className="fas fa-paste"></i> You can paste images here</span>
                        </label>
                        <textarea 
                          value={questionText} 
                          onChange={e=>setQuestionText(e.target.value)} 
                          onPaste={(e) => {
                            const items = e.clipboardData?.items;
                            if (!items) return;
                            for (let i = 0; i < items.length; i++) {
                              if (items[i].type.indexOf("image") !== -1) {
                                const file = items[i].getAsFile();
                                setImageFile(file);
                                setImagePreview(URL.createObjectURL(file));
                                e.preventDefault();
                                break;
                              }
                            }
                          }}
                          rows="3" 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition resize-none shadow-inner" 
                          placeholder="e.g. What is the powerhouse of the cell? (Or press Ctrl+V to paste an image)"
                        ></textarea>
                      </div>

                      {imagePreview && (
                        <div className="relative inline-block">
                          <img src={imagePreview} alt="Preview" className="h-32 object-contain rounded-lg border border-slate-200 shadow-sm p-1" />
                          <button onClick={() => {setImageFile(null); setImagePreview(null);}} className="absolute -top-2 -right-2 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 transition">
                            <i className="fas fa-times text-xs"></i>
                          </button>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Question Type</label>
                          <select 
                            value={questionType} 
                            onChange={e=>setQuestionType(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 shadow-sm"
                          >
                            <option value="multiple-choice">Multiple Choice (MCQ)</option>
                            <option value="numeric">Numeric Answer (NAT)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Timer (Seconds)</label>
                          <div className="relative">
                            <input 
                              type="number" 
                              min="10" 
                              value={timerDuration} 
                              onChange={e=>setTimerDuration(Number(e.target.value))} 
                              className="w-full bg-white border border-slate-200 rounded-xl p-3.5 pl-10 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 shadow-sm" 
                            />
                            <i className="far fa-clock absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                          </div>
                        </div>
                      </div>

                      {/* --- MULTIPLE CHOICE WITH CORRECT ANSWER SELECTOR --- */}
                      {questionType === 'multiple-choice' ? (
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                          <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex justify-between">
                            <span>Options</span>
                            <span className="text-emerald-600"><i className="fas fa-check-circle"></i> Mark Correct Answer</span>
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {options.map((opt, i) => (
                              <div key={i} className={`relative flex items-center gap-3 bg-white p-2 rounded-xl border-2 transition-all ${correctMcqIndex === i ? 'border-emerald-500 shadow-sm ring-2 ring-emerald-100' : 'border-slate-200'}`}>
                                <input 
                                  type="radio" 
                                  name="correctOption" 
                                  checked={correctMcqIndex === i} 
                                  onChange={() => setCorrectMcqIndex(i)} 
                                  className="w-5 h-5 ml-2 accent-emerald-600 cursor-pointer shrink-0" 
                                  title="Mark as correct"
                                />
                                <div className="relative w-full">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">{String.fromCharCode(65 + i)}</span>
                                  <input 
                                    type="text" 
                                    value={opt} 
                                    onChange={e=>{
                                      const newOpts = [...options]; newOpts[i] = e.target.value; setOptions(newOpts);
                                    }} 
                                    placeholder={`Option text...`} 
                                    className="w-full bg-transparent p-2 pl-8 text-sm font-bold text-slate-900 outline-none" 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <i className="fas fa-check-circle text-emerald-500"></i> Correct Answer
                          </label>
                          <input 
                            type="number" 
                            value={correctNumeric} 
                            onChange={e=>setCorrectNumeric(e.target.value)} 
                            placeholder="e.g. 42.5" 
                            className="w-full max-w-xs bg-white border-2 border-emerald-500 rounded-lg p-3 text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-100 shadow-sm" 
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-100 pt-5">
                        <div>
                          <input type="file" id="imgUpload" accept="image/*" onChange={handleImageUpload} className="hidden" />
                          <label htmlFor="imgUpload" className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 border border-slate-200 shadow-sm">
                            <i className="fas fa-image text-indigo-500"></i> Add Image
                          </label>
                        </div>
                        
                        <button 
                          onClick={handleStartPoll} 
                          disabled={roomData?.status === "active" && timeLeft > 0}
                          className="bg-indigo-600 text-white font-black px-8 py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {roomData?.status === "active" && timeLeft > 0 ? <><i className="fas fa-spinner fa-spin"></i> Poll Running</> : <><i className="fas fa-paper-plane"></i> Launch Poll</>}
                        </button>
                      </div>
                      
                      {formError && <p className="text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 p-3 rounded-lg flex items-center gap-2 mt-2"><i className="fas fa-exclamation-circle"></i> {formError}</p>}
                    </div>
                  </div>

                  {/* Right: Live Monitor & Students */}
                  <div className="flex flex-col gap-6">
                    
                    {/* Live Students Tracker */}
                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex-1 flex flex-col">
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <i className="fas fa-users text-teal-500"></i> Joined Live
                        </h3>
                        <span className="bg-teal-50 text-teal-600 text-xs font-black px-2 py-1 rounded-lg border border-teal-100">{liveStudents.length}</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto max-h-[150px] space-y-2 pr-1">
                        {liveStudents.length === 0 ? (
                          <p className="text-xs font-bold text-slate-400 text-center mt-4">Waiting for students...</p>
                        ) : (
                          liveStudents.map((student, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-lg text-sm font-bold text-slate-700">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_5px_#34d399]"></div>
                                <span className="truncate">{student}</span>
                              </div>
                              {/* Show checkmark if they have submitted an answer to the current poll */}
                              {roomData?.responses?.[student] && (
                                <i className="fas fa-check-circle text-indigo-500"></i>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Monitor Card */}
                    <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col items-center justify-center text-center min-h-[200px] relative overflow-hidden">
                       <h3 className="absolute top-4 left-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Poll Status</h3>
                       
                       {roomData?.status === "active" && timeLeft > 0 ? (
                         <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 mt-4">
                           <div className="relative w-20 h-20 mb-3 flex items-center justify-center">
                             <svg className="w-full h-full transform -rotate-90 absolute inset-0">
                               <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
                               <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray="226" strokeDashoffset={226 - (226 * (timeLeft / (roomData?.question?.timer || 30)))} className={`transition-all duration-1000 ${timeLeft <= 5 ? 'text-rose-500' : 'text-teal-400'}`} />
                             </svg>
                             <span className={`text-2xl font-black font-mono relative z-10 ${timeLeft <= 5 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</span>
                           </div>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center justify-center opacity-50 mt-4">
                           <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 text-xl mb-3">
                             <i className="fas fa-bed"></i>
                           </div>
                           <p className="text-xs font-bold text-slate-400">Timer Stopped</p>
                         </div>
                       )}
                    </div>

                    <button onClick={handleShowLeaderboard} className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2">
                        View Live Results <i className="fas fa-trophy"></i>
                    </button>

                  </div>
                </div>
              </div>
            )}

            {/* --- VIEW: LEADERBOARD --- */}
            {view === "leaderboard" && (
              <div className="bg-white p-6 md:p-10 rounded-3xl border border-slate-200 shadow-xl animate-in slide-in-from-right-8 duration-500">
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-5">
                  <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <i className="fas fa-trophy text-amber-500 bg-amber-50 w-10 h-10 rounded-lg flex items-center justify-center"></i> 
                    Live Class Leaderboard
                  </h3>
                  <button onClick={handleBackToStudio} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 border border-slate-200">
                    <i className="fas fa-arrow-left"></i> Next Question
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Left: Overall Rankings */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                     <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Top Students</h4>
                     
                     {leaderboard.length === 0 ? (
                       <p className="text-center text-slate-400 font-bold py-10 italic">No points awarded yet.</p>
                     ) : (
                       <div className="space-y-3">
                         {leaderboard.map((student, idx) => (
                           <div key={student.name} className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                             <div className="flex items-center gap-4">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm
                                 ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}
                               `}>
                                 #{idx + 1}
                               </div>
                               <span className="font-bold text-slate-800">{student.name}</span>
                             </div>
                             <span className="bg-indigo-50 text-indigo-700 font-black px-3 py-1 rounded-lg border border-indigo-100">
                               {student.score} pts
                             </span>
                           </div>
                         ))}
                       </div>
                     )}
                  </div>

                  {/* Right: Latest Question Stats */}
                  <div>
                    {!roomData?.question ? (
                      <p className="text-slate-400 font-bold italic">No active question data.</p>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <span className="bg-teal-100 text-teal-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-teal-200">Latest Question</span>
                          {roomData.question.correctAnswer && (
                            <span className="text-xs font-bold text-emerald-600"><i className="fas fa-check-circle"></i> Correct: {roomData.question.correctAnswer}</span>
                          )}
                        </div>
                        <p className="font-black text-slate-800 mb-6 text-base leading-relaxed"><Latex>{roomData.question.text}</Latex></p>
                        
                        {roomData.question.type === 'multiple-choice' ? (
                          <div className="space-y-3">
                            {roomData.question.options.map((opt, optIdx) => {
                              const totalResponses = Object.keys(roomData.responses || {}).length;
                              const count = Object.values(roomData.responses || {}).filter(res => res === opt).length;
                              const pct = totalResponses ? Math.round((count / totalResponses) * 100) : 0;
                              const isCorrectOpt = opt === roomData.question.correctAnswer;

                              return (
                                <div key={opt} className={`relative border rounded-xl p-3 overflow-hidden z-10 ${isCorrectOpt ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-white'}`}>
                                  <div className={`absolute inset-y-0 left-0 -z-10 transition-all duration-1000 ${isCorrectOpt ? 'bg-emerald-100 border-r border-emerald-200' : 'bg-slate-100 border-r border-slate-200'}`} style={{width: `${pct}%`}}></div>
                                  <div className="flex justify-between items-center font-bold text-sm text-slate-700">
                                    <span className="flex items-center gap-3">
                                      <span className="w-6 h-6 bg-white border border-slate-200 rounded-md flex items-center justify-center text-[10px]">{String.fromCharCode(65+optIdx)}</span>
                                      {opt}
                                    </span>
                                    <span className="bg-white px-2 py-1 rounded-md border border-slate-200 text-xs shadow-sm text-slate-600">{count} votes ({pct}%)</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-inner">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Latest Answers</p>
                            {Object.keys(roomData.responses || {}).length === 0 ? (
                              <p className="text-sm text-slate-400 italic font-bold">No responses yet.</p>
                            ) : (
                              <ul className="space-y-2 max-h-[200px] overflow-y-auto">
                                {Object.entries(roomData.responses).map(([student, ans]) => (
                                  <li key={student} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-slate-100">
                                    <span className="font-bold text-slate-700">{student}</span>
                                    <span className={`font-mono font-black px-3 py-1 rounded-lg ${roomData.question.correctAnswer && ans === roomData.question.correctAnswer ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-900'}`}>
                                      {ans} {roomData.question.correctAnswer && ans === roomData.question.correctAnswer && <i className="fas fa-check ml-1"></i>}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}