import React, { useState } from 'react';
import { User } from '../types';
import { storage } from '../services/storage';
import { auth } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';

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
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ADMIN_EMAIL = 'studyhubmalawi@gmail.com';

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const mapFirebaseUserToAppUser = (firebaseUser: any): User => {
    const existingUsers = storage.getUsers();
    const existing = existingUsers.find(u => u.email === firebaseUser.email);
    
    if (existing) {
      return {
        ...existing,
        lastLogin: new Date().toISOString(),
        appRole: firebaseUser.email === ADMIN_EMAIL ? 'admin' : existing.appRole
      };
    }

    return {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      authProvider: 'email',
      appRole: firebaseUser.email === ADMIN_EMAIL ? 'admin' : 'user',
      name: firebaseUser.displayName || '',
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
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('A password reset link has been sent to your email.');
      setIsResettingPassword(false);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
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

        const result = await createUserWithEmailAndPassword(auth, email, password);
        const appUser = mapFirebaseUserToAppUser(result.user);
        storage.saveUser(appUser);
        onLogin(appUser);
      } else {
        try {
          const result = await signInWithEmailAndPassword(auth, email, password);
          const appUser = mapFirebaseUserToAppUser(result.user);
          storage.saveUser(appUser);
          onLogin(appUser);
        } catch (authErr: any) {
          setError('Email or Password is incorrect');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('An error occurred during authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setIsResettingPassword(false);
    setError('');
    setSuccessMsg('');
    setPassword('');
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
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in fade-in duration-500 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-emerald-800 text-xs uppercase tracking-widest">Processing...</p>
            </div>
          </div>
        )}

        <div className="text-center">
          <h1 className="text-4xl font-black text-emerald-800 tracking-tight">Study Hub</h1>
          <p className="text-gray-500 mt-2 text-lg font-medium">Your gateway to Malawian Education</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 animate-shake">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-sm font-bold border border-emerald-100 animate-in fade-in">
            {successMsg}
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

          {!isResettingPassword && (
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
          )}

          {!isRegistering && !isResettingPassword && (
            <div className="text-right">
              <button
                type="button"
                onClick={toggleResetMode}
                className="text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-800 transition-colors"
              >
                Forgot Password?
              </button>
            </div>
          )}

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
            {isResettingPassword ? 'Send Reset Link' : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>

          {isResettingPassword && (
            <div className="text-center pt-2">
              <button
                onClick={toggleResetMode}
                type="button"
                className="text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-600 transition-colors"
              >
                Back to Login
              </button>
            </div>
          )}
        </form>

        {!isResettingPassword && (
          <div className="text-center pt-2">
            <button
              onClick={toggleMode}
              type="button"
              className="text-emerald-700 font-black text-xs uppercase tracking-widest hover:underline"
            >
              {isRegistering ? 'Already have an account? Login' : 'New here? Join Study Hub'}
            </button>
          </div>
        )}

        <div className="pt-6 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Bridging Education in Malawi</p>
        </div>
      </div>

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-2xl font-black text-gray-800">Terms & Conditions</h3>
              <button onClick={() => setShowTermsModal(false)} className="text-gray-400 hover:text-red-500">
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
              <button onClick={() => { setAcceptedTerms(true); setShowTermsModal(false); }} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-emerald-700">Agree & Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};