
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StudyMaterial, ReadingStatus, UserProgress } from '../types';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const lang = localStorage.getItem('study_hub_chat_lang') || 'English';
  const t = {
    loading: lang === 'English' ? 'Opening Book...' : 'Tikutsegula Bukuli...',
    finish: lang === 'English' ? 'Close Reader?' : 'Kodi Mwamaliza?',
    resume: lang === 'English' ? 'Keep Reading' : 'Pitirizani Kuwerenga',
    sidebar: lang === 'English' ? 'Contents' : 'Zamkati',
    page: lang === 'English' ? 'Page' : 'Tsamba',
    prev: lang === 'English' ? 'Previous' : 'Zakale',
    next: lang === 'English' ? 'Next' : 'Zotsatira',
  };

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isRenderLoading, setIsRenderLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [scale, setScale] = useState(1.2); // Balanced default scale
  
  const flipPageRef = useRef<HTMLCanvasElement | null>(null);
  const currentRenderTask = useRef<any>(null);

  // Digital Note Pagination logic
  const digitalPages = useMemo(() => {
    if (!material.isDigital || !material.content) return [];
    const raw = material.content;
    const size = 3000; 
    const pages = [];
    for (let i = 0; i < raw.length; i += size) {
      pages.push(raw.substring(i, i + size));
    }
    return pages;
  }, [material]);

  useEffect(() => {
    if (material.isDigital) {
      setNumPages(digitalPages.length);
      setIsRenderLoading(false);
      if (currentProgress?.progressPercent && digitalPages.length > 0) {
        setCurrentPage(Math.max(1, Math.round((currentProgress.progressPercent / 100) * digitalPages.length)));
      }
      return;
    }

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
  }, [material, digitalPages, currentProgress]);

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
    if (!material.isDigital && flipPageRef.current && pdfDoc) {
      renderCanvasPage(currentPage, flipPageRef.current);
    }
  }, [currentPage, pdfDoc, renderCanvasPage, material.isDigital, scale]);

  const readingProgress = (currentPage / numPages) * 100;

  const handlePageChange = (val: number) => {
    const target = Math.max(1, Math.min(numPages, val));
    setCurrentPage(target);
    onUpdateStatus(ReadingStatus.READING);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-100 dark:bg-slate-950 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-300">
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
           {/* Zoom settings */}
           <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.2))} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4" /></svg>
              </button>
              <span className="text-[10px] font-black w-10 text-center text-slate-600 dark:text-slate-300 tabular-nums">{Math.round(scale * 100)}%</span>
              <button onClick={() => setScale(s => Math.min(4, s + 0.2))} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
              </button>
           </div>
           
           <button 
             onClick={() => setShowConfirmClose(true)} 
             className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/30 shadow-sm"
           >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <aside className={`flex-none h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out z-20 ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'}`}>
          <div className="w-64 h-full flex flex-col p-6">
            <h3 className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-[10px] mb-6 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
              {t.sidebar}
            </h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
              {Array.from({ length: numPages }).map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => handlePageChange(i + 1)} 
                  className={`w-full p-4 rounded-2xl text-left text-[11px] font-black uppercase tracking-wider transition-all border ${currentPage === i + 1 ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  {t.page} {i + 1}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Reading Stage (Fix: Correct Centering and Scrollability) */}
        <main className="flex-1 overflow-auto custom-scrollbar bg-slate-200 dark:bg-slate-950 p-4 md:p-12 relative flex flex-col">
          {isRenderLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-pulse">
              <div className="w-14 h-14 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              <p className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]">{t.loading}</p>
            </div>
          ) : (
            <div className="flex-1 flex items-start justify-center min-w-max min-h-max">
               <div className="relative shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-sm">
                  {material.isDigital ? (
                    <div className="p-12 md:p-24 min-h-[1000px] w-[800px] max-w-full font-serif leading-relaxed text-slate-800 dark:text-slate-200 animate-in fade-in duration-500 select-none">
                       <div className="whitespace-pre-wrap text-xl md:text-2xl" dangerouslySetInnerHTML={{ __html: digitalPages[currentPage-1]?.replace(/# (.*)/g, '<h2 class="text-4xl font-black text-emerald-800 dark:text-emerald-400 mb-10">$1</h2>').replace(/## (.*)/g, '<h3 class="text-2xl font-black text-slate-900 dark:text-white mt-10 mb-6">$1</h3>') }} />
                    </div>
                  ) : (
                    <div className="rounded-sm overflow-hidden flex items-center justify-center">
                       <canvas ref={flipPageRef} className="max-w-none block shadow-2xl" />
                    </div>
                  )}
                  
                  {/* Decorative Spine Shadow */}
                  <div className="absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/10 to-transparent pointer-events-none"></div>
                  <div className="absolute inset-y-0 left-0 w-1 bg-white/20 pointer-events-none"></div>
               </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer Navigation Bar */}
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

      {/* Exit Dialog */}
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
