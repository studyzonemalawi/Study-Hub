
import React from 'react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  activeTab, 
  setActiveTab,
  isDarkMode,
  toggleDarkMode
}) => {
  if (!user) return <>{children}</>;

  const isAdmin = user.appRole === 'admin';

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'announcements', label: 'Updates', icon: '📢' },
    { id: 'library', label: 'Library', icon: '📚' },
    { id: 'activity', label: 'Activity', icon: '📈' },
    { id: 'support', label: 'Support', icon: '💬' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: '🛡️' }] : [])
  ];

  const getInitials = (name: string, email: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return email ? email[0].toUpperCase() : '?';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] transition-colors duration-300 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/20">
                <span className="text-white font-black text-lg tracking-tighter">SH</span>
            </div>
            <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">STUDY HUB</span>
                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400">Malawi</span>
            </div>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-5">
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"/></svg>
              ) : (
                <svg className="w-5 h-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/></svg>
              )}
            </button>

            <div className="hidden md:flex items-center space-x-3 text-right">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 truncate max-w-[150px]">{user.name || user.email}</p>
                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest opacity-80">{user.accountRole || 'Member'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-black text-xs border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {user.profilePic && user.profilePic !== 'initials' ? <img src={user.profilePic} className="w-full h-full object-cover" /> : getInitials(user.name, user.email)}
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 rounded-xl text-[10px] text-white font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/10 dark:shadow-none"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-8">
        {children}
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 fixed bottom-0 left-0 right-0 h-20 flex items-center justify-around z-50 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-none">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center space-y-1 w-full h-full transition-all ${
              activeTab === item.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            {activeTab === item.id && <div className="w-1.5 h-1.5 bg-emerald-600 dark:bg-emerald-400 rounded-full mt-0.5"></div>}
          </button>
        ))}
      </nav>

      <footer className="hidden md:block bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center space-y-6">
          <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-[10px] font-black text-white">
                SH
              </div>
              <span className="text-slate-900 dark:text-white font-black text-lg tracking-tight">Study Hub Malawi</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs text-center max-w-lg leading-relaxed">Empowering every Malawian learner with high-quality academic resources. Bridging the gap in primary and secondary education for a brighter future.</p>
          <div className="flex space-x-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
            <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Terms of Use</a>
            <a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Contact Admin</a>
          </div>
          <div className="h-px w-20 bg-slate-200 dark:bg-slate-800"></div>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold">&copy; {new Date().getFullYear()} Study Hub Malawi. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
