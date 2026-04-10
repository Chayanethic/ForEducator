import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Ozone Technologies",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 font-sans text-slate-700">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-2 w-fit">
            <i className="fas fa-arrow-left"></i> Back to Home
          </Link>
        </div>
        
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-12">
          <h1 className="text-3xl font-black text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-slate-500 font-medium mb-8">Last Updated: October 2026</p>
          
          <div className="space-y-8 text-sm sm:text-base leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Information We Collect</h2>
              <p className="mb-2">We collect information to provide better services to all our users. The types of personal information we obtain include:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account Data:</strong> Name, email address, and phone number when you register.</li>
                <li><strong>Assessment Data:</strong> Exam scores, answers submitted, and time taken during mock exams.</li>
                <li><strong>Proctoring Data:</strong> During secure exams, we process camera feeds via local browser AI models. <em>Note: Video feeds are processed locally on your device and are NOT recorded or stored on our servers.</em></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. How We Use Your Information</h2>
              <p className="mb-2">We use the information we collect to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide, maintain, and improve the Ozone platform.</li>
                <li>Generate and deliver AI-driven diagnostic scorecards.</li>
                <li>Ensure the integrity of examinations via our anti-cheat mechanisms.</li>
                <li>Communicate with you regarding updates, security alerts, and support messages.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Data Sharing and Security</h2>
              <p>We do not sell your personal data to third parties. If you take an exam hosted by an Educational Organization via our platform, your name, email, and exam results will be shared directly with that specific Organization. We implement industry-standard encryption and security protocols to protect your data.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us at <strong>support@ozoneprep.com</strong>.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}