"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function OnboardingContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSelecting, setIsSelecting] = useState(false);

  const isSwitching = searchParams.get("switch") === "true";

  // Check if they already have a role and bypass onboarding
  useEffect(() => {
    const checkExistingRole = async () => {
      if (user && !isSwitching) {
        const userRef = doc(db, "users", user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const role = userSnap.data().role;
          if (role === "educator") router.push("/educator/dashboard");
          if (role === "student") router.push("/student");
          if (role === "organization") router.push("/org/dashboard"); // Route to Org Hub
        }
      }
    };
    if (isLoaded) checkExistingRole();
  }, [user, isLoaded, router, isSwitching]);

  const handleRoleSelection = async (selectedRole) => {
    if (!user) return;
    setIsSelecting(true);

    try {
      await setDoc(doc(db, "users", user.id), {
        name: user.fullName || "User",
        email: user.primaryEmailAddress?.emailAddress || "",
        avatar: user.imageUrl || "",
        role: selectedRole,
        joinedAt: new Date() 
      }, { merge: true });

      // Route them based on their choice!
      if (selectedRole === "educator") {
        router.push("/educator/dashboard");
      } else if (selectedRole === "organization") {
        router.push("/create-org"); // Route to Clerk Org Setup
      } else {
        router.push("/student");
      }
    } catch (error) {
      console.error("Error saving role:", error);
      alert("Something went wrong. Please try again.");
      setIsSelecting(false);
    }
  };

  if (!isLoaded || isSelecting) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,theme(colors.indigo.100)_0%,transparent_100%)] opacity-50"></div>
        <div className="relative z-10 flex flex-col items-center">
            <i className="fas fa-circle-notch fa-spin text-5xl text-indigo-600 mb-4"></i>
            <h2 className="text-xl font-bold text-slate-700 animate-pulse">
                {isSelecting ? "Configuring your workspace..." : "Loading profile..."}
            </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* --- AMBIENT BACKGROUND EFFECTS --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-400/20 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-400/20 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-[40%] left-[40%] w-[600px] h-[600px] bg-violet-400/10 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '4s' }}></div>

      {/* Expanded to max-w-6xl to fit 3 columns */}
      <div className="max-w-6xl w-full relative z-10 text-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* --- OZONE LOGO --- */}
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-700 text-indigo-50 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-xl shadow-indigo-900/30 border border-indigo-400/30 transform -rotate-3">
          <i className="fas fa-book-open-reader"></i>
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500">OZONE</span>
        </h1>
        <p className="text-slate-500 mb-12 text-lg md:text-xl font-medium max-w-2xl mx-auto">
          To tailor your dashboard experience, please select how you will be using the platform today.
        </p>

        {/* Updated Grid to 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          
          {/* --- STUDENT CARD --- */}
          <button 
            onClick={() => handleRoleSelection("student")}
            className="group bg-white p-8 lg:p-10 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-2 transition-all duration-300 text-left flex flex-col h-full relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full pointer-events-none"></div>

            <div className="w-20 h-20 bg-slate-50 text-slate-400 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-indigo-700 group-hover:text-white rounded-2xl flex items-center justify-center text-4xl mb-8 transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-indigo-500/30">
              <i className="fas fa-user-graduate"></i>
            </div>
            
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 mb-4 tracking-tight">I am a Student</h3>
            <p className="text-slate-600 mb-10 flex-1 text-base lg:text-lg leading-relaxed">
              Join live GATE rooms, practice official PYQs, and review AI-generated explanations to strengthen your weak concepts.
            </p>
            
            <div className="text-sm lg:text-base font-black text-slate-400 group-hover:text-indigo-600 flex items-center gap-3 transition-colors mt-auto">
              Enter Student Portal <i className="fas fa-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
            </div>
          </button>

          {/* --- EDUCATOR CARD --- */}
          <button 
            onClick={() => handleRoleSelection("educator")}
            className="group bg-white p-8 lg:p-10 rounded-[2rem] border-2 border-slate-100 hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-2 transition-all duration-300 text-left flex flex-col h-full relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full pointer-events-none"></div>
            
            <div className="w-20 h-20 bg-slate-50 text-slate-400 group-hover:bg-gradient-to-br group-hover:from-emerald-400 group-hover:to-emerald-600 group-hover:text-white rounded-2xl flex items-center justify-center text-4xl mb-8 transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-emerald-500/30">
              <i className="fas fa-chalkboard-teacher"></i>
            </div>
            
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 mb-4 tracking-tight">I am an Educator</h3>
            <p className="text-slate-600 mb-10 flex-1 text-base lg:text-lg leading-relaxed">
              Upload past papers, leverage AI to generate MSQ/NAT questions, and host strict, anti-cheat mock exams for your students.
            </p>
            
            <div className="text-sm lg:text-base font-black text-slate-400 group-hover:text-emerald-600 flex items-center gap-3 transition-colors mt-auto">
              Access Exam Studio <i className="fas fa-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
            </div>
          </button>

          {/* --- ORGANIZATION CARD (NEW) --- */}
          <button 
            onClick={() => handleRoleSelection("organization")}
            className="group bg-white p-8 lg:p-10 rounded-[2rem] border-2 border-slate-100 hover:border-violet-500 hover:shadow-2xl hover:shadow-violet-500/20 hover:-translate-y-2 transition-all duration-300 text-left flex flex-col h-full relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 bg-violet-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-2xl z-10 shadow-md">B2B Hub</div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full pointer-events-none"></div>
            
            <div className="w-20 h-20 bg-slate-50 text-slate-400 group-hover:bg-gradient-to-br group-hover:from-violet-500 group-hover:to-violet-700 group-hover:text-white rounded-2xl flex items-center justify-center text-4xl mb-8 transition-all duration-300 shadow-sm group-hover:shadow-lg group-hover:shadow-violet-500/30">
              <i className="fas fa-building"></i>
            </div>
            
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 mb-4 tracking-tight">School / Org</h3>
            <p className="text-slate-600 mb-10 flex-1 text-base lg:text-lg leading-relaxed">
              Setup a dedicated workspace for your entire coaching center, manage multiple educators, and track batch analytics.
            </p>
            
            <div className="text-sm lg:text-base font-black text-slate-400 group-hover:text-violet-600 flex items-center gap-3 transition-colors mt-auto">
              Setup Workspace <i className="fas fa-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <i className="fas fa-circle-notch fa-spin text-5xl text-indigo-600"></i>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}