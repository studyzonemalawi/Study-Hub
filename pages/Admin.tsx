
import React, { useState, useEffect } from 'react';
import { 
  EducationLevel, 
  Grade, 
  Category, 
  StudyMaterial, 
  User,
  Message,
  Announcement,
  PRIMARY_GRADES, 
  SECONDARY_GRADES, 
  PRIMARY_SUBJECTS, 
  SECONDARY_SUBJECTS
} from '../types';
import { storage } from '../services/storage';

const MAX_FILE_SIZE_MB = 25;

interface AdminProps {
  onNavigate: (tab: string) => void;
}

export const Admin: React.FC<AdminProps> = ({ onNavigate }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'content' | 'users' | 'announcements'>('content');
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  
  // Content Upload States
  const [level, setLevel] = useState<EducationLevel>(EducationLevel.PRIMARY);
  const [grade, setGrade] = useState<Grade>(PRIMARY_GRADES[0]);
  const [category, setCategory] = useState<Category>(Category.NOTES);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Announcement States
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'important' | 'urgent'>('normal');

  useEffect(() => {
    setMaterials(storage.getMaterials());
    setUsers(storage.getUsers());
    setAnnouncements(storage.getAnnouncements());
  }, []);

  const availableGrades = level === EducationLevel.PRIMARY 
    ? PRIMARY_GRADES 
    : SECONDARY_GRADES;
    
  const availableSubjects = level === EducationLevel.PRIMARY ? PRIMARY_SUBJECTS : SECONDARY_SUBJECTS;
  const availableCategories = [Category.NOTES, Category.BOOKS, Category.PAST_PAPERS];

  useEffect(() => {
    setGrade(level === EducationLevel.PRIMARY ? PRIMARY_GRADES[0] : SECONDARY_GRADES[0]);
    setSubject(availableSubjects[0]);
    setCategory(Category.NOTES);
  }, [level]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setError(null);
    setSuccessMsg(null);
    if (selectedFile) {
      const fileSizeMB = selectedFile.size / (1024 * 1024);
      if (fileSizeMB > MAX_FILE_SIZE_MB) {
        setError(`File is too large (${fileSizeMB.toFixed(2)}MB). Max size is ${MAX_FILE_SIZE_MB}MB.`);
        setFile(null);
        return;
      }
      if (selectedFile.type !== 'application/pdf') {
        setError('Only PDF files are allowed.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmitAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !subject || !title || isUploading) return;
    setShowConfirmModal(true);
  };

  const startUpload = () => {
    setShowConfirmModal(false);
    if (!file || !subject || !title || isUploading) return;
    setIsUploading(true);
    setUploadProgress(0);
    setSuccessMsg(null);
    
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          completeUpload();
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    const completeUpload = () => {
      const newMaterial: StudyMaterial = {
        id: Math.random().toString(36).substr(2, 9),
        title, level, grade, category, subject,
        fileName: file.name,
        fileUrl: URL.createObjectURL(file),
        uploadedAt: new Date().toISOString()
      };
      storage.saveMaterial(newMaterial);
      setMaterials((prev) => [...prev, newMaterial]);
      setIsUploading(false);
      setUploadProgress(0);
      setTitle('');
      setFile(null);
      setSuccessMsg('Material saved successfully');
      const input = document.getElementById('file-upload') as HTMLInputElement;
      if (input) input.value = '';
    };
  };

  const handlePostAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    const newAnn: Announcement = {
      id: Math.random().toString(36).substr(2, 9),
      title: annTitle,
      content: annContent,
      priority: annPriority,
      timestamp: new Date().toISOString()
    };

    storage.saveAnnouncement(newAnn);
    setAnnouncements([newAnn, ...announcements]);
    setAnnTitle('');
    setAnnContent('');
    setAnnPriority('normal');
    setSuccessMsg('Announcement published successfully');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const deleteAnnouncement = (id: string) => {
    if (window.confirm('Delete this announcement?')) {
      storage.deleteAnnouncement(id);
      setAnnouncements(announcements.filter(a => a.id !== id));
    }
  };

  const deleteItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      storage.deleteMaterial(id);
      setMaterials(materials.filter(m => m.id !== id));
    }
  };

  const deleteUser = (userId: string) => {
    if (window.confirm('WARNING: Are you sure you want to delete this user?')) {
      storage.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      if (selectedUser?.id === userId) setSelectedUser(null);
    }
  };

  const viewUserHistory = (user: User) => {
    const allMessages = storage.getMessages();
    const filtered = allMessages.filter(m => m.senderId === user.id || m.receiverId === user.id);
    setUserMessages(filtered);
    setSelectedUser(user);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveAdminTab('content')}
            className={`px-6 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === 'content' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            Content
          </button>
          <button 
            onClick={() => setActiveAdminTab('users')}
            className={`px-6 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === 'users' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveAdminTab('announcements')}
            className={`px-6 py-2 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === 'announcements' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            Announcements
          </button>
        </div>
        <button 
          onClick={() => onNavigate('home')}
          className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl transition-all flex items-center gap-2 group"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          <span className="text-[10px] font-black uppercase tracking-widest">Exit Admin</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">✓</span>
          {successMsg}
        </div>
      )}

      {activeAdminTab === 'content' && (
        <div className="grid lg:grid-cols-2 gap-8 pb-20 animate-in fade-in duration-500">
          <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-2xl h-fit">
            <h2 className="text-2xl font-black mb-6 text-gray-800">Post New Resource</h2>
            <form onSubmit={handleSubmitAttempt} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Level</label>
                  <select value={level} disabled={isUploading} onChange={(e) => setLevel(e.target.value as EducationLevel)} className="w-full p-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50">
                    {Object.values(EducationLevel).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grade / Form</label>
                  <select value={grade} disabled={isUploading} onChange={(e) => setGrade(e.target.value as Grade)} className="w-full p-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50">
                    {availableGrades.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                  <select value={category} disabled={isUploading} onChange={(e) => setCategory(e.target.value as Category)} className="w-full p-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50">
                    {availableCategories.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</label>
                  <select value={subject} disabled={isUploading} onChange={(e) => setSubject(e.target.value)} className="w-full p-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50">
                    {availableSubjects.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resource Title</label>
                <input type="text" required disabled={isUploading} placeholder="e.g. 2023 Mathematics Paper 1" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PDF Document</label>
                <input type="file" required accept=".pdf" onChange={handleFileChange} className="w-full p-4 rounded-2xl border border-gray-100 border-dashed bg-gray-50 text-gray-500 file:hidden cursor-pointer" />
                {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
              </div>
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-emerald-700"><span>Processing...</span><span>{uploadProgress}%</span></div>
                  <div className="w-full bg-emerald-50 rounded-full h-3 overflow-hidden"><div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div></div>
                </div>
              )}
              <button type="submit" disabled={isUploading || !!error || !file} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-sm disabled:opacity-50">
                {isUploading ? 'Uploading...' : 'Publish to Library'}
              </button>
            </form>
          </div>
          <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl overflow-hidden flex flex-col h-fit">
            <h2 className="text-2xl font-black mb-6 text-gray-800">Library Assets ({materials.length})</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {materials.map(m => (
                <div key={m.id} className="p-5 bg-gray-50 rounded-[1.5rem] flex items-center justify-between border border-transparent hover:border-emerald-100 transition-all">
                  <div className="truncate pr-4">
                    <h4 className="font-bold text-gray-800 truncate text-sm">{m.title}</h4>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{m.subject} • {m.grade}</p>
                  </div>
                  <button onClick={() => deleteItem(m.id)} className="p-3 bg-white text-red-300 hover:text-red-500 rounded-xl transition-all shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'announcements' && (
        <div className="grid lg:grid-cols-2 gap-8 pb-20 animate-in fade-in duration-500">
           <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-2xl h-fit">
            <h2 className="text-2xl font-black mb-6 text-gray-800">Broadcast Announcement</h2>
            <form onSubmit={handlePostAnnouncement} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Announcement Title</label>
                <input type="text" required placeholder="e.g. MSCE 2024 Past Papers Uploaded!" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="w-full p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 font-bold" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message Priority</label>
                <div className="flex gap-2">
                  {['normal', 'important', 'urgent'].map(p => (
                    <button key={p} type="button" onClick={() => setAnnPriority(p as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${annPriority === p ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-400 border-gray-100'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Message Content</label>
                <textarea required placeholder="Write the full update for all members..." value={annContent} onChange={(e) => setAnnContent(e.target.value)} className="w-full p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none bg-gray-50 h-40 font-medium resize-none" />
              </div>
              <button type="submit" className="w-full bg-emerald-800 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-emerald-900 transition-all uppercase tracking-widest text-sm">
                Publish Broadcast
              </button>
            </form>
          </div>
          <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl overflow-hidden flex flex-col h-fit">
            <h2 className="text-2xl font-black mb-6 text-gray-800">Sent Broadcasts ({announcements.length})</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
               {announcements.map(a => (
                 <div key={a.id} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-3 relative group">
                    <button onClick={() => deleteAnnouncement(a.id)} className="absolute top-4 right-4 text-red-200 hover:text-red-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${a.priority === 'urgent' ? 'bg-red-500 text-white' : a.priority === 'important' ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white'}`}>
                        {a.priority}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">{new Date(a.timestamp).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-black text-gray-800">{a.title}</h4>
                    <p className="text-xs text-gray-500 line-clamp-2">{a.content}</p>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'users' && (
        <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in duration-500 pb-20">
          <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-2xl">
            <h2 className="text-xl font-black mb-6 text-gray-800 uppercase tracking-widest text-xs">Platform Users ({users.length})</h2>
            <div className="space-y-3 overflow-y-auto max-h-[70vh] custom-scrollbar pr-2">
              {users.map(u => (
                <div key={u.id} className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${selectedUser?.id === u.id ? 'bg-emerald-50 border-emerald-200 shadow-md' : 'bg-gray-50 border-transparent hover:border-emerald-200'}`} onClick={() => viewUserHistory(u)}>
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 overflow-hidden"><img src={u.profilePic || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" /></div>
                    <div className="truncate"><p className="font-bold text-gray-800 truncate text-sm">{u.name}</p></div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteUser(u.id); }} className="text-red-200 hover:text-red-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-2xl h-fit">
            {!selectedUser ? <div className="h-64 flex flex-col items-center justify-center text-gray-300 opacity-40"><p className="font-black uppercase tracking-widest text-xs">Select user to view history</p></div> : (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex justify-between items-center border-b pb-8"><h3 className="text-2xl font-black text-gray-800">{selectedUser.name}</h3><button onClick={() => deleteUser(selectedUser.id)} className="px-6 py-3 bg-red-50 text-red-600 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors">Ban User</button></div>
                <div className="space-y-4 bg-gray-50 p-6 rounded-[2rem] max-h-96 overflow-y-auto custom-scrollbar border border-gray-100">
                  {userMessages.length === 0 ? <div className="py-20 text-center text-gray-400 italic text-sm">No messages yet.</div> : userMessages.map(m => (
                    <div key={m.id} className={`flex ${m.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-4 rounded-2xl text-sm ${m.senderId === 'admin' ? 'bg-emerald-600 text-white' : 'bg-white border text-gray-800'}`}>{m.content}</div></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-200 border border-white/20">
            <h3 className="text-2xl font-black text-gray-800 mb-2">Publish Resource?</h3>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed">This will make "{title}" visible to all students in {level} {grade}.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowConfirmModal(false)} className="w-full py-4 rounded-2xl bg-gray-100 text-gray-600 font-black uppercase tracking-widest text-xs">Cancel</button>
              <button onClick={startUpload} className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100">Publish Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
