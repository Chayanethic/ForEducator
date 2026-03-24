"use client";

import { useState, useEffect } from "react";
// 1. CHANGED: Import useClerk instead of UserButton
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const CATEGORIES = ["GATE ECE", "GATE CS", "GATE EE", "GATE ME", "JEE Mains", "SSC CGL"];

export default function StudentDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  // 2. NEW: Bring in the signOut function from Clerk
  const { signOut } = useClerk(); 
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState("GATE ECE");

  const [publicMocks, setPublicMocks] = useState([]);
  const [activeProgress, setActiveProgress] = useState([]);
  const [pastResults, setPastResults] = useState([]); 
  
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLoadingMain, setIsLoadingMain] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  useEffect(() => {
    const fetchPersonalData = async () => {
      if (!user) return;
      try {
        const progressRef = collection(db, "progress");
        const qProgress = query(progressRef, where("studentId", "==", user.id), where("isSubmitted", "==", false));
        const progressSnap = await getDocs(qProgress);
        setActiveProgress(progressSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const resultsRef = collection(db, "results");
        const qResults = query(resultsRef, where("studentId", "==", user.id));
        const resultsSnap = await getDocs(qResults);
        let fetchedResults = resultsSnap.docs.map(d => ({ 
            id: d.id, ...d.data(), submittedDate: d.data().submittedAt?.toDate() || new Date()
        }));
        fetchedResults.sort((a, b) => b.submittedDate - a.submittedDate);
        setPastResults(fetchedResults);

      } catch (error) {
        console.error("Error fetching personal data:", error);
      } finally {
        setIsLoadingMain(false);
      }
    };
    if (isLoaded && isSignedIn) fetchPersonalData();
  }, [user, isLoaded, isSignedIn]);

  useEffect(() => {
    const fetchPublicFeed = async () => {
      setIsLoadingFeed(true);
      try {
        const mocksRef = collection(db, "mocks");
        
        const qPublic = query(
          mocksRef, 
          where("visibility", "==", "public"), 
          where("status", "==", "published"),
          where("examCategory", "==", selectedCategory)
        );
        
        const publicSnap = await getDocs(qPublic);
        let fetchedPublic = publicSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        fetchedPublic = fetchedPublic.filter(mock => !mock.isPYQ || mock.showInLiveFeed);
        
        setPublicMocks(fetchedPublic);
      } catch (error) {
        console.error("Error fetching public feed:", error);
      } finally {
        setIsLoadingFeed(false);
      }
    };
    if (isLoaded) fetchPublicFeed();
  }, [selectedCategory, isLoaded]);

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);
    try {
      const mockRef = doc(db, "mocks", joinCode.trim());
      const mockSnap = await getDoc(mockRef);
      if (mockSnap.exists()) router.push(`/student/exam/${joinCode.trim()}`);
      else alert("Invalid Room ID. Please check the code and try again.");
    } catch (error) {
      alert("Failed to join room.");
    } finally {
      setIsJoining(false);
    }
  };

  const totalExams = pastResults.length;
  const avgScore = totalExams > 0 ? (pastResults.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalExams).toFixed(1) : 0;
  
  let totalCorrect = 0; let totalAttempted = 0;
  pastResults.forEach(r => { totalCorrect += (r.correct || 0); totalAttempted += (r.correct || 0) + (r.incorrect || 0); });
  const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  if (!isLoaded || isLoadingMain) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;
  if (!isSignedIn) return <div className="p-10 text-center">Please log in to view your dashboard.</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* STUDENT SIDEBAR */}
      <aside className="w-64 bg-indigo-950 text-white flex-col hidden md:flex shrink-0">
        <Link href="/onboarding?switch=true" className="p-6 text-2xl font-bold flex items-center gap-2 border-b border-indigo-900 hover:text-indigo-400 transition cursor-pointer block">
            <i className="fas fa-brain text-indigo-400"></i> SmartQAI
        </Link>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <Link href="/student" className="flex items-center gap-3 bg-indigo-800 text-white p-3 rounded-lg font-medium border-l-4 border-indigo-400 shadow-inner">
                <i className="fas fa-home w-5"></i> Dashboard
            </Link>
            <Link href="/student/pyq" className="flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 p-3 rounded-lg transition">
                <i className="fas fa-book-open w-5"></i> PYQ Practice
            </Link>
            <a href="#" className="flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 p-3 rounded-lg transition">
                <i className="fas fa-chart-pie w-5"></i> Analytics & Roadmaps
            </a>
            <a href="#" className="flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 p-3 rounded-lg transition">
                <i className="fas fa-history w-5"></i> Past Results
            </a>
        </nav>
        
        {/* --- 3. UPGRADED: BOTTOM PROFILE & LOGOUT BUTTON --- */}
        <div className="p-4 border-t border-indigo-900 bg-indigo-900/30 space-y-2">
            
            {/* Static User Profile Badge */}
            <div className="flex items-center gap-3 p-3 bg-indigo-950/50 rounded-lg border border-indigo-800/50 shadow-inner">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=User"} alt="Avatar" className="w-8 h-8 rounded-full border border-indigo-700" />
                <div className="text-sm font-medium truncate flex-1 text-indigo-100">{user?.fullName || "Account"}</div>
            </div>

            {/* Switch Role Button */}
            <button 
              onClick={() => router.push('/onboarding?switch=true')}
              className="w-full flex items-center justify-center gap-2 text-indigo-300 hover:bg-indigo-800 hover:text-white p-2.5 rounded-lg transition text-sm font-bold border border-transparent hover:border-indigo-700 shadow-sm"
            >
                <i className="fas fa-exchange-alt"></i> Switch Role
            </button>

            {/* Custom Log Out Button */}
            <button 
              onClick={() => signOut({ redirectUrl: '/' })}
              className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-600 hover:text-white p-2.5 rounded-lg transition text-sm font-bold border border-rose-900/50 hover:border-rose-500 bg-rose-950/20 shadow-sm"
            >
                <i className="fas fa-sign-out-alt"></i> Log Out
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-white shadow-sm p-6 flex justify-between items-center z-10 sticky top-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Welcome back, {user?.firstName || "Student"}!</h1>
            <p className="text-sm text-slate-500">Let's continue your preparation.</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-sm font-bold text-slate-600 border border-slate-200 px-4 py-2 rounded-lg bg-slate-50">
               <i className="fas fa-fire text-orange-500 mr-1"></i> {totalExams} Exams Taken
             </div>
          </div>
        </header>

        <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto w-full">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-md text-white md:col-span-2 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 opacity-10"><i className="fas fa-door-open text-9xl"></i></div>
              <h2 className="text-xl font-bold mb-2 relative z-10">Join a Private Mock</h2>
              <p className="text-indigo-200 text-sm mb-6 relative z-10">Enter the Room ID provided by your educator to join a live or scheduled exam.</p>
              
              <form onSubmit={handleJoinRoom} className="flex gap-3 relative z-10">
                <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="e.g. 8xV9-2mB" className="flex-1 bg-white/10 border border-indigo-400/50 rounded-xl p-3 text-white placeholder-indigo-300 outline-none focus:bg-white/20 transition font-mono tracking-wider" required />
                <button type="submit" disabled={isJoining} className="bg-white text-indigo-700 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition shadow-sm disabled:opacity-70 flex items-center gap-2">
                  {isJoining ? "Joining..." : "Enter Room"} <i className="fas fa-arrow-right"></i>
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Overall Performance</h3>
                <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="text-xs text-slate-400 font-bold mb-1">Avg Score</div>
                    <div className="text-2xl font-black text-slate-800">{avgScore}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-bold mb-1">Accuracy</div>
                    <div className="text-2xl font-black text-emerald-600">{accuracy}%</div>
                  </div>
                </div>
              </div>
              <button className="w-full text-xs font-bold text-indigo-600 bg-indigo-50 py-2.5 rounded-lg hover:bg-indigo-100 transition border border-indigo-100">
                View Full Analytics <i className="fas fa-chart-line ml-1"></i>
              </button>
            </div>
          </div>

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
                    <button onClick={() => router.push(`/student/exam/${prog.mockId}`)} className="w-full bg-slate-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition flex items-center justify-center gap-2">
                      Resume Exam <i className="fas fa-play text-xs"></i>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastResults.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4"><i className="fas fa-history text-slate-400 mr-2"></i> Recent Completed Exams</h2>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                        <th className="p-4 pl-6">Exam Title</th>
                        <th className="p-4 text-center">Date Taken</th>
                        <th className="p-4 text-center">Score</th>
                        <th className="p-4 text-center">Accuracy</th>
                        <th className="p-4 text-right pr-6">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pastResults.slice(0, 5).map((result) => {
                         const resultAccuracy = (result.correct + result.incorrect) > 0 
                           ? Math.round((result.correct / (result.correct + result.incorrect)) * 100) 
                           : 0;
                         return (
                          <tr key={result.id} className="hover:bg-slate-50 transition">
                            <td className="p-4 pl-6 font-bold text-slate-800">{result.examTitle || "Mock Exam"}</td>
                            <td className="p-4 text-center text-sm text-slate-500">{result.submittedDate.toLocaleDateString()}</td>
                            <td className="p-4 text-center font-black text-indigo-600">{result.score}</td>
                            <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${resultAccuracy >= 75 ? 'bg-emerald-100 text-emerald-700' : resultAccuracy >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{resultAccuracy}%</span></td>
                            <td className="p-4 text-right pr-6"><button className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded font-bold hover:bg-slate-100 transition shadow-sm">View Report</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
              <h2 className="text-lg font-bold text-slate-800"><i className="fas fa-globe text-indigo-500 mr-2"></i> Live Public Exams</h2>
              
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            
            {isLoadingFeed ? (
              <div className="py-12 text-center"><i className="fas fa-circle-notch fa-spin text-3xl text-indigo-400"></i></div>
            ) : publicMocks.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500 shadow-sm">
                <i className="fas fa-folder-open text-4xl text-slate-300 mb-3"></i>
                <p>No active public exams for <strong className="text-indigo-600">{selectedCategory}</strong> right now.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publicMocks.map((mock) => (
                  <div key={mock.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md transition flex flex-col h-full relative overflow-hidden">
                    
                    {mock.isPYQ && (
                      <div className="absolute top-4 right-4 bg-rose-100 text-rose-700 text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm border border-rose-200">
                        <i className="fas fa-star mr-1"></i> Featured PYQ
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded">Live</span>
                        <span className="text-xs text-slate-500 mt-1"><i className="fas fa-clock mr-1"></i> {mock.duration}m</span>
                      </div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1 leading-tight pr-12">{mock.title}</h3>
                      <p className="text-sm text-slate-500 mb-4">By {mock.educatorName || "Platform Educator"}</p>
                    </div>
                    <button onClick={() => router.push(`/student/exam/${mock.id}`)} className="w-full bg-indigo-50 text-indigo-700 border border-indigo-200 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-600 hover:text-white transition">
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