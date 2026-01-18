
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

type ReaderTheme = 'light' | 'dark' | 'sepia';

export const PdfViewer: React.FC<MaterialViewerProps> = ({ 
  material, 
  userId, 
  onClose, 
  onUpdateStatus,
  currentProgress 
}) => {
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [viewMode, setViewMode] = useState<'scroll' | 'flip' | 'native' | 'web'>(material.isDigital ? 'web' : 'web');
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('light');
  const [fontSize, setFontSize] = useState(18);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const lang = localStorage.getItem('study_hub_chat_lang') || 'English';
  
  const t = {
    flipbook: lang === 'English' ? 'Flip' : 'Lapansi',
    scroll: lang === 'English' ? 'Scroll' : 'Mndandanda',
    native: lang === 'English' ? 'Native' : 'Zenizeni',
    web: lang === 'English' ? 'Web Mode' : 'Mwalemba',
    loading: lang === 'English' ? 'Optimizing Page...' : 'Tikonza Tsamba...',
    next: lang === 'English' ? 'Next' : 'Ena',
    prev: lang === 'English' ? 'Prev' : "M'mbuyo",
    finish: lang === 'English' ? 'Finish Session?' : 'Kodi Mwamaliza?',
    resume: lang === 'English' ? 'Resume Reader' : 'Pitirizani Kuwerenga',
    tts: lang === 'English' ? 'Read Aloud' : 'Mverani',
    stopTts: lang === 'English' ? 'Stop' : 'Imani',
    search: lang === 'English' ? 'Search book...' : 'Sakasaka m\'bukuli...',
    sidebar: lang === 'English' ? 'Contents' : 'Zamkati',
  };

  // PDF & Text Content States
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(currentProgress?.progressPercent ? Math.max(1, Math.round((currentProgress.progressPercent / 100) * numPages)) : 1);
  const [isRenderLoading, setIsRenderLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [extractedPages, setExtractedPages] = useState<Record<number, string>>({});
  const [extractionProgress, setExtractionProgress] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const flipPageRef = useRef<HTMLCanvasElement | null>(null);
  const scrollPageRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const currentRenderTask = useRef<any>(null);
  const extractionAbortRef = useRef<boolean>(false);

  // AI States
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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

  // Progressive Text Extraction
  const extractTextProgressively = async (pdf: any) => {
    for (let i = 1; i <= pdf.numPages; i++) {
      if (extractionAbortRef.current) break;
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      const pageText = strings.join(' ');
      
      setExtractedPages(prev => ({ ...prev, [i]: pageText }));
      setExtractionProgress(Math.round((i / pdf.numPages) * 100));
      
      // Yield to main thread for smooth UI
      if (i % 5 === 0) await new Promise(resolve => setTimeout(resolve, 10));
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
          // Start background extraction
          extractTextProgressively(pdf);
        }
      } catch (err) {
        console.error("PDF Load Failed:", err);
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

  const renderCanvasPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement, scale = 1.8) => {
    if (!pdfDoc || !canvas) return;
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      const renderTask = page.render({ canvasContext: context, viewport: viewport });
      await renderTask.promise;
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') console.error(err);
    }
  }, [pdfDoc]);

  // View Mode Side Effects
  useEffect(() => {
    if (!pdfDoc) return;
    
    if (viewMode === 'flip' && flipPageRef.current) {
      renderCanvasPage(currentPage, flipPageRef.current);
    } else if (viewMode === 'scroll') {
      // Pre-render current and next 2 pages for "Instant" feel
      const range = [currentPage, currentPage + 1, currentPage + 2];
      range.forEach(p => {
        if (p <= numPages && scrollPageRefs.current[p - 1]) {
          renderCanvasPage(p, scrollPageRefs.current[p - 1] as HTMLCanvasElement);
        }
      });
    }
  }, [currentPage, viewMode, pdfDoc, renderCanvasPage, numPages]);

  const handleScroll = () => {
    if (!containerRef.current || viewMode !== 'scroll') return;
    const { scrollTop, clientHeight } = containerRef.current;
    const scrollMiddle = scrollTop + (clientHeight / 2);
    let cumulativeHeight = 0;
    
    for (let i = 0; i < numPages; i++) {
      const canvas = scrollPageRefs.current[i];
      if (canvas) {
        cumulativeHeight += canvas.offsetHeight + 32;
        if (scrollMiddle < cumulativeHeight) {
          if (currentPage !== i + 1) setCurrentPage(i + 1);
          break;
        }
      }
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const textToRead = Object.values(extractedPages).join(' ');
      const utterance = new SpeechSynthesisUtterance(textToRead.slice(0, 10000)); // Limit for stability
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
      const context = Object.values(extractedPages).slice(0, 5).join(' ').slice(0, 5000);
      const data = await aiService.generateQuiz(material.title, material.subject, material.grade, context);
      setChapters(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredExtractedText = useMemo(() => {
    if (!searchQuery) return extractedPages;
    const filtered: Record<number, string> = {};
    Object.entries(extractedPages).forEach(([page, text]) => {
      if (text.toLowerCase().includes(searchQuery.toLowerCase())) {
        filtered[Number(page)] = text;
      }
    });
    return filtered;
  }, [extractedPages, searchQuery]);

  const getThemeClass = () => {
    switch (readerTheme) {
      case 'dark': return 'bg-slate-900 text-slate-100';
      case 'sepia': return 'bg-[#f4ecd8] text-[#5b4636]';
      default: return 'bg-white text-slate-900';
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
                 <button onClick={() => setViewMode('web')} className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${viewMode === 'web' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40'}`}>{t.web}</button>
                 {!material.isDigital && (
                   <>
                    <button onClick={() => setViewMode('flip')} className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${viewMode === 'flip' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40'}`}>{t.flipbook}</button>
                    <button onClick={() => setViewMode('scroll')} className={`px-3 py-1 text-[8px] font-black uppercase rounded-lg transition-all ${viewMode === 'scroll' ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/40'}`}>{t.scroll}</button>
                   </>
                 )}
               </div>
               {extractionProgress < 100 && viewMode === 'web' && (
                 <span className="text-[8px] font-black uppercase text-emerald-400 animate-pulse">Loading Content {extractionProgress}%</span>
               )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <button onClick={() => setShowSearch(!showSearch)} className={`p-2.5 rounded-xl transition-all ${showSearch ? 'bg-white/20' : 'hover:bg-white/10'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          <button onClick={toggleSpeech} className={`px-4 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${isSpeaking ? 'bg-red-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}`}>
            <span>{isSpeaking ? '🔊' : '🔈'}</span>
            <span className="hidden md:inline">{isSpeaking ? t.stopTts : t.tts}</span>
          </button>
          <button onClick={handleGenerateQuiz} className="bg-purple-600 hover:bg-purple-700 text-white px-4 md:px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg">✨ Quiz</button>
          <button onClick={() => setShowConfirmClose(true)} className="p-2.5 bg-red-500/20 text-red-100 rounded-xl hover:bg-red-500/30 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
      </header>

      {/* Reading Progress Top Bar */}
      <div className="h-1 w-full bg-emerald-950 flex-none overflow-hidden relative z-[105]">
        <div 
          className="h-full bg-emerald-500 transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
          style={{ width: `${readingProgress}%` }}
        />
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar */}
        <div className={`absolute lg:relative z-[100] h-full bg-slate-900 border-r border-white/5 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
          <div className="p-6 h-full flex flex-col">
            <h3 className="text-white font-black uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              {t.sidebar}
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
              {Array.from({ length: numPages }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => { setCurrentPage(i + 1); setIsSidebarOpen(window.innerWidth > 1024); }}
                  className={`w-full p-3 rounded-xl text-left transition-all flex items-center justify-between group ${currentPage === i + 1 ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className="text-[11px] font-black uppercase tracking-wider">Page {i + 1}</span>
                  {extractedPages[i + 1] && <div className={`w-1.5 h-1.5 rounded-full ${currentPage === i + 1 ? 'bg-white' : 'bg-emerald-500 opacity-0 group-hover:opacity-100'}`} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Reader Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Reader Sub-Controls */}
          <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 md:px-8 py-3 flex items-center justify-between z-10 flex-none">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                 {(['light', 'sepia', 'dark'] as ReaderTheme[]).map(theme => (
                   <button 
                     key={theme}
                     onClick={() => setReaderTheme(theme)} 
                     className={`w-8 h-8 rounded-lg transition-all flex items-center justify-center font-bold text-xs ${
                       readerTheme === theme 
                        ? (theme === 'sepia' ? 'bg-[#d2c29d] text-[#5b4636] shadow' : 'bg-emerald-500 text-white shadow') 
                        : 'text-slate-400 hover:text-slate-600'
                     }`}
                   >
                     A
                   </button>
                 ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setFontSize(p => Math.max(12, p - 2))} className="w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-black hover:bg-slate-50 transition-colors">-</button>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[30px] text-center">{fontSize}pt</span>
                <button onClick={() => setFontSize(p => Math.min(36, p + 2))} className="w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-black hover:bg-slate-50 transition-colors">+</button>
              </div>
            </div>

            {showSearch && (
              <div className="flex-1 max-w-xs mx-4 animate-in slide-in-from-right-4">
                <div className="relative">
                  <input 
                    type="text" 
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.search}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold transition-all"
                  />
                  <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
              </div>
            )}
            
            <div className="hidden sm:block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{viewMode.toUpperCase()} VIEWING</div>
          </div>

          {/* Actual Reader Component */}
          <div ref={containerRef} onScroll={handleScroll} className={`flex-1 overflow-y-auto custom-scrollbar relative ${getThemeClass()}`}>
            <div className={`w-full h-full max-w-4xl mx-auto transition-all ${viewMode === 'web' ? 'p-6 md:p-16 lg:p-24' : 'flex items-center justify-center p-4'}`}>
               {isRenderLoading ? (
                 <div className="h-full flex flex-col items-center justify-center space-y-6">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.2em] animate-pulse">{t.loading}</p>
                 </div>
               ) : viewMode === 'web' ? (
                 <article className="animate-in fade-in duration-700 space-y-16" style={{ fontSize: `${fontSize}px` }}>
                    {Object.keys(filteredExtractedText).length === 0 && searchQuery ? (
                      <div className="py-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs">No results found for "{searchQuery}"</div>
                    ) : (
                      Object.entries(filteredExtractedText).map(([pageNum, text]) => (
                        <div key={pageNum} className="relative group/page">
                          <div className="absolute -left-12 top-0 text-[9px] font-black text-slate-300 dark:text-slate-600 opacity-0 group-hover/page:opacity-100 transition-opacity uppercase vertical-rl">Page {pageNum}</div>
                          <div className="leading-[1.8] whitespace-pre-wrap font-medium">
                             {searchQuery ? (
                               text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) => 
                                 part.toLowerCase() === searchQuery.toLowerCase() 
                                   ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-100 px-1 rounded">{part}</mark>
                                   : part
                               )
                             ) : text}
                          </div>
                          <div className="h-px w-full bg-slate-100 dark:bg-slate-800 mt-12 opacity-50"></div>
                        </div>
                      ))
                    )}
                    {extractionProgress < 100 && (
                      <div className="py-10 text-center animate-pulse">
                         <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Retrieving more pages... {extractionProgress}%</p>
                      </div>
                    )}
                 </article>
               ) : viewMode === 'flip' ? (
                 <div className="w-full h-full flex flex-col items-center justify-center gap-12 relative">
                    <div className="relative perspective-2000">
                       <div className="bg-white shadow-[0_60px_120px_-20px_rgba(0,0,0,0.6)] rounded-lg overflow-hidden border border-slate-200 transform hover:scale-[1.01] transition-transform duration-700">
                          <canvas key={currentPage} ref={flipPageRef} className="max-w-[95vw] lg:max-w-[60vw] h-auto" />
                          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
                       </div>
                       <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="absolute left-0 -translate-x-1/2 lg:-translate-x-12 top-1/2 -translate-y-1/2 p-5 bg-emerald-600 text-white rounded-full shadow-2xl active:scale-90 transition-all disabled:opacity-0 z-20"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" /></svg></button>
                       <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage === numPages} className="absolute right-0 translate-x-1/2 lg:translate-x-12 top-1/2 -translate-y-1/2 p-5 bg-emerald-600 text-white rounded-full shadow-2xl active:scale-90 transition-all disabled:opacity-0 z-20"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg></button>
                    </div>
                    <div className="bg-black/80 backdrop-blur-xl px-10 py-4 rounded-[2rem] border border-white/10 shadow-2xl flex items-center gap-6">
                       <span className="text-white/60 font-black text-[10px] uppercase tracking-widest">Page {currentPage} of {numPages}</span>
                       <input type="range" min="1" max={numPages} value={currentPage} onChange={(e) => setCurrentPage(parseInt(e.target.value))} className="w-32 md:w-64 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                    </div>
                 </div>
               ) : viewMode === 'scroll' ? (
                 <div className="flex flex-col items-center gap-10">
                   {Array.from({ length: numPages }).map((_, i) => (
                     <div key={i} className="bg-white shadow-2xl border border-slate-200/10 rounded-sm overflow-hidden transition-all duration-500 hover:scale-[1.01]">
                       <canvas ref={el => { scrollPageRefs.current[i] = el; }} className="max-w-full h-auto min-h-[400px] bg-slate-100 dark:bg-slate-900" />
                       <div className="p-3 bg-slate-50 dark:bg-slate-950 flex justify-center border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {i + 1}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="w-full h-full relative">
                    <iframe src={getEmbedUrl(material.fileUrl)} className="w-full h-full border-none bg-slate-900" title={material.title} allow="autoplay" />
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Menu (Mobile Optimized) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] flex gap-2">
         <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-1">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-3 rounded-xl transition-all ${isSidebarOpen ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`} title="TOC">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
            </button>
            <button onClick={() => setShowSearch(!showSearch)} className={`p-3 rounded-xl transition-all ${showSearch ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`} title="Search">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-3 text-slate-400 hover:text-emerald-600 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg></button>
            <span className="text-[10px] font-black text-slate-900 dark:text-white px-2 tracking-tighter">{currentPage}/{numPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} className="p-3 text-slate-400 hover:text-emerald-600 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg></button>
         </div>
      </div>

      {isQuizOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-[85vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/10 animate-in zoom-in duration-300">
             <div className="bg-emerald-800 p-8 text-white flex justify-between items-center flex-none">
                <div>
                   <h4 className="font-black uppercase tracking-widest text-[10px] opacity-60 mb-1">Assessment Tool</h4>
                   <h2 className="text-2xl font-black tracking-tight">{material.subject} Revision</h2>
                </div>
                <button onClick={() => setIsQuizOpen(false)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
             </div>
             <div className="flex-1 overflow-y-auto p-10 bg-slate-50 dark:bg-slate-950/40 custom-scrollbar">
                {isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 border-[6px] border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-xl font-black text-emerald-900 dark:text-emerald-400 animate-pulse tracking-tight uppercase tracking-widest">Building your quiz...</p>
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
                          <h3 className="text-4xl font-black text-emerald-900 dark:text-emerald-100">Review Complete!</h3>
                          <button onClick={() => setIsQuizOpen(false)} className="bg-emerald-600 text-white px-16 py-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all">Back to Reading</button>
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
              <button onClick={onClose} className="w-full py-6 bg-emerald-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[11px] active:scale-95 transition-all">End Session</button>
              <button onClick={() => setShowConfirmClose(false)} className="w-full py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black rounded-2xl uppercase tracking-widest text-[11px] transition-all hover:bg-slate-200">{t.resume}</button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #059669; border-radius: 10px; }
        .vertical-rl { writing-mode: vertical-rl; }
        .perspective-2000 { perspective: 3000px; }
      `}</style>
    </div>
  );
};
