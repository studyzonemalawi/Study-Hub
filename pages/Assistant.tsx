
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface AssistantProps {
  user: User;
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  groundingUrls?: { uri: string; title: string }[];
}

export const Assistant: React.FC<AssistantProps> = ({ user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const SUGGESTED_QUESTIONS = [
    { text: "Compare the districts of Lilongwe and Blantyre in a table.", icon: "📊" },
    { text: "What is the formula for calculating photosynthesis?", icon: "🧪" },
    { text: "Show me a summary of the 1915 Chilembwe Uprising.", icon: "🇲🇼" },
    { text: "How do I solve quadratic equations? Provide examples.", icon: "🔢" }
  ];

  const FOLLOW_UP_SUGGESTIONS = [
    "Summarize this in points",
    "Give me a quick quiz on this",
    "Show me a local example",
    "Explain like I'm 10"
  ];

  // Initialize with a warm welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const firstName = user.name.split(' ')[0] || 'Learner';
      const welcomeMsg: ChatMessage = {
        role: 'ai',
        content: `**Muli bwanji, ${firstName}!** 👋 \n\nI am your **Study Hub Teacher**. I'm thrilled to help you with your ${user.currentGrade} studies today. \n\nI can provide precise explanations, detailed tables, and mathematical formulae—all based on the **Malawi National Syllabus**. \n\nWhat topic are we tackling today? You can ask me anything, or try one of the suggestions below! 📚🇲🇼`
      };
      setMessages([welcomeMsg]);
    }
  }, [user.name, user.currentGrade, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (e?: React.FormEvent, text?: string) => {
    e?.preventDefault();
    const query = text || input;
    if (!query.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setShowSuggestions(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `You are the 'Study Hub Teacher', an expert Malawian educator for primary and secondary students. 
      The student is in ${user.currentGrade} (${user.educationLevel} level). 
      Your goal is to answer their educational questions based strictly on the Malawi National School Syllabus (MIE/MANEB). 
      
      CRITICAL FORMATTING RULES:
      1. Use Markdown tables (GFM) for comparisons or data lists.
      2. Use LaTeX for ALL mathematical, chemical, and physical formulae. Use $ for inline and $$ for block math.
      3. Use local Malawian context (districts like Mzimba, Zomba; resources like Lake Malawi; crops like tobacco, tea, cotton; history like Kamuzu Banda or John Chilembwe).
      4. If you mention visual diagrams, describe them precisely or use simple SVG code blocks if appropriate.
      5. Provide precise, well-summarized, and encouraging answers.
      
      Student question: ${query}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      const fullText = response.text || "Zandivuta pang'ono (I am having a bit of trouble answering right now). Please try again.";
      
      // Extract grounding metadata if available
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const urls = groundingChunks?.map((chunk: any) => ({
        uri: chunk.web?.uri,
        title: chunk.web?.title
      })).filter((u: any) => u.uri && u.title) || [];

      setMessages(prev => [...prev, { role: 'ai', content: fullText, groundingUrls: urls }]);
      setShowSuggestions(true);
    } catch (err) {
      console.error("AI Assistant error:", err);
      setMessages(prev => [...prev, { role: 'ai', content: "Pepani! (I'm sorry), I encountered an error. Please check your connection or try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-16rem)] animate-in fade-in duration-500 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Learner Assistant</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Expert Teacher grounded in the Malawian Syllabus.</p>
        </div>
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-800">
           <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
           <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Teacher Online</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl border border-slate-200/60 dark:border-slate-700 overflow-hidden relative">
        {/* Chat Header */}
        <div className="bg-slate-900 p-6 md:px-10 flex items-center gap-5 flex-none">
           <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-3xl shadow-lg">👨‍🏫</div>
           <div>
              <h3 className="text-white font-black text-xl leading-none">Study Hub Teacher</h3>
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mt-2">Syllabus Expert • Grounded Search • Precise Answers</p>
           </div>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[90%] rounded-[2.5rem] p-6 md:p-8 shadow-sm border ${
                m.role === 'user' 
                  ? 'bg-emerald-600 text-white border-emerald-500 rounded-tr-none' 
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border-slate-200 dark:border-slate-700'
              }`}>
                <div className="prose dark:prose-invert prose-sm max-w-none font-medium leading-relaxed">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {m.content}
                  </ReactMarkdown>
                </div>
                
                {m.groundingUrls && m.groundingUrls.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-3">Sources & Visual Context:</p>
                    <div className="flex flex-wrap gap-2">
                      {m.groundingUrls.map((url, i) => (
                        <a 
                          key={i} 
                          href={url.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          {url.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {m.role === 'ai' && !isTyping && idx === messages.length - 1 && (
                   <div className="mt-4 flex items-center gap-3">
                      <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest">Malawi Syllabus: High Confidence</span>
                      <div className="flex gap-1">
                         <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span>
                         <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" style={{animationDelay: '200ms'}}></span>
                         <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" style={{animationDelay: '400ms'}}></span>
                      </div>
                   </div>
                )}
              </div>
            </div>
          ))}

          {/* Initial Suggestions (Only shown at the very start) */}
          {messages.length === 1 && !isTyping && (
             <div className="grid sm:grid-cols-2 gap-4 w-full max-w-3xl pt-4 animate-in fade-in zoom-in duration-500">
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button 
                   key={i} 
                   onClick={() => handleSendMessage(undefined, q.text)}
                   className="p-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 text-left hover:border-emerald-500 hover:shadow-xl transition-all group flex items-start gap-4"
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">{q.icon}</span>
                    <span className="text-xs font-black text-slate-600 dark:text-slate-300 leading-tight tracking-tight">{q.text}</span>
                  </button>
                ))}
             </div>
          )}

          {isTyping && (
             <div className="flex justify-start animate-in fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] rounded-tl-none p-6 md:p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
                   <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '200ms'}}></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '400ms'}}></div>
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Teacher is researching your question...</span>
                </div>
             </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Action Area for suggestions after response */}
        {showSuggestions && !isTyping && (
          <div className="px-6 md:px-10 pb-4 flex flex-wrap gap-2 animate-in slide-in-from-bottom-2 duration-300">
            {FOLLOW_UP_SUGGESTIONS.map((suggestion, i) => (
              <button 
                key={i}
                onClick={() => handleSendMessage(undefined, suggestion)}
                className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-full text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-6 md:p-10 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4 flex-none">
           <input
             type="text"
             value={input}
             onChange={(e) => setInput(e.target.value)}
             placeholder="Ask about Math, Science, History, Geography..."
             disabled={isTyping}
             className="flex-1 px-6 py-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold text-sm outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-slate-900 dark:text-white disabled:opacity-50"
           />
           <button 
             type="submit"
             disabled={isTyping || !input.trim()}
             className="bg-emerald-600 hover:bg-emerald-700 text-white p-5 rounded-[1.5rem] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 flex-none"
           >
             <svg className="w-6 h-6 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
           </button>
        </form>
      </div>
    </div>
  );
};