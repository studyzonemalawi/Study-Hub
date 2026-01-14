
import React, { useState } from 'react';
import { User } from '../types';
import { auth, facebookProvider } from '../services/firebase';
import { dbService } from '../services/db';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup
} from 'firebase/auth';

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
  const [loading, setLoading] = useState(false);

  const handleFacebookLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, facebookProvider);
      const firebaseUser = result.user;
      
      // Check if user already exists in Firestore
      let userData = await dbService.getUser(firebaseUser.uid);
      
      if (!userData) {
        // Create new profile for Facebook user
        userData = {
          id: firebaseUser.uid,
          phoneNumber: firebaseUser.phoneNumber || 'Social User',
          appRole: 'user',
          name: firebaseUser.displayName || '',
          dateJoined: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          downloadedIds: [],
          favoriteIds: [],
          isProfileComplete: false,
          isPublic: false,
          termsAccepted: true
        };
        await dbService.saveUser(userData);
      } else {
        // Update last login
        await dbService.updateUser(userData.id, { lastLogin: new Date().toISOString() });
      }
      
      onLogin(userData);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with the same email but different login method.');
      } else {
        setError('Facebook login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (phone.length !== 9) {
      setError('Phone number must be 9 digits (e.g., 999123456).');
      setLoading(false);
      return;
    }

    const fullPhone = `+265${phone}`;
    const virtualEmail = `${fullPhone.replace('+', '')}@studyhub.mw`;

    try {
      if (isRegistering) {
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        if (!acceptedTerms) throw new Error('Agree to the Terms to join.');

        const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, password);
        const firebaseUser = userCredential.user;

        const newUser: User = {
          id: firebaseUser.uid,
          phoneNumber: fullPhone,
          appRole: phone === '999326377' ? 'admin' : 'user',
          name: phone === '999326377' ? 'System Admin' : '',
          dateJoined: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          downloadedIds: [],
          favoriteIds: [],
          isProfileComplete: false,
          isPublic: false,
          termsAccepted: true
        };

        await dbService.saveUser(newUser);
        onLogin(newUser);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, virtualEmail, password);
        const userData = await dbService.getUser(userCredential.user.uid);
        
        if (userData) {
          const updatedLastLogin = new Date().toISOString();
          await dbService.updateUser(userData.id, { lastLogin: updatedLastLogin });
          onLogin({ ...userData, lastLogin: updatedLastLogin });
        } else {
          setError('User profile not found in database.');
        }
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') setError('This phone number is already registered.');
      else if (err.code === 'auth/invalid-credential') setError('Incorrect phone number or password.');
      else setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
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
              className="absolute right-4 top-[38px] text-[10px] font-black uppercase text-emerald-600"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {isRegistering && (
            <div className="relative animate-in slide-in-from-top-2">
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
                className="absolute right-4 top-[38px] text-[10px] font-black uppercase text-emerald-600"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          )}

          {isRegistering && (
            <div className="space-y-2 pt-2">
              <p className="text-[11px] text-gray-500 font-bold px-1">
                By joining you agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-emerald-700 underline">Terms</button>
              </p>
              <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                <input 
                  type="checkbox" 
                  id="agreeTermsLogin" 
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="w-5 h-5 accent-emerald-600"
                />
                <label htmlFor="agreeTermsLogin" className="text-xs text-emerald-900 font-black uppercase tracking-widest">
                  I Accept
                </label>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all active:scale-[0.98] text-sm uppercase tracking-widest mt-4 disabled:opacity-70"
          >
            {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
            <span className="bg-white px-4 text-gray-400">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleFacebookLogin}
          disabled={loading}
          className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-70"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Facebook
        </button>

        <div className="text-center pt-2">
          <button
            onClick={toggleMode}
            className="text-emerald-700 font-black text-xs uppercase tracking-widest hover:underline"
          >
            {isRegistering ? 'Already have an account? Login' : 'New here? Join Study Hub'}
          </button>
        </div>
      </div>

      {/* Terms Modal (Simplied for context) */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-10 animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-gray-800 mb-4">Terms of Service</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-8">
              By using Study Hub Malawi, you agree to access materials for personal educational purposes only. 
              Redistribution or commercial use of these resources is strictly prohibited.
            </p>
            <button 
              onClick={() => { setAcceptedTerms(true); setShowTermsModal(false); }}
              className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs"
            >
              I Understand & Agree
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
