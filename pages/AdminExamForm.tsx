
import React, { useState } from 'react';
import { EducationLevel, Grade, PRIMARY_GRADES, SECONDARY_GRADES, PRIMARY_SUBJECTS, SECONDARY_SUBJECTS, Exam, ExamQuestion } from '../types';
import { storage } from '../services/storage';
import { aiService } from '../services/ai';

interface AdminExamFormProps {
  onNavigate: (tab: string) => void;
}

export const AdminExamForm: React.FC<AdminExamFormProps> = ({ onNavigate }) => {
  const [level, setLevel] = useState<EducationLevel>(EducationLevel.PRIMARY);
  const [grade, setGrade] = useState<Grade>(PRIMARY_GRADES[0]);
  const [subject, setSubject] = useState(PRIMARY_SUBJECTS[0]);
  const [examTitle, setExamTitle] = useState('');
  const [studyContext, setStudyContext] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [generatedQuestions, setGeneratedQuestions] = useState<ExamQuestion[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const availableGrades = level === EducationLevel.PRIMARY ? PRIMARY_GRADES : SECONDARY_GRADES;
  const availableSubjects = level === EducationLevel.PRIMARY ? PRIMARY_SUBJECTS : SECONDARY_SUBJECTS;

  const handleLevelChange = (newLevel: EducationLevel) => {
    setLevel(newLevel);
    setGrade(newLevel === EducationLevel.PRIMARY ? PRIMARY_GRADES[0] : SECONDARY_GRADES[0]);
    setSubject(newLevel === EducationLevel.PRIMARY ? PRIMARY_SUBJECTS[0] : SECONDARY_SUBJECTS[0]);
  };

  const handleGenerateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyContext.trim() || !examTitle.trim()) return;

    setIsGenerating(true);
    setGeneratedQuestions([]);
    setGenerationStep(1);
    
    // UI steps for better perception of speed/work
    const steps = ["Analyzing text complexity...", "Aligning with MANEB standards...", "Generating questions...", "Finalizing focused tips..."];
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step < steps.length) setGenerationStep(step + 1);
    }, 1500);

    try {
      const questions = await aiService.generateExam(level, grade, subject, studyContext);
      setGeneratedQuestions(questions);
    } catch (err: any) {
      alert(err.message || "AI Generation failed. Check API key or context.");
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
      setGenerationStep(0);
    }
  };

  const handleShareExam = () => {
    if (generatedQuestions.length < 10) {
      alert("Exam must have at least 10 questions.");
      return;
    }

    const newExam: Exam = {
      id: Math.random().toString(36).substr(2, 9),
      title: examTitle,
      level,
      grade,
      subject,
      questions: generatedQuestions,
      createdAt: new Date().toISOString(),
      createdBy: 'admin'
    };

    storage.saveExam(newExam);
    setSuccessMsg(`Exam "${examTitle}" shared successfully to all ${grade} students!`);
    
    setExamTitle('');
    setStudyContext('');
    setGeneratedQuestions([]);
    
    setTimeout(() => {
      setSuccessMsg(null);
      onNavigate('admin');
    }, 3000);
  };

  const loadingSteps = ["Analyzing text complexity...", "Aligning with MANEB standards...", "Generating questions...", "Finalizing focused tips..."];

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center px-4 md:px-0">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">AI Exam Architect</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Instantly transform curriculum text into premium online exams.</p>
        </div>
        <button 
          onClick={() => onNavigate('admin')}
          className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all shadow-sm"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {successMsg && (
        <div className="mx-4 md:mx-0 p-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl animate-in slide-in-from-top-4 flex items-center gap-4">
          <span className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">✨</span>
          {successMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-8 px-4 md:px-0">
        {/* Form Panel */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-2xl space-y-8">
            <form onSubmit={handleGenerateExam} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Exam Title</label>
                  <input 
                    type="text" 
                    required 
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    placeholder="e.g. Form 4 Biology: Cell Structure"
                    className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Level</label>
                     <select 
                      value={level} 
                      onChange={(e) => handleLevelChange(e.target.value as EducationLevel)}
                      className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-bold appearance-none"
                     >
                       {Object.values(EducationLevel).map(v => <option key={v} value={v}>{v}</option>)}
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Grade</label>
                     <select 
                      value={grade}
                      onChange={(e) => setGrade(e.target.value as Grade)}
                      className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-bold appearance-none"
                     >
                       {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                     </select>
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Subject</label>
                   <select 
                     value={subject}
                     onChange={(e) => setSubject(e.target.value)}
                     className="w-full p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-bold appearance-none"
                   >
                     {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Study Material Content</label>
                   <textarea 
                     required
                     value={studyContext}
                     onChange={(e) => setStudyContext(e.target.value)}
                     placeholder="Paste lesson text or notes here. The AI will analyze this specific text to build your exam."
                     className="w-full p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium h-64 resize-none"
                   />
                </div>

                <button 
                  type="submit" 
                  disabled={isGenerating || !studyContext.trim() || !examTitle.trim()}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-[11px] disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3 group"
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-3">
                       <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>
                       <span>Marking Paper...</span>
                    </div>
                  ) : (
                    <>
                      <span>Generate Exam</span>
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </>
                  )}
                </button>
            </form>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-xl flex flex-col h-[850px]">
             <div className="flex justify-between items-center mb-10 flex-none">
                <div>
                   <h3 className="text-xl font-black text-slate-800 dark:text-white">Exam Preview</h3>
                   {generatedQuestions.length > 0 && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verify quality before sharing</p>}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-colors ${generatedQuestions.length > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                  {generatedQuestions.length} Items Ready
                </span>
             </div>

             <div className="flex-1 overflow-y-auto pr-4 space-y-6 custom-scrollbar relative">
                {isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-in fade-in duration-500">
                     <div className="relative mb-10">
                        <div className="w-24 h-24 border-[6px] border-emerald-50 dark:border-emerald-950/30 border-t-emerald-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-4xl">🤖</div>
                     </div>
                     <div className="space-y-4 max-w-xs">
                        <h4 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                           {loadingSteps[generationStep - 1] || "AI is Working..."}
                        </h4>
                        <div className="flex gap-1.5 justify-center">
                           {[1, 2, 3, 4].map(s => (
                             <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${s <= generationStep ? 'w-8 bg-emerald-600' : 'w-2 bg-slate-100 dark:bg-slate-700'}`}></div>
                           ))}
                        </div>
                     </div>
                  </div>
                ) : generatedQuestions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale p-10 space-y-6">
                     <div className="text-8xl">📝</div>
                     <div className="space-y-2">
                        <h4 className="text-xl font-black uppercase tracking-widest">Workspace Empty</h4>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] max-w-[200px] mx-auto">Fill the form to begin AI content generation.</p>
                     </div>
                  </div>
                ) : (
                  generatedQuestions.map((q, idx) => (
                    <div key={q.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4 hover:border-emerald-200 transition-colors group">
                       <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-emerald-500 transition-colors">Q{idx + 1} • MCQ</span>
                          <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Checked</span>
                       </div>
                       <p className="font-black text-slate-800 dark:text-white leading-tight">{q.question}</p>
                       <div className="grid grid-cols-2 gap-2">
                          {q.options.map((opt, i) => (
                            <div key={i} className={`p-3 rounded-xl text-[10px] font-bold border transition-all ${opt === q.correctAnswer ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}>
                               {opt}
                            </div>
                          ))}
                       </div>
                       <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] text-slate-400 font-bold uppercase italic line-clamp-1">Tip: {q.explanation}</p>
                       </div>
                    </div>
                  ))
                )}
             </div>

             {generatedQuestions.length >= 10 && !isGenerating && (
               <div className="pt-8 mt-auto flex-none animate-in slide-in-from-bottom-4">
                  <button 
                    onClick={handleShareExam}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-[11px] active:scale-95 shadow-emerald-500/20 flex items-center justify-center gap-3"
                  >
                    <span>Deploy Exam to Students</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};
