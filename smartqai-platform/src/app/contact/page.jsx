import Link from "next/link";

export const metadata = {
  title: "Contact Us | Ozone Technologies",
  description: "Get in touch with the Ozone team.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-2 w-fit">
            <i className="fas fa-arrow-left"></i> Back to Home
          </Link>
        </div>
        
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 p-8 sm:p-12 text-center">
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-4">Contact Support</h1>
            <p className="text-indigo-200 font-medium">We're here to help you scale your assessments.</p>
          </div>
          
          <div className="p-8 sm:p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-black text-slate-900 mb-6">Get in Touch</h3>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <i className="fas fa-envelope"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Email Us</p>
                    <p className="text-sm text-slate-500">support@ozoneprep.com</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <i className="fas fa-phone"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Call Us</p>
                    <p className="text-sm text-slate-500">+91 (123) 456-7890</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <i className="fas fa-map-marker-alt"></i>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Headquarters</p>
                    <p className="text-sm text-slate-500">Panihati, West Bengal, India<br/>PIN: 700114</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <form className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Name</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none transition" placeholder="Your Name" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Email</label>
                  <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none transition" placeholder="you@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">Message</label>
                  <textarea rows="4" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:border-indigo-500 outline-none transition resize-none" placeholder="How can we help?"></textarea>
                </div>
                <button type="button" className="w-full bg-indigo-600 text-white font-black py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-200">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}