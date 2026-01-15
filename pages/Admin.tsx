
import React, { useState, useEffect } from 'react';
import { 
  EducationLevel, 
  Grade, 
  Category, 
  StudyMaterial, 
  User,
  Message,
  Announcement,
  AccountRole,
  PRIMARY_GRADES, 
  SECONDARY_GRADES, 
  PRIMARY_SUBJECTS, 
  SECONDARY_SUBJECTS
} from '../types';
import { storage } from '../services/storage';

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
  
  // Content Upload States (Redesigned for Google Drive)
  const [level, setLevel] = useState<EducationLevel>(EducationLevel.PRIMARY);
  const [grade, setGrade] = useState<Grade>(PRIMARY_GRADES[0]);
  const [category, setCategory] = useState<Category>(Category.NOTES);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Announcement States
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [annToDelete, setAnnToDelete] = useState<string | null>(null);

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

  // Helper to convert Google Drive sharing link to direct download link
  const convertToDirectLink = (link: string): string | null => {
    try {
      const idMatch = link.match(/\/d\/([a-zA-Z0-9_-]+)/) || link.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
      }
      if (link.startsWith('http')) return link;
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleSubmitAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!driveLink || !subject || !title || isUploading) return;
    
    const directUrl = convertToDirectLink(driveLink);
    if (!directUrl) {
      setError("Please provide a valid Google Drive sharing link.");
      return;
    }
    
    setShowConfirmModal(true);
  };

  const startPublish = async () => {
    setShowConfirmModal(false);
    setIsUploading(true);
    setSuccessMsg(null);
    
    const directUrl = convertToDirectLink(driveLink);

    try {
      const newMaterial: StudyMaterial = {
        id: Math.random().toString(36).substr(2, 9),
        title, 
        level, 
        grade, 
        category, 
        subject,
        fileName: `${title.replace(/\s+/g, '_')}.pdf`,
        fileUrl: directUrl!,
        uploadedAt: new Date().toISOString()
      };
      
      await storage.saveMaterial(newMaterial);
      
      setMaterials((prev) => [newMaterial, ...prev]);
      setTitle('');
      setDriveLink('');
      setSuccessMsg('Resource published successfully via Google Drive');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to publish material");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    const newAnn: Announcement = {
      id: Math.random().toString(36).substr(2, 9),
      title: annTitle,
      content: annContent,
      priority: annPriority,
      timestamp: new Date().toISOString()
    };

    await storage.saveAnnouncement(newAnn);
    setAnnouncements([newAnn, ...announcements]);
    setAnnTitle('');
    setAnnContent('');
    setAnnPriority('normal');
    setSuccessMsg('Announcement broadcasted to all users');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleOpenDeleteAnnModal = (id: string) => {
    setAnnToDelete(id);
  };

  const confirmDeleteAnnouncement = async () => {
    if (!annToDelete) return;
    
    await storage.deleteAnnouncement(annToDelete);
    setAnnouncements(announcements.filter(a => a.id !== annToDelete));
    setAnnToDelete(null);
    setSuccessMsg('Announcement removed from the platform');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const deleteItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      await storage.deleteMaterial(id);
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

  const handleRoleChange = (newRole: AccountRole) => {
    if (!selectedUser) return;
    
    const updatedUser: User = { ...selectedUser, accountRole: newRole };
    storage.updateUser(updatedUser);
    
    setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
    setSelectedUser(updatedUser);
    
    setSuccessMsg(`Role updated to ${newRole} for ${updatedUser.name}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const viewUserHistory = (user: User) => {
    const allMessages = storage.getMessages();
    const filtered = allMessages.filter(m => m.senderId === user.id || m.receiverId === user.id);
    setUserMessages(filtered);
    setSelectedUser(user);
  };

  return (
    <div className="space-y-6">
      {/* Admin Nav */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveAdminTab('content')}
            className={`px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === 'content' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            Content Hub
          </button>
          <button 
            onClick={() => setActiveAdminTab('users')}
            className={`px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === 'users' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            User Accounts
          </button>
          <button 
            onClick={() => setActiveAdminTab('announcements')}
            className={`px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === 'announcements' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            Broadcasts
          </button>
        </div>
        <button 
          onClick={() => onNavigate('home')}
          className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl transition-all flex items-center gap-3 group border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          <span className="text-[10px] font-black uppercase tracking-widest">Exit Portal</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
          <span className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">✓</span>
          {successMsg}
        </div>
      )}

      {activeAdminTab === 'content' && (
        <div className="grid lg:grid-cols-2 gap-8 pb-20 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl h-fit relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 grayscale pointer-events-none">
                <span className="text-8xl font-black">SH</span>
            </div>

            <div className="flex items-center gap-4 mb-10">
               <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/20">
                  <span className="text-white font-black text-xl">SH</span>
               </div>
               <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Post Digital Resource</h2>
                  <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Google Drive Integration Enabled</p>
               </div>
            </div>

            <form onSubmit={handleSubmitAttempt} className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Level</label>
                  <select value={level} disabled={isUploading} onChange={(e) => setLevel(e.target.value as EducationLevel)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white transition-all appearance-none">
                    {Object.values(EducationLevel).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Grade / Form</label>
                  <select value={grade} disabled={isUploading} onChange={(e) => setGrade(e.target.value as Grade)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white transition-all appearance-none">
                    {availableGrades.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Category</label>
                  <select value={category} disabled={isUploading} onChange={(e) => setCategory(e.target.value as Category)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white transition-all appearance-none">
                    {availableCategories.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Subject</label>
                  <select value={subject} disabled={isUploading} onChange={(e) => setSubject(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white transition-all appearance-none">
                    {availableSubjects.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Resource Title</label>
                <input type="text" required disabled={isUploading} placeholder="e.g. MSCE Biology Notes Unit 1" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-5 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Google Drive Sharing Link</label>
                <div className="relative">
                  <input 
                    type="url" 
                    required 
                    disabled={isUploading} 
                    placeholder="https://drive.google.com/file/d/..." 
                    value={driveLink} 
                    onChange={(e) => setDriveLink(e.target.value)} 
                    className="w-full p-5 pl-14 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white transition-all" 
                  />
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 opacity-40">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/></svg>
                  </div>
                </div>
                {error && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest px-2">{error}</p>}
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold px-2 uppercase tracking-widest">Ensure "Anyone with the link" can view the file on Google Drive.</p>
              </div>

              <button type="submit" disabled={isUploading || !driveLink || !title} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-xs disabled:opacity-50 active:scale-95 shadow-emerald-500/20">
                {isUploading ? 'Validating Link...' : 'Publish to Hub'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col h-fit">
            <h2 className="text-2xl font-black mb-8 text-slate-900 dark:text-white flex items-center gap-3">
               <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
               Library Assets ({materials.length})
            </h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {materials.map(m => (
                <div key={m.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] flex items-center justify-between border border-transparent hover:border-emerald-500/20 transition-all group">
                  <div className="truncate pr-4 flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-[10px] font-black text-emerald-600 border border-slate-100 dark:border-slate-700 shadow-sm flex-none">SH</div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm">{m.title}</h4>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">{m.subject} • {m.grade}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteItem(m.id)} className="p-3 bg-white dark:bg-slate-800 text-red-300 hover:text-red-500 rounded-xl transition-all shadow-sm flex-none">
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
           <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl h-fit">
            <h2 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">Broadcast Announcement</h2>
            <form onSubmit={handlePostAnnouncement} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Announcement Title</label>
                <input type="text" required placeholder="e.g. MSCE 2024 Past Papers Uploaded!" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Message Priority</label>
                <div className="flex gap-2">
                  {['normal', 'important', 'urgent'].map(p => (
                    <button key={p} type="button" onClick={() => setAnnPriority(p as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${annPriority === p ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-700'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Message Content</label>
                <textarea required placeholder="Write the full update for all members..." value={annContent} onChange={(e) => setAnnContent(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50 dark:bg-slate-900 font-medium text-slate-800 dark:text-white transition-all h-40 resize-none" />
              </div>
              <button type="submit" className="w-full bg-emerald-800 text-white font-black py-5 rounded-3xl shadow-xl hover:bg-emerald-900 transition-all uppercase tracking-widest text-xs">
                Publish Broadcast
              </button>
            </form>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col h-fit">
            <h2 className="text-2xl font-black mb-6 text-slate-900 dark:text-white">Sent Broadcasts ({announcements.length})</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
               {announcements.map(a => (
                 <div key={a.id} className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-4 relative group">
                    <button onClick={() => handleOpenDeleteAnnModal(a.id)} className="absolute top-6 right-6 p-2.5 bg-red-50 dark:bg-red-900/20 text-red-300 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-all shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${a.priority === 'urgent' ? 'bg-red-500 text-white' : a.priority === 'important' ? 'bg-orange-500 text-white' : 'bg-emerald-600 text-white'}`}>
                        {a.priority}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">{new Date(a.timestamp).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-black text-slate-800 dark:text-slate-100 text-lg">{a.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{a.content}</p>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'users' && (
        <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in duration-500 pb-20">
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl">
            <h2 className="text-xl font-black mb-8 text-slate-900 dark:text-white uppercase tracking-widest text-[10px]">Platform Users ({users.length})</h2>
            <div className="space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar pr-2">
              {users.map(u => (
                <div key={u.id} className={`p-5 rounded-[2rem] border transition-all cursor-pointer flex justify-between items-center ${selectedUser?.id === u.id ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 shadow-md' : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:border-emerald-200'}`} onClick={() => viewUserHistory(u)}>
                  <div className="flex items-center space-x-4 overflow-hidden">
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 overflow-hidden flex-none">
                      <div className="w-full h-full bg-emerald-50 dark:bg-slate-950 flex items-center justify-center font-black text-emerald-600 text-sm">
                        {u.name ? u.name[0].toUpperCase() : '?'}
                      </div>
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm">{u.name || u.email}</p>
                      <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 mt-0.5">{u.accountRole || 'Member'}</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteUser(u.id); }} className="text-red-200 hover:text-red-500 transition-colors flex-none ml-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[3rem] p-12 border border-slate-100 dark:border-slate-700 shadow-2xl h-fit">
            {!selectedUser ? <div className="h-96 flex flex-col items-center justify-center text-slate-300 opacity-40"><p className="font-black uppercase tracking-widest text-[10px]">Select user to view details</p></div> : (
              <div className="space-y-10 animate-in fade-in duration-300">
                <div className="flex justify-between items-start border-b border-slate-50 dark:border-slate-700 pb-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-[2rem] bg-emerald-600 flex items-center justify-center text-3xl text-white font-black shadow-xl shadow-emerald-500/20">{selectedUser.name ? selectedUser.name[0].toUpperCase() : '?'}</div>
                    <div>
                      <h3 className="text-3xl font-black text-slate-900 dark:text-white">{selectedUser.name || 'Anonymous User'}</h3>
                      <p className="text-slate-400 dark:text-slate-500 text-xs font-bold mt-1">{selectedUser.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => deleteUser(selectedUser.id)} className="px-8 py-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors">Ban Account</button>
                  </div>
                </div>

                <div className="p-8 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-[2.5rem] space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-400">Modify User Permissions</h4>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-600 px-3 py-1 rounded-lg text-white">Current: {selectedUser.accountRole || 'Member'}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.values(AccountRole).map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleChange(role)}
                        className={`py-4 px-4 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                          selectedUser.accountRole === role 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl' 
                            : 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-500 border-emerald-100 dark:border-emerald-900 hover:border-emerald-500'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Recent Interactions</h4>
                  <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] max-h-96 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-800">
                    {userMessages.length === 0 ? <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest text-[10px] opacity-40">No message history available.</div> : userMessages.map(m => (
                      <div key={m.id} className={`flex ${m.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-5 rounded-[1.8rem] text-sm font-medium ${m.senderId === 'admin' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100'}`}>
                          {m.content}
                          <div className="mt-3 text-[8px] opacity-60 font-black uppercase tracking-widest border-t border-white/10 pt-2">
                            {new Date(m.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-200 border border-white/10">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center text-4xl mb-8 mx-auto shadow-inner">📤</div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 text-center">Confirm Publication</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 text-center leading-relaxed px-4">This will create a direct link to the Google Drive file for all students in {level} {grade}.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowConfirmModal(false)} className="w-full py-5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase tracking-widest text-[10px]">Cancel</button>
              <button onClick={startPublish} className="w-full py-5 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all">Publish</button>
            </div>
          </div>
        </div>
      )}

      {annToDelete && (
        <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-200 border border-white/10">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 rounded-3xl flex items-center justify-center text-4xl mb-8 mx-auto shadow-inner">🗑️</div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 text-center">Delete Broadcast?</h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 text-center leading-relaxed px-4">This announcement will be permanently removed for all members. This action cannot be undone.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setAnnToDelete(null)} className="w-full py-5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase tracking-widest text-[10px]">Keep It</button>
              <button onClick={confirmDeleteAnnouncement} className="w-full py-5 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-500/20 active:scale-95 transition-all">Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
