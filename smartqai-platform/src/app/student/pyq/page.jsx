"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const CATEGORIES = ["GATE ECE", "GATE CS", "GATE EE", "GATE ME", "JEE Mains", "JEE Advanced"];

export default function PYQPracticePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("GATE ECE");
  const [pyqMocks, setPyqMocks] = useState([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchTargetPYQs = async () => {
      setIsFetching(true);
      try {
        const mocksRef = collection(db, "mocks");
        const q = query(
          mocksRef, 
          where("isPYQ", "==", true),
          where("examCategory", "==", selectedCategory)
        );
        const snap = await getDocs(q);
        const fetchedPYQs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPyqMocks(fetchedPYQs);
      } catch (error) {
        console.error("Error fetching PYQs:", error);
      } finally {
        setIsFetching(false);
      }
    };

    if (isLoaded && isSignedIn) fetchTargetPYQs();
  }, [selectedCategory, isLoaded, isSignedIn]);

  const navigateTo = (path) => {
    setIsMobileMenuOpen(false);
    router.push(path);
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-circle-notch fa-spin text-4xl text-indigo-600"></i></div>;
  if (!isSignedIn) return <div className="p-10 text-center text-sm font-bold text-slate-500">Please log in to view PYQs.</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden">
      
      {/* MOBILE MENU OVERLAY */}
      {isMobileMenuOpen && ( <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} /> )}

      {/* STUDENT SIDEBAR (Matches Dashboard) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-indigo-950 text-white flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between p-5 border-b border-indigo-900">
          <Link href="/onboarding?switch=true" className="text-xl font-black flex items-center gap-2 hover:text-indigo-400 transition cursor-pointer tracking-tight">
              <i className="fas fa-book-open-reader text-emerald-400"></i> OZONE
          </Link>
          <button className="md:hidden text-indigo-300 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}><i className="fas fa-times text-lg"></i></button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            <button onClick={() => navigateTo('/student')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-home w-4"></i> Dashboard
            </button>
            
            {/* ACTIVE STATE FOR PYQ */}
            <button onClick={() => navigateTo('/student/pyq')} className="w-full flex items-center text-left gap-3 bg-indigo-800 text-white p-2.5 rounded-xl text-sm font-bold border-l-4 border-indigo-400 shadow-inner">
                <i className="fas fa-book-open w-4"></i> PYQ Practice
            </button>
            
            <button onClick={() => navigateTo('/student/planner')} className="w-full flex items-center text-left gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-calendar-check w-4"></i> Study Planner
            </button>
            <button onClick={() => {router.push('/student/quiz-battle'); setIsMobileMenuOpen(false);}} className="w-full flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 hover:text-white p-2.5 rounded-xl text-sm font-bold transition group">
                <i className="fas fa-gamepad w-4 text-rose-400 group-hover:animate-bounce"></i> Quiz Battle
            </button>
        </nav>
        
        <div className="p-3 border-t border-indigo-900 bg-indigo-900/30 space-y-1.5">
            <div className="flex items-center gap-2.5 p-2.5 bg-indigo-950/50 rounded-xl border border-indigo-800/50 shadow-inner">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=User"} alt="Avatar" className="w-7 h-7 rounded-full border border-indigo-700" />
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
      <main className="flex-1 flex flex-col overflow-y-auto w-full bg-slate-50">
        
        {/* RESPONSIVE HEADER */}
        <header className="bg-white shadow-sm p-4 md:p-5 flex justify-between items-center z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-slate-600 hover:text-indigo-600 transition" onClick={() => setIsMobileMenuOpen(true)}>
              <i className="fas fa-bars text-xl"></i>
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-800">Previous Year Questions</h1>
              <p className="text-[10px] md:text-xs font-bold text-slate-500 hidden sm:block">Filter and practice official past papers.</p>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* CATEGORY SELECTOR (Matches Dashboard styling) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-sm font-black text-slate-900 tracking-tight"><i className="fas fa-filter text-indigo-500 mr-1.5"></i> Filter by Target Exam</h2>
            <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {CATEGORIES.map((cat) => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-black transition border ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* PYQ GRID */}
          <div>
            {isFetching ? (
              <div className="py-20 text-center"><i className="fas fa-circle-notch fa-spin text-3xl text-indigo-400"></i></div>
            ) : pyqMocks.length === 0 ? (
              <div className="bg-white p-12 rounded-[1.5rem] border border-slate-200 text-center text-slate-500 shadow-sm max-w-2xl mx-auto mt-8">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                  <i className="fas fa-search text-2xl text-slate-400"></i>
                </div>
                <h3 className="text-base font-black text-slate-800 mb-1">No Official Papers Found</h3>
                <p className="font-medium text-xs">We haven't uploaded official PYQs for <strong className="text-indigo-600">{selectedCategory}</strong> yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {pyqMocks.map((pyq) => (
                  <div key={pyq.id} className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all flex flex-col h-full relative overflow-hidden group">
                    
                    {/* Official Badge */}
                    <div className="absolute top-3 right-3 bg-rose-50 text-rose-600 text-[9px] uppercase font-black px-2 py-0.5 rounded shadow-sm border border-rose-100 flex items-center gap-1">
                      <i className="fas fa-star text-rose-500"></i> Official
                    </div>

                    <div className="flex-1 mt-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-indigo-50 text-indigo-700 text-[9px] uppercase tracking-widest font-black px-2 py-0.5 rounded border border-indigo-100">
                          {pyq.examCategory}
                        </span>
                      </div>
                      
                      <h3 className="font-black text-slate-900 text-sm mb-2 leading-tight pr-14 group-hover:text-indigo-600 transition-colors">{pyq.title}</h3>
                      
                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-slate-500 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-3">
                        <div className="flex items-center gap-1"><i className="fas fa-clock text-indigo-400"></i> {pyq.duration} mins</div>
                        {pyq.allowCalculator && <div className="flex items-center gap-1"><i className="fas fa-calculator text-emerald-500"></i> Calc Allowed</div>}
                      </div>
                    </div>

                    <button 
                      onClick={() => router.push(`/student/exam/${pyq.id}`)} 
                      className="w-full bg-slate-900 text-white border border-slate-800 py-2.5 rounded-lg text-xs font-black hover:bg-indigo-600 hover:border-indigo-600 transition shadow-sm flex items-center justify-center gap-2"
                    >
                      Start Practice <i className="fas fa-arrow-right"></i>
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