
import React, { useState, useEffect, useRef } from 'react';
import { 
  EducationLevel, 
  Grade, 
  Category, 
  StudyMaterial, 
  User,
  Announcement,
  PRIMARY_GRADES, 
  SECONDARY_GRADES, 
  PRIMARY_SUBJECTS, 
  SECONDARY_SUBJECTS
} from '../types';
import { storage } from '../services/storage';
import { supabase } from '../services/supabase';
import { PdfViewer } from '../components/PdfViewer';

interface AdminProps {
  user: User;
  onNavigate: (tab: string) => void;
}

export const Admin: React.FC<AdminProps> = ({ user, onNavigate }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'content' | 'local-upload' | 'users' | 'announcements' | 'exams'>('local-upload');
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  
  // Content Upload States
  const [level, setLevel] = useState<EducationLevel>(EducationLevel.PRIMARY);
  const [grade, setGrade] = useState<Grade>(PRIMARY_GRADES[0]);
  const [category, setCategory] = useState<Category>(Category.NOTES);
  const [subject, setSubject] = useState(PRIMARY_SUBJECTS[0]);
  const [title, setTitle] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [localFile, setLocalFile] = useState<File | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Preview State
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);

  // Announcement States
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'important' | 'urgent'>('normal');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setMaterials(storage.getMaterials());
    setUsers(storage.getUsers());
    setAnnouncements(storage.getAnnouncements());
    setExams(storage.getExams());
    
    // Attempt to sync from cloud immediately on admin panel load
    if (navigator.onLine) {
      const global = await storage.fetchGlobalMaterials();
      if (global) setMaterials(global);
    }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError("Only PDF files are supported.");
        setLocalFile(null);
        return;
      }
      setLocalFile(file);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "));
      setError(null);
    }
  };

  const handlePublish = async () => {
    setShowConfirmModal(false);
    setIsUploading(true);
    setSuccessMsg(null);
    setError(null);
    
    try {
      let finalUrl = "";
      let finalFileName = "";

      if (activeAdminTab === 'local-upload' && localFile) {
        // Upload binary to Supabase Storage with hierarchical path
        const timestamp = Date.now();
        const sanitizedName = localFile.name.replace(/[^a-zA-Z0-9.]/g, '_');
        // Path format: Level/Grade/Subject/filename
        const filePath = `${level}/${grade}/${subject}/${timestamp}_${sanitizedName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, localFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('materials')
          .getPublicUrl(filePath);

        finalUrl = publicUrl;
        finalFileName = localFile.name;
      } else {
        const directUrl = convertToDirectLink(driveLink);
        if (!directUrl) throw new Error("Invalid Drive Link provided.");
        finalUrl = directUrl;
        finalFileName = `${title.replace(/\s+/g, '_')}.pdf`;
      }

      const newMaterial: StudyMaterial = {
        id: Math.random().toString(36).substr(2, 9),
        title, 
        level, 
        grade, 
        category, 
        subject,
        fileName: finalFileName,
        fileUrl: finalUrl,
        uploadedAt: new Date().toISOString()
      };
      
      await storage.saveMaterial(newMaterial);
      
      setMaterials((prev) => [newMaterial, ...prev]);
      resetForm();
      setSuccessMsg('Successfully hosted on Study Hub Cloud.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Cloud deployment failed. Check internet connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDriveLink('');
    setLocalFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    setSuccessMsg('Broadcast deployed to all Malawian learners.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const deleteAnnouncement = async (id: string) => {
    if (window.confirm("Remove this broadcast from student feeds?")) {
      await storage.deleteAnnouncement(id);
      setAnnouncements(announcements.filter(a => a.id !== id));
    }
  };

  const deleteItem = async (id: string) => {
    if (window.confirm('This will permanently delete the resource metadata. Files in storage remain but won\'t be accessible.')) {
      await storage.deleteMaterial(id);
      setMaterials(materials.filter(m => m.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-x-auto no-scrollbar">
          {(['local-upload', 'content', 'exams', 'users', 'announcements'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => { setActiveAdminTab(tab); resetForm(); }}
              className={`px-8 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeAdminTab === tab ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
            >
              {tab === 'announcements' ? 'Broadcasts' : tab === 'content' ? 'Drive Links' : tab === 'local-upload' ? 'Cloud Hub' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {successMsg && (
        <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center gap-4 animate-in slide-in-from-top-2 duration-300">
          <span className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm text-lg">✨</span>
          {successMsg}
        </div>
      )}

      {(activeAdminTab === 'content' || activeAdminTab === 'local-upload') && (
        <div className="grid lg:grid-cols-2 gap-8 pb-20 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl h-fit relative overflow-hidden">
            <div className="flex items-center gap-4 mb-10">
               <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg border border-emerald-400/20">
                  <span className="text-white font-black text-xl">{activeAdminTab === 'local-upload' ? '☁️' : '🔗'}</span>
               </div>
               <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {activeAdminTab === 'local-upload' ? 'Supabase Upload' : 'Post Drive Resource'}
                  </h2>
                  <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">
                    Permanent Cloud Storage Access
                  </p>
               </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setShowConfirmModal(true); }} className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Level</label>
                  <select value={level} disabled={isUploading} onChange={(e) => setLevel(e.target.value as EducationLevel)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white appearance-none">
                    <option value={EducationLevel.PRIMARY}>Primary</option>
                    <option value={EducationLevel.SECONDARY}>Secondary</option>
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
                  <select value={subject} disabled={isUploading} onChange={(e) => setSubject(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white appearance-none">
                    {availableSubjects.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Asset Title</label>
                <input type="text" required disabled={isUploading} placeholder="e.g. Standard 7 Social Studies Term 2" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-5 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white" />
              </div>

              {activeAdminTab === 'content' ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Drive Link</label>
                  <input type="url" required disabled={isUploading} placeholder="https://drive.google.com/file/d/..." value={driveLink} onChange={(e) => setDriveLink(e.target.value)} className="w-full p-5 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 dark:bg-slate-900 font-bold text-slate-800 dark:text-white" />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select PDF</label>
                  <div 
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={`p-10 border-2 border-dashed rounded-[2rem] text-center cursor-pointer transition-all ${localFile ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-emerald-300'} ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input type="file" accept=".pdf" className="hidden" ref={fileInputRef} onChange={handleFileSelect} disabled={isUploading} />
                    <div className="text-4xl mb-3">{localFile ? '📄' : '📤'}</div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {localFile ? localFile.name : 'Choose file to upload to Cloud Hub'}
                    </p>
                  </div>
                </div>
              )}

              {error && <p className="text-[10px] text-red-500 font-black uppercase tracking-widest px-2 leading-relaxed animate-shake">{error}</p>}

              <button 
                type="submit" 
                disabled={isUploading || (activeAdminTab === 'content' ? !driveLink : !localFile) || !title} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-xs disabled:opacity-50 active:scale-95 shadow-emerald-100 dark:shadow-none mt-4 flex items-center justify-center gap-3"
              >
                {isUploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Uploading...</span>
                  </>
                ) : 'Deploy to Cloud Hub'}
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col h-fit">
            <h2 className="text-2xl font-black mb-8 text-slate-900 dark:text-white flex items-center gap-3">
               <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
               Cloud Registry ({materials.length})
            </h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {materials.map(m => (
                <div key={m.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] flex items-center justify-between border border-transparent hover:border-emerald-500/20 transition-all group">
                  <div className="truncate pr-4 min-w-0">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm">{m.title}</h4>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">{m.subject} • {m.grade} • {m.level}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <button onClick={() => setViewingMaterial(m)} className="p-3 bg-white dark:bg-slate-800 text-emerald-500 hover:text-emerald-600 rounded-xl shadow-sm transition-all hover:scale-105">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    <button onClick={() => deleteItem(m.id)} className="p-3 bg-white dark:bg-slate-800 text-red-300 hover:text-red-500 rounded-xl shadow-sm transition-all hover:scale-105">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {activeAdminTab === 'exams' && (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <div className="bg-emerald-800 p-10 md:p-16 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden">
             <div className="relative z-10 space-y-4 text-center md:text-left">
                <h2 className="text-4xl font-black tracking-tight leading-none">AI Exam Creator</h2>
                <p className="text-emerald-200 font-medium max-w-md">Instantly formulate digital exams from curriculum content.</p>
                <button onClick={() => onNavigate('admin-exam-form')} className="bg-white text-emerald-800 font-black px-10 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all uppercase tracking-widest text-[11px]">Start Creator</button>
             </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'announcements' && (
        <div className="grid lg:grid-cols-2 gap-8 pb-20 animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl h-fit">
            <h2 className="text-2xl font-black mb-8 text-slate-900 dark:text-white flex items-center gap-3">
              <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
              Create Broadcast
            </h2>
            <form onSubmit={handlePostAnnouncement} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Title</label>
                <input type="text" required value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold outline-none focus:ring-2 focus:ring-orange-500 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Message</label>
                <textarea required value={annContent} onChange={(e) => setAnnContent(e.target.value)} className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium outline-none focus:ring-2 focus:ring-orange-500 h-40 resize-none transition-all" />
              </div>
              <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-5 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-xs active:scale-95">Send Broadcast</button>
            </form>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-xl flex flex-col h-fit">
            <h2 className="text-2xl font-black mb-8 text-slate-900 dark:text-white flex items-center gap-3">
              <span className="w-2 h-8 bg-orange-500 rounded-full"></span>
              Sent Announcements ({announcements.length})
            </h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {announcements.map(a => (
                <div key={a.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-transparent hover:border-orange-200/30 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-black text-slate-800 dark:text-white mb-1">{a.title}</h4>
                    <button onClick={() => deleteAnnouncement(a.id)} className="text-red-300 hover:text-red-500 p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeAdminTab === 'users' && (
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 border border-slate-100 dark:border-slate-700 shadow-2xl animate-in fade-in duration-500 pb-20">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-8">Registered Hub Members</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map(u => (
              <div key={u.id} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2.5rem] border border-transparent hover:border-emerald-500/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white font-black text-xs">{(u.name || '?')[0].toUpperCase()}</div>
                  <div className="min-w-0">
                    <h4 className="font-black text-slate-900 dark:text-white truncate">{u.name || 'User'}</h4>
                    <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-md w-full text-center space-y-8 animate-in zoom-in duration-200 shadow-2xl">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-4xl mx-auto border-2 border-emerald-100">
               {activeAdminTab === 'local-upload' ? '☁️' : '🚀'}
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Authorize Cloud Sync?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">This resource will be instantly mirrored to all Malawian students in the {grade} {level} hub.</p>
            </div>
            <div className="space-y-4">
              <button onClick={handlePublish} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[10px] active:scale-95 transition-all">Sync to Students</button>
              <button onClick={() => setShowConfirmModal(false)} className="w-full py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black rounded-2xl uppercase tracking-widest text-[10px] transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {viewingMaterial && (
        <PdfViewer material={viewingMaterial} userId={user.id} onClose={() => setViewingMaterial(null)} onUpdateStatus={() => {}} />
      )}
    </div>
  );
};
