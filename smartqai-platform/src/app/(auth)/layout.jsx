export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 relative overflow-hidden">
      {/* Optional decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 w-full max-w-md p-6 flex flex-col items-center">
        {/* Logo/Brand Name above the form */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 w-10 h-10 rounded-xl shadow-lg shadow-indigo-900/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <i className="fas fa-book-open-reader text-indigo-50 text-lg"></i>
            </div>
            <div className="flex flex-col justify-center">
                <span className="text-2xl font-black tracking-tight text-slate-900 leading-none mt-1">
                    OZONE
                </span>
            </div>
        
        {/* This renders the Clerk SignIn or SignUp component */}
        {children}
      </div>
    </div>
  );
}