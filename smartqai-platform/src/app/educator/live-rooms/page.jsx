"use client";

import { useState, useEffect } from "react";
// 1. CHANGED: Import useClerk instead of UserButton
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LiveRoomsHub() {
  const { user, isLoaded, isSignedIn } = useUser();
  // 2. NEW: Bring in the signOut function from Clerk
  const { signOut } = useClerk();
  const router = useRouter();
  
  const [myRooms, setMyRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [confirmDialog, setConfirmDialog] = useState({ show: false, mockId: null, title: "" });
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const fetchMyRooms = async () => {
    if (!user) return;
    
    try {
      const mocksRef = collection(db, "mocks");
      const q = query(mocksRef, where("educatorId", "==", user.id));
      const querySnapshot = await getDocs(q);
      
      let fetchedRooms = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAtDate: doc.data().createdAt?.toDate() || new Date() 
      }));

      fetchedRooms.sort((a, b) => b.createdAtDate - a.createdAtDate);
      setMyRooms(fetchedRooms);
    } catch (error) {
      console.error("Error fetching live rooms:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) fetchMyRooms();
  }, [user, isLoaded, isSignedIn]);

  const handleDeleteClick = (mockId, title) => {
    setConfirmDialog({ show: true, mockId, title });
  };

  const executeDelete = async () => {
    const { mockId } = confirmDialog;
    setConfirmDialog({ show: false, mockId: null, title: "" });
    setIsDeleting(true);
    
    try {
      const qRef = collection(db, "mocks", mockId, "questions");
      const qSnap = await getDocs(qRef);
      const deletePromises = qSnap.docs.map(d => deleteDoc(doc(db, "mocks", mockId, "questions", d.id)));
      await Promise.all(deletePromises);

      await deleteDoc(doc(db, "mocks", mockId));
      
      setMyRooms(prevRooms => prevRooms.filter(room => room.id !== mockId));
      showToast("Mock exam deleted successfully.", "success");
      
    } catch (error) {
      console.error("Error deleting mock:", error);
      showToast("Failed to delete mock. Please try again.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyCode = (id) => {
    navigator.clipboard.writeText(id);
    showToast("Room ID copied to clipboard!", "success");
  };

  if (!isLoaded || isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-emerald-600"></i></div>;
  if (!isSignedIn) return <div className="p-10 text-center">Please log in.</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans relative overflow-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
      `}} />

      {/* CUSTOM TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-slide-up ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-xl`}></i>
          <span className="font-bold tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center transform transition-all scale-100">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Delete Exam?</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-700">{confirmDialog.title}</strong>? This action cannot be undone and will remove it from all student dashboards.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmDialog({ show: false, mockId: null, title: "" })} 
                className="flex-1 bg-slate-100 text-slate-700 py-3.5 rounded-xl font-bold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button 
                onClick={executeDelete} 
                className="flex-1 bg-rose-600 text-white py-3.5 rounded-xl font-bold hover:bg-rose-700 transition shadow-lg shadow-rose-500/30"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETING PROCESSING SCREEN */}
      {isDeleting && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[60] flex flex-col items-center justify-center">
          <i className="fas fa-circle-notch fa-spin text-5xl text-rose-500 mb-6"></i>
          <h2 className="text-white text-2xl font-bold animate-pulse">Deleting Exam Data...</h2>
          <p className="text-slate-400 mt-2">Clearing database records securely.</p>
        </div>
      )}

      {/* EDUCATOR SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex shrink-0 z-10">
        <Link href="/onboarding?switch=true" className="p-6 text-2xl font-bold flex items-center gap-2 border-b border-slate-800 hover:text-emerald-400 transition cursor-pointer block">
          
           <i className="fas fa-book-open-reader text-emerald-400"></i> OZONE
        
        </Link>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button 
              onClick={() => router.push('/educator/create-mock')}
              className="w-full flex items-center gap-3 text-slate-400 hover:bg-slate-800 hover:text-white p-3 rounded-lg transition"
            >
                <i className="fas fa-file-pdf w-5"></i> AI PDF Extractor
            </button>
            <button 
              onClick={() => router.push('/educator/live-rooms')}
              className="w-full flex items-center gap-3 bg-slate-800 text-white p-3 rounded-lg font-medium border-l-4 border-emerald-500"
            >
                <i className="fas fa-door-open w-5"></i> Live Rooms
            </button>
        </nav>
        
        {/* --- 3. UPGRADED: BOTTOM PROFILE & LOGOUT BUTTON --- */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-2">
            
            {/* Static User Profile Badge */}
            <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800 shadow-inner">
                <img src={user?.imageUrl || "https://ui-avatars.com/api/?name=Educator"} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-700" />
                <div className="text-sm font-medium truncate flex-1 text-slate-300">{user?.fullName || "Account"}</div>
            </div>

            {/* Switch Role Button */}
            <button 
              onClick={() => router.push('/onboarding?switch=true')}
              className="w-full flex items-center justify-center gap-2 text-slate-400 hover:bg-slate-800 hover:text-white p-2.5 rounded-lg transition text-sm font-bold border border-transparent hover:border-slate-700 shadow-sm"
            >
                <i className="fas fa-exchange-alt"></i> Switch Role
            </button>

            {/* Custom Log Out Button */}
            <button 
              onClick={() => signOut({ redirectUrl: '/' })}
              className="w-full flex items-center justify-center gap-2 text-rose-400 hover:bg-rose-600 hover:text-white p-2.5 rounded-lg transition text-sm font-bold border border-rose-900/50 hover:border-rose-500 bg-rose-950/20 shadow-sm"
            >
                <i className="fas fa-sign-out-alt"></i> Log Out
            </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="bg-white shadow-sm p-6 flex justify-between items-center z-10 sticky top-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Live Rooms & Analytics</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your active exams and view student performance.</p>
          </div>
          <button 
            onClick={() => router.push('/educator/create-mock')}
            className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-emerald-700 transition flex items-center gap-2"
          >
            <i className="fas fa-plus"></i> Create New Mock
          </button>
        </header>

        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
          
          {myRooms.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm">
              <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
                <i className="fas fa-folder-open"></i>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">No Rooms Created Yet</h2>
              <p className="text-slate-500 mb-8">Extract a PDF to create your first live mock exam.</p>
              <button 
                onClick={() => router.push('/educator/create-mock')}
                className="bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-700 transition"
              >
                Go to Studio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRooms.map((room) => (
                <div key={room.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-emerald-400 transition-all flex flex-col overflow-hidden group">
                  
                  {/* Card Header */}
                  <div className="p-6 border-b border-slate-100 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-md ${room.visibility === 'public' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                        {room.visibility === 'public' ? <><i className="fas fa-globe mr-1"></i> Public</> : <><i className="fas fa-lock mr-1"></i> Private</>}
                      </span>
                      
                      {/* Date & Delete Button Area */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded">
                          {room.createdAtDate.toLocaleDateString()}
                        </span>
                        <button 
                          onClick={() => handleDeleteClick(room.id, room.title)}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white hover:bg-rose-500 rounded-md transition opacity-0 group-hover:opacity-100"
                          title="Delete Mock"
                        >
                          <i className="fas fa-trash-alt text-xs"></i>
                        </button>
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-xl leading-tight mb-3">{room.title}</h3>
                    
                    <div className="flex items-center gap-5 text-xs text-slate-500 font-bold mt-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-1.5"><i className="fas fa-clock text-slate-400"></i> {room.duration} mins</div>
                      <div className="flex items-center gap-1.5"><i className="fas fa-calendar-alt text-slate-400"></i> {room.availability === 'permanent' ? 'Always Open' : room.availability}</div>
                    </div>
                  </div>

                  {/* Room ID Bar (For Private Rooms) */}
                  {room.visibility === 'private' && (
                    <div className="bg-slate-900 text-white px-6 py-3.5 border-b border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-0.5">Room ID</span>
                        <span className="font-mono text-base font-bold tracking-wider">{room.id}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyCode(room.id);
                        }}
                        className="text-slate-300 hover:text-emerald-400 bg-slate-800 hover:bg-slate-700 w-10 h-10 rounded-lg flex items-center justify-center transition"
                        title="Copy Room ID"
                      >
                        <i className="fas fa-copy"></i>
                      </button>
                    </div>
                  )}

                  {/* Card Footer Action */}
                  <div className="p-4 bg-slate-50">
                    <button 
                      onClick={() => router.push(`/educator/live-rooms/${room.id}`)}
                      className="w-full bg-white border border-slate-200 text-emerald-600 py-3 rounded-xl text-sm font-bold hover:bg-emerald-50 hover:border-emerald-200 transition shadow-sm"
                    >
                      View Leaderboard & Analytics <i className="fas fa-arrow-right ml-1 text-xs"></i>
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}