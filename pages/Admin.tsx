
import React, { useState, useEffect } from 'react';
import { 
  EducationLevel, 
  Grade, 
  Category, 
  StudyMaterial, 
  User,
  Message,
  PRIMARY_GRADES, 
  SECONDARY_GRADES, 
  PRIMARY_SUBJECTS, 
  SECONDARY_SUBJECTS,
  OTHER_GRADE_OPTIONS
} from '../types';
import { storage } from '../services/storage';

const MAX_FILE_SIZE_MB = 25;

interface AdminProps {
  onNavigate: (tab: string) => void;
}

export const Admin: React.FC<AdminProps> = ({ onNavigate }) => {
  const [activeAdminTab, setActiveAdminTab] = useState<'content' | 'users'>('content');
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userMessages, setUserMessages] = useState<Message[]>([]);
  
  // Content Upload States
  const [level, setLevel] = useState<EducationLevel>(EducationLevel.PRIMARY);
  const [grade, setGrade] = useState<Grade>(PRIMARY_GRADES[0]);
  const [category, setCategory] = useState<Category>(Category.NOTES);
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    setMaterials(storage.getMaterials());
    setUsers(storage.getUsers());
  }, []);

  // Removed OTHER_GRADE_OPTIONS here as materials should follow curriculum grades
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

  const deleteItem = (id: string) => {
    if (window.confirm('Are you sure you want to delete this resource?')) {
      storage.deleteMaterial(id);
      setMaterials(materials.filter(m => m.id !== id));
    }
  };

  const deleteUser = (userId: string) => {
    if (window.confirm('WARNING: Are you sure you want to delete this user? All their messages will also be removed.')) {
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
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 w-fit">
          <button 
            onClick={() => setActiveAdminTab('content')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeAdminTab === 'content' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            Content
          </button>
          <button 
            onClick={() => setActiveAdminTab('users')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeAdminTab === 'users' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}
          >
            Users
          </button>
        </div>
        <button 
          onClick={() => onNavigate('home')}
          className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl transition-all flex items-center gap-2 group"
          title="Exit Admin Panel"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          <span className="text-[10px] font-black uppercase tracking-widest">Exit Admin</span>
        </button>
      </div>

      {activeAdminTab === 'content' ? (
        <div className="grid lg:grid-cols-2 gap-8 pb-20 animate-in fade-in duration-500">
          {/* Upload Form */}
          <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-2xl h-fit">
            <h2 className="text-2xl font-black mb-6 text-gray-800">Post New Resource</h2>
            
            {successMsg && (
              <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">✓</span>
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmitAttempt} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Level</label>
                  <select 
                    value={level} 
                    disabled={isUploading}
                    onChange={(e) => setLevel(e.target.value as EducationLevel)}
                    className="w-full p-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
                  >
                    {Object.values(EducationLevel).map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grade / Form</label>
                  <select 
                    value={grade} 
                    disabled={isUploading}
                    onChange={(e) => setGrade(e.target.value as Grade)}
                    className="w-full p-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
                  >
                    {availableGrades.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                  <select 
                    value={category} 
                    disabled={isUploading}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="w-full p-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
                  >
                    {availableCategories.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject</label>
                  <select 
                    value={subject} 
                    disabled={isUploading}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
                  >
                    {availableSubjects.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resource Title</label>
                <input 
                  type="text" required disabled={isUploading}
                  placeholder="e.g. 2023 Mathematics Final Exam Paper 1"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setSuccessMsg(null); }}
                  className="w-full p-4 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PDF Document (Max {MAX_FILE_SIZE_MB}MB)</label>
                <div className={`relative group ${isUploading ? 'opacity-50' : ''}`}>
                  <input id="file-upload" type="file" required accept=".pdf" onChange={handleFileChange}
                    className="w-full p-4 rounded-2xl border border-gray-100 border-dashed bg-gray-50 text-gray-500 file:hidden cursor-pointer hover:border-emerald-300 transition-colors" />
                </div>
                {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
                {file && !error && <p className="text-[10px] text-emerald-600 font-bold">✓ {file.name}</p>}
              </div>
              
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    <span>Processing...</span><span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-emerald-50 rounded-full h-3 overflow-hidden border border-emerald-100">
                    <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}
              
              <button type="submit" disabled={isUploading || !!error || !file}
                className={`w-full font-black py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-sm ${isUploading || !!error || !file ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-100'}`}>
                {isUploading ? 'Uploading...' : 'Publish to Library'}
              </button>
            </form>
          </div>

          {/* List */}
          <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-xl overflow-hidden flex flex-col">
            <h2 className="text-2xl font-black mb-6 text-gray-800">Library Assets ({materials.length})</h2>
            <div className="flex-1 overflow-y-auto space-y-4 max-h-[600px] pr-2 custom-scrollbar">
              {materials.length === 0 ? (
                <div className="py-20 text-center text-gray-400 italic">No resources uploaded yet.</div>
              ) : (
                materials.map(m => (
                  <div key={m.id} className="p-5 bg-gray-50 rounded-[1.5rem] flex items-center justify-between border border-transparent hover:border-emerald-100 transition-all group">
                    <div className="truncate pr-4">
                      <h4 className="font-bold text-gray-800 truncate text-sm">{m.title}</h4>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{m.subject} • {m.grade} • {m.category}</p>
                    </div>
                    <button onClick={() => deleteItem(m.id)} className="p-3 bg-white text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shadow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in duration-500 pb-20">
          {/* User List */}
          <div className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-2xl">
            <h2 className="text-xl font-black mb-6 text-gray-800 uppercase tracking-widest text-xs">Platform Users ({users.length})</h2>
            <div className="space-y-3 overflow-y-auto max-h-[70vh] custom-scrollbar pr-2">
              {users.map(u => (
                <div 
                  key={u.id} 
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center group ${selectedUser?.id === u.id ? 'bg-emerald-50 border-emerald-200 shadow-md' : 'bg-gray-50 border-transparent hover:border-emerald-200'}`}
                  onClick={() => viewUserHistory(u)}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 overflow-hidden flex-shrink-0">
                      <img src={u.profilePic || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="truncate">
                      <p className="font-bold text-gray-800 truncate text-sm">{u.name || 'Anonymous'}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{u.phoneNumber}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteUser(u.id); }}
                    className="p-2 text-red-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* User Detail/History */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-2xl h-fit">
            {!selectedUser ? (
              <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </div>
                <p className="text-sm font-bold uppercase tracking-widest opacity-40">Select user to view history</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-gray-100 pb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 overflow-hidden shadow-lg">
                      <img src={selectedUser.profilePic || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-800">{selectedUser.name}</h3>
                      <p className="text-emerald-600 font-black text-xs uppercase tracking-widest">{selectedUser.accountRole} • {selectedUser.phoneNumber}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteUser(selectedUser.id)} className="w-full sm:w-auto px-6 py-3 bg-red-50 text-red-600 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors border border-red-100">
                    Ban User
                  </button>
                </div>

                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Support Conversation History</h4>
                  <div className="space-y-4 bg-gray-50 p-6 rounded-[2rem] max-h-96 overflow-y-auto custom-scrollbar border border-gray-100">
                    {userMessages.length === 0 ? (
                      <div className="py-20 text-center text-gray-400 italic text-sm">No messages exchanged yet.</div>
                    ) : (
                      userMessages.map(m => (
                        <div key={m.id} className={`flex ${m.senderId === 'admin' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-4 rounded-2xl text-sm shadow-sm ${m.senderId === 'admin' ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'}`}>
                            {m.content}
                            <p className="text-[9px] mt-2 font-bold opacity-60 text-right">{new Date(m.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in duration-200 border border-white/20">
            <h3 className="text-2xl font-black text-gray-800 mb-2">Publish Resource?</h3>
            <p className="text-gray-500 font-medium mb-8 leading-relaxed">This will make "{title}" visible to all students in {level} {grade}.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowConfirmModal(false)} className="w-full py-4 rounded-2xl bg-gray-100 text-gray-600 font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-all">Cancel</button>
              <button onClick={startUpload} className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100">Publish Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
