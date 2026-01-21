
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
  feedback?: 'up' | 'down' | null;
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

  const handleFeedback = (index: number, type: 'up' | 'down') => {
    setMessages(prev => {
      const newMsgs = [...prev];
      newMsgs[index] = {
        ...newMsgs[index],
        feedback: newMsgs[index].feedback === type ? null : type
      };
      return newMsgs;
    });
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
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition