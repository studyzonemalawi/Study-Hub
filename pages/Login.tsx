
import React, { useState } from 'react';
import { User } from '../types';
import { storage } from '../services/storage';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    // Simulate Google Auth Flow
    setTimeout(() => {
      const googleUser: User = {
        id: 'google_' + Math.random().toString(36).substr(2, 9),
        email: 'student@gmail.com',
        authProvider: 'google',
        appRole: 'user',
        name: 'Google Learner',
        dateJoined: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        downloadedIds: [],
        favoriteIds: [],
        isProfileComplete: false,
        isPublic: false,
        termsAccepted: true
      };

      // Check if user already exists with this email
      const users = storage.getUsers();
      const existingUser = users.find(u => u.email === googleUser.email);
      
      if (existingUser) {
        const updated = { ...existingUser, lastLogin: new Date().toISOString() };
        storage.updateUser(updated);
        onLogin(updated);
      } else {
        storage.saveUser(googleUser);
        onLogin(googleUser);
      }
      setIsLoading(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    const users = storage.getUsers();
    const existingUser = users.find(u => u.email === email.toLowerCase());

    if (isRegistering) {
      if (existingUser) {
        setError('An account with this email already exists.');
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

      const adminEmail = 'studyhubmalawi@gmail.com';
      const isAdmin = email.toLowerCase() === adminEmail;

      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        email: email.toLowerCase(),
        password,
        authProvider: 'email',
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
      if (existingUser.authProvider !== 'email') {
        setError(`This account uses ${existingUser.authProvider} login. Please use that method.`);
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
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in fade-in duration-500 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-emerald-800 text-xs uppercase tracking-widest">Authenticating...</p>
            </div>
          </div>
        )}

        <div className="text-center">
          <h1 className="text-4xl font-black text-emerald-800 tracking-tight">Study Hub</h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">Your gateway to Malawian Education</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 hover:border-emerald-200 py-4 rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] group"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-sm font-black text-gray-700 uppercase tracking-widest group-hover:text-emerald-800 transition-colors">Continue with Google</span>
          </button>

          <div className="flex items-center gap-4 py-2">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Or use Email</span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 animate-in shake duration-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold bg-gray-50/50"
              placeholder="student@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold pr-16 bg-gray-50/50"
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
                className="w-full px-5 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold pr-16 bg-gray-50/50"
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
