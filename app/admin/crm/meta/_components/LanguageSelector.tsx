'use client';

import React, { useState } from 'react';
import { Languages } from 'lucide-react';

interface LanguageSelectorProps {
  onTranslate: (text: string, targetLang: string) => Promise<string>;
  currentText: string;
  onTextTranslated: (text: string) => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
];

export default function LanguageSelector({ onTranslate, currentText, onTextTranslated }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('hi');
  const [translating, setTranslating] = useState(false);

  const handleTranslate = async () => {
    if (!currentText.trim()) return;
    
    setTranslating(true);
    try {
      const translated = await onTranslate(currentText, targetLang);
      onTextTranslated(translated);
      setIsOpen(false);
    } catch (error) {
      console.error('Translation failed', error);
      alert('Translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
        title="Translate Message"
      >
        <Languages size={20} />
      </button>

      {isOpen && (
        <div className="absolute bottom-12 right-0 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 animate-in">
          <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
            <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">Translate</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              &times;
            </button>
          </div>
          
          <div className="p-4 space-y-4">
            <div>
               <label className="block text-xs font-semibold text-gray-400 mb-1">Sending Language (Review)</label>
               <select 
                 value={targetLang}
                 onChange={(e) => setTargetLang(e.target.value)}
                 className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               >
                 {SUPPORTED_LANGUAGES.map(lang => (
                   <option key={lang.code} value={lang.code}>
                     {lang.flag} {lang.name}
                   </option>
                 ))}
               </select>
               <p className="text-[10px] text-gray-500 mt-1">
                 Your text will be converted to this language.
               </p>
            </div>

            <button
              onClick={handleTranslate}
              disabled={translating || !currentText.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
              {translating ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  Translating...
                </>
              ) : (
                <>
                  <Languages size={16} />
                  Translate & Replace
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
