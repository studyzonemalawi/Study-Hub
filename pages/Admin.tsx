
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

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setMaterials(storage.getMaterials());
    setUsers(storage.getUsers());
    setAnnouncements(storage.getAnnouncements());
    setExams(storage.getExams());
  };

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
      setSuccessMsg('Resource published successfully');
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

  const deleteAnnouncement = async (id: string) => {
    if (window.confirm("Remove this broadcast?")) {
      await storage.deleteAnnouncement(id);
      setAnnouncements(announcements.filter(a => a.id !== id));
    }
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

  const handleRoleChange = (userId: string, newRole: AccountRole) => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    
    const updatedUser: User = { ...userToUpdate, accountRole: newRole };
    storage.updateUser(updatedUser);
    setUsers(users.map(u => u.id === userId ? updatedUser : u));
    
    setSuccessMsg(`Role updated to ${newRole}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
          {(['content', 'exams', 'users', 'announcements'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveAdminTab(tab)}
              className={`px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === tab ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              {tab === 'announcements' ? 'Broadcasts' : tab === 'content' ? 'Content Hub' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {successMsg && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
          <span className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm">✓</span>
          {successMsg}
        </div>
      )}

      {/* Content Hub Tab */}
      {activeAdminTab === 'content' && (
        <div className="grid lg:grid-cols-2 gap-8 pb-20 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl h-fit relative overflow-hidden">
            <div className="flex items-center gap-4 mb-10">
               <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg border border-emerald-400/20">
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Level</label>
                  <select value={level} disabled={isUploading} onChange={(e) => setLevel(e.target.value as EducationLevel)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white appearance-none">
                    {Object.values(EducationLevel).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Grade</label>
                  <select value={grade} disabled={isUploading} onChange={(e) => setGrade(e.target.value as Grade)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white appearance-none">
                    {availableGrades.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Category</label>
                  <select value={category} disabled={isUploading} onChange={(e) => setCategory(e.target.value as Category)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white appearance-none">
                    {availableCategories.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Subject</label>
                  <select value={subject} disabled={isUploading} onChange={(e) => setSubject(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white appearance-none">
                    {availableSubjects.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Resource Title</label>
                <input type="text" required disabled={isUploading} placeholder="e.g. MSCE Biology Notes Unit 1" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-5 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Google Drive Sharing Link</label>
                <input type="url" required disabled={isUploading} placeholder="https://drive.google.com/file/d/..." value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="w-full p-5 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white" />
                {error && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest px-2">{error}</p>}
              </div>

              <button type="submit" disabled={isUploading || !driveLink || !title} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-xs disabled:opacity-50 active:scale-95">
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
                  <div className="truncate pr-4 min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm">{m.title}</h4>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">{m.subject} • {m.grade}</p>
                  </div>
                  <button onClick={() => deleteItem(m.id)} className="p-3 bg-white dark:bg-slate-800 text-red-300 hover:text-red-500 rounded-xl shadow-sm flex-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Exam Tab */}
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

      {/* Broadcasts Tab */}
      {activeAdminTab === 'announcements' && (
        <div className="grid lg:grid-cols-2 gap-8 pb-20 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl h-fit">
            <h2 className="text-2xl font-black mb-8 text-slate-900 dark:text-white flex items-center gap-3">
              <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
              Create Broadcast
            </h2>
            <form onSubmit={handlePostAnnouncement} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Broadcast Title</label>
                <input 
                  type="text" 
                  required 
                  value={annTitle} 
                  onChange={(e) => setAnnTitle(e.target.value)} 
                  placeholder="e.g. MSCE Results Update" 
                  className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Message Content</label>
                <textarea 
                  required 
                  value={annContent} 
                  onChange={(e) => setAnnContent(e.target.value)} 
                  placeholder="Tell students what's new..." 
                  className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium outline-none focus:ring-2 focus:ring-orange-500 h-40 resize-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Priority Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['normal', 'important', 'urgent'] as const).map(p => (
                    <button 
                      key={p} 
                      type="button" 
                      onClick={() => setAnnPriority(p)}
                      className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${annPriority === p ? 'bg-orange-500 text-white border-orange-500 shadow-lg' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-transparent hover:border-orange-200'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                type="submit" 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-5 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-xs active:scale-95"
              >
                Send Broadcast 📢
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-xl flex flex-col h-fit">
            <h2 className="text-2xl font-black mb-8 text-slate-900 dark:text-white flex items-center gap-3">
              <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
              Sent Broadcasts ({announcements.length})
            </h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {announcements.length === 0 ? (
                <div className="text-center py-20 text-slate-400 font-bold italic">No broadcasts sent yet.</div>
              ) : (
                announcements.map(a => (
                  <div key={a.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-transparent hover:border-orange-200/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                       <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${a.priority === 'urgent' ? 'bg-red-500 text-white' : a.priority === 'important' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'}`}>
                        {a.priority}
                       </span>
                       <button onClick={() => deleteAnnouncement(a.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                    </div>
                    <h4 className="font-black text-slate-800 dark:text-white mb-1">{a.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{a.content}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-4">Posted: {new Date(a.timestamp).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeAdminTab === 'users' && (
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl animate-in fade-in duration-500 pb-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
             <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Hub Members</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Manage student and teacher identities across Malawi.</p>
             </div>
             <div className="bg-emerald-50 dark:bg-emerald-950/30 px-6 py-3 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{users.length} Registered Users</span>
             </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(u => (
              <div key={u.id} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2.5rem] border border-transparent hover:border-emerald-500/20 transition-all flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-xs shadow-md">
                      {(u.name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-slate-900 dark:text-white truncate">{u.name || 'Unknown User'}</h4>
                      <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                     <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[8px] font-black uppercase text-slate-400">Grade</p>
                        <p className="text-[10px] font-bold text-slate-700 dark:text-white">{u.currentGrade || 'N/A'}</p>
                     </div>
                     <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                        <p className="text-[8px] font-black uppercase text-slate-400">District</p>
                        <p className="text-[10px] font-bold text-slate-700 dark:text-white">{u.district || 'N/A'}</p>
                     </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[8px] font-black uppercase text-slate-400">Account Role</label>
                    <select 
                      value={u.accountRole} 
                      onChange={(e) => handleRoleChange(u.id, e.target.value as AccountRole)}
                      className="text-[10px] font-black uppercase text-emerald-600 bg-transparent outline-none cursor-pointer"
                    >
                      {Object.values(AccountRole).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <button 
                    onClick={() => deleteUser(u.id)}
                    className="w-full py-2.5 rounded-xl border border-red-100 dark:border-red-900/30 text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  >
                    Remove Access
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
