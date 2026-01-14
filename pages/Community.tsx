
import React, { useState, useEffect, useRef } from 'react';
import { User, Testimonial, ChatRoom, CommunityMessage } from '../types';
import { storage } from '../services/storage';

interface CommunityProps {
  user: User;
}

type Language = 'English' | 'Chichewa';

export const Community: React.FC<CommunityProps> = ({ user }) => {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('study_hub_chat_lang') as Language) || 'English';
  });
  const [activeTab, setActiveTab] = useState<'messenger' | 'testimonials'>('messenger');
  const [hasAgreedToRules, setHasAgreedToRules] = useState(() => {
    return localStorage.getItem(`study_hub_chat_rules_agreed_${user.id}`) === 'true';
  });
  
  // Testimonial States
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Messenger States
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  
  // Create Room States
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomIcon, setNewRoomIcon] = useState('🎓');

  // Emoji selection groups for Room Creation
  const roomEmojiGroups = {
    Education: ['🎓', '📚', '📝', '📓', '🖍️', '🧠', '🏫', '🎒', '🧪', '🎨', '📏', '💡', '📖', '🖋️', '🔍', '📐', '🧪', '🧬', '🌍', '💻', '🎼', '🎭', '🏀', '⚽'],
    Essential: ['🔥', '💯', '📌', '🚀', '💎', '🎯', '✅', '🔔', '⚡', '🤝', '🔋', '💪', '🇲🇼', '🦁', '☀️', '🌊', '🤝', '🛖', '🌽']
  };

  // Simplified Image Editor States (Caption Only)
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [imageCaptionText, setImageCaptionText] = useState('');
  const [captionPosition, setCaptionPosition] = useState<'top' | 'middle' | 'bottom'>('bottom');
  const [captionColor, setCaptionColor] = useState<string>('#ffffff');

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editCanvasRef = useRef<HTMLCanvasElement>(null);

  const spicyEmojis = [
    '😂', '😍', '🔥', '🙌', '💯', '🎉', '✨', '🥳', '🤩', '😎', '👏', '🤙', '💖', '🌈', '🍕', '🍦', '🎮', '⚽',
    '🎓', '📚', '📝', '📓', '🖍️', '🧠', '🏫', '🎒', '🧪', '🎨', '📏', '💡', '📖', '🖋️', '🔍', '📐',
    '🇲🇼', '🦁', '☀️', '🌍', '🤝', '🌽', '🚲', '🏠', '🛶', '🐘', '🦒', '🦅', '🌊', '🌄', '🌃', '⛈️', '🔋', '💪'
  ];

  // UI Strings Translation
  const t = {
    messenger: lang === 'English' ? 'Chat Rooms' : 'Macheza',
    stories: lang === 'English' ? 'Share my Testimony' : 'Umboni wanga',
    hubTitle: lang === 'English' ? 'Community Hub' : 'Bwalo la Ophunzira',
    hubSub: lang === 'English' ? 'Together, Malawian learners excel.' : 'Pamodzi, ophunzira a m’Malawi apambana.',
    rulesTitle: lang === 'English' ? 'Welcome to Study Hub Community' : 'Takulandirani ku Gulu la Study Hub',
    rulesSub: lang === 'English' ? 'By entering, you agree to remain respectful, help your peers, and protect your personal information.' : 'Mukalowa, mukuvomera kulemekezana, kuthandiza anzanu, komanso kusunga zinsinsi zanu.',
    agreeBtn: lang === 'English' ? 'I Agree & Join' : 'Ndikuvomereza & Lowani',
    liveSupport: lang === 'English' ? 'Live Community' : 'Gulu Lamoyo',
    createNewRoom: lang === 'English' ? 'Create New Room' : 'Pangani Chipinda Chatsopano',
    createRoomTitle: lang === 'English' ? 'Create Room' : 'Pangani Chipinda',
    createRoomSub: lang === 'English' ? 'Start a new study thread' : 'Yambani nkhani yatsopano yophunzirira',
    chooseIcon: lang === 'English' ? 'Choose an Icon' : 'Sankhani Chizindikiro',
    roomTitle: lang === 'English' ? 'Room Title' : 'Dzina la Chipinda',
    roomDesc: lang === 'English' ? 'Description (Optional)' : 'Kufotokozera (Ngati kulipo)',
    launchBtn: lang === 'English' ? 'Launch Study Room' : 'Yambitsani Chipinda Chophunzirira',
    placeholder: lang === 'English' ? 'Message in...' : 'Lembani uthenga mu...',
    send: lang === 'English' ? 'Send' : 'Tumizani',
    capturing: lang === 'English' ? 'Capturing Audio...' : 'Tikujambula mawu...',
    cancel: lang === 'English' ? 'Cancel' : 'Letsani',
    finish: lang === 'English' ? 'Finish' : 'Malizani',
    discard: lang === 'English' ? 'Discard' : 'Tayani',
    captionTitle: lang === 'English' ? 'Caption Photo' : 'Lembani pa Chithunzi',
    captionSub: lang === 'English' ? 'Final touch before sending' : 'Malizitsani musanatumize',
    textContent: lang === 'English' ? 'Text Content' : 'Zolemba',
    position: lang === 'English' ? 'Position' : 'Malo',
    color: lang === 'English' ? 'Color' : 'Mtundu',
    sendToChat: lang === 'English' ? 'Send to Chat' : 'Tumizani ku Kukambirana',
    shareStory: lang === 'English' ? 'Share My Story' : 'Uzani Ena Nkhani Yanga',
    postStory: lang === 'English' ? 'Post Story' : 'Tumizani Nkhani',
    communityStories: lang === 'English' ? 'Community Testimonies' : 'Umboni wa Ophunzira',
    storyPrompt: lang === 'English' ? 'How has Study Hub helped your education?' : 'Kodi Study Hub yakuthandizani bwanji pamaphunziro anu?',
    active: lang === 'English' ? 'Active' : 'Amoyo',
  };

  useEffect(() => {
    const storedRooms = storage.getChatRooms();
    setTestimonials(storage.getTestimonials());
    setRooms(storedRooms);
    const defaultRoom = storedRooms[0];
    if (defaultRoom) setActiveRoomId(defaultRoom.id);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoomDropdownOpen(false);
      }
      if (emojiRef.current && !emojiRef.current.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeRoomId && hasAgreedToRules) {
      setMessages(storage.getCommunityMessages(activeRoomId));
    }
    setIsEmojiPickerOpen(false);
    setSelectedImage(null);
    setIsEditingImage(false);
    setRecordedAudio(null);
  }, [activeRoomId, hasAgreedToRules]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const toggleLanguage = () => {
    const newLang = lang === 'English' ? 'Chichewa' : 'English';
    setLang(newLang);
    localStorage.setItem('study_hub_chat_lang', newLang);
  };

  // Image Editor Canvas Redraw
  useEffect(() => {
    if (isEditingImage && selectedImage && editCanvasRef.current) {
      const canvas = editCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        const maxHeight = 600;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        if (imageCaptionText) {
          const fontSize = Math.max(16, Math.floor(width / 20));
          ctx.font = `900 ${fontSize}px Inter, sans-serif`;
          ctx.fillStyle = captionColor;
          ctx.strokeStyle = captionColor === '#ffffff' ? '#000000' : '#ffffff';
          ctx.lineWidth = fontSize / 8;
          ctx.textAlign = 'center';

          const x = width / 2;
          let y = height / 2;
          if (captionPosition === 'top') y = fontSize * 1.5;
          if (captionPosition === 'bottom') y = height - fontSize;

          ctx.strokeText(imageCaptionText, x, y);
          ctx.fillText(imageCaptionText, x, y);
        }
      };
      img.src = selectedImage;
    }
  }, [isEditingImage, selectedImage, imageCaptionText, captionPosition, captionColor]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedAudio(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Please allow microphone access to record voice messages.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setRecordedAudio(null);
  };

  const handleSendChatMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!chatInput.trim() && !selectedImage && !recordedAudio) || !activeRoomId) return;

    let finalImage = selectedImage;
    if (isEditingImage && editCanvasRef.current) {
      finalImage = editCanvasRef.current.toDataURL('image/png');
    }

    const userMsg: CommunityMessage = {
      id: Math.random().toString(36).substr(2, 9),
      roomId: activeRoomId,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.accountRole || 'Learner',
      content: chatInput,
      imageUrl: finalImage || undefined,
      audioUrl: recordedAudio || undefined,
      timestamp: new Date().toISOString()
    };

    storage.saveCommunityMessage(userMsg);
    setMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setSelectedImage(null);
    setRecordedAudio(null);
    setIsEditingImage(false);
    setIsEmojiPickerOpen(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image too large. Max 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setIsEditingImage(true);
        setImageCaptionText('');
      };
      reader.readAsDataURL(file);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadImage = (dataUrl: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `study_hub_image_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;

    const newRoom: ChatRoom = {
      id: `room-${Math.random().toString(36).substr(2, 9)}`,
      title: newRoomTitle,
      description: newRoomDesc,
      icon: newRoomIcon || '💬',
      activeUsers: 1
    };

    storage.saveChatRoom(newRoom);
    setRooms(storage.getChatRooms());
    setActiveRoomId(newRoom.id);
    setIsCreateRoomModalOpen(false);
    setNewRoomTitle('');
    setNewRoomDesc('');
    setNewRoomIcon('🎓');
  };

  const activeRoom = rooms.find(r => r.id === activeRoomId);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      {/* Enhanced Create Room Modal */}
      {isCreateRoomModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <div className="bg-emerald-800 p-8 text-white flex justify-between items-center flex-none">
              <div>
                <h3 className="text-2xl font-black">{t.createRoomTitle}</h3>
                <p className="text-[10px] uppercase font-bold text-emerald-300 tracking-widest mt-1">{t.createRoomSub}</p>
              </div>
              <button onClick={() => setIsCreateRoomModalOpen(false)} className="text-white/60 hover:text-white transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateRoom} className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="flex flex-col items-center">
                 <div className="w-24 h-24 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-5xl shadow-inner mb-6">
                    {newRoomIcon}
                 </div>
                 
                 <div className="w-full space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">{t.chooseIcon}</label>
                      <div className="space-y-4">
                         {Object.entries(roomEmojiGroups).map(([group, emojis]) => (
                           <div key={group} className="space-y-2">
                             <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest px-1">{group}</p>
                             <div className="flex flex-wrap gap-2">
                                {emojis.map(e => (
                                  <button 
                                    key={e} 
                                    type="button" 
                                    onClick={() => setNewRoomIcon(e)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${newRoomIcon === e ? 'bg-emerald-600 text-white scale-110 shadow-lg' : 'bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/50'}`}
                                  >
                                    {e}
                                  </button>
                                ))}
                             </div>
                           </div>
                         ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.roomTitle}</label>
                      <input 
                        type="text" 
                        required
                        value={newRoomTitle}
                        onChange={(e) => setNewRoomTitle(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        placeholder={lang === 'English' ? "e.g. Standard 8 Math Squad" : "Mwachitsanzo: Gulu la Masamu"}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t.roomDesc}</label>
                      <textarea 
                        value={newRoomDesc}
                        onChange={(e) => setNewRoomDesc(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium h-24 resize-none outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        placeholder={lang === 'English' ? "What will students discuss here?" : "Kodi ophunzira akambirana chiyani muno?"}
                      />
                    </div>
                 </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs active:scale-95 shadow-emerald-100 dark:shadow-none"
              >
                {t.launchBtn}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Image Caption Editor Modal */}
      {isEditingImage && selectedImage && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-full max-h-[90vh]">
            <div className="flex-1 bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
               <canvas ref={editCanvasRef} className="max-w-full max-h-full rounded shadow-2xl" />
               <button 
                 onClick={() => { setSelectedImage(null); setIsEditingImage(false); }}
                 className="absolute top-6 left-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            <div className="w-full md:w-80 p-8 flex flex-col gap-6 border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{t.captionTitle}</h3>
                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mt-1">{t.captionSub}</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.textContent}</label>
                  <input 
                    type="text" 
                    value={imageCaptionText}
                    onChange={(e) => setImageCaptionText(e.target.value)}
                    placeholder={lang === 'English' ? "Describe this picture..." : "Fotokozani chithunzi ichi..."}
                    className="w-full px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm text-slate-900 dark:text-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.position}</label>
                  <div className="flex gap-2">
                    {(['top', 'middle', 'bottom'] as const).map(pos => (
                      <button 
                        key={pos}
                        onClick={() => setCaptionPosition(pos)}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${captionPosition === pos ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-100 dark:border-slate-800'}`}
                      >
                        {pos === 'top' ? (lang === 'English' ? 'Top' : 'Pamwamba') : pos === 'middle' ? (lang === 'English' ? 'Middle' : 'Pakati') : (lang === 'English' ? 'Bottom' : 'Pansi')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.color}</label>
                  <div className="flex gap-2 flex-wrap">
                    {['#ffffff', '#ff4444', '#10b981', '#3b82f6', '#f59e0b', '#000000'].map(c => (
                      <button 
                        key={c}
                        onClick={() => setCaptionColor(c)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${captionColor === c ? 'scale-125 border-emerald-500 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-6 flex flex-col gap-3">
                 <button 
                  onClick={() => handleSendChatMessage()}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs active:scale-95"
                 >
                   {t.sendToChat}
                 </button>
                 <button 
                  onClick={() => { setSelectedImage(null); setIsEditingImage(false); }}
                  className="w-full py-4 text-slate-400 hover:text-slate-600 font-black uppercase tracking-widest text-xs transition-all"
                 >
                   {t.cancel}
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
           <div className="absolute top-6 right-6 flex items-center gap-4">
              <button onClick={() => zoomedImage && downloadImage(zoomedImage)} className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl transition-all active:scale-90">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
              <button onClick={() => setZoomedImage(null)} className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
           </div>
           <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl" />
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{t.hubTitle}</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">{t.hubSub}</p>
        </div>
        
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <button 
            onClick={toggleLanguage}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-200/50 flex items-center gap-2 hover:bg-emerald-50 transition-all"
          >
            🌐 {lang}
          </button>

          <div className="flex p-1.5 bg-slate-200/50 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 w-fit">
            <button 
              onClick={() => setActiveTab('messenger')}
              className={`px-8 py-3 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest transition-all flex items-center gap-2 ${activeTab === 'messenger' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xl' : 'text-slate-500'}`}
            >
              💬 {t.messenger}
            </button>
            <button 
              onClick={() => setActiveTab('testimonials')}
              className={`px-8 py-3 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest transition-all flex items-center gap-2 ${activeTab === 'testimonials' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xl' : 'text-slate-500'}`}
            >
              📖 {t.stories}
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'messenger' ? (
        <>
          {!hasAgreedToRules ? (
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 md:p-16 border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col items-center text-center max-w-3xl mx-auto animate-in zoom-in duration-300">
               <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-4xl mb-8">⚖️</div>
               <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-6">{t.rulesTitle}</h3>
               <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed max-w-md">{t.rulesSub}</p>
               <button onClick={() => { localStorage.setItem(`study_hub_chat_rules_agreed_${user.id}`, 'true'); setHasAgreedToRules(true); }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-sm active:scale-[0.98]">{t.agreeBtn}</button>
            </div>
          ) : (
            <div className="flex flex-col bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-200/60 dark:border-slate-700 overflow-hidden shadow-2xl h-[calc(100vh-20rem)] min-h-[450px]">
                 {/* Chat Header */}
                 <div className="bg-slate-900 dark:bg-slate-950 p-6 md:px-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 flex-none">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-2xl shadow-lg flex-none">
                          {activeRoom?.icon || '🗨️'}
                       </div>
                       <div className="relative" ref={dropdownRef}>
                          <button onClick={() => setIsRoomDropdownOpen(!isRoomDropdownOpen)} className="flex items-center gap-3 transition-colors hover:text-emerald-400">
                            <h3 className="text-xl md:text-2xl font-black tracking-tight">{activeRoom?.title}</h3>
                            <svg className={`w-5 h-5 text-emerald-500 transition-transform ${isRoomDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {isRoomDropdownOpen && (
                            <div className="absolute top-full left-0 mt-4 w-72 md:w-80 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-[100] p-3 animate-in slide-in-from-top-2">
                              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                {rooms.map(room => (
                                  <button key={room.id} onClick={() => { setActiveRoomId(room.id); setIsRoomDropdownOpen(false); }} className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-4 ${activeRoomId === room.id ? 'bg-emerald-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
                                    <span className="text-xl">{room.icon}</span>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-black text-sm truncate">{room.title}</p>
                                      <p className={`text-[9px] font-bold uppercase tracking-widest ${activeRoomId === room.id ? 'text-emerald-100' : 'text-slate-400'}`}>{room.activeUsers} {t.active}</p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button 
                                  onClick={() => { setIsCreateRoomModalOpen(true); setIsRoomDropdownOpen(false); }}
                                  className="w-full p-4 rounded-2xl flex items-center gap-4 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all group"
                                >
                                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-xl transition-transform group-hover:rotate-90">＋</div>
                                  <span className="font-black text-[10px] uppercase tracking-widest">{t.createNewRoom}</span>
                                </button>
                              </div>
                            </div>
                          )}
                       </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">{t.liveSupport}</span>
                    </div>
                 </div>

                 {/* Chat Feed */}
                 <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50/50 dark:bg-slate-900/40 custom-scrollbar">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                         <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${msg.senderId === user.id ? 'items-end' : 'items-start'}`}>
                            <div className={`flex items-center gap-2 mb-2 px-1 ${msg.senderId === user.id ? 'flex-row-reverse' : ''}`}>
                               <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider">{msg.senderName}</span>
                               <span className="px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest bg-slate-200 dark:bg-slate-700 text-slate-500">{msg.senderRole}</span>
                            </div>
                            <div className={`p-4 md:p-5 rounded-[2rem] shadow-sm border text-sm font-medium leading-relaxed ${
                               msg.senderId === user.id ? 'bg-emerald-600 text-white border-emerald-500 rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-100 dark:border-slate-700 rounded-tl-none'
                            }`}>
                               {msg.content && <div className="mb-2 whitespace-pre-wrap">{msg.content}</div>}
                               {msg.imageUrl && (
                                 <div className="relative group rounded-2xl overflow-hidden border border-white/10 shadow-lg cursor-zoom-in mt-2">
                                    <img src={msg.imageUrl} alt="Shared" onClick={() => setZoomedImage(msg.imageUrl || null)} className="max-w-full h-auto object-cover max-h-80 transition-transform hover:scale-[1.01]" />
                                    <button onClick={(e) => { e.stopPropagation(); msg.imageUrl && downloadImage(msg.imageUrl); }} className="absolute bottom-3 right-3 p-2 bg-black/60 text-white rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all shadow-xl">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    </button>
                                 </div>
                               )}
                               {msg.audioUrl && (
                                 <div className="mt-2 min-w-[180px] sm:min-w-[240px]">
                                   <audio controls src={msg.audioUrl} className="w-full h-10 filter dark:invert" />
                                 </div>
                               )}
                            </div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2 px-2">
                               {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                         </div>
                      </div>
                    ))}
                    <div ref={chatScrollRef} />
                 </div>

                 {/* Chat Input Area */}
                 <div className="relative flex-none">
                    {/* Recording UI */}
                    {isRecording && (
                      <div className="absolute inset-0 z-[120] bg-emerald-600 text-white flex items-center justify-between px-6 md:px-12 animate-in slide-in-from-bottom-full duration-300">
                        <div className="flex items-center gap-6">
                           <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
                           <span className="text-xl font-black tabular-nums">{formatTime(recordingTime)}</span>
                           <span className="hidden md:inline text-[10px] font-black uppercase tracking-widest opacity-80">{t.capturing}</span>
                        </div>
                        <div className="flex gap-4">
                           <button onClick={cancelRecording} className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all font-black uppercase text-[10px] tracking-widest">{t.cancel}</button>
                           <button onClick={stopRecording} className="px-6 md:px-10 py-3 md:py-4 rounded-2xl bg-white text-emerald-600 font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95">{t.finish}</button>
                        </div>
                      </div>
                    )}

                    {/* Preview UI */}
                    {recordedAudio && !isRecording && (
                      <div className="absolute inset-0 z-[120] bg-slate-900 text-white flex items-center justify-between px-6 md:px-12 animate-in slide-in-from-bottom-full duration-300">
                         <div className="flex items-center gap-6 flex-1 min-w-0">
                            <span className="text-2xl hidden sm:inline">🎙️</span>
                            <audio controls src={recordedAudio} className="h-10 w-full max-w-xs md:max-w-md filter invert" />
                         </div>
                         <div className="flex gap-4 ml-4">
                            <button onClick={() => setRecordedAudio(null)} className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest">{t.discard}</button>
                            <button onClick={() => handleSendChatMessage()} className="px-6 md:px-10 py-3 md:py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95">{t.send}</button>
                         </div>
                      </div>
                    )}

                    {/* Emoji Picker */}
                    {isEmojiPickerOpen && activeRoomId === 'general-chat' && (
                      <div ref={emojiRef} className="absolute bottom-full left-4 md:left-24 mb-4 p-5 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 z-[110] animate-in slide-in-from-bottom-4 duration-300 w-[calc(100%-2rem)] max-w-[420px]">
                        <div className="flex flex-wrap gap-2.5 overflow-y-auto max-h-48 custom-scrollbar">
                          {spicyEmojis.map(emoji => (
                            <button key={emoji} onClick={() => setChatInput(prev => prev + emoji)} className="text-2xl hover:scale-125 transition-transform p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">{emoji}</button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Refined Form with Vertical Button Column */}
                    <form onSubmit={handleSendChatMessage} className="p-4 md:p-6 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-end gap-3 md:gap-5">
                      <div className="flex flex-col items-center gap-2 mb-1">
                        {activeRoomId === 'general-chat' && (
                          <button type="button" onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)} className={`p-3 rounded-full transition-all ${isEmojiPickerOpen ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-emerald-500'}`} title="Emoji">
                            <span className="text-xl leading-none">😀</span>
                          </button>
                        )}
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-emerald-500 transition-all" title="Attach Image">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </button>
                        <button type="button" onClick={startRecording} className="p-3 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-red-500 transition-all group" title="Voice Message">
                          <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 10v2a7 7 0 01-14 0v-2m14 0a2 2 0 002-2V8a2 2 0 00-2-2m-14 0a2 2 0 00-2 2v2a2 2 0 002 2m14 0L12 21" /></svg>
                        </button>
                      </div>

                      <div className="flex-1 flex flex-col md:flex-row items-center gap-3">
                        <textarea 
                          rows={1}
                          value={chatInput} 
                          onChange={(e) => { setChatInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} 
                          placeholder={`${t.placeholder} ${activeRoom?.title}...`} 
                          className="w-full px-6 py-4 rounded-[1.8rem] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-sm transition-all focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-slate-900 dark:text-white resize-none max-h-32" 
                        />
                        <button 
                          type="submit" 
                          disabled={!chatInput.trim() && !selectedImage && !recordedAudio} 
                          className="w-full md:w-auto bg-emerald-600 text-white px-8 py-4 md:py-4 rounded-[1.8rem] shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 transition-all hover:bg-emerald-700"
                        >
                          <span className="md:hidden font-black uppercase text-xs tracking-widest">{t.send}</span>
                          <svg className="w-5 h-5 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
                        </button>
                      </div>
                    </form>
                 </div>
              </div>
          )}
        </>
      ) : (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{t.communityStories}</h3>
            {!showForm && <button onClick={() => setShowForm(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl transition-all active:scale-95 text-xs uppercase tracking-widest">{t.shareStory}</button>}
          </div>
          {showForm && (
             <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700 shadow-2xl animate-in zoom-in duration-300">
               <form onSubmit={(e) => { e.preventDefault(); if(newContent.trim()) { storage.saveTestimonial({ id: Math.random().toString(36).substr(2, 9), userId: user.id, userName: user.name, userProfilePic: 'initials', userRole: user.accountRole || 'Member', content: newContent, rating: 5, timestamp: new Date().toISOString() }); setTestimonials(storage.getTestimonials()); setNewContent(''); setShowForm(false); } }} className="space-y-6">
                 <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} required placeholder={t.storyPrompt} className="w-full p-6 rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none h-40 font-medium transition-all" />
                 <div className="flex gap-4">
                   <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-xs">{t.cancel}</button>
                   <button type="submit" className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest text-xs">{t.postStory}</button>
                 </div>
               </form>
             </div>
          )}
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map(t => (
              <div key={t.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-50 dark:border-slate-700 shadow-sm border-b-8 border-b-emerald-600 transition-all hover:shadow-xl hover:-translate-y-1">
                <p className="text-slate-700 dark:text-slate-300 font-medium italic leading-relaxed text-lg">"{t.content}"</p>
                <div className="mt-8 flex items-center gap-4 pt-6 border-t border-slate-50 dark:border-slate-700/50">
                  <div className="w-12 h-12 bg-emerald-700 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-inner">{(t.userName || '?')[0].toUpperCase()}</div>
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
