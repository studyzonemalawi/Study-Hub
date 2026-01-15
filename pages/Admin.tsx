
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
  const [activeAdminTab, setActiveAdminTab] = useState<'content' | 'users' | 'announcements' | 'exams'>('content');
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  
  // Content Upload States
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
    setExams(storage.getExams());
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

  const deleteExam = (id: string) => {
    if (window.confirm("Are you sure you want to delete this AI Exam?")) {
      storage.deleteExam(id);
      setExams(storage.getExams());
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveAdminTab('content')}
            className={`px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === 'content' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            Content Hub
          </button>
          <button 
            onClick={() => setActiveAdminTab('exams')}
            className={`px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === 'exams' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            Exam Portal
          </button>
          <button 
            onClick={() => setActiveAdminTab('users')}
            className={`px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === 'users' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveAdminTab('announcements')}
            className={`px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === 'announcements' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            Broadcasts
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
          <span className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">✓</span>
          {successMsg}
        </div>
      )}

      {activeAdminTab === 'exams' && (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <div className="bg-emerald-800 p-10 md:p-16 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
             <div className="relative z-10 space-y-4 text-center md:text-left">
                <h2 className="text-4xl font-black tracking-tight leading-none">Smart Exam Center</h2>
                <p className="text-emerald-200 font-medium max-w-md">Generate complete online examinations in seconds using AI from any study material text.</p>
                <button 
                  onClick={() => onNavigate('admin-exam-form')}
                  className="bg-white text-emerald-800 font-black px-10 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all uppercase tracking-widest text-[11px]"
                >
                  Formulate Online Exam
                </button>
             </div>
             <div className="relative z-10 w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-inner">🤖</div>
             <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map(e => (
              <div key={e.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between h-full">
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100">{e.questions.length} Items</span>
                       <button onClick={() => deleteExam(e.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                       </button>
                    </div>
                    <h4 className="font-black text-slate-800 dark:text-white text-lg leading-tight">{e.title}</h4>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{e.grade} • {e.subject}</p>
                 </div>
              </div>
            ))}
          </div>
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

      {/* Announcements and Users omitted for brevity, same as previous file */}
    </div>
  );
};
