import React, { useState } from 'react';
import { User, MALAWI_DISTRICTS, JOIN_REASONS, PRIMARY_GRADES, SECONDARY_GRADES, OTHER_GRADE_OPTIONS, Grade, AccountRole } from '../types';
import { storage } from '../services/storage';

interface SettingsProps {
  user: User;
  onUpdate: (user: User) => void;
  onNavigate: (tab: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onUpdate, onNavigate }) => {
  const [formData, setFormData] = useState<Partial<User>>({
    name: user.name,
    age: user.age,
    accountRole: user.accountRole,
    district: user.district,
    schoolName: user.schoolName,
    currentGrade: user.currentGrade,
    reason: user.reason,
    bio: user.bio || '',
    isPublic: user.isPublic || false
  });

  const [password, setPassword] = useState(user.password || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const updatedUser: User = {
      ...user,
      ...formData,
      password: newPassword || password
    };

    setTimeout(() => {
      storage.updateUser(updatedUser);
      onUpdate(updatedUser);
      setIsSaving(false);
      setNewPassword('');
      setMessage({ type: 'success', text: 'Profile saved successfully' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 600);
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const allGrades = [...PRIMARY_GRADES, ...SECONDARY_GRADES, ...OTHER_GRADE_OPTIONS];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-black text-gray-800">Account Settings</h2>
          <p className="text-gray-500">Manage your profile, security, and privacy.</p>
        </div>
        <button 
          onClick={() => onNavigate('home')}
          className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl transition-all flex items-center gap-2 group"
          title="Exit Settings"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Exit</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-24 bg-emerald-600"></div>
            <div className="relative z-10">
              <div className="w-24 h-24 rounded-full border-4 border-white bg-emerald-700 mx-auto mb-4 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                {getInitials(user.name)}
              </div>
              <h3 className="text-xl font-black text-gray-800">{user.name}</h3>
              <p className="text-sm text-emerald-600 font-bold">{user.phoneNumber}</p>
              <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap justify-center gap-2">
                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase tracking-widest">{user.accountRole}</span>
                <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-widest">{user.district}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl">
            <h4 className="font-black text-gray-800 mb-6 uppercase tracking-widest text-xs">Privacy Settings</h4>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div>
                <p className="font-bold text-sm text-gray-800">Public Profile</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Allow others to see your stats</p>
              </div>
              <button 
                onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                className={`w-12 h-6 rounded-full transition-colors relative ${formData.isPublic ? 'bg-emerald-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isPublic ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden">
            <div className="p-10 space-y-8">
              {message && (
                <div className={`p-4 rounded-2xl text-sm font-bold border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                  <span className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">✓</span>
                  {message.text}
                </div>
              )}

              <div className="space-y-6">
                <h4 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  Personal Information
                </h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Full Name</label>
                    <input type="text" className="w-full p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Age</label>
                    <input type="number" className="w-full p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none" value={formData.age} onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Account Role</label>
                    <select className="w-full p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none" value={formData.accountRole} onChange={(e) => setFormData({ ...formData, accountRole: e.target.value as AccountRole })}>
                      {Object.values(AccountRole).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">District</label>
                    <select className="w-full p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none" value={formData.district} onChange={(e) => setFormData({ ...formData, district: e.target.value })}>
                      {MALAWI_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-gray-50">
                <h4 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                  Current Studies
                </h4>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Current Grade/Form</label>
                    <select 
                      className="w-full p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none" 
                      value={formData.currentGrade} 
                      onChange={(e) => setFormData({ ...formData, currentGrade: e.target.value as Grade })}
                    >
                      {allGrades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">School Name</label>
                    <input type="text" className="w-full p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none" value={formData.schoolName} onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t border-gray-50">
                <h4 className="text-lg font-black text-gray-800 flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                  Security
                </h4>
                <div className="relative space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Change Password</label>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full p-4 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-emerald-500 outline-none pr-20"
                    placeholder="Enter new password (leave blank to keep current)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[38px] text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-800"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="order-2 sm:order-1 px-8 py-4 text-gray-500 font-black uppercase tracking-widest text-sm hover:text-gray-800 transition-colors"
              >
                Discard & Exit
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="order-1 sm:order-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-10 py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50 uppercase tracking-widest text-sm flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : null}
                {isSaving ? 'Processing...' : 'Save All Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};