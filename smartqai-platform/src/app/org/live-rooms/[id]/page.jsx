"use client";

import { useState, useEffect, use } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function OrgAnalyticsDashboard({ params }) {
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { isLoaded: userLoaded } = useUser();
  const router = useRouter();

  // Unwrap params in Next.js 15+
  const unwrappedParams = use(params);
  const mockId = unwrappedParams.id;

  const [examData, setExamData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Security check: must be logged into an Org
    if (orgLoaded && !organization) {
      router.push("/org");
    }
  }, [orgLoaded, organization, router]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!organization || !mockId) return;

      try {
        // 1. Fetch Exam Details
        const mockSnap = await getDoc(doc(db, "mocks", mockId));
        if (!mockSnap.exists()) throw new Error("Exam not found");
        const mockData = mockSnap.data();

        // Security: Ensure this Org actually owns this exam
        if (mockData.orgId !== organization.id) {
          throw new Error("Unauthorized access");
        }
        setExamData(mockData);

        // 2. Fetch Student Leads & Scores
        const subRef = collection(db, "mocks", mockId, "submissions");
        const q = query(subRef, orderBy("score", "desc")); // Sort by highest score first
        const subSnap = await getDocs(q);
        
        const subData = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSubmissions(subData);
      } catch (error) {
        console.error("Error loading analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (orgLoaded && organization) {
      fetchAnalytics();
    }
  }, [mockId, orgLoaded, organization]);

  // --- THE CSV LEAD EXPORT ENGINE ---
  const exportToCSV = () => {
    if (submissions.length === 0) return alert("No submissions to export yet.");

    const headers = ["Rank", "Student Name", "Email Address", "Phone Number", "Score", "Total Marks", "Anti-Cheat Warnings", "Date Submitted"];
    
    const csvRows = submissions.map((sub, index) => {
      const date = sub.submittedAt?.toDate ? sub.submittedAt.toDate().toLocaleString() : "Unknown";
      return [
        index + 1,
        `"${sub.studentName}"`,
        `"${sub.studentEmail}"`,
        `"${sub.studentPhone}"`,
        sub.score,
        sub.totalMarks,
        sub.warnings || 0,
        `"${date}"`
      ].join(",");
    });

    const csvString = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `${examData.title.replace(/\s+/g, '_')}_Leads.csv`);
    a.click();
  };

  if (!orgLoaded || !userLoaded || isLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;
  }

  if (!examData) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 font-bold">Unauthorized or Exam Not Found.</div>;
  }

  // Calculate Quick Stats
  const totalLeads = submissions.length;
  const avgScore = totalLeads > 0 ? (submissions.reduce((acc, sub) => acc + Number(sub.score), 0) / totalLeads).toFixed(2) : 0;
  const highestScore = totalLeads > 0 ? Math.max(...submissions.map(s => Number(s.score))) : 0;
  const flaggedExams = submissions.filter(s => s.warnings > 0).length;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-16 md:w-64 bg-slate-900 text-white flex flex-col shrink-0 z-50 transition-all border-r border-slate-800">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-800">
          <img src={organization.imageUrl} alt="Org" className="w-8 h-8 rounded-md bg-white p-0.5" />
          <span className="hidden md:block ml-3 font-black tracking-tight text-sm truncate">{organization.name}</span>
        </div>
        <nav className="flex-1 p-3 space-y-2 mt-4">
            <button onClick={() => router.push('/org/dashboard')} className="w-full flex items-center justify-center md:justify-start gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-xl transition">
                <i className="fas fa-arrow-left text-lg"></i> <span className="hidden md:block font-bold text-sm">Back to Dashboard</span>
            </button>
            <button className="w-full flex items-center justify-center md:justify-start gap-3 bg-indigo-600 text-white p-3 rounded-xl shadow-md">
                <i className="fas fa-chart-pie text-indigo-200 text-lg"></i> <span className="hidden md:block font-bold text-sm">Analytics</span>
            </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 h-20 px-8 flex justify-between items-center z-10 shrink-0 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{examData.title}</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Live Analytics & Lead Gen</p>
          </div>
          <button onClick={exportToCSV} disabled={totalLeads === 0} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-black shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
            <i className="fas fa-download"></i> Export CSV Leads
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            
            {/* TOP STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-indigo-500">
                 <div className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Total Leads Collected</div>
                 <div className="text-3xl font-black text-slate-900">{totalLeads}</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-emerald-500">
                 <div className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Highest Score</div>
                 <div className="text-3xl font-black text-slate-900">{highestScore} <span className="text-sm font-bold text-slate-400">marks</span></div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-blue-500">
                 <div className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Average Score</div>
                 <div className="text-3xl font-black text-slate-900">{avgScore}</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 border-t-4 border-t-rose-500">
                 <div className="text-slate-500 text-xs font-black uppercase tracking-widest mb-1">Suspicious (Cheated)</div>
                 <div className="text-3xl font-black text-rose-600">{flaggedExams}</div>
              </div>
            </div>

            {/* THE LEAD TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-5 flex justify-between items-center">
                 <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide"><i className="fas fa-users text-indigo-500 mr-2"></i> Student Submissions Dashboard</h2>
              </div>

              {submissions.length === 0 ? (
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
                        <th className="p-4 text-center">Accuracy</th>
                        <th className="p-4 text-center">Anti-Cheat Status</th>
                        <th className="p-4 pr-6 text-right">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {submissions.map((sub, index) => {
                        const date = sub.submittedAt?.toDate ? sub.submittedAt.toDate() : new Date();
                        const isSuspicious = sub.warnings > 0;
                        const accuracy = sub.totalMarks > 0 ? Math.max(0, ((sub.score / sub.totalMarks) * 100)).toFixed(0) : 0;

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="p-4 pl-6 text-center font-black text-slate-400 group-hover:text-indigo-600 transition-colors">#{index + 1}</td>
                            <td className="p-4">
                              <div className="font-black text-sm text-slate-900">{sub.studentName}</div>
                              <div className="text-xs font-bold text-slate-500 flex items-center gap-3 mt-1">
                                <span><i className="fas fa-envelope text-slate-400 mr-1"></i> {sub.studentEmail}</span>
                                <span><i className="fas fa-phone text-slate-400 mr-1"></i> {sub.studentPhone}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="inline-flex flex-col items-center justify-center">
                                <span className="text-lg font-black text-slate-900 leading-none">{sub.score}</span>
                                <span className="text-[10px] font-bold text-slate-400">/ {sub.totalMarks}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-xs font-black text-slate-600">{accuracy}%</span>
                            </td>
                            <td className="p-4 text-center">
                              {isSuspicious ? (
                                <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                  <i className="fas fa-exclamation-circle"></i> Flagged ({sub.warnings})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                  <i className="fas fa-shield-check"></i> Clean
                                </span>
                              )}
                            </td>
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

          </div>
        </div>
      </main>
    </div>
  );
}