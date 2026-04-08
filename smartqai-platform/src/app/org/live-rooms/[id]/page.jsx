"use client";

import { useState, useEffect, use } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useOrganization } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AnalyticsDashboard({ params }) {
  const unwrappedParams = use(params);
  const mockId = unwrappedParams.id;
  const { organization, isLoaded } = useOrganization();
  const router = useRouter();

  const [examData, setExamData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [reviews, setReviews] = useState([]); // ⚡ NEW: State for Reviews
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leads"); // ⚡ NEW: Tab State

  // Security check: must be logged into an Org
  useEffect(() => {
    if (isLoaded && !organization) {
      router.push("/org");
    }
  }, [isLoaded, organization, router]);

  // 1. Fetch Exam Meta Data
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const docRef = doc(db, "mocks", mockId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const mockData = docSnap.data();
          if (organization && mockData.orgId !== organization.id) {
            throw new Error("Unauthorized access");
          }
          setExamData(mockData);
        } else {
          throw new Error("Exam not found");
        }
      } catch (error) {
        console.error("Error fetching exam:", error);
      }
    };
    if (mockId && isLoaded && organization) fetchExam();
  }, [mockId, isLoaded, organization]);

  // 2. Real-time Listener for Submissions
  useEffect(() => {
    if (!mockId || !organization) return;
    const q = query(
      collection(db, "mocks", mockId, "submissions"),
      orderBy("score", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching submissions:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [mockId, organization]);

  // ⚡ 3. Real-time Listener for Reviews ⚡
  useEffect(() => {
    if (!mockId || !organization) return;
    const q = query(
      collection(db, "mocks", mockId, "reviews"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error fetching reviews:", error);
    });
    return () => unsubscribe();
  }, [mockId, organization]);

  // 4. Export to CSV (Includes Reviews)
  const exportToCSV = () => {
    if (submissions.length === 0) return alert("No leads to export yet.");

    const headers = ["Rank", "Student Name", "Email Address", "Phone Number", "Score", "Total Marks", "Cheat Warnings", "Status", "Date Submitted"];
    
    const rows = submissions.map((sub, index) => [
      index + 1,
      `"${sub.studentName || 'N/A'}"`,
      `"${sub.studentEmail || 'N/A'}"`,
      `"${sub.studentPhone || 'N/A'}"`,
      sub.score || 0,
      sub.totalMarks || 0,
      sub.warnings || 0,
      sub.forcedSubmit ? "Terminated (Cheating)" : "Completed Normal",
      `"${sub.submittedAt?.toDate().toLocaleString() || 'Unknown'}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${examData?.title?.replace(/\s+/g, '_') || 'Exam'}_Leads.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isLoaded) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;

  if (!examData && !isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-bold">Unauthorized or Exam Not Found.</div>;
  }

  // Calculate Quick Stats
  const totalLeads = submissions.length;
  const avgScore = totalLeads > 0 ? (submissions.reduce((acc, sub) => acc + Number(sub.score || 0), 0) / totalLeads).toFixed(2) : 0;
  const highestScore = totalLeads > 0 ? Math.max(...submissions.map(s => Number(s.score || 0))) : 0;
  const flaggedExams = submissions.filter(s => s.warnings > 0 || s.forcedSubmit).length;

  // ⚡ Calculate Review Stats ⚡
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? (reviews.reduce((acc, rev) => acc + Number(rev.rating || 0), 0) / totalReviews).toFixed(1) : 0;

  // Render Stars Helper
  const renderStars = (rating) => {
    return (
      <div className="flex gap-1 text-amber-400 text-sm">
        {[1, 2, 3, 4, 5].map((star) => (
          <i key={star} className={`${star <= rating ? 'fas' : 'far'} fa-star drop-shadow-sm`}></i>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-16 md:w-64 bg-slate-900 text-white flex flex-col shrink-0 z-50 transition-all border-r border-slate-800">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-800">
          {organization?.imageUrl && <img src={organization.imageUrl} alt="Org" className="w-8 h-8 rounded-md bg-white p-0.5" />}
          <span className="hidden md:block ml-3 font-black tracking-tight text-sm truncate">{organization?.name}</span>
        </div>
        <nav className="flex-1 p-3 space-y-2 mt-4">
            <button onClick={() => router.push('/org/dashboard')} className="w-full flex items-center justify-center md:justify-start gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-xl transition">
                <i className="fas fa-arrow-left text-lg"></i> <span className="hidden md:block font-bold text-sm">Back to Dashboard</span>
            </button>
            <button className="w-full flex items-center justify-center md:justify-start gap-3 bg-indigo-600 text-white p-3 rounded-xl shadow-md border-l-4 border-emerald-400">
                <i className="fas fa-chart-pie text-indigo-200 text-lg"></i> <span className="hidden md:block font-bold text-sm">Analytics Hub</span>
            </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 h-20 px-8 flex justify-between items-center z-10 shrink-0 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900 truncate max-w-md">{examData?.title || "Loading..."}</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Live Analytics & Lead Gen</p>
          </div>
          <button onClick={exportToCSV} disabled={totalLeads === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-black shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <i className="fas fa-download"></i> Export CSV Leads
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            
            {/* ⚡ UPDATED TOP STATS CARDS (Now Includes Reviews) ⚡ */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-indigo-500 flex flex-col justify-between">
                 <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Total Leads</div>
                 <div className="text-3xl font-black text-slate-900">{totalLeads}</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-emerald-500 flex flex-col justify-between">
                 <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Highest Score</div>
                 <div className="text-3xl font-black text-slate-900">{highestScore} <span className="text-sm font-bold text-slate-400">pts</span></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-blue-500 flex flex-col justify-between">
                 <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Average Score</div>
                 <div className="text-3xl font-black text-slate-900">{avgScore}</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-rose-500 flex flex-col justify-between">
                 <div className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Suspicious (Cheats)</div>
                 <div className="text-3xl font-black text-rose-600">{flaggedExams}</div>
              </div>
              {/* ⚡ NEW REVIEW STAT CARD ⚡ */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl shadow-sm border border-amber-200 border-t-4 border-t-amber-500 flex flex-col justify-between">
                 <div className="text-amber-700/70 text-[10px] font-black uppercase tracking-widest mb-1">Student Rating</div>
                 <div className="flex items-baseline gap-2">
                   <span className="text-3xl font-black text-amber-600">{avgRating}</span>
                   <span className="text-sm font-bold text-amber-600/50">/ 5.0</span>
                 </div>
                 <div className="text-[10px] font-bold text-amber-600 mt-1">Based on {totalReviews} reviews</div>
              </div>
            </div>

            {/* ⚡ TAB NAVIGATION ⚡ */}
            <div className="flex gap-2 mb-6 border-b border-slate-200 pb-px">
              <button 
                onClick={() => setActiveTab("leads")}
                className={`px-6 py-3 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'leads' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fas fa-users mr-2"></i> Leads & Submissions
              </button>
              <button 
                onClick={() => setActiveTab("reviews")}
                className={`px-6 py-3 text-sm font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'reviews' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                <i className="fas fa-star mr-2"></i> Student Feedback ({totalReviews})
              </button>
            </div>

            {/* --- TAB CONTENT: LEADS & SUBMISSIONS --- */}
            {activeTab === "leads" && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
                <div className="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
                   <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Student Submissions Dashboard</h2>
                </div>

                {isLoading ? (
                  <div className="p-16 flex flex-col items-center justify-center text-center">
                    <i className="fas fa-spinner fa-spin text-3xl text-indigo-500 mb-4"></i>
                    <p className="text-slate-500 font-bold">Loading student data...</p>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl text-slate-400 mb-4"><i className="fas fa-ghost"></i></div>
                    <h3 className="text-lg font-black text-slate-700 mb-1">No Students Yet</h3>
                    <p className="text-sm font-bold text-slate-500 max-w-sm">When students take the exam using your embedded iframe, their details and scores will appear here instantly.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                          <th className="p-4 pl-6 text-center w-16">Rank</th>
                          <th className="p-4">Candidate Info</th>
                          <th className="p-4 text-center">Score</th>
                          <th className="p-4 text-center">Anti-Cheat Status</th>
                          <th className="p-4 pr-6 text-right">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {submissions.map((sub, index) => {
                          const date = sub.submittedAt?.toDate ? sub.submittedAt.toDate() : new Date();
                          const warningsCount = Number(sub.warnings) || 0;
                          
                          let cheatBadge;
                          if (sub.forcedSubmit || warningsCount >= 3) {
                            cheatBadge = <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm"><i className="fas fa-ban"></i> Terminated</span>;
                          } else if (warningsCount > 0) {
                            cheatBadge = <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm"><i className="fas fa-exclamation-triangle"></i> {warningsCount}/3 Warnings</span>;
                          } else {
                            cheatBadge = <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider"><i className="fas fa-shield-check"></i> Clean</span>;
                          }

                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors group">
                              <td className="p-4 pl-6 text-center font-black text-slate-400 group-hover:text-indigo-600 transition-colors">#{index + 1}</td>
                              <td className="p-4">
                                <div className="font-black text-sm text-slate-900">{sub.studentName || "Anonymous"}</div>
                                <div className="text-xs font-bold text-slate-500 flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mt-1">
                                  <span><i className="fas fa-envelope text-slate-400 md:mr-1"></i> {sub.studentEmail}</span>
                                  <span className="hidden md:inline text-slate-300">•</span>
                                  <span><i className="fas fa-phone text-slate-400 md:mr-1"></i> {sub.studentPhone}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">
                                <div className="inline-flex flex-col items-center justify-center">
                                  <span className="text-lg font-black text-slate-900 leading-none">{sub.score}</span>
                                  <span className="text-[10px] font-bold text-slate-400">/ {sub.totalMarks}</span>
                                </div>
                              </td>
                              <td className="p-4 text-center">{cheatBadge}</td>
                              <td className="p-4 pr-6 text-right text-xs font-bold text-slate-500">
                                {date.toLocaleDateString()}<br/>
                                <span className="text-[10px] font-medium">{date.toLocaleTimeString()}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* --- ⚡ TAB CONTENT: REVIEWS & FEEDBACK ⚡ --- */}
            {activeTab === "reviews" && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300 min-h-[400px]">
                <div className="bg-amber-50 border-b border-amber-100 p-5 flex justify-between items-center">
                   <h2 className="text-sm font-black text-amber-800 uppercase tracking-wide">Student Feedback</h2>
                </div>

                {reviews.length === 0 ? (
                  <div className="p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-3xl text-amber-300 mb-4"><i className="far fa-star"></i></div>
                    <h3 className="text-lg font-black text-slate-700 mb-1">No Reviews Yet</h3>
                    <p className="text-sm font-bold text-slate-500 max-w-sm">When students finish the exam, they can leave a rating and review. It will appear here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50">
                    {reviews.map((rev) => {
                      const date = rev.createdAt?.toDate ? rev.createdAt.toDate().toLocaleDateString() : "Recently";
                      return (
                        <div key={rev.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 font-black rounded-full flex items-center justify-center uppercase border border-indigo-200">
                                {rev.studentName ? rev.studentName.charAt(0) : "S"}
                              </div>
                              <div>
                                <h4 className="font-black text-slate-800 text-sm">{rev.studentName || "Anonymous"}</h4>
                                <p className="text-[10px] font-bold text-slate-400">{rev.studentEmail}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">{date}</span>
                          </div>
                          
                          <div className="mb-3">
                            {renderStars(rev.rating)}
                          </div>
                          
                          {rev.reviewText ? (
                            <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">"{rev.reviewText}"</p>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 italic">No comment provided.</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}