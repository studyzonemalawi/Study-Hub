
import React, { useState, useEffect } from 'react';
import { User, Exam, ExamQuestion, ExamResult } from '../types';
import { storage } from '../services/storage';
import { aiService } from '../services/ai';

interface ExamCenterProps {
  user: User;
  onNavigate: (tab: string) => void;
}

export const ExamCenter: React.FC<ExamCenterProps> = ({ user, onNavigate }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    setExams(storage.getExams().filter(e => e.grade === user.currentGrade || user.appRole === 'admin'));
  }, [user]);

  const handleStartExam = (exam: Exam) => {
    setActiveExam(exam);
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setExamResult(null);
  };

  const handleAnswerSelect = (qId: string, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [qId]: answer }));
    // Auto-advance logic for speed (optional, keeping it manual for review but highlighting button)
  };

  const handleSubmitExam = async () => {
    if (!activeExam) return;
    setIsSubmitting(true);
    
    try {
      const evaluation = await aiService.evaluateExam(activeExam.questions, userAnswers);
      if (evaluation) {
        const result: ExamResult = {
          examId: activeExam.id,
          userId: user.id,
          score: evaluation.score,
          totalQuestions: activeExam.questions.length,
          answers: userAnswers,
          feedback: evaluation.feedback,
          completedAt: new Date().toISOString()
        };
        storage.saveExamResult(result);
        setExamResult(result);
      }
    } catch (err) {
      alert("Evaluation timed out. Our AI is busy, please try again in a moment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (examResult) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 animate-in zoom-in duration-500 pb-20 px-4 md:px-0">
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-12 text-center border border-slate-100 dark:border-slate-700 shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500"></div>
          
          <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner border-2 border-emerald-100 dark:border-emerald-800">
             {examResult.score >= 50 ? '🎉' : '📚'}
          </div>
          
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Performance Summary</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-[10px]">{activeExam?.title}</p>
          </div>
          
          <div className="flex justify-center items-baseline gap-2">
             <span className={`text-8xl font-black ${examResult.score >= 80 ? 'text-emerald-600' : examResult.score >= 50 ? 'text-blue-600' : 'text-orange-600'}`}>{examResult.score}</span>
             <span className="text-2xl font-black text-slate-300">/ 100</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
             <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Accuracy</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">
                  {Object.values(examResult.feedback).filter((f: any) => f.isCorrect).length} of {examResult.totalQuestions}
                </p>
             </div>
             <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Rank</p>
                <p className={`text-2xl font-black uppercase ${examResult.score >= 80 ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
                  {examResult.score >= 80 ? 'Distinction' : examResult.score >= 60 ? 'Credit' : examResult.score >= 50 ? 'Pass' : 'Retake'}
                </p>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
             <h3 className="text-2xl font-black text-slate-900 dark:text-white">Review & AI Insights</h3>
             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Learn from mistakes</span>
          </div>
          
          {activeExam?.questions.map((q, idx) => {
            const feed = examResult.feedback[q.id];
            return (
              <div key={q.id} className={`p-8 rounded-[2.5rem] border-2 bg-white dark:bg-slate-800 transition-all ${feed?.isCorrect ? 'border-emerald-500/10' : 'border-red-500/20 shadow-lg'}`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg text-slate-500">Question {idx + 1}</span>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${feed?.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {feed?.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                
                <h4 className="text-lg font-black text-slate-800 dark:text-white mb-6 leading-tight">{q.question}</h4>
                
                <div className="grid gap-3 mb-8">
                  <div className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between ${feed?.isCorrect ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-red-50/50 border-red-100 text-red-800'}`}>
                    <span>Your Choice: {examResult.answers[q.id] || 'Not Answered'}</span>
                    {feed?.isCorrect && <span>✓</span>}
                  </div>
                  {!feed?.isCorrect && (
                    <div className="p-4 rounded-2xl border border-emerald-500 bg-emerald-50/20 text-sm font-bold text-emerald-700 flex items-center justify-between">
                      <span>Correct Answer: {feed?.correctAnswer}</span>
                      <span>💡</span>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 text-4xl pointer-events-none">✨</div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                    Focused AI Tip
                  </p>
                  <p className="text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed italic">
                    "{feed?.tip || q.explanation}"
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={() => { setExamResult(null); setActiveExam(null); }}
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-6 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-sm active:scale-95 flex items-center justify-center gap-3"
        >
          <span>Complete Assessment</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
      </div>
    );
  }

  if (activeExam) {
    const q = activeExam.questions[currentQuestionIndex];
    const progressPercent = ((currentQuestionIndex + 1) / activeExam.questions.length) * 100;

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20 px-4 md:px-0">
        <div className="bg-emerald-800 p-8 rounded-[2.5rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
           <div className="relative z-10">
              <h2 className="text-2xl font-black tracking-tight">{activeExam.title}</h2>
              <p className="text-[10px] font-black uppercase text-emerald-300 tracking-widest mt-1">{activeExam.subject} • {activeExam.grade}</p>
           </div>
           <div className="relative z-10 flex items-center gap-4 bg-white/10 px-6 py-3 rounded-2xl border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-widest">Question</span>
              <span className="text-2xl font-black">{currentQuestionIndex + 1} / {activeExam.questions.length}</span>
           </div>
           <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
              <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-700 space-y-10 min-h-[450px] flex flex-col">
           <div className="flex-1 space-y-10">
              <h3 className="text-xl md:text-3xl font-black text-slate-800 dark:text-white leading-tight">
                {q.question}
              </h3>

              <div className="grid gap-4">
                 {q.options.map((opt, i) => (
                   <button
                     key={i}
                     onClick={() => handleAnswerSelect(q.id, opt)}
                     className={`p-6 rounded-[1.8rem] border-2 text-left transition-all flex items-center justify-between group ${
                       userAnswers[q.id] === opt 
                         ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl scale-[1.02]' 
                         : 'bg-slate-50 dark:bg-slate-900 border-transparent hover:border-emerald-300 text-slate-700 dark:text-slate-200'
                     }`}
                   >
                     <span className="font-bold flex-1">{opt}</span>
                     <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                       userAnswers[q.id] === opt ? 'bg-white border-white scale-110' : 'border-slate-200'
                     }`}>
                        {userAnswers[q.id] === opt && <div className="w-2.5 h-2.5 bg-emerald-600 rounded-full"></div>}
                     </div>
                   </button>
                 ))}
              </div>
           </div>
        </div>

        <div className="flex justify-between gap-4">
           <button 
             disabled={currentQuestionIndex === 0}
             onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
             className="flex-1 py-5 bg-white dark:bg-slate-800 text-slate-500 font-black rounded-3xl border border-slate-200 dark:border-slate-700 uppercase tracking-widest text-[11px] disabled:opacity-30 active:scale-95 transition-all shadow-sm"
           >
             Previous
           </button>
           
           {currentQuestionIndex < activeExam.questions.length - 1 ? (
             <button 
               disabled={!userAnswers[q.id]}
               onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
               className="flex-[2] py-5 bg-emerald-600 text-white font-black rounded-3xl shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-[11px] active:scale-95 transition-all disabled:opacity-50"
             >
               Next Question
             </button>
           ) : (
             <button 
               disabled={!userAnswers[q.id] || isSubmitting}
               onClick={handleSubmitExam}
               className="flex-[2] py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-3xl shadow-2xl uppercase tracking-widest text-[11px] active:scale-95 transition-all flex items-center justify-center gap-3"
             >
               {isSubmitting ? (
                 <>
                   <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
                   <span>AI Marking Paper...</span>
                 </>
               ) : (
                 <>
                   <span>Submit Examination</span>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                 </>
               )}
             </button>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Exam Hub</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Test your knowledge with curriculum-aligned digital exams.</p>
        </div>
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center text-3xl shadow-inner">🏆</div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {exams.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
             <div className="text-7xl mb-6 grayscale opacity-20">📭</div>
             <h3 className="text-2xl font-black text-slate-800 dark:text-white">No Active Exams</h3>
             <p className="text-slate-500 font-medium max-w-xs mx-auto">Your teachers haven't posted any exams for your level yet. Check back later!</p>
          </div>
        ) : (
          exams.map(exam => (
            <div key={exam.id} className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full border-b-8 border-b-emerald-600/20">
               <div>
                  <div className="flex justify-between items-start mb-8">
                     <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg group-hover:scale-110 transition-transform">EX</div>
                     <span className="text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg text-slate-400 border border-slate-100 dark:border-slate-800">{exam.questions.length} Questions</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-emerald-600 transition-colors">{exam.title}</h3>
                  <div className="flex flex-wrap gap-2 mb-10">
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded-md">{exam.subject}</span>
                     <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded-md">{exam.grade}</span>
                  </div>
               </div>
               <button 
                 onClick={() => handleStartExam(exam)}
                 className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-[10px] active:scale-95 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center gap-2"
               >
                 <span>Begin Examination</span>
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
               </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
