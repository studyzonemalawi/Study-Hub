
import React, { useState, useEffect } from 'react';
import { Announcement } from '../types';
import { storage } from '../services/storage';

export const Announcements: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    setAnnouncements(storage.getAnnouncements());
  }, []);

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 text-red-600 border-red-100';
      case 'important': return 'bg-orange-50 text-orange-600 border-orange-100';
      default: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴 Urgent';
      case 'important': return '🟠 Important';
      default: return '🟢 Normal';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Announcements</h2>
          <p className="text-gray-500">Stay updated with the latest news from Study Hub Malawi.</p>
        </div>
        <div className="p-3 bg-emerald-800 text-white rounded-2xl shadow-lg flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center text-lg">📢</div>
          <span className="text-[10px] font-black uppercase tracking-widest">{announcements.length} Active Posts</span>
        </div>
      </div>

      <div className="space-y-6">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-gray-200 shadow-sm">
            <div className="text-6xl mb-6 grayscale opacity-20">📭</div>
            <h3 className="text-2xl font-black text-gray-700">No Announcements</h3>
            <p className="text-gray-400 mt-2 font-medium">Check back later for updates and news.</p>
          </div>
        ) : (
          announcements.map((a) => (
            <div 
              key={a.id} 
              className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col md:flex-row group"
            >
              <div className={`md:w-32 flex items-center justify-center p-6 border-b md:border-b-0 md:border-r border-gray-50 ${
                a.priority === 'urgent' ? 'bg-red-500' : a.priority === 'important' ? 'bg-orange-500' : 'bg-emerald-600'
              }`}>
                <div className="text-white text-3xl font-black drop-shadow-md">
                   {a.priority === 'urgent' ? '🚨' : a.priority === 'important' ? '📌' : '✨'}
                </div>
              </div>

              <div className="flex-1 p-8 md:p-10 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getPriorityStyles(a.priority)}`}>
                    {getPriorityLabel(a.priority)}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Posted {new Date(a.timestamp).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-2xl font-black text-gray-800 group-hover:text-emerald-900 transition-colors">
                  {a.title}
                </h3>

                <p className="text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                  {a.content}
                </p>

                <div className="pt-4 flex items-center gap-2 text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                  <span>Authorized by System Admin</span>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  <span>Study Hub Malawi</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-emerald-800 text-white p-10 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 text-center md:text-left">
           <h3 className="text-2xl font-black mb-2">Want to ask a question?</h3>
           <p className="text-emerald-100 opacity-70 text-sm">Our support desk is always open for academic inquiries.</p>
        </div>
        <button className="relative z-10 bg-white text-emerald-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all active:scale-95">
           Chat With Us
        </button>
        <div className="absolute top-0 right-0 p-8 opacity-5 text-9xl">💬</div>
      </div>
    </div>
  );
};
