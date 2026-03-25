"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function QuizBattlePage() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  
  // State to track if the Render app has finished waking up and loading
  const [iframeLoaded, setIframeLoaded] = useState(false);

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* STUDENT SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex shrink-0">
        <Link href="/onboarding?switch=true" className="p-6 text-2xl font-black flex items-center gap-2 border-b border-slate-800 hover:text-indigo-400 transition cursor-pointer block tracking-tight">
            <i className="fas fa-brain text-indigo-500"></i> SmartQAI
        </Link>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button onClick={() => router.push('/student')} className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-lg font-bold transition">
                <i className="fas fa-home w-5"></i> Dashboard
            </button>
            <button onClick={() => router.push('/student/live-rooms')} className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-lg font-bold transition">
                <i className="fas fa-door-open w-5"></i> Live Exams
            </button>
            {/* NEW QUIZ BATTLE ACTIVE BUTTON */}
            <button onClick={() => router.push('/student/quiz-battle')} className="w-full flex items-center gap-3 bg-slate-800 text-white p-3 rounded-lg font-bold border-l-4 border-indigo-500 shadow-sm">
                <i className="fas fa-gamepad w-5 text-indigo-400"></i> Quiz Battle
            </button>
        </nav>
        
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-2">
            <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800 shadow-inner">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Student"} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700" />
                <div className="text-sm font-bold truncate flex-1 text-slate-300">{user?.fullName || "Student"}</div>
            </div>
            <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-600 hover:text-white p-2.5 rounded-lg transition text-sm font-bold border border-rose-900/50 hover:border-rose-500 bg-rose-950/20 shadow-sm">
                <i className="fas fa-sign-out-alt"></i> Log Out
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white shadow-sm p-6 flex justify-between items-center z-10 shrink-0">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Multiplayer Battle Arena</h1>
            <p className="text-sm font-bold text-slate-500 mt-1">Challenge your friends in real-time.</p>
          </div>
        </header>

        {/* IFRAME CONTAINER WITH LOADING OVERLAY */}
        <div className="flex-1 p-6 relative bg-slate-100">
          <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-white">
            
            {/* RENDER WAKE-UP SPINNER */}
            {!iframeLoaded && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white">
                <div className="relative w-24 h-24 mb-8">
                  <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                  <i className="fas fa-satellite-dish absolute inset-0 flex items-center justify-center text-3xl text-indigo-500 animate-pulse"></i>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Connecting to Battle Server...</h2>
                <p className="text-slate-500 text-center font-medium max-w-md leading-relaxed px-4">
                  Waking up the multiplayer engine. Because this is a high-performance socket server, it may take <strong className="text-indigo-600">30 to 50 seconds</strong> to establish a connection on the first load. Get ready!
                </p>
              </div>
            )}

            {/* ACTUAL RENDER APP */}
            <iframe 
              src="https://quiz-battle.onrender.com/" 
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