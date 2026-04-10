import Link from "next/link";

export const metadata = {
  title: "Refund Policy | Ozone Technologies",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 font-sans text-slate-700">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-2 w-fit">
            <i className="fas fa-arrow-left"></i> Back to Home
          </Link>
        </div>
        
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 sm:p-12">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl">
              <i className="fas fa-undo-alt"></i>
            </div>
            <h1 className="text-3xl font-black text-slate-900">Refund & Cancellation Policy</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium mb-8 border-b border-slate-100 pb-8">At Ozone Technologies, we strive to ensure our educators and organizations are fully satisfied with our AI Assessment platform. Please read our policy regarding subscriptions and refunds carefully.</p>
          
          <div className="space-y-8 text-sm sm:text-base leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Subscription Cancellations</h2>
              <p>You may cancel your monthly or annual subscription at any time through your billing dashboard. Upon cancellation, you will retain access to your Pro or Enterprise features until the end of your current paid billing cycle. We do not charge cancellation fees.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Refund Eligibility</h2>
              <p className="mb-2">We offer a <strong>7-Day Money-Back Guarantee</strong> for all new subscriptions. If you are not satisfied with the platform within the first 7 days of your initial purchase, you may request a full refund, provided that:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You have generated fewer than 5 AI-extracted Mock Exams.</li>
                <li>You have collected fewer than 20 student leads via the Enterprise gateway.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Non-Refundable Scenarios</h2>
              <p>Refunds will <strong>not</strong> be issued under the following circumstances:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Requests made after the 7-day initial purchase window.</li>
                <li>Renewals of ongoing monthly or annual subscriptions (please ensure you cancel before your renewal date).</li>
                <li>Account termination due to a violation of our Terms & Conditions.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. How to Request a Refund</h2>
              <p>To request a refund within the eligible timeframe, please email <strong>support@ozoneprep.com</strong> with your account email and Order ID. Approved refunds will be processed and credited back to your original payment method within 5-7 business days.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}