
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StudyMaterial, ReadingStatus, UserProgress } from '../types';
import { storage } from '../services/storage';
import { aiService, QuizQuestion, QuizChapter } from '../services/ai';

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
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  
  const lang = localStorage.getItem('study_hub_chat_lang') || 'English';
  const t = {
    loading: lang === 'English' ? 'Opening Book...' : 'Tikutsegula Bukuli...',
    finish: lang === 'English' ? 'Close Reader?' : 'Kodi Mwamaliza?',
    resume: lang === 'English' ? 'Keep Reading' : 'Pitirizani Kuwerenga',
    sidebar: lang === 'English' ? 'Contents' : 'Zamkati',
    explain: lang === 'English' ? 'AI Tutor' : 'Mlangizi wa AI',
    simplifier: lang === 'English' ? 'Explain Page' : 'Masulirani',
    page: lang === 'English' ? 'Page' : 'Tsamba',
  };

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(currentProgress?.progressPercent ? Math.max(1, Math.round((currentProgress.progressPercent / 100) * (numPages || 1))) : 1);
  const [isRenderLoading, setIsRenderLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [extractedPages, setExtractedPages] = useState<Record<number, string>>({});
  
  const flipPageRef = useRef<HTMLCanvasElement | null>(null);
  const currentRenderTask = useRef<any>(null);
  const extractionAbortRef = useRef<boolean>(false);

  // Digital Note Pagination logic
  const digitalPages = useMemo(() => {
    if (!material.isDigital || !material.content) return [];
    // Simple logic to split long text into "pages" based on length (~2000 chars)
    const raw = material.content;
    const size = 1800;
    const pages = [];
    for (let i = 0; i < raw.length; i += size) {
      pages.push(raw.substring(i, i + size));
    }
    return pages;
  }, [material]);

  useEffect(() => {
    if (material.isDigital) {
      setNumPages(digitalPages.length);
      const initialTextMap: Record<number, string> = {};
      digitalPages.forEach((p, i) => initialTextMap[i+1] = p);
      setExtractedPages(initialTextMap);
      setIsRenderLoading(false);
      return;
    }

    let isMounted = true;
    extractionAbortRef.current = false;
    
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
          // Background extraction
          for (let i = 1; i <= pdf.numPages; i++) {
            if (extractionAbortRef.current) break;
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            setExtractedPages(prev => ({ ...prev, [i]: content.items.map((it: any) => it.str).join(' ') }));
          }
        }
      } catch (err) {
        if (isMounted) setIsRenderLoading(false);
      }
    };
    loadPdf();
    return () => { isMounted = false; extractionAbortRef.current = true; if (currentRenderTask.current) currentRenderTask.current.cancel(); };
  }, [material, digitalPages]);

  const renderCanvasPage = useCallback(async (pageNum: number, canvas: HTMLCanvasElement) => {
    if (!pdfDoc || !canvas) return;
    if (currentRenderTask.current) { currentRenderTask.current.cancel(); }
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
    if (!material.isDigital && flipPageRef.current && pdfDoc) {
      renderCanvasPage(currentPage, flipPageRef.current);
    }
    setAiExplanation(null);
  }, [currentPage, pdfDoc, renderCanvasPage, material.isDigital]);

  const handleExplainPage = async () => {
    const text = extractedPages[currentPage];
    if (!text) return;
    setIsExplaining(true);
    try {
      const result = await aiService.explainPage(text, lang);
      setAiExplanation(result);
    } catch {
      setAiExplanation("Tutor is busy. Try again.");
    } finally {
      setIsExplaining(false);
    }
  };

  const readingProgress = (currentPage / numPages) * 100;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-300">
      <header className="bg-emerald-900 text-white flex-none flex items-center justify-between px-4 py-3 md:px-8 shadow-2xl z-[110]">
        <div className="flex items-center min-w-0 flex-1">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-white/10 rounded-2xl transition-all mr-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
          </button>
          <div className="min-w-0">
            <h4 className="font-black text-sm md:text-lg truncate tracking-tight">{material.title}</h4>
            <p className="text-[9px] uppercase font-black tracking-widest text-emerald-300 opacity-80">{material.subject} • {material.grade}</p>
          </div>
        </div>
        <button onClick={() => setShowConfirmClose(true)} className="p-2.5 bg-red-500/20 text-red-100 rounded-xl hover:bg-red-500/30 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Contents Sidebar */}
        <div className={`absolute lg:relative z-[100] h-full bg-slate-900 border-r border-white/5 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
          <div className="p-6 h-full flex flex-col">
            <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-6">{t.sidebar}</h3>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
              {Array.from({ length: numPages }).map((_, i) => (
                <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-full p-3 rounded-xl text-left text-[11px] font-black uppercase tracking-wider transition-all ${currentPage === i + 1 ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                  {t.page} {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Flipbook Stage */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-100 dark:bg-slate-900">
          <div className="flex-1 overflow-y-auto custom-scrollbar relative flex items-center justify-center p-4">
            {isRenderLoading ? (
               <div className="flex flex-col items-center gap-4 animate-pulse">
                  <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                  <p className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">{t.loading}</p>
               </div>
            ) : (
               <div className="w-full h-full flex flex-col items-center justify-center gap-8 relative max-w-5xl mx-auto">
                  <div className="relative group/book">
                     <div className="bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] rounded-sm overflow-hidden border border-slate-200 transition-all duration-500 relative min-w-[300px] min-h-[400px]">
                        {material.isDigital ? (
                          <div className="p-8 md:p-16 h-full font-serif leading-relaxed text-slate-800 animate-in fade-in slide-in-from-right-4 duration-500 select-none">
                             <div className="whitespace-pre-wrap text-lg" dangerouslySetInnerHTML={{ __html: digitalPages[currentPage-1].replace(/# (.*)/g, '<h2 class="text-3xl font-black text-emerald-800 mb-8">$1</h2>').replace(/## (.*)/g, '<h3 class="text-xl font-black text-slate-900 mt-6 mb-4">$1</h3>') }} />
                          </div>
                        ) : (
                          <canvas ref={flipPageRef} className="max-w-[95vw] lg:max-w-[55vw] h-auto block" />
                        )}
                        <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/10 to-transparent pointer-events-none border-l-4 border-slate-50"></div>
                     </div>
                     <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="absolute left-0 -translate-x-1/2 top-1/2 -translate-y-1/2 p-4 bg-emerald-600 text-white rounded-full shadow-2xl active:scale-90 transition-all disabled:opacity-0 z-20 hover:bg-emerald-700">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" /></svg>
                     </button>
                     <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage === numPages} className="absolute right-0 translate-x-1/2 top-1/2 -translate-y-1/2 p-4 bg-emerald-600 text-white rounded-full shadow-2xl active:scale-90 transition-all disabled:opacity-0 z-20 hover:bg-emerald-700">
                       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg>
                     </button>
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl px-10 py-3 rounded-full border border-slate-200 dark:border-white/10 shadow-xl flex items-center gap-6">
                     <span className="text-slate-500 dark:text-white/60 font-black text-[10px] uppercase tracking-widest tabular-nums">{t.page} {currentPage} / {numPages}</span>
                     <div className="w-32 md:w-64 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
                        <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${readingProgress}%` }} />
                     </div>
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* AI Sidebar */}
        <div className={`absolute lg:relative right-0 z-[100] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/5 transition-all duration-300 ease-in-out flex flex-col ${aiExplanation || isExplaining ? 'w-80 lg:w-96' : 'w-0 overflow-hidden'}`}>
           <div className="p-8 h-full flex flex-col">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-xs flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                    {t.explain}
                 </h3>
                 <button onClick={() => setAiExplanation(null)} className="text-slate-400 hover:text-red-500 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                 {isExplaining ? (
                   <div className="space-y-4 animate-pulse"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-3/4"></div><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full"></div><div className="flex justify-center py-10"><div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div></div></div>
                 ) : (
                   <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-3xl border border-purple-100 dark:border-purple-800 text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed italic whitespace-pre-wrap">{aiExplanation}</div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Interactive Dock */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[150] animate-in slide-in-from-bottom-10 duration-700">
         <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl px-6 py-4 rounded-full shadow-2xl border border-white/20 dark:border-white/5 flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-4 rounded-2xl transition-all ${isSidebarOpen ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg></button>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-800" />
            <button onClick={handleExplainPage} disabled={isExplaining} className={`group flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${isExplaining ? 'bg-purple-100 text-purple-400' : 'bg-purple-600 text-white shadow-xl hover:bg-purple-700 active:scale-95'}`}>
               <span className="text-xl">🧠</span>
               <span className="font-black uppercase text-[10px] tracking-widest hidden md:inline">{isExplaining ? 'Thinking...' : t.simplifier}</span>
            </button>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800">
               <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="text-slate-400 hover:text-emerald-500 transition-all active:scale-75"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg></button>
               <span className="text-[12px] font-black text-slate-900 dark:text-white w-14 text-center tabular-nums">{currentPage} / {numPages}</span>
               <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} className="text-slate-400 hover:text-emerald-500 transition-all active:scale-75"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg></button>
            </div>
         </div>
      </div>

      {showConfirmClose && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in duration-300 shadow-2xl border border-white/10">
          <div className="bg-white dark:bg-slate-900 rounded-[4rem] p-12 max-w-sm w-full text-center space-y-10">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t.finish}</h3>
            <div className="space-y-4">
              <button onClick={onClose} className="w-full py-6 bg-emerald-600 text-white font-black rounded-2xl shadow-xl uppercase tracking-widest text-[11px] active:scale-95 transition-all">Close Session</button>
              <button onClick={() => setShowConfirmClose(false)} className="w-full py-6 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black rounded-2xl uppercase tracking-widest text-[11px] transition-all">{t.resume}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
