"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ⚡ IMPORT GUEST BLOCKER ⚡
import GuestBlocker from "@/components/GuestBlocker";

const CATEGORIES = ["GATE ECE", "GATE CS", "GATE EE", "GATE ME", "JEE Mains", "JEE Advanced", "UPSC"];

export default function PYQPracticePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState("GATE ECE");
  const [pyqMocks, setPyqMocks] = useState([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchTargetPYQs = async () => {
      setIsFetching(true);
      
      // ⚡ GUEST MODE SIMULATION: Feed them dummy data so the page looks active and premium! ⚡
      if (!user) {
        setTimeout(() => {
          setPyqMocks([
            { id: "dummy-1", title: `${selectedCategory} 2023 Official Paper`, examCategory: selectedCategory, duration: 180, allowCalculator: true },
            { id: "dummy-2", title: `${selectedCategory} 2022 Official Paper`, examCategory: selectedCategory, duration: 180, allowCalculator: true },
            { id: "dummy-3", title: `${selectedCategory} 2021 Official Paper`, examCategory: selectedCategory, duration: 180, allowCalculator: true },
            { id: "dummy-4", title: `${selectedCategory} 2020 Official Paper`, examCategory: selectedCategory, duration: 180, allowCalculator: true },
          ]);
          setIsFetching(false);
        }, 800); // 0.8s fake loading delay for realism
        return;
      }

      // ⚡ REAL FIREBASE FETCH FOR LOGGED IN USERS ⚡
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

    if (isLoaded) fetchTargetPYQs(); 
  }, [selectedCategory, isLoaded, user]);

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-circle-notch fa-spin text-4xl text-indigo-600"></i></div>;

  return (
    // ⚡ Removed outer sidebars and fixed positioning to flow seamlessly inside layout.jsx ⚡
    <div className="flex flex-col relative overflow-hidden bg-slate-50 min-h-full">
      
      {/* HEADER */}
      <header className="bg-white shadow-sm p-4 md:p-6 flex justify-between items-center z-10 sticky top-0 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/student')} className="text-slate-400 hover:text-slate-700 transition-colors bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 shadow-sm md:hidden">
            <i className="fas fa-arrow-left text-xs"></i>
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">Previous Year Questions</h1>
            <p className="text-[10px] md:text-xs font-bold text-slate-500 hidden sm:block">Filter and practice official past papers.</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 pb-20">
        
        {/* CATEGORY SELECTOR */}
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

                  {/* ⚡ GUEST BLOCKER SECURING THE EXAM START ACTION ⚡ */}
                  <GuestBlocker role="student">
                    <button 
                      onClick={() => router.push(`/student/exam/${pyq.id}`)} 
                      className="w-full bg-slate-900 text-white border border-slate-800 py-2.5 rounded-lg text-xs font-black hover:bg-indigo-600 hover:border-indigo-600 transition shadow-sm flex items-center justify-center gap-2"
                    >
                      Start Practice <i className="fas fa-arrow-right"></i>
                    </button>
                  </GuestBlocker>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}