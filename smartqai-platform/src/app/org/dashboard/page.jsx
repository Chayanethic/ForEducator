"use client";

import { useOrganization, OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { collection, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function OrgDashboardPage() {
  const { organization, isLoaded } = useOrganization();
  const router = useRouter();

  const [recentExams, setRecentExams] = useState([]);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  // --- NEW: Custom Delete Modal State ---
  const [examToDelete, setExamToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Security Redirect
  useEffect(() => {
    if (isLoaded && !organization) {
      router.push("/org");
    }
  }, [isLoaded, organization, router]);

  // Fetch Exams for this Organization
  useEffect(() => {
    const fetchOrgExams = async () => {
      if (!organization) return;
      try {
        const qRef = query(
          collection(db, "mocks"), 
          where("orgId", "==", organization.id),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(qRef);
        const exams = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRecentExams(exams);
      } catch (error) {
        console.error("Error fetching exams:", error);
      } finally {
        setIsLoadingExams(false);
      }
    };
    if (isLoaded && organization) fetchOrgExams();
  }, [isLoaded, organization]);

  const copyIframeCode = (examId) => {
    const baseUrl = window.location.origin;
    const iframeCode = `<iframe \n  src="${baseUrl}/embed/exam/${examId}" \n  width="100%" \n  height="800px" \n  style="border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);" \n  allow="camera; microphone; fullscreen"\n></iframe>`;
    navigator.clipboard.writeText(iframeCode);
    setCopiedId(examId);
    setTimeout(() => setCopiedId(null), 3000);
  };

  // --- NEW: Custom Delete Execution ---
  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    setIsDeleting(true);

    try {
      // 1. Delete from Firebase
      await deleteDoc(doc(db, "mocks", examToDelete));
      
      // 2. Remove from local UI state instantly
      setRecentExams(prev => prev.filter(exam => exam.id !== examToDelete));
      
      // 3. Close Modal
      setExamToDelete(null);
    } catch (error) {
      console.error("Failed to delete exam:", error);
      alert("Error deleting exam. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isLoaded || !organization) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden">
      
      {/* --- ENTERPRISE DELETE MODAL --- */}
      {examToDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            
            <div className="bg-rose-50 p-6 text-center border-b border-rose-100">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 shadow-sm border border-rose-200">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h2 className="text-2xl font-black text-rose-900 mb-1">Delete Exam?</h2>
              <p className="text-rose-700/80 font-bold text-sm">This action cannot be undone.</p>
            </div>

            <div className="p-6 md:p-8">
              <p className="text-sm font-medium text-slate-600 mb-6 text-center leading-relaxed">
                Are you absolutely sure you want to delete this exam? Any student currently taking it will be instantly kicked out, and <strong className="text-rose-600">all associated leads and analytics will be permanently lost.</strong>
              </p>

              <div className="flex gap-4">
                <button 
                  onClick={() => setExamToDelete(null)} 
                  disabled={isDeleting}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3.5 rounded-xl font-bold transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteExam} 
                  disabled={isDeleting}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3.5 rounded-xl font-black shadow-lg shadow-rose-600/20 transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isDeleting ? <><i className="fas fa-spinner fa-spin"></i> Deleting...</> : <><i className="fas fa-trash-alt"></i> Yes, Delete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* B2B ENTERPRISE SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 z-50">
        <div className="h-20 flex items-center px-6 border-b border-slate-800">
          <OrganizationSwitcher 
            hidePersonal={true}
            appearance={{
              elements: {
                organizationSwitcherTrigger: "text-white hover:bg-slate-800 px-3 py-2 rounded-xl transition w-full flex justify-between",
                organizationSwitcherTriggerIcon: "text-slate-400",
              }
            }}
          />
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
            <button className="w-full flex items-center gap-3 bg-indigo-600 text-white p-3 rounded-xl text-sm font-bold shadow-md shadow-indigo-900/20">
                <i className="fas fa-chart-pie w-5"></i> Overview
            </button>
            <button onClick={() => router.push('/org/create-mock')} className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-xl text-sm font-bold transition">
                <i className="fas fa-file-pdf w-5"></i> White-Label Exams
            </button>
            <button className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-xl text-sm font-bold transition opacity-50 cursor-not-allowed" title="Coming Soon">
                <i className="fas fa-users w-5"></i> Team Management
            </button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto">
        
        {/* HEADER */}
        <header className="bg-white border-b border-slate-200 h-20 px-8 flex justify-between items-center z-10 shrink-0 sticky top-0">
          <div>
            <h1 className="text-2xl font-black text-slate-900">{organization.name} Dashboard</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Enterprise Portal</p>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => router.push('/org/create-mock')} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold border border-indigo-200 hover:bg-indigo-100 hover:shadow-sm transition">
               <i className="fas fa-plus mr-2"></i> New Exam
             </button>
             <div className="h-8 w-px bg-slate-200"></div>
             <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* CONTENT */}
        <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
          
          {/* QUICK STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
               <div className="flex items-center gap-3 mb-2 text-slate-500"><i className="fas fa-file-alt text-indigo-500"></i> <h3 className="font-bold text-sm uppercase">Active Exams</h3></div>
               <span className="text-4xl font-black text-slate-900">{isLoadingExams ? "-" : recentExams.length}</span>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 opacity-70">
               <div className="flex items-center gap-3 mb-2 text-slate-500"><i className="fas fa-user-graduate text-emerald-500"></i> <h3 className="font-bold text-sm uppercase">Total Leads Collected</h3></div>
               <span className="text-xl font-bold text-slate-400">Available in Pro</span>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 opacity-70">
               <div className="flex items-center gap-3 mb-2 text-slate-500"><i className="fas fa-shield-alt text-rose-500"></i> <h3 className="font-bold text-sm uppercase">Avg. Cheat Rate</h3></div>
               <span className="text-xl font-bold text-slate-400">Available in Pro</span>
            </div>
          </div>

          {/* ACTION BANNER */}
          {recentExams.length === 0 && !isLoadingExams && (
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-8 md:p-10 text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between border border-indigo-500/30">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="relative z-10 max-w-xl mb-6 md:mb-0">
                 <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block">Getting Started</span>
                 <h2 className="text-3xl font-black mb-3">Deploy your first Exam</h2>
                 <p className="text-indigo-200 text-sm font-medium leading-relaxed">
                   Upload a PDF, generate questions, and get a secure white-label HTML snippet to embed on your website. Start collecting student leads today.
                 </p>
              </div>
              <button onClick={() => router.push('/org/create-mock')} className="relative z-10 shrink-0 bg-white text-indigo-900 px-8 py-4 rounded-xl font-black shadow-xl hover:scale-105 hover:shadow-indigo-500/20 transition-all flex items-center gap-3">
                <i className="fas fa-magic"></i> Open Exam Studio
              </button>
            </div>
          )}

          {/* THE RECENT EXAMS TABLE */}
          {recentExams.length > 0 && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
                 <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide"><i className="fas fa-database text-indigo-500 mr-2"></i> Deployed Exams</h2>
               </div>
               
               <div className="divide-y divide-slate-100">
                 {recentExams.map(exam => (
                   <div key={exam.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                     
                     <div className="flex-1">
                       <h3 className="font-black text-slate-900 text-lg mb-1">{exam.title}</h3>
                       <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">{exam.examCategory || "General"}</span>
                          <span><i className="far fa-clock mr-1"></i> {exam.duration} mins</span>
                          <span><i className="far fa-calendar-alt mr-1"></i> {exam.createdAt?.toDate().toLocaleDateString() || "Recently"}</span>
                          <span className="text-slate-400 font-mono bg-slate-100 px-2 rounded">ID: {exam.id}</span>
                       </div>
                     </div>
                     
                     <div className="flex flex-wrap items-center gap-3 shrink-0">
                       
                       {/* COPY IFRAME BUTTON */}
                       <button 
                         onClick={() => copyIframeCode(exam.id)} 
                         className={`px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 border ${copiedId === exam.id ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                       >
                         {copiedId === exam.id ? <><i className="fas fa-check"></i> Copied HTML</> : <><i className="fas fa-code"></i> Copy Embed</>}
                       </button>

                       {/* VIEW RESULTS BUTTON */}
                       <button 
                         onClick={() => router.push(`/org/live-rooms/${exam.id}`)} 
                         className="bg-slate-900 hover:bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center gap-2"
                       >
                         <i className="fas fa-chart-line"></i> View Results & Leads
                       </button>

                       {/* NEW: BEAUTIFUL DELETE BUTTON */}
                       <button 
                         onClick={() => setExamToDelete(exam.id)} 
                         className="px-3 py-2.5 rounded-xl text-xs font-black text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-transparent transition flex items-center justify-center"
                         title="Delete Exam"
                       >
                         <i className="fas fa-trash"></i>
                       </button>
                     </div>

                   </div>
                 ))}
               </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}