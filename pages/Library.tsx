
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
  OTHER_GRADE_OPTIONS,
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
  
  // Selection Mode States
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<'browse' | 'downloads'>('browse');

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
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, [level, selectedGrade, activeView]);

  // Removed OTHER_GRADE_OPTIONS here as materials should follow curriculum grades
  const grades = level === EducationLevel.PRIMARY 
    ? PRIMARY_GRADES 
    : SECONDARY_GRADES;
    
  const subjects = level === EducationLevel.PRIMARY ? PRIMARY_SUBJECTS : SECONDARY_SUBJECTS;

  const handleDownload = (m: StudyMaterial) => {
    const link = document.createElement('a');
    link.href = m.fileUrl;
    link.download = m.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    storage.recordDownload(userId, m.id);
    // Refresh user state
    const updatedUsers = storage.getUsers();
    const found = updatedUsers.find(u => u.id === userId);
    if (found) setCurrentUser(found);
  };

  const handleBulkDownload = () => {
    const selectedMaterials = materials.filter(m => selectedIds.has(m.id));
    selectedMaterials.forEach((m, index) => {
      setTimeout(() => {
        handleDownload(m);
      }, index * 500); // Staggered to prevent browser blocking
    });
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const removeDownload = (mId: string) => {
    if (window.confirm('Remove this file from your offline list? (This won\'t delete the file from your device)')) {
      storage.removeDownload(userId, mId);
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
    <div className="space-y-8 pb-32 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800">
            {activeView === 'browse' ? 'Library' : 'My Downloads'}
          </h2>
          <p className="text-gray-500">
            {activeView === 'browse' ? `Explore educational resources for ${level} School.` : 'Quickly access files you saved for offline reading.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
            <button 
              onClick={() => setActiveView('browse')}
              className={`px-5 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${activeView === 'browse' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-400'}`}
            >
              Browse
            </button>
            <button 
              onClick={() => setActiveView('downloads')}
              className={`px-5 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${activeView === 'downloads' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-400'}`}
            >
              Downloads ({currentUser?.downloadedIds.length || 0})
            </button>
          </div>
          
          {activeView === 'browse' && (
            <div className="flex p-1 bg-gray-100 rounded-2xl w-fit">
              <button 
                onClick={() => { setLevel(EducationLevel.PRIMARY); setSelectedGrade(PRIMARY_GRADES[0]); }}
                className={`px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${level === EducationLevel.PRIMARY ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-400'}`}
              >
                Primary
              </button>
              <button 
                onClick={() => { setLevel(EducationLevel.SECONDARY); setSelectedGrade(SECONDARY_GRADES[0]); }}
                className={`px-4 py-2 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${level === EducationLevel.SECONDARY ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-400'}`}
              >
                Secondary
              </button>
            </div>
          )}
        </div>
      </div>

      {activeView === 'browse' && (
        <div className="flex flex-wrap gap-2 overflow-x-auto no-scrollbar pb-2">
          {grades.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGrade(g)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedGrade === g ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-100' : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {activeView === 'browse' && !selectedSubject ? (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {subjects.map(sub => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-emerald-200 transition-all text-left group relative overflow-hidden"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h4 className="font-black text-gray-800 text-sm uppercase tracking-tight">{sub}</h4>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="animate-in fade-in slide-in-from-left-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center space-x-5">
              {activeView === 'browse' && (
                <button 
                  onClick={() => setSelectedSubject(null)}
                  className="p-3 bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl transition-all shadow-sm group"
                >
                  <svg className="w-6 h-6 text-gray-600 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
              )}
              <div>
                <h3 className="text-2xl font-black text-gray-800">{activeView === 'browse' ? selectedSubject : 'Offline Resources'}</h3>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                  {filteredMaterials.length} materials found
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedIds(new Set());
                }}
                className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  isSelectionMode ? 'bg-orange-100 border-orange-200 text-orange-700' : 'bg-white border-gray-100 text-gray-500 hover:border-emerald-200'
                }`}
              >
                {isSelectionMode ? 'Cancel Selection' : 'Select Multiple'}
              </button>
            </div>
          </div>

          <div className="space-y-12">
            {filteredMaterials.length === 0 ? (
              <div className="bg-white rounded-[2.5rem] p-20 text-center border border-dashed border-gray-200 shadow-sm">
                <div className="text-6xl mb-6 grayscale opacity-20">📁</div>
                <h3 className="text-2xl font-black text-gray-700">No Materials Found</h3>
                <p className="text-gray-400 mt-2 font-medium">Try checking other categories or subjects.</p>
              </div>
            ) : (
              (Object.values(Category) as Category[]).map(cat => {
                const items = groupedByCategory[cat];
                if (!items || items.length === 0) return null;

                return (
                  <div key={cat} className="space-y-6">
                    <h4 className="text-lg font-black text-gray-800 flex items-center gap-3">
                      <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                      {cat}
                    </h4>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {items.map(m => {
                        const readingStatus = getStatusForMaterial(m.id);
                        const isSelected = selectedIds.has(m.id);
                        const isDownloaded = currentUser?.downloadedIds.includes(m.id);
                        
                        return (
                          <div 
                            key={m.id} 
                            onClick={() => isSelectionMode && toggleSelection(m.id)}
                            className={`bg-white p-6 rounded-[2.5rem] border-2 shadow-sm hover:shadow-2xl transition-all group flex flex-col relative overflow-hidden border-b-4 ${
                              isSelected ? 'border-orange-500 bg-orange-50/30' : 'border-transparent border-b-emerald-600'
                            } ${isSelectionMode ? 'cursor-pointer' : ''}`}
                          >
                            {isSelectionMode && (
                              <div className="absolute top-4 left-4 z-10">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200'
                                }`}>
                                  {isSelected && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                                </div>
                              </div>
                            )}

                            {readingStatus !== ReadingStatus.NOT_STARTED && !isSelectionMode && (
                              <div className={`absolute top-0 right-0 px-5 py-2 rounded-bl-[1.5rem] text-[9px] font-black uppercase tracking-widest text-white shadow-lg ${
                                readingStatus === ReadingStatus.COMPLETED ? 'bg-green-500' : 'bg-orange-500'
                              }`}>
                                {readingStatus}
                              </div>
                            )}

                            <div className="flex justify-between items-start mb-6">
                              <div className="p-4 bg-emerald-50 rounded-[1.5rem] text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              </div>
                              {isDownloaded && !isSelectionMode && (
                                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-200">
                                  Saved Offline
                                </span>
                              )}
                            </div>
                            
                            <h4 className="font-black text-gray-800 text-lg line-clamp-2 min-h-[3.5rem] leading-tight group-hover:text-emerald-900 transition-colors">{m.title}</h4>
                            <p className="text-[10px] text-gray-400 mt-4 mb-8 font-bold uppercase tracking-wider">Added: {new Date(m.uploadedAt).toLocaleDateString('en-GB')}</p>
                            
                            {!isSelectionMode && (
                              <div className="mt-auto flex flex-col gap-3">
                                <button 
                                  onClick={() => handleReadOnline(m)}
                                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700 font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 text-xs uppercase tracking-widest"
                                >
                                  Read Online
                                </button>
                                {activeView === 'browse' ? (
                                  <button 
                                    onClick={() => handleDownload(m)}
                                    className="w-full bg-white text-gray-500 hover:bg-gray-50 hover:text-emerald-700 font-black py-3 rounded-2xl transition-all flex items-center justify-center gap-2 border border-gray-100 text-[10px] uppercase tracking-widest"
                                  >
                                    Save Offline
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => removeDownload(m.id)}
                                    className="w-full bg-white text-red-400 hover:bg-red-50 hover:text-red-600 font-black py-3 rounded-2xl transition-all flex items-center justify-center gap-2 border border-red-50 text-[10px] uppercase tracking-widest"
                                  >
                                    Remove from Downloads
                                  </button>
                                )}
                              </div>
                            )}
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

      {/* Bulk Action Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[80] w-[90%] max-w-lg bg-gray-900 text-white rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-10 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black">
              {selectedIds.size}
            </div>
            <div>
              <p className="font-black uppercase tracking-widest text-xs">Items Selected</p>
              <p className="text-[10px] text-gray-400 font-bold">Ready for bulk download</p>
            </div>
          </div>
          <button 
            onClick={handleBulkDownload}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95"
          >
            Download Selected
          </button>
        </div>
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
