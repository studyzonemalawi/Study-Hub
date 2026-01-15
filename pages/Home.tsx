
import React, { useState, useEffect } from 'react';
import { StudyMaterial, ReadingStatus, UserProgress, User } from '../types';
import { storage } from '../services/storage';
import { PdfViewer } from '../components/PdfViewer';

interface HomeProps {
  onNavigate: (tab: string) => void;
  user: User;
}

export const Home: React.FC<HomeProps> = ({ onNavigate, user }) => {
  const [recentMaterials, setRecentMaterials] = useState<StudyMaterial[]>([]);
  const [activeReading, setActiveReading] = useState<(StudyMaterial & { progress: UserProgress })[]>([]);
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);

  const userId = user?.id || 'guest';

  useEffect(() => {
    const all = storage.getMaterials();
    const progress = storage.getUserProgress(userId);

    const sorted = [...all].sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    ).slice(0, 5);
    setRecentMaterials(sorted);

    const readingItems = all
      .map(m => ({ 
        ...m, 
        progress: progress.find(p => p.materialId === m.id) 
      }))
      .filter(m => m.progress && m.progress.status === ReadingStatus.READING)
      .sort((a, b) => new Date(b.progress!.lastRead).getTime() - new Date(a.progress!.lastRead).getTime())
      .slice(0, 1) as (StudyMaterial & { progress: UserProgress })[];

    setActiveReading(readingItems);
  }, [userId, viewingMaterial]);

  const handleReadOnline = (m: StudyMaterial) => {
    setViewingMaterial(m);
    document.body.style.overflow = 'hidden';
  };

  const updateReadingStatus = (status: ReadingStatus) => {
    if (!viewingMaterial) return;
    const newProgress: UserProgress = {
      materialId: viewingMaterial.id,
      status: status,
      lastRead: new Date().toISOString(),
      progressPercent: status === ReadingStatus.COMPLETED ? 100 : 0
    };
    storage.updateProgress(userId, newProgress);
  };

  const closeReader = () => {
    setViewingMaterial(null);
    document.body.style.overflow = 'auto';
  };

  const modules = [
    { id: 'library', title: 'Library', desc: 'Revision Notes', icon: '📚', color: 'bg-indigo-600' },
    { id: 'papers', title: 'Past Papers', desc: 'Official Exams', icon: '📝', color: 'bg-emerald-600' },
    { id: 'announcements', title: 'Updates', desc: 'Stay Informed', icon: '📢', color: 'bg-orange-500' },
    { id: 'testimonials', title: 'Community', desc: 'Connect & Help', icon: '👥', color: 'bg-pink-600' },
    { id: 'activity', title: 'Progress', desc: 'My Statistics', icon: '📈', color: 'bg-blue-600' },
    { id: 'support', title: 'Support', desc: 'Help Desk', icon: '💬', color: 'bg-purple-600' },
    { id: 'faqs', title: 'FAQs', desc: 'Quick Guide', icon: '❓', color: 'bg-slate-700' },
    { id: 'settings', title: 'Account', desc: 'User Profile', icon: '⚙️', color: 'bg-slate-500' }
  ];

  if (user.appRole === 'admin') {
    modules.push({ id: 'admin', title: 'Admin Hub', desc: 'Management', icon: '🛡️', color: 'bg-red-600' });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-16 px-4 md:px-0">
      
      {/* Dynamic Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 dark:bg-[#020617] rounded-[3rem] p-10 md:p-16 lg:p-24 text-center border border-white/5 shadow-2xl">
        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Official Digital Repository
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tighter">
            Elevate your <span className="text-emerald-500 underline decoration-emerald-500/30 underline-offset-8">Academic Journey</span> in Malawi
          </h1>
          <p className="text-slate-400 text-sm md:text-lg max-w-2xl mx-auto font-medium leading-relaxed">
            Access the nation's largest library of primary and secondary school resources, completely digitized for modern learners.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
             <button onClick={() => onNavigate('library')} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs">Start Browsing</button>
             <button onClick={() => onNavigate('testimonials')} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl backdrop-blur-md transition-all active:scale-95 uppercase tracking-widest text-xs border border-white/10">Community Hub</button>
          </div>
        </div>
        
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.05] pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-[120px]"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-[120px]"></div>
        </div>
      </section>

      {/* Responsive Module Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        {activeReading.length > 0 && (
          <button
            onClick={() => handleReadOnline(activeReading[0])}
            className="col-span-2 bg-white dark:bg-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-orange-200 dark:border-orange-900/30 hover:shadow-2xl transition-all text-left flex flex-col justify-between group border-b-8 border-b-orange-500"
          >
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg mb-6 inline-block">Continue Learning</span>
              <h3 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mb-2 line-clamp-2 leading-tight">{activeReading[0].title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">{activeReading[0].subject} • {activeReading[0].grade}</p>
            </div>
            <div className="mt-10 flex items-center gap-3 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-2 transition-transform">
              Resume Reader <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            </div>
          </button>
        )}

        {modules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => onNavigate(mod.id)}
            className="group bg-white dark:bg-slate-800 p-6 md:p-8 lg:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-2xl hover:border-emerald-500/20 transition-all text-center flex flex-col items-center justify-center min-h-[160px] md:min-h-[200px]"
          >
            <div className={`${mod.color} w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 text-white shadow-lg transition-all group-hover:scale-110 group-hover:rotate-3`}>
              {mod.icon}
            </div>
            <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-slate-100 mb-1 tracking-tight leading-none">{mod.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest opacity-60 mt-1">{mod.desc}</p>
          </button>
        ))}
      </div>

      {/* Recent Materials Section */}
      <section className="bg-white dark:bg-slate-800 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 relative z-10">
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
              Newly Released
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Updates to the national resource bank.</p>
          </div>
          <button onClick={() => onNavigate('library')} className="px-6 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-emerald-600 hover:text-white transition-all">Full Collection</button>
        </div>

        <div className="grid gap-4 relative z-10">
          {recentMaterials.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-black uppercase tracking-widest text-[10px] bg-slate-50 dark:bg-slate-900/50 rounded-[2rem]">No recent uploads found.</div>
          ) : (
            recentMaterials.map((m) => (
              <div key={m.id} className="group bg-slate-50 dark:bg-slate-900/50 p-5 rounded-[2rem] border border-transparent hover:border-emerald-500/20 hover:bg-white dark:hover:bg-slate-900 transition-all flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-slate-700 flex-none group-hover:bg-emerald-50 transition-all">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">SH</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 transition-colors truncate">{m.title}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 truncate">{m.grade} • {m.subject}</p>
                  </div>
                </div>
                <button onClick={() => handleReadOnline(m)} className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all ml-4 flex-none">Open</button>
              </div>
            ))
          )}
        </div>
        
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {viewingMaterial && (
        <PdfViewer 
          material={viewingMaterial} 
          userId={userId}
          currentProgress={activeReading.find(p => p.id === viewingMaterial.id)?.progress}
          onClose={closeReader}
          onUpdateStatus={updateReadingStatus}
        />
      )}
    </div>
  );
};
