
import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'General' | 'Technical' | 'Academic';
}

export const FAQs: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      category: 'General',
      question: 'What is Study Hub Malawi?',
      answer: 'Study Hub Malawi is a comprehensive digital library designed specifically for Malawian students. It provides access to textbooks, revision notes, and past MANEB examination papers for Primary (Standard 5-8) and Secondary (Form 1-4) levels.'
    },
    {
      category: 'Academic',
      question: 'Are the materials aligned with the Malawian curriculum?',
      answer: 'Yes! All resources uploaded to Study Hub are carefully curated to align with the current Malawian National Curriculum as set by the Ministry of Education.'
    },
    {
      category: 'Technical',
      question: 'Can I read books without an internet connection?',
      answer: 'Absolutely. You can use the "Save Offline" button on any resource. Once downloaded, these items will appear in your "Downloads" tab and can be opened even when you have no data or Wi-Fi.'
    },
    {
      category: 'Academic',
      question: 'How does the AI Smart Quiz work?',
      answer: 'When you open a PDF, you can click "Smart Quiz." Our AI analyzes the actual text of the book to generate specific Multiple Choice and Critical Thinking questions to test your understanding of that specific material.'
    },
    {
      category: 'General',
      question: 'Is Study Hub Malawi free to use?',
      answer: 'Our mission is to make education accessible. Most of our core resources are free for students. Some premium features or massive data-heavy books may require a verified account.'
    },
    {
      category: 'Technical',
      question: 'What should I do if a PDF is not opening?',
      answer: 'If the embedded viewer fails, click the "Open in New Tab" or "Download" button. Some mobile browsers have restricted PDF support, but downloading the file always works.'
    },
    {
      category: 'General',
      question: 'How can I contribute my own notes?',
      answer: 'We love community contributions! Please reach out to the administrator through the "Support" tab to submit your high-quality notes for review and publication.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-gray-800 tracking-tight">How can we help?</h2>
        <p className="text-gray-500 max-w-lg mx-auto font-medium">Find quick answers to common questions about Study Hub Malawi.</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div 
            key={index}
            className={`bg-white rounded-[2rem] border transition-all duration-300 overflow-hidden ${
              activeIndex === index ? 'border-emerald-500 shadow-xl shadow-emerald-50' : 'border-gray-100 shadow-sm hover:border-emerald-200'
            }`}
          >
            <button
              onClick={() => setActiveIndex(activeIndex === index ? null : index)}
              className="w-full p-6 md:p-8 text-left flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                  faq.category === 'General' ? 'bg-blue-50 text-blue-600' : 
                  faq.category === 'Technical' ? 'bg-purple-50 text-purple-600' : 'bg-orange-50 text-orange-600'
                }`}>
                  {faq.category}
                </span>
                <h3 className="font-black text-gray-800 text-sm md:text-base group-hover:text-emerald-700 transition-colors">
                  {faq.question}
                </h3>
              </div>
              <span className={`transform transition-transform duration-300 text-emerald-500 font-bold ${activeIndex === index ? 'rotate-180' : ''}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            
            <div 
              className={`transition-all duration-300 ease-in-out ${
                activeIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-8 pb-8 pt-0">
                <div className="h-px bg-gray-50 mb-6"></div>
                <p className="text-gray-600 leading-relaxed font-medium">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-emerald-50 rounded-[2.5rem] p-8 md:p-12 border border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-2xl font-black text-emerald-900">Still have questions?</h3>
          <p className="text-emerald-700 font-medium">Our support team is ready to help you with anything.</p>
        </div>
        <button 
          onClick={() => window.location.hash = '#support'} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-emerald-200 transition-all uppercase tracking-widest text-xs whitespace-nowrap active:scale-95"
        >
          Contact Support
        </button>
      </div>
    </div>
  );
};
