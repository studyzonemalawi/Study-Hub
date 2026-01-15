
import React, { useState, useEffect } from 'react';
import { 
  EducationLevel, 
  Grade, 
  Category, 
  StudyMaterial, 
  ReadingStatus,
  UserProgress,
  PRIMARY_GRADES, 
  SECONDARY_GRADES, 
  PRIMARY_SUBJECTS, 
  SECONDARY_SUBJECTS,
  User
} from '../types';
import { storage } from '../services/storage';
import { PdfViewer } from '../components/PdfViewer';

interface LibraryProps {
  onNavigate: (tab: string) => void;
}

export const Library: React.FC<LibraryProps> = ({ onNavigate }) => {
  const [level, setLevel] = useState<EducationLevel>(EducationLevel.PRIMARY);
  const [selectedGrade, setSelectedGrade] = useState<Grade>(PRIMARY_GRADES[0]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<'browse' | 'downloads'>('browse');

  // Feedback State
  const [notification, setNotification] = useState<{ type: 'success' | 'info', text: string } | null>(null);

  const userStr = localStorage.getItem('study_hub_session');
  const sessionUser = userStr ? JSON.parse(userStr) : null;
  const userId = sessionUser?.id || 'guest';

  useEffect(() => {
    setMaterials(storage.getMaterials());
    setUserProgress(storage.getUserProgress(userId));
    const users = storage.getUsers();
    const found = users.find(u => u.id === userId);
    if (found) setCurrentUser(found);
  }, [userId]);

  useEffect(() => {
    setSelectedSubject(null);
  }, [level, selectedGrade, activeView]);

  const triggerNotification = (text: string, type: 'success' | 'info' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleDownload = (m: StudyMaterial) => {
    const link = document.createElement('a');
    link.href = m.fileUrl;
    link.download = m.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    storage.recordDownload(userId, m.id);
    
    triggerNotification(`Downloading: ${m.title}`);
    
    const updatedUsers = storage.getUsers();
    const found = updatedUsers.find(u => u.id === userId);
    if (found) setCurrentUser(found);
  };

  const removeDownload = (mId: string) => {
    if (window.confirm('Remove this file from your offline list?')) {
      storage.removeDownload(userId, mId);
      triggerNotification('Resource removed from offline access');
      const updatedUsers = storage.getUsers();
      const found = updatedUsers.find(u => u.id === userId);
      if (found) setCurrentUser(found);
    }
  };

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
    setUserProgress(storage.getUserProgress(userId));
  };

  const closeReader = () => {
    setViewingMaterial(null);
    document.body.style.overflow = 'auto';
  };

  const getStatusForMaterial = (mId: string) => {
    return userProgress.find(p => p.materialId === mId)?.status || ReadingStatus.NOT_STARTED;
  };

  const getSubjectMaterialCount = (subjectName: string) => {
    return materials.filter(m => 
      m.level === level && 
      m.grade === selectedGrade && 
      m.subject === subjectName
    ).length;
  };

  const grades = level === EducationLevel.PRIMARY ? PRIMARY_GRADES : SECONDARY_GRADES;
  const subjects = level === EducationLevel.PRIMARY ? PRIMARY_SUBJECTS : SECONDARY_SUBJECTS;

  const filteredMaterials = materials.filter(m => {
    if (activeView === 'downloads') {
      return currentUser?.downloadedIds.includes(m.id);
    }
    return m.level === level && m.grade === selectedGrade && m.subject === selectedSubject;
  });

  const groupedByCategory = filteredMaterials.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<Category, StudyMaterial[]>);

  return (
    <div className="space-y-10 pb-32 animate-in fade-in duration-500 relative">
      
      {/* Dynamic Success Toast */}
      {notification && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-3xl shadow-2xl border flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-700 text-white'
        }`}>
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs">SH</div>
            <span className="text-[10px] font-black uppercase tracking-widest">{notification.text}</span>
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse ml-2"></div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            {activeView === 'browse' ? 'Academic Library' : 'My Saved Resources'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {activeView === 'browse' ? `Access premium Malawian education content for ${level} students.` : 'Manage your offline materials for gapless learning.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex p-1.5 bg-slate-200/50 dark:bg-slate-800 rounded-2xl w-fit border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => setActiveView('browse')}
              className={`px-6 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${activeView === 'browse' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-500'}`}
            >
              Browse
            </button>
            <button 
              onClick={() => setActiveView('downloads')}
              className={`px-6 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${activeView === 'downloads' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-500'}`}
            >
              Offline ({currentUser?.downloadedIds.length || 0})
            </button>
          </div>
          
          {activeView === 'browse' && (
            <div className="flex p-1.5 bg-slate-200/50 dark:bg-slate-800 rounded-2xl w-fit border border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => { setLevel(EducationLevel.PRIMARY); setSelectedGrade(PRIMARY_GRADES[0]); }}
                className={`px-5 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${level === EducationLevel.PRIMARY ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-500'}`}
              >
                Primary
              </button>
              <button 
                onClick={() => { setLevel(EducationLevel.SECONDARY); setSelectedGrade(SECONDARY_GRADES[0]); }}
                className={`px-5 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${level === EducationLevel.SECONDARY ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-700 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-500'}`}
              >
                Secondary
              </button>
            </div>
          )}
        </div>
      </div>

      {activeView === 'browse' && (
        <div className="flex flex-wrap gap-3 overflow-x-auto no-scrollbar pb-2">
          {grades.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              className={`flex-shrink-0 px-6 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedGrade === g ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-100 dark:shadow-none' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-emerald-300'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {activeView === 'browse' && !selectedSubject ? (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {subjects.map(sub => {
              const count = getSubjectMaterialCount(sub);
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-[3rem] border border-slate-200/60 dark:border-slate-700 shadow-sm hover:shadow-2xl hover:border-emerald-300 dark:hover:border-emerald-500/30 transition-all text-left group relative overflow-hidden flex flex-col justify-between h-full min-h-[180px]"
                >
                  <div>
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center p-3 mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-emerald-500/20">
                      <span className="font-black text-xs md:text-sm text-white">SH</span>
                    </div>
                    <h4 className="font-black text-slate-900 dark:text-slate-100 text-xs md:text-sm uppercase tracking-[0.05em] leading-tight pr-4">{sub}</h4>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${count > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-900/40'}`}>
                      {count} {count === 1 ? 'Entry' : 'Entries'}
                    </span>
                    <div className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-6">
            <div className="flex items-center space-x-6">
              {activeView === 'browse' && (
                <button 
                  onClick={() => setSelectedSubject(null)}
                  className="p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all shadow-sm group"
                >
                  <svg className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">{activeView === 'browse' ? selectedSubject : 'Saved Resources'}</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mt-1">
                  {filteredMaterials.length} materials matching selection
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-16">
            {filteredMaterials.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-24 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="text-7xl mb-8 opacity-20 grayscale">📂</div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">No Content Found</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Try checking another category or academic year.</p>
              </div>
            ) : (
              (Object.values(Category) as Category[]).map(cat => {
                const items = groupedByCategory[cat];
                if (!items || items.length === 0) return null;

                return (
                  <div key={cat} className="space-y-8">
                    <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-4">
                      <span className="w-1.5 h-8 bg-emerald-500 rounded-full"></span>
                      {cat}
                    </h4>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                      {items.map(m => {
                        const readingStatus = getStatusForMaterial(m.id);
                        const isDownloaded = currentUser?.downloadedIds.includes(m.id);
                        
                        return (
                          <div 
                            key={m.id} 
                            className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border-2 shadow-sm hover:shadow-2xl transition-all group flex flex-col relative overflow-hidden border-b-8 border-transparent border-b-emerald-600/20 dark:border-b-emerald-500/20"
                          >
                            {readingStatus !== ReadingStatus.NOT_STARTED && (
                              <div className={`absolute top-0 right-0 px-6 py-2.5 rounded-bl-[2rem] text-[9px] font-black uppercase tracking-[0.2em] text-white shadow-xl ${
                                readingStatus === ReadingStatus.COMPLETED ? 'bg-emerald-500' : 'bg-orange-500'
                              }`}>
                                {readingStatus}
                              </div>
                            )}

                            <div className="flex justify-between items-start mb-8">
                              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-all duration-500 shadow-md">
                                <span className="font-black text-xs text-white">SH</span>
                              </div>
                              {isDownloaded && (
                                <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-200/50 dark:border-emerald-500/20">
                                  Saved
                                </span>
                              )}
                            </div>
                            
                            <h4 className="font-black text-slate-900 dark:text-slate-100 text-lg line-clamp-2 min-h-[3.5rem] leading-tight group-hover:text-emerald-700 transition-colors duration-300">{m.title}</h4>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 mb-10 font-black uppercase tracking-[0.1em]">Added: {new Date(m.uploadedAt).toLocaleDateString('en-GB')}</p>
                            
                            <div className="mt-auto flex flex-col gap-3">
                              <button 
                                onClick={() => handleReadOnline(m)}
                                className="w-full bg-slate-900 dark:bg-slate-700 text-white hover:bg-emerald-600 dark:hover:bg-emerald-600 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 dark:shadow-none text-[10px] uppercase tracking-widest"
                              >
                                Start Reading
                              </button>
                              {activeView === 'browse' ? (
                                <button 
                                  onClick={() => handleDownload(m)}
                                  className="w-full bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-black py-3 rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 text-[9px] uppercase tracking-[0.1em]"
                                >
                                  Offline Copy
                                </button>
                              ) : (
                                <button 
                                  onClick={() => removeDownload(m.id)}
                                  className="w-full bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 font-black py-3 rounded-2xl transition-all flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/20 text-[9px] uppercase tracking-[0.1em]"
                                >
                                  Discard Offline
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {viewingMaterial && (
        <PdfViewer 
          material={viewingMaterial} 
          userId={userId}
          currentProgress={userProgress.find(p => p.materialId === viewingMaterial.id)}
          onClose={closeReader}
          onUpdateStatus={updateReadingStatus}
        />
      )}
    </div>
  );
};
