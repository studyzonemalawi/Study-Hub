
import React, { useState } from 'react';
import { 
  User, 
  MALAWI_DISTRICTS, 
  JOIN_REASONS, 
  PRIMARY_GRADES, 
  SECONDARY_GRADES, 
  OTHER_GRADE_OPTIONS, 
  Grade, 
  AccountRole,
  EducationLevel
} from '../types';
import { storage } from '../services/storage';

interface SettingsProps {
  user: User;
  onUpdate: (user: User) => void;
  onNavigate: (tab: string) => void;
}

type SettingsSection = 'profile' | 'academic' | 'security' | 'privacy';

export const Settings: React.FC<SettingsProps> = ({ user, onUpdate, onNavigate }) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [formData, setFormData] = useState<Partial<User>>({
    name: user.name,
    age: user.age,
    accountRole: user.accountRole,
    district: user.district,
    schoolName: user.schoolName,
    currentGrade: user.currentGrade,
    reason: user.reason,
    bio: user.bio || '',
    isPublic: user.isPublic || false,
    email: user.email || '',
    educationLevel: user.educationLevel
  });

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
      password: newPassword || user.password
    } as User;

    setTimeout(() => {
      storage.updateUser(updatedUser);
      onUpdate(updatedUser);
      setIsSaving(false);
      setNewPassword('');
      setMessage({ type: 'success', text: 'Changes saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    }, 600);
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const availableGrades = formData.educationLevel === EducationLevel.PRIMARY 
    ? [...PRIMARY_GRADES, ...OTHER_GRADE_OPTIONS] 
    : formData.educationLevel === EducationLevel.SECONDARY 
      ? [...SECONDARY_GRADES, ...OTHER_GRADE_OPTIONS] 
      : [...OTHER_GRADE_OPTIONS];

  const sections = [
    { id: 'profile' as const, label: 'Profile Info', icon: '👤' },
    { id: 'academic' as const, label: 'Academic Details', icon: '📚' },
    { id: 'security' as const, label: 'Security', icon: '🔒' },
    { id: 'privacy' as const, label: 'Privacy', icon: '🛡️' }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Account Settings</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Configure your hub identity and security preferences.</p>
        </div>
        <button 
          onClick={() => onNavigate('home')}
          className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl transition-all flex items-center gap-2 group border border-slate-200 dark:border-slate-700 shadow-sm"
        >
          <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Exit</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
        <aside className="w-full lg:w-72 flex-none space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-4 shadow-xl">
            <nav className="flex lg:flex-col gap-2 overflow-x-auto no-scrollbar lg:overflow-visible">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => { setActiveSection(section.id); setMessage(null); }}
                  className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all whitespace-nowrap lg:whitespace-normal text-left ${
                    activeSection === section.id 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 dark:shadow-none' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <span className="text-xl">{section.icon}</span>
                  <span className="text-xs font-black uppercase tracking-widest">{section.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex-1 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col">
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="p-8 md:p-12 space-y-10 flex-1">
              {message && (
                <div className={`p-5 rounded-2xl text-xs font-black uppercase tracking-[0.1em] border flex items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300 ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                  <span className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm text-lg">
                    {message.type === 'success' ? '✓' : '⚠️'}
                  </span>
                  {message.text}
                </div>
              )}

              {activeSection === 'profile' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="border-b border-slate-50 dark:border-slate-700 pb-4">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">Profile Identity</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Manage how you appear in the Study Hub community.</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">Full Display Name</label>
                      <input 
                        type="text" 
                        required
                        className="w-full p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-slate-900 dark:text-white transition-all" 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">Age</label>
                      <input 
                        type="number" 
                        className="w-full p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-slate-900 dark:text-white transition-all" 
                        value={formData.age} 
                        onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">Account Role</label>
                      <select 
                        className="w-full p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-slate-900 dark:text-white transition-all appearance-none" 
                        value={formData.accountRole} 
                        onChange={(e) => setFormData({ ...formData, accountRole: e.target.value as AccountRole })}
                      >
                        {Object.values(AccountRole).map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">District</label>
                      <select 
                        className="w-full p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-slate-900 dark:text-white transition-all appearance-none" 
                        value={formData.district} 
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                      >
                        {MALAWI_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">Bio / Mission Statement</label>
                    <textarea 
                      className="w-full p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-medium text-slate-900 dark:text-white transition-all h-32 resize-none" 
                      placeholder="Tell the community about your learning goals..."
                      value={formData.bio} 
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                    />
                  </div>
                </div>
              )}

              {activeSection === 'academic' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="border-b border-slate-50 dark:border-slate-700 pb-4">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">Academic Status</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Your level choice is permanent to maintain your structured resource feed.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">Education Level (Fixed)</label>
                      <div className="w-full p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 font-bold text-slate-500 dark:text-slate-400">
                        {formData.educationLevel}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">Current Grade/Form</label>
                      <select 
                        className="w-full p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-slate-900 dark:text-white transition-all appearance-none" 
                        value={formData.currentGrade} 
                        onChange={(e) => setFormData({ ...formData, currentGrade: e.target.value as Grade })}
                      >
                        {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">School Name</label>
                      <input 
                        type="text" 
                        className="w-full p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-slate-900 dark:text-white transition-all" 
                        value={formData.schoolName} 
                        onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })} 
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'security' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="border-b border-slate-50 dark:border-slate-700 pb-4">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">Security & Login</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Keep your account safe with a strong, unique password.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 mb-2 block">Email Address (Account Identity)</label>
                      <p className="text-lg font-black text-slate-900 dark:text-white">{user.email}</p>
                    </div>

                    <div className="relative space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">New Hub Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          className="w-full p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-slate-900 dark:text-white transition-all pr-24"
                          placeholder="••••••••"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-800 tracking-widest"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold px-2">Leave blank to keep your current password.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'privacy' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div className="border-b border-slate-50 dark:border-slate-700 pb-4">
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white">Privacy Controls</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Decide how much of your learning data is shared.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 flex items-center justify-between group transition-all hover:border-emerald-500/30">
                      <div>
                        <h4 className="font-black text-slate-900 dark:text-white">Public Profile Participation</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">When enabled, other students can see your reading stats and accomplishments in the community.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, isPublic: !formData.isPublic })}
                        className={`w-14 h-8 rounded-full transition-all relative flex items-center px-1 shadow-inner ${formData.isPublic ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <div className={`w-6 h-6 bg-white rounded-full transition-all shadow-md transform ${formData.isPublic ? 'translate-x-6' : 'translate-x-0'}`}></div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 md:p-12 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 flex-none">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.3em] order-2 sm:order-1">Last Updated: {new Date(user.lastLogin).toLocaleDateString()}</p>
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black px-12 py-5 rounded-2xl shadow-xl shadow-emerald-100 dark:shadow-none transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 active:scale-[0.98] order-1 sm:order-2"
              >
                {isSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {isSaving ? 'Synchronizing...' : 'Save Hub Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
