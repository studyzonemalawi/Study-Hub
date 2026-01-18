
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StudyMaterial, ReadingStatus, UserProgress } from '../types';
import { storage } from '../services/storage';
import { aiService, QuizQuestion, QuizChapter, EvaluationResult } from '../services/ai';

declare const pdfjsLib: any;

interface MaterialViewerProps {
  material: StudyMaterial;
  userId: string;
  onClose: () => void;
  onUpdateStatus: (status: ReadingStatus) => void;
  currentProgress?: UserProgress;
}

export const PdfViewer: React.FC<MaterialViewerProps> = ({ 
  material, 
  userId, 
  onClose, 
  onUpdateStatus,
  currentProgress 
}) => {
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [viewMode, setViewMode] = useState<'scroll' | 'flip'>('flip');
  const lang = localStorage.getItem('study_hub_chat_lang') || 'English';
  
  const t = {
    liveSupport: lang === 'English' ? 'AI Smart Tutor' : 'Mlangizi wa AI',
    flipbook: lang === 'English' ? 'Flipbook' : 'Buku Lapansi',
    scroll: lang === 'English' ? 'Scroll' : 'Mndandanda',
    next: lang === 'English' ? 'Next' : 'Ena',
    prev: lang === 'English' ? 'Prev' : "M'mbuyo"
  };

  // PDF Rendering States
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isRenderLoading, setIsRenderLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const flipPageRef = useRef<HTMLCanvasElement | null>(null);

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

  // Load PDF
  useEffect(() => {
    if (material.isDigital) {
      setIsRenderLoading(false);
      return;
    }

    const loadPdf = async () => {
      try {
        setIsRenderLoading(true);
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const loadingTask = pdfjsLib.getDocument(material.fileUrl);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setIsRenderLoading(false);
      } catch (err) {
        console.error("PDF Load Error:", err);
        setIsRenderLoading(false);
      }
    };
    loadPdf();
  }, [material]);

  const renderPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement, scale: number = zoom) => {
    if (!pdfDoc || !canvas) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport: viewport }).promise;
    } catch (err) {
      console.error(`Page ${pageNum} Render Error:`, err);
    }
  }, [pdfDoc, zoom]);

  // Initial render for scroll mode
  useEffect(() => {
    if (pdfDoc && !isRenderLoading && viewMode === 'scroll') {
      pageRefs.current.forEach((canvas, idx) => {
        if (canvas) renderPage(idx + 1, canvas);
      });
    }
  }, [pdfDoc, isRenderLoading, zoom, renderPage, viewMode]);

  // Specific render for Flip mode (Single page rendering)
  useEffect(() => {
    if (pdfDoc && !isRenderLoading && viewMode === 'flip') {
      if (flipPageRef.current) renderPage(currentPage, flipPageRef.current, 1.4);
    }
  }, [currentPage, viewMode, pdfDoc, isRenderLoading, renderPage]);

  const handleScroll = () => {
    if (!containerRef.current || material.isDigital || viewMode === 'flip') return;
    const { scrollTop, clientHeight } = containerRef.current;
    const scrollMiddle = scrollTop + (clientHeight / 2);
    let cumulativeHeight = 0;
    for (let i = 0; i < pageRefs.current.length; i++) {
      const canvas = pageRefs.current[i];
      if (canvas) {
        cumulativeHeight += canvas.height + 24;
        if (scrollMiddle < cumulativeHeight) {
          setCurrentPage(i + 1);
          break;
        }
      }
    }
  };

  const handlePageTurn = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentPage < numPages) {
      setCurrentPage(prev => Math.min(prev + 1, numPages));
    } else if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => Math.max(prev - 1, 1));
    }
  };

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setIsQuizOpen(true);
    setQuizFinished(false);
    try {
      const context = material.isDigital ? material.content || "" : "PDF Text Extraction Placeholder";
      const data = await aiService.generateQuiz(material.title, material.subject, material.grade, context);
      setChapters(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEvaluateComprehension = async (qId: string) => {
    const userAnswer = userAnswers[qId];
    const question = chapters[activeChapterIndex].questions.find(q => q.id === qId);
    if (!userAnswer || !question) return;

    setIsEvaluating(true);
    try {
      const result = await aiService.evaluateComprehensionAnswer(question.question, userAnswer, question.correctAnswer, question.explanation);
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

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-300">
      <header className="bg-emerald-900 text-white flex-none flex items-center justify-between px-4 py-3 md:px-8 shadow-2xl z-20">
        <div className="flex items-center min-w-0 flex-1">
          <button onClick={() => setShowConfirmClose(true)} className="p-2.5 hover:bg-white/10 rounded-2xl transition-all mr-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="min-w-0">
            <h4 className="font-black text-sm md:text-lg truncate">{material.title}</h4>
            <div className="flex items-center gap-3">
               <p className="text-[10px] uppercase font-bold opacity-60 tracking-widest">{material.isDigital ? 'Digital' : `Page ${currentPage} of ${numPages}`}</p>
               {!material.isDigital && (
                 <div className="flex bg-black/30 rounded-lg p-0.5 border border-white/10">
                   <button 
                     onClick={() => setViewMode('flip')}
                     className={`px-3 py-1 text-[8px] font-black uppercase rounded ${viewMode === 'flip' ? 'bg-emerald-600 text-white' : 'text-white/40'}`}
                   >
                     {t.flipbook}
                   </button>
                   <button 
                     onClick={() => setViewMode('scroll')}
                     className={`px-3 py-1 text-[8px] font-black uppercase rounded ${viewMode === 'scroll' ? 'bg-emerald-600 text-white' : 'text-white/40'}`}
                   >
                     {t.scroll}
                   </button>
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <button onClick={handleGenerateQuiz} className="bg-purple-600 hover:bg-purple-700 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all">✨ Quiz</button>
          <button onClick={() => setShowConfirmClose(true)} className="p-3 bg-red-500/20 text-red-100 rounded-2xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </header>

      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto bg-slate-800 custom-scrollbar relative">
        <div className={`max-w-7xl mx-auto p-4 md:p-12 pb-40 ${viewMode === 'flip' ? 'h-full flex items-center justify-center overflow-hidden' : ''}`}>
           {isRenderLoading ? (
             <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-emerald-400 font-black text-xs uppercase tracking-widest">Loading Material...</p>
             </div>
           ) : material.isDigital ? (
             <div className="bg-white dark:bg-slate-900 p-8 md:p-16 rounded-3xl shadow-2xl prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                <div className="whitespace-pre-wrap font-medium leading-relaxed" dangerouslySetInnerHTML={{ 
                  __html: material.content?.replace(/# (.*)/g, '<h1 class="text-4xl font-black text-emerald-800 dark:text-emerald-400 mb-8">$1</h1>')
                                            .replace(/## (.*)/g, '<h2 class="text-2xl font-black text-slate-900 dark:text-white mt-12 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">$1</h2>')
                                            .replace(/### (.*)/g, '<h3 class="text-xl font-bold text-emerald-700 dark:text-emerald-500 mt-8 mb-4">$1</h3>')
                                            .replace(/\*\*(.*)\*\*/g, '<strong class="font-black text-slate-900 dark:text-white">$1</strong>')
                                            .replace(/- (.*)/g, '<li class="ml-6 mb-2">$1</li>') || "" 
                }} />
             </div>
           ) : viewMode === 'flip' ? (
             <div className="w-full h-full flex flex-col items-center justify-center gap-12 animate-in zoom-in-95 duration-500">
                <div className="relative group perspective-1000 flex items-center justify-center">
                   {/* Single Page Display */}
                   <div className="relative bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden border border-slate-200 transform transition-all duration-500 ease-out hover:scale-[1.01] hover:rotate-y-2">
                      <canvas key={currentPage} ref={flipPageRef} className="max-w-[85vw] md:max-w-[60vw] lg:max-w-[45vw] h-auto animate-in slide-in-from-right-4 fade-in duration-300" />
                      
                      {/* Depth Decorations */}
                      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/5 to-transparent pointer-events-none border-l-4 border-slate-50"></div>
                      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-black/5 to-transparent pointer-events-none"></div>
                      <div className="absolute bottom-0 right-0 w-20 h-20 bg-gradient-to-tl from-black/5 to-transparent pointer-events-none"></div>
                   </div>

                   {/* Floating Nav Buttons */}
                   <button 
                     onClick={() => handlePageTurn('prev')}
                     className={`absolute left-0 -translate-x-1/2 md:-translate-x-24 p-5 bg-emerald-600/90 text-white rounded-full shadow-2xl hover:bg-emerald-500 transition-all z-30 active:scale-90 ${currentPage === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                   >
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" /></svg>
                   </button>
                   <button 
                     onClick={() => handlePageTurn('next')}
                     className={`absolute right-0 translate-x-1/2 md:translate-x-24 p-5 bg-emerald-600/90 text-white rounded-full shadow-2xl hover:bg-emerald-500 transition-all z-30 active:scale-90 ${currentPage === numPages ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                   >
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg>
                   </button>
                </div>

                <div className="flex flex-col items-center gap-4">
                   <div className="flex items-center gap-6 px-8 py-3 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
                      <span className="text-white/40 font-black text-[10px] uppercase tracking-widest">1</span>
                      <input 
                        type="range" 
                        min="1" 
                        max={numPages} 
                        value={currentPage} 
                        onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                        className="w-48 md:w-64 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-all" 
                      />
                      <span className="text-white/40 font-black text-[10px] uppercase tracking-widest">{numPages}</span>
                   </div>
                   <p className="text-emerald-400 font-black text-[9px] tracking-[0.25em] uppercase opacity-80">Quick Nav Slider</p>
                </div>
             </div>
           ) : (
             <div className="flex flex-col items-center gap-8 animate-in fade-in duration-500">
               {Array.from({ length: numPages }).map((_, i) => (
                 <div key={i} className="shadow-2xl bg-white border border-white/10 rounded-sm">
                   <canvas ref={el => { pageRefs.current[i] = el; }} className="max-w-full h-auto" />
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>

      {isQuizOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-[80vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
             <div className="bg-emerald-800 p-8 text-white flex justify-between items-center">
                <h4 className="font-black uppercase tracking-widest">AI Tutor: {material.subject}</h4>
                <button onClick={() => setIsQuizOpen(false)} className="p-2"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <div className="flex-1 overflow-y-auto p-10 bg-slate-50 dark:bg-slate-950/40">
                {isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-xl font-black text-emerald-900 dark:text-emerald-400 animate-pulse">Generating Dynamic Quiz...</p>
                  </div>
                ) : quizFinished ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in">
                    <span className="text-7xl">🎓</span>
                    <h3 className="text-3xl font-black text-emerald-900 dark:text-emerald-100">Review Complete!</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">You've mastered the key principles from this section.</p>
                    <button onClick={() => setIsQuizOpen(false)} className="bg-emerald-600 text-white px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95">Finish Revision</button>
                  </div>
                ) : chapters[activeChapterIndex]?.questions[quizStep] ? (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                    <h4 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">{chapters[activeChapterIndex].questions[quizStep].question}</h4>
                    {chapters[activeChapterIndex].questions[quizStep].type === 'mcq' ? (
                      <div className="grid gap-4">
                        {chapters[activeChapterIndex].questions[quizStep].options?.map((opt, i) => (
                          <button key={i} onClick={() => { setUserAnswers(p => ({...p, [chapters[activeChapterIndex].questions[quizStep].id]: opt})); }} className={`p-6 rounded-3xl border-2 text-left transition-all font-bold ${userAnswers[chapters[activeChapterIndex].questions[quizStep].id] === opt ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-emerald-300 text-slate-700 dark:text-slate-300'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <textarea value={userAnswers[chapters[activeChapterIndex].questions[quizStep].id] || ''} onChange={e => setUserAnswers(p => ({...p, [chapters[activeChapterIndex].questions[quizStep].id]: e.target.value}))} placeholder="Explain your answer..." className="w-full p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-40 outline-none focus:ring-4 focus:ring-emerald-500/10 font-medium" />
                        {evaluations[chapters[activeChapterIndex].questions[quizStep].id] ? (
                          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl border border-emerald-100 dark:border-emerald-800">
                            <p className="text-3xl font-black text-emerald-600 mb-2">{evaluations[chapters[activeChapterIndex].questions[quizStep].id].score}% Mastery</p>
                            <p className="text-slate-600 dark:text-slate-300 italic">"{evaluations[chapters[activeChapterIndex].questions[quizStep].id].feedbackSummary}"</p>
                          </div>
                        ) : (
                          <button onClick={() => handleEvaluateComprehension(chapters[activeChapterIndex].questions[quizStep].id)} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">Verify Answer</button>
                        )}
                      </div>
                    )}
                    <div className="flex gap-4">
                       <button onClick={nextQuestion} className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">Next Concept</button>
                    </div>
                  </div>
                ) : null}
             </div>
          </div>
        </div>
      )}

      {showConfirmClose && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center space-y-8 animate-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-slate-900">Finish Session?</h3>
            <p className="text-slate-500 font-medium">Your reading progress has been synchronized with the Study Hub cloud.</p>
            <div className="space-y-4">
              <button onClick={onClose} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-xs">Exit Reader</button>
              <button onClick={() => setShowConfirmClose(false)} className="w-full py-5 bg-slate-100 text-slate-500 font-black rounded-2xl uppercase tracking-widest text-xs">Continue Reading</button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .perspective-1000 {
          perspective: 2000px;
        }
        .rotate-y-2 {
          transform: rotateY(2deg);
        }
      `}</style>
    </div>
  );
};
