"use client";

import { OrganizationList } from "@clerk/nextjs";
import Link from "next/link";

export default function OrgSelectionPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans selection:bg-indigo-100 selection:text-indigo-900 p-4 md:p-8 relative overflow-hidden">
      
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

      <div className="max-w-7xl w-full flex flex-col lg:flex-row gap-8 lg:gap-12 relative z-10 items-center">
        
        {/* --- LEFT COLUMN: THE B2B SALES PITCH (BENTO BOX DESIGN) --- */}
        <div className="w-full lg:w-7/12 flex flex-col justify-center animate-in fade-in slide-in-from-left-8 duration-700">
          
          <Link href="/" className="inline-flex items-center gap-3 mb-8 hover:opacity-80 transition group w-fit">
            <div className="bg-slate-900 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <i className="fas fa-book-open-reader text-white"></i>
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">OZONE <span className="text-indigo-600 font-medium">Enterprise</span></span>
          </Link>

          <h1 className="text-4xl md:text-5xl font-black mb-4 leading-[1.1] text-slate-900 tracking-tight">
            Turn your website into a <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">
              Lead Generation Engine.
            </span>
          </h1>
          <p className="text-slate-500 font-bold mb-8 text-lg">
            Create your workspace to access the ultimate B2B exam platform.
          </p>

          {/* BENTO GRID OF VALUE PROPS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Value Prop 1: Integration */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 group">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <i className="fas fa-code"></i>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">1-Minute Integration</h3>
              <p className="text-sm font-medium text-slate-500 mb-4">No developers needed. Just copy and paste our iframe directly onto your school's website.</p>
              <div className="bg-slate-900 p-3 rounded-xl font-mono text-[10px] text-emerald-400 overflow-hidden shadow-inner">
                <span className="text-indigo-400">&lt;iframe</span> src="ozone.app..." <span className="text-indigo-400">&gt;&lt;/iframe&gt;</span>
              </div>
            </div>

            {/* Value Prop 2: Cost Savings */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 group">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <i className="fas fa-piggy-bank"></i>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Zero Server Costs</h3>
              <p className="text-sm font-medium text-slate-500 mb-4">Stop paying massive monthly fees for clunky LMS software and expensive cloud hosting.</p>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 line-through text-sm font-bold">$1,000/mo LMS</span>
                <i className="fas fa-arrow-right text-slate-300"></i>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wide">Included in Ozone</span>
              </div>
            </div>

            {/* Value Prop 3: Profit & Lead Gen (Spans Full Width) */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-3xl border border-slate-800 shadow-lg md:col-span-2 hover:shadow-indigo-500/20 transition-all duration-300 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/30 transition-colors"></div>
              
              <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-black tracking-widest uppercase mb-4">
                    <i className="fas fa-magnet"></i> Maximize Profit
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">Capture High-Intent Leads</h3>
                  <p className="text-sm font-medium text-indigo-200/80">
                    Every time a student takes a free test on your website, our strict gateway securely captures their <strong>verified Email and Phone Number</strong>. Pass these highly-qualified leads directly to your sales team to sell your premium courses.
                  </p>
                </div>
                
                {/* Lead Visualizer */}
                <div className="w-full md:w-48 shrink-0 flex flex-col gap-2">
                  <div className="bg-white/10 border border-white/20 backdrop-blur-md p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center text-slate-900 text-[10px]"><i className="fas fa-user"></i></div><span className="text-xs font-bold text-white">Rahul M.</span></div>
                    <span className="text-[10px] text-emerald-300 font-bold">+91 98765...</span>
                  </div>
                  <div className="bg-white/10 border border-white/20 backdrop-blur-md p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-rose-400 flex items-center justify-center text-slate-900 text-[10px]"><i className="fas fa-user"></i></div><span className="text-xs font-bold text-white">Priya S.</span></div>
                    <span className="text-[10px] text-rose-300 font-bold">priya@gmail...</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* --- RIGHT COLUMN: THE WORKSPACE ENTRY (CLERK) --- */}
        <div className="w-full lg:w-5/12 flex items-center justify-center animate-in fade-in slide-in-from-right-8 duration-700">
           
           <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 p-8 md:p-10 relative overflow-hidden group">
             
             <div className="text-center mb-8 relative z-10">
               <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 border border-indigo-100 shadow-sm">
                 <i className="fas fa-building"></i>
               </div>
               <h2 className="text-2xl font-black text-slate-900 mb-2">Portal Access</h2>
               <p className="text-xs font-bold text-slate-500">Select an existing workspace or create a new one to continue to your dashboard.</p>
             </div>
             
             {/* Customized Clerk Component */}
             <div className="relative z-10">
               <OrganizationList 
                  hidePersonal={true}
                  afterSelectOrganizationUrl="/org/dashboard"
                  afterCreateOrganizationUrl="/org/dashboard"
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      cardBox: "w-full shadow-none bg-transparent p-0",
                      card: "shadow-none bg-transparent",
                      headerTitle: "hidden", 
                      headerSubtitle: "hidden",
                      
                      organizationPreviewMainIdentifier: "font-black text-slate-900 text-base",
                      organizationPreviewSecondaryIdentifier: "text-slate-500 text-xs font-bold",
                      
                      // Org List Buttons
                      organizationListPreviewButton: "border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-400 hover:shadow-md rounded-2xl p-4 transition-all duration-300 mb-3 w-full group",
                      organizationListPreviewItem: "w-full",
                      
                      // Create New Button
                      organizationListCreateOrganizationActionButton: "w-full border-2 border-dashed border-slate-300 bg-white hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700 rounded-2xl py-4 transition-all duration-300 mt-2 text-slate-600 font-black text-sm flex items-center justify-center gap-2",
                      
                      // Creation Form styling
                      formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl shadow-md transition-all uppercase tracking-wide text-xs w-full mt-4 hover:-translate-y-0.5",
                      formFieldInput: "bg-white border-slate-300 rounded-xl p-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-sm w-full transition-all",
                      formFieldLabel: "text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5",
                      avatarImageActionsUpload: "text-indigo-600 font-black text-xs px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition shadow-sm",
                      footer: "hidden",
                    }
                  }}
               />
             </div>
             
             <div className="mt-8 pt-6 border-t border-slate-100 text-center relative z-10">
               <Link href="/onboarding" className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition flex items-center justify-center gap-1.5 group">
                 <i className="fas fa-arrow-left group-hover:-translate-x-1 transition-transform"></i> Return to Solo Educator Portal
               </Link>
             </div>

           </div>
        </div>

      </div>
    </div>
  );
}