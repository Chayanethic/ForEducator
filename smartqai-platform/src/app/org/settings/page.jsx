"use client";

import { useOrganization, OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";

export default function OrgSettingsPage() {
  const { organization, isLoaded } = useOrganization();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // White-Label State
  const [orgName, setOrgName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [logoBase64, setLogoBase64] = useState("");

  // Security Redirect
  useEffect(() => {
    if (isLoaded && !organization) {
      router.push("/org");
    }
  }, [isLoaded, organization, router]);

  // Fetch Existing Settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!organization) return;
      try {
        const docRef = doc(db, "organizations", organization.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOrgName(data.orgName || organization.name);
          setSupportEmail(data.supportEmail || "");
          setLogoBase64(data.orgLogo || "");
        } else {
          // Default to Clerk org name if no settings exist yet
          setOrgName(organization.name);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isLoaded && organization) fetchSettings();
  }, [isLoaded, organization]);

  // Handle Image Upload & Convert to Base64 (No Firebase Storage needed)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Limit file size to 1MB to fit nicely in Firestore
    if (file.size > 1024 * 1024) {
      alert("Logo must be less than 1MB. Please compress it.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoBase64("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Save Settings to Firestore
  const saveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage("");

    try {
      await setDoc(doc(db, "organizations", organization.id), {
        orgName,
        supportEmail,
        orgLogo: logoBase64,
        updatedAt: new Date()
      }, { merge: true });

      setSaveMessage("Settings saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded || !organization) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-indigo-600"></i></div>;
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden w-full">
      
      {/* --- MOBILE SIDEBAR OVERLAY --- */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* --- B2B ENTERPRISE SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 md:w-72 bg-slate-900 text-white flex flex-col shrink-0 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <button 
          onClick={() => setIsMobileMenuOpen(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white lg:hidden w-8 h-8 flex items-center justify-center bg-slate-800 rounded-lg"
        >
          <i className="fas fa-times"></i>
        </button>

        <div className="h-20 flex items-center px-4 md:px-6 border-b border-slate-800 pt-4 lg:pt-0">
          <OrganizationSwitcher hidePersonal={true} appearance={{ elements: { organizationSwitcherTrigger: "text-white hover:bg-slate-800 px-3 py-2 rounded-xl transition w-full flex justify-between", organizationSwitcherTriggerIcon: "text-slate-400" } }} />
        </div>
        <nav className="flex-1 p-4 space-y-2 mt-2">
            <Link href="/org/dashboard" className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 md:p-3.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-chart-pie w-5 text-center"></i> Overview
            </Link>
            <button onClick={() => router.push('/org/create-mock')} className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 md:p-3.5 rounded-xl text-sm font-bold transition">
                <i className="fas fa-file-pdf w-5 text-center"></i> White-Label Exams
            </button>
            <Link href="/org/settings" className="w-full flex items-center gap-3 bg-indigo-600 text-white p-3 md:p-3.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-900/20 transition hover:bg-indigo-500">
                <i className="fas fa-palette w-5 text-center"></i> Brand Settings
            </Link>
        </nav>
        
        <div className="p-6 border-t border-slate-800 text-center">
           <div className="inline-flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
             <i className="fas fa-shield-alt text-indigo-500"></i> Enterprise Secured
           </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto relative w-full">
        
        {/* --- HEADER --- */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 md:h-20 px-4 md:px-8 flex justify-between items-center z-10 shrink-0 sticky top-0 shadow-sm">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-slate-600 hover:text-indigo-600 transition w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-bars"></i>
            </button>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-2xl font-black text-slate-900 truncate max-w-[150px] md:max-w-md">Workspace Settings</h1>
              <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">White-Label Customization</p>
            </div>
            <div className="block sm:hidden">
              <h1 className="text-base font-black text-slate-900 truncate max-w-[120px]">Settings</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
             <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* --- CONTENT AREA --- */}
        <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
          
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* LEFT: FORM */}
            <div className="flex-1">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 p-6 text-white">
                  <h2 className="text-xl font-black flex items-center gap-2"><i className="fas fa-crown text-amber-400"></i> Brand Configuration</h2>
                  <p className="text-slate-400 text-sm font-medium mt-1">Customize how your exams and automated emails appear to students.</p>
                </div>
                
                <form onSubmit={saveSettings} className="p-6 md:p-8 space-y-6">
                  
                  {/* Brand Name */}
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Display Name (Institution)</label>
                    <input 
                      type="text" 
                      required
                      value={orgName} 
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-inner" 
                      placeholder="e.g. Aakash Institute" 
                    />
                  </div>

                  {/* Support Email */}
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Support Email <span className="text-slate-400 font-medium normal-case tracking-normal">(Students will contact this)</span></label>
                    <input 
                      type="email" 
                      value={supportEmail} 
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 shadow-inner" 
                      placeholder="support@yourschool.com" 
                    />
                  </div>

                  {/* Logo Upload */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Institution Logo</label>
                    
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 relative group">
                        {logoBase64 ? (
                          <>
                            <img src={logoBase64} alt="Logo Preview" className="w-full h-full object-contain p-2 bg-white" />
                            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition cursor-pointer" onClick={removeLogo}>
                              <i className="fas fa-trash text-white"></i>
                            </div>
                          </>
                        ) : (
                          <i className="fas fa-image text-slate-300 text-3xl"></i>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={fileInputRef} 
                          onChange={handleImageUpload} 
                        />
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current.click()} 
                          className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-100 transition"
                        >
                          <i className="fas fa-upload mr-2"></i> Upload Image
                        </button>
                        <p className="text-xs text-slate-400 font-medium mt-2">Recommended: PNG or JPG with transparent background. Max 1MB.</p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-emerald-600 font-bold text-sm animate-pulse">{saveMessage}</span>
                    <button 
                      type="submit" 
                      disabled={isSaving}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-black shadow-lg shadow-indigo-600/20 transition transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isSaving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> Save Changes</>}
                    </button>
                  </div>

                </form>
              </div>
            </div>

            {/* RIGHT: LIVE PREVIEW (The "Aha" Moment) */}
            <div className="w-full lg:w-96 shrink-0">
              <div className="sticky top-28">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <i className="fas fa-eye text-indigo-400"></i> Live Preview
                </h3>
                
                {/* Simulated Exam Header */}
                <div className="bg-slate-900 rounded-t-2xl border border-slate-800 p-4 flex justify-between items-center shadow-2xl relative overflow-hidden">
                   <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none"></div>
                   <div className="flex items-center gap-3 relative z-10">
                     {logoBase64 ? (
                       <img src={logoBase64} alt="Logo" className="w-8 h-8 object-contain bg-white rounded p-1" />
                     ) : (
                       <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white text-xs"><i className="fas fa-building"></i></div>
                     )}
                     <span className="text-white font-black text-sm tracking-wide truncate max-w-[150px]">{orgName || "Institution Name"}</span>
                   </div>
                   <div className="text-emerald-400 font-mono text-sm font-black relative z-10">
                     <i className="far fa-clock"></i> 45:00
                   </div>
                </div>

                {/* Simulated Email Card */}
                <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl p-6 shadow-xl">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Results Email</p>
                    <h4 className="text-lg font-black text-slate-800">Your Exam Scorecard</h4>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-2 bg-slate-100 rounded-full w-3/4"></div>
                    <div className="h-2 bg-slate-100 rounded-full w-full"></div>
                    <div className="h-2 bg-slate-100 rounded-full w-5/6"></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2">
                     <span className="text-xs font-bold text-slate-400">Powered securely by</span>
                     <span className="text-xs font-black text-indigo-600">{orgName || "Your Brand"}</span>
                  </div>
                </div>

                <div className="mt-6 bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
                  <i className="fas fa-check-circle text-emerald-500 mt-0.5"></i>
                  <p className="text-xs font-bold text-emerald-800 leading-relaxed">
                    Once saved, these branding settings will automatically apply to all your embedded iframe exams and automated student result emails.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}