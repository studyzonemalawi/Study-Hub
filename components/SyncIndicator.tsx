
import React from 'react';

interface SyncIndicatorProps {
  isOnline: boolean;
  isSyncing: boolean;
  lastSynced: string | null;
}

export const SyncIndicator: React.FC<SyncIndicatorProps> = ({ isOnline, isSyncing, lastSynced }) => {
  if (isSyncing) {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-emerald-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        <span className="text-[10px] font-black uppercase tracking-widest">Syncing Progress...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-amber-500 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 border border-amber-400">
        <span className="text-xs">⚠️</span>
        <span className="text-[10px] font-black uppercase tracking-widest">Offline Mode</span>
      </div>
    );
  }

  return null;
};
