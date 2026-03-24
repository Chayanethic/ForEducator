"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function CreateMockPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [questions, setQuestions] = useState([]);
  
  // States for Publishing & Copying
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedRoomId, setPublishedRoomId] = useState(null);
  const [copied, setCopied] = useState(false); // NEW: Smooth copy state
  
  // Exam Settings State
  const [examTitle, setExamTitle] = useState("GATE 2026 - Custom AI Mock");
  const [duration, setDuration] = useState(60); 
  const [allowCalculator, setAllowCalculator] = useState(true);
  const [availability, setAvailability] = useState("permanent"); 
  const [visibility, setVisibility] = useState("private"); 

  // 1. Send PDF to your Gemini API Route
  const handleExtract = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a PDF first.");

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({})); 
        throw new Error(errorData.error || "Server crashed. Check your terminal logs.");
      }
      
      const data = await res.json();
      
      if (data.questions) {
        // NEW: Add default marks, negative marks, and section to AI output
        const enrichedQuestions = data.questions.map(q => ({
            ...q,
            marks: 2,
            negativeMarks: 0.66,
            section: "General" 
        }));
        setQuestions(enrichedQuestions);
      } else {
        alert("Could not extract questions. Ensure the PDF contains readable text.");
      }
    } catch (error) {
      console.error(error);
      alert(`An error occurred during AI extraction: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Upload Image to Firebase Storage
  const handleImageUpload = async (imageFile, qIndex, optIndex = null) => {
    if (!imageFile) return;
    const fileRef = ref(storage, `mocks/images/${Date.now()}-${imageFile.name}`);
    try {
      const snapshot = await uploadBytes(fileRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const updated = [...questions];
      if (optIndex !== null) {
        updated[qIndex].options[optIndex].imageUrl = downloadURL;
        updated[qIndex].options[optIndex].hasImage = true;
      } else {
        updated[qIndex].imageUrl = downloadURL;
        updated[qIndex].hasImage = true;
      }
      setQuestions(updated);
    } catch (error) {
      console.error("Storage upload error:", error);
      alert("Failed to upload image. Please try again.");
    }
  };

  // 3. Handle Educator Edits
  // NEW: Generic update function for text, marks, negativeMarks, and section
  const updateQuestionField = (qIndex, field, value) => {
    const updated = [...questions];
    updated[qIndex][field] = value;
    setQuestions(updated);
  };

  const updateOptionText = (qIndex, optIndex, newText) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].text = newText;
    setQuestions(updated);
  }

  const updateCorrectAnswer = (qIndex, optionId) => {
    const updated = [...questions];
    updated[qIndex].correctOption = optionId;
    setQuestions(updated);
  };

  const removeQuestion = (index) => {
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  // NEW: Handle Smooth Copy
  const handleCopyCode = () => {
    navigator.clipboard.writeText(publishedRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
  };

  // 4. Save Final Exam to Firebase
  const saveToDatabase = async () => {
    if (questions.length === 0) return alert("No questions to save!");
    if (!isSignedIn) return alert("Please log in first.");

    setIsPublishing(true);

    try {
      const mockRef = await addDoc(collection(db, "mocks"), {
        educatorId: user.id,
        educatorName: user.fullName || "Educator",
        title: examTitle,
        duration: Number(duration),
        allowCalculator: allowCalculator,
        availability: availability,
        visibility: visibility,
        createdAt: new Date(),
        status: "published", 
      });

      const questionsRef = collection(db, "mocks", mockRef.id, "questions");
      for (const q of questions) {
        await addDoc(questionsRef, {
           text: q.text,
           type: q.type || "MCQ",
           options: q.options,
           correctOption: q.correctOption,
           imageUrl: q.imageUrl || null,
           hasImage: q.hasImage || false,
           marks: Number(q.marks) || 2,             // NEW
           negativeMarks: Number(q.negativeMarks) || 0.66, // NEW
           section: q.section || "General"          // NEW
        });
      }

      setPublishedRoomId(mockRef.id);
      
    } catch (error) {
      console.error("Firebase save error:", error);
      alert("Failed to save mock to database. Ensure Firestore rules are set to allow writes.");
      setIsPublishing(false); 
    }
  };

  if (!isLoaded) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative">
      
      {/* SUCCESS SCREEN OVERLAY */}
      {publishedRoomId && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6">
          <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-lg w-full border border-slate-100 transform transition-all scale-100">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              <i className="fas fa-check"></i>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Mock Published!</h2>
            <p className="text-slate-500 mb-8">
              {visibility === "private" 
                ? "Your exam is private. Share this Room ID with your students:"
                : "Your exam is public and live on the platform!"}
            </p>
            
            <div className="bg-slate-50 p-4 rounded-xl mb-8 flex items-center justify-between border border-slate-200">
              <span className="text-3xl font-mono font-black tracking-widest text-slate-800">{publishedRoomId}</span>
              <button 
                onClick={handleCopyCode}
                className={`p-3 rounded-lg shadow-sm transition border ${copied ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white text-slate-500 hover:text-indigo-600 border-slate-200'}`}
                title="Copy Room ID"
              >
                {copied ? <><i className="fas fa-check"></i> Copied!</> : <i className="fas fa-copy"></i>}
              </button>
            </div>

            <div className="flex gap-4">
              <button onClick={() => window.location.reload()} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition">Create Another</button>
              <button onClick={() => router.push(`/educator/live-rooms/${publishedRoomId}`)} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-md shadow-emerald-500/20">View Leaderboard</button>
            </div>
          </div>
        </div>
      )}

      {/* EDUCATOR SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex shrink-0">
        <div className="p-6 text-2xl font-bold flex items-center gap-2 border-b border-slate-800">
            <i className="fas fa-chalkboard-teacher text-emerald-400"></i> SmartQAI
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button 
              onClick={() => router.push('/educator/create-mock')}
              className="w-full flex items-center gap-3 bg-slate-800 text-white p-3 rounded-lg font-medium border-l-4 border-emerald-500"
            >
                <i className="fas fa-file-pdf w-5"></i> AI PDF Extractor
            </button>
            <button 
              onClick={() => router.push('/educator/live-rooms')}
              className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-lg transition"
            >
                <i className="fas fa-door-open w-5"></i> Live Rooms
            </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-white shadow-sm p-6 flex justify-between items-center z-10 sticky top-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Mock Test Studio</h1>
            <input 
                type="text" 
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="text-sm font-semibold text-emerald-600 bg-transparent border-b border-slate-200 outline-none focus:border-emerald-500 mt-2 pb-1 w-64"
                placeholder="Enter Exam Title..."
            />
          </div>
          <button 
            onClick={saveToDatabase}
            disabled={questions.length === 0 || isPublishing}
            className={`px-5 py-2 rounded-lg font-medium shadow-sm transition flex items-center gap-2 ${questions.length > 0 && !isPublishing ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            {isPublishing ? "Publishing..." : "Publish to Live Room"} <i className="fas fa-arrow-right"></i>
          </button>
        </header>

        <div className="p-6 md:p-8 space-y-8 max-w-4xl mx-auto w-full">
          
          {/* STEP 1: UPLOAD ZONE */}
          {questions.length === 0 && (
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <label className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition p-10 flex flex-col items-center justify-center text-center cursor-pointer group">
                <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  <i className="fas fa-file-pdf"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">{file ? file.name : "Drag & Drop your Exam PDF here"}</h3>
                <p className="text-sm text-slate-500 mb-6">Gemini 2.5 will extract text, equations, and options.</p>
                <button 
                  onClick={handleExtract} disabled={isProcessing || !file}
                  className="bg-slate-800 text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-700 transition disabled:bg-slate-400"
                >
                  {isProcessing ? "AI is Analyzing..." : "Generate Questions"}
                </button>
              </label>
            </section>
          )}

          {/* STEP 2: EXTRACTION REVIEW ZONE */}
          {questions.length > 0 && (
            <>
              <div className="flex justify-between items-end mb-4 border-b border-slate-200 pb-2">
                <h2 className="text-xl font-bold text-slate-800">
                  <i className="fas fa-robot text-emerald-500 mr-2"></i> Review & Edit Questions
                </h2>
                <span className="text-sm bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">
                  {questions.length} Extracted
                </span>
              </div>

              <div className="space-y-6">
                {questions.map((q, qIndex) => (
                  <div key={qIndex} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative hover:border-emerald-300 transition group">
                    
                    <button 
                        onClick={() => removeQuestion(qIndex)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                    >
                        <i className="fas fa-trash"></i>
                    </button>

                    {/* TOP CONTROLS: Q Number, Type, Section, Marks */}
                    <div className="flex flex-wrap gap-3 mb-4 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded">Q{qIndex + 1}</span>
                      
                      <select 
                          value={q.type || "MCQ"} 
                          onChange={(e) => updateQuestionField(qIndex, 'type', e.target.value)}
                          className="bg-white border border-slate-300 rounded text-xs px-2 py-1.5 text-slate-700 outline-none shadow-sm"
                      >
                          <option value="MCQ">Single Correct (MCQ)</option>
                          <option value="MSQ">Multiple Correct (MSQ)</option>
                          <option value="NAT">Numerical (NAT)</option>
                      </select>

                      <div className="flex items-center gap-2 border-l border-slate-300 pl-3">
                        <span className="text-xs font-bold text-slate-500">Section:</span>
                        <input 
                          type="text" 
                          value={q.section} 
                          onChange={(e) => updateQuestionField(qIndex, 'section', e.target.value)}
                          placeholder="e.g. Math"
                          className="w-24 bg-white border border-slate-300 rounded text-xs px-2 py-1 outline-none focus:border-emerald-500 shadow-sm"
                        />
                      </div>

                      <div className="flex items-center gap-2 border-l border-slate-300 pl-3">
                        <span className="text-xs font-bold text-emerald-600">+ Mark:</span>
                        <input 
                          type="number" 
                          step="0.5"
                          value={q.marks} 
                          onChange={(e) => updateQuestionField(qIndex, 'marks', e.target.value)}
                          className="w-16 bg-emerald-50 border border-emerald-200 rounded text-xs px-2 py-1 text-emerald-700 font-bold outline-none shadow-sm"
                        />
                      </div>

                      <div className="flex items-center gap-2 border-l border-slate-300 pl-3">
                        <span className="text-xs font-bold text-rose-500">- Mark:</span>
                        <input 
                          type="number" 
                          step="0.1"
                          value={q.negativeMarks} 
                          onChange={(e) => updateQuestionField(qIndex, 'negativeMarks', e.target.value)}
                          className="w-16 bg-rose-50 border border-rose-200 rounded text-xs px-2 py-1 text-rose-700 font-bold outline-none shadow-sm"
                        />
                      </div>
                    </div>

                    <textarea 
                      value={q.text}
                      onChange={(e) => updateQuestionField(qIndex, 'text', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-800 mb-4 focus:ring-2 focus:ring-emerald-500 outline-none resize-y font-medium" 
                      rows="3"
                    />

                    {/* MAIN QUESTION IMAGE AREA */}
                    <div className="mb-6">
                      {q.hasImage || q.imageUrl ? (
                        <div className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50 p-2 group/mainimg">
                          {q.imageUrl ? (
                            <img src={q.imageUrl} alt="Question Diagram" className="max-h-40 mx-auto object-contain" />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-6 text-slate-400">
                               <i className="fas fa-image text-3xl mb-2"></i>
                               <span className="text-xs font-bold text-amber-600 mb-2">AI detected a diagram here!</span>
                            </div>
                          )}
                          
                          <label className="absolute inset-0 w-full h-full bg-slate-900/60 flex items-center justify-center opacity-0 group-hover/mainimg:opacity-100 transition-opacity cursor-pointer">
                            <span className="bg-white text-slate-800 text-xs font-bold px-4 py-2 rounded-lg shadow-lg hover:bg-slate-100">
                              <i className="fas fa-upload mr-1"></i> {q.imageUrl ? "Replace Image" : "Upload Image"}
                            </span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex)} />
                          </label>
                        </div>
                      ) : (
                        <label className="mb-4 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded inline-flex items-center gap-1 border border-indigo-100 cursor-pointer">
                          <i className="fas fa-plus"></i> Add Question Image
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex)} />
                        </label>
                      )}
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {q.options?.map((opt, optIndex) => {
                        const isCorrect = q.correctOption === opt.id;
                        return (
                          <div key={optIndex} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition ${isCorrect ? 'bg-emerald-50 border-emerald-400 shadow-sm' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                            <input type="radio" name={`q-${qIndex}-correct`} checked={isCorrect} onChange={() => updateCorrectAnswer(qIndex, opt.id)} className="mt-1 w-4 h-4 text-emerald-600 cursor-pointer shrink-0" />
                            <div className="flex-1 relative">
                              <input type="text" value={opt.text} onChange={(e) => updateOptionText(qIndex, optIndex, e.target.value)} className={`w-full bg-transparent text-sm outline-none ${isCorrect ? 'text-emerald-900 font-bold' : 'text-slate-700 font-medium'}`} />
                              <div className="mt-2">
                                {opt.hasImage || opt.imageUrl ? (
                                  <div className="relative border border-slate-200 rounded overflow-hidden bg-white mt-2 p-1 group/optimg">
                                    {opt.imageUrl ? <img src={opt.imageUrl} alt="Option" className="max-h-20 mx-auto object-contain" /> : <div className="flex flex-col items-center justify-center h-16 text-slate-300"><i className="fas fa-image"></i><span className="text-[10px] text-amber-500 font-bold mt-1">Missing Image</span></div>}
                                    <label className="absolute inset-0 w-full h-full bg-black/60 text-white text-[10px] font-bold opacity-0 group-hover/optimg:opacity-100 transition flex items-center justify-center cursor-pointer">
                                      {opt.imageUrl ? "Replace" : "Upload"}
                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, optIndex)} />
                                    </label>
                                  </div>
                                ) : (
                                   <label className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 cursor-pointer mt-1 inline-block bg-slate-100 px-2 py-1 rounded">
                                     <i className="fas fa-image mr-1"></i> Add Option Image
                                     <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e.target.files[0], qIndex, optIndex)} />
                                   </label>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* STEP 3: EXAM CONFIGURATION */}
              <div className="mt-10 mb-6 border-t border-slate-200 pt-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6"><i className="fas fa-cog text-slate-400 mr-2"></i> Exam Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  
                  {/* Visibility */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Visibility</label>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setVisibility("private")}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition ${visibility === "private" ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        <i className="fas fa-lock mr-1"></i> Private (Room ID)
                      </button>
                      <button 
                         onClick={() => setVisibility("public")}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition ${visibility === "public" ? "bg-white text-slate-800 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800"}`}
                      >
                        <i className="fas fa-globe mr-1"></i> Public
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">
                      {visibility === "private" ? "Only students with the Room ID can join." : "Anyone on the platform can take this mock."}
                    </p>
                  </div>

                  {/* Calculator Toggle */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Tools</label>
                    <div 
                      onClick={() => setAllowCalculator(!allowCalculator)}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition ${allowCalculator ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"}`}
                    >
                      <div className="flex items-center gap-3">
                        <i className={`fas fa-calculator ${allowCalculator ? "text-emerald-600" : "text-slate-400"}`}></i>
                        <div>
                          <div className={`text-sm font-bold ${allowCalculator ? "text-emerald-900" : "text-slate-700"}`}>GATE Virtual Calculator</div>
                          <div className="text-[10px] text-slate-500">Allow on-screen scientific calculator</div>
                        </div>
                      </div>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${allowCalculator ? "bg-emerald-500" : "bg-slate-300"}`}>
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-transform ${allowCalculator ? "right-1" : "left-1"}`}></div>
                      </div>
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Duration (Minutes)</label>
                    <input 
                      type="number" 
                      value={duration} 
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-800 outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>

                  {/* Timeline Availability */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Availability Timeline</label>
                    <select 
                      value={availability}
                      onChange={(e) => setAvailability(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-800 outline-none focus:border-emerald-500 font-bold cursor-pointer"
                    >
                      <option value="24h">Open for 24 Hours</option>
                      <option value="48h">Open for 48 Hours</option>
                      <option value="permanent">Permanent (Always Open)</option>
                    </select>
                  </div>

                </div>
              </div>

            </>
          )}
        </div>
      </main>
    </div>
  );
}