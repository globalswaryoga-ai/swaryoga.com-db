'use client';

// Shared Hindi/English toggle for the interactive Astrologer Workspace UI
// (chart/table labels) — separate from the AI final-prediction report
// language (lib/kpAstro/languages.ts), which supports many more languages
// for generated text. Any table component can call useKpLanguage() without
// every intermediate parent needing to thread the prop through by hand.

import { createContext, useContext, useState, type ReactNode } from 'react';
import type { UiLang } from '@/lib/kpAstro/uiLabels';

const KpLanguageContext = createContext<{ lang: UiLang; setLang: (l: UiLang) => void }>({
  lang: 'en',
  setLang: () => {},
});

export function KpLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<UiLang>('en');
  return <KpLanguageContext.Provider value={{ lang, setLang }}>{children}</KpLanguageContext.Provider>;
}

export function useKpLanguage() {
  return useContext(KpLanguageContext);
}

export function KpLanguageToggle() {
  const { lang, setLang } = useKpLanguage();
  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
      {(['en', 'hi'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className={`px-2 py-1 text-xs font-medium rounded-md ${lang === code ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}
        >
          {code === 'en' ? 'EN' : 'हिं'}
        </button>
      ))}
    </div>
  );
}
