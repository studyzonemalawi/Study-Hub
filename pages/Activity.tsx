
import React, { useState, useEffect } from 'react';
import { User, StudyMaterial, UserProgress, ReadingStatus } from '../types';
import { storage } from '../services/storage';

interface ActivityProps {
  user: User;
  onNavigate: (tab: string) => void;
}

export const Activity: React.FC<ActivityProps> = ({ user, onNavigate }) => {
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);

  useEffect(() => {
    setProgress(storage.getUserProgress(user.id));
    setMaterials(storage.getMaterials());
  }, [user.id]);

  const booksRead = progress.filter(p => p.status === ReadingStatus.COMPLETED).length;
  const favoritesCount = user.favoriteIds.length;
  const downloadsCount = user.downloadedIds.length;

  const readingHistory = progress
    .sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())
    .map(p => {
      const mat = materials.find(m => m.id === p.materialId);
      return mat ? { ...mat, p } : null;
    }).filter(x => x !== null) as (StudyMaterial & { p: UserProgress })[];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-gray-800">Usage & Activity</h2>
          <p className="text-gray-500">System-generated data for your academic journey.</p>
        </div>
        <button 
          onClick={() => onNavigate('home')}
          className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl transition-all flex items-center gap-2 group"
          title="Back to Home"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Back</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Books Read', val: booksRead, color: 'bg-emerald-500', icon: '📖', action: () => onNavigate('library') },
          { label: 'Downloads', val: downloadsCount, color: 'bg-blue-500', icon: '📥', action: () => onNavigate('library') },
          { label: 'Favorites', val: favoritesCount, color: 'bg-pink-500', icon: '⭐', action: () => onNavigate('library') },
          { label: 'Days Joined', val: Math.floor((Date.now() - new Date(user.dateJoined).getTime()) / (1000 * 60 * 60 * 24)), color: 'bg-purple-500', icon: '📅', action: () => {} }
        ].map((stat, i) => (
          <button 
            key={i} 
            onClick={stat.action}
            className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center text-center hover:shadow-xl transition-all active:scale-95"
          >
            <div className={`${stat.color} w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl mb-3 shadow-lg shadow-gray-200`}>{stat.icon}</div>
            <span className="text-2xl font-black text-gray-800">{stat.val}</span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
          <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
            Reading History
          </h3>
          <div className="space-y-4">
            {readingHistory.length === 0 ? (
              <p className="text-center py-12 text-gray-400 italic">No history yet.</p>
            ) : (
              readingHistory.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-emerald-600 shadow-sm">PDF</div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-800">{item.title}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{item.subject} • {new Date(item.p.lastRead).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${item.p.status === ReadingStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {item.p.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
          <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
            <span className="w-1.5 h-6 bg-pink-500 rounded-full"></span>
            Manage Saved Files
          </h3>
          <div className="space-y-4">
            {user.downloadedIds.length === 0 ? (
              <p className="text-center py-12 text-gray-400 italic">No files saved for offline access.</p>
            ) : (
              user.downloadedIds.slice(0, 5).map(id => {
                const mat = materials.find(m => m.id === id);
                if (!mat) return null;
                return (
                  <div key={id} className="flex items-center justify-between p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                    <div className="flex items-center space-x-4">
                      <div className="text-xl">📥</div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-800">{mat.title}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{mat.subject}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onNavigate('library')}
                      className="text-emerald-600 font-black text-xs hover:underline"
                    >
                      Manage
                    </button>
                  </div>
                );
              })
            )}
            {user.downloadedIds.length > 5 && (
              <button 
                onClick={() => onNavigate('library')}
                className="w-full py-3 text-emerald-600 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-50 rounded-xl transition-all"
              >
                View All {user.downloadedIds.length} Downloads
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <h3 className="text-lg font-black mb-4 relative z-10">Account Metadata</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 relative z-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Date Joined</p>
            <p className="font-bold">{new Date(user.dateJoined).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Last Login Date</p>
            <p className="font-bold">{new Date(user.lastLogin).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Last Active Time</p>
            <p className="font-bold">{new Date(user.lastLogin).toLocaleTimeString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
