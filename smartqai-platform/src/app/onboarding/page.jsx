"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// We extract the main content into a separate component so we can wrap it in Suspense
function OnboardingContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSelecting, setIsSelecting] = useState(false);

  // Check if the user is explicitly trying to switch roles via the URL parameter
  const isSwitching = searchParams.get("switch") === "true";

  // Check if they already chose a role in the past to skip this page
  useEffect(() => {
    const checkExistingRole = async () => {
      // ONLY auto-redirect if they are logged in AND they are NOT trying to switch roles
      if (user && !isSwitching) {
        const userRef = doc(db, "users", user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const role = userSnap.data().role;
          if (role === "educator") router.push("/educator/create-mock");
          if (role === "student") router.push("/student");
        }
      }
    };
    if (isLoaded) checkExistingRole();
  }, [user, isLoaded, router, isSwitching]);

  const handleRoleSelection = async (selectedRole) => {
    if (!user) return;
    setIsSelecting(true);

    try {
      // Save the user profile and role to Firebase globally
      await setDoc(doc(db, "users", user.id), {
        name: user.fullName || "User",
        email: user.primaryEmailAddress?.emailAddress || "",
        avatar: user.imageUrl || "",
        role: selectedRole,
        joinedAt: new Date() // Note: merge: true prevents overwriting joinedAt on subsequent switches
      }, { merge: true });

      // Route them based on selection
      if (selectedRole === "educator") {
        router.push("/educator/create-mock");
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl"></div>

      <div className="max-w-3xl w-full relative z-10 text-center">
        <div className="w-16 h-16 bg-white text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm border border-slate-100">
          <i className="fas fa-user-astronaut"></i>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-slate-800 mb-3">How will you use SmartQAI?</h1>
        <p className="text-slate-500 mb-10 text-lg">Choose your primary role to set up your dashboard.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Educator Card */}
          <button 
            onClick={() => handleRoleSelection("educator")}
            className="group bg-white p-8 rounded-3xl border-2 border-slate-100 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all text-left flex flex-col h-full"
          >
            <div className="w-16 h-16 bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mb-6 transition-colors">
              <i className="fas fa-chalkboard-teacher"></i>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">I am an Educator</h3>
            <p className="text-slate-500 mb-8 flex-1">I want to upload PDFs, extract questions using AI, and host live mock exams for my students.</p>
            <div className="text-sm font-bold text-slate-400 group-hover:text-emerald-600 flex items-center gap-2 transition-colors">
              Continue as Educator <i className="fas fa-arrow-right"></i>
            </div>
          </button>

          {/* Student Card */}
          <button 
            onClick={() => handleRoleSelection("student")}
            className="group bg-white p-8 rounded-3xl border-2 border-slate-100 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all text-left flex flex-col h-full"
          >
            <div className="w-16 h-16 bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mb-6 transition-colors">
              <i className="fas fa-user-graduate"></i>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">I am a Student</h3>
            <p className="text-slate-500 mb-8 flex-1">I want to join live exams, practice previous papers, and get AI-driven insights on my weak topics.</p>
            <div className="text-sm font-bold text-slate-400 group-hover:text-indigo-600 flex items-center gap-2 transition-colors">
              Continue as Student <i className="fas fa-arrow-right"></i>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}

// Next.js requires useSearchParams to be wrapped in a Suspense boundary
export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}