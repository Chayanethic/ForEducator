"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { doc, getDoc, collection, getDocs, addDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ExamInterface() {
  const { mockId } = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [mockDetails, setMockDetails] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Exam State Management
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); 
  const [statuses, setStatuses] = useState([]); 
  const [timeLeft, setTimeLeft] = useState(3600); 
  const [showCalculator, setShowCalculator] = useState(false);

  // 1. Prevent Accidental Back/Refresh
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to leave? Your exam is in progress.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // 2. Fetch Exam Data AND Saved Progress
  useEffect(() => {
    const fetchExamAndProgress = async () => {
      try {
        // A. Get Exam Settings
        const mockRef = doc(db, "mocks", mockId);
        const mockSnap = await getDoc(mockRef);
        
        if (!mockSnap.exists()) {
          alert("Exam not found!");
          router.push("/student");
          return;
        }
        
        const mockData = { id: mockSnap.id, ...mockSnap.data() };
        setMockDetails(mockData);
        
        // Calculate initial time in seconds based on educator's duration setting (fallback to 60m)
        const initialDurationSeconds = (mockData.duration || 60) * 60;

        // B. Get Questions
        const qRef = collection(db, "mocks", mockId, "questions");
        const qSnap = await getDocs(qRef);
        const fetchedQuestions = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setQuestions(fetchedQuestions);
        
        // Create baseline statuses
        const initialStatuses = Array(fetchedQuestions.length).fill('not-visited');
        if (fetchedQuestions.length > 0) {
          initialStatuses[0] = 'not-answered';
        }

        // C. Check for existing progress to RESUME
        if (user) {
          const progressRef = doc(db, "progress", `${user.id}_${mockId}`);
          const progressSnap = await getDoc(progressRef);
          
          if (progressSnap.exists() && !progressSnap.data().isSubmitted) {
            const savedData = progressSnap.data();
            setAnswers(savedData.answers || {});
            setStatuses(savedData.statuses || initialStatuses);
            setTimeLeft(savedData.timeLeft || initialDurationSeconds);
          } else {
            setStatuses(initialStatuses);
            setTimeLeft(initialDurationSeconds);
          }
        } else {
          setStatuses(initialStatuses);
          setTimeLeft(initialDurationSeconds);
        }
        
      } catch (error) {
        console.error("Error fetching exam:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (mockId && isLoaded) fetchExamAndProgress();
  }, [mockId, router, user, isLoaded]);

  // 3. Timer Logic
  useEffect(() => {
    if (isLoading || questions.length === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExam(); // Auto submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isLoading, questions.length]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Helper function to silently save progress to Firebase
  const saveProgressToCloud = async (newAnswers, newStatuses) => {
    if (user && mockDetails) {
      const progressRef = doc(db, "progress", `${user.id}_${mockId}`);
      await setDoc(progressRef, {
        studentId: user.id,
        mockId: mockId,
        mockTitle: mockDetails.title,
        answers: newAnswers,
        statuses: newStatuses,
        timeLeft: timeLeft,
        lastUpdated: new Date(),
        isSubmitted: false
      }, { merge: true });
    }
  };

  // 4. Action Handlers (TCS iON Logic)
  const handleSelectOption = (optionId) => {
    const newAnswers = { ...answers, [currentIndex]: optionId };
    setAnswers(newAnswers);
    saveProgressToCloud(newAnswers, statuses); // Auto-save on click
  };

  const clearResponse = () => {
    const newAnswers = { ...answers };
    delete newAnswers[currentIndex];
    setAnswers(newAnswers);
    saveProgressToCloud(newAnswers, statuses);
  };

  const navigateTo = (newIndex) => {
    const currentStatus = statuses[currentIndex];
    const updatedStatuses = [...statuses];
    
    if (currentStatus === 'not-answered' || currentStatus === 'not-visited') {
       updatedStatuses[currentIndex] = answers[currentIndex] ? 'answered' : 'not-answered';
    }

    if (updatedStatuses[newIndex] === 'not-visited') {
      updatedStatuses[newIndex] = 'not-answered';
    }

    setStatuses(updatedStatuses);
    setCurrentIndex(newIndex);
    saveProgressToCloud(answers, updatedStatuses);
  };

  const saveAndNext = () => {
    const updatedStatuses = [...statuses];
    updatedStatuses[currentIndex] = answers[currentIndex] ? 'answered' : 'not-answered';
    
    let nextIndex = currentIndex;
    if (currentIndex < questions.length - 1) {
      nextIndex = currentIndex + 1;
      if (updatedStatuses[nextIndex] === 'not-visited') {
        updatedStatuses[nextIndex] = 'not-answered';
      }
    }
    
    setStatuses(updatedStatuses);
    setCurrentIndex(nextIndex);
    saveProgressToCloud(answers, updatedStatuses);
  };

  const markAndNext = () => {
    const updatedStatuses = [...statuses];
    updatedStatuses[currentIndex] = answers[currentIndex] ? 'answered-marked' : 'marked';
    
    let nextIndex = currentIndex;
    if (currentIndex < questions.length - 1) {
      nextIndex = currentIndex + 1;
      if (updatedStatuses[nextIndex] === 'not-visited') {
        updatedStatuses[nextIndex] = 'not-answered';
      }
    }

    setStatuses(updatedStatuses);
    setCurrentIndex(nextIndex);
    saveProgressToCloud(answers, updatedStatuses);
  };

  // 5. Submit Exam
  const submitExam = async () => {
    if (!confirm("Are you sure you want to submit the exam?")) return;
    
    try {
      let score = 0;
      let correct = 0;
      let incorrect = 0;

      questions.forEach((q, index) => {
        if (answers[index]) {
          if (answers[index] === q.correctOption) {
            score += 2;
            correct++;
          } else {
            score -= 0.66;
            incorrect++;
          }
        }
      });

      // A. Save final result to Firebase (Includes Full Student Info for Leaderboard)
      await addDoc(collection(db, "results"), {
        studentId: user?.id || "anonymous",
        studentName: user?.fullName || "Student",
        studentEmail: user?.primaryEmailAddress?.emailAddress || "No Email",
        studentAvatar: user?.imageUrl || "",
        mockId: mockId,
        examTitle: mockDetails?.title,
        score: parseFloat(score.toFixed(2)),
        correct,
        incorrect,
        unattempted: questions.length - (correct + incorrect),
        submittedAt: new Date(),
        answers 
      });

      // B. Mark progress as submitted so it disappears from the Dashboard "Resume" list
      if (user) {
        const progressRef = doc(db, "progress", `${user.id}_${mockId}`);
        await setDoc(progressRef, { isSubmitted: true }, { merge: true });
      }

      alert(`Exam Submitted! Your tentative score: ${score.toFixed(2)}`);
      router.push("/student"); 

    } catch (error) {
      console.error("Error submitting exam:", error);
      alert("Failed to submit exam. Please try again.");
    }
  };

  const getPaletteClass = (status) => {
    switch (status) {
      case 'answered': return 'bg-green-500 text-white clip-answered';
      case 'not-answered': return 'bg-red-500 text-white clip-not-answered';
      case 'marked': return 'bg-purple-600 text-white rounded-full';
      case 'answered-marked': return 'bg-purple-600 text-white rounded-full relative after:absolute after:bottom-0 after:right-0 after:w-2 after:h-2 after:bg-green-400 after:rounded-full after:border after:border-white';
      default: return 'bg-gray-200 text-gray-700 border border-gray-400 rounded-md'; 
    }
  };

  const getStatusCount = (targetStatus) => statuses.filter(s => s === targetStatus || (targetStatus === 'marked' && s === 'answered-marked')).length;

  if (isLoading || !isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i></div>;
  if (questions.length === 0) return <div className="p-10 text-center">No questions found for this exam.</div>;

  const currentQ = questions[currentIndex];

  return (
    <div className="bg-gray-50 text-gray-800 font-sans h-screen flex flex-col overflow-hidden select-none">
      
      <style dangerouslySetInnerHTML={{__html: `
        .clip-answered { clip-path: polygon(100% 0, 100% 75%, 50% 100%, 0 75%, 0 0); }
        .clip-not-answered { clip-path: polygon(100% 0, 100% 75%, 50% 100%, 0 75%, 0 0); }
      `}} />

      <header className="bg-slate-900 text-white p-3 flex justify-between items-center shrink-0 shadow-md z-20">
        <div className="text-xl font-bold flex items-center gap-2">
            <i className="fas fa-brain text-blue-400"></i> SmartQAI
        </div>
        <div className="text-lg font-semibold tracking-wider">
            {mockDetails?.title || "Live Exam"}
        </div>
        <div className="flex items-center gap-4">
            {mockDetails?.allowCalculator !== false && (
              <button 
                onClick={() => setShowCalculator(!showCalculator)}
                className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded flex items-center gap-2 text-sm transition"
              >
                  <i className="fas fa-calculator text-blue-300"></i> Virtual Calculator
              </button>
            )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        <main className="flex-1 flex flex-col bg-white border-r border-gray-300 relative">
          
          <div className="bg-gray-100 p-2 flex justify-between items-center border-b border-gray-300 shrink-0">
            <div className="flex gap-1">
                <button className="bg-blue-600 text-white px-4 py-2 text-sm font-bold rounded-t-md">Section 1</button>
            </div>
            <div className="flex items-center gap-3 pr-4">
                <span className="text-gray-600 text-sm font-bold">Time Left:</span>
                <div className={`px-3 py-1 rounded text-lg font-mono font-bold shadow-inner ${timeLeft < 300 ? 'bg-red-100 text-red-600 border border-red-300' : 'bg-slate-800 text-white'}`}>
                    {formatTime(timeLeft)}
                </div>
            </div>
          </div>

          <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-blue-50 shrink-0">
            <h2 className="text-lg font-bold text-slate-800">Question No. {currentIndex + 1}</h2>
            <div className="flex gap-4 text-sm font-semibold text-gray-600">
                <div>Marks for correct answer: <span className="text-green-600">2</span></div>
                <div>Negative marks: <span className="text-red-600">0.66</span></div>
            </div>
          </div>

          {/* Question Content */}
          <div className="flex-1 overflow-y-auto p-6 text-base">
            <div className="mb-6">
                
                {/* Text */}
                <p className="mb-4 whitespace-pre-wrap font-medium text-slate-800">{currentQ.text}</p>
                
                {/* Question Image (If it exists) */}
                {currentQ.imageUrl && (
                  <div className="mb-6 p-2 border border-slate-200 rounded bg-slate-50 inline-block">
                    <img src={currentQ.imageUrl} alt="Question Diagram" className="max-h-64 object-contain" />
                  </div>
                )}
                
                {/* Options */}
                <div className="space-y-3 mt-6">
                    {currentQ.options?.map((opt, i) => (
                      <label 
                        key={i} 
                        className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition ${answers[currentIndex] === opt.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-300 hover:bg-gray-50'}`}
                      >
                          <input 
                            type="radio" 
                            name={`q-${currentIndex}`} 
                            checked={answers[currentIndex] === opt.id}
                            onChange={() => handleSelectOption(opt.id)}
                            className="mt-1 w-5 h-5 text-blue-600 cursor-pointer shrink-0" 
                          />
                          <div>
                            <span className="block mb-1">{opt.text}</span>
                            {/* Option Image (If it exists) */}
                            {opt.imageUrl && (
                               <img src={opt.imageUrl} alt={`Option ${opt.id}`} className="max-h-24 mt-2 object-contain border border-slate-200 rounded p-1 bg-white" />
                            )}
                          </div>
                      </label>
                    ))}
                </div>
            </div>
          </div>

          {/* Bottom Action Buttons */}
          <div className="p-4 bg-gray-100 border-t border-gray-300 flex justify-between items-center shrink-0">
            <div className="flex gap-3">
                <button 
                  onClick={clearResponse}
                  className="bg-white border border-gray-400 text-gray-700 px-5 py-2 rounded text-sm font-bold hover:bg-gray-50 shadow-sm"
                >
                    Clear Response
                </button>
                <button 
                  onClick={markAndNext}
                  className="bg-orange-500 text-white px-5 py-2 rounded text-sm font-bold hover:bg-orange-600 shadow-sm"
                >
                    Mark for Review & Next
                </button>
            </div>
            <button 
              onClick={saveAndNext}
              className="bg-green-600 text-white px-8 py-2 rounded text-sm font-bold hover:bg-green-700 shadow-sm flex items-center gap-2"
            >
                Save & Next <i className="fas fa-chevron-right text-xs"></i>
            </button>
          </div>
        </main>

        <aside className="w-80 bg-blue-50 flex flex-col shrink-0">
          <div className="p-4 bg-white border-b border-gray-300 flex items-center gap-4">
            <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Student&background=0D8ABC&color=fff"} alt="Candidate" className="w-14 h-14 rounded-lg border-2 border-gray-200" />
            <div>
                <div className="text-xs text-gray-500 uppercase tracking-wide font-bold">Candidate</div>
                <div className="text-sm font-bold text-slate-800 truncate w-48">{user?.fullName || "Student"}</div>
            </div>
          </div>

          <div className="p-4 border-b border-gray-300 bg-white grid grid-cols-2 gap-y-3 text-xs font-semibold text-gray-700">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-green-500 text-white flex items-center justify-center clip-answered">{getStatusCount('answered')}</div>
                <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-red-500 text-white flex items-center justify-center clip-not-answered">{getStatusCount('not-answered')}</div>
                <span>Not Answered</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gray-200 text-gray-600 border border-gray-400 flex items-center justify-center rounded-md">{getStatusCount('not-visited')}</div>
                <span>Not Visited</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-purple-600 text-white flex items-center justify-center rounded-full">{getStatusCount('marked')}</div>
                <span>Marked</span>
            </div>
          </div>

          <div className="bg-blue-600 text-white p-2 text-sm font-bold text-center">
            Section 1 Questions
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-blue-50">
            <div className="grid grid-cols-5 gap-3">
              {questions.map((_, i) => (
                <button 
                  key={i}
                  onClick={() => navigateTo(i)}
                  className={`w-10 h-10 font-bold flex items-center justify-center hover:opacity-80 transition ${getPaletteClass(statuses[i])}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-gray-200 border-t border-gray-300 flex justify-center shrink-0">
            <button 
              onClick={submitExam}
              className="w-full bg-blue-600 text-white py-3 rounded text-sm font-bold hover:bg-blue-700 shadow-md transition"
            >
                Submit Exam
            </button>
          </div>
        </aside>

      </div>
    </div>
  );
}