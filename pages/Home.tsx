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
    { id: 'library', title: 'Notes Library', desc: 'Books & Resources', icon: '📚', color: 'bg-indigo-600' },
    { id: 'papers', title: 'Past Papers', desc: 'Exam Bank', icon: '📝', color: 'bg-emerald-600' },
    { id: 'announcements', title: 'Updates', desc: 'Latest News', icon: '📢', color: 'bg-orange-500' },
    { id: 'activity', title: 'My Progress', desc: 'Study Stats', icon: '📈', color: 'bg-blue-600' },
    { id: 'support', title: 'Support', desc: 'Talk to Admin', icon: '💬', color: 'bg-purple-600' },
    { id: 'testimonials', title: 'Community', desc: 'Success Stories', icon: '👥', color: 'bg-pink-600' },
    { id: 'faqs', title: 'FAQs', desc: 'Quick Answers', icon: '❓', color: 'bg-slate-700' },
    { id: 'settings', title: 'Settings', desc: 'Account Control', icon: '⚙️', color: 'bg-slate-500' }
  ];

  if (user.appRole === 'admin') {
    modules.push({ id: 'admin', title: 'Admin Hub', desc: 'System Control', icon: '🛡️', color: 'bg-red-600' });
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      {/* Professional Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 dark:bg-[#020617] rounded-[3rem] p-10 md:p-20 text-center border border-white/5 shadow-2xl shadow-slate-900/20">
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Official Study Hub
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
            Largest digital repository for <span className="text-emerald-500">Primary</span> and <span className="text-emerald-500">Secondary</span> education in Malawi
          </h1>
          <div className="h-1 w-20 bg-emerald-500 mx-auto rounded-full"></div>
        </div>
        
        {/* Background Elements for Depth */}
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none select-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500 rounded-full blur-[100px]"></div>
        </div>
      </section>

      {/* Module Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
        {/* Active Reading Resume (If any) */}
        {activeReading.length > 0 && (
          <button
            onClick={() => handleReadOnline(activeReading[0])}
            className="col-span-2 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-orange-200 dark:border-orange-900/30 hover:shadow-xl transition-all text-left flex flex-col justify-between group border-b-8 border-b-orange-500"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-black uppercase tracking-widest text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-lg">Resume Reading</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-1 line-clamp-1">{activeReading[0].title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wide">{activeReading[0].subject} • {activeReading[0].grade}</p>
            </div>
            <div className="mt-8 flex items-center gap-2 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase tracking-widest group-hover:gap-4 transition-all">
              Return to Book <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </div>
          </button>
        )}

        {/* Standard Modules */}
        {modules.map((mod) => (
          <button
            key={mod.id}
            onClick={() => onNavigate(mod.id)}
            className="group bg-white dark:bg-slate-800 p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200/60 dark:border-slate-700 hover:shadow-2xl hover:-translate-y-1 transition-all text-center flex flex-col items-center justify-center min-h-[160px] md:min-h-[240px]"
          >
            <div className={`${mod.color} w-12 h-12 md:w-16 md:h-16 rounded-[1.2rem] md:rounded-[1.5rem] flex items-center justify-center text-2xl md:text-3xl mb-4 md:mb-6 text-white shadow-xl shadow-${mod.color.split('-')[1]}-100 dark:shadow-none transition-all group-hover:scale-110 group-hover:rotate-3`}>
              {mod.icon}
            </div>
            <h3 className="text-sm md:text-lg font-black text-slate-900 dark:text-slate-100 mb-1 tracking-tight">{mod.title}</h3>
            <p className="hidden md:block text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest opacity-60">{mod.desc}</p>
          </button>
        ))}
      </div>

      {/* Footer-aligned Section: Recent Materials */}
      <section className="bg-white dark:bg-slate-800 rounded-[3rem] p-8 md:p-12 border border-slate-200/60 dark:border-slate-700 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <span className="w-1.5 h-8 bg-emerald-500 rounded-full"></span>
              Newly Released
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Latest academic resources added to the bank.</p>
          </div>
          <button 
            onClick={() => onNavigate('library')} 
            className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] hover:underline"
          >
            Full Collection
          </button>
        </div>

        <div className="grid gap-4">
          {recentMaterials.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-black uppercase tracking-widest text-[10px]">
              No recent uploads.
            </div>
          ) : (
            recentMaterials.map((m) => (
              <div key={m.id} className="group bg-slate-50 dark:bg-slate-900/50 p-5 rounded-[2rem] border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900/30 transition-all flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-[10px] font-black text-emerald-600 border border-slate-200 dark:border-slate-700">PDF</div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">{m.title}</h4>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">{m.grade} • {m.subject}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleReadOnline(m)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 dark:shadow-none transition-all"
                >
                  Open
                </button>
              </div>
            ))
          )}
        </div>
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