
import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
  category: 'General' | 'Technical' | 'Academic' | 'Community';
}

type Language = 'English' | 'Chichewa';

export const FAQs: React.FC = () => {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('study_hub_chat_lang') as Language) || 'English';
  });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleLanguage = () => {
    const newLang = lang === 'English' ? 'Chichewa' : 'English';
    setLang(newLang);
    localStorage.setItem('study_hub_chat_lang', newLang);
  };

  const faqs_en: FAQItem[] = [
    {
      category: 'General',
      question: 'What is Study Hub Malawi?',
      answer: 'Study Hub Malawi is a comprehensive digital library designed specifically for Malawian students. It provides access to textbooks, revision notes, and past MANEB examination papers for Primary (Standard 5-8) and Secondary (Form 1-4) levels.'
    },
    {
      category: 'Academic',
      question: 'Are the materials aligned with the Malawian curriculum?',
      answer: 'Yes! All resources uploaded to Study Hub are carefully curated to align with the current Malawian National Curriculum as set by the Ministry of Education (MoE) and MIE.'
    },
    {
      category: 'Technical',
      question: 'Can I read books without an internet connection?',
      answer: 'Absolutely. You can use the "Offline Copy" button on any resource. Once saved, these items will appear in your "Offline" tab in the Library and can be opened even when you have no data.'
    },
    {
      category: 'Academic',
      question: 'How does the AI Smart Quiz work?',
      answer: 'When you open a PDF, click "Smart Quiz." Our AI analyzes the actual text of your textbook to generate specific Multiple Choice and Critical Thinking questions to test your understanding.'
    },
    {
      category: 'Community',
      question: 'What are the rules for Chat Rooms (Macheza)?',
      answer: 'The community is a safe space for learning. We have a zero-tolerance policy for bullying, harassment, or sharing non-educational content. Always remain respectful to your fellow learners.'
    },
    {
      category: 'Community',
      question: 'How do I "Share my Testimony" (Umboni wanga)?',
      answer: 'Go to the Community Hub and click "Share my Testimony." You can write about how Study Hub has helped your grades or study habits to inspire others in Malawi.'
    },
    {
      category: 'Technical',
      question: 'Why is a PDF failing to open?',
      answer: 'Some mobile browsers have limited PDF support. If a file doesn\'t open in the app viewer, use the "Download" or "Open in New Tab" buttons to view it using your phone\'s native document reader.'
    }
  ];

  const faqs_ch: FAQItem[] = [
    {
      category: 'General',
      question: 'Kodi Study Hub Malawi ndi chiyani?',
      answer: 'Study Hub Malawi ndi malo osungira mabuku a pa intaneti omwe apangidwa kuti athandize ophunzira a m’Malawi. Amakupatsani mwayi opeza mabuku, manotsi, komanso mayeso a m’mbuyomo a MANEB a ku Primary (Standard 5-8) ndi Secondary (Form 1-4).'
    },
    {
      category: 'Academic',
      question: 'Kodi zinthu zimenezi zikugwirizana ndi maphunziro a m’Malawi?',
      answer: 'Inde! Zinthu zonse zomwe zili pa Study Hub zimasankhidwa mosamala kuti zigwirizane ndi maphunziro omwe Unduna wa Maphunziro ukhazikitsa m’Malawi.'
    },
    {
      category: 'Technical',
      question: 'Kodi nditha kuwerenga mabuku popanda intaneti?',
      answer: 'Inde. Mutha kugwiritsa ntchito batani la "Offline Copy" pa chinthu chilichonse. Mukasunga, zinthu zimenezi zidzaonekera mu gawo la "Offline" mu Library ndipo mutha kuzitsegula ngakhale mulibe data kapena Wi-Fi.'
    },
    {
      category: 'Academic',
      question: 'Kodi Smart Quiz imagwira bwanji ntchito?',
      answer: 'Mukatsegula PDF, dinani batani la "Smart Quiz." Nzeru zamakono (AI) zimasanthula mawu a m’bukulo ndikupanga mafunso odzipima kuti muone ngati mwamva bwino zomwe mwawerenga.'
    },
    {
      category: 'Community',
      question: 'Kodi malamulo a Macheza (Chat Rooms) ndi otani?',
      answer: 'Bwaloli ndi malo otetezedwa ophunzirira. Sitilola chipongwe, kunyoza ena, kapena kutumiza zinthu zomwe sizikugwirizana ndi maphunziro. Nthawi zonse muzilemekeza ophunzira anzanu.'
    },
    {
      category: 'Community',
      question: 'Ndingatumize bwanji Umboni wanga (Share my Testimony)?',
      answer: 'Pitani ku Bwalo la Ophunzira (Community Hub) ndipo dinani "Umboni wanga." Mutha kulemba momwe Study Hub yakuthandizirani pamaphunziro anu kuti mulimbikitse ena m’Malawi.'
    },
    {
      category: 'Technical',
      question: 'Chifukwa chiyani PDF ikukana kutseguka?',
      answer: 'Masakatuli ena a m’manja sangakwanitse kutsegula PDF mwachindunji. Ngati ikukana, dinani "Download" kapena "Open in New Tab" kuti muwerenge pogwiritsa ntchito pulogalamu ya m’foni yanu yowerengera mabuku.'
    }
  ];

  const currentFaqs = lang === 'English' ? faqs_en : faqs_ch;

  const t = {
    title: lang === 'English' ? 'How can we help?' : 'Tingakuthandizeni bwanji?',
    sub: lang === 'English' ? 'Find quick answers to common questions about Study Hub Malawi.' : 'Pezani mayankho ofulumira pa mafunso omwe anthu amafunsira za Study Hub Malawi.',
    stillQuestions: lang === 'English' ? 'Still have questions?' : 'Kodi muli ndi mafunso enanso?',
    supportSub: lang === 'English' ? 'Our support team is ready to help you with anything.' : 'Gulu lathu lothandiza liri okonzeka kukuthandizani pa chilichonse.',
    contactBtn: lang === 'English' ? 'Contact Support' : 'Lankhulani nafe',
    categoryLabels: {
      General: lang === 'English' ? 'General' : 'Zonse',
      Technical: lang === 'English' ? 'Technical' : 'Zaukadaulo',
      Academic: lang === 'English' ? 'Academic' : 'Zamaphunziro',
      Community: lang === 'English' ? 'Community' : 'Zamagulu'
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left space-y-2">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{t.title}</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg font-medium">{t.sub}</p>
        </div>
        <button 
          onClick={toggleLanguage}
          className="px-4 py-2 bg-white dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-200/50 flex items-center gap-2 hover:bg-emerald-50 transition-all shadow-sm"
        >
          🌐 {lang}
        </button>
      </div>

      <div className="space-y-4">
        {currentFaqs.map((faq, index) => (
          <div 
            key={index}
            className={`bg-white dark:bg-slate-800 rounded-[2rem] border transition-all duration-300 overflow-hidden ${
              activeIndex === index ? 'border-emerald-500 shadow-xl shadow-emerald-50/50 dark:shadow-none' : 'border-slate-100 dark:border-slate-700 shadow-sm hover:border-emerald-200'
            }`}
          >
            <button
              onClick={() => setActiveIndex(activeIndex === index ? null : index)}
              className="w-full p-6 md:p-8 text-left flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                  faq.category === 'General' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 
                  faq.category === 'Technical' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 
                  faq.category === 'Academic' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                  'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
                }`}>
                  {t.categoryLabels[faq.category]}
                </span>
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-sm md:text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
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
                <div className="h-px bg-slate-50 dark:bg-slate-700 mb-6"></div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-[2.5rem] p-8 md:p-12 border border-emerald-100 dark:border-emerald-900/30 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-100">{t.stillQuestions}</h3>
          <p className="text-emerald-700 dark:text-emerald-400 font-medium">{t.supportSub}</p>
        </div>
        <button 
          onClick={() => window.location.hash = '#support'} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none transition-all uppercase tracking-widest text-xs whitespace-nowrap active:scale-95"
        >
          {t.contactBtn}
        </button>
      </div>
    </div>
  );
};
