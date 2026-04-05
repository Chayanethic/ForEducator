"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EducatorDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  
  const [recentRooms, setRecentRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      try {
        const qRef = query(collection(db, "mocks"), where("educatorId", "==", user.id), orderBy("createdAt", "desc"), limit(6));
        const snap = await getDocs(qRef);
        setRecentRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching rooms:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isLoaded && isSignedIn) fetchDashboardData();
  }, [user, isLoaded, isSignedIn]);

  // --- PREMIUM UPGRADE: BRANDED LOADING SCREEN ---
  if (!isLoaded || isLoading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 flex-col animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 text-indigo-50 rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-xl shadow-indigo-900/30 border border-indigo-400/30 transform -rotate-3 animate-pulse">
        <i className="fas fa-book-open-reader"></i>
      </div>
      <h2 className="text-xl font-black text-slate-900 tracking-tight animate-pulse">Loading Workspace...</h2>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden">
      
      {isMobileMenuOpen && ( <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} /> )}

      {/* UNIFIED INDIGO SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-950 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-indigo-900">
          <Link href="/onboarding?switch=true" className="text-xl font-black flex items-center gap-2 hover:text-emerald-400 transition cursor-pointer tracking-tight">
            <i className="fas fa-book-open-reader text-emerald-400"></i> OZONE
          </Link>
          <button className="md:hidden text-indigo-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><i className="fas fa-times text-lg"></i></button>
        </div>
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button onClick={() => router.push('/educator/dashboard')} className="w-full flex items-center gap-3 bg-indigo-800 text-white p-2.5 rounded-xl text-sm font-bold border-l-4 border-emerald-400 shadow-inner">
                <i className="fas fa-home w-4 text-emerald-400"></i>Educator Dashboard
            </button>
            <button onClick={() => router.push('/educator/create-mock')} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-file-pdf w-4"></i> Exam Studio
            </button>
            <button onClick={() => router.push('/educator/live-rooms')} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-door-open w-4"></i> Live Rooms
            </button>
            <button onClick={() => router.push('/educator/quiz-poll')} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-bolt w-4"></i> Live Quiz Poll
            </button>
        </nav>
        
        {/* --- FIXED: FULL USER PROFILE & SWITCH ROLE ADDED HERE --- */}
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
        <header className="bg-white shadow-sm p-4 md:p-6 flex justify-between items-center z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-slate-600" onClick={() => setIsMobileMenuOpen(true)}><i className="fas fa-bars text-xl"></i></button>
            <h1 className="text-xl md:text-2xl font-black text-slate-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-sm font-bold text-slate-700 hidden sm:block">Welcome, {user?.firstName}</span>
             <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Educator"} alt="Avatar" className="w-9 h-9 rounded-full border-2 border-indigo-100" />
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
          
          {/* QUICK ACTIONS */}
          <div>
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              <div onClick={() => router.push('/educator/create-mock')} className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-lg cursor-pointer hover:-translate-y-1 transition transform group">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white text-2xl mb-4 group-hover:scale-110 transition"><i className="fas fa-magic"></i></div>
                <h3 className="text-white font-black text-lg mb-1">AI Exam Builder</h3>
                <p className="text-indigo-100 text-xs font-medium">Extract PDFs or build from scratch.</p>
              </div>

              <div onClick={() => router.push('/educator/quiz-poll')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-amber-300 hover:shadow-md transition transform group">
                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition"><i className="fas fa-bolt"></i></div>
                <h3 className="text-slate-900 font-black text-lg mb-1">Live Quiz Poll</h3>
                <p className="text-slate-500 text-xs font-medium">Host a quick real-time question.</p>
              </div>

              <div onClick={() => router.push('/educator/live-rooms')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-300 hover:shadow-md transition transform group">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition"><i className="fas fa-door-open"></i></div>
                <h3 className="text-slate-900 font-black text-lg mb-1">Manage Rooms</h3>
                <p className="text-slate-500 text-xs font-medium">View active exam leaderboards.</p>
              </div>

            </div>
          </div>

          {/* RECENT EXAMS */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide"><i className="fas fa-history text-indigo-500 mr-2"></i> Recent Mock Exams</h2>
               <button onClick={() => router.push('/educator/live-rooms')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">View All</button>
             </div>
             <div className="divide-y divide-slate-100">
               {recentRooms.length > 0 ? recentRooms.map(room => (
                 <div key={room.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                   <div>
                     <h3 className="font-bold text-slate-900 text-base">{room.title}</h3>
                     <div className="flex items-center gap-3 mt-1 text-xs font-bold text-slate-500">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{room.examCategory}</span>
                        <span><i className="far fa-clock"></i> {room.duration} mins</span>
                        <span><i className="far fa-calendar-alt"></i> {room.createdAt?.toDate().toLocaleDateString()}</span>
                     </div>
                   </div>
                   <div className="flex items-center gap-3">
                     <span className="bg-indigo-50 text-indigo-700 font-mono font-black text-xs px-3 py-1.5 rounded-lg border border-indigo-100">ID: {room.id}</span>
                     <button onClick={() => router.push(`/educator/live-rooms/${room.id}`)} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition">View Results</button>
                   </div>
                 </div>
               )) : (
                 <div className="p-10 text-center text-slate-500 flex flex-col items-center">
                    <i className="fas fa-folder-open text-4xl mb-3 text-slate-300"></i>
                    <p className="font-bold">No exams created yet.</p>
                    <button onClick={() => router.push('/educator/create-mock')} className="mt-3 text-indigo-600 font-bold hover:underline">Create your first exam</button>
                 </div>
               )}
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}