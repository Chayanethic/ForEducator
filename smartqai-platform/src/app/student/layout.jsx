"use client";

import { useUser, UserButton, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

export default function StudentLayout({ children }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <i className="fas fa-circle-notch fa-spin text-4xl text-indigo-500"></i>
      </div>
    );
  }

  const NavLinks = () => (
    <>
      <Link href="/student" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors ${pathname === '/student' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
        <i className={`fas fa-home w-4 ${pathname === '/student' ? 'text-indigo-600' : ''}`}></i> Dashboard
      </Link>
      <Link href="/student/join-room" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors ${pathname === '/student/join-room' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
        <i className={`fas fa-door-open w-4 ${pathname === '/student/join-room' ? 'text-indigo-600' : ''}`}></i> Join Arena
      </Link>
      <Link href="/student/analytics" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors ${pathname === '/student/analytics' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
        <i className={`fas fa-chart-line w-4 ${pathname === '/student/analytics' ? 'text-indigo-600' : ''}`}></i> My Scorecards
      </Link>
      
      <div className="pt-3 pb-1">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">AI & Practice</span>
      </div>

      <Link href="/student/examgenerateusingai" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors group ${pathname === '/student/examgenerateusingai' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
        <i className={`fas fa-brain w-4 text-fuchsia-500 ${pathname !== '/student/examgenerateusingai' && 'group-hover:animate-pulse'}`}></i> AI Exam Generator
        <span className="ml-auto bg-fuchsia-100 text-fuchsia-600 border border-fuchsia-200 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">New</span>
      </Link>
      
      <Link href="/student/flashcard-generator" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors group ${pathname === '/student/flashcard-generator' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
        <i className={`fas fa-bolt w-4 text-amber-500 ${pathname !== '/student/flashcard-generator' && 'group-hover:animate-pulse'}`}></i> Smart Flashcards
        <span className="ml-auto bg-amber-100 text-amber-600 border border-amber-200 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">New</span>
      </Link>
      
      <Link id="tour-sidebar-pyq" href="/student/pyq" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors ${pathname === '/student/pyq' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
        <i className={`fas fa-book-open w-4 ${pathname === '/student/pyq' ? 'text-indigo-600' : ''}`}></i> PYQ Practice
      </Link>

      <Link id="tour-sidebar-planner" href="/student/planner" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors ${pathname === '/student/planner' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
        <i className={`fas fa-calendar-check w-4 ${pathname === '/student/planner' ? 'text-indigo-600' : ''}`}></i> Study Planner
      </Link>

      <div className="pt-3 pb-1">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3">Live Multiplayer</span>
      </div>

      <Link href="/student/quiz-poll" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors group ${pathname === '/student/quiz-poll' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
        <i className={`fas fa-satellite-dish w-4 text-teal-500 ${pathname !== '/student/quiz-poll' && 'group-hover:animate-pulse'}`}></i> Live Quiz Poll
        <span className="ml-auto bg-teal-100 text-teal-600 border border-teal-200 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Live</span>
      </Link>

      <Link id="tour-sidebar-quiz" href="/student/quiz-battle" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors group ${pathname === '/student/quiz-battle' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
        <i className={`fas fa-gamepad w-4 text-rose-500 ${pathname !== '/student/quiz-battle' && 'group-hover:animate-bounce'}`}></i> Quiz Battle
      </Link>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <Link href="/" className="text-xl font-black flex items-center gap-2 text-slate-900 tracking-tight">
            <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm shadow-md shadow-indigo-600/20">
              <i className="fas fa-book-open-reader"></i>
            </div>
            OZONE
          </Link>
          <button className="md:hidden text-slate-400 hover:text-slate-900" onClick={() => setIsMobileMenuOpen(false)}>
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* --- BOTTOM PROFILE / ACTIONS SECTION --- */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-1.5">
          {isSignedIn ? (
            <>
              <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                <UserButton afterSignOutUrl="/" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</span>
                  <span className="text-[10px] text-slate-500 truncate">{user?.primaryEmailAddress?.emailAddress}</span>
                </div>
              </div>
              <button onClick={() => router.push('/onboarding?switch=true')} className="w-full flex items-center justify-center gap-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900 p-2 rounded-xl transition text-xs font-bold border border-transparent hover:border-slate-300 shadow-sm mt-2">
                  <i className="fas fa-exchange-alt"></i> Switch Role
              </button>
              <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-500 hover:bg-rose-500 hover:text-white p-2 rounded-xl transition text-xs font-bold border border-rose-200 hover:border-rose-500 bg-rose-50 shadow-sm">
                  <i className="fas fa-sign-out-alt"></i> Log Out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <i className="fas fa-user-secret"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-900">Guest Mode</span>
                  <span className="text-[10px] text-indigo-500">View Only</span>
                </div>
              </div>
              <button onClick={() => router.push('/sign-in?role=student')} className="w-full bg-indigo-600 text-white text-xs font-black py-2.5 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20">
                Sign In to Unlock
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 z-20 shadow-sm">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 hover:text-indigo-600 transition">
            <i className="fas fa-bars text-xl"></i>
          </button>
          <span className="font-black text-slate-800 tracking-tight">Student Portal</span>
          {isSignedIn ? <UserButton afterSignOutUrl="/" /> : <div className="w-8"></div>}
        </header>

        {/* This is where your page.jsx content will be injected automatically! */}
        <main className="flex-1 overflow-y-auto relative">
          {children}
        </main>
      </div>

    </div>
  );
}