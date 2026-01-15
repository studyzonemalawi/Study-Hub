
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
    
    try {
      const questions = await aiService.generateExam(level, grade, subject, studyContext);
      setGeneratedQuestions(questions);
    } catch (err) {
      alert("AI Generation failed. Please check your API key or context length.");
    } finally {
      setIsGenerating(false);
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
    
    // Clear form
    setExamTitle('');
    setStudyContext('');
    setGeneratedQuestions([]);
    
    setTimeout(() => {
      setSuccessMsg(null);
      onNavigate('admin');
    }, 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Formulate Online Exam</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Use AI to generate comprehensive exams from lesson material.</p>
        </div>
        <button 
          onClick={() => onNavigate('admin')}
          className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all shadow-sm"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {successMsg && (
        <div className="p-6 bg-emerald-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl animate-in slide-in-from-top-4">
          ✨ {successMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-10">
        <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-2xl space-y-8">
           <form onSubmit={handleGenerateExam} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Exam Title</label>
                <input 
                  type="text" 
                  required 
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder="e.g. Unit 4: Agricultural Science Assessment"
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
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Paste Lesson Material Information</label>
                 <textarea 
                   required
                   value={studyContext}
                   onChange={(e) => setStudyContext(e.target.value)}
                   placeholder="Paste the text information students need to be tested on. AI will formulate 10-15 questions based on this."
                   className="w-full p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 font-medium h-64 resize-none"
                 />
              </div>

              <button 
                type="submit" 
                disabled={isGenerating || !studyContext.trim() || !examTitle.trim()}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-5 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-[11px] disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
              >
                {isGenerating && <div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin"></div>}
                {isGenerating ? 'AI Generating Exam...' : 'Generate Questions'}
              </button>
           </form>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-xl flex flex-col h-[800px]">
           <div className="flex justify-between items-center mb-10 flex-none">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Exam Preview</h3>
              <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100">
                {generatedQuestions.length} Items
              </span>
           </div>

           <div className="flex-1 overflow-y-auto pr-4 space-y-6 custom-scrollbar">
              {generatedQuestions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 grayscale p-10">
                   <div className="text-7xl mb-6">🤖</div>
                   <p className="font-black uppercase tracking-widest text-[10px]">Ready to assist you with curriculum-aligned questions.</p>
                </div>
              ) : (
                generatedQuestions.map((q, idx) => (
                  <div key={q.id} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4">
                     <p className="text-[9px] font-black uppercase text-slate-400">Question {idx + 1}</p>
                     <p className="font-black text-slate-800 dark:text-white leading-tight">{q.question}</p>
                     <div className="grid grid-cols-2 gap-2">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`p-2 rounded-xl text-[9px] font-bold border ${opt === q.correctAnswer ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-slate-100 dark:bg-slate-800 dark:border-slate-700 text-slate-400'}`}>
                             {opt}
                          </div>
                        ))}
                     </div>
                  </div>
                ))
              )}
           </div>

           {generatedQuestions.length >= 10 && (
             <div className="pt-8 mt-auto flex-none">
                <button 
                  onClick={handleShareExam}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-3xl shadow-2xl transition-all uppercase tracking-widest text-[11px] active:scale-95 shadow-emerald-500/20"
                >
                  Share Questions to Users
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
