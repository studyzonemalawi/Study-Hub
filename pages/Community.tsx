
import React, { useState, useEffect, useRef } from 'react';
import { User, Testimonial, ChatRoom, CommunityMessage } from '../types';
import { storage } from '../services/storage';
import { GoogleGenAI } from "@google/genai";

interface CommunityProps {
  user: User;
}

export const Community: React.FC<CommunityProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'messenger' | 'testimonials'>('messenger');
  const [hasAgreedToRules, setHasAgreedToRules] = useState(() => {
    return localStorage.getItem(`study_hub_chat_rules_agreed_${user.id}`) === 'true';
  });
  
  // Testimonial States
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [newContent, setNewContent] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Messenger States
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTestimonials(storage.getTestimonials());
    setRooms(storage.getChatRooms());
    const defaultRoom = storage.getChatRooms()[0];
    if (defaultRoom) setActiveRoomId(defaultRoom.id);

    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoomDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeRoomId && hasAgreedToRules) {
      setMessages(storage.getCommunityMessages(activeRoomId));
    }
  }, [activeRoomId, hasAgreedToRules]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab, isAiThinking]);

  const handlePostTestimonial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const newTestimonial: Testimonial = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.name || 'Anonymous Learner',
      userProfilePic: 'initials',
      userRole: user.accountRole || 'Member',
      content: newContent,
      rating: rating,
      timestamp: new Date().toISOString()
    };

    setTimeout(() => {
      storage.saveTestimonial(newTestimonial);
      setTestimonials([newTestimonial, ...testimonials]);
      setNewContent('');
      setRating(5);
      setIsSubmitting(false);
      setShowForm(false);
    }, 800);
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRoomId || isAiThinking) return;

    const userMsg: CommunityMessage = {
      id: Math.random().toString(36).substr(2, 9),
      roomId: activeRoomId,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.accountRole || 'Learner',
      content: chatInput,
      timestamp: new Date().toISOString()
    };

    storage.saveCommunityMessage(userMsg);
    setMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput('');

    setIsAiThinking(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const roomInfo = rooms.find(r => r.id === activeRoomId);
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Room: ${roomInfo?.title}
        Student (${user.name}, Grade: ${user.currentGrade || 'Unknown'}): "${currentInput}"`,
        config: {
          systemInstruction: `You are StudyPal, the official AI tutor for Study Hub Malawi. 
          Your goal is to help Malawian students in Primary (Standard 5-8) and Secondary (Form 1-4) schools.
          
          STYLE RULES:
          1. Use SIMPLE ENGLISH.
          2. MALAWI CONTEXT: Always use examples from Malawi.
          3. CURRICULUM: Focus on the Malawian curriculum (PSLCE and MSCE).
          4. ENCOURAGEMENT: Be like a kind Malawian teacher.
          
          ROOM CONTEXT:
          - Currently in: "${roomInfo?.title}" (${roomInfo?.description}).
          - Help the user according to the specific focus of this room.`,
          temperature: 0.8,
        },
      });

      const aiMsg: CommunityMessage = {
        id: Math.random().toString(36).substr(2, 9),
        roomId: activeRoomId,
        senderId: 'studypal-ai',
        senderName: 'StudyPal',
        senderRole: 'Official AI',
        content: response.text || "Muli bwanji! I am here to help. Could you please ask that again in a simple way?",
        timestamp: new Date().toISOString(),
        isOfficial: true
      };

      storage.saveCommunityMessage(aiMsg);
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      const fallbackMsg: CommunityMessage = {
        id: Math.random().toString(36).substr(2, 9),
        roomId: activeRoomId,
        senderId: 'studypal-ai',
        senderName: 'StudyPal',
        senderRole: 'Official AI',
        content: "Pepani! I am a bit tired. Please try again in a moment.",
        timestamp: new Date().toISOString(),
        isOfficial: true
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleAgreeToRules = () => {
    localStorage.setItem(`study_hub_chat_rules_agreed_${user.id}`, 'true');
    setHasAgreedToRules(true);
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  const rules = [
    { title: 'Be respectful', desc: 'No insults, bullying, or abusive language.', icon: '🤝' },
    { title: 'Keep it appropriate', desc: 'No sexual, violent, or inappropriate content.', icon: '🛡️' },
    { title: 'Help each other', desc: 'Ask and respond politely. No mocking.', icon: '💡' },
    { title: 'Protect your privacy', desc: 'Do not share personal details.', icon: '🔒' },
    { title: 'Report problems', desc: 'Report abuse or unsafe messages to moderators.', icon: '📢' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Community Hub</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">Empowering Malawian students together.</p>
        </div>
        
        <div className="flex p-1.5 bg-slate-200/50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 w-fit">
          <button 
            onClick={() => setActiveTab('messenger')}
            className={`px-8 py-3 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest transition-all flex items-center gap-2 ${activeTab === 'messenger' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xl' : 'text-slate-500'}`}
          >
            <span>💬</span> Live Messenger
          </button>
          <button 
            onClick={() => setActiveTab('testimonials')}
            className={`px-8 py-3 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest transition-all flex items-center gap-2 ${activeTab === 'testimonials' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xl' : 'text-slate-500'}`}
          >
            <span>📖</span> Success Stories
          </button>
        </div>
      </div>

      {activeTab === 'messenger' ? (
        <>
          {!hasAgreedToRules ? (
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 md:p-16 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col items-center text-center max-w-3xl mx-auto animate-in zoom-in duration-500">
               <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-4xl mb-8">⚖️</div>
               <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-4">Before joining the chat, please agree to the rules</h3>
               <div className="grid gap-4 w-full text-left mb-10">
                  {rules.map((rule, idx) => (
                    <div key={idx} className="flex gap-5 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-transparent hover:border-emerald-200 transition-all">
                       <div className="text-2xl">{rule.icon}</div>
                       <div>
                          <h4 className="font-black text-slate-900 dark:text-slate-100 text-xs uppercase tracking-widest">{rule.title}</h4>
                          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{rule.desc}</p>
                       </div>
                    </div>
                  ))}
               </div>
               <button onClick={handleAgreeToRules} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-sm active:scale-95">I Agree & Join Chat</button>
            </div>
          ) : (
            <div className="flex flex-col bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-200/60 dark:border-slate-700 overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none h-[calc(100vh-18rem)]">
                 {/* Unified Chat Header with Dropdown */}
                 <div className="bg-slate-900 dark:bg-slate-950 p-6 md:px-8 md:py-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 flex-none border-b border-white/5">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-2xl shadow-lg flex-none">
                          {activeRoom?.icon || '🗨️'}
                       </div>
                       <div className="min-w-0 relative" ref={dropdownRef}>
                          <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest mb-1.5 opacity-80">Select Discussion Room:</p>
                          <button 
                            onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)}
                            className="flex items-center gap-3 group focus:outline-none"
                          >
                            <h3 className="text-xl md:text-2xl font-black tracking-tight leading-none group-hover:text-emerald-400 transition-colors truncate">
                              {activeRoom?.title}
                            </h3>
                            <svg className={`w-5 h-5 text-emerald-500 transition-transform duration-300 ${isRoomDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* Dropdown Menu */}
                          {isRoomDropdownOpen && (
                            <div className="absolute top-full left-0 mt-4 w-72 md:w-96 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-[100] p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="grid gap-1.5">
                                {rooms.map(room => (
                                  <button
                                    key={room.id}
                                    onClick={() => {
                                      setActiveRoomId(room.id);
                                      setIsRoomDropdownOpen(false);
                                    }}
                                    className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 ${
                                      activeRoomId === room.id 
                                        ? 'bg-emerald-600 text-white' 
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    <span className="text-xl flex-none">{room.icon}</span>
                                    <div className="min-w-0">
                                      <p className="font-black text-sm truncate">{room.title}</p>
                                      <p className={`text-[9px] font-bold uppercase tracking-widest mt-0.5 ${activeRoomId === room.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                                        {room.activeUsers} Students Active
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                       </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                         <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                         <span className="text-[9px] font-black uppercase tracking-widest text-emerald-100">Live Server</span>
                      </div>
                    </div>
                 </div>

                 {/* Chat Feed */}
                 <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/40">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-20">
                         <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-4xl mb-6">🎓</div>
                         <h4 className="text-2xl font-black text-slate-800 dark:text-white">Welcome to the Hub!</h4>
                         <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-2 max-w-xs mx-auto">
                            Ask a question about your studies in {activeRoom?.title}.
                         </p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                           <div className={`max-w-[85%] flex flex-col ${msg.senderId === user.id ? 'items-end' : 'items-start'}`}>
                              <div className={`flex items-center gap-2 mb-2 px-1 ${msg.senderId === user.id ? 'flex-row-reverse' : ''}`}>
                                 <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{msg.senderName}</span>
                                 <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                                   msg.isOfficial ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                 }`}>
                                    {msg.senderRole}
                                 </span>
                              </div>
                              <div className={`p-5 rounded-[2rem] shadow-sm border text-sm font-medium leading-relaxed ${
                                 msg.senderId === user.id 
                                   ? 'bg-emerald-600 text-white border-emerald-500 rounded-tr-none' 
                                   : msg.senderId === 'studypal-ai'
                                   ? 'bg-emerald-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-emerald-200 dark:border-emerald-900/40 rounded-tl-none shadow-emerald-100/50'
                                   : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-100 dark:border-slate-700 rounded-tl-none'
                              }`}>
                                 {msg.content}
                              </div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2 px-2">
                                 {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                           </div>
                        </div>
                      ))
                    )}
                    {isAiThinking && (
                      <div className="flex justify-start animate-in fade-in duration-300">
                        <div className="bg-emerald-50 dark:bg-slate-900/60 p-4 rounded-2xl flex items-center gap-3 border border-emerald-100 dark:border-emerald-900/20">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                          </div>
                          <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">StudyPal is thinking...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatScrollRef} />
                 </div>

                 {/* Chat Input */}
                 <form onSubmit={handleSendChatMessage} className="p-6 md:p-8 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4">
                    <input
                      type="text"
                      disabled={isAiThinking}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={`Ask StudyPal about ${activeRoom?.title}...`}
                      className="flex-1 px-6 py-5 rounded-[1.8rem] border border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none bg-slate-50 dark:bg-slate-900 font-bold text-sm transition-all text-slate-900 dark:text-white disabled:opacity-50"
                    />
                    <button 
                      type="submit"
                      disabled={!chatInput.trim() || isAiThinking}
                      className="bg-emerald-600 text-white p-5 rounded-[1.8rem] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 dark:shadow-none active:scale-95 disabled:opacity-50 flex-none"
                    >
                      <svg className="w-6 h-6 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                    </button>
                 </form>
              </div>
          )}
        </>
      ) : (
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Community Stories</h3>
            {!showForm && (
              <button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs flex items-center gap-3">
                <span className="text-xl">✍️</span> Share My Story
              </button>
            )}
          </div>
          {showForm && (
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl animate-in zoom-in duration-300">
              <form onSubmit={handlePostTestimonial} className="space-y-6">
                <textarea 
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  required
                  placeholder="How has Study Hub helped you?"
                  className="w-full p-6 rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none h-40 font-medium transition-all"
                />
                <button type="submit" disabled={isSubmitting || !newContent.trim()} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm disabled:opacity-50 transition-all">Post Story</button>
              </form>
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map(t => (
              <div key={t.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-50 dark:border-slate-700 shadow-sm border-b-8 border-b-emerald-600">
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed italic text-lg">"{t.content}"</p>
                <div className="mt-8 flex items-center gap-4 border-t border-slate-50 dark:border-slate-700 pt-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-700 flex items-center justify-center text-white font-black text-xs">{(t.userName || '?')[0].toUpperCase()}</div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-800 dark:text-slate-100 text-sm truncate">{t.userName}</h4>
                    <p className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">{t.userRole}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
