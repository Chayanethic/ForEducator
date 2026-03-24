import Link from "next/link";
// NEW: Import auth from the server package instead of the UI wrapper
import { auth } from "@clerk/nextjs/server";

export default async function LandingPage() {
  // NEW: Securely check if the user is logged in on the server
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* NAVBAR */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md fixed w-full z-50 top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/onboarding" className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight hover:text-indigo-600 transition cursor-pointer">
  <i className="fas fa-brain text-indigo-600"></i> SmartQAI
</Link>
          <div className="flex items-center gap-4 text-sm font-bold">
            {/* NEW: Conditional Rendering based on userId */}
            {userId ? (
              <Link href="/onboarding" className="bg-indigo-600 text-white px-5 py-2.5 rounded-full hover:bg-indigo-700 transition shadow-sm">Go to Dashboard <i className="fas fa-arrow-right ml-1"></i></Link>
            ) : (
              <>
                <Link href="/sign-in" className="text-slate-600 hover:text-indigo-600 transition">Log in</Link>
                <Link href="/sign-up" className="bg-slate-900 text-white px-5 py-2.5 rounded-full hover:bg-indigo-600 transition shadow-sm">Sign up free</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold tracking-wide uppercase">
            <i className="fas fa-bolt text-amber-500 mr-2"></i> Powered by Gemini 2.5 Flash
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-tight tracking-tight">
            Transform PDFs into <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">Live Mock Exams</span> in seconds.
          </h1>
          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            The ultimate AI-powered platform for educators and students. Extract questions instantly, host real-time exam rooms, and get deep analytical insights.
          </p>
          
          {/* NEW: Only show the "Get Started" buttons if they are logged out */}
          {!userId && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/sign-up" className="w-full sm:w-auto bg-indigo-600 text-white text-lg font-bold px-8 py-4 rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/30 transition transform hover:-translate-y-0.5">
                Get Started for Free
              </Link>
              <a href="#features" className="w-full sm:w-auto bg-white text-slate-700 border border-slate-200 text-lg font-bold px-8 py-4 rounded-xl hover:bg-slate-50 transition">
                See how it works
              </a>
            </div>
          )}
        </div>

        {/* FEATURE CARDS */}
        <div id="features" className="max-w-6xl mx-auto mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
              <i className="fas fa-robot"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">AI Question Extraction</h3>
            <p className="text-slate-500 leading-relaxed">Just upload your past paper PDFs. Our AI instantly parses text, diagrams, and options into a digital format.</p>
          </div>
          
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">Live</div>
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
              <i className="fas fa-door-open"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">TCS iON Environment</h3>
            <p className="text-slate-500 leading-relaxed">Students experience the exact UI of real competitive exams like GATE, complete with virtual calculators and marking palettes.</p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center text-2xl mb-6">
              <i className="fas fa-chart-pie"></i>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Deep Analytics</h3>
            <p className="text-slate-500 leading-relaxed">Educators get instant leaderboards and student-by-student analysis. Students get AI roadmaps targeting their weak areas.</p>
          </div>
        </div>
      </main>
    </div>
  );
}