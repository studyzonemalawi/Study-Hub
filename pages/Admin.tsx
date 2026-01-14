
import React, { useState, useEffect } from 'react';
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
import { dbService } from '../services/db';

export const Admin: React.FC<{ onNavigate: (t: string) => void }> = ({ onNavigate }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'content' | 'users' | 'announcements'>('content');
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  const [level, setLevel] = useState<EducationLevel>(EducationLevel.PRIMARY);
  const [grade, setGrade] = useState<Grade>(PRIMARY_GRADES[0]);
  const [category, setCategory] = useState<Category>(Category.NOTES);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const [m, u] = await Promise.all([dbService.getMaterials(), dbService.getAllUsers()]);
      setMaterials(m);
      setUsers(u);
    };
    loadData();
    const unsubAnns = dbService.subscribeAnnouncements(setAnnouncements);
    return () => unsubAnns();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || isUploading) return;
    setIsUploading(true);
    setSuccessMsg(null);

    try {
      // Fix: Added missing fileName property which is required by StudyMaterial type
      const newMaterial = await dbService.uploadMaterial(file, {
        title, 
        level, 
        grade, 
        category, 
        subject: subject || availableSubjects[0],
        fileName: file.name
      });
      setMaterials([newMaterial, ...materials]);
      setTitle('');
      setFile(null);
      setSuccessMsg('Material published successfully!');
    } catch (err) {
      console.error(err);
      alert('Upload failed. Check your internet or project limits.');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteMaterial = async (m: StudyMaterial) => {
    if (window.confirm(`Delete ${m.title}?`)) {
      await dbService.deleteMaterial(m);
      setMaterials(materials.filter(item => item.id !== m.id));
    }
  };

  const availableGrades = level === EducationLevel.PRIMARY ? PRIMARY_GRADES : SECONDARY_GRADES;
  const availableSubjects = level === EducationLevel.PRIMARY ? PRIMARY_SUBJECTS : SECONDARY_SUBJECTS;

  return (
    <div className="space-y-6">
      <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 w-fit">
        {['content', 'users', 'announcements'].map((t: any) => (
          <button 
            key={t}
            onClick={() => setActiveAdminTab(t)}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminTab === t ? 'bg-emerald-600 text-white' : 'text-gray-400'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl text-sm font-bold border border-emerald-100 animate-in slide-in-from-top-2">
          {successMsg}
        </div>
      )}

      {activeAdminTab === 'content' && (
        <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-2xl">
            <h2 className="text-2xl font-black mb-6 text-gray-800">Post New Resource</h2>
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <select value={level} onChange={e => setLevel(e.target.value as any)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none">
                  {Object.values(EducationLevel).map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={grade} onChange={e => setGrade(e.target.value as any)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none">
                  {availableGrades.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none">
                  {[Category.NOTES, Category.BOOKS, Category.PAST_PAPERS].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none">
                  {availableSubjects.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <input type="text" required placeholder="Resource Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-4 rounded-2xl border bg-gray-50 outline-none" />
              <input type="file" required accept=".pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full p-4 rounded-2xl border border-dashed bg-gray-50" />
              
              <button type="submit" disabled={isUploading || !file} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm disabled:opacity-50">
                {isUploading ? 'Uploading to Firebase...' : 'Publish to Library'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl overflow-hidden h-fit">
            <h2 className="text-2xl font-black mb-6 text-gray-800">Library Assets ({materials.length})</h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {materials.map(m => (
                <div key={m.id} className="p-5 bg-gray-50 rounded-[1.5rem] flex items-center justify-between group">
                  <div className="truncate">
                    <h4 className="font-bold text-gray-800 text-sm truncate">{m.title}</h4>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{m.subject} • {m.grade}</p>
                  </div>
                  <button onClick={() => deleteMaterial(m)} className="p-3 text-red-300 hover:text-red-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
