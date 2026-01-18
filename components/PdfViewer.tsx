
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  // Default to 'flip' for the interactive book experience
  const [viewMode, setViewMode] = useState<'flip' | 'native'>('flip');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // AI Sidebar States
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  
  const lang = localStorage.getItem('study_hub_chat_lang') || 'English';
  
  const t = {
    flipbook: lang === 'English' ? 'Interactive Flip' : 'Lapansi',
    native: lang === 'English' ? 'Original PDF' : 'Zenizeni',
    loading: lang === 'English' ? 'Preparing Interactive Book...' : 'Tikukonza Bukuli...',
    next: lang === 'English' ? 'Next' : 'Ena',
    prev: lang === 'English' ? 'Prev' : "M'mbuyo",
    finish: lang === 'English' ? 'Close Reader?' : 'Kodi Mwamaliza?',
    resume: lang === 'English' ? 'Keep Reading' : 'Pitirizani Kuwerenga',
    tts: lang === 'English' ? 'Read Page' : 'Mverani',
    stopTts: lang === 'English' ? 'Stop' : 'Imani',
    sidebar: lang === 'English' ? 'Page List' : 'Mndandanda',
    explain: lang === 'English' ? 'AI Assistant' : 'Wothandiza wa AI',
    simplifier: lang === 'English' ? 'Explain Page' : 'Masulirani Tsamba',
  };

  // PDF & Text Content States
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(currentProgress?.progressPercent ? Math.max(1, Math.round((currentProgress.progressPercent / 100) * numPages)) : 1);
  const [isRenderLoading, setIsRenderLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [extractedPages, setExtractedPages] = useState<Record<number, string>>({});
  const [extractionProgress, setExtractionProgress] = useState(0);
  
  const flipPageRef = useRef<HTMLCanvasElement | null>(null);
  const currentRenderTask = useRef<any>(null);
  const extractionAbortRef = useRef<boolean>(false);

  // AI Quiz States
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [chapters, setChapters] = useState<QuizChapter[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [quizStep, setQuizStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
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

  const cleanupRender = () => {
    if (currentRenderTask.current) {
      currentRenderTask.current.cancel();
      currentRenderTask.current = null;
    }
  };

  // Background Text Extraction for AI features
  const extractTextProgressively = async (pdf: any) => {
    for (let i = 1; i <= pdf.numPages; i++) {
      if (extractionAbortRef.current) break;
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      const pageText = strings.join(' ');
      
      setExtractedPages(prev => ({ ...prev, [i]: pageText }));
      setExtractionProgress(Math.round((i / pdf.numPages) * 100));
      
      if (i % 3 === 0) await new Promise(resolve => setTimeout(resolve, 5));
    }
  };

  useEffect(() => {
    if (material.isDigital) {
      setExtractedPages({ 1: material.content || "" });
      setIsRenderLoading(false);
      setNumPages(1);
      return;
    }

    let isMounted = true;
    extractionAbortRef.current = false;
    
    const loadPdf = async () => {
      try {
        setIsRenderLoading(true);
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const loadingTask = pdfjsLib.getDocument({
          url: material.fileUrl,
          disableAutoFetch: true,
          disableStream: false
        });
        const pdf = await loadingTask.promise;
        if (isMounted) {
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setIsRenderLoading(false);
          extractTextProgressively(pdf);
        }
      } catch (err) {
        console.error("PDF Interactive Load Failed:", err);
        if (isMounted) setIsRenderLoading(false);
      }
    };
    loadPdf();

    return () => {
      isMounted = false;
      extractionAbortRef.current = true;
      cleanupRender();
      window.speechSynthesis.cancel();
    };
  }, [material]);

  const renderCanvasPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement, scale = 2.0) => {
    if (!pdfDoc || !canvas) return;
    cleanupRender();
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      currentRenderTask.current = page.render({ canvasContext: context, viewport: viewport });
      await currentRenderTask.current.promise;
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') console.error(err);
    }
  }, [pdfDoc]);

  useEffect(() => {
    if (viewMode === 'flip' && flipPageRef.current && pdfDoc) {
      renderCanvasPage(currentPage, flipPageRef.current);
      setAiExplanation(null); // Reset AI sidebar for new page
    }
  }, [currentPage, viewMode, pdfDoc, renderCanvasPage]);

  const handleExplainPage = async () => {
    const text = extractedPages[currentPage];
    if (!text) return;

    setIsExplaining(true);
    setAiExplanation(null);
    try {
      const result = await aiService.explainPage(text, lang);
      setAiExplanation(result);
    } catch (err) {
      setAiExplanation("AI Assistant is currently offline. Please try again later.");
    } finally {
      setIsExplaining(false);
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToRead = extractedPages[currentPage] || "";
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsGeneratingQuiz(true);
    setIsQuizOpen(true);
    setQuizFinished(false);
    try {
      const context = Object.values(extractedPages).slice(0, 8).join(' ').slice(0, 6000);
      const data = await aiService.generateQuiz(material.title, material.subject, material.grade, context);
      setChapters(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const readingProgress = (currentPage / numPages) * 100;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-300">
      
      {/* Header */}
      <header className="bg-emerald-900 text-white flex-none flex items-center justify-between px-4 py-3 md:px-8 shadow-2xl z-[110]">
        <div className="flex items-center min-w-0 flex-1">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-white/10 rounded-2xl transition-all mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
          </button>
          <div className="min-w-0">
            <h4 className="font-black text-sm md:text-lg truncate tracking-tight">{material.title}</h4>
            <div className="flex items-center gap-2">
               <div className="flex bg-black/30 rounded-xl p-0.5 border border-white/10">
                 <button onClick={() => setViewMode('flip')} className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${viewMode === 'flip' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40'}`}>{t.flipbook}</button>
                 {!material.isDigital && (
                   <button onClick={() => setViewMode('native')} className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${viewMode === 'native' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40'}`}>{t.native}</button>
                 )}
               </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <button onClick={handleGenerateQuiz} className="bg-purple-600 hover:bg-purple-700 text-white px-4 md:px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg hidden sm:block">✨ Smart Quiz</button>
          <button onClick={() => setShowConfirmClose(true)} className="p-2.5 bg-red-500/20 text-red-100 rounded-xl hover:bg-red-500/30 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar */}
        <div className={`absolute lg:relative z-[100] h-full bg-slate-900 border-r border-white/5 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
          <div className="p-8 h-full flex flex-col">
            <h3 className="text-white font-black uppercase tracking-[0.2em] text-xs mb-8 flex items-center gap-3">
              <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
              {t.sidebar}
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
              {Array.from({ length: numPages }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => { setCurrentPage(i + 1); setIsSidebarOpen(window.innerWidth > 1024); }}
                  className={`w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between group ${currentPage === i + 1 ? 'bg-emerald-600 text-white shadow-xl' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className="text-[11px] font-black uppercase tracking-wider">Page {i + 1}</span>
                  {extractedPages[i + 1] && <div className={`w-1.5 h-1.5 rounded-full ${currentPage === i + 1 ? 'bg-white' : 'bg-emerald-500 opacity-0 group-hover:opacity-100'}`} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Reader Surface */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-900">
          <div className={`flex-1 overflow-y-auto custom-scrollbar relative flex items-center justify-center p-4 md:p-8`}>
            {isRenderLoading ? (
               <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                  <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">{t.loading}</p>
               </div>
            ) : viewMode === 'flip' ? (
               <div className="w-full h-full flex flex-col items-center justify-center gap-8 relative max-w-5xl mx-auto">
                  <div className="relative group/book">
                     <div className="bg-white shadow-[0_40px_80px_-15px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden border border-slate-200 transition-transform duration-500 hover:scale-[1.01]">
                        <canvas ref={flipPageRef} className="max-w-[95vw] lg:max-w-[65vw] h-auto block" />
                        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
                     </div>
                     
                     <button 
                       onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                       disabled={currentPage === 1} 
                       className="absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 p-4 bg-emerald-600 text-white rounded-full shadow-2xl active:scale-90 transition-all disabled:opacity-0 z-20 hover:bg-emerald-700"
                     >
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" /></svg>
                     </button>
                     
                     <button 
                       onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} 
                       disabled={currentPage === numPages} 
                       className="absolute right-0 translate-x-1/2 top-1/2 -translate-y-1/2 p-4 bg-emerald-600 text-white rounded-full shadow-2xl active:scale-90 transition-all disabled:opacity-0 z-20 hover:bg-emerald-700"
                     >
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg>
                     </button>
                  </div>

                  {/* Progress Indicator */}
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl px-10 py-3 rounded-full border border-slate-200 dark:border-white/10 shadow-xl flex items-center gap-6">
                     <span className="text-slate-500 dark:text-white/60 font-black text-[10px] uppercase tracking-widest tabular-nums">Page {currentPage} of {numPages}</span>
                     <div className="w-32 md:w-64 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${readingProgress}%` }} />
                     </div>
                  </div>
               </div>
            ) : (
               <div className="w-full h-full min-h-[80vh] relative rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
                  <iframe src={getEmbedUrl(material.fileUrl)} className="w-full h-full border-none bg-slate-900" title={material.title} allow="autoplay" />
               </div>
            )}
          </div>
        </div>

        {/* AI Assistant Sidebar */}
        <div className={`absolute lg:relative right-0 z-[100] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/5 transition-all duration-300 ease-in-out flex flex-col ${aiExplanation || isExplaining ? 'w-80 lg:w-96' : 'w-0 overflow-hidden'}`}>
           <div className="p-8 h-full flex flex-col">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-xs flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                    {t.explain}
                 </h3>
                 <button onClick={() => setAiExplanation(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
                 {isExplaining ? (
                   <div className="space-y-6 animate-pulse">
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4"></div>
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                      <div className="flex justify-center py-10">
                        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                      </div>
                   </div>
                 ) : (
                   <div className="animate-in fade-in duration-500">
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-3xl border border-purple-100 dark:border-purple-800 mb-6">
                         <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-4">Page {currentPage} Analysis</p>
                         <div className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap italic">
                            {aiExplanation}
                         </div>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Curriculum Support Powered by Gemini</p>
                      </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Floating Interactive Dock */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[150] flex gap-3 animate-in slide-in-from-bottom-10 duration-700">
         <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl px-6 py-4 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/20 dark:border-white/5 flex items-center gap-4">
            
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-4 rounded-2xl transition-all ${isSidebarOpen ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`} title={t.sidebar}>
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
            </button>

            <div className="w-px h-10 bg-slate-200 dark:bg-slate-800 mx-1" />

            <button onClick={handleExplainPage} disabled={isExplaining} className={`group flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${isExplaining ? 'bg-purple-100 text-purple-400' : 'bg-purple-600 text-white shadow-xl hover:bg-purple-700 active:scale-95'}`}>
               <span className="text-xl leading-none">🧠</span>
               <span className="font-black uppercase text-[10px] tracking-widest hidden md:inline">{isExplaining ? 'Thinking...' : t.simplifier}</span>
            </button>

            <button onClick={toggleSpeech} className={`p-4 rounded-2xl transition-all ${isSpeaking ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500'}`} title={t.tts}>
               <span className="text-xl leading-none">{isSpeaking ? '🔊' : '🔈'}</span>
            </button>

            <div className="w-px h-10 bg-slate-200 dark:bg-slate-800 mx-1" />

            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800">
               <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="text-slate-400 hover:text-emerald-500 transition-all active:scale-75"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg></button>
               <span className="text-[12px] font-black text-slate-900 dark:text-white w-14 text-center tabular-nums">{currentPage} / {numPages}</span>
               <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} className="text-slate-400 hover:text-emerald-500 transition-all active:scale-75"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg></button>
            </div>
         </div>
      </div>

      {isQuizOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-[85vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 animate-in zoom-in duration-300">
             <div className="bg-emerald-800 p-8 text-white flex justify-between items-center flex-none">
                <div>
                   <h4 className="font-black uppercase tracking-widest text-[10px] opacity-60 mb-1">Assessment Tool</h4>
                   <h2 className="text-2xl font-black tracking-tight">{material.subject} Checkup</h2>
                </div>
                <button onClick={() => setIsQuizOpen(false)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <div className="flex-1 overflow-y-auto p-10 bg-slate-50 dark:bg-slate-950/40 custom-scrollbar">
                {isGeneratingQuiz ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 border-[6px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-xl font-black text-emerald-900 dark:text-emerald-400 animate-pulse tracking-tight uppercase tracking-widest">Generating Assessment...</p>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                     {chapters[activeChapterIndex]?.questions[quizStep] ? (
                       <div className="space-y-8">
                          <div className="space-y-4">
                             <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-800">Q{quizStep + 1}</span>
                             <h4 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">{chapters[activeChapterIndex].questions[quizStep].question}</h4>
                          </div>
                          <div className="grid gap-4">
                            {chapters[activeChapterIndex].questions[quizStep].options?.map((opt, i) => (
                              <button key={i} onClick={() => setUserAnswers(p => ({...p, [chapters[activeChapterIndex].questions[quizStep].id]: opt}))} className={`p-6 rounded-3xl border-2 text-left transition-all font-bold flex justify-between items-center ${userAnswers[chapters[activeChapterIndex].questions[quizStep].id] === opt ? 'bg-emerald-600 text-white border-emerald-600 shadow-xl' : 'bg-white dark:bg-slate-800 border-slate-100 hover:border-emerald-300 text-slate-700 dark:text-slate-300'}`}>
                                <span>{opt}</span>
                                <div className={`w-6 h-6 rounded-full border-2 ${userAnswers[chapters[activeChapterIndex].questions[quizStep].id] === opt ? 'bg-white border-white' : 'border-slate-200'}`}></div>
                              </button>
                            ))}
                          </div>
                          <button onClick={() => { if (quizStep < chapters[activeChapterIndex].questions.length - 1) setQuizStep(p => p + 1); else if (activeChapterIndex < chapters.length - 1) { setActiveChapterIndex(p => p + 1); setQuizStep(0); } else setQuizFinished(true); }} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all mt-10">Continue Progress</button>
                       </div>
                     ) : quizFinished && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20">
                          <span className="text-[8rem]">🎓</span>
                          <h3 className="text-4xl font-black text-emerald-900 dark:text-emerald-100">Session Complete!</h3>
                          <button onClick={() => setIsQuizOpen(false)} className="bg-emerald-600 text-white px-16 py-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all">Resume Reading</button>
                        </div>
                     )}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {showConfirmClose && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 max-w-sm w-full text-center space-y-10 animate-in zoom-in duration-300 shadow-2xl border border-white/10">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{t.finish}</h3>
            <div className="space-y-4">
              <button onClick={onClose} className="w-full py-6 bg-emerald-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[11px] active:scale-95 transition-all">Close Session</button>
              <button onClick={() => setShowConfirmClose(false)} className="w-full py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black rounded-2xl uppercase tracking-widest text-[11px] transition-all hover:bg-slate-200">{t.resume}</button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #059669; border-radius: 10px; }
      `}</style>
    </div>
  );
};
