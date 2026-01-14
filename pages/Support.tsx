
import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { storage } from '../services/storage';

interface SupportProps {
  user: User;
  onNavigate: (tab: string) => void;
}

type Language = 'English' | 'Chichewa';

export const Support: React.FC<SupportProps> = ({ user, onNavigate }) => {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('study_hub_chat_lang') as Language) || 'English';
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const allMessages = storage.getMessages();
    const filtered = user.appRole === 'admin' 
      ? allMessages 
      : allMessages.filter(m => m.senderId === user.id || m.receiverId === user.id);
    setMessages(filtered);
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleLanguage = () => {
    const newLang = lang === 'English' ? 'Chichewa' : 'English';
    setLang(newLang);
    localStorage.setItem('study_hub_chat_lang', newLang);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      senderId: user.id,
      receiverId: 'admin', 
      content: input,
      timestamp: new Date().toISOString(),
      isAdmin: user.appRole === 'admin'
    };

    storage.saveMessage(newMessage);
    setMessages([...messages, newMessage]);
    setInput('');
  };

  const t = {
    title: lang === 'English' ? 'Direct Support' : 'Thandizo Lachindunji',
    sub: lang === 'English' ? 'Study Hub Admin Desk' : 'Ofesi ya Thandizo ya Study Hub',
    exit: lang === 'English' ? 'Exit Chat' : 'Tulukani',
    adminLabel: lang === 'English' ? 'Admin Desk' : 'Ofesi ya Thandizo',
    consultant: lang === 'English' ? 'Consultant Online' : 'Wothandiza Alipo',
    placeholder: lang === 'English' ? 'Describe your issue or ask a question...' : 'Fotokozani vuto lanu kapena funsani funso...',
    greeting: lang === 'English' ? `Muli bwanji, ${user.name}!` : `Muli bwanji, ${user.name}!`,
    intro: lang === 'English' ? 'How can we support your learning goals today?' : 'Kodi tingakuthandizeni bwanji pamaphunziro anu lero?',
    startMsg: lang === 'English' ? 'Send a message to start.' : 'Tumizani uthenga kuti tiyambe.',
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-16rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6 px-2">
        <div>
           <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{t.title}</h2>
           <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mt-0.5">{t.sub}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleLanguage}
            className="px-3 py-1 bg-white dark:bg-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-200/50 transition-all hover:bg-emerald-50"
          >
            🌐 {lang}
          </button>
          <button 
            onClick={() => onNavigate('home')}
            className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition-all flex items-center gap-3 group border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            <span className="text-[10px] font-black uppercase tracking-widest pr-1">{t.exit}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border border-slate-200/60 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-900 dark:bg-slate-950 p-6 md:p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-2xl shadow-lg">🛡️</div>
            <div>
              <h2 className="text-xl font-black tracking-tight leading-none">{t.adminLabel}</h2>
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-1.5">Malawian Academic Support</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 bg-slate-800 dark:bg-slate-900 px-4 py-2 rounded-full border border-slate-700/50">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">{t.consultant}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
              <div className="text-7xl animate-bounce grayscale opacity-20">👋</div>
              <div className="max-w-xs space-y-3">
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">{t.greeting}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">{t.intro} {t.startMsg}</p>
              </div>
            </div>
          ) : (
            messages.map(m => (
              <div 
                key={m.id} 
                className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`max-w-[80%] rounded-[2rem] p-6 shadow-sm border ${
                  m.senderId === user.id 
                    ? 'bg-emerald-600 text-white rounded-br-none border-emerald-500 shadow-emerald-100 dark:shadow-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none border-slate-200 dark:border-slate-700 shadow-slate-200/50 dark:shadow-none'
                }`}>
                  <p className="text-sm leading-relaxed font-medium">{m.content}</p>
                  <div className={`flex items-center gap-2 mt-4 opacity-60 ${m.senderId === user.id ? 'text-emerald-50' : 'text-slate-400'}`}>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-[9px] font-black uppercase tracking-widest">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={sendMessage} className="p-6 md:p-8 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.placeholder}
            className="flex-1 px-6 py-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none bg-slate-50 dark:bg-slate-900 font-bold text-sm transition-all text-slate-900 dark:text-white"
          />
          <button 
            type="submit"
            className="bg-emerald-600 text-white p-5 rounded-[1.5rem] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 dark:shadow-none active:scale-95 flex-none"
          >
            <svg className="w-6 h-6 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
          </button>
        </form>
      </div>
    </div>
  );
};
