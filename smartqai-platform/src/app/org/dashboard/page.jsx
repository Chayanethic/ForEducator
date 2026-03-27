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

  // UI States
  const [examToDelete, setExamToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "mocks", examToDelete));
      setRecentExams(prev => prev.filter(exam => exam.id !== examToDelete));
      setExamToDelete(null);
    } catch (error) {
      alert("Error deleting exam. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isLoaded || !organization) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;
  }

  const hasNoExams = recentExams.length === 0 && !isLoadingExams;

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden w-full">
      
      {/* --- TUTORIAL / QUICK GUIDE MODAL --- */}
      {showTutorial && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="bg-indigo-600 p-6 md:p-8 text-white flex justify-between items-center relative overflow-hidden shrink-0">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <div>
                <h2 className="text-xl md:text-2xl font-black relative z-10">Platform Interface Guide</h2>
                <p className="text-indigo-200 mt-1 font-medium relative z-10 text-xs md:text-sm">Understand exactly what each button does.</p>
              </div>
              <button onClick={() => setShowTutorial(false)} className="w-8 h-8 md:w-10 md:h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition relative z-10 shrink-0 ml-4">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="p-4 md:p-8 space-y-4 md:space-y-6 overflow-y-auto">
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-start p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-lg md:text-xl shrink-0"><i className="fas fa-plus"></i></div>
                <div>
                  <h3 className="font-black text-slate-800 mb-1 text-sm md:text-base">New Exam Button (Top Right)</h3>
                  <p className="text-xs md:text-sm font-medium text-slate-600">Opens the Exam Studio. Here you upload your PDFs, let the AI extract questions, and publish the test securely to our servers.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-start p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-lg md:text-xl shrink-0"><i className="fas fa-code"></i></div>
                <div>
                  <h3 className="font-black text-slate-800 mb-1 text-sm md:text-base">Copy Embed Code (Dashboard)</h3>
                  <p className="text-xs md:text-sm font-medium text-slate-600">Generates an HTML iframe snippet. Send this code to your IT team to paste onto your school's website.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 items-start p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center text-lg md:text-xl shrink-0"><i className="fas fa-chart-line"></i></div>
                <div>
                  <h3 className="font-black text-slate-800 mb-1 text-sm md:text-base">View Results & Leads (Dashboard)</h3>
                  <p className="text-xs md:text-sm font-medium text-slate-600">Opens the Analytics Room. View every student who took the test, their phone numbers, email addresses, and scorecards.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ENTERPRISE DELETE MODAL --- */}
      {examToDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-rose-50 p-6 text-center border-b border-rose-100">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl md:text-3xl mx-auto mb-4 shadow-sm border border-rose-200">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-rose-900 mb-1">Delete Exam?</h2>
            </div>
            <div className="p-6 md:p-8">
              <p className="text-xs md:text-sm font-medium text-slate-600 mb-6 text-center leading-relaxed">
                Are you absolutely sure you want to delete this exam? Any student currently taking it will be instantly kicked out, and <strong className="text-rose-600">all associated leads and analytics will be permanently lost.</strong>
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button onClick={() => setExamToDelete(null)} disabled={isDeleting} className="w-full sm:flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 md:py-3.5 rounded-xl font-bold transition text-sm">Cancel</button>
                <button onClick={confirmDeleteExam} disabled={isDeleting} className="w-full sm:flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 md:py-3.5 rounded-xl font-black shadow-lg transition flex items-center justify-center gap-2 text-sm">
                  {isDeleting ? <><i className="fas fa-spinner fa-spin"></i> Deleting...</> : <><i className="fas fa-trash-alt"></i> Yes, Delete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MOBILE SIDEBAR OVERLAY --- */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* --- B2B ENTERPRISE SIDEBAR (Responsive) --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 md:w-72 bg-slate-900 text-white flex flex-col shrink-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        
        {/* Mobile Close Button */}
        <button 
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white lg:hidden w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg"
        >
          <i className="fas fa-times"></i>
        </button>

        <div className="h-20 flex items-center px-4 md:px-6 border-b border-slate-800 pt-4 lg:pt-0">
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
        <nav className="flex-1 p-4 space-y-2 mt-2">
            <button className="w-full flex items-center gap-3 bg-indigo-600 text-white p-3 md:p-3.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-900/20 transition hover:bg-indigo-500">
                <i className="fas fa-chart-pie w-5 text-center"></i> Overview
            </button>
            <button onClick={() => router.push('/org/create-mock')} className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 md:p-3.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-file-pdf w-5 text-center"></i> White-Label Exams
            </button>
            
            {/* NEW BRAND SETTINGS BUTTON */}
            <button onClick={() => router.push('/org/settings')} className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 md:p-3.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-palette w-5 text-center"></i> Brand Settings
            </button>
            
            <button className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 md:p-3.5 rounded-xl text-sm font-bold transition opacity-50 cursor-not-allowed">
                <i className="fas fa-users w-5 text-center"></i> Team (Coming Soon)
            </button>
        </nav>
        
        {/* Organization Brand Footer */}
        <div className="p-6 border-t border-slate-800 text-center">
           <div className="inline-flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
             <i className="fas fa-shield-alt text-indigo-500"></i> Enterprise Secured
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto relative w-full">
        
        {/* --- HEADER --- */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 md:h-20 px-4 md:px-8 flex justify-between items-center z-10 shrink-0 sticky top-0 shadow-sm">
          
          <div className="flex items-center gap-3 md:gap-4">
            {/* Hamburger Mobile Menu */}
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-slate-600 hover:text-indigo-600 transition w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"
            >
              <i className="fas fa-bars"></i>
            </button>

            <div className="hidden sm:block">
              <h1 className="text-lg md:text-2xl font-black text-slate-900 truncate max-w-[150px] md:max-w-md">{organization.name} Dashboard</h1>
              <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Enterprise Portal</p>
            </div>
            {/* Mobile Title (Compact) */}
            <div className="block sm:hidden">
              <h1 className="text-base font-black text-slate-900 truncate max-w-[120px]">{organization.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
             {/* Guide Button */}
             <button onClick={() => setShowTutorial(true)} className="hidden sm:flex text-slate-500 hover:text-indigo-600 text-sm font-bold transition items-center gap-2 mr-2">
               <i className="far fa-question-circle"></i> Guide
             </button>
             
             {/* PULSING NEW EXAM BUTTON */}
             <button onClick={() => router.push('/org/create-mock')} className={`px-3 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition flex items-center gap-2 relative shrink-0 ${hasNoExams ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-100 hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'}`}>
               {hasNoExams && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span>}
               <i className="fas fa-plus"></i> <span className="hidden sm:inline">New Exam</span><span className="sm:hidden">New</span>
             </button>
             
             <div className="h-6 md:h-8 w-px bg-slate-200 mx-1 md:mx-2"></div>
             <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* --- CONTENT AREA --- */}
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6 md:space-y-8">
          
          {/* QUICK STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:-translate-y-1 transition-transform duration-300">
               <div className="flex items-center gap-3 mb-2 text-slate-500"><i className="fas fa-file-alt text-indigo-500 bg-indigo-50 p-2 rounded-lg"></i> <h3 className="font-bold text-xs md:text-sm uppercase tracking-wide">Active Exams</h3></div>
               <span className="text-3xl md:text-4xl font-black text-slate-900">{isLoadingExams ? "-" : recentExams.length}</span>
            </div>
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 opacity-80 relative overflow-hidden">
               <div className="absolute top-2 right-2 bg-slate-100 text-slate-400 text-[8px] font-black px-2 py-1 rounded uppercase">Pro</div>
               <div className="flex items-center gap-3 mb-2 text-slate-500"><i className="fas fa-user-graduate text-emerald-500 bg-emerald-50 p-2 rounded-lg"></i> <h3 className="font-bold text-xs md:text-sm uppercase tracking-wide">Total Leads</h3></div>
               <span className="text-xl md:text-2xl font-bold text-slate-300 tracking-tight">Locked</span>
            </div>
            <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 opacity-80 relative overflow-hidden sm:col-span-2 md:col-span-1">
               <div className="absolute top-2 right-2 bg-slate-100 text-slate-400 text-[8px] font-black px-2 py-1 rounded uppercase">Pro</div>
               <div className="flex items-center gap-3 mb-2 text-slate-500"><i className="fas fa-shield-alt text-rose-500 bg-rose-50 p-2 rounded-lg"></i> <h3 className="font-bold text-xs md:text-sm uppercase tracking-wide">Avg Cheat Rate</h3></div>
               <span className="text-xl md:text-2xl font-bold text-slate-300 tracking-tight">Locked</span>
            </div>
          </div>

          {/* --- INTERACTIVE ONBOARDING EMPTY STATE --- */}
          {hasNoExams && (
            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border-2 border-slate-200 p-6 sm:p-10 md:p-14 shadow-xl relative overflow-hidden text-center">
              
              <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-50 text-indigo-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-3xl md:text-4xl mx-auto mb-4 md:mb-6 shadow-inner border border-indigo-100">
                <i className="fas fa-rocket"></i>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-3 md:mb-4">Welcome to your Enterprise Hub</h2>
              <p className="text-sm md:text-lg text-slate-500 font-medium max-w-2xl mx-auto mb-8 md:mb-12 px-4">
                Turn your institution's website into a lead generation machine. Here is how your workflow operates:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 relative">
                
                {/* Connecting Line (Desktop Only) */}
                <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-1 bg-slate-100 -translate-y-1/2 z-0 border-t-2 border-dashed border-slate-300"></div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 relative z-10 hover:-translate-y-2 transition-transform duration-300 shadow-sm">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-indigo-600 font-black text-lg md:text-xl mx-auto mb-3 md:mb-4 shadow-sm border border-slate-200">1</div>
                  <h3 className="font-black text-slate-800 mb-1.5 md:mb-2 text-sm md:text-base">Create Exam</h3>
                  <p className="text-[11px] md:text-xs font-bold text-slate-500 leading-relaxed">Upload a PDF. Our AI extracts the questions instantly. Publish it to our secure servers.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 relative z-10 hover:-translate-y-2 transition-transform duration-300 shadow-sm">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 font-black text-lg md:text-xl mx-auto mb-3 md:mb-4 shadow-sm border border-slate-200">2</div>
                  <h3 className="font-black text-slate-800 mb-1.5 md:mb-2 text-sm md:text-base">Embed on Website</h3>
                  <p className="text-[11px] md:text-xs font-bold text-slate-500 leading-relaxed">Copy the HTML iframe code we provide and paste it onto your school's website.</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 relative z-10 hover:-translate-y-2 transition-transform duration-300 shadow-sm">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-rose-600 font-black text-lg md:text-xl mx-auto mb-3 md:mb-4 shadow-sm border border-slate-200">3</div>
                  <h3 className="font-black text-slate-800 mb-1.5 md:mb-2 text-sm md:text-base">Collect Leads</h3>
                  <p className="text-[11px] md:text-xs font-bold text-slate-500 leading-relaxed">Students take the exam on your site. You get their emails, phone numbers, and anti-cheat data.</p>
                </div>
              </div>

              <div className="mt-10 md:mt-16 animate-bounce">
                <i className="fas fa-arrow-up text-2xl md:text-3xl text-indigo-300"></i>
                <p className="text-xs md:text-sm font-black text-indigo-500 mt-2 uppercase tracking-widest">Click "New Exam" to start</p>
              </div>
            </div>
          )}

          {/* THE RECENT EXAMS TABLE (Responsive) */}
          {recentExams.length > 0 && (
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="bg-slate-50 border-b border-slate-200 p-4 md:p-6 flex justify-between items-center">
                 <h2 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-wide flex items-center"><i className="fas fa-database text-indigo-500 mr-2 text-lg"></i> Deployed Exams</h2>
               </div>
               
               <div className="divide-y divide-slate-100">
                 {recentExams.map(exam => (
                   <div key={exam.id} className="p-4 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 hover:bg-slate-50/50 transition">
                     
                     <div className="flex-1 w-full">
                       <h3 className="font-black text-slate-900 text-base md:text-lg mb-2">{exam.title}</h3>
                       <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs font-bold text-slate-500">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 md:py-0.5 rounded border border-indigo-100 uppercase tracking-wider">{exam.examCategory || "General"}</span>
                          <span className="bg-slate-50 border border-slate-200 px-2 py-1 md:py-0.5 rounded"><i className="far fa-clock mr-1 text-slate-400"></i> {exam.duration} mins</span>
                          <span className="bg-slate-50 border border-slate-200 px-2 py-1 md:py-0.5 rounded"><i className="far fa-calendar-alt mr-1 text-slate-400"></i> {exam.createdAt?.toDate().toLocaleDateString() || "Recently"}</span>
                          <span className="text-slate-400 font-mono bg-slate-100 px-2 py-1 md:py-0.5 rounded border border-slate-200">ID: {exam.id}</span>
                       </div>
                     </div>
                     
                     {/* Action Buttons - Stacked on Mobile, Row on Desktop */}
                     <div className="flex flex-row flex-wrap lg:flex-nowrap items-center gap-2 md:gap-3 shrink-0 w-full lg:w-auto mt-2 lg:mt-0">
                       
                       <button onClick={() => copyIframeCode(exam.id)} className={`flex-1 lg:flex-none px-3 md:px-4 py-2.5 md:py-2.5 rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 border ${copiedId === exam.id ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                         {copiedId === exam.id ? <><i className="fas fa-check"></i> Copied</> : <><i className="fas fa-code"></i> Embed</>}
                       </button>

                       <button onClick={() => router.push(`/org/live-rooms/${exam.id}`)} className="flex-[2] lg:flex-none bg-slate-900 hover:bg-indigo-600 text-white px-4 md:px-6 py-2.5 md:py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2">
                         <i className="fas fa-chart-line"></i> <span className="hidden sm:inline">View Results & Leads</span><span className="sm:hidden">Results</span>
                       </button>

                       <button onClick={() => setExamToDelete(exam.id)} className="px-3 py-2.5 rounded-xl text-xs font-black text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border border-slate-200 lg:border-transparent transition flex items-center justify-center" title="Delete Exam">
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