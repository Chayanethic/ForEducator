"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { doc, getDoc, collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useParams } from 'next/navigation';

export default function LiveRoomDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const params = useParams();
  const mockId = params.mockId;

  const [examDetails, setExamDetails] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch Exam Details
  useEffect(() => {
    const fetchExamDetails = async () => {
      if (!mockId) return;
      try {
        const docRef = doc(db, "mocks", mockId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setExamDetails({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching exam details:", error);
      }
    };
    fetchExamDetails();
  }, [mockId]);

  // Real-time Leaderboard Listener
  useEffect(() => {
    if (!mockId) return;
    
    const resultsRef = collection(db, "results");
    const q = query(
      resultsRef, 
      orderBy("score", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const roomResults = allResults.filter(r => r.mockId === mockId || r.examId === mockId || r.roomId === mockId);
      
      roomResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      setLeaderboard(roomResults);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to leaderboard:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [mockId]);

  const handleCopyCode = () => {
    if (!examDetails?.id) return;
    navigator.clipboard.writeText(examDetails.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate Quick Stats
  const totalStudents = leaderboard.length;
  const avgScore = totalStudents > 0 
    ? (leaderboard.reduce((sum, s) => sum + (s.score || 0), 0) / totalStudents).toFixed(1) 
    : 0;
  
  const highestScore = totalStudents > 0 ? leaderboard[0].score : 0;

  // --- BRANDED LOADING SCREEN ---
  if (!isLoaded || isLoading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 flex-col animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 text-indigo-50 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-xl shadow-indigo-900/30 border border-indigo-400/30 transform -rotate-3 animate-pulse">
        <i className="fas fa-broadcast-tower"></i>
      </div>
      <h2 className="text-lg font-bold text-slate-900 tracking-tight animate-pulse">Connecting to Live Room...</h2>
    </div>
  );

  if (!isSignedIn) return <div className="p-10 text-center font-bold text-slate-500">Please log in to view this room.</div>;

  return (
    <div className="flex h-screen bg-slate-100 font-sans relative overflow-hidden">
      
      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && ( <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} /> )}

      {/* UNIFIED INDIGO SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-950 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-indigo-900">
          <Link href="/onboarding?switch=true" className="text-lg font-bold flex items-center gap-2 hover:text-emerald-400 transition cursor-pointer tracking-tight">
            <i className="fas fa-book-open-reader text-emerald-400"></i> OZONE
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
            <button onClick={() => router.push('/educator/live-rooms')} className="w-full flex items-center gap-3 bg-indigo-800 text-white p-2.5 rounded-xl text-sm font-bold border-l-4 border-emerald-400 shadow-inner">
                <i className="fas fa-door-open w-4 text-emerald-400"></i> Live Rooms
            </button>
            <button onClick={() => router.push('/educator/quiz-poll')} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
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

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-y-auto w-full">
        
        {/* --- HEADER WITH HIGHLIGHTED BACK BUTTON --- */}
        <header className="bg-white border-b border-slate-200 h-auto md:h-16 py-3 px-4 md:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 z-20 shrink-0 shadow-sm sticky top-0">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button className="md:hidden text-slate-600 shrink-0" onClick={() => setIsMobileMenuOpen(true)}><i className="fas fa-bars text-xl"></i></button>
             
             {/* HIGH-VISIBILITY BACK BUTTON */}
             <button onClick={() => router.push('/educator/live-rooms')} className="shrink-0 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:text-white hover:bg-indigo-600 hover:shadow-md transition-all flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold" title="Back to Live Rooms">
               <i className="fas fa-arrow-left"></i> <span className="hidden sm:block">Back</span>
             </button>
             
             <h1 className="text-base md:text-lg font-bold text-slate-900 ml-2 truncate max-w-[200px] sm:max-w-sm">{examDetails?.title || "Live Room"}</h1>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
             <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg shadow-sm">
               <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>
               Receiving Live Results
             </div>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* TOP STATS DASHBOARD */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6">
            
            {/* UPGRADED: COMPACT ROOM ID CARD (4 SPANS) */}
            <div className="md:col-span-5 lg:col-span-4 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden border border-indigo-900 flex flex-col justify-center text-white">
               <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
               
               <h3 className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-1">Live Room ID</h3>
               <p className="text-[10px] text-indigo-200/70 font-medium mb-3">Share this code with students to join.</p>
               
               {/* SLEEKER, SMALLER COPY BOX */}
               <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-white/20 transition-all" onClick={handleCopyCode} title="Click to Copy">
                 <span className="text-lg md:text-xl font-mono font-bold tracking-wider truncate mr-2">{examDetails?.id}</span>
                 <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-indigo-200 group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                   <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-sm`}></i>
                 </div>
               </div>
               
               <div className="mt-4 flex gap-2 text-[10px] font-bold text-indigo-200">
                  <span className="bg-white/10 px-2 py-1 rounded border border-white/5"><i className="fas fa-clock mr-1"></i> {examDetails?.duration} Mins</span>
                  <span className="bg-white/10 px-2 py-1 rounded border border-white/5"><i className="fas fa-layer-group mr-1"></i> {examDetails?.examCategory}</span>
               </div>
            </div>

            {/* QUICK STATS (8 SPANS) */}
            <div className="md:col-span-7 lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
               <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center hover:shadow-md transition-shadow">
                 <div className="w-8 h-8 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center text-sm mb-2 md:mb-3"><i className="fas fa-users"></i></div>
                 <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Submissions</h3>
                 <span className="text-2xl font-bold text-slate-900">{totalStudents}</span>
               </div>
               
               <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center hover:shadow-md transition-shadow">
                 <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-sm mb-2 md:mb-3"><i className="fas fa-chart-pie"></i></div>
                 <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Average Score</h3>
                 <span className="text-2xl font-bold text-emerald-600">{avgScore}</span>
               </div>

               <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center hover:shadow-md transition-shadow">
                 <div className="w-8 h-8 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-sm mb-2 md:mb-3"><i className="fas fa-trophy"></i></div>
                 <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Highest Score</h3>
                 <span className="text-2xl font-bold text-amber-500">{highestScore}</span>
               </div>
            </div>
          </div>

          {/* LEADERBOARD SECTION */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4">
               <div>
                 <h2 className="text-sm md:text-base font-bold text-slate-900 flex items-center gap-2"><i className="fas fa-list-ol text-indigo-500"></i> Real-Time Leaderboard</h2>
                 <p className="text-[10px] font-medium text-slate-500 mt-1">Updates automatically as students submit their exams.</p>
               </div>
               <div className="text-[10px] md:text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                 <i className="fas fa-sort-amount-down text-indigo-400"></i> Ranked by Score
               </div>
            </div>
            
            {leaderboard.length === 0 ? (
              <div className="p-12 md:p-16 text-center flex flex-col items-center justify-center">
                 <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-2xl mb-4 border border-slate-100 text-slate-300"><i className="fas fa-user-graduate"></i></div>
                 <h3 className="text-base md:text-lg font-bold text-slate-700 mb-1">Waiting for Submissions</h3>
                 <p className="text-xs md:text-sm font-medium text-slate-500 max-w-sm">When students complete this exam using your Room ID, their scores will appear here instantly.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-white text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b-2 border-slate-100">
                      <th className="p-3 md:p-4 pl-4 md:pl-6 w-16 text-center">Rank</th>
                      <th className="p-3 md:p-4">Student Name</th>
                      <th className="p-3 md:p-4 text-center">Score</th>
                      <th className="p-3 md:p-4 text-center">Accuracy</th>
                      <th className="p-3 md:p-4 text-right pr-4 md:pr-6">Submission Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leaderboard.map((student, index) => {
                      const rank = index + 1;
                      const totalAttempted = (student.correct || 0) + (student.incorrect || 0);
                      const accuracy = totalAttempted > 0 ? Math.round((student.correct / totalAttempted) * 100) : 0;
                      
                      let rankBadge = <span className="text-sm font-bold text-slate-400">{rank}</span>;
                      if (rank === 1) rankBadge = <span className="text-lg md:text-xl" title="1st Place">🥇</span>;
                      else if (rank === 2) rankBadge = <span className="text-lg md:text-xl" title="2nd Place">🥈</span>;
                      else if (rank === 3) rankBadge = <span className="text-lg md:text-xl" title="3rd Place">🥉</span>;

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-3 md:p-4 pl-4 md:pl-6 text-center">{rankBadge}</td>
                          <td className="p-3 md:p-4">
                            <div className="flex items-center gap-3">
                              <img src={student.studentImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.studentName || 'Student')}&background=random`} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-200" />
                              <div>
                                <div className="font-bold text-xs md:text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{student.studentName || "Anonymous Student"}</div>
                                <div className="text-[9px] md:text-[10px] font-medium text-slate-400">{student.studentEmail || "No email provided"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 md:p-4 text-center">
                            <span className="text-base md:text-lg font-bold text-indigo-600">{student.score}</span>
                          </td>
                          <td className="p-3 md:p-4">
                            <div className="flex flex-col items-center justify-center gap-1 w-20 md:w-24 mx-auto">
                              <span className={`text-[9px] md:text-[10px] font-bold ${accuracy >= 80 ? 'text-emerald-600' : accuracy >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>{accuracy}%</span>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${accuracy >= 80 ? 'bg-emerald-500' : accuracy >= 50 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${accuracy}%` }}></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 md:p-4 text-right pr-4 md:pr-6 text-[9px] md:text-[10px] font-medium text-slate-500">
                            {student.submittedAt?.toDate ? student.submittedAt.toDate().toLocaleString() : new Date().toLocaleTimeString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}