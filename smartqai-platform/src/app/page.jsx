import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-teal-100 selection:text-teal-900 relative overflow-x-hidden flex flex-col w-full" style={{ scrollBehavior: "smooth" }}>
      
      {/* --- BRANDED AMBIENT BACKGROUND EFFECTS --- */}
      {/* We are sticking strictly to Indigo and Teal for a highly professional SaaS look */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-indigo-500/15 rounded-full blur-[100px] sm:blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] bg-teal-500/15 rounded-full blur-[100px] sm:blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

      {/* --- NAVBAR --- */}
      <nav className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md fixed w-full z-50 top-0 transition-all shadow-sm shadow-slate-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          
          {/* --- OZONE LOGO --- */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition cursor-pointer select-none">
            <div className="bg-indigo-600 w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center shrink-0">
                <i className="fas fa-book-open-reader text-white text-sm sm:text-lg"></i>
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
            
            <Link href="/sign-in?redirect_url=/org/dashboard" className="flex items-center gap-2 text-slate-700 bg-slate-100 px-4 py-2 rounded-full hover:bg-slate-200 transition border border-slate-200 cursor-pointer">
              <i className="fas fa-building text-indigo-500"></i> Enterprise Login
            </Link>
          </div>
          
          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center gap-3 text-sm font-bold">
            {userId ? (
              <Link href="/onboarding" className="bg-indigo-600 text-white px-6 py-2.5 rounded-full hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2">
                Dashboard <i className="fas fa-arrow-right"></i>
              </Link>
            ) : (
              <>
                <a href="#portals" className="text-slate-600 hover:text-indigo-600 transition px-4 py-2">Log in</a>
                <a href="#portals" className="bg-indigo-600 text-white px-6 py-2.5 rounded-full hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20">
                  Sign up free
                </a>
              </>
            )}
          </div>

          {/* ⚡ Mobile & Tablet Auth Menu ⚡ */}
          <div className="lg:hidden flex items-center group relative">
             {userId ? (
                <Link href="/onboarding" className="bg-indigo-600 text-white px-5 py-2 rounded-full text-xs font-black shadow-md flex items-center gap-2">
                  Dashboard <i className="fas fa-arrow-right"></i>
                </Link>
             ) : (
                <button className="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-black shadow-md flex items-center gap-2 hover:bg-indigo-700 transition">
                  Get Started <i className="fas fa-rocket"></i>
                </button>
             )}
             
             {!userId && (
               <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex flex-col overflow-hidden">
                 <div className="bg-slate-50 border-b border-slate-100 px-4 py-2">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Portal</span>
                 </div>
                 <Link href="/sign-in?redirect_url=/student" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition text-slate-700 text-sm font-bold w-full border-b border-slate-100">
                   <i className="fas fa-user-graduate text-indigo-500 w-4"></i> Student
                 </Link>
                 <Link href="/sign-in?redirect_url=/educator/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition text-slate-700 text-sm font-bold w-full border-b border-slate-100">
                   <i className="fas fa-chalkboard-teacher text-teal-500 w-4"></i> Educator
                 </Link>
                 <Link href="/sign-in?redirect_url=/org/dashboard" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left transition text-slate-700 text-sm font-bold w-full">
                   <i className="fas fa-building text-indigo-500 w-4"></i> Enterprise
                 </Link>
               </div>
             )}
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="pt-28 sm:pt-36 pb-10 px-4 sm:px-6 relative z-10 flex-1 w-full">
        <div className="max-w-4xl mx-auto text-center w-full">
          
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-white border border-slate-200 text-indigo-600 text-[10px] sm:text-xs font-black tracking-widest uppercase shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            Trusted by Top Indian Educators
          </div>
          
          {/* SIZED DOWN HEADING */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 mb-6 leading-tight tracking-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Conduct Secure, <br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500">
              AI-Powered Exams
            </span> at Scale.
          </h1>
          
          <p className="text-base sm:text-lg text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            The all-in-one assessment platform for coaching institutes and solo educators. Prevent cheating with AI proctoring, extract questions from any PDF, and capture student leads effortlessly.
          </p>
          
          {!userId ? (
            <>
              {/* ⚡ DESKTOP ONLY: Standard CTA Buttons ⚡ */}
              <div className="hidden lg:flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 w-full px-4 sm:px-0">
                <a href="#portals" className="w-full sm:w-auto bg-indigo-600 text-white text-base font-black px-8 py-3.5 rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition transform hover:-translate-y-1 text-center">
                  Get Started for Free
                </a>
                <a href="#enterprise" className="w-full sm:w-auto bg-white text-slate-700 border border-slate-200 text-base font-black px-8 py-3.5 rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2 group shadow-sm">
                  <i className="fas fa-building text-indigo-500 group-hover:scale-110 transition-transform"></i> See B2B Features
                </a>
              </div>

              {/* ⚡ MOBILE & TABLET ONLY: App-Style Quick Start Dock ⚡ */}
              <div id="mobile-dock" className="flex lg:hidden flex-col items-center mt-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 w-full px-2 scroll-mt-24">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tap your portal to begin</p>
                 
                 <div className="flex items-center justify-center w-full max-w-md mx-auto bg-white/80 backdrop-blur-xl border border-slate-200 p-2 rounded-2xl shadow-xl shadow-slate-200/50">
                    
                    <Link href="/sign-in?redirect_url=/student" className="flex-1 flex flex-col items-center justify-center gap-2 py-3 rounded-xl hover:bg-slate-50 transition cursor-pointer group">
                      <div className="text-xl text-indigo-600 group-hover:scale-110 transition-transform"><i className="fas fa-user-graduate"></i></div>
                      <span className="text-[10px] font-black text-slate-600 tracking-wide">Student</span>
                    </Link>

                    <div className="w-px h-8 bg-slate-200 mx-1"></div>

                    <Link href="/sign-in?redirect_url=/educator/dashboard" className="flex-1 flex flex-col items-center justify-center gap-2 py-3 rounded-xl hover:bg-slate-50 transition cursor-pointer group">
                      <div className="text-xl text-teal-600 group-hover:scale-110 transition-transform"><i className="fas fa-chalkboard-teacher"></i></div>
                      <span className="text-[10px] font-black text-slate-600 tracking-wide">Educator</span>
                    </Link>

                    <div className="w-px h-8 bg-slate-200 mx-1"></div>

                    <Link href="/sign-in?redirect_url=/org/dashboard" className="flex-1 flex flex-col items-center justify-center gap-2 py-3 rounded-xl hover:bg-slate-50 transition cursor-pointer group">
                      <div className="text-xl text-indigo-600 group-hover:scale-110 transition-transform"><i className="fas fa-building"></i></div>
                      <span className="text-[10px] font-black text-slate-600 tracking-wide">Enterprise</span>
                    </Link>

                 </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 w-full sm:w-auto px-4 sm:px-0">
              <Link href="/onboarding" className="w-full sm:w-auto inline-flex bg-indigo-600 text-white text-base font-black px-10 py-3.5 rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition transform hover:-translate-y-1 items-center justify-center gap-3">
                Enter Workspace <i className="fas fa-rocket"></i>
              </Link>
            </div>
          )}
        </div>

        {/* --- ⚡ DESKTOP LOGIN GRID (Unified Brand Colors) --- */}
        {!userId && (
          <div id="portals" className="hidden lg:grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-20 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400 px-4 sm:px-0">
            
            {/* 1. STUDENT PORTAL */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 flex flex-col h-full text-center group">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <i className="fas fa-user-graduate"></i>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-3">Student</h2>
              <p className="text-slate-500 font-medium text-sm mb-8 flex-1">
                Access your personal dashboard, take AI-generated mock exams, and view your scorecards.
              </p>
              <Link href="/sign-in?redirect_url=/student" className="block w-full bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition text-center">
                Student Login
              </Link>
            </div>

            {/* 2. SOLO EDUCATOR PORTAL */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-teal-200 transition-all duration-300 flex flex-col h-full text-center group">
              <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-6 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <i className="fas fa-chalkboard-teacher"></i>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-3">Solo Educator</h2>
              <p className="text-slate-500 font-medium text-sm mb-8 flex-1">
                Create AI mock exams, manage your personal library, and share private test links with students.
              </p>
              <Link href="/sign-in?redirect_url=/educator/dashboard" className="block w-full bg-slate-50 border border-slate-200 text-slate-700 py-3 rounded-xl font-bold hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition text-center">
                Educator Login
              </Link>
            </div>

            {/* 3. ENTERPRISE (ORG) PORTAL */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200 transition-all duration-300 flex flex-col h-full text-center group relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest">B2B</div>
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl mx-auto mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <i className="fas fa-building"></i>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-3">Enterprise</h2>
              <p className="text-slate-500 font-medium text-sm mb-8 flex-1">
                Manage your institution, generate embed codes, and view lead analytics for your school.
              </p>
              <Link href="/sign-in?redirect_url=/org/dashboard" className="block w-full bg-slate-900 text-white border border-slate-800 py-3 rounded-xl font-bold hover:bg-indigo-600 hover:border-indigo-600 transition text-center shadow-md">
                Enterprise Login
              </Link>
            </div>

          </div>
        )}

        {/* --- FEATURE CARDS GRID (Unified Indigo/Teal Aesthetic) --- */}
        <div id="features" className="max-w-5xl mx-auto mt-24 grid grid-cols-1 md:grid-cols-2 gap-6 scroll-mt-24 px-4 w-full">
          
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 group">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xl mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <i className="fas fa-robot"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">AI Question Extraction</h3>
            <p className="text-slate-500 leading-relaxed text-sm font-medium">
              Upload your past paper PDFs. Ozone's AI instantly parses text, detects diagrams, and categorizes MSQ, MCQ, and NAT questions flawlessly.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest shadow-sm">Strict Mode</div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xl mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <i className="fas fa-laptop-code"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">TCS iON Environment</h3>
            <p className="text-slate-500 leading-relaxed text-sm font-medium">
              Students experience the exact UI of real competitive exams like GATE and JEE, complete with virtual calculators and marking palettes.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 group">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xl mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <i className="fas fa-chart-pie"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">Deep AI Analytics</h3>
            <p className="text-slate-500 leading-relaxed text-sm font-medium">
              Educators get instant live leaderboards. Students get official AI-generated solutions and dynamic Action Plans targeting their weak areas.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-300 group">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-xl mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-3">Military-Grade Anti-Cheat</h3>
            <p className="text-slate-500 leading-relaxed text-sm font-medium">
              Powered by local AI vision. Detect mobile phones, multiple people, screen-switching, and block copy-pasting to ensure absolute exam integrity.
            </p>
          </div>

        </div>

        {/* --- B2B ENTERPRISE SECTION (Clean & Dark) --- */}
        <div id="enterprise" className="max-w-5xl mx-auto mt-28 scroll-mt-24 px-4 w-full">
          
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">Turn your website into a <br className="hidden sm:block"/> <span className="text-indigo-600">Lead Generation Engine.</span></h2>
            <p className="text-base text-slate-500 font-medium max-w-2xl mx-auto">
              We provide Coaching Centers and Universities with a strict, anti-cheat exam engine. Embed white-label exams directly onto your own website, capture leads, and automate scorecard emails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl group relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10 mb-8">
                <div className="w-12 h-12 bg-slate-800 text-indigo-400 border border-slate-700 rounded-xl flex items-center justify-center text-xl mb-6">
                  <i className="fas fa-code"></i>
                </div>
                <h3 className="text-xl font-black text-white mb-2">1-Minute Integration</h3>
                <p className="text-sm font-medium text-slate-400">No developers needed. Just copy and paste our secure iframe directly onto your WordPress, Notion, or custom website.</p>
              </div>

              <div className="relative z-10 w-full mt-auto">
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl w-full">
                  <div className="flex gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                  </div>
                  <div className="font-mono text-xs text-teal-400 overflow-hidden leading-relaxed break-all">
                    <span className="text-indigo-400">&lt;iframe</span><br/>
                    &nbsp;&nbsp;src="https://ozoneprep.com/embed/..."<br/>
                    &nbsp;&nbsp;width="100%" allow="fullscreen"<br/>
                    <span className="text-indigo-400">&gt;&lt;/iframe&gt;</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-xl group relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10 mb-8">
                <div className="w-12 h-12 bg-slate-800 text-teal-400 border border-slate-700 rounded-xl flex items-center justify-center text-xl mb-6">
                  <i className="fas fa-magnet"></i>
                </div>
                <h3 className="text-xl font-black text-white mb-2">Capture Verified Leads</h3>
                <p className="text-sm font-medium text-slate-400">Every time a student takes a test on your site, our gateway securely captures their Email and Phone Number for your sales team.</p>
              </div>

              <div className="relative z-10 mt-auto">
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs"><i className="fas fa-user"></i></div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white">Rahul Sharma</span>
                      <span className="text-[10px] text-slate-400">rahul@gmail.com</span>
                    </div>
                  </div>
                  <span className="bg-teal-500/20 text-teal-400 text-[10px] font-black px-2 py-1 rounded">CAPTURED</span>
                </div>
                <div className="bg-indigo-500/20 border border-indigo-500/30 p-3 rounded-xl flex items-center justify-center gap-2 text-indigo-300 text-xs font-black">
                  <i className="fas fa-envelope-open-text"></i> Automated Scorecard Sent
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* --- PRICING SECTION (Clean EdTech Style) --- */}
        <div id="pricing" className="max-w-5xl mx-auto mt-28 scroll-mt-24 px-4 w-full">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 tracking-tight">Simple, transparent pricing.</h2>
            <p className="text-base text-slate-500 font-medium">Start for free, upgrade when you need supercharged AI limits or B2B tools.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            
            {/* Free Tier */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-1">Student Basic</h3>
              <p className="text-slate-500 text-xs font-medium mb-6">Perfect for individual practice.</p>
              <div className="text-4xl font-black text-slate-900 mb-6">₹0<span className="text-sm text-slate-400 font-medium">/mo</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-teal-500"></i> Public Live Feed</li>
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-teal-500"></i> Basic Scorecards</li>
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-teal-500"></i> Private Mock Rooms</li>
              </ul>
              <a href="#portals" className="block text-center w-full bg-slate-100 text-slate-700 text-sm font-black py-3 rounded-xl hover:bg-slate-200 transition border border-slate-200">Get Started</a>
            </div>

            {/* Pro Tier (Highlighted - Indigo) */}
            <div className="bg-indigo-600 rounded-3xl p-8 border border-indigo-500 shadow-xl relative transform md:-translate-y-4 text-white">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-teal-400 text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest whitespace-nowrap shadow-sm">Most Popular</div>
              <h3 className="text-lg font-black mb-1 mt-2">Ozone Pro</h3>
              <p className="text-indigo-200 text-xs font-medium mb-6">For serious learners and solo creators.</p>
              <div className="text-4xl font-black mb-6">₹499<span className="text-sm text-indigo-300 font-medium">/mo</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 font-bold text-sm"><i className="fas fa-check text-teal-300"></i> Unlimited AI Extractions</li>
                <li className="flex items-center gap-3 font-bold text-sm"><i className="fas fa-check text-teal-300"></i> Deep Diagnostic Reports</li>
                <li className="flex items-center gap-3 font-bold text-sm"><i className="fas fa-check text-teal-300"></i> Host Live Exam Rooms</li>
              </ul>
              <a href="#portals" className="block text-center w-full bg-white text-indigo-600 text-sm font-black py-3 rounded-xl hover:bg-indigo-50 transition shadow-md">Upgrade to Pro</a>
            </div>

            {/* Institutional Tier */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-1">Enterprise</h3>
              <p className="text-slate-500 text-xs font-medium mb-6">For Coaching Centers & Schools.</p>
              <div className="text-4xl font-black text-slate-900 mb-6">₹2,999<span className="text-sm text-slate-400 font-medium">/mo</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-indigo-500"></i> White-Label Embeds</li>
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-indigo-500"></i> Auto-Scorecard Emails</li>
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-indigo-500"></i> Lead Generation</li>
              </ul>
              <a href="#portals" className="block text-center w-full bg-slate-900 text-white text-sm font-black py-3 rounded-xl hover:bg-slate-800 transition border border-slate-800">Access Portal</a>
            </div>

          </div>
        </div>
      </main>

      {/* --- BOTTOM CTA --- */}
      {!userId && (
        <section className="py-16 sm:py-24 px-4 sm:px-6 relative z-10 mt-10 w-full max-w-5xl mx-auto">
          <div className="bg-indigo-600 rounded-3xl p-10 md:p-16 text-center shadow-xl relative overflow-hidden border border-indigo-500 w-full">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-400/20 rounded-full blur-3xl pointer-events-none"></div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight relative z-10">Ready to scale your assessments?</h2>
            <p className="text-indigo-100 text-base md:text-lg mb-8 max-w-xl mx-auto relative z-10">
              Join thousands of educators and institutions building the future of test prep with Ozone.
            </p>
            <a href="#portals" className="relative z-10 inline-block bg-white text-indigo-600 text-base font-black px-8 py-4 rounded-xl hover:bg-indigo-50 transition transform hover:-translate-y-1 shadow-lg">
              Create your Free Account
            </a>
          </div>
        </section>
      )}

      {/* --- FOOTER (COMPLIANT) --- */}
      <footer className="border-t border-slate-200 bg-white pt-16 pb-8 mt-auto relative z-10 w-full px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-slate-900 font-black text-xl tracking-tight mb-4">
              <i className="fas fa-book-open-reader text-indigo-600"></i> OZONE
            </div>
            <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-sm mb-6">
              The ultimate Adaptive Exam Engine for Students and Institutions. Built to make education accessible, secure, and data-driven.
            </p>
            <div className="inline-flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
               <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                 <i className="fas fa-map-marker-alt"></i>
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Headquarters</span>
                 <span className="text-sm font-bold text-slate-700">Panihati, West Bengal</span>
               </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-black text-slate-900 mb-4 uppercase tracking-widest text-xs">Company</h4>
            <ul className="space-y-3 text-sm font-medium text-slate-500">
              <li><Link href="/" className="hover:text-indigo-600 transition font-bold">About Us</Link></li>
              <li><Link href="#" className="hover:text-indigo-600 transition font-bold">Careers <span className="bg-indigo-100 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full ml-1">We're Hiring</span></Link></li>
            </ul>
          </div>

          {/* Legal Column (MANDATORY FOR PAYMENT GATEWAYS) */}
          <div>
            <h4 className="font-black text-slate-900 mb-4 uppercase tracking-widest text-xs">Legal & Support</h4>
            <ul className="space-y-3 text-sm font-bold text-slate-500">
              <li><Link href="/contact" className="hover:text-indigo-600 transition">Contact Us</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-indigo-600 transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-indigo-600 transition">Terms & Conditions</Link></li>
              <li><Link href="/refund-policy" className="hover:text-indigo-600 transition">Refund Policy</Link></li>
            </ul>
          </div>
        </div>

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