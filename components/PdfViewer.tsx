
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!currentProgress || currentProgress.status === ReadingStatus.NOT_STARTED) {
      onUpdateStatus(ReadingStatus.READING);
    }
    extractTextFromPdf();
  }, [material.fileUrl]);

  const extractTextFromPdf = async () => {
    try {
      if (typeof pdfjsLib === 'undefined') return;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      const loadingTask = pdfjsLib.getDocument(material.fileUrl);
      const pdf = await loadingTask.promise;
      let fullText = "";
      
      const pagesToRead = Math.min(pdf.numPages, 5);
      for (let i = 1; i <= pagesToRead; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      }
      setExtractedText(fullText);
    } catch (err) {
      console.warn("Failed to extract PDF text", err);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsGenerating(true);
    setIsQuizOpen(true);
    setQuizFinished(false);
    setQuizStep(0);
    setActiveChapterIndex(0);
    
    const messages = [
      "Reading your document...",
      "Identifying book chapters...",
      "Generating section-specific questions...",
      "Polishing Malawian study guide..."
    ];
    
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setLoadingMsg(messages[msgIndex]);
    }, 2500);

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

  const currentQuestions = chapters[activeChapterIndex]?.questions || [];
  const currentQuestion = currentQuestions[quizStep];

  const handleAnswerMCQ = (qId: string, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [qId]: answer }));
  };

  const handleEvaluateComprehension = async (qId: string) => {
    const userAnswer = userAnswers[qId];
    if (!userAnswer || userAnswer.trim().length < 5) return;

    setIsEvaluating(true);
    try {
      const result = await aiService.evaluateComprehensionAnswer(
        currentQuestion.question,
        userAnswer,
        currentQuestion.correctAnswer,
        currentQuestion.explanation
      );
      setEvaluations(prev => ({ ...prev, [qId]: result }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextQuestion = () => {
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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = material.fileUrl;
    link.download = material.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    storage.recordDownload(userId, material.id);
  };

  const handleComplete = () => {
    onUpdateStatus(ReadingStatus.COMPLETED);
    setStatus(ReadingStatus.COMPLETED);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col h-screen w-screen overflow-hidden animate-in fade-in duration-300">
      {/* Responsive Header */}
      <header className="bg-emerald-900 text-white flex-none flex items-center justify-between px-3 py-2 md:px-6 md:py-4 shadow-xl border-b border-emerald-800">
        <div className="flex items-center min-w-0 flex-1 mr-4">
          <button 
            onClick={() => setShowConfirmClose(true)} 
            className="p-2 hover:bg-white/10 rounded-xl transition-colors mr-2 flex-none"
            aria-label="Back"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="min-w-0">
            <h3 className="font-bold text-sm md:text-lg truncate leading-tight">{material.title}</h3>
            <div className="flex items-center space-x-2 mt-0.5">
              <span className="text-[9px] md:text-[10px] bg-emerald-700 px-1.5 py-0.5 rounded uppercase font-bold text-emerald-100 whitespace-nowrap">
                {material.subject}
              </span>
              <span className={`text-[9px] md:text-[10px] px-1.5 py-0.5 rounded uppercase font-bold whitespace-nowrap ${status === ReadingStatus.COMPLETED ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                {status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 md:space-x-3 flex-none">
          <button 
            onClick={handleGenerateQuiz}
            className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1.5 md:px-4 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center gap-1.5 border border-purple-400/30"
          >
            <span>✨</span>
            <span className="hidden sm:inline">Smart Quiz</span>
            <span className="sm:hidden">Quiz</span>
          </button>
          
          <button 
            onClick={handleDownload} 
            className="p-2 md:px-4 md:py-2.5 bg-white/10 hover:bg-white/20 rounded-lg md:rounded-xl text-[10px] font-bold border border-white/10 transition-all flex items-center"
            title="Download"
          >
            <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden lg:inline uppercase">Download</span>
          </button>
          
          <button 
            onClick={() => setShowConfirmClose(true)} 
            className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-100 rounded-lg md:rounded-xl transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Viewer Area */}
      <div className="flex-1 relative bg-gray-900 w-full overflow-hidden flex flex-col items-center">
        <div className="w-full h-full flex items-center justify-center">
          <object 
            data={`${material.fileUrl}#toolbar=1&navpanes=0&scrollbar=1`} 
            type="application/pdf" 
            className="w-full h-full border-none"
          >
            <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center bg-gray-900">
              <div className="text-5xl mb-4">📄</div>
              <h4 className="text-xl font-bold mb-4">Unable to display PDF directly</h4>
              <p className="text-gray-400 mb-6 max-w-sm">Some mobile browsers do not support embedded PDF viewing.</p>
              <a 
                href={material.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-emerald-600 hover:bg-emerald-700 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl transition-all"
              >
                Open in New Tab
              </a>
            </div>
          </object>
        </div>

        {/* AI Quiz Panel - Full Responsive Overlay */}
        {isQuizOpen && (
          <div className="absolute inset-0 z-[120] flex items-center justify-center p-2 md:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl h-full max-h-[95%] md:max-h-[85%] rounded-3xl md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
              {/* Quiz Header */}
              <div className="bg-emerald-800 p-4 md:p-6 text-white flex-none flex justify-between items-center">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl md:text-2xl flex-none">📖</div>
                  <div className="min-w-0">
                    <h4 className="font-black uppercase tracking-widest text-[10px] md:text-xs">AI Smart Assistant</h4>
                    <p className="text-[8px] md:text-[10px] text-emerald-300 font-bold uppercase truncate">
                      {isGenerating ? "Analyzing Content..." : chapters[activeChapterIndex]?.chapterTitle || "Reading Textbook"}
                    </p>
                  </div>
                </div>
                {!isGenerating && !quizFinished && chapters.length > 0 && (
                  <div className="flex items-center gap-2 md:gap-4 flex-none ml-4">
                    <span className="hidden md:inline bg-emerald-700/50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Question {quizStep + 1} of {currentQuestions.length}
                    </span>
                    <button 
                      onClick={resetQuiz} 
                      className="p-2 text-white/60 hover:text-white transition-colors"
                      aria-label="Close Quiz"
                    >
                      <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                {isGenerating && (
                   <button onClick={resetQuiz} className="text-white/60 hover:text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                )}
              </div>

              {/* Quiz Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
                {isGenerating ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
                    <div className="relative">
                      <div className="w-16 h-16 md:w-24 md:h-24 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 flex items-center justify-center text-2xl md:text-4xl">🧠</div>
                    </div>
                    <div className="space-y-2">
                      <h5 className="text-lg md:text-2xl font-black text-emerald-900">{loadingMsg}</h5>
                      <p className="text-gray-400 text-xs md:text-sm max-w-xs mx-auto">This takes a few seconds as we process the actual text from your Malawian textbook.</p>
                    </div>
                  </div>
                ) : quizFinished ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-6 md:py-12 space-y-8 animate-in zoom-in duration-300">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl md:text-5xl mx-auto shadow-inner">🏆</div>
                    <div className="space-y-3">
                      <h4 className="text-2xl md:text-4xl font-black text-emerald-900">Quiz Complete!</h4>
                      <p className="text-gray-500 font-medium max-w-sm mx-auto">You've successfully reviewed {chapters.length} sections of this document.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:gap-6 w-full max-w-md mx-auto">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                        <p className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 mb-1">Sections</p>
                        <p className="text-xl md:text-3xl font-black text-gray-800">{chapters.length}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                        <p className="text-[9px] md:text-[10px] font-black uppercase text-emerald-700 mb-1">Score</p>
                        <p className="text-xl md:text-3xl font-black text-emerald-800">100%</p>
                      </div>
                    </div>
                    <button 
                      onClick={resetQuiz} 
                      className="w-full max-w-sm bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 md:py-5 rounded-2xl shadow-xl shadow-emerald-100 uppercase tracking-widest text-xs md:text-sm transition-all active:scale-95"
                    >
                      Return to Studies
                    </button>
                  </div>
                ) : currentQuestion ? (
                  <div className="space-y-6 md:space-y-10 animate-in slide-in-from-right-4 duration-300">
                    {/* Progress Pills */}
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                       {chapters.map((ch, i) => (
                         <div 
                          key={i} 
                          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase transition-all flex items-center gap-2 ${
                            i === activeChapterIndex ? 'bg-emerald-600 text-white ring-4 ring-emerald-50' : i < activeChapterIndex ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                          }`}
                         >
                           <span className="opacity-60">SEC {i + 1}</span>
                           <span className="hidden sm:inline truncate max-w-[80px]">{ch.chapterTitle}</span>
                         </div>
                       ))}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest ${
                          currentQuestion.type === 'mcq' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {currentQuestion.type === 'mcq' ? 'Multiple Choice' : 'Critical Thinking'}
                        </span>
                        <span className="md:hidden text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Q {quizStep + 1} / {currentQuestions.length}
                        </span>
                      </div>
                      <h4 className="text-lg md:text-2xl font-black text-gray-800 leading-tight md:leading-snug">
                        {currentQuestion.question}
                      </h4>
                    </div>

                    {currentQuestion.type === 'mcq' ? (
                      <div className="grid gap-3 md:gap-4">
                        {currentQuestion.options?.map((opt, i) => {
                          const isSelected = userAnswers[currentQuestion.id] === opt;
                          const isCorrect = userAnswers[currentQuestion.id] && opt === currentQuestion.correctAnswer;
                          const isWrong = isSelected && opt !== currentQuestion.correctAnswer;
                          
                          return (
                            <button
                              key={i}
                              disabled={!!userAnswers[currentQuestion.id]}
                              onClick={() => handleAnswerMCQ(currentQuestion.id, opt)}
                              className={`p-4 md:p-6 rounded-2xl border-2 text-left transition-all flex justify-between items-center group ${
                                isCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-md' :
                                isWrong ? 'bg-red-50 border-red-500 text-red-900' :
                                isSelected ? 'border-emerald-500 bg-emerald-50 shadow-md' :
                                'border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50'
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <span className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center font-black text-xs md:text-sm text-gray-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                                  {String.fromCharCode(65 + i)}
                                </span>
                                <span className="font-bold text-xs md:text-base pr-4">{opt}</span>
                              </div>
                              {isCorrect && <span className="text-emerald-500 text-xl flex-none">✓</span>}
                              {isWrong && <span className="text-red-500 text-xl flex-none">✗</span>}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="relative">
                          <textarea 
                            placeholder="Type your explanation based on what you read in the book..."
                            disabled={!!evaluations[currentQuestion.id] || isEvaluating}
                            className="w-full p-4 md:p-6 rounded-2xl border-2 border-gray-100 focus:border-emerald-500 focus:bg-white outline-none h-40 md:h-48 resize-none font-medium text-xs md:text-sm bg-gray-50 transition-all shadow-inner"
                            value={userAnswers[currentQuestion.id] || ''}
                            onChange={(e) => setUserAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                          />
                        </div>

                        {!evaluations[currentQuestion.id] ? (
                          <button 
                            onClick={() => handleEvaluateComprehension(currentQuestion.id)}
                            disabled={isEvaluating || !userAnswers[currentQuestion.id] || userAnswers[currentQuestion.id].length < 10}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 md:py-5 rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-widest text-xs md:text-sm active:scale-95"
                          >
                            {isEvaluating ? (
                              <>
                                <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Evaluating Answer...</span>
                              </>
                            ) : (
                              <span>Check Answer with AI</span>
                            )}
                          </button>
                        ) : (
                          <div className="space-y-4 md:space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="p-5 md:p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100 space-y-5 shadow-inner">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold text-lg md:text-xl">📊</div>
                                  <h5 className="text-[10px] md:text-[11px] font-black uppercase text-emerald-800 tracking-wider">Mastery Score</h5>
                                </div>
                                <div className="text-right flex items-baseline gap-1">
                                  <span className="text-2xl md:text-4xl font-black text-emerald-900">{evaluations[currentQuestion.id].score}</span>
                                  <span className="text-emerald-700 font-bold text-xs md:text-sm">/100</span>
                                </div>
                              </div>

                              <p className="text-xs md:text-sm font-medium text-emerald-900 leading-relaxed bg-white/50 p-4 rounded-xl border border-emerald-200/50">
                                "{evaluations[currentQuestion.id].feedbackSummary}"
                              </p>

                              <div className="grid md:grid-cols-2 gap-4 md:gap-6 pt-2">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                                    <p className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest">Great Points</p>
                                  </div>
                                  <ul className="space-y-2 pl-2">
                                    {evaluations[currentQuestion.id].strengths.map((s, i) => (
                                      <li key={i} className="text-[10px] md:text-xs font-bold text-emerald-800 flex items-start gap-2">
                                        <span className="text-emerald-500 mt-0.5 flex-none">✓</span>
                                        <span>{s}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                                    <p className="text-[9px] md:text-[10px] font-black text-orange-600 uppercase tracking-widest">Areas to Refine</p>
                                  </div>
                                  <ul className="space-y-2 pl-2">
                                    {evaluations[currentQuestion.id].improvements.map((im, i) => (
                                      <li key={i} className="text-[10px] md:text-xs font-bold text-orange-800 flex items-start gap-2">
                                        <span className="text-orange-400 mt-0.5 flex-none">•</span>
                                        <span>{im}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                            
                            <div className="p-4 md:p-6 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm">
                               <h5 className="text-[9px] md:text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Educator's Reference</h5>
                               <p className="text-xs md:text-sm font-medium text-gray-600 leading-relaxed italic">{currentQuestion.explanation}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quiz Footer Actions */}
                    {(currentQuestion.type === 'mcq' ? userAnswers[currentQuestion.id] : evaluations[currentQuestion.id]) && (
                      <div className="pt-6 animate-in fade-in duration-500">
                        <button 
                          onClick={nextQuestion}
                          className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-black py-4 md:py-5 rounded-2xl shadow-xl shadow-emerald-100 uppercase tracking-widest text-xs md:text-sm transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                          {quizStep < currentQuestions.length - 1 || activeChapterIndex < chapters.length - 1 ? (
                            <>
                              <span>Next Concept</span>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            </>
                          ) : (
                            <>
                              <span>Finish Smart Quiz</span>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                   <div className="h-full flex flex-col items-center justify-center text-center py-20 text-gray-400 space-y-4">
                      <div className="text-6xl">📭</div>
                      <p className="font-bold">We couldn't generate a specific quiz for this book.</p>
                      <button onClick={resetQuiz} className="text-emerald-600 underline">Close Assistant</button>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmClose && (
        <div className="fixed inset-0 z-[130] bg-black/80 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white text-gray-800 rounded-3xl p-6 md:p-10 max-w-sm w-full shadow-2xl border border-white/20 animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">💾</div>
            <h3 className="text-2xl font-black mb-2 text-emerald-900 text-center">Save and Exit?</h3>
            <p className="text-gray-500 mb-8 font-medium text-center leading-relaxed">Your reading progress is being synced to your account. You can resume exactly where you left off.</p>
            <div className="space-y-3">
              <button 
                onClick={onClose} 
                className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all uppercase tracking-widest text-xs"
              >
                Save & Exit Library
              </button>
              <button 
                onClick={() => setShowConfirmClose(false)} 
                className="w-full py-4 bg-gray-100 text-gray-500 font-black rounded-2xl uppercase tracking-widest text-xs hover:bg-gray-200 transition-all"
              >
                Wait, Keep Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
