"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignUpContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role") || "default";

  // ⚡ DYNAMIC THEME ENGINE ⚡
  const THEMES = {
    student: {
      badge: "Student Registration",
      icon: "fa-user-graduate",
      glow1: "bg-indigo-600/30", glow2: "bg-blue-600/30",
      gradientText: "from-indigo-400 to-blue-400",
      iconBg: "from-indigo-500 to-blue-600 shadow-[0_0_30px_rgba(79,70,229,0.3)]",
      title: "Join the arena.",
      bullets: [
        { icon: "fa-gamepad", text: "Compete in live battles" },
        { icon: "fa-chart-line", text: "Track your rank & progress" },
        { icon: "fa-brain", text: "Learn from AI explanations" }
      ],
      buttonGradient: "from-indigo-600 to-blue-600 hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]",
    },
    educator: {
      badge: "Educator Application",
      icon: "fa-chalkboard-teacher",
      glow1: "bg-emerald-600/30", glow2: "bg-teal-600/30",
      gradientText: "from-emerald-400 to-teal-400",
      iconBg: "from-emerald-400 to-teal-500 shadow-[0_0_30px_rgba(52,211,153,0.3)]",
      title: "Create the future.",
      bullets: [
        { icon: "fa-wand-magic-sparkles", text: "AI-powered exam generation" },
        { icon: "fa-shield-alt", text: "Strict anti-cheat environments" },
        { icon: "fa-users", text: "Manage unlimited students" }
      ],
      buttonGradient: "from-emerald-500 to-teal-600 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]",
    },
    organization: {
      badge: "B2B Registration",
      icon: "fa-building",
      glow1: "bg-violet-600/30", glow2: "bg-fuchsia-600/30",
      gradientText: "from-violet-400 to-fuchsia-400",
      iconBg: "from-violet-500 to-fuchsia-600 shadow-[0_0_30px_rgba(139,92,246,0.3)]",
      title: "Setup your institution.",
      bullets: [
        { icon: "fa-building-user", text: "Create dedicated workspaces" },
        { icon: "fa-user-tie", text: "Manage multiple educators" },
        { icon: "fa-chart-pie", text: "Institution-wide analytics" }
      ],
      buttonGradient: "from-violet-600 to-fuchsia-600 hover:shadow-[0_0_30px_rgba(139,92,246,0.5)]",
    },
    default: {
      badge: "Create Account",
      icon: "fa-book-open-reader",
      glow1: "bg-slate-600/30", glow2: "bg-slate-500/30",
      gradientText: "from-slate-300 to-white",
      iconBg: "from-slate-600 to-slate-800 shadow-[0_0_30px_rgba(100,116,139,0.3)]",
      title: "Level up your potential.",
      bullets: [
        { icon: "fa-bolt", text: "Lightning fast creation" },
        { icon: "fa-brain", text: "AI-Powered Learning" },
        { icon: "fa-shield-halved", text: "Secure infrastructure" }
      ],
      buttonGradient: "from-slate-700 to-slate-900 hover:shadow-[0_0_30px_rgba(100,116,139,0.5)]",
    }
  };

  const theme = THEMES[role] || THEMES.default;

  return (
    <div className="flex min-h-screen bg-[#0B0F19] font-sans relative overflow-hidden selection:bg-white/20 selection:text-white">
      
      {/* --- GLOBAL RESPONSIVE AMBIENT MESH GRADIENT --- */}
      <div className={`absolute top-[-10%] left-[-20%] w-[140%] md:w-[70%] h-[70%] rounded-full ${theme.glow1} blur-[100px] md:blur-[150px] animate-pulse pointer-events-none z-0 transition-colors duration-1000`}></div>
      <div className={`absolute bottom-[-10%] right-[-20%] w-[140%] md:w-[60%] h-[80%] rounded-full ${theme.glow2} blur-[100px] md:blur-[150px] animate-pulse pointer-events-none z-0 transition-colors duration-1000`} style={{ animationDelay: "3s" }}></div>

      {/* --- LEFT SIDE: DESKTOP BRANDING PANEL --- */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 xl:p-24 z-10 border-r border-white/5 bg-[#0B0F19]/40 backdrop-blur-md">
        <div className="relative z-10 animate-in fade-in slide-in-from-left-8 duration-1000">
          <Link href="/" className="text-3xl font-black flex items-center gap-3 text-white tracking-tight hover:opacity-80 transition-opacity w-max">
            <div className={`bg-gradient-to-br ${theme.iconBg} w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 transition-all duration-1000`}>
              <i className={`fas ${theme.icon} text-xl`}></i>
            </div>
            OZONE
          </Link>
        </div>

        <div className="relative z-10 max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/90 font-bold text-xs uppercase tracking-widest mb-8 backdrop-blur-md shadow-inner">
            <i className={`fas ${theme.icon} text-white/50`}></i> {theme.badge}
          </div>
          <h1 className="text-5xl xl:text-6xl font-black text-white mb-8 leading-[1.15] tracking-tight">
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.gradientText} animate-gradient transition-all duration-1000`}>
              {theme.title}
            </span>
          </h1>
          
          <ul className="space-y-4 mt-8">
            {theme.bullets.map((bullet, i) => (
              <li key={i} className="flex items-center gap-4 bg-white/5 p-3.5 rounded-2xl backdrop-blur-sm border border-white/5 transition-all duration-1000 animate-in slide-in-from-left-4" style={{animationDelay: `${400 + (i*100)}ms`}}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 border border-white/10`}>
                  <i className={`fas ${bullet.icon} text-white/80`}></i>
                </div> 
                <span className="text-slate-300 font-bold text-sm tracking-wide">{bullet.text}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="relative z-10 flex items-center justify-between text-slate-500 font-bold text-sm">
          <span>© {new Date().getFullYear()} Ozone EdTech.</span>
        </div>
      </div>

      {/* --- RIGHT SIDE: RESPONSIVE AUTHENTICATION PANEL --- */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 md:p-12 relative z-20 overflow-y-auto">
        
        {/* ⚡ MOBILE & TABLET DYNAMIC HEADER ⚡ */}
        <div className="flex lg:hidden flex-col items-center text-center w-full max-w-md mb-6 mt-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <Link href="/" className={`w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br ${theme.iconBg} rounded-2xl flex items-center justify-center border border-white/10 mb-4 sm:mb-6 shadow-lg`}>
            <i className="fas fa-book-open-reader text-xl sm:text-2xl text-white"></i>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/90 font-black text-[10px] uppercase tracking-widest mb-3 backdrop-blur-md">
            <i className={`fas ${theme.icon} text-white/50`}></i> {theme.badge}
          </div>
          <h1 className={`text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r ${theme.gradientText} tracking-tight leading-tight`}>
            {theme.title}
          </h1>
        </div>

        <div className="w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-700 delay-150 relative pb-10 sm:pb-0">
          <div className="relative group">
            <div className={`absolute -inset-1 bg-gradient-to-r ${theme.gradientText} rounded-[3rem] blur-xl md:blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000`}></div>
            
            <div className="relative bg-[#111827]/70 md:bg-[#111827]/80 backdrop-blur-2xl md:backdrop-blur-3xl shadow-2xl border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-2 sm:p-5 overflow-hidden">
              <SignUp 
                fallbackRedirectUrl={`/onboarding?role=${role}`} 
                appearance={{
                  layout: { socialButtonsPlacement: "bottom", socialButtonsVariant: "blockButton", logoPlacement: "none" },
                  elements: {
                    card: "bg-transparent shadow-none w-full",
                    headerTitle: "text-2xl sm:text-3xl font-black text-white tracking-tight",
                    headerSubtitle: "text-slate-400 font-medium mt-1.5 text-sm sm:text-base",
                    socialButtonsBlockButton: "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 rounded-2xl py-3.5 sm:py-4 shadow-none",
                    socialButtonsBlockButtonText: "font-bold text-slate-200 text-sm",
                    socialButtonsProviderIcon: "filter invert-[0.8]",
                    formFieldLabel: "text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2",
                    formFieldInput: "w-full bg-[#0B0F19]/80 border border-white/10 rounded-2xl p-3.5 sm:p-4 text-sm sm:text-base font-bold text-white outline-none focus:bg-[#0B0F19] transition-all shadow-inner placeholder:text-slate-600",
                    formButtonPrimary: `w-full bg-gradient-to-r ${theme.buttonGradient} text-white font-black py-3.5 sm:py-4 rounded-2xl active:scale-[0.98] transition-all duration-300 ease-out text-sm sm:text-base mt-4`,
                    dividerLine: "bg-white/10",
                    dividerText: "text-slate-500 font-black text-[10px] uppercase tracking-widest bg-transparent",
                    footerActionText: "text-slate-400 font-medium text-xs sm:text-sm",
                    footerActionLink: "text-white font-black hover:underline transition-colors",
                    formFieldSuccessText: "text-emerald-400 font-bold text-xs",
                    formFieldErrorText: "text-rose-400 font-bold text-xs mt-1.5",
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function SignupWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0F19] flex items-center justify-center"><i className="fas fa-circle-notch fa-spin text-emerald-500 text-3xl"></i></div>}>
      <SignUpContent />
    </Suspense>
  );
}