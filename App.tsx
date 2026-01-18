
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Community } from './pages/Community';
import { Announcements } from './pages/Announcements';
import { FAQs } from './pages/FAQs';
import { ExamCenter } from './pages/ExamCenter';
import { AdminExamForm } from './pages/AdminExamForm';
import { SyncIndicator } from './components/SyncIndicator';
import { storage } from './services/storage';
import { supabase } from './services/supabase';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('study_hub_theme') === 'dark';
  });
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const isCurrentlySyncingRef = useRef(false);

  const ADMIN_EMAIL = 'studyhubmalawi@gmail.com';

  const triggerSync = useCallback(async (userId: string) => {
    if (isCurrentlySyncingRef.current) return;
    
    isCurrentlySyncingRef.current = true;
    setIsSyncing(true);
    try {
      const result = await storage.syncWithServer(userId);
      if (result.success) {
        setLastSynced(result.timestamp);
        // Refresh local state with synced data
        const updatedUsers = storage.getUsers();
        const found = updatedUsers.find(u => u.id === userId);
        if (found) setUser(found);
      }
    } catch (err) {
      console.error("Sync failed", err);
    } finally {
      setIsSyncing(false);
      isCurrentlySyncingRef.current = false;
    }
  }, []);

  const handleAuthChange = useCallback(async (session: any) => {
    if (session?.user) {
      const sbUser = session.user;
      const email = sbUser.email || '';
      const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      // Attempt to pull cloud profile first
      const cloudProfile = await storage.getUserFromCloud(sbUser.id);
      
      const existingUsers = storage.getUsers();
      let appUser = existingUsers.find(u => u.id === sbUser.id);
      
      if (cloudProfile) {
        appUser = {
          ...appUser,
          ...cloudProfile,
          id: sbUser.id,
          email: email,
          appRole: isAdmin ? 'admin' : (cloudProfile.appRole || 'user'),
          lastLogin: new Date().toISOString()
        } as User;
      } else if (!appUser) {
        appUser = {
          id: sbUser.id,
          email: email,
          authProvider: 'email',
          appRole: isAdmin ? 'admin' : 'user',
          name: sbUser.user_metadata?.full_name || (isAdmin ? 'Study Hub Admin' : ''),
          dateJoined: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          downloadedIds: [],
          favoriteIds: [],
          isProfileComplete: isAdmin,
          isPublic: isAdmin,
          termsAccepted: true
        };
      } else {
        appUser = {
          ...appUser,
          appRole: isAdmin ? 'admin' : appUser.appRole,
          lastLogin: new Date().toISOString()
        };
      }
      
      storage.saveUser(appUser);
      setUser(appUser);
      localStorage.setItem('study_hub_session', JSON.stringify(appUser));
      
      // Perform initial robust sync
      if (navigator.onLine) triggerSync(appUser.id);
    } else {
      setUser(null);
      localStorage.removeItem('study_hub_session');
    }
    setIsLoading(false);
  }, [triggerSync, ADMIN_EMAIL]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('study_hub_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('study_hub_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    const handleOnline = () => {
      setIsOnline(true);
      if (user?.id) triggerSync(user.id);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleAuthChange, user?.id, triggerSync]);

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('study_hub_session', JSON.stringify(u));
    if (navigator.onLine) triggerSync(u.id);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('study_hub_session');
      setActiveTab('home');
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const handleUpdateUser = (u: User) => {
    setUser(u);
    storage.updateUser(u);
  };

  const isAdmin = user?.appRole === 'admin';

  const renderContent = () => {
    if (!user) return null;
    switch (activeTab) {
      case 'home': return <Home user={user} onNavigate={setActiveTab} />;
      case 'announcements': return <Announcements />;
      case 'library': case 'papers': return <Library user={user} onNavigate={setActiveTab} />;
      case 'testimonials': return <Community user={user} />;
      case 'faqs': return <FAQs onNavigate={setActiveTab} />;
      case 'activity': return <Activity user={user} onNavigate={setActiveTab} />;
      case 'support': return <Support user={user} onNavigate={setActiveTab} />;
      case 'settings': return <Settings user={user} onUpdate={handleUpdateUser} onNavigate={setActiveTab} />;
      case 'exams': return <ExamCenter user={user} onNavigate={setActiveTab} />;
      case 'admin-exam-form': return isAdmin ? <AdminExamForm onNavigate={setActiveTab} /> : <Home user={user} onNavigate={setActiveTab} />;
      case 'admin': return isAdmin ? <Admin user={user} onNavigate={setActiveTab} /> : <Home user={user} onNavigate={setActiveTab} />;
      default: return <Home user={user} onNavigate={setActiveTab} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-50/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-600 dark:text-slate-400 font-bold animate-pulse uppercase tracking-widest text-xs">Authenticating...</p>
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

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      isDarkMode={isDarkMode}
      toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
    >
      <SyncIndicator isOnline={isOnline} isSyncing={isSyncing} lastSynced={lastSynced} />
      <div className="pb-20">
        {activeTab !== 'home' && (
          <div className="mb-8 flex items-center justify-between px-4 md:px-0 animate-in fade-in slide-in-from-left-2 duration-300">
            <button 
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors font-black uppercase text-[10px] tracking-widest"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Back to Hub
            </button>
            <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[9px] tracking-[0.2em]">
              <span>Study Hub</span>
              <span className="opacity-30">/</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                {activeTab === 'testimonials' ? 'Community' : 
                 activeTab === 'admin-exam-form' ? 'Exam Portal' : 
                 activeTab === 'exams' ? 'Exam Center' : activeTab}
              </span>
            </div>
          </div>
        )}
        
        <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderContent()}
        </div>
      </div>
    </Layout>
  );
};

export default App;
