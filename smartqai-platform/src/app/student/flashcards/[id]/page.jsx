"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation"; 

import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

export default function FlashcardPlayer() {
  const params = useParams(); 
  const deckId = params?.id;  
  const router = useRouter();

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Study State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const fetchDeckAndCards = async () => {
      if (!deckId) return; 
      
      try {
        const deckRef = doc(db, "flashcard_decks", deckId);
        const deckSnap = await getDoc(deckRef);
        
        if (!deckSnap.exists()) {
          setError("Deck not found. It may have been deleted.");
          setIsLoading(false);
          return;
        }
        setDeck({ id: deckSnap.id, ...deckSnap.data() });

        const cardsRef = collection(db, "flashcard_decks", deckId, "cards");
        const q = query(cardsRef, orderBy("order", "asc"));
        const cardsSnap = await getDocs(q);
        
        const fetchedCards = cardsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCards(fetchedCards);

      } catch (err) {
        console.error("Error fetching deck:", err);
        setError("Failed to load flashcards.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeckAndCards();
  }, [deckId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isLoading || cards.length === 0) return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, cards.length, currentIndex]);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev - 1), 150);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full bg-[#FAFAFA] flex flex-col items-center justify-center">
        <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-6">
          <i className="fas fa-circle-notch fa-spin text-xl text-indigo-500"></i>
        </div>
        <p className="text-slate-400 font-semibold tracking-widest uppercase text-[10px]">Initializing Deck</p>
      </div>
    );
  }

  if (error || cards.length === 0) {
    return (
      <div className="h-full bg-[#FAFAFA] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-3xl p-10 md:p-12 shadow-sm border border-slate-200/60 max-w-md w-full flex flex-col items-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-2xl mb-6 shadow-inner border border-rose-100/50">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">{error || "No cards found in this deck."}</h2>
          <p className="text-slate-500 font-medium mb-8 text-sm">Please generate a new deck to continue studying.</p>
          <button onClick={() => router.push('/student/flashcard-generator')} className="w-full bg-slate-900 text-white px-6 py-3.5 rounded-xl font-semibold hover:bg-indigo-600 transition-all shadow-sm flex items-center justify-center gap-2 text-sm">
            <i className="fas fa-arrow-left"></i> Return to Generator
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercentage = ((currentIndex + 1) / cards.length) * 100;

  return (
    // ⚡ Removed min-h-screen to fit into layout ⚡
    <div className="flex flex-col h-full bg-[#FAFAFA] font-sans relative overflow-hidden text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Refined Ambient Background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none mix-blend-overlay z-0"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100/30 via-[#FAFAFA] to-[#FAFAFA] pointer-events-none z-0"></div>

      {/* Sleek Header */}
      <header className="relative z-20 px-6 md:px-8 py-6 flex justify-between items-center max-w-5xl mx-auto w-full shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/student/flashcard-generator" className="group flex items-center justify-center w-9 h-9 rounded-full bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-sm text-slate-400 hover:text-slate-700">
            <i className="fas fa-arrow-left text-xs"></i>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-slate-800 tracking-tight truncate max-w-[200px] md:max-w-md">{deck?.title || "Study Deck"}</h1>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{deck?.mode}</span>
               <span className="text-slate-300 text-[10px]">•</span>
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{deck?.difficulty}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Micro-Progress Bar */}
      <div className="w-full max-w-5xl mx-auto px-6 md:px-8 relative z-20 mb-2 shrink-0">
        <div className="w-full h-1 bg-slate-200/60 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Scrollable Main Area */}
      <main className="flex-1 overflow-y-auto px-4 pb-32 pt-6 flex flex-col items-center justify-center relative z-10">
        
        {/* PREMIUM 3D FLIP CONTAINER */}
        <div className="w-full max-w-3xl aspect-[4/3] md:aspect-[3/2] perspective-1000 group cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
          <div 
            className="relative w-full h-full duration-500 transition-transform" 
            style={{ 
              transformStyle: "preserve-3d", 
              transform: isFlipped ? "rotateX(180deg)" : "rotateX(0deg)" 
            }}
          >
            
            {/* FRONT OF CARD (Question) */}
            <div 
              className="absolute w-full h-full bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-200/80 p-8 md:p-12 flex flex-col items-center justify-center text-center overflow-y-auto"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="absolute top-6 left-6 w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center border border-slate-100">
                <i className="fas fa-question text-sm"></i>
              </div>
              
              <div className="prose prose-slate max-w-none">
                <h2 className="text-xl md:text-2xl font-semibold text-slate-700 leading-relaxed md:leading-relaxed max-w-2xl px-2">
                  <Latex>{currentCard.front}</Latex>
                </h2>
              </div>
              
              <div className="absolute bottom-6 text-[10px] font-semibold text-slate-400 flex items-center gap-2 transition-opacity opacity-50 group-hover:opacity-100">
                Click to flip <i className="fas fa-undo"></i>
              </div>
            </div>

            {/* BACK OF CARD (Answer) */}
            <div 
              className="absolute w-full h-full bg-gradient-to-br from-indigo-50/40 to-white rounded-3xl shadow-[0_4px_20px_rgb(79,70,229,0.04)] border border-indigo-100/60 p-8 md:p-12 flex flex-col items-center justify-center text-center overflow-y-auto"
              style={{ 
                backfaceVisibility: "hidden", 
                transform: "rotateX(180deg)" 
              }}
            >
              <div className="absolute top-6 left-6 w-8 h-8 bg-indigo-50 text-indigo-400 rounded-lg flex items-center justify-center border border-indigo-100/50">
                <i className="fas fa-lightbulb text-sm"></i>
              </div>
              
              <div className="prose prose-slate max-w-none">
                <h2 className="text-lg md:text-xl font-medium text-slate-700 leading-relaxed md:leading-relaxed max-w-2xl px-2">
                  <Latex>{currentCard.back}</Latex>
                </h2>
              </div>
            </div>

          </div>
        </div>

        {/* Floating Desktop Keyboard Hints */}
        <div className="hidden sm:flex mt-8 items-center gap-8 opacity-50">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <kbd className="bg-white border border-slate-200 shadow-sm rounded-md px-1.5 py-0.5 font-mono text-[10px] text-slate-600">←</kbd> Prev
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <kbd className="bg-white border border-slate-200 shadow-sm rounded-md px-2 py-0.5 font-mono text-[10px] text-slate-600">Space</kbd> Flip
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <kbd className="bg-white border border-slate-200 shadow-sm rounded-md px-1.5 py-0.5 font-mono text-[10px] text-slate-600">→</kbd> Next
          </div>
        </div>

      </main>

      {/* FLOATING GLASSMORPHIC CONTROL DOCK */}
      {/* ⚡ Adjusted z-index to stay above main content but below modals ⚡ */}
      <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-40 w-full max-w-[320px] px-4 pointer-events-none">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/80 p-1.5 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex items-center justify-between pointer-events-auto">
          
          <button 
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
            disabled={currentIndex === 0}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <i className="fas fa-chevron-left text-sm"></i>
          </button>

          <div 
            className="flex flex-col items-center justify-center flex-1 px-2 cursor-pointer group" 
            onClick={(e) => { e.stopPropagation(); setIsFlipped(!isFlipped); }}
          >
            <span className="text-[10px] font-bold text-slate-400 mb-0.5 tracking-widest uppercase">
              {currentIndex + 1} / {cards.length}
            </span>
            <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-800 transition-colors">
              {isFlipped ? "Show Question" : "Show Answer"}
            </span>
          </div>

          <button 
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
            disabled={currentIndex === cards.length - 1}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <i className="fas fa-chevron-right text-sm"></i>
          </button>

        </div>
      </div>

    </div>
  );
}