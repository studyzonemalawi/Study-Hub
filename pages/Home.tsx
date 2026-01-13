
import React, { useState, useEffect } from 'react';
import { StudyMaterial, ReadingStatus, UserProgress } from '../types';
import { storage } from '../services/storage';
import { PdfViewer } from '../components/PdfViewer';

interface HomeProps {
  onNavigate: (tab: string) => void;
  userName: string;
}

export const Home: React.FC<HomeProps> = ({ onNavigate, userName }) => {
  const [recentMaterials, setRecentMaterials] = useState<StudyMaterial[]>([]);
  const [activeReading, setActiveReading] = useState<(StudyMaterial & { progress: UserProgress })[]>([]);
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);

  const userStr = localStorage.getItem('study_hub_session');
  const user = userStr ? JSON.parse(userStr) : null;
  const userId = user?.id || 'guest';

  useEffect(() => {
    const all = storage.getMaterials();
    const progress = storage.getUserProgress(userId);

    // Sort by date descending and take top 5
    const sorted = [...all].sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    ).slice(0, 5);
    setRecentMaterials(sorted);

    // Filter for items currently being read
    const readingItems = all
      .map(m => ({ 
        ...m, 
        progress: progress.find(p => p.materialId === m.id) 
      }))
      .filter(m => m.progress && m.progress.status === ReadingStatus.READING)
      .sort((a, b) => new Date(b.progress!.lastRead).getTime() - new Date(a.progress!.lastRead).getTime())
      .slice(0, 3) as (StudyMaterial & { progress: UserProgress })[];

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

  const handleDownload = (m: StudyMaterial) => {
    const link = document.createElement('a');
    link.href = m.fileUrl;
    link.download = m.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-10 pb-20 md:pb-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <section className="bg-emerald-800 text-white rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-4xl font-black mb-2">Muli bwanji, {userName}!</h2>
          <p className="text-emerald-100 text-xl opacity-90 max-w-md">Your personalized learning dashboard is ready. What are we studying today?</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span className="bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/20">MANEB 2024 Prep</span>
            <span className="bg-white/10 backdrop-blur-md px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/20">Active Study</span>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <span className="text-[12rem] rotate-12 inline-block">🎓</span>
        </div>
      </section>

      {/* Continue Reading Section */}
      {activeReading.length > 0 && (
        <section className="animate-in slide-in-from-left-4 duration-700 delay-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
              <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
              Continue Reading
            </h3>
            <button onClick={() => onNavigate('library')} className="text-emerald-600 font-bold text-sm hover:underline">See Library</button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {activeReading.map((m) => (
              <div key={m.id} className="bg-white p-6 rounded-[2rem] border border-orange-100 shadow-sm hover:shadow-xl transition-all group border-b-4 border-b-orange-400">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                  </div>
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">In Progress</span>
                </div>
                <h4 className="font-bold text-gray-800 line-clamp-1 mb-2">{m.title}</h4>
                <p className="text-xs text-gray-400 mb-6">{m.subject} • {m.grade}</p>
                <button 
                  onClick={() => handleReadOnline(m)}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-orange-100"
                >
                  Resume
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {[
          { title: 'Notes Library', desc: 'Standards 5-8 & Forms 1-4', icon: '📚', tab: 'library', color: 'bg-blue-600' },
          { title: 'Past Papers', desc: 'MANEB & District Exams', icon: '📝', tab: 'papers', color: 'bg-emerald-600' },
          { title: 'Support Chat', desc: 'Speak with Study Hub Admins', icon: '💬', tab: 'support', color: 'bg-purple-600' }
        ].map((card, idx) => (
          <button
            key={idx}
            onClick={() => onNavigate(card.tab)}
            className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all text-left flex flex-col justify-between"
          >
            <div>
              <div className={`${card.color} w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-6 text-white shadow-2xl shadow-${card.color.split('-')[1]}-200`}>
                {card.icon}
              </div>
              <h3 className="text-2xl font-black text-gray-800 mb-2">{card.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
            </div>
            <div className="mt-8 flex items-center text-emerald-600 font-black text-sm group-hover:gap-3 gap-2 transition-all">
              GO NOW <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </div>
          </button>
        ))}
      </div>

      <section className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl">
        <h3 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3">
          <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
          Newly Released
        </h3>
        <div className="grid gap-4">
          {recentMaterials.length === 0 ? (
            <div className="text-center py-20 text-gray-400 border border-dashed border-gray-200 rounded-[2rem]">
              <span className="text-4xl block mb-4">✨</span>
              <p className="font-bold">No new uploads today.</p>
              <p className="text-xs">Stay tuned for Malawian academic excellence!</p>
            </div>
          ) : (
            recentMaterials.map((m) => (
              <div key={m.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-gray-50 rounded-3xl hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100 group">
                <div className="flex items-center space-x-5 mb-4 md:mb-0">
                  <div className="p-3 bg-white rounded-2xl text-emerald-600 font-black border border-emerald-100 shadow-sm">PDF</div>
                  <div>
                    <h4 className="font-bold text-gray-800 group-hover:text-emerald-900">{m.title}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{m.level} • {m.grade} • {m.subject}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => handleReadOnline(m)}
                    className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-black hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                  >
                    Open
                  </button>
                  <button 
                    onClick={() => handleDownload(m)}
                    className="p-3 bg-white text-emerald-600 border border-emerald-100 rounded-2xl hover:bg-emerald-50 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  </button>
                </div>
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
