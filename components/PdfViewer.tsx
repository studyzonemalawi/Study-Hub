
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StudyMaterial, ReadingStatus, UserProgress } from '../types';
import { storage } from '../services/storage';
import { aiService, QuizQuestion, QuizChapter, EvaluationResult } from '../services/ai';

// Accessing Global PDFJS from the index.html script tag
declare const pdfjsLib: any;

interface PdfViewerProps {
  material: StudyMaterial;
  userId: string;
  onClose: () => void;
  onUpdateStatus: (status: ReadingStatus) => void;
  currentProgress?: UserProgress;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ 
  material, 
  userId, 
  onClose, 
  onUpdateStatus,
  currentProgress 
}) => {
  const [status, setStatus] = useState<ReadingStatus>(currentProgress?.status || ReadingStatus.READING);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  
  // Define translation labels for UI consistency
  const lang = localStorage.getItem('study_hub_chat_lang') || 'English';
  const t = {
    liveSupport: lang === 'English' ? 'AI Smart Tutor' : 'Mlangizi wa AI'
  };

  // Rendering States
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.2);
  const [isRenderLoading, setIsRenderLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // AI Quiz States
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [chapters, setChapters] = useState<QuizChapter[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [quizStep, setQuizStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [evaluations, setEvaluations] = useState<Record<string, EvaluationResult>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Analyzing curriculum...");
  const [extractedText, setExtractedText] = useState("");

  // Initialize PDF Rendering
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsRenderLoading(true);
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument(material.fileUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        
        // Extract text for AI
        let fullText = "";
        const pagesToExtract = Math.min(pdf.numPages, 10);
        for (let i = 1; i <= pagesToExtract; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(" ") + "\n";
        }
        setExtractedText(fullText);
        setIsRenderLoading(false);
      } catch (err) {
        console.error("PDF Load Error:", err);
        setIsRenderLoading(false);
      }
    };
    loadPdf();
  }, [material.fileUrl]);

  // Render Pages on Canvas
  const renderPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement) => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: zoom });
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise;
    } catch (err) {
      console.error(`Page ${pageNum} Render Error:`, err);
    }
  }, [pdfDoc, zoom]);

  useEffect(() => {
    if (pdfDoc && !isRenderLoading) {
      // Re-render visible pages when zoom changes
      pageRefs.current.forEach((canvas, idx) => {
        if (canvas) renderPage(idx + 1, canvas);
      });
    }
  }, [pdfDoc, isRenderLoading, zoom, renderPage]);

  // Handle Scroll tracking
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, clientHeight } = containerRef.current;
    const scrollMiddle = scrollTop + (clientHeight / 2);
    
    // Determine current page based on scroll position
    let cumulativeHeight = 0;
    for (let i = 0; i < pageRefs.current.length; i++) {
      const canvas = pageRefs.current[i];
      if (canvas) {
        cumulativeHeight += canvas.height + 24; // canvas height + margin
        if (scrollMiddle < cumulativeHeight) {
          setCurrentPage(i + 1);
          break;
        }
      }
    }
  };

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setIsQuizOpen(true);
    setQuizFinished(false);
    setQuizStep(0);
    setActiveChapterIndex(0);
    
    const messages = [
      "Analyzing textbook content...",
      "Identifying Malawian curriculum topics...",
      "Crafting challenging questions...",
      "Ready for academic excellence!"
    ];
    
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingMsg(messages[msgIndex]);
    }, 2000);

    try {
      const data = await aiService.generateQuiz(material.title, material.subject, material.grade, extractedText);
      setChapters(data);
    } catch (err) {
      console.error(err);
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  // Logic for Quiz Evaluation
  const handleEvaluateComprehension = async (qId: string) => {
    const userAnswer = userAnswers[qId];
    const question = chapters[activeChapterIndex].questions.find(q => q.id === qId);
    if (!userAnswer || userAnswer.trim().length < 5 || !question) return;

    setIsEvaluating(true);
    try {
      const result = await aiService.evaluateComprehensionAnswer(
        question.question,
        userAnswer,
        question.correctAnswer,
        question.explanation
      );
      setEvaluations(prev => ({ ...prev, [qId]: result }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextQuestion = () => {
    const currentQuestions = chapters[activeChapterIndex]?.questions || [];
    if (quizStep < currentQuestions.length - 1) {
      setQuizStep(quizStep + 1);
    } else if (activeChapterIndex < chapters.length - 1) {
      setActiveChapterIndex(activeChapterIndex + 1);
      setQuizStep(0);
    } else {
      setQuizFinished(true);
    }
  };

  const resetQuiz = () => {
    setQuizStep(0);
    setActiveChapterIndex(0);
    setUserAnswers({});
    setEvaluations({});
    setQuizFinished(false);
    setIsQuizOpen(false);
  };

  const changeZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-300">
      {/* Dynamic Reader Header */}
      <header className="bg-emerald-900 text-white flex-none flex items-center justify-between px-4 py-3 md:px-8 md:py-5 shadow-2xl z-20 border-b border-white/5">
        <div className="flex items-center min-w-0 flex-1 mr-4">
          <button 
            onClick={() => setShowConfirmClose(true)} 
            className="p-2.5 hover:bg-white/10 rounded-2xl transition-all mr-4 flex-none group"
            aria-label="Back"
          >
            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <h3 className="font-black text-xs md:text-sm uppercase tracking-widest truncate opacity-60 mb-0.5">{material.subject} • {material.grade}</h3>
            <h4 className="font-black text-sm md:text-lg truncate leading-tight">{material.title}</h4>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4 flex-none">
          <div className="hidden md:flex items-center bg-white/10 rounded-2xl p-1 border border-white/5">
             <button onClick={() => changeZoom(-0.1)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">➖</button>
             <span className="px-3 font-black text-[10px] uppercase tracking-tighter w-16 text-center">{Math.round(zoom * 100)}%</span>
             <button onClick={() => changeZoom(0.1)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">➕</button>
          </div>

          <button 
            onClick={handleGenerateQuiz}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-xl transition-all flex items-center gap-2 active:scale-95 border border-purple-400/20"
          >
            <span className="text-sm">✨</span>
            <span className="hidden sm:inline">Smart Quiz</span>
            <span className="sm:hidden">Quiz</span>
          </button>
          
          <button 
            onClick={() => setShowConfirmClose(true)} 
            className="p-3 bg-red-500/20 hover:bg-red-500/40 text-red-100 rounded-2xl transition-all active:scale-90"
            title="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Reader Toolbox / Page Navigation */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] shadow-2xl transition-all animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center bg-white/5 rounded-[1.5rem] px-5 py-3 gap-4">
             <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Page</span>
             <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val > 0 && val <= numPages) {
                      setCurrentPage(val);
                      pageRefs.current[val - 1]?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="w-12 bg-transparent text-center font-black text-white outline-none text-lg"
                />
                <span className="text-white/30 font-black text-xs">/ {numPages}</span>
             </div>
          </div>
          <button 
            onClick={() => storage.recordDownload(userId, material.id)}
            className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-emerald-500 transition-all active:scale-90"
            title="Download Offline"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-white/5 w-full flex-none">
         <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${(currentPage / numPages) * 100}%` }}></div>
      </div>

      {/* Main Reader Surface */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-auto bg-slate-800 p-4 md:p-8 custom-scrollbar scroll-smooth"
      >
        <div className="flex flex-col items-center gap-6 pb-40">
           {isRenderLoading ? (
             <div className="flex flex-col items-center justify-center h-[70vh] space-y-6">
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-emerald-400 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Rendering Document...</p>
             </div>
           ) : (
             Array.from({ length: numPages }).map((_, i) => (
               <div key={i} className="relative shadow-2xl rounded-sm overflow-hidden bg-white border border-white/10 group">
                  <canvas 
                    /* FIX: Ensure ref callback doesn't return value to avoid TS error */
                    ref={el => { pageRefs.current[i] = el; }}
                    className="max-w-full h-auto block"
                  />
                  <div className="absolute top-4 right-4 bg-black/20 backdrop-blur-md text-[9px] font-black text-white px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest">
                    P. {i + 1}
                  </div>
               </div>
             ))
           )}
        </div>
      </div>

      {/* Smart Quiz Overlay */}
      {isQuizOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl h-full max-h-[90%] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10">
            {/* Quiz Header */}
            <div className="bg-emerald-800 p-6 md:p-8 text-white flex-none flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-3xl">🧠</div>
                 <div>
                    <h4 className="font-black uppercase tracking-widest text-xs">{t.liveSupport || 'AI Smart Tutor'}</h4>
                    <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest mt-1">
                      {isGenerating ? 'Processing Textbook...' : chapters[activeChapterIndex]?.chapterTitle || 'Academic Review'}
                    </p>
                 </div>
              </div>
              <button onClick={resetQuiz} className="p-3 hover:bg-white/10 rounded-2xl transition-colors">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Quiz Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-12 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
              {isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20">
                  <div className="relative">
                     <div className="w-24 h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                     <div className="absolute inset-0 flex items-center justify-center text-4xl">📚</div>
                  </div>
                  <div className="space-y-3">
                    <h5 className="text-2xl font-black text-emerald-900 dark:text-emerald-400">{loadingMsg}</h5>
                    <p className="text-slate-400 text-sm font-medium">Preparing section-specific revision based on the Malawian curriculum.</p>
                  </div>
                </div>
              ) : quizFinished ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-10 animate-in zoom-in">
                  <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-5xl mx-auto shadow-inner">🎓</div>
                  <div className="space-y-4">
                    <h4 className="text-4xl font-black text-emerald-900 dark:text-emerald-400 tracking-tight">Revision Complete!</h4>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto">You have mastered the concepts in this section of the textbook. Keep up the great work!</p>
                  </div>
                  <button onClick={resetQuiz} className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm transition-all active:scale-95">Back to Reading</button>
                </div>
              ) : chapters[activeChapterIndex]?.questions[quizStep] ? (
                <div className="space-y-8 md:space-y-12 animate-in slide-in-from-right-4">
                  {/* Step Header */}
                  <div className="flex items-center justify-between">
                     <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                        Concept {quizStep + 1} of {chapters[activeChapterIndex].questions.length}
                     </span>
                     <div className="flex gap-1.5">
                        {chapters[activeChapterIndex].questions.map((_, i) => (
                           <div key={i} className={`h-1.5 rounded-full transition-all ${i === quizStep ? 'w-8 bg-emerald-600' : 'w-2 bg-slate-200 dark:bg-slate-700'}`}></div>
                        ))}
                     </div>
                  </div>

                  {/* Question Area */}
                  <div className="space-y-6">
                    <h4 className="text-xl md:text-3xl font-black text-slate-800 dark:text-slate-100 leading-tight">
                      {chapters[activeChapterIndex].questions[quizStep].question}
                    </h4>
                    
                    {chapters[activeChapterIndex].questions[quizStep].type === 'mcq' ? (
                      <div className="grid gap-4">
                        {chapters[activeChapterIndex].questions[quizStep].options?.map((opt, i) => {
                          const isSelected = userAnswers[chapters[activeChapterIndex].questions[quizStep].id] === opt;
                          const isAnswered = !!userAnswers[chapters[activeChapterIndex].questions[quizStep].id];
                          const isCorrect = opt === chapters[activeChapterIndex].questions[quizStep].correctAnswer;
                          
                          return (
                            <button
                              key={i}
                              disabled={isAnswered}
                              onClick={() => setUserAnswers(prev => ({ ...prev, [chapters[activeChapterIndex].questions[quizStep].id]: opt }))}
                              className={`p-5 md:p-6 rounded-3xl border-2 text-left transition-all flex items-center justify-between group ${
                                isAnswered ? (isCorrect ? 'bg-emerald-50 border-emerald-500' : isSelected ? 'bg-red-50 border-red-500 opacity-60' : 'opacity-40 border-slate-100') : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-emerald-300'
                              }`}
                            >
                               <span className="font-bold text-slate-700 dark:text-slate-200">{opt}</span>
                               {isAnswered && isCorrect && <span className="text-emerald-600 text-xl font-black">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <textarea 
                          placeholder="Type your explanation based on your understanding of the text..."
                          disabled={!!evaluations[chapters[activeChapterIndex].questions[quizStep].id] || isEvaluating}
                          className="w-full p-6 md:p-8 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-emerald-500 outline-none h-48 font-medium text-slate-800 dark:text-white transition-all shadow-inner"
                          value={userAnswers[chapters[activeChapterIndex].questions[quizStep].id] || ''}
                          onChange={(e) => setUserAnswers(prev => ({ ...prev, [chapters[activeChapterIndex].questions[quizStep].id]: e.target.value }))}
                        />

                        {!evaluations[chapters[activeChapterIndex].questions[quizStep].id] ? (
                          <button 
                            onClick={() => handleEvaluateComprehension(chapters[activeChapterIndex].questions[quizStep].id)}
                            disabled={isEvaluating || !userAnswers[chapters[activeChapterIndex].questions[quizStep].id] || userAnswers[chapters[activeChapterIndex].questions[quizStep].id].length < 10}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-3 active:scale-95"
                          >
                            {isEvaluating ? 'Checking with AI...' : 'Verify My Answer'}
                          </button>
                        ) : (
                          <div className="p-8 bg-emerald-50 dark:bg-emerald-950/20 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/30 space-y-6 animate-in slide-in-from-top-4">
                             <div className="flex items-center justify-between">
                                <h5 className="font-black text-emerald-800 dark:text-emerald-400 uppercase text-xs tracking-widest">Mastery Level</h5>
                                <span className="text-3xl font-black text-emerald-900 dark:text-white">{evaluations[chapters[activeChapterIndex].questions[quizStep].id].score}%</span>
                             </div>
                             <p className="text-emerald-800 dark:text-emerald-300 font-medium bg-white/50 dark:bg-black/20 p-5 rounded-2xl italic leading-relaxed">
                                "{evaluations[chapters[activeChapterIndex].questions[quizStep].id].feedbackSummary}"
                             </p>
                          </div>
                        )}
                      </div>
                    )}

                    {(userAnswers[chapters[activeChapterIndex].questions[quizStep].id] || evaluations[chapters[activeChapterIndex].questions[quizStep].id]) && (
                      <button onClick={nextQuestion} className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black py-5 rounded-2xl shadow-xl uppercase tracking-[0.2em] text-xs transition-all active:scale-95 flex items-center justify-center gap-3">
                        Continue Learning <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Save & Exit Confirmation */}
      {showConfirmClose && (
        <div className="fixed inset-0 z-[130] bg-slate-950/90 flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl border border-white/20 animate-in zoom-in duration-200">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner">🔖</div>
            <h3 className="text-2xl font-black mb-2 text-slate-900 text-center">Save Progress?</h3>
            <p className="text-slate-500 mb-10 font-medium text-center leading-relaxed"> We've bookmarked your page. You can pick up exactly where you left off next time.</p>
            <div className="space-y-4">
              <button 
                onClick={onClose} 
                className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs"
              >
                Sync & Close
              </button>
              <button 
                onClick={() => setShowConfirmClose(false)} 
                className="w-full py-5 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
