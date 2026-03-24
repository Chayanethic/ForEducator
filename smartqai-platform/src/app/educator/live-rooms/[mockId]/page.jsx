"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LeaderboardPage() {
  const { mockId } = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const [mockDetails, setMockDetails] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for the Student Deep-Dive Modal
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        // 1. Fetch Mock Details
        const mockRef = doc(db, "mocks", mockId);
        const mockSnap = await getDoc(mockRef);
        if (!mockSnap.exists()) {
          alert("Room not found!");
          router.push("/educator");
          return;
        }
        setMockDetails({ id: mockSnap.id, ...mockSnap.data() });

        // 2. Fetch Original Questions (needed to cross-check answers)
        const qRef = collection(db, "mocks", mockId, "questions");
        const qSnap = await getDocs(qRef);
        const fetchedQuestions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setQuestions(fetchedQuestions);

        // 3. Fetch All Student Results for this Room
        const resultsRef = collection(db, "results");
        const qResults = query(resultsRef, where("mockId", "==", mockId));
        const resultsSnap = await getDocs(qResults);
        
        let fetchedResults = resultsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Sort results by Score (Highest to Lowest)
        fetchedResults.sort((a, b) => b.score - a.score);
        setResults(fetchedResults);

      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (mockId) fetchLeaderboardData();
  }, [mockId, router]);

  // Calculate Quick Stats
  const totalStudents = results.length;
  const highestScore = results.length > 0 ? results[0].score : 0;
  const averageScore = results.length > 0 
    ? (results.reduce((acc, curr) => acc + curr.score, 0) / results.length).toFixed(2) 
    : 0;

  if (!isLoaded || isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-emerald-600"></i></div>;
  if (!isSignedIn) return <div className="p-10 text-center">Please log in.</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative">
      
      {/* DEEP-DIVE MODAL (Shows when educator clicks a student row) */}
      {selectedStudent && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-auto overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-900 p-6 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4 text-white">
                <img src={selectedStudent.studentAvatar || `https://ui-avatars.com/api/?name=${selectedStudent.studentName}`} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-slate-700" />
                <div>
                  <h2 className="text-xl font-bold">{selectedStudent.studentName}'s Attempt</h2>
                  <p className="text-sm text-slate-400">{selectedStudent.studentEmail}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-white transition text-2xl"><i className="fas fa-times"></i></button>
            </div>

            {/* Modal Stats Bar */}
            <div className="bg-slate-100 p-4 flex gap-6 border-b border-slate-200 shrink-0">
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"><span className="text-slate-500 text-xs uppercase font-bold block">Score</span><span className="text-xl font-black text-slate-800">{selectedStudent.score}</span></div>
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"><span className="text-slate-500 text-xs uppercase font-bold block">Correct</span><span className="text-xl font-black text-emerald-600">{selectedStudent.correct}</span></div>
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"><span className="text-slate-500 text-xs uppercase font-bold block">Incorrect</span><span className="text-xl font-black text-rose-600">{selectedStudent.incorrect}</span></div>
              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"><span className="text-slate-500 text-xs uppercase font-bold block">Unattempted</span><span className="text-xl font-black text-slate-400">{selectedStudent.unattempted}</span></div>
            </div>

            {/* Detailed Answers List */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">Question Breakdown</h3>
              <div className="space-y-4">
                {questions.map((q, i) => {
                  const studentAnswer = selectedStudent.answers ? selectedStudent.answers[i] : null;
                  const isCorrect = studentAnswer === q.correctOption;
                  const isUnattempted = !studentAnswer;

                  return (
                    <div key={i} className={`p-4 rounded-xl border-2 ${isCorrect ? 'border-emerald-200 bg-emerald-50/30' : isUnattempted ? 'border-slate-200 bg-white' : 'border-rose-200 bg-rose-50/30'}`}>
                      <div className="flex gap-3 mb-2">
                        <span className={`text-xs font-bold px-2 py-1 rounded text-white ${isCorrect ? 'bg-emerald-500' : isUnattempted ? 'bg-slate-400' : 'bg-rose-500'}`}>Q{i + 1}</span>
                        <p className="text-sm font-medium text-slate-800 flex-1">{q.text}</p>
                      </div>
                      
                      <div className="ml-10 grid grid-cols-2 gap-4 text-sm mt-3">
                        <div className="bg-white p-2 border border-slate-200 rounded">
                          <span className="text-xs text-slate-500 font-bold block mb-1">Student Selected:</span>
                          {isUnattempted ? (
                            <span className="text-slate-400 italic">Did not attempt</span>
                          ) : (
                            <span className={`font-bold ${isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}>
                              Option {studentAnswer}
                            </span>
                          )}
                        </div>
                        <div className="bg-white p-2 border border-slate-200 rounded">
                          <span className="text-xs text-slate-500 font-bold block mb-1">Correct Answer:</span>
                          <span className="font-bold text-emerald-600">Option {q.correctOption}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
            <button onClick={() => router.push('/educator/create-mock')} className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-lg transition">
                <i className="fas fa-file-pdf w-5"></i> AI PDF Extractor
            </button>
            <button className="w-full flex items-center gap-3 bg-slate-800 text-white p-3 rounded-lg font-medium border-l-4 border-emerald-500">
                <i className="fas fa-door-open w-5"></i> Live Rooms
            </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-white shadow-sm p-6 flex justify-between items-center z-10 sticky top-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-rose-100 text-rose-600 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-wide">
                <i className="fas fa-circle text-[8px] animate-pulse"></i> Live Analytics
              </span>
              <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">Room: {mockId}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{mockDetails?.title || "Exam Leaderboard"}</h1>
          </div>
          <button onClick={() => router.push('/educator/create-mock')} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 font-medium transition text-sm">
            <i className="fas fa-arrow-left mr-2"></i> Back to Studio
          </button>
        </header>

        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-8">
          
          {/* TOP STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl"><i className="fas fa-users"></i></div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total Attempts</p>
                <h3 className="text-3xl font-black text-slate-800">{totalStudents}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl"><i className="fas fa-trophy"></i></div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Highest Score</p>
                <h3 className="text-3xl font-black text-slate-800">{highestScore}</h3>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl"><i className="fas fa-chart-line"></i></div>
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">Average Score</p>
                <h3 className="text-3xl font-black text-slate-800">{averageScore}</h3>
              </div>
            </div>
          </div>

          {/* LEADERBOARD TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Student Rankings</h2>
              <span className="text-xs text-slate-500 font-medium">Click a student to view deep analysis</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold border-b border-slate-200">
                    <th className="p-4 pl-6 w-16 text-center">Rank</th>
                    <th className="p-4">Student Info</th>
                    <th className="p-4 text-center">Score</th>
                    <th className="p-4 text-center">Correct</th>
                    <th className="p-4 text-center">Incorrect</th>
                    <th className="p-4 text-right pr-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-500">No students have submitted this exam yet.</td></tr>
                  ) : (
                    results.map((res, index) => (
                      <tr 
                        key={res.id} 
                        onClick={() => setSelectedStudent(res)}
                        className="hover:bg-slate-50 transition cursor-pointer group"
                      >
                        <td className="p-4 pl-6 text-center">
                          {index === 0 ? <i className="fas fa-medal text-yellow-400 text-xl"></i> : 
                           index === 1 ? <i className="fas fa-medal text-slate-400 text-xl"></i> : 
                           index === 2 ? <i className="fas fa-medal text-amber-600 text-xl"></i> : 
                           <span className="text-slate-500 font-bold">{index + 1}</span>}
                        </td>
                        <td className="p-4 flex items-center gap-3">
                          <img src={res.studentAvatar || `https://ui-avatars.com/api/?name=${res.studentName}`} alt="avatar" className="w-10 h-10 rounded-full border border-slate-200" />
                          <div>
                            <p className="font-bold text-slate-800 group-hover:text-emerald-600 transition">{res.studentName}</p>
                            <p className="text-xs text-slate-500">{res.studentEmail || "No Email Provided"}</p>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`font-black text-lg ${index === 0 ? 'text-emerald-600' : 'text-slate-800'}`}>{res.score}</span>
                        </td>
                        <td className="p-4 text-center text-emerald-600 font-bold">{res.correct}</td>
                        <td className="p-4 text-center text-rose-500 font-bold">{res.incorrect}</td>
                        <td className="p-4 text-right pr-6">
                          <button className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded font-bold hover:bg-indigo-100 transition">
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}