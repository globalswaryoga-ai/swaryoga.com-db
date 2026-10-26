'use client';

import React, { useState } from 'react';
import {
  Languages,
  Sparkles,
  Copy,
  CheckCircle2,
  Volume2,
  Play,
  Pause,
  ArrowRight,
  Film,
  RefreshCw,
  Presentation,
} from 'lucide-react';

const SUPPORTED_LANGS = [
  { code: 'hi', name: 'Hindi (हिंदी)', flag: '🇮🇳', region: 'indian' },
  { code: 'mr', name: 'Marathi (मराठी)', flag: '🚩', region: 'indian' },
  { code: 'en', name: 'English', flag: '🇬🇧', region: 'global' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳', region: 'south_indian' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)', flag: '🇮🇳', region: 'indian' },
  { code: 'ta', name: 'Tamil (தமிழ்)', flag: '🇮🇳', region: 'south_indian' },
  { code: 'te', name: 'Telugu (తెలుగు)', flag: '🇮🇳', region: 'south_indian' },
  { code: 'ml', name: 'Malayalam (മലയാളം)', flag: '🇮🇳', region: 'south_indian' },
  { code: 'bn', name: 'Bengali (বাংলা)', flag: '🇮🇳', region: 'indian' },
  { code: 'pa', name: 'Punjabi (ਪੰਜਾਬੀ)', flag: '🇮🇳', region: 'indian' },
  { code: 'sa', name: 'Sanskrit (संस्कृतम्)', flag: '🕉️', region: 'indian' },
  { code: 'or', name: 'Odia (ଓଡ଼ିଆ)', flag: '🇮🇳', region: 'indian' },
  { code: 'ne', name: 'Nepali (नेपाली)', flag: '🇳🇵', region: 'indian' },
  { code: 'zh', name: 'Mandarin (中文)', flag: '🇨🇳', region: 'global' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸', region: 'global' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷', region: 'global' },
  { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦', region: 'global' },
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪', region: 'global' },
  { code: 'pt', name: 'Portuguese (Português)', flag: '🇧🇷', region: 'global' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵', region: 'global' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷', region: 'global' },
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺', region: 'global' },
  { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹', region: 'global' },
  { code: 'tr', name: 'Turkish (Türkçe)', flag: '🇹🇷', region: 'global' },
  { code: 'id', name: 'Indonesian (Bahasa)', flag: '🇮🇩', region: 'global' },
];

interface Module7Props {
  token?: string | null;
  initialSourceText?: string;
  onSendToVideoStudio?: (scriptsByLang: Record<string, string>) => void;
  onSendToPptStudio?: (script: string) => void;
}

export default function Module7MultilingualText({
  token,
  initialSourceText = '',
  onSendToVideoStudio,
  onSendToPptStudio,
}: Module7Props) {
  const [sourceText, setSourceText] = useState(
    initialSourceText ||
      `[smile:80] [namaste] नमस्कार मित्रों! आज हम स्वर योग के इस चमत्कारी विज्ञान को समझेंगे।
[curious:85] क्या आप जानते हैं कि जब सूर्य स्वर चलता है, तब भोजन अमृत के समान पचता है?
[pause:1.5s]
[serious:90] [pointing_finger] हर 60 से 90 मिनट में आपका सक्रिय स्वर बदलता है।
[big_smile:85] आइए, इस वैदिक साधना को अपने दैनिक जीवन में अपनाएं!`
  );

  const [sourceLang, setSourceLang] = useState('hi');
  const [targetLangs, setTargetLangs] = useState<string[]>(['mr', 'en', 'kn', 'gu', 'ta', 'te']);
  const [mode, setMode] = useState<'strict_exact' | 'expand_detail' | 'ebook_chapter'>('strict_exact');
  const [activeTab, setActiveTab] = useState<string>('hi');
  const [translations, setTranslations] = useState<Record<string, string>>({
    hi: sourceText,
  });
  const [translatingLangs, setTranslatingLangs] = useState<Record<string, boolean>>({});
  const [playingLang, setPlayingLang] = useState<string | null>(null);
  const [copiedLang, setCopiedLang] = useState<string | null>(null);

  const handleTranslateAll = async () => {
    if (!sourceText.trim()) return;

    for (const lang of targetLangs) {
      if (lang === sourceLang) continue;
      setTranslatingLangs((prev) => ({ ...prev, [lang]: true }));

      try {
        const res = await fetch('/api/avatar/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: sourceText,
            targetLang: lang,
            sourceLang,
            mode,
          }),
        });
        const data = await res.json();
        if (data.success && data.translatedScript) {
          setTranslations((prev) => ({ ...prev, [lang]: data.translatedScript }));
        }
      } catch (err) {
        console.error(`Translate to ${lang} error:`, err);
      } finally {
        setTranslatingLangs((prev) => ({ ...prev, [lang]: false }));
      }
    }
  };

  const handleTranslateSingleTab = async (lang: string) => {
    if (!sourceText.trim() || lang === sourceLang) return;
    setTranslatingLangs((prev) => ({ ...prev, [lang]: true }));
    try {
      const res = await fetch('/api/avatar/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: sourceText,
          targetLang: lang,
          sourceLang,
          mode,
        }),
      });
      const data = await res.json();
      if (data.success && data.translatedScript) {
        setTranslations((prev) => ({ ...prev, [lang]: data.translatedScript }));
      }
    } catch (err) {
      console.error(`Translate to ${lang} error:`, err);
    } finally {
      setTranslatingLangs((prev) => ({ ...prev, [lang]: false }));
    }
  };

  const handleCopy = (lang: string) => {
    const textToCopy = translations[lang] || (lang === sourceLang ? sourceText : '');
    navigator.clipboard.writeText(textToCopy);
    setCopiedLang(lang);
    setTimeout(() => setCopiedLang(null), 2000);
  };

  const handleDownloadEbook = () => {
    const allLangs = Object.keys(translations);
    let bookContent = `# SWAR YOGA MULTILINGUAL SCRIPTURE & E-BOOK CHAPTER\n\n`;
    bookContent += `Mode: ${mode.toUpperCase()}\n`;
    bookContent += `Date: ${new Date().toLocaleDateString()}\n\n`;
    bookContent += `=========================================================\n\n`;

    allLangs.forEach((lang) => {
      const langObj = SUPPORTED_LANGS.find((l) => l.code === lang);
      bookContent += `## ${langObj?.flag} ${langObj?.name || lang}\n\n`;
      bookContent += `${translations[lang]}\n\n`;
      bookContent += `---------------------------------------------------------\n\n`;
    });

    const blob = new Blob([bookContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SwarYoga_Multilingual_${mode}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSpeakLang = (langCode: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (playingLang === langCode) {
      window.speechSynthesis.cancel();
      setPlayingLang(null);
      return;
    }
    window.speechSynthesis.cancel();
    setPlayingLang(langCode);

    const script = translations[langCode] || sourceText;
    const clean = script.replace(/\[[^\]]+\]/g, '').trim();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang =
      langCode === 'hi'
        ? 'hi-IN'
        : langCode === 'mr'
        ? 'mr-IN'
        : langCode === 'en'
        ? 'en-IN'
        : langCode === 'gu'
        ? 'gu-IN'
        : langCode === 'kn'
        ? 'kn-IN'
        : langCode === 'ta'
        ? 'ta-IN'
        : langCode === 'te'
        ? 'te-IN'
        : 'hi-IN';

    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((vox) => vox.lang.toLowerCase().startsWith(langCode));
    if (v) utterance.voice = v;

    utterance.onend = () => setPlayingLang(null);
    utterance.onerror = () => setPlayingLang(null);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 flex items-center justify-center text-white font-black shadow-lg">
            <Languages size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Module 7: Multilingual Text & E-Book Engine (20 Languages)
              </h2>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-bold">
                1:1 Strict • Emotion Preserved • E-Book
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict 1:1 translation or rich E-Book chapters while locking emotion symbols (`[smile]`, `[namaste]`) and Vedic terms.
            </p>
          </div>
        </div>

        {/* Mode Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setMode('strict_exact')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'strict_exact'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Strict 1:1 Line-for-Line match - 1 line stays 1 line"
            >
              🎯 Strict 1:1
            </button>
            <button
              type="button"
              onClick={() => setMode('expand_detail')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'expand_detail'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Expand into 2-4 lines explanation"
            >
              📝 Expand (2-4 Lines)
            </button>
            <button
              type="button"
              onClick={() => setMode('ebook_chapter')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'ebook_chapter'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Transform into Full Multilingual E-Book Chapter"
            >
              📖 E-Book Chapter
            </button>
          </div>

          {/* Source Language Picker */}
          <div className="flex items-center gap-1 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400 font-medium">Source:</span>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              {SUPPORTED_LANGS.map((l) => (
                <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                  {l.flag} {l.name.split(' ')[0]}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleTranslateAll}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 text-black font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} />
            <span>Translate Selected ({targetLangs.length})</span>
          </button>

          <button
            onClick={handleDownloadEbook}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs shadow cursor-pointer flex items-center gap-1.5"
            title="Download Multilingual Chapter as Markdown / E-Book"
          >
            <span>📥 Export E-Book</span>
          </button>
        </div>
      </div>

      {/* Target Languages Filter Bar & Grid */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Target Languages:</span>
            <span className="text-[11px] text-teal-400 font-semibold font-mono">
              {targetLangs.length} of {SUPPORTED_LANGS.length} Selected
            </span>
          </div>

          {/* Quick Selection Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setTargetLangs(SUPPORTED_LANGS.map((l) => l.code).filter((c) => c !== sourceLang))}
              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-medium"
            >
              All 20 Languages
            </button>
            <button
              type="button"
              onClick={() =>
                setTargetLangs(
                  SUPPORTED_LANGS.filter((l) => l.region === 'indian' || l.region === 'south_indian')
                    .map((l) => l.code)
                    .filter((c) => c !== sourceLang)
                )
              }
              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-medium"
            >
              Indian Languages (12)
            </button>
            <button
              type="button"
              onClick={() =>
                setTargetLangs(
                  SUPPORTED_LANGS.filter((l) => l.region === 'south_indian')
                    .map((l) => l.code)
                    .filter((c) => c !== sourceLang)
                )
              }
              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-medium"
            >
              South Indian (Kn, Ta, Te, Ml)
            </button>
            <button
              type="button"
              onClick={() =>
                setTargetLangs(
                  SUPPORTED_LANGS.filter((l) => l.region === 'global')
                    .map((l) => l.code)
                    .filter((c) => c !== sourceLang)
                )
              }
              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-medium"
            >
              Global Languages (8)
            </button>
            <button
              type="button"
              onClick={() => setTargetLangs([])}
              className="px-2 py-0.5 rounded-md bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 cursor-pointer font-medium"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-1.5">
          {SUPPORTED_LANGS.map((lang) => {
            const isSource = lang.code === sourceLang;
            const checked = targetLangs.includes(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                disabled={isSource}
                onClick={() => {
                  setTargetLangs((prev) =>
                    checked ? prev.filter((c) => c !== lang.code) : [...prev, lang.code]
                  );
                }}
                className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                  isSource
                    ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-300 opacity-80 cursor-default'
                    : checked
                    ? 'bg-teal-500/20 border-teal-500 text-teal-200 shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-base mb-0.5">{lang.flag}</div>
                <div className="text-[10px] font-bold truncate">{lang.name.split(' ')[0]}</div>
                <span className="text-[8px] block text-slate-500">
                  {isSource ? '● Source' : checked ? '✓ Selected' : '+ Add'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor with Language Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {[sourceLang, ...targetLangs.filter((l) => l !== sourceLang)].map((langCode) => {
              const langObj = SUPPORTED_LANGS.find((l) => l.code === langCode);
              const isActive = activeTab === langCode;
              const isBusy = translatingLangs[langCode];
              return (
                <button
                  key={langCode}
                  onClick={() => setActiveTab(langCode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-teal-500 text-black shadow-md'
                      : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{langObj?.flag}</span>
                  <span>{langObj?.name.split(' ')[0]}</span>
                  {isBusy && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeTab !== sourceLang && (
              <button
                onClick={() => handleTranslateSingleTab(activeTab)}
                disabled={translatingLangs[activeTab]}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-teal-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Translate only this language"
              >
                <RefreshCw size={12} className={translatingLangs[activeTab] ? 'animate-spin' : ''} />
                <span>Re-Translate Tab</span>
              </button>
            )}

            <button
              onClick={() => handleCopy(activeTab)}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 cursor-pointer"
            >
              <Copy size={12} />
              <span>{copiedLang === activeTab ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={() => handleSpeakLang(activeTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                playingLang === activeTab ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-800 text-amber-300'
              }`}
            >
              {playingLang === activeTab ? <Pause size={13} /> : <Play size={13} className="fill-amber-300" />}
              <span>{playingLang === activeTab ? 'Stop' : 'Listen'}</span>
            </button>
          </div>
        </div>

        {/* Textarea for active language */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>
              {activeTab === sourceLang ? 'Original Source Script' : 'Translated Target Script'} for:{' '}
              <strong className="text-teal-400">{SUPPORTED_LANGS.find((l) => l.code === activeTab)?.name}</strong>
            </span>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-500">
                Mode: <strong className="text-amber-400 capitalize">{mode.replace('_', ' ')}</strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-mono">Emotion Tags & Sacred Sutras Preserved</span>
            </div>
          </div>

          <textarea
            value={translations[activeTab] || (activeTab === sourceLang ? sourceText : '')}
            onChange={(e) => {
              const val = e.target.value;
              setTranslations((prev) => ({ ...prev, [activeTab]: val }));
              if (activeTab === sourceLang) setSourceText(val);
            }}
            rows={10}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-400 font-mono leading-relaxed"
            placeholder="Script with preserved emotion tags will appear here..."
          />
        </div>

        {/* Dispatch to Video Studio */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            Ready with <strong>{Object.keys(translations).length} language versions</strong> ({mode.replace('_', ' ')})
          </span>

          <div className="flex items-center gap-2">
            {onSendToPptStudio && (
              <button
                onClick={() => onSendToPptStudio(translations[activeTab] || sourceText)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border border-amber-500/30"
              >
                <Presentation size={14} />
                <span>Create Visual PPTs (Module 8) ➔</span>
              </button>
            )}

            {onSendToVideoStudio && (
              <button
                onClick={() => onSendToVideoStudio(translations)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-black font-extrabold text-xs sm:text-sm shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Film size={14} />
                <span>Video Studio ➔</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
