"use client";

import { CreateOrganization } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function CreateOrgPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/20 blur-[120px] pointer-events-none z-0"></div>

      <div className="z-10 flex flex-col items-center w-full max-w-md px-4">
        
        <button 
          onClick={() => router.push('/onboarding')} 
          className="self-start mb-6 text-slate-500 hover:text-indigo-600 font-bold text-sm flex items-center gap-2 transition-colors active:scale-95"
        >
          <i className="fas fa-arrow-left"></i> Back to roles
        </button>

        <div className="text-center mb-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-[0_0_30px_rgba(79,70,229,0.3)]">
            <i className="fas fa-building"></i>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Setup Workspace</h1>
          <p className="text-slate-500 font-medium">Create a dedicated hub for your school or tutoring center.</p>
        </div>
        
        <div className="w-full shadow-2xl rounded-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-500 delay-150">
          {/* This is the component that shows the Name & Photo upload! */}
          <CreateOrganization 
              afterCreateOrganizationUrl="/org/dashboard" 
              skipInvitationScreen={true}
              appearance={{
                elements: {
                  rootBox: "w-full flex justify-center",
                  card: "w-full shadow-none border-none",
                }
              }}
          />
        </div>

      </div>
    </div>
  );
}