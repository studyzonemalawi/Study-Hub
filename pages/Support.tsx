
import React, { useState, useEffect, useRef } from 'react';
import { User, Message } from '../types';
import { storage } from '../services/storage';

interface SupportProps {
  user: User;
  onNavigate: (tab: string) => void;
}

export const Support: React.FC<SupportProps> = ({ user, onNavigate }) => {
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

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-16rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest text-xs px-2">Support Channel</h2>
        <button 
          onClick={() => onNavigate('home')}
          className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition-all flex items-center gap-2 group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          <span className="text-[10px] font-black uppercase tracking-widest">Back</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="bg-emerald-800 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">🛡️</div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Admin Desk</h2>
              <p className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest opacity-80">24/7 Academic Support</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Active</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-[#f8fafc]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="text-6xl animate-bounce">👋</div>
              <div className="max-w-xs">
                <h3 className="text-xl font-black text-gray-800 mb-2">Muli bwanji, {user.name}!</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Send a message to our administrators if you have any academic questions or technical issues.</p>
              </div>
            </div>
          ) : (
            messages.map(m => (
              <div 
                key={m.id} 
                className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`max-w-[80%] rounded-[1.5rem] p-5 shadow-sm border ${
                  m.senderId === user.id 
                    ? 'bg-emerald-600 text-white rounded-br-none border-transparent' 
                    : 'bg-white text-gray-800 rounded-bl-none border-gray-100'
                }`}>
                  <p className="text-sm leading-relaxed font-medium">{m.content}</p>
                  <p className={`text-[9px] mt-3 font-bold opacity-60 ${m.senderId === user.id ? 'text-emerald-50' : 'text-gray-400'}`}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>

        <form onSubmit={sendMessage} className="p-6 bg-white border-t border-gray-100 flex items-center space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="How can we help you today?"
            className="flex-1 px-5 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 font-medium text-sm transition-all"
          />
          <button 
            type="submit"
            className="bg-emerald-600 text-white p-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 active:scale-95"
          >
            <svg className="w-6 h-6 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
          </button>
        </form>
      </div>
    </div>
  );
};
