
import React, { useState, useEffect } from 'react';
import { StudyMaterial, ReadingStatus, UserProgress, User, EducationLevel } from '../types';
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
  const isAdmin = user.appRole === 'admin';

  useEffect(() => {
    const all = storage.getMaterials();
    const progress = storage.getUserProgress(userId);

    // If Admin, show everything. If student, filter by their permanent level.
    const filteredAll = isAdmin ? all : all.filter(m => m.level === user.educationLevel);
    
    const sorted = filteredAll.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    ).slice(0, 5);
    setRecentMaterials(sorted);

    const readingItems = all
      .map(m => ({ 
        ...m, 
        progress: progress.find(p => p.materialId === m.id) 
      }))
      .filter(m => {
        const isReading = m.progress && m.progress.status === ReadingStatus.READING;
        // For admin, show any reading. For students, filter by level.
        return isReading && (isAdmin || m.level === user.educationLevel);
      })
      .sort((a, b) => {
          const aTime = a.progress?.lastRead ? new Date(a.progress.lastRead).getTime() : 0;
          const bTime = b.progress?.lastRead ? new Date(b.progress.lastRead).getTime() : 0;
          return bTime - aTime;
      })
      .slice(0, 1) as (StudyMaterial & { progress: UserProgress })[];

    setActiveReading(readingItems);
  }, [userId, viewingMaterial, user.educationLevel, isAdmin]);

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
    { id: 'exams', title: 'Online Exams', desc: 'AI Assessment', icon: '📝', color: 'bg-emerald-600' },
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

  const getFirstName = (fullName: string) => {
    return fullName ? fullName.split(' ')[0] : 'Learner';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-16 px-4 md:px-0">
      
      <section className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-[3rem] p-8 md:p-16 border border-slate-100 dark:border-slate-700 shadow-2xl">
        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 rounded-2xl text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] shadow-sm">
            <span className="animate-pulse">🇲🇼</span>
            Malawi Academic Hub
          </div>
          
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tighter">
              You are most welcome,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-blue-600 dark:from-emerald-400 dark:to-blue-400">
                {getFirstName(user.name)}!
              </span>
            </h1>
            <div className="flex flex-col items-center gap-2">
              <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">
                {isAdmin ? 'System Administrator' : `${user.educationLevel} Student • ${user.currentGrade}`} • {user.district || 'Study Hub'} District
              </p>
              <div className="h-1 w-20 bg-emerald-500/20 rounded-full mt-2"></div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <button 
              onClick={() => onNavigate('library')} 
              className="group px-10 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-3xl shadow-2xl hover:shadow-emerald-500/10 transition-all active:scale-95 uppercase tracking-widest text-[11px] flex items-center gap-3"
            >
              <span>{isAdmin ? 'Access All Libraries' : `Browse ${user.educationLevel} Materials`}</span>
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
            <button 
              onClick={() => onNavigate('exams')} 
              className="px-10 py-5 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-black rounded-3xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 transition-all active:scale-95 uppercase tracking-widest text-[11px]"
            >
              Take Exam
            </button>
          </div>
        </div>
        
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent_70%)] pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <span className="text-[12rem] font-black leading-none select-none">SH</span>
        </div>
      </section>

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

      <section className="bg-white dark:bg-slate-800 rounded-[3rem] p-8 md:p-12 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 relative z-10">
          <div>
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
              Newly Released {isAdmin ? '(All Levels)' : `(${user.educationLevel})`}
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
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 dark:bg-slate-800 rounded-2xl flex items-center justify-center border border-emerald-400/20 flex-none shadow-md group-hover:scale-110 transition-transform">
                    <span className="text-[10px] font-black text-white">SH</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 transition-colors truncate">{m.title}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 truncate">{m.grade} • {m.subject} {isAdmin && `• ${m.level}`}</p>
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
