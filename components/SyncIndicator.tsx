
import React from 'react';

interface SyncIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  lastSynced: string | null;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ isOnline, isSyncing, lastSynced }) => {
  if (isSyncing) {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-emerald-600 text-white px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-bounce border border-emerald-500">
        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        <span className="text-[9px] font-black uppercase tracking-widest">Updating Hub...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[150] bg-amber-500 text-white px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-amber-400">
        <span className="text-xs">📡</span>
        <span className="text-[9px] font-black uppercase tracking-widest">Offline Access Mode</span>
      </div>
    );
  }

  // Small indicator for last synced
  if (lastSynced) {
    return (
      <div className="fixed top-24 right-4 z-[40] hidden lg:flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
          Synced {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    );
  }

  return null;
};
