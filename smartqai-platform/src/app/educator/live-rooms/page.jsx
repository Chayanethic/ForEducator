"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ⚡ IMPORT GUEST BLOCKER ⚡
import GuestBlocker from "@/components/GuestBlocker";

export default function LiveRoomsHub() {
  const { user, isLoaded } = useUser();
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
    // ⚡ If Guest, stop loading and show empty state ⚡
    if (!user) {
      setIsLoading(false);
      return;
    }
    
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
    if (isLoaded) fetchMyRooms();
  }, [user, isLoaded]);

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

  // --- BRANDED LOADING SCREEN ---
  if (!isLoaded || isLoading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 flex-col animate-in fade-in duration-500">
      <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 text-indigo-50 rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-xl shadow-indigo-900/30 border border-indigo-400/30 transform -rotate-3 animate-pulse">
        <i className="fas fa-door-open"></i>
      </div>
      <h2 className="text-xl font-black text-slate-900 tracking-tight animate-pulse">Loading Rooms...</h2>
    </div>
  );

  return (
    // ⚡ Removed outer layout wrappers to fit perfectly into Educator Layout ⚡
    <div className="flex flex-col relative w-full h-full bg-slate-50 font-sans overflow-hidden">
      
      {/* PREMIUM UPGRADE: GLASSMORPHISM TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-4 animate-in slide-in-from-bottom-5 backdrop-blur-xl border border-white/20 
          ${toast.type === 'success' ? 'bg-emerald-600/90 text-white' : 'bg-rose-600/90 text-white'}`}>
          <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center shrink-0">
             <i className={`fas ${toast.type === 'success' ? 'fa-check' : 'fa-exclamation'} text-sm`}></i>
          </div>
          <span className="font-bold text-sm tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* PREMIUM UPGRADE: DELETE CONFIRMATION MODAL */}
      {confirmDialog.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-[95%] shadow-2xl border border-slate-200 animate-in zoom-in-95 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-rose-500"></div>
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto"><i className="fas fa-exclamation-triangle"></i></div>
              <h3 className="text-xl font-black text-slate-800 mb-2 text-center">Delete Exam?</h3>
              <p className="text-sm font-medium text-slate-500 mb-8 text-center leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-700">{confirmDialog.title}</strong>? This action cannot be undone and will remove it from all student dashboards.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                 <button onClick={() => setConfirmDialog({ show: false, mockId: null, title: "" })} className="px-6 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition w-full sm:w-1/2">Cancel</button>
                 <button onClick={executeDelete} className="px-6 py-3 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition shadow-md shadow-rose-500/20 w-full sm:w-1/2">Yes, Delete</button>
              </div>
           </div>
        </div>
      )}

      {/* DELETING PROCESSING SCREEN */}
      {isDeleting && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white p-10 rounded-[2rem] shadow-2xl flex flex-col items-center max-w-sm w-full border border-slate-100 relative overflow-hidden">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-rose-500 rounded-full border-t-transparent animate-spin"></div>
              <i className="fas fa-trash-alt absolute inset-0 flex items-center justify-center text-2xl text-rose-600"></i>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 text-center tracking-tight">Deleting Exam Data...</h3>
            <p className="text-slate-500 text-center font-medium text-sm">Clearing database records securely.</p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <header className="bg-white border-b border-slate-200 h-auto md:h-16 py-3 px-4 md:px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 z-20 shrink-0 shadow-sm sticky top-0">
        <div className="flex items-center gap-3 w-full md:w-auto">
            {/* HIGH-VISIBILITY BACK BUTTON */}
            <button onClick={() => router.push('/educator/dashboard')} className="shrink-0 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:text-white hover:bg-indigo-600 hover:shadow-md transition-all flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold" title="Back to Dashboard">
              <i className="fas fa-arrow-left"></i> <span className="hidden sm:block">Dashboard</span>
            </button>
            
            <h1 className="text-xl md:text-2xl font-black text-slate-900 ml-2">Live Rooms</h1>
        </div>
        
        <button 
          onClick={() => router.push('/educator/create-mock')}
          className="w-full md:w-auto bg-emerald-600 text-white px-5 py-2 md:py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
        >
          <i className="fas fa-plus"></i> Create New Mock
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {myRooms.length === 0 ? (
          <div className="mt-10 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500 px-4 text-center">
             <div className="w-24 h-24 bg-indigo-50 text-indigo-300 rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-inner border border-indigo-100/50 transform -rotate-3"><i className="fas fa-door-open"></i></div>
             <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-3 tracking-tight">No Rooms Created Yet</h2>
             <p className="text-sm font-medium text-slate-500 max-w-md mb-8 leading-relaxed">Head over to the Exam Studio to extract a PDF with AI or build your first custom mock exam.</p>
             
             <button onClick={() => router.push('/educator/create-mock')} className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-black hover:bg-indigo-700 hover:-translate-y-1 transition-all text-sm md:text-base shadow-lg shadow-indigo-600/30 flex items-center gap-2 w-full sm:w-auto justify-center">
               Go to Exam Studio <i className="fas fa-arrow-right ml-1"></i>
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6">
            {myRooms.map((room) => (
              <div key={room.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 transition-all flex flex-col overflow-hidden group">
                
                {/* Card Header & Content */}
                <div className="p-5 md:p-6 flex-1 flex flex-col relative">
                  
                  {/* Delete Button (Absolute top right, shows on hover) */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(room.id, room.title); }}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-300 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition-all opacity-100 md:opacity-0 group-hover:opacity-100 shadow-sm"
                    title="Delete Exam"
                  >
                    <i className="fas fa-trash-alt text-sm"></i>
                  </button>

                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-md shadow-sm ${room.visibility === 'public' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-purple-50 text-purple-600 border border-purple-200'}`}>
                      {room.visibility === 'public' ? <><i className="fas fa-globe-americas mr-1"></i> Public</> : <><i className="fas fa-lock mr-1"></i> Private</>}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded border border-slate-200">
                      <i className="far fa-calendar-alt mr-1"></i> {room.createdAtDate.toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h3 className="font-black text-slate-900 text-lg md:text-xl leading-tight mb-4 pr-8 line-clamp-2">{room.title}</h3>
                  
                  <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-slate-600 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm"><i className="fas fa-layer-group text-indigo-500"></i> {room.examCategory}</div>
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm"><i className="fas fa-clock text-amber-500"></i> {room.duration}m</div>
                    <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm truncate max-w-full"><i className="fas fa-eye text-emerald-500"></i> {room.availability === 'permanent' ? 'Always' : room.availability}</div>
                  </div>
                </div>

                {/* Room ID Bar (For Private Rooms) */}
                {room.visibility === 'private' && (
                  <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white px-5 py-4 border-t border-slate-800 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/20 rounded-full blur-xl pointer-events-none"></div>
                    <div className="relative z-10">
                      <span className="text-[9px] text-indigo-300 font-black uppercase tracking-widest block mb-0.5">Room ID</span>
                      <span className="font-mono text-lg md:text-xl font-black tracking-wider text-white">{room.id}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCopyCode(room.id); }}
                      className="relative z-10 text-slate-300 hover:text-emerald-400 bg-white/10 hover:bg-white/20 border border-white/10 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm hover:scale-105"
                      title="Copy Room ID"
                    >
                      <i className="fas fa-copy"></i>
                    </button>
                  </div>
                )}

                {/* Card Footer Action */}
                <div className="p-3 bg-slate-100 border-t border-slate-200">
                  <button 
                    onClick={() => router.push(`/educator/live-rooms/${room.id}`)}
                    className="w-full bg-white border border-slate-300 text-indigo-700 py-3 rounded-xl text-sm font-black hover:bg-indigo-50 hover:border-indigo-300 transition-colors shadow-sm flex items-center justify-center gap-2 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600"
                  >
                    <i className="fas fa-chart-line"></i> View Leaderboard
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}