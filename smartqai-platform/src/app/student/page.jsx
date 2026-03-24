"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function StudentDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [publicMocks, setPublicMocks] = useState([]);
  const [activeProgress, setActiveProgress] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // 1. Fetch Live Public Mocks (e.g., GATE ECE general tests)
        const mocksRef = collection(db, "mocks");
        const qPublic = query(mocksRef, where("visibility", "==", "public"), where("status", "==", "published"));
        const publicSnap = await getDocs(qPublic);
        const fetchedPublic = publicSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPublicMocks(fetchedPublic);

        // 2. Fetch Student's In-Progress Exams (Resumable)
        // Note: Make sure your Exam UI saves `studentId` and `mockTitle` in the progress document!
        const progressRef = collection(db, "progress");
        const qProgress = query(progressRef, where("studentId", "==", user.id), where("isSubmitted", "==", false));
        const progressSnap = await getDocs(qProgress);
        
        const fetchedProgress = progressSnap.docs.map(d => ({ 
            id: d.id, // The progress doc ID
            ...d.data() 
        }));
        setActiveProgress(fetchedProgress);

      } catch (error) {
        console.error("Error fetching student dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && isSignedIn) {
      fetchDashboardData();
    }
  }, [user, isLoaded, isSignedIn]);

  // Handle joining a private room via Code
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    setIsJoining(true);
    try {
      // Verify the room actually exists
      const mockRef = doc(db, "mocks", joinCode.trim());
      const mockSnap = await getDoc(mockRef);

      if (mockSnap.exists()) {
        router.push(`/student/exam/${joinCode.trim()}`);
      } else {
        alert("Invalid Room ID. Please check the code and try again.");
      }
    } catch (error) {
      console.error("Error joining room:", error);
      alert("Failed to join room.");
    } finally {
      setIsJoining(false);
    }
  };

  if (!isLoaded || isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;
  if (!isSignedIn) return <div className="p-10 text-center">Please log in to view your dashboard.</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* STUDENT SIDEBAR */}
      <aside className="w-64 bg-indigo-950 text-white flex-col hidden md:flex shrink-0">
        <div className="p-6 text-2xl font-bold flex items-center gap-2 border-b border-indigo-900">
            <i className="fas fa-brain text-indigo-400"></i> SmartQAI
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <a href="#" className="flex items-center gap-3 bg-indigo-800 text-white p-3 rounded-lg font-medium border-l-4 border-indigo-400 shadow-inner">
                <i className="fas fa-home w-5"></i> Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 p-3 rounded-lg transition">
                <i className="fas fa-chart-pie w-5"></i> Analytics & Roadmaps
            </a>
            <a href="#" className="flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 p-3 rounded-lg transition">
                <i className="fas fa-history w-5"></i> Past Results
            </a>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-white shadow-sm p-6 flex justify-between items-center z-10 sticky top-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome back, Soumyajit!</h1>
            <p className="text-sm text-slate-500">Target: GATE ECE</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-sm font-bold text-slate-600 border border-slate-200 px-4 py-2 rounded-lg bg-slate-50">
               <i className="fas fa-fire text-orange-500 mr-1"></i> 3 Day Streak
             </div>
             <img src={user.imageUrl} alt="Profile" className="w-10 h-10 rounded-full border border-slate-300" />
          </div>
        </header>

        <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto w-full">

          {/* TOP ROW: JOIN ROOM & QUICK STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Join Private Room Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-md text-white md:col-span-2 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-10"><i className="fas fa-door-open text-9xl"></i></div>
              <h2 className="text-xl font-bold mb-2 relative z-10">Join a Private Mock</h2>
              <p className="text-indigo-200 text-sm mb-6 relative z-10">Enter the Room ID provided by your educator to join a live or scheduled exam.</p>
              
              <form onSubmit={handleJoinRoom} className="flex gap-3 relative z-10">
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="e.g. 8xV9-2mB" 
                  className="flex-1 bg-white/10 border border-indigo-400/50 rounded-xl p-3 text-white placeholder-indigo-300 outline-none focus:bg-white/20 transition font-mono tracking-wider"
                  required
                />
                <button 
                  type="submit" 
                  disabled={isJoining}
                  className="bg-white text-indigo-700 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition shadow-sm disabled:opacity-70 flex items-center gap-2"
                >
                  {isJoining ? "Joining..." : "Enter Room"} <i className="fas fa-arrow-right"></i>
                </button>
              </form>
            </div>

            {/* Quick Analytics Snippet */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Focus Area</h3>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div>
                  <div className="font-bold text-slate-800">Signals and Systems</div>
                  <div className="text-xs text-rose-500 font-bold">Critical (32% Avg)</div>
                </div>
              </div>
              <button className="mt-4 w-full text-xs font-bold text-indigo-600 bg-indigo-50 py-2 rounded-lg hover:bg-indigo-100 transition border border-indigo-100">
                View Study Roadmap
              </button>
            </div>

          </div>

          {/* RESUME EXAMS SECTION */}
          {activeProgress.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                <h2 className="text-lg font-bold text-slate-800">In-Progress Exams</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeProgress.map((prog) => (
                  <div key={prog.id} className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm relative overflow-hidden group hover:shadow-md transition">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded">Resumable</span>
                      <span className="text-xs font-bold text-slate-500 font-mono">{Math.floor(prog.timeLeft / 60)}m left</span>
                    </div>
                    <h3 className="font-bold text-slate-800 mt-2 mb-4 truncate">{prog.mockTitle || "Live Mock Exam"}</h3>
                    
                    <button 
                      onClick={() => router.push(`/student/exam/${prog.mockId}`)}
                      className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition flex items-center justify-center gap-2"
                    >
                      Resume Exam <i className="fas fa-play text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PUBLIC LIVE MOCKS SECTION */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4"><i className="fas fa-globe text-indigo-500 mr-2"></i> Live Public Exams</h2>
            
            {publicMocks.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500 shadow-sm">
                <i className="fas fa-folder-open text-4xl text-slate-300 mb-3"></i>
                <p>No public exams are currently active.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicMocks.map((mock) => (
                  <div key={mock.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition flex flex-col h-full">
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded">Live</span>
                        <span className="text-xs text-slate-500"><i className="fas fa-clock mr-1"></i> {mock.duration}m</span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1 leading-tight">{mock.title}</h3>
                      <p className="text-sm text-slate-500 mb-4">By {mock.educatorName || "Platform Educator"}</p>
                    </div>
                    
                    <button 
                      onClick={() => router.push(`/student/exam/${mock.id}`)}
                      className="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-600 hover:text-white transition"
                    >
                      Start Exam
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}