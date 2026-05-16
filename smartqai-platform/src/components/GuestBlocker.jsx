"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GuestBlocker({ children, role = "student" }) {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  // While checking auth state, just render the component normally
  if (!isLoaded) return <>{children}</>;

  // If the user is logged in, render the functional feature!
  if (user) return <>{children}</>;

  // ⚡ IF GUEST: Render the Invisible Shield & Modal ⚡
  const themeColor = role === "educator" ? "emerald" : "indigo";

  return (
    <>
      <div 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }} 
        className="cursor-pointer relative group inline-block w-full"
      >
        {/* Invisible shield to intercept clicks */}
        <div className="absolute inset-0 z-50"></div> 
        <div className="opacity-70 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">
          {children}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 border border-slate-200">
            <div className={`w-16 h-16 bg-${themeColor}-50 text-${themeColor}-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-inner`}>
              <i className="fas fa-lock"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Guest Mode</h3>
            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
              You are currently exploring as a guest. Please sign in as a <strong>{role}</strong> to unlock this feature.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => router.push(`/sign-in?role=${role}`)} 
                className={`w-full bg-${themeColor}-600 text-white font-black py-3.5 rounded-xl hover:bg-${themeColor}-700 shadow-md shadow-${themeColor}-600/20 transition-all hover:-translate-y-0.5`}
              >
                Sign In to Unlock
              </button>
              <button 
                onClick={() => setShowModal(false)} 
                className="w-full bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-all"
              >
                Continue Exploring
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}