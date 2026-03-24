"use client";

import { useState, useEffect } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// List of all possible categories defined in the Admin panel
const CATEGORIES = ["GATE ECE", "GATE CS", "GATE EE", "GATE ME", "JEE Mains", "JEE Advanced"];

export default function PYQPracticePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState("GATE ECE");
  const [pyqMocks, setPyqMocks] = useState([]);
  const [isFetching, setIsFetching] = useState(false);

  // Fetch only the PYQs for the currently selected category
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

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;
  if (!isSignedIn) return <div className="p-10 text-center">Please log in.</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* STUDENT SIDEBAR */}
      <aside className="w-64 bg-indigo-950 text-white flex-col hidden md:flex shrink-0">
        <Link href="/onboarding?switch=true" className="p-6 text-2xl font-bold flex items-center gap-2 border-b border-indigo-900 hover:text-indigo-400 transition cursor-pointer block">
            <i className="fas fa-brain text-indigo-400"></i> SmartQAI
        </Link>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <Link href="/student" className="flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 p-3 rounded-lg transition">
                <i className="fas fa-home w-5"></i> Dashboard
            </Link>
            {/* THIS is the highlighted button for this page */}
            <Link href="/student/pyq" className="flex items-center gap-3 bg-indigo-800 text-white p-3 rounded-lg font-medium border-l-4 border-indigo-400 shadow-inner">
                <i className="fas fa-book-open w-5"></i> PYQ Practice
            </Link>
            <a href="#" className="flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 p-3 rounded-lg transition">
                <i className="fas fa-chart-pie w-5"></i> Analytics & Roadmaps
            </a>
            <a href="#" className="flex items-center gap-3 text-indigo-200 hover:bg-indigo-800 p-3 rounded-lg transition">
                <i className="fas fa-history w-5"></i> Past Results
            </a>
        </nav>
        
        <div className="p-4 border-t border-indigo-900 bg-indigo-900/30">
            <button onClick={() => router.push('/onboarding?switch=true')} className="w-full flex items-center gap-3 text-indigo-300 hover:text-white p-3 rounded-lg transition mb-2">
                <i className="fas fa-exchange-alt w-5"></i> Switch Role
            </button>
            <div className="flex items-center gap-3 p-3 bg-indigo-800/80 rounded-lg">
                <UserButton afterSignOutUrl="/" />
                <div className="text-sm font-medium truncate flex-1">{user?.fullName || "Account"}</div>
            </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-white shadow-sm p-6 z-10 sticky top-0 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-slate-800">Previous Year Questions</h1>
          <p className="text-sm text-slate-500 mt-1">Select an exam category to filter official past papers.</p>
        </header>

        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
          
          {/* CATEGORY SELECTOR TABS */}
          <div className="flex flex-wrap gap-3 mb-8">
            {CATEGORIES.map((cat) => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition shadow-sm border ${selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* PYQ GRID */}
          <div className="mt-4">
            {isFetching ? (
              <div className="py-20 text-center"><i className="fas fa-circle-notch fa-spin text-4xl text-indigo-400"></i></div>
            ) : pyqMocks.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
                <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center text-4xl mx-auto mb-4"><i className="fas fa-search"></i></div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">No PYQs Found</h3>
                <p className="text-slate-500">We haven't uploaded official past papers for {selectedCategory} yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pyqMocks.map((pyq) => (
                  <div key={pyq.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex-1">
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-rose-100 text-rose-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded">
                          <i className="fas fa-certificate mr-1"></i> Official
                        </span>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{pyq.examCategory}</span>
                      </div>
                      
                      <h3 className="font-bold text-slate-800 text-lg leading-tight mb-3">{pyq.title}</h3>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-1.5"><i className="fas fa-clock text-slate-400"></i> {pyq.duration} mins</div>
                        {pyq.allowCalculator && <div className="flex items-center gap-1.5"><i className="fas fa-calculator text-slate-400"></i> Calculator Allowed</div>}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-50">
                      <button 
                        onClick={() => router.push(`/student/exam/${pyq.id}`)}
                        className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/20"
                      >
                        Start Practice <i className="fas fa-play ml-1 text-xs"></i>
                      </button>
                    </div>
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