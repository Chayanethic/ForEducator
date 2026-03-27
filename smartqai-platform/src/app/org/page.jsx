import { OrganizationList } from "@clerk/nextjs";
import Link from "next/link";

export default function B2BPortalPage() {
  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans relative overflow-hidden">
      
      {/* Background Decorations */}
      <div className="absolute top-0 left-0 w-full h-96 bg-indigo-900 rounded-b-[100px] shadow-2xl z-0"></div>
      <div className="absolute top-10 left-20 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl z-0"></div>

      <header className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3 text-white">
          <i className="fas fa-building text-3xl text-emerald-400"></i>
          <span className="text-2xl font-black tracking-tight">OZONE <span className="font-light opacity-80">Enterprise</span></span>
        </div>
        <Link href="/onboarding?switch=true" className="text-sm font-bold text-indigo-200 hover:text-white transition">
          Switch to Solo Educator <i className="fas fa-arrow-right ml-1"></i>
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 -mt-10">
        <div className="text-center mb-8 text-white">
          <h1 className="text-4xl font-black mb-3">Welcome to your Workspace</h1>
          <p className="text-indigo-200 font-medium">Select your institution or create a new organization to get started.</p>
        </div>

        {/* CLERK MAGIC: This one component handles creating, joining, and selecting Orgs! */}
        <div className="bg-white p-2 rounded-2xl shadow-2xl border border-slate-100">
          <OrganizationList 
            hidePersonal={true} // Forces them to use a Business Workspace, not a personal account
            afterSelectOrganizationUrl="/org/dashboard" // Where to go after clicking an org
            afterCreateOrganizationUrl="/org/dashboard" // Where to go after making a new org
            appearance={{
              elements: {
                rootBox: "w-full min-w-[350px]",
                cardBox: "shadow-none border-none",
                headerTitle: "text-lg font-black text-slate-800",
                organizationSwitcherTrigger: "border-2 border-slate-200 rounded-xl px-4 py-2",
                formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md",
              }
            }}
          />
        </div>
      </main>
    </div>
  );
}