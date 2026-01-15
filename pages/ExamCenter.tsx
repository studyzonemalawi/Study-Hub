
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
      alert("Evaluation failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (examResult) {
    return (
      <div className="max-w-4xl mx-auto space-y-10 animate-in zoom-in duration-500 pb-20">
        <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-12 text-center border border-slate-100 dark:border-slate-700 shadow-2xl space-y-8">
          <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">🏆</div>
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white">Exam Results</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">{activeExam?.title}</p>
          </div>
          
          <div className="flex justify-center items-baseline gap-2">
             <span className="text-7xl font-black text-emerald-600">{examResult.score}</span>
             <span className="text-2xl font-black text-slate-300">/ 100</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
             <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Correct Answers</p>
                <p className="text-2xl font-black text-slate-800 dark:text-white">
                  {/* FIX: Cast item to any to avoid "unknown" type error when filtering Object.values */}
                  {Object.values(examResult.feedback).filter((f: any) => f.isCorrect).length} of {examResult.totalQuestions}
                </p>
             </div>
             <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
                <p className={`text-2xl font-black ${examResult.score >= 50 ? 'text-emerald-500' : 'text-orange-500'}`}>
                  {examResult.score >= 50 ? 'PASSED' : 'RETRY'}
                </p>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white px-4">Detailed Review & Tips</h3>
          {activeExam?.questions.map((q, idx) => {
            const feed = examResult.feedback[q.id];
            return (
              <div key={q.id} className={`p-8 rounded-[2.5rem] border-2 bg-white dark:bg-slate-800 transition-all ${feed?.isCorrect ? 'border-emerald-500/20' : 'border-red-500/20 shadow-lg'}`}>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg text-slate-400">Question {idx + 1}</span>
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${feed?.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {feed?.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <h4 className="text-lg font-black text-slate-800 dark:text-white mb-6 leading-tight">{q.question}</h4>
                
                <div className="grid gap-3 mb-8">
                  <div className={`p-4 rounded-2xl border text-sm font-bold ${feed?.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                    Your Answer: {examResult.answers[q.id] || 'Skipped'}
                  </div>
                  {!feed?.isCorrect && (
                    <div className="p-4 rounded-2xl border border-emerald-100 bg-white dark:bg-slate-900 text-sm font-bold text-emerald-600">
                      Correct Answer: {feed?.correctAnswer}
                    </div>
                  )}
                </div>

                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800/50">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-2">💡 Focused Tip</p>
                  <p className="text-blue-800 dark:text-blue-200 font-medium italic">"{feed?.tip}"</p>
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={() => { setExamResult(null); setActiveExam(null); }}
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-sm active:scale-95"
        >
          Return to Exam Hub
        </button>
      </div>
    );
  }

  if (activeExam) {
    const q = activeExam.questions[currentQuestionIndex];
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-right-4 duration-500 pb-20">
        <div className="bg-emerald-800 p-8 rounded-[2.5rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
           <div>
              <h2 className="text-2xl font-black tracking-tight">{activeExam.title}</h2>
              <p className="text-[10px] font-black uppercase text-emerald-300 tracking-widest mt-1">{activeExam.subject} • {activeExam.grade}</p>
           </div>
           <div className="flex items-center gap-4 bg-white/10 px-6 py-3 rounded-2xl border border-white/10">
              <span className="text-[10px] font-black uppercase tracking-widest">Question</span>
              <span className="text-2xl font-black">{currentQuestionIndex + 1} / {activeExam.questions.length}</span>
           </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-700 space-y-10 min-h-[400px]">
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
                  <span className="font-bold">{opt}</span>
                  {userAnswers[q.id] === opt && <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                </button>
              ))}
           </div>
        </div>

        <div className="flex justify-between gap-4">
           <button 
             disabled={currentQuestionIndex === 0}
             onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
             className="flex-1 py-5 bg-white dark:bg-slate-800 text-slate-500 font-black rounded-3xl border border-slate-200 dark:border-slate-700 uppercase tracking-widest text-[11px] disabled:opacity-30"
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
               {isSubmitting && <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>}
               {isSubmitting ? 'Evaluating Results...' : 'Submit Exam'}
             </button>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Exam Center</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Test your knowledge with AI-formulated exams for your level.</p>
        </div>
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl flex items-center justify-center text-3xl">📝</div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {exams.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
             <div className="text-6xl mb-6 grayscale opacity-20">📭</div>
             <h3 className="text-2xl font-black text-slate-800 dark:text-white">No Exams Available</h3>
             <p className="text-slate-500 font-medium">Check back later for new academic tests from the Admin desk.</p>
          </div>
        ) : (
          exams.map(exam => (
            <div key={exam.id} className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-2xl transition-all group flex flex-col justify-between h-full border-b-8 border-b-emerald-600/20">
               <div>
                  <div className="flex justify-between items-start mb-8">
                     <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg">EX</div>
                     <span className="text-[9px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg text-slate-400 border border-slate-100 dark:border-slate-800">{exam.questions.length} Questions</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-emerald-600 transition-colors">{exam.title}</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-10">{exam.subject} • {exam.grade}</p>
               </div>
               <button 
                 onClick={() => handleStartExam(exam)}
                 className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-[10px] active:scale-95 group-hover:bg-emerald-600 group-hover:text-white"
               >
                 Start Online Exam
               </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
