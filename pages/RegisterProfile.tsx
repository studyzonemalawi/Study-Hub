
import React, { useState } from 'react';
import { User, AccountRole, EducationLevel, MALAWI_DISTRICTS, JOIN_REASONS, PRIMARY_GRADES, SECONDARY_GRADES, OTHER_GRADE_OPTIONS, Grade } from '../types';
import { storage } from '../services/storage';

interface RegisterProfileProps {
  user: User;
  onComplete: (user: User) => void;
}

export const RegisterProfile: React.FC<RegisterProfileProps> = ({ user, onComplete }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState<string>('');
  const [accountRole, setAccountRole] = useState<AccountRole | ''>('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>('');
  const [district, setDistrict] = useState('');
  const [reason, setReason] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [currentGrade, setCurrentGrade] = useState<Grade | ''>('');
  const [bio, setBio] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const getWordCount = (text: string) => text.trim().split(/\s+/).filter(w => w.length > 0).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !age || !accountRole || !educationLevel || !district || !reason || !currentGrade || !bio) {
      setError('All fields are mandatory.');
      return;
    }

    if (getWordCount(bio) > 100) {
      setError('Bio must be less than 100 words.');
      return;
    }

    if (!termsAccepted) {
      setError('You must accept the Terms and Conditions.');
      return;
    }

    setIsSubmitting(true);

    const finalUpdatedUser: User = {
        ...user,
        name,
        age: parseInt(age),
        accountRole: accountRole as AccountRole,
        educationLevel: educationLevel as EducationLevel,
        district,
        reason,
        schoolName,
        currentGrade: currentGrade as Grade,
        bio,
        profilePic: 'initials',
        termsAccepted,
        isProfileComplete: true
      };

    setTimeout(() => {
      storage.updateUser(finalUpdatedUser);
      setIsSubmitting(false);
      setIsSaved(true);
      setTimeout(() => onComplete(finalUpdatedUser), 1000);
    }, 1200);
  };

  const availableGrades = educationLevel === EducationLevel.PRIMARY 
    ? [...PRIMARY_GRADES, ...OTHER_GRADE_OPTIONS] 
    : educationLevel === EducationLevel.SECONDARY 
      ? [...SECONDARY_GRADES, ...OTHER_GRADE_OPTIONS] 
      : [...OTHER_GRADE_OPTIONS];

  if (isSaved) {
    return (
      <div className="min-h-screen bg-emerald-700 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center space-y-6 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">
            ✓
          </div>
          <h2 className="text-3xl font-black text-emerald-800 tracking-tight">Success!</h2>
          <p className="text-gray-500 font-medium">Profile saved successfully. You are now ready to start your learning journey.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-4xl w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-emerald-100 flex flex-col md:flex-row">
        
        <div className="md:w-1/3 bg-emerald-800 p-10 text-white flex flex-col justify-between">
          <div>
            <h2 className="text-3xl font-black mb-4 tracking-tighter">FINALIZE HUB ACCESS</h2>
            <p className="text-emerald-100 opacity-80 leading-relaxed text-sm">Let's personalize your Study Hub experience. Your level choice will permanently filter the academic content for your specific needs.</p>
          </div>
          <div className="hidden md:block">
            <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Academic Promise</p>
              <p className="text-sm italic">"Education is the most powerful weapon which you can use to change the world."</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="md:w-2/3 p-10 space-y-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100">{error}</div>}
          
          <div className="flex flex-col items-center">
            <div 
              className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center overflow-hidden shadow-2xl border-4 border-white"
            >
              <span className="text-white font-black text-4xl tracking-tighter">
                {name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'SH'}
              </span>
            </div>
            <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest mt-4">Profile Badge Preview</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Full Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Kondwani Phiri" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Age</label>
              <input type="number" required value={age} onChange={(e) => setAge(e.target.value)} className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="18" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Education Level (Permanent)</label>
              <select required value={educationLevel} onChange={(e) => { 
                setEducationLevel(e.target.value as EducationLevel);
                setCurrentGrade(''); // Reset grade when level changes
              }} className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Select Level</option>
                <option value={EducationLevel.PRIMARY}>Primary (Standards 5-8)</option>
                <option value={EducationLevel.SECONDARY}>Secondary (Forms 1-4)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Current Grade/Form</label>
              <select required value={currentGrade} onChange={(e) => setCurrentGrade(e.target.value as Grade)} className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Select Grade</option>
                {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Account Role</label>
              <select required value={accountRole} onChange={(e) => setAccountRole(e.target.value as AccountRole)} className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Select Role</option>
                {Object.values(AccountRole).map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">District</label>
              <select required value={district} onChange={(e) => setDistrict(e.target.value)} className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Select District</option>
                {MALAWI_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Reason for Joining</label>
              <select required value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">Select Reason</option>
                {JOIN_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">About Me (Brief Bio)</label>
              <span className={`text-[10px] font-bold ${getWordCount(bio) > 100 ? 'text-red-500' : 'text-gray-400'}`}>
                {getWordCount(bio)}/100 words
              </span>
            </div>
            <textarea required value={bio} onChange={(e) => setBio(e.target.value)} className="w-full p-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none h-32 resize-none" placeholder="Tell us about your learning goals..." />
          </div>

          <div className="flex items-center space-x-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
            <input type="checkbox" id="terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="w-5 h-5 accent-emerald-600" />
            <label htmlFor="terms" className="text-sm text-gray-700">
              I accept the <button type="button" onClick={() => setShowTerms(true)} className="text-emerald-700 font-bold hover:underline">Terms and Conditions</button>
            </label>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-2xl transition-all disabled:opacity-50 text-lg uppercase tracking-widest">
            {isSubmitting ? 'Finalizing Profile...' : 'Complete & Enter Hub'}
          </button>
        </form>
      </div>

      {showTerms && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-gray-800">Terms & Conditions</h3>
              <button onClick={() => setShowTerms(false)} className="text-gray-400 hover:text-red-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-10 overflow-y-auto text-gray-600 leading-relaxed text-sm space-y-4">
              <p className="font-bold">Welcome to Study Hub Malawi.</p>
              <p>1. Study Hub Malawi is an educational platform for notes, books, and past papers revision.</p>
              <p>2. Acceptance: By creating an account, you confirm agreement to these terms.</p>
              <p>3. Eligibility: Intended for students, teachers, and learners. Minors need parental consent.</p>
              <p>4. Responsibilities: Maintain accurate info and confidential login.</p>
              <p>5. Use of Content: For personal educational use only. No selling or redistribution.</p>
              <p>6. Downloads: For offline reading only. Subject to update by Study Hub.</p>
              <p>7. Prohibited: No hacking, commercial use, or illegal redistribution.</p>
              <p>8. Disclaimer: While effort is made for accuracy, consult official exam bodies.</p>
              <p>9. Privacy: Handled according to our Policy. No data selling.</p>
              <p>10. Governing Law: Laws of the Republic of Malawi.</p>
            </div>
            <div className="p-8 bg-gray-50 border-t border-gray-100">
              <button onClick={() => { setTermsAccepted(true); setShowTerms(false); }} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-700">Agree & Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
