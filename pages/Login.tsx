
import React, { useState } from 'react';
import { User } from '../types';
import { storage } from '../services/storage';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Strict 9 digits validation for Malawian numbers after prefix
    if (phone.length !== 9) {
      setError('Phone number must be exactly 9 digits (e.g., 999123456).');
      return;
    }

    const fullPhone = `+265${phone}`;
    const users = storage.getUsers();
    const existingUser = users.find(u => u.phoneNumber === fullPhone);

    if (isRegistering) {
      if (existingUser) {
        setError('An account with this phone number already exists.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!acceptedTerms) {
        setError('You must agree to the Terms and Conditions to join.');
        return;
      }

      const adminPhoneNumber = '999326377';
      const isAdmin = phone === adminPhoneNumber;

      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        phoneNumber: fullPhone,
        password,
        appRole: isAdmin ? 'admin' : 'user',
        name: isAdmin ? 'System Admin' : '',
        dateJoined: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        downloadedIds: [],
        favoriteIds: [],
        isProfileComplete: false,
        isPublic: false,
        termsAccepted: true
      };

      storage.saveUser(newUser);
      onLogin(newUser);
    } else {
      if (!existingUser) {
        setError('Account not found. Please register first.');
        return;
      }
      if (existingUser.password !== password) {
        setError('Incorrect password.');
        return;
      }

      const updatedUser = { ...existingUser, lastLogin: new Date().toISOString() };
      storage.updateUser(updatedUser);
      onLogin(updatedUser);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setAcceptedTerms(false);
  };

  return (
    <div className="min-h-screen bg-emerald-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in fade-in duration-500">
        <div className="text-center">
          <h1 className="text-4xl font-black text-emerald-800 tracking-tight">Study Hub</h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">Your gateway to Malawian Education</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 animate-in shake duration-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Phone Number</label>
            <div className="flex items-center">
              <span className="bg-gray-100 border border-r-0 border-gray-200 px-4 py-4 rounded-l-2xl font-black text-gray-600 text-sm">
                +265
              </span>
              <input
                type="tel"
                required
                className="w-full px-4 py-4 rounded-r-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                placeholder="999 123 456"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
              />
            </div>
            <p className="text-[9px] text-gray-400 mt-1 px-1 font-bold">Max 9 digits after +265</p>
          </div>

          <div className="relative">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold pr-16"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[38px] text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {isRegistering && (
            <div className="relative animate-in slide-in-from-top-2 duration-300">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Re-enter Password</label>
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold pr-16"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-[38px] text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-800 transition-colors"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          )}

          {isRegistering && (
            <div className="space-y-2 pt-2 animate-in slide-in-from-top-2 duration-400">
              <p className="text-[11px] text-gray-500 font-bold px-1 leading-relaxed">
                By joining you agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-emerald-700 underline hover:text-emerald-800">Terms and Conditions</button>
              </p>
              <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <input 
                  type="checkbox" 
                  id="agreeTermsLogin" 
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer border-gray-300"
                />
                <label htmlFor="agreeTermsLogin" className="text-xs text-emerald-900 font-black uppercase tracking-widest cursor-pointer">
                  I Accept
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-[0.98] text-sm uppercase tracking-widest mt-4 shadow-emerald-100"
          >
            {isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={toggleMode}
            className="text-emerald-700 font-black text-xs uppercase tracking-widest hover:underline"
          >
            {isRegistering ? 'Already have an account? Login' : 'New here? Join Study Hub'}
          </button>
        </div>

        {!isRegistering && (
          <div className="pt-6 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Bridging Education in Malawi</p>
          </div>
        )}
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-white/20">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-emerald-50/30">
              <h3 className="text-2xl font-black text-emerald-900 tracking-tight">Terms & Conditions</h3>
              <button onClick={() => setShowTermsModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-10 overflow-y-auto text-gray-600 leading-relaxed text-sm space-y-6 custom-scrollbar font-medium">
              <div className="space-y-4">
                <p className="font-black text-lg text-gray-800">Study Hub Malawi – Terms and Conditions</p>
                <p>Welcome to Study Hub Malawi. By accessing or using this app, you agree to the following Terms and Conditions. Please read them carefully.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-gray-800">1. About Study Hub Malawi</p>
                <p>Study Hub Malawi is an educational mobile application that allows users to read and download notes, books, and past examination papers for learning and revision purposes only.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-gray-800">2. Acceptance of Terms</p>
                <p>By creating an account or using this app, you confirm that you have read and understood these Terms and Conditions and agree to comply with them. If you do not agree, please do not use the app.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-gray-800">3. User Eligibility</p>
                <p>The app is intended for students, teachers, and learners. Users under the age of 18 may use the app with parent or guardian consent.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-gray-800">4. User Account Responsibilities</p>
                <p>You agree to provide accurate information when creating an account, keep your login credentials confidential, and be responsible for all activities carried out under your account. Study Hub Malawi is not responsible for losses caused by unauthorized access to your account.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-gray-800">5. Use of Content</p>
                <p>All notes, books, and past papers are provided for personal educational and revision use only. You must not sell, reproduce, distribute, share, or modify any content without permission. All content is protected by copyright and intellectual property laws.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-gray-800">6. Downloads</p>
                <p>Downloaded materials are intended for offline reading and personal revision only. Some content may have download limits. Study Hub Malawi reserves the right to remove, replace, or update content at any time.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-gray-800">7. Prohibited Activities</p>
                <p>You must NOT attempt to hack, disrupt, or damage the app, use the app for commercial or business purposes, or share or distribute copyrighted materials illegally. Violation of these rules may lead to account suspension or termination.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-gray-800">8. Content Accuracy & Exam Disclaimer</p>
                <p>While effort is made to ensure accuracy, Study Hub Malawi does not guarantee that all notes, books, or past papers are complete or error-free. Past papers are provided for revision practice only and may not reflect current examination formats. Users should always consult teachers and official examination bodies.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-gray-800">9. Privacy</p>
                <p>Your personal information is handled according to our Privacy Policy. We do not sell or misuse user data.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-gray-800">10. Governing Law</p>
                <p>These Terms are governed by the laws of the Republic of Malawi.</p>
              </div>

              <p className="pt-4 border-t border-gray-100 font-black text-emerald-800">By creating an account on Study Hub Malawi, you agree to these Terms and Conditions.</p>
            </div>
            <div className="p-8 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={() => { setAcceptedTerms(true); setShowTermsModal(false); }} 
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-700 transition-all uppercase tracking-widest text-sm"
              >
                Agree & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
