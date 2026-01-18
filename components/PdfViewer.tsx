
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
  // Default to 'native' for non-digital files for the fastest 'quick-start' experience
  const [viewMode, setViewMode] = useState<'scroll' | 'flip' | 'native'>(material.isDigital ? 'scroll' : 'native');
  const lang = localStorage.getItem('study_hub_chat_lang') || 'English';
  
  const t = {
    flipbook: lang === 'English' ? 'Flip' : 'Lapansi',
    scroll: lang === 'English' ? 'Scroll' : 'Mndandanda',
    native: lang === 'English' ? 'Native' : 'Zenizeni',
    loading: lang === 'English' ? 'Optimizing View...' : 'Tikonza Bukuli...',
    next: lang === 'English' ? 'Next' : 'Ena',
    prev: lang === 'English' ? 'Prev' : "M'mbuyo",
    finish: lang === 'English' ? 'Finish Session?' : 'Kodi Mwamaliza?',
    resume: lang === 'English' ? 'Resume Reader' : 'Pitirizani Kuwerenga',
    nativeWarning: lang === 'English' ? 'Optimized for quick reading and searching.' : 'Zakonzedwa kuti muwerenge mofulumira.'
  };

  // PDF Rendering States
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(currentProgress?.progressPercent ? Math.max(1, Math.round((currentProgress.progressPercent / 100) * numPages)) : 1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isRenderLoading, setIsRenderLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPageRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const flipPageRef = useRef<HTMLCanvasElement | null>(null);
  const currentRenderTask = useRef<any>(null); // Reference to cancel stale renders

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

  // Google Drive Embed Helper
  const getEmbedUrl = (url: string) => {
    if (url.includes('drive.google.com') && (url.includes('id=') || url.includes('/d/'))) {
      const idMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
      }
    }
    return url;
  };

  // Memory cleanup and task cancellation
  const cleanupRender = () => {
    if (currentRenderTask.current) {
      currentRenderTask.current.cancel();
      currentRenderTask.current = null;
    }
  };

  // Load PDF with optimized worker management
  useEffect(() => {
    if (material.isDigital) {
      setIsRenderLoading(false);
      return;
    }

    let isMounted = true;
    const loadPdf = async () => {
      try {
        setIsRenderLoading(true);
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const loadingTask = pdfjsLib.getDocument({
          url: material.fileUrl,
          disableAutoFetch: true, // Optimizes for sequential reading
          disableStream: false
        });
        const pdf = await loadingTask.promise;
        if (isMounted) {
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setIsRenderLoading(false);
        }
      } catch (err) {
        console.error("Quick Load Failed:", err);
        if (isMounted) {
          setIsRenderLoading(false);
          setViewMode('native'); // Auto-fallback to native for speed if custom rendering fails
        }
      }
    };
    loadPdf();

    return () => {
      isMounted = false;
      cleanupRender();
    };
  }, [material]);

  const renderPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement, scale: number = zoom) => {
    if (!pdfDoc || !canvas) return;
    
    cleanupRender(); // Cancel existing render task for speed

    try {
      const page = await pdfDoc.getPage(pageNum);
      const isMobile = window.innerWidth < 768;
      const deviceScale = isMobile ? 1.4 : 1.8; 
      const viewport = page.getViewport({ scale: scale * deviceScale });
      const context = canvas.getContext('2d', { alpha: false }); // Performance optimization
      
      if (!context) return;

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        enableWebGL: true // Speed boost if available
      };

      currentRenderTask.current = page.render(renderContext);
      await currentRenderTask.current.promise;
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error(`Page ${pageNum} Render Error:`, err);
      }
    }
  }, [pdfDoc, zoom]);

  // View mode effect
  useEffect(() => {
    if (pdfDoc && !isRenderLoading) {
      if (viewMode === 'scroll') {
        // Simple virtualized rendering: render visible first then others
        scrollPageRefs.current.forEach((canvas, idx) => {
          if (canvas && idx === currentPage - 1) renderPage(idx + 1, canvas);
        });
      } else if (viewMode === 'flip' && flipPageRef.current) {
        renderPage(currentPage, flipPageRef.current);
      }
    }
  }, [currentPage, viewMode, pdfDoc, isRenderLoading, renderPage]);

  const handleScroll = () => {
    if (!containerRef.current || material.isDigital || viewMode !== 'scroll') return;
    const { scrollTop, clientHeight } = containerRef.current;
    const scrollMiddle = scrollTop + (clientHeight / 2);
    let cumulativeHeight = 0;
    
    for (let i = 0; i < scrollPageRefs.current.length; i++) {
      const canvas = scrollPageRefs.current[i];
      if (canvas) {
        cumulativeHeight += canvas.offsetHeight + 24;
        if (scrollMiddle < cumulativeHeight) {
          if (currentPage !== i + 1) {
            setCurrentPage(i + 1);
            // Render on scroll if not yet rendered
            if (canvas.width === 0) renderPage(i + 1, canvas);
          }
          break;
        }
      }
    }
  };

  const handlePageTurn = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
    } else if (direction === 'prev' && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setIsQuizOpen(true);
    setQuizFinished(false);
    try {
      const context = material.isDigital ? material.content || "" : `Revision for ${material.title}`;
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

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-300">
      <header className="bg-emerald-900 text-white flex-none flex items-center justify-between px-4 py-3 md:px-8 shadow-2xl z-20">
        <div className="flex items-center min-w-0 flex-1">
          <button onClick={() => setShowConfirmClose(true)} className="p-2.5 hover:bg-white/10 rounded-2xl transition-all mr-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div className="min-w-0">
            <h4 className="font-black text-sm md:text-lg truncate tracking-tight">{material.title}</h4>
            <div className="flex items-center gap-2">
               <p className="hidden md:block text-[10px] uppercase font-bold opacity-60 tracking-widest">{material.isDigital ? 'Digital Resource' : `Page ${currentPage} of ${numPages}`}</p>
               {!material.isDigital && (
                 <div className="flex bg-black/30 rounded-xl p-0.5 border border-white/10">
                   <button onClick={() => setViewMode('native')} className={`px-2.5 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${viewMode === 'native' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40'}`}>{t.native}</button>
                   <button onClick={() => setViewMode('flip')} className={`px-2.5 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${viewMode === 'flip' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40'}`}>{t.flipbook}</button>
                   <button onClick={() => setViewMode('scroll')} className={`px-2.5 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${viewMode === 'scroll' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40'}`}>{t.scroll}</button>
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <button onClick={handleGenerateQuiz} className="bg-purple-600 hover:bg-purple-700 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">✨ AI Quiz</button>
          <button onClick={() => setShowConfirmClose(true)} className="p-3 bg-red-500/20 text-red-100 rounded-2xl hover:bg-red-500/30 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </header>

      <div ref={containerRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto bg-[#0a0b0e] custom-scrollbar relative ${viewMode !== 'scroll' ? 'overflow-hidden' : ''}`}>
        <div className={`w-full h-full max-w-7xl mx-auto ${viewMode === 'scroll' ? 'p-4 md:p-12 pb-40' : 'flex items-center justify-center'}`}>
           {isRenderLoading ? (
             <div className="w-full max-w-3xl flex flex-col gap-6 p-10 animate-pulse">
                <div className="h-8 bg-slate-800 rounded-full w-3/4"></div>
                <div className="aspect-[3/4] bg-slate-800 rounded-[2rem] w-full"></div>
                <div className="h-4 bg-slate-800 rounded-full w-1/2"></div>
                <div className="h-4 bg-slate-800 rounded-full w-2/3"></div>
             </div>
           ) : material.isDigital ? (
             <div className="bg-white dark:bg-slate-900 p-8 md:p-20 rounded-[3rem] shadow-2xl prose prose-slate dark:prose-invert max-w-4xl mx-auto text-slate-800 dark:text-slate-200 animate-in fade-in duration-500">
                <div className="whitespace-pre-wrap font-medium leading-relaxed selection:bg-emerald-100 dark:selection:bg-emerald-900/50" dangerouslySetInnerHTML={{ 
                  __html: material.content?.replace(/# (.*)/g, '<h1 class="text-4xl font-black text-emerald-800 dark:text-emerald-400 mb-8">$1</h1>')
                                            .replace(/## (.*)/g, '<h2 class="text-2xl font-black text-slate-900 dark:text-white mt-12 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">$1</h2>')
                                            .replace(/### (.*)/g, '<h3 class="text-xl font-bold text-emerald-700 dark:text-emerald-500 mt-8 mb-4">$1</h3>')
                                            .replace(/\*\*(.*)\*\*/g, '<strong class="font-black text-slate-900 dark:text-white">$1</strong>')
                                            .replace(/- (.*)/g, '<li class="ml-6 mb-2 list-disc">$1</li>') || "" 
                }} />
             </div>
           ) : viewMode === 'native' ? (
             <div className="w-full h-full relative flex flex-col items-center justify-center bg-slate-950 animate-in fade-in duration-500">
                <iframe 
                  src={getEmbedUrl(material.fileUrl)} 
                  className="w-full h-full border-none bg-slate-900"
                  title={material.title}
                  allow="autoplay"
                />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl px-8 py-3 rounded-full border border-white/10 pointer-events-none shadow-2xl flex items-center gap-3">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                   <p className="text-[10px] text-white/80 font-black uppercase tracking-[0.2em]">{t.nativeWarning}</p>
                </div>
             </div>
           ) : viewMode === 'flip' ? (
             <div className="w-full h-full flex flex-col items-center justify-center gap-12 animate-in zoom-in-95 duration-500 relative">
                <div className="relative group perspective-2000 flex items-center justify-center select-none">
                   <div className="relative bg-white shadow-[0_60px_120px_-20px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden border border-slate-200/20 transform transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] hover:scale-[1.02]">
                      <canvas key={currentPage} ref={flipPageRef} className="max-w-[90vw] md:max-w-[70vw] lg:max-w-[48vw] h-auto animate-in fade-in slide-in-from-right-2 duration-300" />
                      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/15 to-transparent pointer-events-none border-l-[8px] border-slate-100/30"></div>
                      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-black/5 to-transparent pointer-events-none"></div>
                   </div>
                   
                   <button onClick={() => handlePageTurn('prev')} disabled={currentPage === 1} className={`absolute left-0 -translate-x-1/2 md:-translate-x-32 p-6 bg-emerald-600/95 text-white rounded-full shadow-2xl hover:bg-emerald-500 transition-all z-30 active:scale-90 border-4 border-emerald-400/30 ${currentPage === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" /></svg></button>
                   <button onClick={() => handlePageTurn('next')} disabled={currentPage === numPages} className={`absolute right-0 translate-x-1/2 md:translate-x-32 p-6 bg-emerald-600/95 text-white rounded-full shadow-2xl hover:bg-emerald-500 transition-all z-30 active:scale-90 border-4 border-emerald-400/30 ${currentPage === numPages ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg></button>
                </div>
                
                <div className="flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4">
                   <div className="flex items-center gap-6 px-12 py-5 bg-white/5 backdrop-blur-3xl rounded-[2rem] border border-white/10 shadow-2xl">
                      <span className="text-white/40 font-black text-[11px] uppercase tracking-widest">1</span>
                      <input type="range" min="1" max={numPages} value={currentPage} onChange={(e) => setCurrentPage(parseInt(e.target.value))} className="w-48 md:w-96 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-all hover:accent-emerald-400" />
                      <span className="text-white/40 font-black text-[11px] uppercase tracking-widest">{numPages}</span>
                   </div>
                </div>
             </div>
           ) : (
             <div className="flex flex-col items-center gap-12 animate-in fade-in duration-500 max-w-4xl mx-auto">
               {Array.from({ length: numPages }).map((_, i) => (
                 <div key={i} className="shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] bg-white border border-slate-200/10 rounded-sm transform transition-all hover:scale-[1.01]">
                   <canvas ref={el => { scrollPageRefs.current[i] = el; }} className="max-w-full h-auto" />
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>

      {isQuizOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-[85vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-400 border border-white/10">
             <div className="bg-emerald-800 p-8 text-white flex justify-between items-center flex-none">
                <div>
                   <h4 className="font-black uppercase tracking-widest text-[10px] opacity-60 mb-1">AI Smart Tutor</h4>
                   <h2 className="text-2xl font-black tracking-tight">{material.subject} Revision</h2>
                </div>
                <button onClick={() => setIsQuizOpen(false)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <div className="flex-1 overflow-y-auto p-10 bg-slate-50 dark:bg-slate-950/40 custom-scrollbar">
                {isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                    <div className="relative">
                       <div className="w-20 h-20 border-[6px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                       <div className="absolute inset-0 flex items-center justify-center text-3xl">🧠</div>
                    </div>
                    <p className="text-xl font-black text-emerald-900 dark:text-emerald-400 animate-pulse tracking-tight uppercase tracking-widest">Analyzing Book Content...</p>
                  </div>
                ) : quizFinished ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in">
                    <span className="text-[10rem]">🎓</span>
                    <h3 className="text-4xl font-black text-emerald-900 dark:text-emerald-100">Section Mastered!</h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs mx-auto">Great job! Your comprehension of these concepts is recorded in your activity log.</p>
                    <button onClick={() => setIsQuizOpen(false)} className="bg-emerald-600 text-white px-16 py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all">Continue Reading</button>
                  </div>
                ) : chapters[activeChapterIndex]?.questions[quizStep] ? (
                  <div className="space-y-10 animate-in slide-in-from-right-4">
                    <div className="space-y-4">
                       <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-800">Concept {quizStep + 1}</span>
                       <h4 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">{chapters[activeChapterIndex].questions[quizStep].question}</h4>
                    </div>
                    {chapters[activeChapterIndex].questions[quizStep].type === 'mcq' ? (
                      <div className="grid gap-4">
                        {chapters[activeChapterIndex].questions[quizStep].options?.map((opt, i) => (
                          <button key={i} onClick={() => setUserAnswers(p => ({...p, [chapters[activeChapterIndex].questions[quizStep].id]: opt}))} className={`p-6 rounded-3xl border-2 text-left transition-all font-bold group flex justify-between items-center ${userAnswers[chapters[activeChapterIndex].questions[quizStep].id] === opt ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl scale-[1.02]' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-emerald-300 text-slate-700 dark:text-slate-300'}`}>
                            <span className="flex-1">{opt}</span>
                            <div className={`w-6 h-6 rounded-full border-2 transition-all ${userAnswers[chapters[activeChapterIndex].questions[quizStep].id] === opt ? 'bg-white border-white' : 'border-slate-200'}`}></div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <textarea value={userAnswers[chapters[activeChapterIndex].questions[quizStep].id] || ''} onChange={e => setUserAnswers(p => ({...p, [chapters[activeChapterIndex].questions[quizStep].id]: e.target.value}))} placeholder="Briefly explain your understanding..." className="w-full p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-48 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-medium text-lg shadow-inner" />
                        {evaluations[chapters[activeChapterIndex].questions[quizStep].id] ? (
                          <div className="p-8 bg-indigo-50 dark:bg-indigo-950/30 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-800 animate-in fade-in">
                            <p className="text-3xl font-black text-indigo-600 mb-4">{evaluations[chapters[activeChapterIndex].questions[quizStep].id].score}% Accuracy</p>
                            <p className="text-slate-600 dark:text-slate-300 italic font-medium">"{evaluations[chapters[activeChapterIndex].questions[quizStep].id].feedbackSummary}"</p>
                          </div>
                        ) : (
                          <button onClick={() => handleEvaluateComprehension(chapters[activeChapterIndex].questions[quizStep].id)} disabled={!userAnswers[chapters[activeChapterIndex].questions[quizStep].id] || isEvaluating} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black uppercase text-xs tracking-[0.2em] shadow-2xl disabled:opacity-50 active:scale-95 transition-all">Verify Understanding</button>
                        )}
                      </div>
                    )}
                    <div className="flex pt-6">
                       <button onClick={() => { const currentQuestions = chapters[activeChapterIndex]?.questions || []; if (quizStep < currentQuestions.length - 1) { setQuizStep(quizStep + 1); } else if (activeChapterIndex < chapters.length - 1) { setActiveChapterIndex(activeChapterIndex + 1); setQuizStep(0); } else { setQuizFinished(true); } }} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all">Next Concept</button>
                    </div>
                  </div>
                ) : null}
             </div>
          </div>
        </div>
      )}

      {showConfirmClose && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 max-w-sm w-full text-center space-y-10 animate-in zoom-in duration-300 shadow-2xl border border-white/10">
            <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/30 rounded-[2.5rem] flex items-center justify-center text-5xl mx-auto shadow-inner">🏁</div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{t.finish}</h3>
            <div className="space-y-4">
              <button onClick={onClose} className="w-full py-6 bg-emerald-600 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest text-[11px] active:scale-95 transition-all">End Session</button>
              <button onClick={() => setShowConfirmClose(false)} className="w-full py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black rounded-3xl uppercase tracking-widest text-[11px] transition-all hover:bg-slate-200">{t.resume}</button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .perspective-2000 { perspective: 3000px; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #059669; border-radius: 10px; border: 2px solid #000; }
      `}</style>
    </div>
  );
};
