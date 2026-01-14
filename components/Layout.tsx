
import React from 'react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, setActiveTab }) => {
  if (!user) return <>{children}</>;

  const ADMIN_EMAIL = 'studyhubmalawi@gmail.com';
  const isAdmin = user.appRole === 'admin' && user.email === ADMIN_EMAIL;

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
    return email[0].toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#fcfdfc] flex flex-col font-sans">
      {/* Header */}
      <header className="bg-emerald-800 text-white shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-black tracking-tighter">STUDY HUB</span>
            <span className="hidden sm:inline-block px-2 py-0.5 bg-white/20 rounded-md text-[10px] font-black uppercase tracking-widest border border-white/10">Malawi</span>
          </div>
          <div className="flex items-center space-x-5">
            <div className="hidden md:flex items-center space-x-3 text-right">
              <div>
                <p className="text-xs font-black uppercase tracking-widest truncate max-w-[150px]">{user.name || user.email}</p>
                <p className="text-[9px] text-emerald-300 font-bold uppercase tracking-widest opacity-80">{user.accountRole || 'Member'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white font-black text-xs border border-white/20 shadow-lg">
                {getInitials(user.name, user.email)}
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
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
      <nav className="md:hidden bg-white/80 backdrop-blur-lg border-t border-gray-100 fixed bottom-0 left-0 right-0 h-20 flex items-center justify-around z-50 pb-safe shadow-2xl">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center space-y-1 w-full h-full transition-all ${
              activeTab === item.id ? 'text-emerald-700' : 'text-gray-300'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
            {activeTab === item.id && <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full mt-0.5"></div>}
          </button>
        ))}
      </nav>

      <footer className="hidden md:block bg-white border-t border-gray-50 py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center space-y-4">
          <div className="text-emerald-800 font-black text-xl">Study Hub Malawi</div>
          <p className="text-gray-400 text-xs text-center max-w-md">Empowering every Malawian learner with high-quality academic resources. Bridging the gap in primary and secondary education.</p>
          <div className="flex space-x-6 text-[10px] font-black text-gray-300 uppercase tracking-widest">
            <a href="#" className="hover:text-emerald-600">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-600">Terms of Use</a>
            <a href="#" className="hover:text-emerald-600">Contact Admin</a>
          </div>
          <p className="text-[10px] text-gray-300 mt-4">&copy; {new Date().getFullYear()} Study Hub Malawi. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
