
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StudyMaterial, ReadingStatus, UserProgress } from '../types';

declare const pdfjsLib: any;

interface MaterialViewerProps {
  material: StudyMaterial;
  userId: string;
  onClose: () => void;
  onUpdateStatus: (status: ReadingStatus) => void;
  currentProgress?: UserProgress;
}

const CUSTOM_TOC: Record<string, { title: string; page: number }[]> = {
  'chem-f1-notes-001': [
    { title: "Introduction to Chemistry", page: 1 },
    { title: "Essential Mathematical Skills", page: 11 },
    { title: "Composition of Matter", page: 16 },
    { title: "Atomic Structure", page: 34 },
    { title: "The Periodic Table", page: 42 },
    { title: "Physical & Chemical Changes", page: 47 },
    { title: "Organic Compounds", page: 58 }
  ]
};

export const PdfViewer: React.FC<MaterialViewerProps> = ({ 
  material, 
  userId, 
  onClose, 
  onUpdateStatus,
  currentProgress 
}) => {
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const lang = localStorage.getItem('study_hub_chat_lang') || 'English';
  const t = {
    loading: lang === 'English' ? 'Opening Book...' : 'Tikutsegula Bukuli...',
    finish: lang === 'English' ? 'Close Reader?' : 'Kodi Mwamaliza?',
    resume: lang === 'English' ? 'Keep Reading' : 'Pitirizani Kuwerenga',
    sidebar: lang === 'English' ? 'Contents' : 'Zamkati',
    page: lang === 'English' ? 'Page' : 'Tsamba',
    prev: lang === 'English' ? 'Previous' : 'Zakale',
    next: lang === 'English' ? 'Next' : 'Zotsatira',
    fullscreen: lang === 'English' ? 'Full Screen' : 'Zosefukira',
    exitFullscreen: lang === 'English' ? 'Exit Full Screen' : 'Tulukani Zosefukira',
  };

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isRenderLoading, setIsRenderLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [scale, setScale] = useState(1.2); 
  
  const flipPageRef = useRef<HTMLCanvasElement | null>(null);
  const currentRenderTask = useRef<any>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadPdf = async () => {
      try {
        setIsRenderLoading(true);
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const loadingTask = pdfjsLib.getDocument({ url: material.fileUrl, disableAutoFetch: true });
        const pdf = await loadingTask.promise;
        if (isMounted) {
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setIsRenderLoading(false);
          if (currentProgress?.progressPercent) {
             setCurrentPage(Math.max(1, Math.round((currentProgress.progressPercent / 100) * pdf.numPages)));
          }
        }
      } catch (err) {
        if (isMounted) setIsRenderLoading(false);
      }
    };
    loadPdf();
    return () => { isMounted = false; if (currentRenderTask.current) currentRenderTask.current.cancel(); };
  }, [material, currentProgress]);

  const renderCanvasPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement) => {
    if (!pdfDoc || !canvas) return;
    if (currentRenderTask.current) { currentRenderTask.current.cancel(); }
    try {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: scale });
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      currentRenderTask.current = page.render({ canvasContext: context, viewport: viewport });
      await currentRenderTask.current.promise;
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') console.error(err);
    }
  }, [pdfDoc, scale]);

  useEffect(() => {
    if (flipPageRef.current && pdfDoc) {
      renderCanvasPage(currentPage, flipPageRef.current);
    }
  }, [currentPage, pdfDoc, renderCanvasPage, scale]);

  const readingProgress = (currentPage / Math.max(1, numPages)) * 100;

  const handlePageChange = (val: number) => {
    const target = Math.max(1, Math.min(numPages, val));
    setCurrentPage(target);
    onUpdateStatus(ReadingStatus.READING);
  };

  const materialToc = CUSTOM_TOC[material.id];

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-slate-100 dark:bg-slate-950 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-300">
      {/* Header Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-none flex items-center justify-between px-4 py-3 md:px-8 z-[110] shadow-sm">
        <div className="flex items-center min-w-0 flex-1">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className={`p-2.5 rounded-xl transition-all mr-4 ${isSidebarOpen ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
          </button>
          <div className="min-w-0">
            <h4 className="font-black text-sm md:text-lg truncate tracking-tight text-slate-900 dark:text-white leading-tight">{material.title}</h4>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-black tracking-[0.2em] text-emerald-600">{material.subject}</span>
              <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full"></span>
              <span className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-400">{material.grade}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
           <div className="hidden sm:flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
              </button>
              <span className="text-[10px] font-black w-10 text-center text-slate-600 dark:text-slate-300 tabular-nums">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(4, s + 0.2))} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              </button>
           </div>
           
           <button 
             onClick={toggleFullscreen} 
             title={isFullscreen ? t.exitFullscreen : t.fullscreen}
             className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-100 transition-all border border-slate-100 dark:border-slate-700 shadow-sm"
           >
             {isFullscreen ? (
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
             ) : (
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
             )}
           </button>

           <button 
             onClick={() => setShowConfirmClose(true)} 
             className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/30 shadow-sm"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <aside className={`flex-none h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out z-20 ${isSidebarOpen ? 'w-64 md:w-72 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'}`}>
          <div className="w-64 md:w-72 h-full flex flex-col p-6">
            <h3 className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
              {t.sidebar}
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
              {materialToc ? (
                 <div className="space-y-4">
                    {materialToc.map((item, idx) => (
                      <button 
                        key={idx}
                        onClick={() => handlePageChange(item.page)}
                        className={`w-full p-4 rounded-2xl text-left transition-all border flex flex-col gap-1 ${currentPage >= item.page && (idx === materialToc.length - 1 || currentPage < materialToc[idx+1].page) ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100'}`}
                      >
                         <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Topic {idx + 1}</span>
                         <span className="font-bold text-xs leading-tight">{item.title}</span>
                         <span className="text-[9px] font-bold opacity-50 mt-1">Page {item.page}</span>
                      </button>
                    ))}
                    <div className="h-px bg-slate-100 dark:bg-slate-800 my-6"></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">All Pages</p>
                    <div className="grid grid-cols-4 gap-2">
                       {Array.from({ length: numPages }).map((_, i) => (
                         <button 
                           key={i} 
                           onClick={() => handlePageChange(i + 1)} 
                           className={`h-10 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${currentPage === i + 1 ? 'bg-emerald-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-500'}`}
                         >
                           {i + 1}
                         </button>
                       ))}
                    </div>
                 </div>
              ) : (
                Array.from({ length: numPages }).map((_, i) => (
                  <button 
                    key={i} 
                    onClick={() => handlePageChange(i + 1)} 
                    className={`w-full p-4 rounded-2xl text-left text-[11px] font-black uppercase tracking-wider transition-all border ${currentPage === i + 1 ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    {t.page} {i + 1}
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto custom-scrollbar bg-slate-200 dark:bg-slate-950 p-4 md:p-12 relative flex flex-col group/reader">
          {isRenderLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-pulse">
              <div className="w-14 h-14 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]">{t.loading}</p>
            </div>
          ) : (
            <>
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`fixed left-[calc(var(--sidebar-width,0px)+2rem)] top-1/2 -translate-y-1/2 z-[90] p-4 rounded-full bg-white/20 hover:bg-white/40 dark:bg-slate-800/20 dark:hover:bg-slate-800/40 backdrop-blur-md text-slate-600 dark:text-slate-300 transition-all duration-300 border border-white/30 dark:border-slate-700/30 shadow-2xl ${currentPage === 1 ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover/reader:opacity-100 hover:scale-110 active:scale-90'}`}
                style={{ '--sidebar-width': isSidebarOpen ? (window.innerWidth >= 768 ? '18rem' : '16rem') : '0rem' } as React.CSSProperties}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" /></svg>
              </button>

              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === numPages}
                className={`fixed right-8 top-1/2 -translate-y-1/2 z-[90] p-4 rounded-full bg-white/20 hover:bg-white/40 dark:bg-slate-800/20 dark:hover:bg-slate-800/40 backdrop-blur-md text-slate-600 dark:text-slate-300 transition-all duration-300 border border-white/30 dark:border-slate-700/30 shadow-2xl ${currentPage === numPages ? 'opacity-0 pointer-events-none' : 'opacity-0 group-hover/reader:opacity-100 hover:scale-110 active:scale-90'}`}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg>
              </button>

              <div className="flex-1 flex items-start justify-center min-w-max min-h-max relative">
                <div className="relative shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm">
                    <div className="rounded-sm overflow-hidden flex items-center justify-center">
                      <canvas ref={flipPageRef} className="max-w-none block shadow-2xl" />
                    </div>
                    <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
                    <div className="absolute inset-y-0 left-0 w-1 bg-white/20 pointer-events-none"></div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex-none px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-[110] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
         <div className="flex items-center gap-3 w-full sm:w-auto order-2 sm:order-1">
            <button 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1} 
              className="flex-1 sm:flex-none px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-30 disabled:pointer-events-none active:scale-95"
            >
              ← {t.prev}
            </button>
            <div className="px-5 py-3 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 text-center min-w-[110px] shadow-inner">
               <span className="text-[12px] font-black text-slate-900 dark:text-white tabular-nums">{currentPage} / {numPages}</span>
            </div>
            <button 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === numPages} 
              className="flex-1 sm:flex-none px-6 py-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-30 disabled:pointer-events-none active:scale-95"
            >
              {t.next} →
            </button>
         </div>

         <div className="flex items-center gap-6 w-full sm:w-auto sm:flex-1 sm:max-w-md order-1 sm:order-2">
            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700 relative">
               <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${readingProgress}%` }} />
            </div>
            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap tabular-nums">
              {Math.round(readingProgress)}% {lang === 'English' ? 'DONE' : 'CWAMALIZA'}
            </span>
         </div>
      </footer>

      {showConfirmClose && (
        <div className="fixed inset-0 z-[300] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 max-w-md w-full text-center space-y-10 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center text-5xl mx-auto shadow-inner border border-emerald-100/50">📖</div>
            <div className="space-y-3">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{t.finish}</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Your progress ({currentPage}/{numPages}) is stored and will sync automatically.</p>
            </div>
            <div className="space-y-4">
              <button 
                onClick={onClose} 
                className="w-full py-6 bg-emerald-600 text-white font-black rounded-3xl shadow-xl uppercase tracking-widest text-[11px] active:scale-95 transition-all shadow-emerald-500/20"
              >
                Exit Reader
              </button>
              <button 
                onClick={() => setShowConfirmClose(false)} 
                className="w-full py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black rounded-3xl uppercase tracking-widest text-[11px] transition-all hover:bg-slate-200 active:scale-95"
              >
                {t.resume}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};