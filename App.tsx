
import React, { useState, useEffect } from 'react';
import { User } from './types';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Admin } from './pages/Admin';
import { Support } from './pages/Support';
import { RegisterProfile } from './pages/RegisterProfile';
import { Settings } from './pages/Settings';
import { Activity } from './pages/Activity';
import { Testimonials } from './pages/Testimonials';
import { Announcements } from './pages/Announcements';
import { FAQs } from './pages/FAQs';
import { SyncIndicator } from './components/SyncIndicator';
import { storage } from './services/storage';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  
  // Sync & Network States
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const ADMIN_EMAIL = 'studyhubmalawi@gmail.com';

  useEffect(() => {
    const savedUser = localStorage.getItem('study_hub_session');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.email === ADMIN_EMAIL) {
        parsedUser.appRole = 'admin';
      } else {
        parsedUser.appRole = 'user';
      }
      setUser(parsedUser);
    }
    setIsLoading(false);

    // Network Listeners
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSync = async () => {
    const savedUser = localStorage.getItem('study_hub_session');
    if (!savedUser) return;
    
    const parsed = JSON.parse(savedUser);
    setIsSyncing(true);
    
    try {
      const result = await storage.syncWithServer(parsed.id);
      if (result.success) {
        setLastSynced(result.timestamp);
      }
    } catch (err) {
      console.error("Sync failed", err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('study_hub_session', JSON.stringify(u));
    if (navigator.onLine) triggerSync();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('study_hub_session');
    setActiveTab('home');
  };

  const handleUpdateUser = (u: User) => {
    setUser(u);
    localStorage.setItem('study_hub_session', JSON.stringify(u));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-emerald-700 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="text-white font-black animate-pulse">Loading Study Hub...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.appRole !== 'admin' && !user.isProfileComplete) {
    return <RegisterProfile user={user} onComplete={handleUpdateUser} />;
  }

  const isAdmin = user.appRole === 'admin' && user.email === ADMIN_EMAIL;

  const availableTabs = [
    { id: 'home', label: 'Home' },
    { id: 'announcements', label: 'Updates' },
    { id: 'library', label: 'Library' },
    { id: 'papers', label: 'Past Papers' },
    { id: 'testimonials', label: 'Community' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'activity', label: 'Activity' },
    { id: 'support', label: 'Support' },
    { id: 'settings', label: 'Settings' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel' }] : [])
  ];

  if (activeTab === 'admin' && !isAdmin) {
    setActiveTab('home');
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home userName={user.name} onNavigate={setActiveTab} />;
      case 'announcements':
        return <Announcements />;
      case 'library':
      case 'papers':
        return <Library onNavigate={setActiveTab} />;
      case 'testimonials':
        return <Testimonials user={user} />;
      case 'faqs':
        return <FAQs />;
      case 'activity':
        return <Activity user={user} onNavigate={setActiveTab} />;
      case 'support':
        return <Support user={user} onNavigate={setActiveTab} />;
      case 'settings':
        return <Settings user={user} onUpdate={handleUpdateUser} onNavigate={setActiveTab} />;
      case 'admin':
        return isAdmin ? <Admin onNavigate={setActiveTab} /> : <Home userName={user.name} onNavigate={setActiveTab} />;
      default:
        return <Home userName={user.name} onNavigate={setActiveTab} />;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
    >
      <SyncIndicator isOnline={isOnline} isSyncing={isSyncing} lastSynced={lastSynced} />
      <div className="pb-10">
        <div className="mb-6 flex space-x-2 md:space-x-4 overflow-x-auto no-scrollbar py-2 px-1">
          {availableTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all ${
                activeTab === tab.id 
                  ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200' 
                  : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {renderContent()}
      </div>
    </Layout>
  );
};

export default App;
