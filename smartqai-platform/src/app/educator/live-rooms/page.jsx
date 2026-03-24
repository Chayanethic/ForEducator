"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LiveRoomsHub() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  
  const [myRooms, setMyRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMyRooms = async () => {
      if (!user) return;
      
      try {
        // Fetch exams created ONLY by this educator
        const mocksRef = collection(db, "mocks");
        const q = query(mocksRef, where("educatorId", "==", user.id));
        const querySnapshot = await getDocs(q);
        
        let fetchedRooms = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAtDate: doc.data().createdAt?.toDate() || new Date() 
        }));

        // Sort by newest first
        fetchedRooms.sort((a, b) => b.createdAtDate - a.createdAtDate);
        setMyRooms(fetchedRooms);
      } catch (error) {
        console.error("Error fetching live rooms:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && isSignedIn) fetchMyRooms();
  }, [user, isLoaded, isSignedIn]);

  if (!isLoaded || isLoading) return <div className="flex h-screen items-center justify-center bg-slate-50"><i className="fas fa-spinner fa-spin text-4xl text-emerald-600"></i></div>;
  if (!isSignedIn) return <div className="p-10 text-center">Please log in.</div>;

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* EDUCATOR SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex-col hidden md:flex shrink-0">
        <div className="p-6 text-2xl font-bold flex items-center gap-2 border-b border-slate-800">
            <i className="fas fa-chalkboard-teacher text-emerald-400"></i> SmartQAI
        </div>
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
            className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-medium shadow-sm hover:bg-emerald-700 transition flex items-center gap-2"
          >
            <i className="fas fa-plus"></i> Create New Mock
          </button>
        </header>

        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full">
          {myRooms.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center shadow-sm">
              <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                <i className="fas fa-folder-open"></i>
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">No Rooms Created Yet</h2>
              <p className="text-slate-500 mb-6">Extract a PDF to create your first live mock exam.</p>
              <button onClick={() => router.push('/educator/create-mock')} className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-slate-700 transition">Go to Studio</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRooms.map((room) => (
                <div key={room.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition flex flex-col overflow-hidden">
                  
                  <div className="p-5 border-b border-slate-100 flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${room.visibility === 'public' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {room.visibility === 'public' ? <><i className="fas fa-globe mr-1"></i> Public</> : <><i className="fas fa-lock mr-1"></i> Private</>}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">{room.createdAtDate.toLocaleDateString()}</span>
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2">{room.title}</h3>
                    
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium mt-4">
                      <div className="flex items-center gap-1.5"><i className="fas fa-clock text-slate-400"></i> {room.duration} mins</div>
                      <div className="flex items-center gap-1.5"><i className="fas fa-calendar-alt text-slate-400"></i> {room.availability === 'permanent' ? 'Always Open' : room.availability}</div>
                    </div>
                  </div>

                  {room.visibility === 'private' && (
                    <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block mb-0.5">Room ID</span>
                        <span className="font-mono text-sm font-bold text-slate-800">{room.id}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(room.id); alert("Room ID Copied!"); }} className="text-slate-400 hover:text-emerald-600 transition" title="Copy Room ID">
                        <i className="fas fa-copy"></i>
                      </button>
                    </div>
                  )}

                  <div className="p-4 bg-slate-50">
                    <button 
                      onClick={() => router.push(`/educator/live-rooms/${room.id}`)}
                      className="w-full bg-white border border-slate-200 text-emerald-600 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-50 hover:border-emerald-200 transition"
                    >
                      View Leaderboard <i className="fas fa-arrow-right ml-1 text-xs"></i>
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