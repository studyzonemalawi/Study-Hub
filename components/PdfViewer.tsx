
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

type ReaderTheme = 'light' | 'dark' | 'sepia';

export const PdfViewer: React.FC<MaterialViewerProps> = ({ 
  material, 
  userId, 
  onClose, 
  onUpdateStatus,
  currentProgress 
}) => {
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  // Default to 'web' for the best interactive experience
  const [viewMode, setViewMode] = useState<'scroll' | 'flip' | 'native' | 'web'>(material.isDigital ? 'web' : 'web');
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('light');
  const [fontSize, setFontSize] = useState(18);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lang = localStorage.getItem('study_hub_chat_lang') || 'English';
  
  const t = {
    flipbook: lang === 'English' ? 'Flip' : 'Lapansi',
    scroll: lang === 'English' ? 'Scroll' : 'Mndandanda',
    native: lang === 'English' ? 'Native' : 'Zenizeni',
    web: lang === 'English' ? 'Web Mode' : 'Mwalemba',
    loading: lang === 'English' ? 'Converting to Web Page...' : 'Tikupanga ngati Tsamba...',
    next: lang === 'English' ? 'Next' : 'Ena',
    prev: lang === 'English' ? 'Prev' : "M'mbuyo",
    finish: lang === 'English' ? 'Finish Session?' : 'Kodi Mwamaliza?',
    resume: lang === 'English' ? 'Resume Reader' : 'Pitirizani Kuwerenga',
    tts: lang === 'English' ? 'Read Aloud' : 'Mverani',
    stopTts: lang === 'English' ? 'Stop' : 'Imani',
  };

  // PDF Rendering & Extraction States
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(currentProgress?.progressPercent ? Math.max(1, Math.round((currentProgress.progressPercent / 100) * numPages)) : 1);
  const [isRenderLoading, setIsRenderLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [extractedText, setExtractedText] = useState<string[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const flipPageRef = useRef<HTMLCanvasElement | null>(null);
  const currentRenderTask = useRef<any>(null);

  // AI Quiz States
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

  const cleanupRender = () => {
    if (currentRenderTask.current) {
      currentRenderTask.current.cancel();
      currentRenderTask.current = null;
    }
  };

  // Text Extraction for Web Mode
  const extractAllText = async (pdf: any) => {
    const pagesText: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      pagesText.push(strings.join(' '));
    }
    setExtractedText(pagesText);
  };

  useEffect(() => {
    if (material.isDigital) {
      setExtractedText([material.content || ""]);
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
          disableAutoFetch: true,
          disableStream: false
        });
        const pdf = await loadingTask.promise;
        if (isMounted) {
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          await extractAllText(pdf);
          setIsRenderLoading(false);
        }
      } catch (err) {
        console.error("Quick Load Failed:", err);
        if (isMounted) {
          setIsRenderLoading(false);
          setViewMode('native');
        }
      }
    };
    loadPdf();

    return () => {
      isMounted = false;
      cleanupRender();
      window.speechSynthesis.cancel();
    };
  }, [material]);

  const renderCanvasPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement) => {
    if (!pdfDoc || !canvas) return;
    cleanupRender();
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.8 });
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
    }
  }, [currentPage, viewMode, pdfDoc, renderCanvasPage]);

  // Text to Speech
  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToRead = viewMode === 'web' ? extractedText.join(' ') : extractedText[currentPage - 1];
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setIsQuizOpen(true);
    setQuizFinished(false);
    try {
      const context = extractedText.join(' ').slice(0, 5000); // Send chunk to AI
      const data = await aiService.generateQuiz(material.title, material.subject, material.grade, context);
      setChapters(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const getThemeClass = () => {
    switch (readerTheme) {
      case 'dark': return 'bg-slate-900 text-slate-100';
      case 'sepia': return 'bg-[#f4ecd8] text-[#5b4636]';
      default: return 'bg-white text-slate-900';
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
               {!material.isDigital && (
                 <div className="flex bg-black/30 rounded-xl p-0.5 border border-white/10">
                   <button onClick={() => setViewMode('web')} className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${viewMode === 'web' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40'}`}>{t.web}</button>
                   <button onClick={() => setViewMode('flip')} className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${viewMode === 'flip' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40'}`}>{t.flipbook}</button>
                   <button onClick={() => setViewMode('native')} className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${viewMode === 'native' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40'}`}>{t.native}</button>
                 </div>
               )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <button onClick={toggleSpeech} className={`px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${isSpeaking ? 'bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}`}>
            <span>{isSpeaking ? '🔊' : '🔈'}</span>
            <span className="hidden md:inline">{isSpeaking ? t.stopTts : t.tts}</span>
          </button>
          <button onClick={handleGenerateQuiz} className="bg-purple-600 hover:bg-purple-700 text-white px-4 md:px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg">✨ AI Quiz</button>
          <button onClick={() => setShowConfirmClose(true)} className="p-3 bg-red-500/20 text-red-100 rounded-2xl hover:bg-red-500/30 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </header>

      {/* Reader Controls (Web Mode only) */}
      {viewMode === 'web' && (
        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-6">
            <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
               <button onClick={() => setReaderTheme('light')} className={`w-8 h-8 rounded-lg ${readerTheme === 'light' ? 'bg-emerald-500 text-white shadow' : 'text-slate-400'}`}>A</button>
               <button onClick={() => setReaderTheme('sepia')} className={`w-8 h-8 rounded-lg ${readerTheme === 'sepia' ? 'bg-[#d2c29d] text-[#5b4636] shadow' : 'text-slate-400'}`}>A</button>
               <button onClick={() => setReaderTheme('dark')} className={`w-8 h-8 rounded-lg ${readerTheme === 'dark' ? 'bg-slate-700 text-white shadow' : 'text-slate-400'}`}>A</button>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setFontSize(p => Math.max(12, p - 2))} className="w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold">-</button>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{fontSize}px</span>
              <button onClick={() => setFontSize(p => Math.min(32, p + 2))} className="w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold">+</button>
            </div>
          </div>
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden sm:block">Smart Web Reader Active</div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto custom-scrollbar relative ${getThemeClass()}`}>
        <div className={`w-full h-full max-w-4xl mx-auto ${viewMode === 'web' ? 'p-8 md:p-20' : 'flex items-center justify-center'}`}>
           {isRenderLoading ? (
             <div className="h-full flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-xl">📖</div>
                </div>
                <p className="text-emerald-500 font-black text-xs uppercase tracking-widest">{t.loading}</p>
             </div>
           ) : viewMode === 'web' ? (
             <article className="animate-in fade-in duration-700 space-y-12" style={{ fontSize: `${fontSize}px` }}>
                {extractedText.map((text, i) => (
                  <div key={i} className="relative group">
                    <div className="absolute -left-12 top-0 text-[10px] font-black text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity uppercase vertical-rl">Page {i + 1}</div>
                    <p className="leading-relaxed whitespace-pre-wrap font-medium">{text}</p>
                    <div className="h-px w-full bg-slate-100 dark:bg-slate-800 mt-12 mb-8"></div>
                  </div>
                ))}
             </article>
           ) : viewMode === 'flip' ? (
             <div className="w-full h-full flex flex-col items-center justify-center gap-12 relative p-4">
                <div className="relative perspective-2000">
                   <div className="bg-white shadow-[0_60px_120px_-20px_rgba(0,0,0,0.6)] rounded-xl overflow-hidden border border-slate-200 transform hover:scale-[1.02] transition-transform duration-700">
                      <canvas key={currentPage} ref={flipPageRef} className="max-w-full h-auto" />
                      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
                   </div>
                   <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="absolute left-0 -translate-x-12 top-1/2 -translate-y-1/2 p-5 bg-emerald-600 text-white rounded-full shadow-2xl active:scale-90 transition-all disabled:opacity-0"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" /></svg></button>
                   <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage === numPages} className="absolute right-0 translate-x-12 top-1/2 -translate-y-1/2 p-5 bg-emerald-600 text-white rounded-full shadow-2xl active:scale-90 transition-all disabled:opacity-0"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg></button>
                </div>
                <div className="bg-black/60 backdrop-blur-xl px-10 py-4 rounded-3xl border border-white/10 shadow-2xl flex items-center gap-6">
                   <span className="text-white/40 font-black text-xs uppercase tracking-widest">Page {currentPage} of {numPages}</span>
                   <input type="range" min="1" max={numPages} value={currentPage} onChange={(e) => setCurrentPage(parseInt(e.target.value))} className="w-48 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                </div>
             </div>
           ) : (
             <div className="w-full h-full relative">
                <iframe src={getEmbedUrl(material.fileUrl)} className="w-full h-full border-none bg-slate-900" title={material.title} allow="autoplay" />
             </div>
           )}
        </div>
      </div>

      {isQuizOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-[80vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 animate-in zoom-in duration-300">
             <div className="bg-emerald-800 p-8 text-white flex justify-between items-center flex-none">
                <div>
                   <h4 className="font-black uppercase tracking-widest text-[10px] opacity-60 mb-1">Interactive Assessment</h4>
                   <h2 className="text-2xl font-black tracking-tight">{material.subject} Tutor</h2>
                </div>
                <button onClick={() => setIsQuizOpen(false)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <div className="flex-1 overflow-y-auto p-10 bg-slate-50 dark:bg-slate-950/40 custom-scrollbar">
                {isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 border-[6px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-xl font-black text-emerald-900 dark:text-emerald-400 animate-pulse tracking-tight uppercase tracking-widest">Building Your Custom Quiz...</p>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                     {chapters[activeChapterIndex]?.questions[quizStep] ? (
                       <div className="space-y-8">
                          <div className="space-y-4">
                             <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-800">Section {activeChapterIndex + 1} • Question {quizStep + 1}</span>
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
                          <button onClick={() => { if (quizStep < chapters[activeChapterIndex].questions.length - 1) setQuizStep(p => p + 1); else if (activeChapterIndex < chapters.length - 1) { setActiveChapterIndex(p => p + 1); setQuizStep(0); } else setQuizFinished(true); }} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-6 rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all mt-10">Continue Progress</button>
                       </div>
                     ) : quizFinished && (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20">
                          <span className="text-[8rem]">🎓</span>
                          <h3 className="text-4xl font-black text-emerald-900 dark:text-emerald-100">Review Complete!</h3>
                          <button onClick={() => setIsQuizOpen(false)} className="bg-emerald-600 text-white px-16 py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all">Back to Reading</button>
                        </div>
                     )}
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {showConfirmClose && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 max-w-sm w-full text-center space-y-10 animate-in zoom-in duration-300 shadow-2xl border border-white/10">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{t.finish}</h3>
            <div className="space-y-4">
              <button onClick={onClose} className="w-full py-6 bg-emerald-600 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest text-[11px] active:scale-95 transition-all">End Session</button>
              <button onClick={() => setShowConfirmClose(false)} className="w-full py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black rounded-3xl uppercase tracking-widest text-[11px] transition-all hover:bg-slate-200">{t.resume}</button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #059669; border-radius: 10px; }
        .vertical-rl { writing-mode: vertical-rl; }
      `}</style>
    </div>
  );
};
