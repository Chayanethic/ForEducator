"use client";

import { useUser, UserButton, OrganizationSwitcher, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

export default function EducatorLayout({ children }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Safely wait for Clerk to load, but DO NOT block guests!
  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <i className="fas fa-circle-notch fa-spin text-4xl text-emerald-500"></i>
      </div>
    );
  }

  // ⚡ FIX: Use router.push() to prevent Next.js from prefetching protected routes in Guest Mode!
  const navigateTo = (path) => {
    setIsMobileMenuOpen(false);
    router.push(path);
  };

  const NavLinks = () => (
    <>
      <button onClick={() => navigateTo('/educator/dashboard')} className={`w-full text-left flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-colors ${pathname === '/educator/dashboard' ? 'bg-indigo-800 text-white border-l-4 border-emerald-400 shadow-inner' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}>
        <i className="fas fa-home w-4"></i> Dashboard
      </button>
      
      <button onClick={() => navigateTo('/educator/create-mock')} className={`w-full text-left flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-colors ${pathname === '/educator/create-mock' ? 'bg-indigo-800 text-white border-l-4 border-emerald-400 shadow-inner' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}>
        <i className="fas fa-file-pdf w-4"></i> Exam Studio
      </button>
      
      <button onClick={() => navigateTo('/educator/live-rooms')} className={`w-full text-left flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-colors ${pathname.includes('/educator/live-rooms') ? 'bg-indigo-800 text-white border-l-4 border-emerald-400 shadow-inner' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}>
        <i className="fas fa-door-open w-4"></i> Live Rooms
      </button>
      
      <button onClick={() => navigateTo('/educator/exam-generator')} className={`w-full text-left flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-colors group ${pathname === '/educator/exam-generator' ? 'bg-indigo-800 text-white border-l-4 border-emerald-400 shadow-inner' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}>
        <i className={`fas fa-brain w-4 text-fuchsia-400 ${pathname !== '/educator/exam-generator' && 'group-hover:animate-pulse'}`}></i> AI Exam Generator
        <span className="ml-auto bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">New</span>
      </button>
      
      <button onClick={() => navigateTo('/educator/quiz-poll')} className={`w-full text-left flex items-center gap-3 p-3 rounded-xl text-sm font-bold transition-colors ${pathname === '/educator/quiz-poll' ? 'bg-indigo-800 text-white border-l-4 border-emerald-400 shadow-inner' : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`}>
        <i className="fas fa-bolt w-4"></i> Live Quiz Poll
      </button>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-950 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        
        <div className="flex items-center justify-between p-5 border-b border-indigo-900">
          <Link href="/" className="text-xl font-black flex items-center gap-2 hover:text-emerald-400 transition cursor-pointer tracking-tight">
            <i className="fas fa-book-open-reader text-emerald-400"></i> OZONE
          </Link>
          <button className="md:hidden text-indigo-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto custom-scrollbar">
          <NavLinks />
        </nav>

        {/* --- BOTTOM PROFILE / ACTIONS SECTION --- */}
        <div className="p-3 border-t border-indigo-900 bg-indigo-950/50 space-y-1.5">
          {isSignedIn ? (
            <>
              {/* Organization Switcher safely wrapped! */}
              <div className="bg-indigo-900/50 rounded-xl p-1 border border-indigo-800/50 mb-3">
                <OrganizationSwitcher 
                  hidePersonal={true}
                  appearance={{ elements: { rootBox: "w-full flex justify-center", organizationPreviewTextContainer: "text-white" } }}
                />
              </div>
              <div className="flex items-center gap-3 bg-indigo-900 p-2.5 rounded-xl border border-indigo-800">
                <UserButton afterSignOutUrl="/" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold text-white truncate">{user?.fullName}</span>
                  <span className="text-[10px] text-indigo-300 truncate">{user?.primaryEmailAddress?.emailAddress}</span>
                </div>
              </div>
              <button onClick={() => router.push('/onboarding?switch=true')} className="w-full flex items-center justify-center gap-2 text-indigo-300 hover:bg-indigo-800 hover:text-white p-2 rounded-xl transition text-xs font-bold border border-transparent hover:border-indigo-700 shadow-sm mt-2">
                  <i className="fas fa-exchange-alt"></i> Switch Role
              </button>
              <button onClick={() => signOut({ redirectUrl: '/' })} className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-600 hover:text-white p-2 rounded-xl transition text-xs font-bold border border-rose-900/50 hover:border-rose-500 bg-rose-950/20 shadow-sm">
                  <i className="fas fa-sign-out-alt"></i> Log Out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-indigo-900 p-3 rounded-xl border border-indigo-800">
                <div className="w-8 h-8 rounded-full bg-indigo-800 flex items-center justify-center text-indigo-300">
                  <i className="fas fa-user-secret"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">Guest Mode</span>
                  <span className="text-[10px] text-emerald-400">View Only</span>
                </div>
              </div>
              <button onClick={() => router.push('/sign-in?role=educator')} className="w-full bg-emerald-500 text-white text-xs font-black py-2.5 rounded-xl hover:bg-emerald-400 transition shadow-md">
                Sign In to Unlock
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header (Only visible on small screens) */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 z-20">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 hover:text-indigo-600 transition">
            <i className="fas fa-bars text-xl"></i>
          </button>
          <span className="font-black text-slate-800 tracking-tight">Educator Studio</span>
          <div className="w-6"></div> {/* Spacer for centering */}
        </header>

        {/* This is where your page.jsx content will be injected automatically! */}
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          {children}
        </main>
      </div>

    </div>
  );
}