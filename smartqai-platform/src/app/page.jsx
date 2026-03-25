import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function LandingPage() {
  // Securely check if the user is logged in on the server
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden flex flex-col">
      
      {/* --- AMBIENT BACKGROUND EFFECTS --- */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-400/20 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-emerald-400/20 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>

      {/* --- NAVBAR --- */}
      <nav className="border-b border-slate-200/50 bg-white/80 backdrop-blur-md fixed w-full z-50 top-0 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* --- OZONE LOGO --- */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition cursor-pointer select-none">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 w-10 h-10 rounded-xl shadow-lg shadow-indigo-900/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <i className="fas fa-book-open-reader text-indigo-50 text-lg"></i>
            </div>
            <div className="flex flex-col justify-center">
                <span className="text-2xl font-black tracking-tight text-slate-900 leading-none mt-1">
                    OZONE
                </span>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition">Features</a>
            <a href="#pricing" className="hover:text-indigo-600 transition">Pricing</a>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-bold">
            {userId ? (
              <Link href="/onboarding" className="bg-slate-900 text-white px-6 py-2.5 rounded-full hover:bg-indigo-600 transition-all shadow-md hover:shadow-indigo-600/30 flex items-center gap-2">
                Go to Dashboard <i className="fas fa-arrow-right"></i>
              </Link>
            ) : (
              <>
                <Link href="/sign-in" className="text-slate-600 hover:text-indigo-600 transition px-4 py-2 hidden sm:block">Log in</Link>
                <Link href="/sign-up" className="bg-slate-900 text-white px-6 py-2.5 rounded-full hover:bg-indigo-600 transition-all shadow-md hover:shadow-indigo-600/30">
                  Sign up free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="pt-40 pb-10 px-6 relative z-10 flex-1">
        <div className="max-w-5xl mx-auto text-center">
          
          <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 rounded-full bg-white border border-indigo-100 text-indigo-700 text-xs font-black tracking-wide uppercase shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Powered by Gemini 2.5 Flash
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-[1.1] tracking-tight">
            Transform PDFs into <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500">
              Live Mock Exams
            </span> in seconds.
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            The Adaptive Exam & Diagnostic Engine. Extract complex questions instantly, host strict TCS iON environments, and generate deep AI performance analytics.
          </p>
          
          {!userId ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up" className="w-full sm:w-auto bg-indigo-600 text-white text-lg font-black px-8 py-4 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition transform hover:-translate-y-1">
                Get Started for Free
              </Link>
              <a href="#features" className="w-full sm:w-auto bg-white text-slate-800 border-2 border-slate-200 text-lg font-black px-8 py-4 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition">
                See how it works
              </a>
            </div>
          ) : (
            <Link href="/onboarding" className="inline-flex bg-indigo-600 text-white text-lg font-black px-10 py-4 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition transform hover:-translate-y-1 items-center gap-3">
              Enter your Workspace <i className="fas fa-rocket"></i>
            </Link>
          )}

          {/* --- TRUSTED BRANDS SECTION (FURTHER COMPRESSED) --- */}
          <div className="mt-10 pt-8 border-t border-slate-200/60 max-w-4xl mx-auto">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Trusted by the top institutions</p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
                
                {/* JIS Group Logo */}
                <img 
                  src="https://res.cloudinary.com/dnpudf84r/image/upload/v1774474653/jis_p8zlvw.png" 
                  alt="JIS Group Logo" 
                  className="h-14 w-auto object-contain"
                />

                {/* NIT Logo */}
                <img 
                  src="https://res.cloudinary.com/dnpudf84r/image/upload/v1774474777/download_zfvub0.jpg" 
                  alt="Narula Institute of Technology Logo" 
                  className="h-14 w-auto object-contain"
                />

            </div>
          </div>
          
        </div>

        {/* --- FEATURE CARDS GRID (COMPRESSED SPACING) --- */}
        <div id="features" className="max-w-6xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 scroll-mt-32">
          
          <div className="bg-white p-10 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-100 transition-all duration-300 group">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
              <i className="fas fa-robot"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">AI Question Extraction</h3>
            <p className="text-slate-600 leading-relaxed text-lg font-medium">
              Just upload your past paper PDFs. Ozone's AI instantly parses text, detects diagrams, and categorizes MSQ, MCQ, and NAT questions flawlessly.
            </p>
          </div>
          
          <div className="bg-white p-10 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-100 transition-all duration-300 group relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black px-6 py-2 rounded-bl-2xl uppercase tracking-widest shadow-md">Strict Mode</div>
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
              <i className="fas fa-laptop-code"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">TCS iON Environment</h3>
            <p className="text-slate-600 leading-relaxed text-lg font-medium">
              Students experience the exact UI of real competitive exams like GATE and JEE, complete with virtual calculators, marking palettes, and auto-submit timers.
            </p>
          </div>

          <div className="bg-white p-10 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-100 transition-all duration-300 group">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300">
              <i className="fas fa-chart-pie"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">Deep AI Analytics</h3>
            <p className="text-slate-600 leading-relaxed text-lg font-medium">
              Educators get instant live leaderboards. Students get official AI-generated solutions and dynamic Action Plans targeting their specific weak areas.
            </p>
          </div>

          <div className="bg-white p-10 rounded-[2rem] border-2 border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-rose-500/10 hover:border-rose-100 transition-all duration-300 group">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
              <i className="fas fa-gamepad"></i>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">Battle with Friends</h3>
            <p className="text-slate-600 leading-relaxed text-lg font-medium">
              Studying doesn't have to be boring. Create private rooms and challenge your friends to real-time, fast-paced quiz battles on any topic.
            </p>
          </div>

        </div>

        {/* --- PRICING / SUBSCRIPTION SECTION --- */}
        <div id="pricing" className="max-w-7xl mx-auto mt-32 scroll-mt-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Simple, transparent pricing.</h2>
            <p className="text-lg text-slate-500 font-medium">Start for free, upgrade when you need supercharged AI limits.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            
            {/* Free Tier */}
            <div className="bg-white rounded-[2rem] p-8 border-2 border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-2">Student Basic</h3>
              <p className="text-slate-500 text-sm font-medium mb-6">Perfect for individual practice.</p>
              <div className="text-5xl font-black text-slate-900 mb-6">₹0<span className="text-lg text-slate-400 font-medium">/mo</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-emerald-500"></i> Access to Public Live Feed</li>
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-emerald-500"></i> Basic Result Scorecards</li>
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-emerald-500"></i> Join Private Mock Rooms</li>
                <li className="flex items-center gap-3 text-slate-400 font-medium text-sm line-through"><i className="fas fa-times"></i> AI Diagnostics & Plans</li>
              </ul>
              <Link href="/sign-up" className="block text-center w-full bg-slate-100 text-slate-800 font-black py-3.5 rounded-xl hover:bg-slate-200 transition">Get Started</Link>
            </div>

            {/* Pro Tier (Highlighted) */}
            <div className="bg-slate-900 rounded-[2rem] p-8 border border-slate-800 shadow-2xl relative transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Most Popular</div>
              <h3 className="text-xl font-black text-white mb-2">Ozone Pro</h3>
              <p className="text-slate-400 text-sm font-medium mb-6">For serious learners and creators.</p>
              <div className="text-5xl font-black text-white mb-6">₹499<span className="text-lg text-slate-500 font-medium">/mo</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-200 font-bold text-sm"><i className="fas fa-check text-indigo-400"></i> Everything in Basic</li>
                <li className="flex items-center gap-3 text-white font-black text-sm"><i className="fas fa-check text-indigo-400"></i> Unlimited AI PDF Extractions</li>
                <li className="flex items-center gap-3 text-white font-black text-sm"><i className="fas fa-check text-indigo-400"></i> Deep AI Diagnostic Reports</li>
                <li className="flex items-center gap-3 text-white font-black text-sm"><i className="fas fa-check text-indigo-400"></i> Host Live Exam Rooms</li>
              </ul>
              <Link href="/sign-up" className="block text-center w-full bg-indigo-500 text-white font-black py-3.5 rounded-xl hover:bg-indigo-400 transition shadow-lg shadow-indigo-500/25">Upgrade to Pro</Link>
            </div>

            {/* Institutional Tier */}
            <div className="bg-white rounded-[2rem] p-8 border-2 border-slate-100 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-2">Educator/Institute</h3>
              <p className="text-slate-500 text-sm font-medium mb-6">For coaching centers and schools.</p>
              <div className="text-5xl font-black text-slate-900 mb-6">₹1999<span className="text-lg text-slate-400 font-medium">/mo</span></div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-emerald-500"></i> Everything in Pro</li>
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-emerald-500"></i> Unlimited Student Attendees</li>
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-emerald-500"></i> Export Cohort Analytics</li>
                <li className="flex items-center gap-3 text-slate-700 font-bold text-sm"><i className="fas fa-check text-emerald-500"></i> Custom Branding (White-label)</li>
              </ul>
              <a href="#" className="block text-center w-full bg-slate-100 text-slate-800 font-black py-3.5 rounded-xl hover:bg-slate-200 transition">Contact Sales</a>
            </div>

          </div>
        </div>
      </main>

      {/* --- BOTTOM CTA --- */}
      {!userId && (
        <section className="py-24 px-6 relative z-10 mt-10">
          <div className="max-w-4xl mx-auto bg-slate-900 rounded-[3rem] p-12 md:p-16 text-center shadow-2xl relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight relative z-10">Ready to ace your exams?</h2>
            <p className="text-slate-400 text-lg md:text-xl mb-10 max-w-xl mx-auto relative z-10">
              Join thousands of students and educators building the future of test prep with Ozone.
            </p>
            <Link href="/sign-up" className="relative z-10 inline-block bg-white text-slate-900 text-lg font-black px-10 py-4 rounded-2xl hover:bg-indigo-50 transition transform hover:-translate-y-1 shadow-lg">
              Create your Free Account
            </Link>
          </div>
        </section>
      )}

      {/* --- FOOTER --- */}
      <footer className="border-t border-slate-200 bg-white py-10 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-900 font-black text-lg tracking-tight">
            <i className="fas fa-book-open-reader text-indigo-600"></i> OZONE
          </div>
          <p className="text-slate-500 font-medium text-sm">
            © {new Date().getFullYear()} Ozone Platform. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}