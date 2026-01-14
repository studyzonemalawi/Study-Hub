
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { storage } from '../services/storage';
import { supabase } from '../services/supabase';

interface LoginProps {
  onLogin: (user: User) => void;
}

const REMEMBER_EMAIL_KEY = 'study_hub_remember_email';
const REMEMBER_PASS_KEY = 'study_hub_remember_password';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ADMIN_EMAIL = 'studyhubmalawi@gmail.com';

  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    const savedPass = localStorage.getItem(REMEMBER_PASS_KEY);
    if (savedEmail) setEmail(savedEmail);
    if (savedPass) setPassword(savedPass);
  }, []);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const mapSupabaseUserToAppUser = (sbUser: any): User => {
    const existingUsers = storage.getUsers();
    const existing = existingUsers.find(u => u.email === sbUser.email);
    
    if (existing) {
      return {
        ...existing,
        lastLogin: new Date().toISOString(),
        appRole: sbUser.email === ADMIN_EMAIL ? 'admin' : existing.appRole
      };
    }

    return {
      id: sbUser.id,
      email: sbUser.email!,
      authProvider: 'email',
      appRole: sbUser.email === ADMIN_EMAIL ? 'admin' : 'user',
      name: sbUser.user_metadata?.full_name || '',
      dateJoined: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      downloadedIds: [],
      favoriteIds: [],
      isProfileComplete: false,
      isPublic: false,
      termsAccepted: true
    };
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setSuccessMsg('A password reset link has been sent to your email.');
      setIsResettingPassword(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (isResettingPassword) {
      handleResetPassword(e);
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      if (isRegistering) {
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }
        if (!acceptedTerms) {
          setError('You must agree to the Terms and Conditions to join.');
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        if (data.user) {
          if (rememberMe) {
            localStorage.setItem(REMEMBER_EMAIL_KEY, email);
            localStorage.setItem(REMEMBER_PASS_KEY, password);
          }
          const appUser = mapSupabaseUserToAppUser(data.user);
          storage.saveUser(appUser);
          onLogin(appUser);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (data.user) {
          if (rememberMe) {
            localStorage.setItem(REMEMBER_EMAIL_KEY, email);
            localStorage.setItem(REMEMBER_PASS_KEY, password);
          } else {
            localStorage.removeItem(REMEMBER_EMAIL_KEY);
            localStorage.removeItem(REMEMBER_PASS_KEY);
          }
          const appUser = mapSupabaseUserToAppUser(data.user);
          storage.saveUser(appUser);
          onLogin(appUser);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setIsResettingPassword(false);
    setError('');
    setSuccessMsg('');
    if (!localStorage.getItem(REMEMBER_PASS_KEY)) setPassword('');
    setConfirmPassword('');
    setAcceptedTerms(false);
  };

  const toggleResetMode = () => {
    setIsResettingPassword(!isResettingPassword);
    setIsRegistering(false);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen bg-emerald-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl p-8 md:p-10 space-y-6 animate-in fade-in zoom-in duration-500 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-emerald-800 text-[10px] uppercase tracking-[0.2em] animate-pulse">Accessing Hub...</p>
            </div>
          </div>
        )}

        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl shadow-emerald-100 mb-4">
            <span className="text-2xl font-black">SH</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Welcome Back</h1>
          <p className="text-slate-500 font-medium">Gateway to Malawian Excellence</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-5 rounded-2xl text-xs font-black uppercase tracking-widest border border-red-100 animate-shake flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-5 rounded-2xl text-xs font-black uppercase tracking-widest border border-emerald-100 animate-in fade-in flex items-center gap-3">
            <span className="text-lg">✓</span>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-900"
              placeholder="e.g. kondwani@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {!isResettingPassword && (
            <div className="space-y-2 relative">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Secure Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold pr-16 text-slate-900"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-800 transition-colors"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {!isResettingPassword && (
            <div className="flex items-center justify-between px-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-200 group-hover:border-emerald-300'}`}>
                    {rememberMe && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest group-hover:text-slate-600 transition-colors">Remember Me</span>
              </label>
              {!isRegistering && (
                <button
                  type="button"
                  onClick={toggleResetMode}
                  className="text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-800 transition-colors"
                >
                  Forgot?
                </button>
              )}
            </div>
          )}

          {isRegistering && (
            <div className="space-y-2 relative animate-in slide-in-from-top-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold pr-16 text-slate-900"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-800 transition-colors"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {isRegistering && (
            <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
              <p className="text-[10px] text-slate-400 font-bold px-2 leading-relaxed uppercase tracking-widest">
                By joining you agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-emerald-600 underline hover:text-emerald-800">Terms</button>
              </p>
              <label className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer group transition-all hover:bg-emerald-50/50">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-6 h-6 rounded-xl border-2 transition-all flex items-center justify-center ${acceptedTerms ? 'bg-emerald-600 border-emerald-600 shadow-lg' : 'bg-white border-slate-200 group-hover:border-emerald-300'}`}>
                    {acceptedTerms && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                </div>
                <span className="text-xs text-slate-900 font-black uppercase tracking-widest">I Accept Terms</span>
              </label>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-[0.98] text-[11px] uppercase tracking-[0.2em] mt-6 shadow-emerald-100"
          >
            {isResettingPassword ? 'Send Link' : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>

          {isResettingPassword && (
            <div className="text-center pt-2">
              <button
                onClick={toggleResetMode}
                type="button"
                className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}
        </form>

        {!isResettingPassword && (
          <div className="text-center pt-4">
            <button
              onClick={toggleMode}
              type="button"
              className="text-emerald-700 font-black text-[10px] uppercase tracking-[0.15em] hover:underline"
            >
              {isRegistering ? 'Already a member? Login' : 'New here? Join the hub'}
            </button>
          </div>
        )}

        <div className="pt-6 border-t border-slate-50 text-center">
          <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.3em]">United for Malawian Education</p>
        </div>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in duration-300 border border-white/20">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Terms & Conditions</h3>
              <button onClick={() => setShowTermsModal(false)} className="text-slate-400 hover:text-red-500 transition-colors p-2">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-10 overflow-y-auto text-slate-600 leading-relaxed text-sm space-y-6 custom-scrollbar">
              <div className="space-y-2">
                <p className="font-black text-slate-900 uppercase text-xs tracking-widest">1. Mission</p>
                <p>Study Hub Malawi is an educational platform dedicated to improving academic outcomes through free access to digitized resources.</p>
              </div>
              <div className="space-y-2">
                <p className="font-black text-slate-900 uppercase text-xs tracking-widest">2. Content Use</p>
                <p>Materials provided are for personal educational use. Commercial redistribution or selling of resources found on Study Hub is strictly prohibited.</p>
              </div>
              <div className="space-y-2">
                <p className="font-black text-slate-900 uppercase text-xs tracking-widest">3. User Conduct</p>
                <p>Users must remain respectful in community forums. Bullying, harassment, or sharing of non-educational content will result in immediate banning.</p>
              </div>
              <div className="space-y-2">
                <p className="font-black text-slate-900 uppercase text-xs tracking-widest">4. Privacy</p>
                <p>We do not sell your data. We use basic analytics to improve library content and curriculum alignment.</p>
              </div>
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button onClick={() => setShowTermsModal(false)} className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest text-[10px]">Close</button>
              <button onClick={() => { setAcceptedTerms(true); setShowTermsModal(false); }} className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-700 uppercase tracking-widest text-[10px]">I Understand & Agree</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
