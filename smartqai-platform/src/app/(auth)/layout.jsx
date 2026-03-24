export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Optional decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 w-full max-w-md p-6 flex flex-col items-center">
        {/* Logo/Brand Name above the form */}
        <div className="mb-8 text-2xl font-bold text-slate-800 flex items-center gap-2">
           <i className="fas fa-brain text-indigo-600"></i> SmartQAI
        </div>
        
        {/* This renders the Clerk SignIn or SignUp component */}
        {children}
      </div>
    </div>
  );
}