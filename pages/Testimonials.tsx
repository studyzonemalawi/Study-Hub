
import React, { useState, useEffect } from 'react';
import { User, Testimonial } from '../types';
import { storage } from '../services/storage';

interface TestimonialsProps {
  user: User;
}

export const Testimonials: React.FC<TestimonialsProps> = ({ user }) => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [newContent, setNewContent] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setTestimonials(storage.getTestimonials());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const newTestimonial: Testimonial = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user.id,
      userName: user.name || 'Anonymous Learner',
      userProfilePic: user.profilePic || '',
      userRole: user.accountRole || 'Member',
      content: newContent,
      rating: rating,
      timestamp: new Date().toISOString()
    };

    setTimeout(() => {
      storage.saveTestimonial(newTestimonial);
      setTestimonials([newTestimonial, ...testimonials]);
      setNewContent('');
      setRating(5);
      setIsSubmitting(false);
      setShowForm(false);
    }, 800);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-800">Learner Testimonials</h2>
          <p className="text-gray-500">Real stories from the Malawian student community.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-emerald-100 transition-all uppercase tracking-widest text-xs flex items-center gap-3"
          >
            <span className="text-xl">✍️</span>
            Share My Story
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-gray-100 shadow-2xl animate-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-emerald-800 uppercase tracking-widest text-xs">How has Study Hub helped you?</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-red-500 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
               <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Your Rating:</p>
               <div className="flex gap-2">
                 {[1, 2, 3, 4, 5].map(star => (
                   <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-all ${star <= rating ? 'scale-110 grayscale-0' : 'grayscale opacity-30 scale-100'}`}
                   >
                     ⭐
                   </button>
                 ))}
               </div>
            </div>

            <textarea 
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              required
              placeholder="e.g. This platform helped me score a distinction in MSCE Physics! The notes are so clear..."
              className="w-full p-6 rounded-3xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none h-40 resize-none font-medium text-gray-700 transition-all"
            />

            <button 
              type="submit"
              disabled={isSubmitting || !newContent.trim()}
              className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-100 uppercase tracking-widest text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Publishing Story...</span>
                </>
              ) : (
                <span>Post Testimonial</span>
              )}
            </button>
          </form>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {testimonials.length === 0 ? (
          <div className="md:col-span-2 py-32 text-center bg-white rounded-[3rem] border border-dashed border-gray-200">
             <div className="text-6xl mb-6 grayscale opacity-20">📢</div>
             <h3 className="text-2xl font-black text-gray-700">No stories shared yet</h3>
             <p className="text-gray-400 mt-2 font-medium">Be the first to inspire other students in Malawi!</p>
          </div>
        ) : (
          testimonials.map(t => (
            <div key={t.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-50 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between border-b-4 border-b-emerald-600">
              <div className="space-y-6">
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span key={i} className="text-sm">⭐</span>
                  ))}
                </div>
                <p className="text-gray-700 font-medium leading-relaxed italic text-lg">
                  "{t.content}"
                </p>
              </div>

              <div className="mt-8 flex items-center gap-4 border-t border-gray-50 pt-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 overflow-hidden flex-none">
                  <img src={t.userProfilePic || 'https://via.placeholder.com/150'} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-gray-800 text-sm truncate">{t.userName}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">{t.userRole}</span>
                    <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                    <span className="text-[9px] font-bold text-gray-400">{new Date(t.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-emerald-800 text-white p-12 rounded-[3rem] text-center space-y-4 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-3xl font-black">Together we learn.</h3>
          <p className="text-emerald-100 max-w-lg mx-auto opacity-80">Join thousands of students across Malawi using Study Hub to achieve academic excellence.</p>
        </div>
        <div className="absolute top-0 left-0 p-8 opacity-5 text-9xl">✨</div>
      </div>
    </div>
  );
};
