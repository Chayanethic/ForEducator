"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EducatorQuizPollPage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  
  // State for the Render iframe loading and Mobile Menu
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-circle-notch fa-spin text-5xl text-emerald-600"></i></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* RESPONSIVE EDUCATOR SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <Link href="/onboarding?switch=true" className="text-2xl font-bold flex items-center gap-2 hover:text-emerald-400 transition cursor-pointer tracking-tight">
              <i className="fas fa-chalkboard-teacher text-emerald-400"></i> SmartQAI
          </Link>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button onClick={() => router.push('/educator/create-mock')} className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-lg transition font-medium">
                <i className="fas fa-file-pdf w-5"></i> AI PDF Extractor
            </button>
            <button onClick={() => router.push('/educator/live-rooms')} className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-lg transition font-medium">
                <i className="fas fa-door-open w-5"></i> Live Rooms
            </button>
            {/* NEW: QUIZ POLL TAB (ACTIVE) */}
            <button onClick={() => router.push('/educator/quiz-poll')} className="w-full flex items-center gap-3 bg-slate-800 text-white p-3 rounded-lg font-medium border-l-4 border-emerald-500 shadow-sm">
                <i className="fas fa-bolt w-5 text-emerald-400"></i> Live Quiz Poll
            </button>
        </nav>
        
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800 shadow-inner">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Educator"} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700" />
                <div className="text-sm font-medium truncate flex-1 text-slate-300">{user?.fullName || "Account"}</div>
            </div>
            <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-600 hover:text-white p-2.5 rounded-lg transition text-sm font-bold border border-rose-900/50 hover:border-rose-500 bg-rose-950/20 shadow-sm">
                <i className="fas fa-sign-out-alt"></i> Log Out
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        
        {/* RESPONSIVE HEADER */}
        <header className="bg-white shadow-sm p-4 md:p-6 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-slate-600 hover:text-emerald-600 transition" onClick={() => setIsMobileMenuOpen(true)}>
              <i className="fas fa-bars text-2xl"></i>
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900">Real-Time Quiz Poll</h1>
              <p className="text-xs md:text-sm font-bold text-slate-500 mt-1 hidden sm:block">Host interactive live polls for your classroom.</p>
            </div>
          </div>
        </header>

        {/* IFRAME CONTAINER WITH LOADING OVERLAY */}
        <div className="flex-1 p-4 md:p-6 relative bg-slate-100 overflow-hidden">
          <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
            
            {/* RENDER WAKE-UP SPINNER (Emerald Theme) */}
            {!iframeLoaded && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white">
                <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                  <i className="fas fa-satellite-dish absolute inset-0 flex items-center justify-center text-3xl text-emerald-500 animate-pulse"></i>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight text-center px-4">Connecting to Poll Server...</h2>
                <p className="text-slate-500 text-center font-medium max-w-md leading-relaxed px-6">
                  Waking up the real-time polling engine. Because this is a high-performance socket server, it may take <strong className="text-emerald-600">30 to 50 seconds</strong> on the first load.
                </p>
              </div>
            )}

            {/* ACTUAL RENDER APP */}
            <iframe 
              src="https://quizpollquestion.onrender.com/" 
              onLoad={() => setIframeLoaded(true)}
              className={`w-full h-full border-0 transition-opacity duration-1000 ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}
              allow="microphone; camera; display-capture"
            ></iframe>
          </div>
        </div>
      </main>
    </div>
  );
}