import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function LandingPage() {
  // Securely check if the user is logged in on the server
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative overflow-x-hidden flex flex-col w-full" style={{ scrollBehavior: "smooth" }}>
      
      {/* --- AMBIENT BACKGROUND EFFECTS (Responsive) --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-indigo-400/20 rounded-full blur-[80px] sm:blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-emerald-400/20 rounded-full blur-[80px] sm:blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

      {/* --- NAVBAR --- */}
      <nav className="border-b border-slate-200/50 bg-white/80 backdrop-blur-md fixed w-full z-50 top-0 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          
          {/* --- OZONE LOGO --- */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition cursor-pointer select-none">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-lg shadow-indigo-900/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <i className="fas fa-book-open-reader text-indigo-50 text-sm sm:text-lg"></i>
            </div>
            <div className="flex flex-col justify-center">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-none mt-1">
                    OZONE
                </span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition">Features</a>
            <a href="#enterprise" className="hover:text-indigo-600 transition">For Institutions</a>
            <a href="#pricing" className="hover:text-indigo-600 transition">Pricing</a>
            
            <Link href="/sign-in?redirect_url=/org/dashboard" className="flex items-center gap-2 text-indigo-700 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition shadow-sm border border-indigo-100 hover:scale-105 transform cursor-pointer">
              <i className="fas fa-building"></i> Enterprise Login
            </Link>
          </div>
          
          {/* Desktop Auth Buttons (Hidden on Tablets/Mobile) */}
          <div className="hidden lg:flex items-center gap-3 text-sm font-bold">
            {userId ? (
              <Link href="/onboarding" className="bg-slate-900 text-white px-6 py-2.5 rounded-full hover:bg-indigo-600 transition-all shadow-md hover:shadow-indigo-600/30 flex items-center gap-2">
                Dashboard <i className="fas fa-arrow-right"></i>
              </Link>
            ) : (
              <>
                <a href="#portals" className="text-slate-600 hover:text-indigo-600 transition px-4 py-2">Log in</a>
                <a href="#portals" className="bg-slate-900 text-white px-6 py-2.5 rounded-full hover:bg-indigo-600 transition-all shadow-md hover:shadow-indigo-600/30">
                  Sign up free
                </a>
              </>
            )}
          </div>

          {/* ⚡ Mobile & Tablet Auth Dropdown Menu ⚡ */}
          <div className="lg:hidden flex items-center group relative">
             {userId ? (
                <Link href="/onboarding" className="bg-slate-900 text-white px-5 py-2 rounded-full text-xs font-black shadow-md flex items-center gap-2">
                  Dashboard <i className="fas fa-arrow-right"></i>
                </Link>
             ) : (
                <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-black shadow-md flex items-center gap-2 hover:bg-indigo-700 transition">
                  Get Started <i className="fas fa-rocket"></i>
                </button>
             )}
             
             {/* Mobile/Tablet Dropdown Container */}
             {!userId && (
               <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col overflow-hidden">
                 <div className="bg-slate-50 border-b border-slate-100 px-4 py-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Portal</span>
                 </div>
                 
                 <Link href="/sign-in?redirect_url=/student" className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50 text-left transition text-slate-700 text-sm font-bold w-full border-b border-slate-100">
                   <i className="fas fa-user-graduate text-indigo-500 w-4"></i> Student
                 </Link>
                 
                 <Link href="/sign-in?redirect_url=/educator/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-violet-50 text-left transition text-slate-700 text-sm font-bold w-full border-b border-slate-100">
                   <i className="fas fa-chalkboard-teacher text-violet-500 w-4"></i> Educator
                 </Link>
                 
                 <Link href="/sign-in?redirect_url=/org/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 text-left transition text-slate-700 text-sm font-bold w-full">
                   <i className="fas fa-building text-emerald-500 w-4"></i> Enterprise
                 </Link>
               </div>
             )}
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="pt-28 sm:pt-40 pb-10 px-4 sm:px-6 relative z-10 flex-1 w-full">
        <div className="max-w-5xl mx-auto text-center w-full">
          
          <div className="inline-flex items-center gap-2 mb-6 sm:mb-8 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white border border-indigo-100 text-indigo-700 text-[10px] sm:text-xs font-black tracking-wide uppercase shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Powered by Gemini 2.5 Flash
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 mb-6 sm:mb-8 leading-[1.1] sm:leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Transform PDFs into <br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500">
              Live Mock Exams
            </span> in seconds.
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-10 sm:mb-12 max-w-2xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 px-2">
            The ultimate Adaptive Exam Engine for Students and Institutions. Extract questions instantly, host strict anti-cheat environments, and generate deep AI performance analytics.
          </p>
          
          {!userId ? (
            <>
              {/* ⚡ DESKTOP ONLY: Standard CTA Buttons ⚡ */}
              <div className="hidden lg:flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 w-full sm:w-auto px-4 sm:px-0">
                <a href="#portals" className="w-full sm:w-auto bg-indigo-600 text-white text-base sm:text-lg font-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition transform hover:-translate-y-1 text-center">
                  Get Started for Free
                </a>
                <a href="#enterprise" className="w-full sm:w-auto bg-white text-slate-800 border-2 border-slate-200 text-base sm:text-lg font-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition flex items-center justify-center gap-2 group">
                  <i className="fas fa-building text-indigo-500 group-hover:scale-110 transition-transform"></i> See B2B Features
                </a>
              </div>

              {/* ⚡ MOBILE & TABLET ONLY: App-Style Quick Start Dock ⚡ */}
              <div id="mobile-dock" className="flex lg:hidden flex-col items-center mt-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 w-full px-2 scroll-mt-24">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tap your portal to begin</p>
                 
                 <div className="flex items-center justify-center w-full max-w-md mx-auto bg-white/60 backdrop-blur-xl border border-slate-200 p-2 rounded-[2rem] shadow-xl shadow-indigo-900/10">
                    
                    {/* Student Dock Button */}
                    <Link href="/sign-in?redirect_url=/student" className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl hover:bg-indigo-50 transition cursor-pointer group">
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform"><i className="fas fa-user-graduate"></i></div>
                      <span className="text-[10px] font-black text-slate-700 tracking-wide">Student</span>
                    </Link>

                    <div className="w-px h-12 bg-slate-200 mx-1"></div>

                    {/* Educator Dock Button */}
                    <Link href="/sign-in?redirect_url=/educator/dashboard" className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl hover:bg-violet-50 transition cursor-pointer group">
                      <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform"><i className="fas fa-chalkboard-teacher"></i></div>
                      <span className="text-[10px] font-black text-slate-700 tracking-wide">Educator</span>
                    </Link>

                    <div className="w-px h-12 bg-slate-200 mx-1"></div>

                    {/* Enterprise Dock Button */}
                    <Link href="/sign-in?redirect_url=/org/dashboard" className="flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl hover:bg-emerald-50 transition cursor-pointer group">
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl shadow-sm group-hover:scale-110 transition-transform"><i className="fas fa-building"></i></div>
                      <span className="text-[10px] font-black text-slate-700 tracking-wide">Enterprise</span>
                    </Link>

                 </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 w-full sm:w-auto px-4 sm:px-0">
              <Link href="/onboarding" className="w-full sm:w-auto inline-flex bg-indigo-600 text-white text-base sm:text-lg font-black px-6 sm:px-10 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition transform hover:-translate-y-1 items-center justify-center gap-3">
                Enter Workspace <i className="fas fa-rocket"></i>
              </Link>
            </div>
          )}

          {/* --- TRUSTED BRANDS SECTION --- */}
          <div className="mt-12 sm:mt-16 pt-8 border-t border-slate-200/60 max-w-4xl mx-auto animate-in fade-in duration-1000 delay-500">
            <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-6 sm:mb-8">Trusted by top institutions</p>
            <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-12 md:gap-24 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                <img src="https://res.cloudinary.com/dnpudf84r/image/upload/v1774474653/jis_p8zlvw.png" alt="JIS Group Logo" className="h-10 sm:h-14 w-auto object-contain hover:scale-105 transition-transform" />
                <img src="https://res.cloudinary.com/dnpudf84r/image/upload/v1774474777/download_zfvub0.jpg" alt="NIT Logo" className="h-10 sm:h-14 w-auto object-contain hover:scale-105 transition-transform" />
            </div>
          </div>
          
        </div>

        {/* --- ⚡ DESKTOP LOGIN GRID (Hidden on Mobile & Tablets) --- */}
        {!userId && (
          <div id="portals" className="hidden lg:grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto mt-24 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 px-4 sm:px-0">
            
            {/* 1. STUDENT PORTAL */}
            <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-xl shadow-indigo-900/5 hover:-translate-y-2 hover:border-indigo-300 transition-all duration-300 flex flex-col h-full text-center group">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <i className="fas fa-user-graduate"></i>
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-3">Student</h2>
              <p className="text-slate-500 font-medium text-sm mb-8 flex-1">
                Access your personal dashboard, take AI-generated mock exams, and view your scorecards.
              </p>
              <Link href="/sign-in?redirect_url=/student" className="block w-full bg-indigo-600 text-white py-3 rounded-xl font-black shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition text-center">
                Student Login
              </Link>
            </div>

            {/* 2. SOLO EDUCATOR PORTAL */}
            <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-xl shadow-violet-900/5 hover:-translate-y-2 hover:border-violet-300 transition-all duration-300 flex flex-col h-full text-center group">
              <div className="w-16 h-16 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-6 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <i className="fas fa-chalkboard-teacher"></i>
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-3">Solo Educator</h2>
              <p className="text-slate-500 font-medium text-sm mb-8 flex-1">
                Create AI mock exams, manage your personal library, and share private test links.
              </p>
              <Link href="/sign-in?redirect_url=/educator/dashboard" className="block w-full bg-violet-600 text-white py-3 rounded-xl font-black shadow-lg shadow-violet-600/30 hover:bg-violet-700 transition text-center">
                Educator Login
              </Link>
            </div>

            {/* 3. ENTERPRISE (ORG) PORTAL */}
            <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 shadow-xl shadow-emerald-900/5 hover:-translate-y-2 hover:border-emerald-300 transition-all duration-300 flex flex-col h-full text-center group relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest">B2B</div>
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <i className="fas fa-building"></i>
              </div>
              <h2 className="text-xl font-black text-slate-800 mb-3">Enterprise</h2>
              <p className="text-slate-500 font-medium text-sm mb-8 flex-1">
                Manage your institution, generate embed codes, and view lead analytics for your school.
              </p>
              <Link href="/sign-in?redirect_url=/org/dashboard" className="block w-full bg-emerald-600 text-white py-3 rounded-xl font-black shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition text-center">
                Enterprise Login
              </Link>
            </div>

          </div>
        )}

        {/* --- FEATURE CARDS GRID (CORE ENGINE) --- */}
        <div id="features" className="max-w-6xl mx-auto mt-20 sm:mt-32 grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 scroll-mt-24 sm:scroll-mt-32 px-4 w-full">
          
          <div className="bg-white p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-100 transition-all duration-500 group md:hover:-translate-y-1">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
              <i className="fas fa-robot"></i>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-3 sm:mb-4">AI Question Extraction</h3>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-lg font-medium">
              Just upload your past paper PDFs. Ozone's AI instantly parses text, detects diagrams, and categorizes MSQ, MCQ, and NAT questions flawlessly.
            </p>
          </div>
          
          <div className="bg-white p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-100 transition-all duration-500 group relative overflow-hidden md:hover:-translate-y-1">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] sm:text-xs font-black px-4 sm:px-6 py-1.5 sm:py-2 rounded-bl-xl sm:rounded-bl-2xl uppercase tracking-widest shadow-md">Strict Mode</div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <i className="fas fa-laptop-code"></i>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-3 sm:mb-4">TCS iON Environment</h3>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-lg font-medium">
              Students experience the exact UI of real competitive exams like GATE and JEE, complete with virtual calculators, marking palettes, and auto-submit timers.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-100 transition-all duration-500 group md:hover:-translate-y-1">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-50 text-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
              <i className="fas fa-chart-pie"></i>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-3 sm:mb-4">Deep AI Analytics</h3>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-lg font-medium">
              Educators get instant live leaderboards. Students get official AI-generated solutions and dynamic Action Plans targeting their specific weak areas.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-rose-500/10 hover:border-rose-100 transition-all duration-500 group md:hover:-translate-y-1">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-rose-50 text-rose-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-6 sm:mb-8 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
              <i className="fas fa-gamepad"></i>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-3 sm:mb-4">Battle with Friends</h3>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-lg font-medium">
              Studying doesn't have to be boring. Create private rooms and challenge your friends to real-time, fast-paced quiz battles on any topic.
            </p>
          </div>

        </div>

        {/* --- MASSIVE B2B ENTERPRISE SECTION (BENTO BOX) --- */}
        <div id="enterprise" className="max-w-6xl mx-auto mt-24 sm:mt-32 scroll-mt-20 sm:scroll-mt-24 px-4 w-full">
          
          <div className="text-center mb-10 sm:mb-16">
            <span className="bg-indigo-500/10 text-indigo-700 border border-indigo-200 text-[10px] font-black px-3 sm:px-4 py-1.5 rounded-full uppercase tracking-widest mb-4 inline-flex items-center gap-2 shadow-sm">
              <i className="fas fa-crown text-amber-500"></i> Ozone for Organizations
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 sm:mb-6 tracking-tight">Turn your website into a <br className="hidden sm:block"/> <span className="text-indigo-600">Lead Generation Engine.</span></h2>
            <p className="text-base sm:text-lg text-slate-500 font-medium max-w-2xl mx-auto">
              We provide Coaching Centers and Universities with a strict, anti-cheat exam engine. Embed white-label exams directly onto your own website, capture leads, and automate scorecard emails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Value Prop 1: Integration */}
            <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between">
              
              <div className="absolute -right-10 -top-10 w-32 sm:w-40 h-32 sm:h-40 bg-indigo-50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors duration-500 pointer-events-none"></div>
              
              <div className="relative z-10 mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-50 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl mb-4 sm:mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <i className="fas fa-code"></i>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3">1-Minute Integration</h3>
                <p className="text-sm sm:text-base font-medium text-slate-500">No developers needed. Just copy and paste our iframe directly onto your WordPress, Notion, or custom website.</p>
              </div>

              {/* Responsive Tilted Code Window */}
              <div className="relative z-10 w-full mt-auto">
                <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-2xl transform rotate-0 sm:rotate-3 sm:group-hover:rotate-0 sm:group-hover:-translate-y-2 transition-all duration-500 w-full sm:w-[110%] sm:-ml-[5%]">
                  <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-rose-500 shadow-sm"></div>
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-amber-500 shadow-sm"></div>
                    <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-emerald-500 shadow-sm"></div>
                  </div>
                  <div className="font-mono text-[10px] sm:text-xs md:text-[11px] lg:text-xs text-emerald-400 overflow-hidden leading-relaxed break-all">
                    <span className="text-indigo-400">&lt;iframe</span><br/>
                    &nbsp;&nbsp;src="https://ozone.app/embed/..."<br/>
                    &nbsp;&nbsp;width="100%" allow="fullscreen"<br/>
                    <span className="text-indigo-400">&gt;&lt;/iframe&gt;</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Value Prop 2: Cost Savings */}
            <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-500 group relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -right-10 -bottom-10 w-32 sm:w-40 h-32 sm:h-40 bg-emerald-50 rounded-full blur-2xl group-hover:bg-emerald-100 transition-colors duration-500 pointer-events-none"></div>
              
              <div className="relative z-10 mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 text-emerald-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl mb-4 sm:mb-6 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                  <i className="fas fa-piggy-bank"></i>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 sm:mb-3">Zero Server Costs</h3>
                <p className="text-sm sm:text-base font-medium text-slate-500">Stop paying massive monthly fees for clunky LMS software and expensive cloud hosting. Our Redis cache handles 10,000+ simultaneous students effortlessly.</p>
              </div>

              <div className="relative z-10 mt-auto">
                <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-xl sm:rounded-2xl flex flex-col gap-2 sm:gap-3 group-hover:shadow-md group-hover:border-emerald-200 sm:group-hover:-translate-y-1 transition-all duration-500">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 line-through text-xs sm:text-sm font-bold">Traditional LMS Servers</span>
                    <span className="text-slate-400 line-through text-xs sm:text-sm font-bold">$1,000/mo</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 sm:pt-3">
                    <span className="text-emerald-700 font-black text-xs sm:text-base flex items-center gap-1.5 sm:gap-2"><i className="fas fa-check-circle"></i> Ozone Enterprise</span>
                    <span className="bg-emerald-100 text-emerald-700 px-2 sm:px-3 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wide group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">Included</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Value Prop 3: Profit & Lead Gen */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 sm:p-8 md:p-12 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-800 shadow-xl md:col-span-2 hover:shadow-indigo-500/30 transition-all duration-500 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/40 transition-colors duration-700"></div>
              <div className="absolute left-0 bottom-0 w-40 sm:w-64 h-40 sm:h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="flex flex-col md:flex-row gap-8 sm:gap-10 items-center relative z-10 w-full">
                <div className="flex-1 w-full">
                  <div className="inline-flex items-center gap-2 px-3 py-1 sm:py-1.5 rounded-full bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 text-[10px] font-black tracking-widest uppercase mb-4 sm:mb-6 shadow-inner">
                    <i className="fas fa-magnet"></i> Maximize Revenue
                  </div>
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4 leading-tight">Capture High-Intent Leads & Automate Emails</h3>
                  <p className="text-sm sm:text-base font-medium text-indigo-200/80 leading-relaxed mb-6 sm:mb-8 max-w-lg">
                    Every time a student takes a free test on your website, our gateway securely captures their <strong>verified Email and Phone Number</strong>. We instantly send them a beautiful, branded scorecard email, keeping your institution top-of-mind.
                  </p>
                  <a href="#portals" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 sm:gap-3 bg-white text-slate-900 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-black hover:bg-indigo-50 transition shadow-[0_0_20px_rgba(255,255,255,0.2)] md:hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] md:hover:-translate-y-1 duration-300 text-sm sm:text-base">
                    Explore Enterprise Portal <i className="fas fa-arrow-right"></i>
                  </a>
                </div>
                
                {/* Lead Visualizer Graphic */}
                <div className="w-full md:w-80 shrink-0 flex flex-col gap-3 sm:gap-4 relative pl-2 sm:pl-4 md:pl-0">
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-24 sm:h-32 bg-gradient-to-b from-emerald-400/10 via-emerald-400/80 to-emerald-400/10 rounded-full blur-[2px]"></div>
                  
                  {/* Floating Lead Card 1 */}
                  <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between transform transition-all duration-500 md:group-hover:-translate-y-2 md:group-hover:bg-slate-800 md:group-hover:border-slate-600 shadow-xl w-full">
                    <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-400 flex items-center justify-center text-slate-900 text-xs sm:text-sm shrink-0 shadow-[0_0_15px_rgba(52,211,153,0.4)]"><i className="fas fa-user"></i></div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">Rahul M.</span>
                        <span className="text-[8px] sm:text-[10px] text-emerald-400 font-bold uppercase tracking-widest truncate">Lead Captured</span>
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-mono bg-slate-900 px-1.5 sm:px-2 py-1 rounded-md border border-slate-700 shrink-0 ml-2">+91 98765...</span>
                  </div>

                  {/* Floating Lead Card 2 */}
                  <div className="bg-slate-800/50 border border-slate-700/50 backdrop-blur-md p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between transform transition-all duration-500 md:group-hover:-translate-y-2 md:group-hover:bg-slate-800 md:group-hover:border-slate-600 shadow-xl delay-100 w-full">
                    <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-400 flex items-center justify-center text-slate-900 text-xs sm:text-sm shrink-0 shadow-[0_0_15px_rgba(129,140,248,0.4)]"><i className="fas fa-user"></i></div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">Priya S.</span>
                        <span className="text-[8px] sm:text-[10px] text-indigo-400 font-bold uppercase tracking-widest truncate">Lead Captured</span>
                      </div>
                    </div>
                    <span className="text-[10px] sm:text-xs text-slate-400 font-mono bg-slate-900 px-1.5 sm:px-2 py-1 rounded-md border border-slate-700 shrink-0 ml-2">priya@gm...</span>
                  </div>

                  {/* Automated Email Action */}
                  <div className="mt-1 sm:mt-2 bg-emerald-500/20 border border-emerald-500/50 p-2.5 sm:p-3.5 rounded-xl flex items-center justify-center gap-2 text-emerald-400 text-[10px] sm:text-xs font-black shadow-inner transform transition-all duration-500 md:group-hover:-translate-y-1 delay-200">
                    <i className="fas fa-envelope-open-text animate-pulse"></i> 2 Branded Scorecards Sent
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* --- PRICING / SUBSCRIPTION SECTION --- */}
        <div id="pricing" className="max-w-7xl mx-auto mt-24 sm:mt-32 scroll-mt-20 sm:scroll-mt-24 px-4 w-full">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-3 sm:mb-4 tracking-tight">Simple, transparent pricing.</h2>
            <p className="text-base sm:text-lg text-slate-500 font-medium">Start for free, upgrade when you need supercharged AI limits or B2B tools.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center">
            
            {/* Free Tier */}
            <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border-2 border-slate-100 shadow-sm hover:border-indigo-100 transition duration-300 md:hover:-translate-y-1">
              <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-1 sm:mb-2">Student Basic</h3>
              <p className="text-slate-500 text-xs sm:text-sm font-medium mb-4 sm:mb-6">Perfect for individual practice.</p>
              <div className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 sm:mb-6">₹0<span className="text-base sm:text-lg text-slate-400 font-medium">/mo</span></div>
              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <li className="flex items-center gap-3 text-slate-700 font-bold text-xs sm:text-sm"><i className="fas fa-check text-emerald-500"></i> Access to Public Live Feed</li>
                <li className="flex items-center gap-3 text-slate-700 font-bold text-xs sm:text-sm"><i className="fas fa-check text-emerald-500"></i> Basic Result Scorecards</li>
                <li className="flex items-center gap-3 text-slate-700 font-bold text-xs sm:text-sm"><i className="fas fa-check text-emerald-500"></i> Join Private Mock Rooms</li>
                <li className="flex items-center gap-3 text-slate-400 font-medium text-xs sm:text-sm line-through"><i className="fas fa-times"></i> AI Diagnostics & Plans</li>
              </ul>
              <a href="#portals" className="block text-center w-full bg-slate-100 text-slate-800 text-sm sm:text-base font-black py-3 sm:py-3.5 rounded-xl hover:bg-slate-200 transition">Get Started</a>
            </div>

            {/* Pro Tier (Highlighted) */}
            <div className="bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-slate-800 shadow-2xl relative transform md:-translate-y-4 hover:-translate-y-2 md:hover:-translate-y-6 transition duration-300">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[8px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap">Most Popular</div>
              <h3 className="text-lg sm:text-xl font-black text-white mb-1 sm:mb-2 mt-2 sm:mt-0">Ozone Pro</h3>
              <p className="text-slate-400 text-xs sm:text-sm font-medium mb-4 sm:mb-6">For serious learners and solo creators.</p>
              <div className="text-4xl sm:text-5xl font-black text-white mb-4 sm:mb-6">₹499<span className="text-base sm:text-lg text-slate-500 font-medium">/mo</span></div>
              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <li className="flex items-center gap-3 text-slate-200 font-bold text-xs sm:text-sm"><i className="fas fa-check text-indigo-400"></i> Everything in Basic</li>
                <li className="flex items-center gap-3 text-white font-black text-xs sm:text-sm"><i className="fas fa-check text-indigo-400"></i> Unlimited AI Extractions</li>
                <li className="flex items-center gap-3 text-white font-black text-xs sm:text-sm"><i className="fas fa-check text-indigo-400"></i> Deep AI Diagnostic Reports</li>
                <li className="flex items-center gap-3 text-white font-black text-xs sm:text-sm"><i className="fas fa-check text-indigo-400"></i> Host Live Exam Rooms</li>
              </ul>
              <a href="#portals" className="block text-center w-full bg-indigo-500 text-white text-sm sm:text-base font-black py-3 sm:py-3.5 rounded-xl hover:bg-indigo-400 transition shadow-lg shadow-indigo-500/25">Upgrade to Pro</a>
            </div>

            {/* Institutional Tier */}
            <div className="bg-indigo-50 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border-2 border-indigo-100 shadow-sm relative overflow-hidden transition duration-300 md:hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
              <h3 className="text-lg sm:text-xl font-black text-indigo-900 mb-1 sm:mb-2">Enterprise Organization</h3>
              <p className="text-indigo-700 text-xs sm:text-sm font-medium mb-4 sm:mb-6">For Coaching Centers & Schools.</p>
              <div className="text-4xl sm:text-5xl font-black text-indigo-900 mb-4 sm:mb-6">₹2,999<span className="text-base sm:text-lg text-indigo-400 font-medium">/mo</span></div>
              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 relative z-10">
                <li className="flex items-center gap-3 text-indigo-900 font-bold text-xs sm:text-sm"><i className="fas fa-check text-indigo-600"></i> Everything in Pro</li>
                <li className="flex items-center gap-3 text-indigo-900 font-bold text-xs sm:text-sm"><i className="fas fa-check text-indigo-600"></i> White-Label Iframe Embeds</li>
                <li className="flex items-center gap-3 text-indigo-900 font-bold text-xs sm:text-sm"><i className="fas fa-check text-indigo-600"></i> Auto-Scorecard Emails</li>
                <li className="flex items-center gap-3 text-indigo-900 font-bold text-xs sm:text-sm"><i className="fas fa-check text-indigo-600"></i> Lead Gen & Anti-Cheat</li>
              </ul>
              <a href="#portals" className="block text-center w-full bg-indigo-600 text-white text-sm sm:text-base font-black py-3 sm:py-3.5 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition relative z-10">Access Portal</a>
            </div>

          </div>
        </div>
      </main>

      {/* --- BOTTOM CTA --- */}
      {!userId && (
        <section className="py-16 sm:py-24 px-4 sm:px-6 relative z-10 mt-10 w-full">
          <div className="max-w-4xl mx-auto bg-slate-900 rounded-[2rem] sm:rounded-[3rem] p-8 sm:p-12 md:p-16 text-center shadow-2xl relative overflow-hidden border border-slate-800 w-full">
            <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 sm:mb-6 tracking-tight relative z-10">Ready to ace your exams?</h2>
            <p className="text-slate-400 text-base sm:text-lg md:text-xl mb-8 sm:mb-10 max-w-xl mx-auto relative z-10">
              Join thousands of students and educators building the future of test prep with Ozone.
            </p>
            <a href="#portals" className="relative z-10 w-full sm:w-auto inline-block bg-white text-slate-900 text-base sm:text-lg font-black px-6 sm:px-10 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl hover:bg-indigo-50 transition transform hover:-translate-y-1 shadow-lg">
              Create your Free Account
            </a>
          </div>
        </section>
      )}

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-200 bg-white pt-16 pb-8 mt-auto relative z-10 w-full px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 sm:gap-12 mb-12">
          
          {/* Brand & Location Column */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xl tracking-tight mb-4">
              <i className="fas fa-book-open-reader text-indigo-600"></i> OZONE
            </div>
            <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-sm mb-6">
              The ultimate Adaptive Exam Engine for Students and Institutions. Built to make education accessible, secure, and data-driven.
            </p>
            <div className="inline-flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
               <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                 <i className="fas fa-map-marker-alt"></i>
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Headquarters</span>
                 <span className="text-sm font-bold text-slate-700">Kolkata, India</span>
               </div>
            </div>
          </div>
          
          {/* Team Column */}
          <div>
            <h4 className="font-black text-slate-900 mb-4 uppercase tracking-widest text-xs">Company</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-500">
              <li>
                <span className="block text-slate-800 font-bold mb-1">Our Team</span>
                Built with ❤️ by a passionate group of engineers and educators in Kolkata.
              </li>
              <li className="pt-2"><a href="#" className="hover:text-indigo-600 transition font-bold">About Us</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition font-bold">Careers <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full ml-1">We're Hiring</span></a></li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="font-black text-slate-900 mb-4 uppercase tracking-widest text-xs">Resources</h4>
            <ul className="space-y-3 text-sm font-bold text-slate-500">
              <li><a href="#" className="hover:text-indigo-600 transition">Help Center</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition">Terms of Service</a></li>
              <li><a href="#" className="hover:text-indigo-600 transition">Contact Support</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Socials */}
        <div className="max-w-7xl mx-auto border-t border-slate-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-slate-400 font-bold text-xs sm:text-sm">
            © {new Date().getFullYear()} Ozone Technologies. All rights reserved.
          </p>
          <div className="flex gap-5 text-slate-400">
             <a href="#" className="hover:text-indigo-600 hover:-translate-y-1 transition transform"><i className="fab fa-twitter text-lg"></i></a>
             <a href="#" className="hover:text-indigo-600 hover:-translate-y-1 transition transform"><i className="fab fa-linkedin text-lg"></i></a>
             <a href="#" className="hover:text-indigo-600 hover:-translate-y-1 transition transform"><i className="fab fa-instagram text-lg"></i></a>
          </div>
        </div>
      </footer>

    </div>
  );
}