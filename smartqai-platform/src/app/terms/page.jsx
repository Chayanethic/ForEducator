import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions | Ozone Technologies",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 font-sans text-slate-700">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-2 w-fit">
            <i className="fas fa-arrow-left"></i> Back to Home
          </Link>
        </div>
        
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-12">
          <h1 className="text-3xl font-black text-slate-900 mb-2">Terms & Conditions</h1>
          <p className="text-sm text-slate-500 font-medium mb-8">Last Updated: October 2026</p>
          
          <div className="space-y-8 text-sm sm:text-base leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
              <p>By accessing or using the Ozone platform (the "Service"), you agree to be bound by these Terms and Conditions. If you disagree with any part of the terms, then you may not access the Service.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. User Accounts</h2>
              <p className="mb-2">When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Acceptable Use & Anti-Cheat</h2>
              <p>You agree not to engage in any activity that disrupts or manipulates the Service. During secure examinations, attempting to bypass the fullscreen lock, using unauthorized devices, or running screen-recording software is strictly prohibited and will result in automatic exam termination.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Intellectual Property</h2>
              <p>The Service and its original content, features, AI extraction algorithms, and functionality are and will remain the exclusive property of Ozone Technologies. Educators retain the rights to the raw PDF materials they upload.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Governing Law</h2>
              <p>These Terms shall be governed and construed in accordance with the laws of India, specifically within the jurisdiction of West Bengal, without regard to its conflict of law provisions.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}