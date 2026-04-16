"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Latex from "react-latex-next";
import 'katex/dist/katex.min.css';

// FIREBASE IMPORTS
import { doc, getDoc, setDoc, updateDoc, onSnapshot, increment, arrayUnion, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const dynamic = "force-dynamic";

function QuizBattleContent() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlRoomCode = searchParams.get('code');
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- CUSTOM UI ALERTS ---
  const [toast, setToast] = useState({ show: false, message: "", type: "info" });
  const showToast = (message, type = "info") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "info" }), 5000);
  };

  // --- LOCAL UI STATE ---
  const [view, setView] = useState(urlRoomCode ? "join" : "home"); 
  const [roomCode, setRoomCode] = useState(urlRoomCode || "");
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [isCustomNum, setIsCustomNum] = useState(false); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false); 
  
  // Game Engine State
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  const [songSearch, setSongSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchingSong, setIsSearchingSong] = useState(false);

  // --- LIVE FIREBASE STATE ---
  const [roomData, setRoomData] = useState(null);
  // ⚡ FOOLPROOF HOST CHECK: Uses unique User ID ⚡
  const isHost = roomData?.hostId === (user?.id || "guest");
  const [currentPollId, setCurrentPollId] = useState(null);
  
  const chatEndRef = useRef(null);
  const handledQuestionRef = useRef(null); 

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [roomData?.chat]);

  // --- FIREBASE SYNC LISTENER ---
  useEffect(() => {
    if (!roomCode || (view === "home" || view === "create" || view === "join" && !roomData)) return;

    const roomRef = doc(db, "live_battles", roomCode);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setRoomData(data);
        
        if (data.status === "active" && view !== "quiz") {
           setView("quiz");
        } else if (data.status === "results" && view !== "results") {
           setView("results");
        } else if (data.status === "waiting" && view !== "waiting") {
           setView("waiting");
        }

        if (data.status === "active" && data.expiresAt) {
           const currentQId = `${data.currentQuestionIndex}-${data.expiresAt}`;
           if (currentQId !== currentPollId) {
              setCurrentPollId(currentQId);
              const studentName = user?.fullName || "Student";
              if (data.responses && data.responses[studentName] !== undefined) {
                 setSelectedAnswer(data.responses[studentName]);
                 setHasSubmitted(true);
              } else {
                 setHasSubmitted(false);
                 setSelectedAnswer(null);
              }
           }
        }

      } else {
        if (view !== "home" && view !== "join" && view !== "create") {
            showToast("The host has ended this battle.", "info");
            setView("home");
            setRoomCode("");
            setRoomData(null);
            setCurrentPollId(null);
        }
      }
    });

    return () => unsubscribe();
  }, [roomCode, view, currentPollId, user]);

  // --- AUTO-ADVANCE & TIMER ENGINE ---
  const totalPlayers = Object.keys(roomData?.players || {}).length;
  const totalResponses = Object.keys(roomData?.responses || {}).length;
  const allAnswered = totalPlayers > 0 && totalResponses >= totalPlayers;
  const isRoundOver = (timeLeft === 0 && roomData?.status === "active") || (allAnswered && roomData?.status === "active");

  useEffect(() => {
    let interval;
    if (roomData?.status === "active" && roomData?.expiresAt) {
      interval = setInterval(() => {
        if (allAnswered) {
           clearInterval(interval);
        } else {
           const remaining = Math.max(0, Math.ceil((roomData.expiresAt - Date.now()) / 1000));
           setTimeLeft(remaining);
        }
      }, 200);
    }
    return () => clearInterval(interval);
  }, [roomData?.status, roomData?.expiresAt, allAnswered]);

  useEffect(() => {
    if (isRoundOver) {
       setHasSubmitted(true); 

       if (isHost) {
          const currentQIndex = roomData.currentQuestionIndex;
          if (handledQuestionRef.current !== currentQIndex) {
             handledQuestionRef.current = currentQIndex;

             setTimeout(async () => {
                try {
                  const roomRef = doc(db, "live_battles", roomCode);
                  if (currentQIndex < roomData.questions.length - 1) {
                     await updateDoc(roomRef, {
                        currentQuestionIndex: currentQIndex + 1, 
                        expiresAt: Date.now() + 30000, 
                        responses: {} 
                     });
                  } else {
                     await updateDoc(roomRef, { status: "results" });
                  }
                } catch (err) {
                  console.error("Error progressing game", err);
                }
             }, 4000); 
          }
       }
    }
  }, [isRoundOver, isHost, roomData, roomCode]);


  // --- ACTIONS ---
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    const finalNumQuestions = numQuestions || 10;
    if (!topic || finalNumQuestions < 1) return;
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, numQuestions: finalNumQuestions })
      });
      const data = await response.json();
      
      if (!response.ok || data.error) {
         showToast(data.error || "Failed to generate quiz", "error");
         setIsGenerating(false);
         return;
      }
      if (data.warning) {
         showToast("AI servers busy. Using standard backup questions.", "info");
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const hostName = user?.fullName || "Host";
      const hostId = user?.id || "guest"; // Store ID for secure Host validation
      
      const roomRef = doc(db, "live_battles", code);
      await setDoc(roomRef, {
         status: "waiting",
         hostId: hostId,
         hostName: hostName,
         topic: topic,
         questions: data.questions,
         currentQuestionIndex: 0,
         players: {
            [hostName]: { score: 0 }
         },
         chat: [{ sender: "System", text: `Arena generated! Waiting for challengers...`, isSystem: true, id: Date.now() }],
         currentSong: null,
         createdAt: Date.now()
      });

      setRoomCode(code);
      setView("waiting");
    } catch (error) {
      showToast("Something went wrong. Please check your connection.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCode || roomCode.length < 6) return;
    setIsGenerating(true);
    
    try {
       const code = roomCode.toUpperCase();
       const roomRef = doc(db, "live_battles", code);
       const snap = await getDoc(roomRef);

       if (!snap.exists()) {
           showToast("Arena not found. Check the code.", "error");
           setIsGenerating(false);
           return;
       }
       
       const data = snap.data();
       if (data.status !== "waiting") {
           showToast("This battle has already started!", "error");
           setIsGenerating(false);
           return;
       }

       const playerName = user?.fullName || `Player-${Math.floor(Math.random()*1000)}`;

       // Check if user already exists to prevent resetting score on rejoin
       if (!data.players || !data.players[playerName]) {
           await updateDoc(roomRef, {
              [`players.${playerName}`]: { score: 0 },
              chat: arrayUnion({ sender: "System", text: `${playerName} joined the arena!`, isSystem: true, id: Date.now() })
           });
       }

       setRoomCode(code);
       setView("waiting");
    } catch (error) {
       showToast(error.message, "error");
    } finally {
       setIsGenerating(false);
    }
  };

  const handleStartGame = async () => {
    if (!isHost) return; // Extra security layer
    try {
      const roomRef = doc(db, "live_battles", roomCode);
      await updateDoc(roomRef, {
         status: "active",
         currentQuestionIndex: 0,
         expiresAt: Date.now() + 30000,
         chat: arrayUnion({ sender: "System", text: "The battle has started!", isSystem: true, id: Date.now() })
      });
    } catch (err) {
      console.error("Failed to start game", err);
    }
  };

  const handleLeaveMatch = async () => {
     if (confirm("Are you sure you want to leave?")) {
        if (isHost && roomCode) {
           await deleteDoc(doc(db, "live_battles", roomCode));
        }
        setRoomCode("");
        setRoomData(null);
        setView("home");
     }
  };

  const submitAnswer = async (index) => {
    if (hasSubmitted || !roomData) return;
    setSelectedAnswer(index);
    setHasSubmitted(true);
    
    try {
       const question = roomData.questions[roomData.currentQuestionIndex];
       const isCorrect = index === question.correctAnswer;
       const playerName = user?.fullName || "Student";
       const roomRef = doc(db, "live_battles", roomCode);
       
       if (isCorrect) {
          const pointsEarned = Math.max(10, Math.floor(10 + (timeLeft / 30) * 10)); 
          await updateDoc(roomRef, {
             [`players.${playerName}.score`]: increment(pointsEarned),
             [`responses.${playerName}`]: index
          });
       } else {
          await updateDoc(roomRef, {
             [`responses.${playerName}`]: index
          });
       }
    } catch (err) {
       console.error("Error submitting score", err);
    }
  };

  // --- COPY CODE HELPER ---
  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- CHAT LOGIC ---
  const sendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !roomCode) return;
    
    const msgText = chatInput;
    setChatInput("");

    try {
       await updateDoc(doc(db, "live_battles", roomCode), {
          chat: arrayUnion({ sender: user?.fullName || "Player", text: msgText, isSystem: false, isEmoji: false, id: Date.now() })
       });
    } catch (err) {
       console.error("Chat error", err);
    }
  };

  const sendEmoji = async (emoji) => {
    if (!roomCode) return;
    try {
       await updateDoc(doc(db, "live_battles", roomCode), {
          chat: arrayUnion({ sender: user?.fullName || "Player", text: emoji, isSystem: false, isEmoji: true, id: Date.now() })
       });
    } catch (err) {}
  };

  // --- MUSIC LOGIC ---
  const handleSearchSong = async (e) => {
    e.preventDefault();
    if (!songSearch.trim()) return;
    setIsSearchingSong(true);

    try {
      const res = await fetch(`/api/search-song?q=${encodeURIComponent(songSearch)}`);
      const data = await res.json();
      
      if (data.error) showToast(data.error, "error");
      else if (data.videos) setSearchResults(data.videos);
    } catch (error) {
      showToast("Music search failed.", "error");
    } finally {
      setIsSearchingSong(false);
    }
  };

  const handleSelectSong = async (song) => {
    if (!roomCode) return;
    setSearchResults([]); 
    setSongSearch(""); 

    try {
       await updateDoc(doc(db, "live_battles", roomCode), {
          currentSong: { id: song.id, title: song.title },
          chat: arrayUnion({ sender: "System", text: `Host playing: ${song.title} 🎵`, isSystem: true, id: Date.now() })
       });
    } catch (err) {}
  };

  const handleStopMusic = async () => {
    if (!roomCode) return;
    try {
       await updateDoc(doc(db, "live_battles", roomCode), {
          currentSong: null,
          chat: arrayUnion({ sender: "System", text: "Host stopped the music 🛑", isSystem: true, id: Date.now() })
       });
    } catch (err) {}
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-circle-notch fa-spin text-4xl text-indigo-600"></i></div>;

  const playersList = Object.entries(roomData?.players || {}).map(([name, data]) => ({ name, ...data }));
  const currentQuestionData = roomData?.questions?.[roomData?.currentQuestionIndex];

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* ⚡ AMBIENT BACKGROUND GLOWS ⚡ */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/20 blur-[120px] pointer-events-none z-0"></div>

      {/* FLOATING TOAST ALERT */}
      {toast.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-[0_10px_40px_rgba(0,0,0,0.1)] rounded-full pl-2 pr-6 py-2 flex items-center gap-3">
             <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`}></i>
             </div>
             <p className="text-sm font-bold text-slate-800">{toast.message}</p>
             <button onClick={() => setToast({show: false})} className="ml-2 text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
          </div>
        </div>
      )}

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800/50">
          <Link href="/onboarding?switch=true" className="text-xl font-black flex items-center gap-2 hover:text-indigo-400 transition-colors cursor-pointer tracking-tight">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <i className="fas fa-book-open-reader text-white text-sm"></i>
            </div>
            OZONE
          </Link>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><i className="fas fa-times text-lg"></i></button>
        </div>
        
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button onClick={() => router.push('/student')} className="w-full flex items-center text-left gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition-all duration-300 active:scale-95">
                <i className="fas fa-home w-4"></i> Dashboard
            </button>
            <button onClick={() => router.push('/student/quiz-battle')} className="w-full flex items-center text-left gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-2.5 rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all duration-300 active:scale-95">
                <i className="fas fa-gamepad w-4"></i> Quiz Battle
            </button>
        </nav>
        
        <div className="p-3 border-t border-slate-800/50 space-y-1.5">
            <div className="flex items-center gap-2.5 p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Student"} alt="Avatar" className="w-7 h-7 rounded-full border border-slate-600" />
                <div className="text-xs font-bold truncate flex-1 text-slate-300">{user?.fullName || "Student"}</div>
            </div>
            <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-500 hover:text-white p-2 rounded-xl transition-all duration-300 active:scale-95 text-xs font-bold border border-transparent">
                <i className="fas fa-sign-out-alt"></i> Log Out
            </button>
        </div>
      </aside>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full z-10">
        
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 h-auto md:h-16 py-3 px-4 md:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 z-20 shrink-0 shadow-sm sticky top-0">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button className="md:hidden text-slate-600 shrink-0 transition-transform active:scale-90" onClick={() => setIsMobileMenuOpen(true)}><i className="fas fa-bars text-xl"></i></button>
             <button onClick={() => router.push('/student')} className="shrink-0 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:shadow-sm transition-all duration-300 ease-out active:scale-95 flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold">
               <i className="fas fa-arrow-left"></i> <span className="hidden sm:block">Dashboard</span>
             </button>
             <h1 className="text-lg md:text-xl font-black text-slate-800 ml-2 tracking-tight">Arena</h1>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
             {view !== "home" && view !== "create" && view !== "join" && (
                <button onClick={handleLeaveMatch} className="bg-rose-50 text-rose-600 border border-rose-200 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ease-out active:scale-95 hover:bg-rose-100">
                  <i className="fas fa-sign-out-alt"></i> {isHost ? "End Match" : "Leave Match"}
                </button>
             )}
             {(view === "waiting" || view === "quiz" || view === "results") && (
                 <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg shadow-sm">
                   <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span></span>
                   Live Connected
                 </div>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">

          {/* --- VIEW: HOME --- */}
          {view === "home" && (
            <div className="max-w-4xl mx-auto w-full animate-in fade-in zoom-in-95 duration-500">
              <div className="text-center mb-12 mt-4 md:mt-10">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-[0_0_30px_rgba(79,70,229,0.3)]">
                  <i className="fas fa-gamepad"></i>
                </div>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-widest uppercase">Quiz Battle</h2>
                <p className="text-slate-500 font-medium text-base max-w-lg mx-auto">Create a custom AI quiz and challenge your friends in real-time.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div onClick={() => setView("create")} className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-xl hover:shadow-2xl hover:-translate-y-2 hover:border-indigo-200 transition-all duration-500 ease-out active:scale-[0.98] cursor-pointer group flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-violet-600 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all duration-300">
                    <i className="fas fa-magic"></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Create Quiz</h3>
                  <p className="text-slate-500 font-medium mb-8">Host a game. Let AI generate questions based on any topic instantly.</p>
                  <button className="w-full mt-auto bg-slate-50 border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all duration-300 shadow-sm">Host Game</button>
                </div>

                <div onClick={() => setView("join")} className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] border border-white shadow-xl hover:shadow-2xl hover:-translate-y-2 hover:border-rose-200 transition-all duration-500 ease-out active:scale-[0.98] cursor-pointer group flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:bg-gradient-to-br group-hover:from-rose-500 group-hover:to-orange-500 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all duration-300">
                    <i className="fas fa-sign-in-alt"></i>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2">Join Quiz</h3>
                  <p className="text-slate-500 font-medium mb-8">Have a room code? Jump straight into an active arena with your friends.</p>
                  <button className="w-full mt-auto bg-slate-50 border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl group-hover:bg-rose-600 group-hover:text-white group-hover:border-rose-600 transition-all duration-300 shadow-sm">Join Game</button>
                </div>
              </div>
            </div>
          )}

          {/* --- VIEW: CREATE QUIZ FORM --- */}
          {view === "create" && (
            <div className="max-w-xl mx-auto w-full bg-white/90 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-white shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
              <button onClick={() => setView("home")} className="text-slate-400 hover:text-indigo-600 font-bold text-sm mb-6 flex items-center gap-2 transition-colors active:scale-95">
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Configure Battle</h2>
              <p className="text-slate-500 font-medium mb-8">Ozone AI will generate your match instantly.</p>
              
              <form onSubmit={handleCreateRoom} className="space-y-8">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Topic</label>
                  <input 
                    type="text" 
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Thermodynamics, World War 2..." 
                    required
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-base font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Number of Questions</label>
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 shadow-inner">
                     {[5, 10, 15].map(num => (
                       <button 
                         type="button" 
                         key={num} 
                         onClick={() => { setNumQuestions(num); setIsCustomNum(false); }}
                         className={`flex-1 py-3 rounded-lg font-black text-sm transition-all duration-300 active:scale-95 ${!isCustomNum && numQuestions === num ? 'bg-indigo-600 text-white shadow-lg' : 'bg-transparent text-slate-500 hover:bg-slate-200'}`}
                       >
                         {num}
                       </button>
                     ))}
                     {/* ⚡ FIXED CUSTOM INPUT LOGIC ⚡ */}
                     <input 
                        type="number"
                        min="1"
                        max="50"
                        placeholder="Custom"
                        value={isCustomNum ? (numQuestions || "") : ""}
                        onChange={(e) => {
                           setIsCustomNum(true);
                           const val = e.target.value;
                           setNumQuestions(val === "" ? "" : parseInt(val, 10));
                        }}
                        onClick={() => {
                           if (!isCustomNum) {
                               setIsCustomNum(true);
                               setNumQuestions(""); // Clear automatically for fresh typing
                           }
                        }}
                        className={`w-28 py-3 px-3 text-center rounded-lg font-black text-sm border-2 outline-none transition-all placeholder-slate-400 ${isCustomNum ? 'border-indigo-600 bg-white shadow-lg text-slate-900' : 'border-transparent bg-slate-100 hover:bg-slate-200 text-slate-900'}`}
                     />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isGenerating || !topic}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black py-4.5 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-95 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-3 text-lg mt-6"
                >
                  {isGenerating ? <><i className="fas fa-circle-notch fa-spin"></i> Initializing Arena...</> : <><i className="fas fa-magic"></i> Generate & Host</>}
                </button>
              </form>
            </div>
          )}

          {/* --- VIEW: JOIN ROOM FORM --- */}
          {view === "join" && (
            <div className="max-w-md mx-auto w-full bg-white/90 backdrop-blur-xl p-8 md:p-12 rounded-[2rem] border border-white shadow-2xl text-center animate-in slide-in-from-bottom-8 duration-500">
              <button onClick={() => setView("home")} className="text-slate-400 hover:text-rose-600 font-bold text-sm mb-6 flex items-center gap-2 transition-colors active:scale-95">
                <i className="fas fa-arrow-left"></i> Back
              </button>
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">
                <i className="fas fa-door-open"></i>
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Join Battle</h2>
              <p className="text-slate-500 font-medium mb-8">Enter your friend's 6-character room code.</p>

              <form onSubmit={handleJoinRoom} className="space-y-6">
                <input 
                  type="text" 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="CODE" 
                  required
                  maxLength={6}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-4 text-center text-4xl font-black text-slate-900 outline-none focus:border-rose-500 focus:bg-white transition-all tracking-widest uppercase shadow-inner placeholder-slate-300" 
                />
                <button 
                  type="submit"
                  disabled={isGenerating || roomCode.length < 6}
                  className="w-full bg-gradient-to-r from-rose-500 to-orange-500 text-white font-black py-4.5 rounded-xl shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] active:scale-95 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2 text-lg"
                >
                  {isGenerating ? <><i className="fas fa-circle-notch fa-spin"></i> Connecting...</> : "Enter Arena"}
                </button>
              </form>
            </div>
          )}

          {/* --- VIEW: WAITING & ACTIVE GAME --- */}
          {(view === "waiting" || view === "quiz" || view === "results") && roomData && (
            <div className="max-w-6xl mx-auto w-full h-full flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
              
              {/* LEFT: GAME BOARD */}
              <div className="flex-1 flex flex-col bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white shadow-2xl overflow-hidden relative min-h-[500px]">
                
                {/* ⚡ BEAUTIFUL LOBBY WAITING ROOM ⚡ */}
                {view === "waiting" && (
                  <div className="absolute inset-0 z-10 flex flex-col p-8 md:p-12 text-center bg-transparent overflow-y-auto">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
                      <i className="fas fa-users text-4xl"></i>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight">Arena Lobby</h2>
                    <p className="text-slate-500 font-medium mb-10 text-lg">Waiting for combatants to assemble...</p>
                    
                    {/* ⚡ SLEEK COPY CODE WIDGET ⚡ */}
                    <div className="bg-slate-50 border border-slate-200 p-2 pl-6 rounded-2xl mb-10 flex items-center justify-between shadow-inner max-w-xs mx-auto w-full">
                      <div className="text-left">
                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Room Code</span>
                         <span className="text-3xl font-black text-indigo-600 tracking-widest font-mono leading-none">{roomCode}</span>
                      </div>
                      <button onClick={copyRoomCode} className={`w-12 h-12 rounded-xl bg-white border border-slate-200 hover:bg-indigo-600 hover:text-white transition-all duration-300 active:scale-90 flex items-center justify-center shadow-sm ${copied ? 'text-emerald-500 border-emerald-200' : 'text-indigo-600'}`}>
                         <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-lg`}></i>
                      </button>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-2xl mx-auto">
                      {playersList.map(p => (
                         <div key={p.name} className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-full text-slate-700 font-bold text-sm shadow-sm animate-in zoom-in-95">
                            <i className="fas fa-user-astronaut text-indigo-500"></i> {p.name}
                         </div>
                      ))}
                    </div>

                    <div className="mt-auto pt-4">
                      {isHost ? (
                        <button onClick={handleStartGame} className="w-full max-w-sm mx-auto bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black px-10 py-5 rounded-2xl text-xl shadow-[0_0_25px_rgba(79,70,229,0.4)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_0_35px_rgba(79,70,229,0.6)] active:scale-95 block">
                          Start Battle Now
                        </button>
                      ) : (
                        <div className="w-full max-w-sm mx-auto bg-slate-50 border border-slate-200 text-slate-500 font-bold px-6 py-5 rounded-2xl shadow-inner">
                          <i className="fas fa-circle-notch fa-spin text-indigo-500 mr-3"></i> Host is preparing the arena...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {view === "results" && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-slate-900 text-white animate-in zoom-in-95 duration-500">
                    <i className="fas fa-trophy text-7xl text-amber-400 mb-6 drop-shadow-[0_0_30px_rgba(251,191,36,0.4)]"></i>
                    <h2 className="text-4xl md:text-5xl font-black mb-3 tracking-tight">Match Finished!</h2>
                    <p className="text-slate-400 font-medium mb-10 text-lg">Here are the final standings.</p>
                    
                    <div className="w-full max-w-lg space-y-4">
                      {playersList.sort((a,b)=>b.score - a.score).map((p, i) => (
                        <div key={p.name} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${i === 0 ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.3)] scale-105' : 'bg-slate-800 border-slate-700'}`}>
                          <div className="flex items-center gap-4">
                            <span className="text-2xl font-black w-8 text-slate-300">{i + 1}</span>
                            <span className="font-bold text-xl">{p.name}</span>
                          </div>
                          <span className="font-black font-mono text-2xl">{p.score} pts</span>
                        </div>
                      ))}
                    </div>

                    <button onClick={handleLeaveMatch} className="mt-12 bg-white text-slate-900 font-black px-10 py-4 rounded-full transition-all duration-300 ease-out hover:bg-slate-200 hover:shadow-lg active:scale-95 text-lg">
                      Return to Menu
                    </button>
                  </div>
                )}

                {/* ⚡ PREMIUM ACTIVE QUIZ BOARD ⚡ */}
                {view === "quiz" && currentQuestionData && (
                  <div className="flex-1 flex flex-col p-6 md:p-8 bg-transparent overflow-y-auto h-full">
                     
                     {/* ANIMATED TIMER BAR */}
                     <div className="w-full bg-slate-100 h-3 rounded-full mb-6 overflow-hidden shadow-inner shrink-0">
                       <div 
                         className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]'}`}
                         style={{ width: `${(timeLeft / 30) * 100}%` }}
                       ></div>
                     </div>

                     <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200/60 shrink-0">
                       <span className="bg-indigo-50 text-indigo-700 text-xs font-black px-4 py-2 rounded-xl uppercase tracking-widest border border-indigo-100 shadow-sm">Question {roomData.currentQuestionIndex + 1} / {roomData.questions.length}</span>
                       <div className={`text-3xl font-black font-mono flex items-center gap-2 ${timeLeft <= 5 ? 'text-rose-500 animate-pulse drop-shadow-md' : 'text-slate-800'}`}>
                         <i className="far fa-clock"></i> {timeLeft}s
                       </div>
                     </div>

                     {/* CENTERED FLEX CONTAINER FOR QUESTION TEXT */}
                     <div className="flex-1 flex items-center justify-center py-4 shrink-0 min-h-[100px]">
                       <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-snug text-center px-2 tracking-tight">
                         <Latex>{currentQuestionData.question}</Latex>
                       </h2>
                     </div>

                     {/* GRID OPTIONS */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 shrink-0">
                       {currentQuestionData.options.map((opt, i) => {
                         const isCorrectOpt = i === currentQuestionData.correctAnswer;
                         const showReveal = isRoundOver && isCorrectOpt;
                         const showWrong = isRoundOver && hasSubmitted && selectedAnswer === i && !isCorrectOpt;

                         return (
                           <button 
                             key={i}
                             onClick={() => submitAnswer(i)}
                             disabled={hasSubmitted || isRoundOver}
                             className={`relative p-5 rounded-2xl border-2 text-left font-bold text-base md:text-lg transition-all duration-300 ease-out 
                               ${showReveal ? '!bg-emerald-50 !border-emerald-500 !text-emerald-800 scale-[1.02] shadow-[0_0_15px_rgba(16,185,129,0.3)] z-10' :
                                 showWrong ? '!bg-rose-50 !border-rose-500 !text-rose-800 opacity-80' :
                                 hasSubmitted && selectedAnswer === i ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-[1.02]' : 
                                 hasSubmitted || isRoundOver ? 'bg-white border-slate-200 text-slate-400 opacity-60 cursor-not-allowed' : 
                                 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-md text-slate-700 cursor-pointer active:scale-[0.98]'}
                             `}
                           >
                             <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors shadow-sm
                               ${showReveal ? 'border-emerald-500 bg-emerald-500 text-white' :
                                 showWrong ? 'border-rose-500 bg-rose-500 text-white' :
                                 hasSubmitted && selectedAnswer === i ? 'border-white text-white' : 'border-slate-200 text-transparent'}
                             `}>
                               <i className={`fas ${showWrong ? 'fa-times' : 'fa-check'} text-xs`}></i>
                             </div>
                             <span className="pr-10 block leading-relaxed"><Latex>{opt}</Latex></span>
                           </button>
                         )
                       })}
                     </div>
                  </div>
                )}
              </div>

              {/* RIGHT: SOCIAL & UTILITIES PANEL */}
              <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
                
                {/* VIDEO STREAMS */}
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 border border-white shadow-xl">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><i className="fas fa-video text-slate-400"></i> Cameras</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {playersList.map(p => (
                      <div key={p.name} className="bg-slate-100 aspect-video rounded-2xl relative overflow-hidden border border-slate-200 flex items-center justify-center shadow-inner">
                        <i className="fas fa-user text-2xl text-slate-300"></i>
                        <div className="absolute bottom-1 left-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded shadow-sm text-[9px] font-bold text-slate-700 max-w-[90%] truncate">{p.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MUSIC PLAYER */}
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-5 border border-white shadow-xl">
                   <div className="flex items-center justify-between mb-4 px-1">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest"><i className="fas fa-music text-indigo-400"></i> Music</span>
                     {roomData?.currentSong && isHost && (
                       <button onClick={handleStopMusic} className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors">Stop</button>
                     )}
                   </div>
                   
                   {isHost && (
                     <div className="relative mb-4">
                       <form onSubmit={handleSearchSong} className="flex gap-2">
                         <div className="relative flex-1">
                           <input 
                             type="text" 
                             value={songSearch}
                             onChange={(e) => setSongSearch(e.target.value)}
                             placeholder="Search YouTube..." 
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                           />
                           <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                         </div>
                         <button type="submit" disabled={!songSearch || isSearchingSong} className="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ease-out hover:bg-slate-800 active:scale-95 disabled:opacity-50 shadow-md">
                           {isSearchingSong ? <i className="fas fa-circle-notch fa-spin"></i> : 'Find'}
                         </button>
                       </form>

                       {searchResults.length > 0 && (
                         <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[250px] overflow-y-auto">
                           {searchResults.map(song => (
                             <div 
                               key={song.id} 
                               onClick={() => handleSelectSong(song)}
                               className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                             >
                               <img src={song.thumbnail} alt="thumb" className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0" />
                               <span className="text-xs font-bold text-slate-700 line-clamp-2 leading-snug">{song.title}</span>
                             </div>
                           ))}
                         </div>
                       )}
                     </div>
                   )}

                   {roomData?.currentSong ? (
                     <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-slate-50 relative">
                        <iframe 
                            key={roomData.currentSong.id}
                            width="100%" 
                            height="60" 
                            src={`https://www.youtube.com/embed/${roomData.currentSong.id}?autoplay=1&controls=1&disablekb=1&rel=0`} 
                            title="YouTube music player" 
                            frameBorder="0" 
                            allow="autoplay; encrypted-media" 
                        ></iframe>
                     </div>
                   ) : (
                     <div className="text-center py-4 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No music playing</p>
                     </div>
                   )}
                </div>

                {/* SCOREBOARD & CHAT */}
                <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white shadow-xl flex-1 flex flex-col overflow-hidden min-h-[300px]">
                  
                  <div className="bg-slate-50 border-b border-slate-100 p-4">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <i className="fas fa-list-ol text-slate-400 text-sm"></i>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Rankings</span>
                    </div>
                    <div className="space-y-1.5">
                      {playersList.sort((a,b)=>b.score - a.score).map((p, i) => {
                        const hasPlayerAnswered = roomData?.responses?.[p.name] !== undefined;
                        return (
                           <div key={p.name} className={`flex justify-between items-center text-xs p-2 rounded-xl transition-colors ${p.name === (user?.fullName || "Student") ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 shadow-sm' : 'bg-transparent text-slate-600 font-medium'}`}>
                             <span className="truncate pr-2 flex items-center gap-2">
                                {i+1}. {p.name}
                                {hasPlayerAnswered && <i className="fas fa-check-circle text-emerald-500"></i>}
                             </span>
                             <span className="font-mono shrink-0 font-black">{p.score}</span>
                           </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex-1 p-5 overflow-y-auto bg-transparent space-y-4">
                    {(!roomData?.chat || roomData.chat.length === 0) ? (
                      <p className="text-xs text-center text-slate-400 font-medium mt-4">Say hello to the room!</p>
                    ) : (
                      roomData.chat.map((msg) => (
                        <div key={msg.id} className={`flex flex-col ${msg.isSystem ? 'items-center' : msg.sender === (user?.fullName || "Student") ? 'items-end' : 'items-start'}`}>
                          {msg.isSystem ? (
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full shadow-sm">{msg.text}</span>
                          ) : (
                            <>
                              {msg.sender !== (user?.fullName || "Student") && <span className="text-[9px] font-bold text-slate-400 ml-1 mb-1">{msg.sender}</span>}
                              <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] break-words
                                ${msg.isEmoji ? 'text-4xl bg-transparent !p-0' : 
                                  msg.sender === (user?.fullName || "Student") ? 'bg-indigo-600 text-white rounded-br-sm shadow-md' : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200 shadow-sm'}
                              `}>
                                {msg.text}
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-4 bg-white border-t border-slate-100">
                    <div className="flex gap-2 mb-4 px-1">
                      {["🔥", "😂", "🤯", "👏"].map(emoji => (
                        <button key={emoji} onClick={() => sendEmoji(emoji)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all duration-300 active:scale-90 text-sm flex items-center justify-center hover:-translate-y-1 shadow-sm">
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <form onSubmit={sendChatMessage} className="relative">
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e)=>setChatInput(e.target.value)}
                        placeholder="Message..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-xs font-medium outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                      />
                      <button type="submit" disabled={!chatInput.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] transition-all duration-300 active:scale-90 hover:bg-slate-800 disabled:opacity-50 shadow-md">
                        <i className="fas fa-paper-plane"></i>
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default function QuizBattlePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-circle-notch fa-spin text-4xl text-indigo-600"></i></div>}>
      <QuizBattleContent />
    </Suspense>
  );
}