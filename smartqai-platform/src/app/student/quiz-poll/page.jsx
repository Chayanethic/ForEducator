"use client";

import { useState, useEffect, Suspense } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Latex from "react-latex-next";
import 'katex/dist/katex.min.css';

// FIREBASE IMPORTS
import { doc, getDoc, updateDoc, onSnapshot, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ⚡ IMPORT GUEST BLOCKER ⚡
import GuestBlocker from "@/components/GuestBlocker";

// ⚡ EXPLICITLY TELL NEXT.JS NOT TO STATICALLY BUILD THIS PAGE ⚡
export const dynamic = "force-dynamic";

// --- 1. THE MAIN LOGIC COMPONENT ---
function QuizPollContent() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const urlRoomCode = searchParams.get('code');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- ENGINE STATE ---
  const [view, setView] = useState("join"); // 'join', 'waiting', 'active', 'submitted', 'leaderboard'
  const [roomCode, setRoomCode] = useState(urlRoomCode || "");
  const [isConnecting, setIsConnecting] = useState(false);
  const [serverError, setServerError] = useState("");

  // --- LIVE DATA FROM FIREBASE ---
  const [roomData, setRoomData] = useState(null);
  const [currentPollId, setCurrentPollId] = useState(null); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [lastScoreGained, setLastScoreGained] = useState(false);

  // Join Room
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!roomCode) return;
    
    setIsConnecting(true);
    setServerError("");

    // ⚡ GUEST MODE SIMULATION: Bypasses API to save costs and demonstrates feature! ⚡
    if (!user) {
      setTimeout(() => {
        setRoomCode("DEMO99");
        setRoomData({
          status: "waiting",
          question: null,
          scores: { "Guest Student": 0, "Alex (Demo)": 1 },
          responses: {}
        });
        setView("waiting");
        setIsConnecting(false);

        // Auto-trigger a simulated question after 4 seconds
        setTimeout(() => {
          setRoomData(prev => ({
            ...prev,
            status: "active",
            expiresAt: Date.now() + 30000, // 30 seconds timer
            question: {
              text: "Which of the following is a dynamically typed programming language?",
              type: "multiple-choice",
              options: ["Java", "C++", "JavaScript", "Rust"],
              correctAnswer: "JavaScript"
            },
            responses: {}
          }));
          setView("active");
        }, 4000);
      }, 1500); // Wait 1.5s to simulate joining
      return;
    }
    
    // ⚡ REAL FIREBASE CONNECTION (For Logged In Students) ⚡
    try {
      const code = roomCode.toUpperCase();
      const roomRef = doc(db, "live_polls", code);
      const snap = await getDoc(roomRef);
      
      if (!snap.exists()) {
        throw new Error("Room not found. Check the code.");
      }

      // Register student presence without overwriting their score
      const studentName = user.fullName || "Student";
      await updateDoc(roomRef, {
        [`students.${studentName}`]: Date.now()
      });

      setRoomCode(code);
      setView("waiting");
    } catch (err) {
      console.error(err);
      setServerError(err.message || "Failed to join room.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Leave Room Safely
  const handleLeaveRoom = () => {
    if (confirm("Are you sure you want to leave the live poll?")) {
      setRoomCode(""); 
      setRoomData(null);
      setCurrentPollId(null);
      setView("join");
    }
  };

  // Real-time Firebase Data Listener
  useEffect(() => {
    // Prevent fetching if guest mode simulated room
    if (!roomCode || roomCode === "DEMO99" || !user) return;

    const roomRef = doc(db, "live_polls", roomCode);
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        setRoomData(snapshot.data());
      } else {
        alert("The educator has closed this room.");
        setView("join");
        setRoomCode("");
        setRoomData(null);
        setCurrentPollId(null);
      }
    });

    return () => unsubscribe();
  }, [roomCode, user]);

  // State Transition Engine 
  useEffect(() => {
    if (!roomData) return; // Allow Guest demo data to pass through without user check

    if (roomData.status === "leaderboard") {
       setView("leaderboard");
    } 
    else if (roomData.status === "active") {
       if (roomData.expiresAt !== currentPollId) {
          setCurrentPollId(roomData.expiresAt);
          
          const studentName = user?.fullName || "Guest Student";
          if (roomData.responses && roomData.responses[studentName] !== undefined) {
             setSelectedAnswer(roomData.responses[studentName]);
             setHasSubmitted(true);
             setView("submitted");
          } else {
             setView("active");
             setHasSubmitted(false);
             setSelectedAnswer("");
             setLastScoreGained(false);
          }
       }
    } 
    else if (roomData.status === "waiting" || !roomData.question) {
       setView((prev) => prev === "join" ? "join" : "waiting");
    }
  }, [roomData, user, currentPollId]);

  // Local Timer Engine
  useEffect(() => {
    let interval;
    if (roomData?.status === "active" && roomData?.expiresAt) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((roomData.expiresAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        
        if (remaining === 0 && view === "active") {
          setView("submitted");
          clearInterval(interval);
        }
      }, 200);
    }
    return () => clearInterval(interval);
  }, [roomData, view]);

  // Submit Logic
  const submitAnswer = async () => {
    if (!selectedAnswer || !roomCode || !user || !roomData?.question) return;
    
    try {
      const studentName = user.fullName || "Student";
      const isCorrect = selectedAnswer === roomData.question.correctAnswer;
      
      const updatePayload = {
        [`responses.${studentName}`]: selectedAnswer
      };

      if (isCorrect) {
         updatePayload[`scores.${studentName}`] = increment(1);
         setLastScoreGained(true);
      } else {
         setLastScoreGained(false);
      }

      const roomRef = doc(db, "live_polls", roomCode);
      await updateDoc(roomRef, updatePayload);
      
      setHasSubmitted(true);
      setView("submitted");
    } catch (err) {
      console.error("Failed to submit answer", err);
      alert("Failed to submit answer. Try again.");
    }
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;

  const leaderboard = Object.entries(roomData?.scores || {})
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden selection:bg-teal-100 selection:text-teal-900">
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* STUDENT SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <Link href="/onboarding?switch=true" className="text-xl font-black flex items-center gap-2 hover:text-indigo-400 transition cursor-pointer tracking-tight">
            <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-900/50">
                <i className="fas fa-book-open-reader text-white text-sm"></i>
            </div>
            OZONE
          </Link>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><i className="fas fa-times text-lg"></i></button>
        </div>
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button onClick={() => router.push('/student')} className="w-full flex items-center gap-3 text-slate-300 hover:bg-slate-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-home w-4"></i> Dashboard
            </button>
            <button className="w-full flex items-center gap-3 bg-indigo-600 text-white p-2.5 rounded-xl text-sm font-bold shadow-md border-l-4 border-teal-400">
                <i className="fas fa-bolt w-4 text-teal-400"></i> Live Quiz Poll
            </button>
        </nav>
        <div className="p-3 border-t border-slate-800 space-y-1.5">
            {user ? (
              <>
                <div className="flex items-center gap-2.5 p-2.5 bg-slate-800/50 rounded-xl border border-slate-700/50 mb-2">
                    <img src={user.imageUrl || "https://ui-avatars.com/api/?name=Student"} alt="Avatar" className="w-7 h-7 rounded-full border border-slate-600" />
                    <div className="text-xs font-bold truncate flex-1 text-slate-300">{user.fullName || "Account"}</div>
                </div>
                <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-500 hover:text-white p-2 rounded-xl transition text-xs font-bold border border-rose-900/50 bg-rose-950/20">
                    <i className="fas fa-sign-out-alt"></i> Log Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/50">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white"><i className="fas fa-user-secret text-xs"></i></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">Guest Mode</span>
                  </div>
                </div>
                <button onClick={() => router.push('/sign-in?role=student')} className="w-full bg-emerald-500 text-white text-xs font-black py-2 rounded-xl hover:bg-emerald-400 transition shadow-md">
                  Sign In
                </button>
              </div>
            )}
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <header className="bg-white border-b border-slate-200 h-16 px-4 md:px-6 flex justify-between items-center z-20 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
             <button className="md:hidden text-slate-600 shrink-0" onClick={() => setIsMobileMenuOpen(true)}><i className="fas fa-bars text-xl"></i></button>
             <div>
               <h1 className="text-lg md:text-xl font-black text-slate-900">Live Connect</h1>
             </div>
          </div>
          
          {view !== "join" && (
            <div className="flex items-center gap-3">
              {roomData?.scores?.[user?.fullName || "Guest Student"] !== undefined && (
                <div className="hidden sm:flex bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm items-center gap-1.5">
                   <i className="fas fa-star"></i> {roomData.scores[user?.fullName || "Guest Student"]} pts
                </div>
              )}
              <button onClick={handleLeaveRoom} className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 transition">
                <i className="fas fa-sign-out-alt"></i> Leave Room
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col justify-center">
          <div className="max-w-4xl mx-auto w-full">

            {/* VIEW: JOIN ROOM */}
            {view === "join" && (
              <div className="bg-white p-8 md:p-14 rounded-[2rem] border border-slate-200 shadow-xl text-center relative overflow-hidden max-w-2xl mx-auto">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner border border-indigo-100 relative z-10">
                  <i className="fas fa-door-open"></i>
                </div>
                <h2 className="text-3xl font-black text-slate-900 mb-3 relative z-10">Join a Live Poll</h2>
                <p className="text-slate-500 font-medium mb-8 relative z-10">Enter the 6-character room code provided by your educator.</p>

                {serverError && (
                  <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-bold mb-6 border border-rose-200 text-left">
                    <i className="fas fa-exclamation-circle"></i> {serverError}
                  </div>
                )}

                <form onSubmit={handleJoinRoom} className="max-w-sm mx-auto space-y-5 relative z-10">
                  <input 
                    type="text" 
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. A1B2C3" 
                    required
                    maxLength={6}
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-center text-2xl font-black text-slate-800 outline-none focus:border-indigo-500 transition tracking-widest uppercase shadow-inner placeholder-slate-300" 
                  />
                  {/* Notice: No GuestBlocker here. Let them click to simulate! */}
                  <button 
                    type="submit"
                    disabled={isConnecting || !roomCode}
                    className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                  >
                    {isConnecting ? <><i className="fas fa-spinner fa-spin"></i> Connecting...</> : "Join Room"}
                  </button>
                </form>
              </div>
            )}

            {/* VIEW: WAITING FOR QUESTION */}
            {view === "waiting" && (
              <div className="bg-white p-12 rounded-[2rem] border border-slate-200 shadow-xl text-center flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden animate-in fade-in duration-500 max-w-2xl mx-auto">
                <div className="absolute inset-0 border-[6px] border-indigo-50 rounded-[2rem] m-2 pointer-events-none"></div>
                <div className="w-24 h-24 relative mb-6">
                  <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                  <i className="fas fa-satellite-dish absolute inset-0 flex items-center justify-center text-2xl text-indigo-400"></i>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Waiting for Educator</h2>
                <p className="text-slate-500 font-medium text-sm">Sit tight! The next poll will appear here instantly when started.</p>
              </div>
            )}

            {/* VIEW: ACTIVE & SUBMITTED POLL */}
            {(view === "active" || view === "submitted") && roomData?.question && (
              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500 max-w-2xl mx-auto">
                
                <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0 border-b-4 border-indigo-500">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-300">
                    <i className="fas fa-bolt text-teal-400"></i> Live Poll
                  </div>
                  <div className={`font-mono text-xl font-black flex items-center gap-2 ${timeLeft <= 5 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
                    <i className="far fa-clock"></i> {timeLeft}s
                  </div>
                </div>

                <div className="p-6 md:p-10 flex-1 overflow-y-auto bg-slate-50">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 leading-relaxed border-l-4 border-indigo-500 pl-4 bg-white py-4 pr-4 rounded-r-xl shadow-sm">
                    <Latex>{roomData.question.text}</Latex>
                  </h3>

                  {roomData.question.image && (
                    <img src={roomData.question.image} alt="Question Diagram" className="max-h-64 object-contain rounded-xl border border-slate-200 shadow-sm mb-8 bg-white p-2" />
                  )}

                  {roomData.question.type === 'multiple-choice' ? (
                    <div className="space-y-3">
                      {roomData.question.options.map((opt, i) => {
                        const isSelected = selectedAnswer === opt;
                        const isLocked = view === "submitted" || timeLeft === 0;
                        
                        const isCorrectAnswer = roomData.question.correctAnswer === opt;
                        const showReveal = isLocked && isCorrectAnswer;

                        return (
                          <label 
                            key={i} 
                            className={`flex items-center gap-4 p-4 border-2 rounded-xl transition-all shadow-sm relative overflow-hidden
                              ${isLocked ? 'cursor-not-allowed' : 'hover:border-indigo-300 cursor-pointer hover:shadow-md'}
                              ${isSelected ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 bg-white'}
                              ${showReveal ? '!border-emerald-500 !bg-emerald-50 !ring-emerald-100' : ''}
                            `}
                          >
                            <div className={`w-6 h-6 shrink-0 flex items-center justify-center border-2 rounded relative z-10
                               ${showReveal ? '!bg-emerald-500 !border-emerald-500 !text-white' : 
                                 isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 text-transparent'}
                            `}>
                              <i className="fas fa-check text-[10px]"></i>
                            </div>
                            <input 
                              type="radio" 
                              name="pollAnswer" 
                              value={opt}
                              disabled={isLocked}
                              checked={isSelected}
                              onChange={(e) => setSelectedAnswer(e.target.value)}
                              className="hidden"
                            />
                            <span className={`font-bold text-sm sm:text-base leading-relaxed relative z-10 ${showReveal ? 'text-emerald-800' : 'text-slate-700'}`}><Latex>{opt}</Latex></span>
                            
                            {showReveal && (
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Correct</span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative">
                      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Your Answer</label>
                      <input 
                        type="number" 
                        value={selectedAnswer}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        disabled={view === "submitted" || timeLeft === 0}
                        placeholder="Enter numerical value..."
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 text-xl font-black text-slate-800 outline-none focus:border-indigo-500 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-inner"
                      />
                      {(view === "submitted" || timeLeft === 0) && roomData.question.correctAnswer && (
                        <div className="mt-4 bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center justify-between">
                          <span className="text-emerald-700 font-bold text-sm"><i className="fas fa-check-circle"></i> Correct Answer:</span>
                          <span className="font-mono font-black text-emerald-800 bg-emerald-200 px-2 py-1 rounded">{roomData.question.correctAnswer}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-slate-200">
                    {view === "submitted" && timeLeft > 0 ? (
                      <div className="w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 text-lg bg-teal-50 text-teal-700 border border-teal-200 shadow-sm mb-4">
                        <i className="fas fa-check-circle text-teal-500"></i> Answer Submitted
                      </div>
                    ) : timeLeft === 0 ? (
                      <div className={`w-full py-4 rounded-xl font-black flex flex-col items-center justify-center gap-1 text-lg shadow-sm border mb-4
                        ${lastScoreGained ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}
                      `}>
                        <div className="flex items-center gap-2">
                           {lastScoreGained ? <><i className="fas fa-star text-emerald-500 animate-bounce"></i> +1 Point Awarded!</> : <><i className="fas fa-times-circle text-rose-500"></i> Time's Up</>}
                        </div>
                      </div>
                    ) : (
                      /* ⚡ GUEST BLOCKER SECURING THE EXAM SUBMISSION ⚡ */
                      <GuestBlocker role="student">
                        <button 
                          onClick={submitAnswer}
                          disabled={!selectedAnswer}
                          className={`w-full py-4 rounded-xl font-black shadow-lg transition flex items-center justify-center gap-2 text-lg mb-4
                            ${!selectedAnswer ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1 shadow-indigo-600/30'}
                          `}
                        >
                          Submit Answer <i className="fas fa-paper-plane"></i>
                        </button>
                      </GuestBlocker>
                    )}
                    
                    {(view === "submitted" || timeLeft === 0) && (
                      <p className="text-center text-[10px] font-black text-slate-400 mt-4 uppercase tracking-widest animate-pulse">Waiting for educator to end poll...</p>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* --- VIEW: LEADERBOARD --- */}
            {view === "leaderboard" && (
              <div className="bg-white p-6 md:p-10 rounded-3xl border border-slate-200 shadow-xl animate-in slide-in-from-right-8 duration-500 w-full max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-5">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-3">
                    <i className="fas fa-trophy text-amber-500 bg-amber-50 w-10 h-10 rounded-lg flex items-center justify-center"></i> 
                    Live Class Leaderboard
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left: Overall Rankings */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                     <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6">Top Students</h4>
                     
                     {leaderboard.length === 0 ? (
                       <p className="text-center text-slate-400 font-bold py-10 italic">No points awarded yet. Be the first!</p>
                     ) : (
                       <div className="space-y-3">
                         {leaderboard.map((student, idx) => {
                           const isMe = student.name === (user?.fullName || "Guest Student");
                           return (
                             <div key={student.name} className={`flex items-center justify-between p-4 rounded-xl shadow-sm border-2 transition-all
                               ${isMe ? 'bg-indigo-50 border-indigo-500 scale-105 my-2 z-10 shadow-md' : 'bg-white border-slate-100'}
                             `}>
                               <div className="flex items-center gap-4">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm
                                   ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}
                                 `}>
                                   #{idx + 1}
                                 </div>
                                 <span className={`font-bold ${isMe ? 'text-indigo-900' : 'text-slate-800'}`}>
                                   {student.name} {isMe && <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded ml-2 uppercase">You</span>}
                                 </span>
                               </div>
                               <span className={`font-black px-3 py-1 rounded-lg border ${isMe ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                                 {student.score} pts
                               </span>
                             </div>
                           )
                         })}
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
                          <span className="bg-teal-100 text-teal-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border border-teal-200">Class Stats</span>
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
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Class Answers</p>
                            {Object.keys(roomData.responses || {}).length === 0 ? (
                              <p className="text-sm text-slate-400 italic font-bold">No responses yet.</p>
                            ) : (
                              <ul className="space-y-2 max-h-[200px] overflow-y-auto">
                                {Object.entries(roomData.responses).map(([studentName, ans]) => (
                                  <li key={studentName} className="flex justify-between items-center text-sm bg-white p-2 rounded-lg border border-slate-100">
                                    <span className="font-bold text-slate-700">{studentName}</span>
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

// ⚡ 2. THE DEFAULT EXPORT EXPLICITLY WRAPPED IN SUSPENSE ⚡
export default function StudentQuizPollPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>}>
      <QuizPollContent />
    </Suspense>
  );
}