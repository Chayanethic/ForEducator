"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs"; // ⚡ Removed useOrganizationList to stop forced redirects!
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function EducatorDashboard() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const router = useRouter();
  
  const [recentRooms, setRecentRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // ⚡ If Guest, stop loading and show empty state ⚡
      if (!user) {
        setIsLoading(false);
        return;
      }
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
    if (isUserLoaded) fetchDashboardData();
  }, [user, isUserLoaded]);

  // --- BRANDED LOADING SCREEN ---
  if (!isUserLoaded || isLoading) return (
    <div className="flex h-[80vh] items-center justify-center bg-slate-50 flex-col animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 text-indigo-50 rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-xl shadow-indigo-900/30 border border-indigo-400/30 transform -rotate-3 animate-pulse">
        <i className="fas fa-book-open-reader"></i>
      </div>
      <h2 className="text-xl font-black text-slate-900 tracking-tight animate-pulse">Loading Workspace...</h2>
    </div>
  );

  return (
    <>
      {/* ⚡ HEADER ⚡ */}
      <header className="bg-white shadow-sm p-4 md:p-6 flex justify-between items-center z-10 sticky top-0 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <h1 className="text-xl md:text-2xl font-black text-slate-900">Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
           <span className="text-sm font-bold text-slate-700 hidden sm:block">Welcome, {user?.firstName || "Guest"}</span>
           <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Educator"} alt="Avatar" className="w-9 h-9 rounded-full border-2 border-indigo-100 shadow-sm" />
        </div>
      </header>

      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* QUICK ACTIONS */}
        <div>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* ⚡ GUEST BLOCKERS REMOVED FROM CARDS SO GUESTS CAN ROUTE TO DEMO PAGES ⚡ */}
            <div onClick={() => router.push('/educator/create-mock')} className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl shadow-lg cursor-pointer hover:-translate-y-1 transition transform group h-full border border-indigo-500">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white text-2xl mb-4 group-hover:scale-110 transition shadow-inner"><i className="fas fa-magic"></i></div>
              <h3 className="text-white font-black text-lg mb-1">AI Exam Builder</h3>
              <p className="text-indigo-100 text-xs font-medium">Extract PDFs or build from scratch.</p>
            </div>

            <div onClick={() => router.push('/educator/quiz-poll')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-amber-300 hover:shadow-md transition transform group h-full">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition shadow-sm border border-amber-100"><i className="fas fa-bolt"></i></div>
              <h3 className="text-slate-900 font-black text-lg mb-1">Live Quiz Poll</h3>
              <p className="text-slate-500 text-xs font-medium">Host a quick real-time question.</p>
            </div>

            <div onClick={() => router.push('/educator/live-rooms')} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:border-emerald-300 hover:shadow-md transition transform group h-full">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition shadow-sm border border-emerald-100"><i className="fas fa-door-open"></i></div>
              <h3 className="text-slate-900 font-black text-lg mb-1">Manage Rooms</h3>
              <p className="text-slate-500 text-xs font-medium">View active exam leaderboards.</p>
            </div>

          </div>
        </div>

        {/* RECENT EXAMS */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
             <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide"><i className="fas fa-history text-indigo-500 mr-2"></i> Recent Mock Exams</h2>
             <button onClick={() => router.push('/educator/live-rooms')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">View All</button>
           </div>
           <div className="divide-y divide-slate-100">
             {recentRooms.length > 0 ? recentRooms.map(room => (
               <div key={room.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition group">
                 <div>
                   <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">{room.title}</h3>
                   <div className="flex items-center gap-3 mt-1 text-xs font-bold text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{room.examCategory}</span>
                      <span><i className="far fa-clock"></i> {room.duration} mins</span>
                      <span><i className="far fa-calendar-alt"></i> {room.createdAt?.toDate().toLocaleDateString()}</span>
                   </div>
                 </div>
                 <div className="flex items-center gap-3">
                   <span className="bg-indigo-50 text-indigo-700 font-mono font-black text-xs px-3 py-1.5 rounded-lg border border-indigo-100">ID: {room.id}</span>
                   <button onClick={() => router.push(`/educator/live-rooms/${room.id}`)} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">View Results</button>
                 </div>
               </div>
             )) : (
               <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full border border-slate-100 flex items-center justify-center mb-4">
                    <i className="fas fa-folder-open text-2xl text-slate-300"></i>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 mb-1">No exams created yet.</h3>
                  <p className="text-xs font-medium text-slate-500 mb-4">Generate your first mock assessment to see it here.</p>
                  <button onClick={() => router.push('/educator/create-mock')} className="text-indigo-600 font-bold hover:underline flex items-center gap-1.5 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100 transition-colors">
                    <i className="fas fa-plus"></i> Create Exam
                  </button>
               </div>
             )}
           </div>
        </div>

      </div>
    </>
  );
}