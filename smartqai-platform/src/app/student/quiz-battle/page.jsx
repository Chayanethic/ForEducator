"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function QuizBattlePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  
  // State for the Render iframe loading and Mobile Menu
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- BRANDED LOADING SCREEN ---
  if (!isLoaded) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 flex-col animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-xl shadow-indigo-900/30 border border-indigo-400/30 transform -rotate-3 animate-pulse">
        <i className="fas fa-gamepad"></i>
      </div>
      <h2 className="text-xl font-black text-slate-900 tracking-tight animate-pulse">Loading Arena...</h2>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100 font-sans relative overflow-hidden">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* --- UNIFIED PREMIUM STUDENT SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-950 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-indigo-900">
          <Link href="/onboarding?switch=true" className="text-xl font-black flex items-center gap-2 hover:text-emerald-400 transition cursor-pointer tracking-tight">
            <i className="fas fa-book-open-reader text-emerald-400"></i> OZONE
          </Link>
          <button className="md:hidden text-indigo-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><i className="fas fa-times text-lg"></i></button>
        </div>
        
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button onClick={() => router.push('/student')} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-home w-4"></i> Dashboard
            </button>
            <button onClick={() => router.push('/student/live-rooms')} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-door-open w-4"></i> Live Exams
            </button>
            <button onClick={() => router.push('/student/pyq')} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-history w-4"></i> PYQ Practice
            </button>
            <button onClick={() => router.push('/student/planner')} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-calendar-alt w-4"></i> Study Planner
            </button>
            <button onClick={() => router.push('/student/quiz-battle')} className="w-full flex items-center gap-3 bg-indigo-800 text-white p-2.5 rounded-xl text-sm font-bold border-l-4 border-rose-400 shadow-inner">
                <i className="fas fa-gamepad w-4 text-rose-400"></i> Quiz Battle
            </button>
        </nav>
        
        <div className="p-3 border-t border-indigo-900 bg-indigo-900/30 space-y-1.5">
            <div className="flex items-center gap-2.5 p-2.5 bg-indigo-950/50 rounded-xl border border-indigo-800/50 shadow-inner">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Student"} alt="Avatar" className="w-7 h-7 rounded-full border border-indigo-700" />
                <div className="text-xs font-bold truncate flex-1 text-indigo-100">{user?.fullName || "Student"}</div>
            </div>
            <button onClick={() => router.push('/onboarding?switch=true')} className="w-full flex items-center justify-center gap-2 text-indigo-300 hover:bg-indigo-800 hover:text-white p-2 rounded-xl transition text-xs font-bold border border-transparent hover:border-indigo-700 shadow-sm">
                <i className="fas fa-exchange-alt"></i> Switch Role
            </button>
            <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-600 hover:text-white p-2 rounded-xl transition text-xs font-bold border border-rose-900/50 hover:border-rose-500 bg-rose-950/20 shadow-sm">
                <i className="fas fa-sign-out-alt"></i> Log Out
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 h-auto md:h-16 py-3 px-4 md:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 z-20 shrink-0 shadow-sm sticky top-0">
          <div className="flex items-center gap-3 w-full md:w-auto">
             <button className="md:hidden text-slate-600 shrink-0" onClick={() => setIsMobileMenuOpen(true)}><i className="fas fa-bars text-xl"></i></button>
             
             <button onClick={() => router.push('/student')} className="shrink-0 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:text-white hover:bg-indigo-600 hover:shadow-md transition-all flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold" title="Back to Dashboard">
               <i className="fas fa-arrow-left"></i> <span className="hidden sm:block">Dashboard</span>
             </button>
             
             <div>
               <h1 className="text-lg md:text-xl font-black text-slate-900 ml-2">Multiplayer Arena</h1>
               <p className="text-[10px] md:text-xs font-bold text-slate-500 ml-2 hidden sm:block">Challenge your friends in real-time battles.</p>
             </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
             <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg shadow-sm">
               <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span></span>
               Live Servers Active
             </div>
          </div>
        </header>

        {/* IFRAME CONTAINER */}
        <div className="flex-1 p-0 md:p-6 lg:p-8 max-w-7xl mx-auto w-full relative flex flex-col">
          <div className="w-full flex-1 relative rounded-none md:rounded-2xl overflow-hidden shadow-none md:shadow-lg border-0 md:border border-slate-200 bg-white flex flex-col">
            
            {/* RENDER WAKE-UP SPINNER */}
            {!iframeLoaded && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-sm animate-in fade-in duration-500">
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-rose-500 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-satellite-dish text-3xl text-indigo-500 animate-pulse"></i>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight text-center px-4">Connecting to Battle Server...</h2>
                <p className="text-slate-500 text-center font-medium text-sm max-w-md leading-relaxed px-6">
                  Waking up the multiplayer engine. Because this is a high-performance socket server, it may take <strong className="text-rose-600">30 to 50 seconds</strong> to establish a connection on the first load. Get ready!
                </p>
              </div>
            )}

            {/* ACTUAL RENDER APP */}
            <iframe 
              src="https://quiz-battle.onrender.com/" 
              onLoad={() => setIframeLoaded(true)}
              className={`w-full flex-1 border-0 transition-opacity duration-1000 bg-white ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}
              allow="microphone; camera; display-capture"
            ></iframe>
          </div>
        </div>
      </main>
    </div>
  );
}