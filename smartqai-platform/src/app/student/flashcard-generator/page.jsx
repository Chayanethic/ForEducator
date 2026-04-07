"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const LOADING_STEPS = {
  topic: [
    "Connecting to Gemini 2.5 Flash...",
    "Mapping conceptual boundaries...",
    "Extracting key definitions...",
    "Synthesizing flashcard deck..."
  ],
  pdf: [
    "Uploading document securely...",
    "Extracting text from pages...",
    "Running contextual AI analysis...",
    "Generating flashcard pairs..."
  ],
  youtube: [
    "Fetching YouTube transcript...",
    "Summarizing core concepts...",
    "Isolating learning objectives...",
    "Formatting into active recall cards..."
  ]
};

export default function FlashcardGenerator() {
  const { user } = useUser();
  const router = useRouter();

  // --- FORM STATE ---
  const [inputMode, setInputMode] = useState("topic"); 
  
  const [topic, setTopic] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [pdfFile, setPdfFile] = useState(null);

  const [difficulty, setDifficulty] = useState("Intermediate");
  const [numCards, setNumCards] = useState(15);
  const [isCustomCards, setIsCustomCards] = useState(false);
  
  // --- ENGINE STATE ---
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [generatedDeck, setGeneratedDeck] = useState(null);
  const [error, setError] = useState("");

  // --- DECKS STATE (Updated for "Show More" functionality) ---
  const [allDecks, setAllDecks] = useState([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);

  useEffect(() => {
    const fetchRecentDecks = async () => {
      if (!user?.id) return;
      try {
        const decksRef = collection(db, "flashcard_decks");
        const qDecks = query(decksRef, where("studentId", "==", user.id));
        const decksSnap = await getDocs(qDecks);
        
        let fetchedDecks = decksSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdDate: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now())
          };
        });

        fetchedDecks.sort((a, b) => b.createdDate - a.createdDate);
        setAllDecks(fetchedDecks); // Store all fetched decks
      } catch (error) {
        console.error("Error fetching recent decks:", error);
      } finally {
        setIsLoadingDecks(false);
      }
    };

    fetchRecentDecks();
  }, [user?.id]);

  useEffect(() => {
    let interval;
    if (isGenerating) {
      const steps = LOADING_STEPS[inputMode];
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
      }, 2000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating, inputMode]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setError("");
    } else {
      setError("Please upload a valid PDF file.");
      setPdfFile(null);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    
    if (inputMode === "topic" && !topic.trim()) return setError("Please enter a topic.");
    if (inputMode === "youtube" && !youtubeUrl.trim()) return setError("Please enter a YouTube URL.");
    if (inputMode === "pdf" && !pdfFile) return setError("Please upload a PDF document.");
    if (numCards < 5 || numCards > 100) return setError("Please select between 5 and 100 cards.");
    
    setIsGenerating(true);
    setError("");
    setGeneratedDeck(null);

    try {
      const payload = new FormData();
      payload.append("mode", inputMode);
      payload.append("difficulty", difficulty);
      payload.append("numCards", numCards);
      payload.append("studentId", user?.id || "anonymous");

      if (inputMode === "topic") payload.append("topic", topic.trim());
      if (inputMode === "youtube") payload.append("youtubeUrl", youtubeUrl.trim());
      if (inputMode === "pdf") {
        payload.append("file", pdfFile);
      }

      const res = await fetch("/api/generate-flashcards", { 
        method: "POST", 
        body: payload 
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate flashcards.");
      }
      
      const newDeckObj = {
        id: data.deckId, 
        title: data.title,
        count: data.count
      };

      setGeneratedDeck(newDeckObj);

      // Add the newly generated deck to the top of the list
      setAllDecks(prev => [
        { id: data.deckId, title: data.title, cardCount: data.count, mode: inputMode, difficulty: difficulty, createdDate: new Date() },
        ...prev
      ]);

    } catch (err) {
      setError(err.message || "Failed to generate flashcards.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans flex flex-col overflow-hidden relative text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Subtle Background */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] pointer-events-none mix-blend-overlay"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/50 via-[#FAFAFA] to-[#FAFAFA] pointer-events-none"></div>

      {/* Minimal Header */}
      <header className="relative z-20 px-6 md:px-10 py-6 flex justify-between items-center max-w-[1400px] mx-auto w-full">
        <Link href="/student" className="group flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:border-slate-300 transition-colors shadow-sm text-slate-400 group-hover:text-slate-700">
            <i className="fas fa-arrow-left text-[10px]"></i>
          </div>
          Dashboard
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto px-4 md:px-10 pb-20 flex flex-col items-center relative z-10">
        
        {/* MAIN WORKSPACE */}
        <div className="max-w-[1100px] w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* =========================================
              LEFT COLUMN: FORM CONFIGURATOR
          ========================================= */}
          <div className="w-full lg:col-span-7 flex flex-col">
            
            {!generatedDeck && (
              <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100/60 text-indigo-600 text-[10px] font-bold uppercase tracking-wider mb-4 shadow-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div> Gemini 2.5 Flash
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-2">
                  Create study flashcards
                </h1>
                <p className="text-slate-500 text-sm leading-relaxed max-w-sm font-medium">
                  Turn your topics, PDFs, or YouTube videos into a custom active recall deck in seconds.
                </p>
              </div>
            )}

            {generatedDeck ? (
              <div className="bg-white rounded-2xl p-8 md:p-10 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-200/60 animate-in zoom-in-95 duration-500 text-center relative overflow-hidden mt-6">
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400"></div>
                <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-xl mx-auto mb-5 border border-emerald-100">
                  <i className="fas fa-check"></i>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Deck Ready</h3>
                <p className="text-slate-500 font-medium mb-8 text-xs">
                  Generated <strong className="text-slate-800">{generatedDeck.count} cards</strong> for "{generatedDeck.title}".
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={() => router.push(`/student/flashcards/${generatedDeck.id}`)}
                    className="flex-1 bg-slate-900 text-white py-3 px-5 rounded-xl text-sm font-semibold hover:bg-indigo-600 transition-all shadow-md hover:-translate-y-0.5 flex justify-center items-center gap-2"
                  >
                    Open Player <i className="fas fa-play text-[10px]"></i>
                  </button>
                  <button 
                    onClick={() => setGeneratedDeck(null)}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 py-3 px-5 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-300 transition-colors flex justify-center items-center gap-2"
                  >
                    Create Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="space-y-6 animate-in fade-in duration-700 delay-150 fill-mode-both">
                
                {/* COMPACT SEGMENTED CONTROL */}
                <div className="bg-white p-1 rounded-xl flex gap-1 border border-slate-200 shadow-sm max-w-sm">
                  {[
                    { id: 'topic', icon: 'fa-align-left', label: 'Topic' },
                    { id: 'pdf', icon: 'fa-file-pdf', label: 'PDF' },
                    { id: 'youtube', icon: 'fa-youtube', label: 'YouTube' }
                  ].map((mode) => (
                    <button 
                      key={mode.id}
                      type="button" 
                      onClick={() => setInputMode(mode.id)} 
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 relative z-10
                        ${inputMode === mode.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                    >
                      <i className={`fas ${mode.icon} ${inputMode === mode.id && mode.id === 'youtube' ? 'text-red-500' : inputMode === mode.id ? 'text-indigo-400' : 'text-slate-400'}`}></i> 
                      {mode.label}
                    </button>
                  ))}
                </div>

                {/* DYNAMIC INPUT AREA */}
                <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200 transition-all duration-300">
                  <label className="text-xs font-bold text-slate-700 block mb-3 uppercase tracking-wider">
                    {inputMode === 'topic' ? 'Target Concept' : inputMode === 'pdf' ? 'Source Document' : 'Video Link'}
                  </label>
                  
                  {inputMode === 'topic' && (
                    <input 
                      type="text" 
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      disabled={isGenerating}
                      placeholder="e.g., Cellular Respiration..."
                      className="w-full bg-slate-50/50 border border-slate-200 py-3 px-4 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all disabled:opacity-50"
                    />
                  )}

                  {inputMode === 'pdf' && (
                    <div className="bg-slate-50/50 border border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-indigo-50/50 hover:border-indigo-300 transition-colors cursor-pointer relative group">
                      <input 
                        type="file" 
                        accept=".pdf" 
                        onChange={handleFileChange}
                        disabled={isGenerating}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                      />
                      <div className="w-10 h-10 bg-white shadow-sm border border-slate-200 text-slate-500 rounded-lg flex items-center justify-center text-sm mx-auto mb-3 group-hover:text-indigo-600 transition-colors">
                        <i className="fas fa-file-upload"></i>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 mb-0.5">
                        {pdfFile ? pdfFile.name : "Select or drop a PDF"}
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">
                        {pdfFile ? `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB attached` : "Supports up to 20MB"}
                      </p>
                    </div>
                  )}

                  {inputMode === 'youtube' && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <i className="fab fa-youtube text-red-500 text-lg drop-shadow-sm"></i>
                      </div>
                      <input 
                        type="url" 
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        disabled={isGenerating}
                        placeholder="https://youtube.com/watch?v=..."
                        className="w-full bg-slate-50/50 border border-slate-200 py-3 pl-11 pr-4 rounded-xl text-sm font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-500/10 transition-all disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>

                {/* PARAMETERS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Depth Control */}
                  <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200">
                    <label className="text-xs font-bold text-slate-700 block mb-3 uppercase tracking-wider">Complexity</label>
                    <div className="flex flex-col gap-2">
                      {["Basic", "Intermediate", "Advanced"].map((level) => (
                        <button
                          key={level}
                          type="button"
                          disabled={isGenerating}
                          onClick={() => setDifficulty(level)}
                          className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 border text-left flex justify-between items-center disabled:opacity-50
                            ${difficulty === level ? "border-indigo-500 bg-indigo-50/50 text-indigo-700" : "border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
                        >
                          {level}
                          {difficulty === level && <i className="fas fa-check-circle text-indigo-500"></i>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Count Control */}
                  <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-slate-200 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Deck Size</label>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{numCards} Cards</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      {[10, 20, 30, 50].map(num => (
                        <button
                          key={num}
                          type="button"
                          disabled={isGenerating}
                          onClick={() => { setNumCards(num); setIsCustomCards(false); }}
                          className={`py-2 rounded-lg border text-xs font-semibold transition-all
                            ${numCards === num && !isCustomCards ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <input 
                      type="number"
                      min="5" max="100"
                      value={isCustomCards ? numCards : ""}
                      onChange={(e) => {
                        setIsCustomCards(true);
                        setNumCards(e.target.value === "" ? "" : Number(e.target.value));
                      }}
                      disabled={isGenerating}
                      placeholder="Custom Amount"
                      className={`w-full text-center py-2.5 rounded-lg border text-xs font-semibold outline-none transition-all mt-auto
                        ${isCustomCards ? 'border-slate-900 bg-slate-900 text-white placeholder-slate-400' : 'border-slate-200 bg-slate-50/50 text-slate-600 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10'}`}
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 border border-rose-200/50 animate-in fade-in">
                    <i className="fas fa-exclamation-circle"></i> {error}
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-1">
                  <button 
                    type="submit" 
                    disabled={isGenerating}
                    className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-[0_4px_14px_0_rgb(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex justify-center items-center gap-2 group"
                  >
                    {isGenerating ? (
                      <><i className="fas fa-circle-notch fa-spin text-white/70"></i> Generating Deck...</>
                    ) : (
                      <>Generate Flashcards <i className="fas fa-arrow-right text-[10px] transition-transform group-hover:translate-x-1"></i></>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* =========================================
              RIGHT COLUMN: SLEEK TERMINAL
          ========================================= */}
          <div className="hidden lg:block h-[560px] lg:col-span-5 sticky top-10">
            <div className="bg-[#09090b] rounded-[2rem] p-8 shadow-xl relative overflow-hidden h-full flex flex-col border border-slate-800">
              
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none transition-all duration-700 group-hover:bg-indigo-500/20"></div>

              <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4 relative z-10">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="bg-white/5 border border-white/10 px-2.5 py-1 rounded flex items-center gap-1.5 text-slate-400 font-mono text-[9px] tracking-widest uppercase">
                  <i className="fas fa-shield-alt text-indigo-400 text-[9px]"></i> Secure
                </div>
              </div>

              {isGenerating ? (
                <div className="flex-1 flex flex-col justify-center relative z-10 font-mono">
                  <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center text-xl mb-6 border border-indigo-500/20 animate-pulse">
                    <i className="fas fa-microchip"></i>
                  </div>
                  <div className="text-emerald-400 text-xs mb-2"><i className="fas fa-link mr-1.5 text-[10px]"></i>Connection active</div>
                  <div className="text-slate-400 text-xs mb-6">Processing source material...</div>
                  
                  <div className="space-y-3 border-l border-slate-800 pl-4">
                    {LOADING_STEPS[inputMode].map((step, i) => (
                      <div key={i} className={`text-xs transition-all duration-500 flex items-center gap-2.5
                        ${i < loadingStep ? 'text-slate-500' : i === loadingStep ? 'text-white font-medium' : 'opacity-0 h-0 hidden'}`}>
                        {i < loadingStep ? <i className="fas fa-check text-[9px] text-emerald-500"></i> : <i className="fas fa-chevron-right text-[9px] text-indigo-400 animate-pulse"></i>}
                        {step}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center relative z-10">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 rounded-xl flex items-center justify-center text-lg text-indigo-300 mb-6 shadow-inner">
                    <i className="fas fa-brain"></i>
                  </div>
                  <h3 className="text-white font-bold text-lg mb-3 tracking-tight">Active Recall AI</h3>
                  <p className="text-slate-400 text-xs leading-relaxed mb-8">
                    Gemini 2.5 Flash ingests raw text, PDFs, and YouTube transcripts to isolate facts and structure them into optimized study cards.
                  </p>

                  <div className="space-y-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
                      <div className="text-indigo-400 mt-0.5"><i className="fas fa-compress-arrows-alt text-xs"></i></div>
                      <div>
                        <div className="text-slate-200 text-xs font-semibold mb-0.5">Signal Extraction</div>
                        <div className="text-slate-500 text-[10px] leading-relaxed">Automatically filters out conversational fluff to strictly isolate testable material.</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* =========================================
            HIGHLIGHTED RECENT DECKS SECTION
        ========================================= */}
        <div className="max-w-[1100px] w-full mt-20 relative z-10 animate-in fade-in duration-700 delay-300 fill-mode-both">
          
          <div className="bg-gradient-to-b from-indigo-50/50 to-white border border-indigo-100/60 rounded-[2rem] p-6 md:p-10 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                <i className="fas fa-layer-group text-indigo-500"></i> Your Recent Decks
              </h2>
            </div>
            
            {isLoadingDecks ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : allDecks.length === 0 ? (
              <div className="bg-white/50 border border-slate-200/50 rounded-2xl p-10 text-center">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center text-lg mx-auto mb-3"><i className="fas fa-archive"></i></div>
                <h3 className="text-sm font-bold text-slate-700 mb-0.5">Your library is empty</h3>
                <p className="text-slate-500 font-medium text-xs">Generate your first deck above.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {allDecks.slice(0, visibleCount).map(deck => (
                    <div 
                      key={deck.id} 
                      onClick={() => router.push(`/student/flashcards/${deck.id}`)} 
                      className="bg-white border border-slate-200/80 rounded-2xl p-5 cursor-pointer hover:border-indigo-300 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <div className="bg-slate-50 text-slate-500 border border-slate-200/60 px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors">
                          <i className="fas fa-copy text-[9px]"></i> {deck.cardCount} Cards
                        </div>
                        
                        <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm border border-slate-100 group-hover:border-indigo-600">
                          <i className="fas fa-play text-[8px] ml-0.5"></i>
                        </div>
                      </div>
                      
                      <h3 className="font-bold text-slate-800 text-sm leading-snug mb-4 group-hover:text-indigo-600 line-clamp-2 flex-1 transition-colors">
                        {deck.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100/80">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                          {deck.mode}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          {deck.difficulty}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* LOAD MORE BUTTON */}
                {visibleCount < allDecks.length && (
                  <div className="mt-8 flex justify-center animate-in fade-in duration-500">
                    <button 
                      onClick={() => setVisibleCount(prev => prev + 3)}
                      className="bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-100 px-6 py-2.5 rounded-full text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <i className="fas fa-chevron-down"></i> Load More ({allDecks.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}