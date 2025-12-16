import React, { useState } from 'react';
import { Globe, X } from 'lucide-react';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  availableLanguages?: string[];
}

export default function LanguageSelector({
  selectedLanguage,
  onLanguageChange,
  availableLanguages = ['English', 'Hindi', 'Marathi', 'Nepali']
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const languageCodes: { [key: string]: string } = {
    'English': 'en',
    'Hindi': 'hi',
    'Marathi': 'mr',
    'Nepali': 'ne'
  };

  return (
    <div className="fixed right-0 top-20 z-40">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-l-lg shadow-lg flex items-center gap-2 transition-all"
        aria-label="Toggle language selector"
      >
        <Globe className="w-5 h-5" />
        <span className="hidden sm:inline text-sm font-medium">{selectedLanguage}</span>
      </button>

      {/* Language Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white shadow-2xl rounded-lg overflow-hidden min-w-48">
          <div className="bg-indigo-600 text-white p-4 flex items-center justify-between">
            <h3 className="font-semibold">Select Language</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-indigo-700 p-1 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2 space-y-1">
            {availableLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  onLanguageChange(lang);
                  setIsOpen(false);
                  // Store language preference
                  localStorage.setItem('preferredLanguage', lang);
                  // Optionally reload or update content
                  document.documentElement.lang = languageCodes[lang];
                }}
                className={`w-full text-left px-4 py-2 rounded transition-colors ${
                  selectedLanguage === lang
                    ? 'bg-indigo-100 text-indigo-700 font-semibold'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {lang}
                {selectedLanguage === lang && (
                  <span className="float-right">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className="border-t px-4 py-2 text-xs text-gray-500">
            <p>Language preference saved</p>
          </div>
        </div>
      )}
    </div>
  );
}
