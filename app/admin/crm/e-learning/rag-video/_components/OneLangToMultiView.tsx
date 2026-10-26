'use client';

import React, { useState } from 'react';
import {
  Languages,
  Sparkles,
  Copy,
  CheckCircle2,
  Download,
  Loader2,
  Clock,
  Layers,
  ArrowRight,
  FileText,
  AlertCircle
} from 'lucide-react';

const ALL_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi (हिंदी)', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi (मराठी)', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali (नेपाली)', flag: '🇳🇵' },
  { code: 'zh', name: 'Mandarin (中文)', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦' },
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese (Português)', flag: '🇧🇷' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish (Türkçe)', flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch (Nederlands)', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish (Svenska)', flag: '🇸🇪' },
  { code: 'th', name: 'Thai (ไทย)', flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian (Bahasa)', flag: '🇮🇩' },
];

interface OneLangToMultiViewProps {
  token: string | null;
  initialText?: string;
  initialTitle?: string;
}

export default function OneLangToMultiView({
  token,
  initialText = '',
  initialTitle = '',
}: OneLangToMultiViewProps) {
  const [topicTitle, setTopicTitle] = useState(initialTitle || 'Swar Yoga Session');
  const [sourceText, setSourceText] = useState(initialText);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguages, setTargetLanguages] = useState<string[]>(['hi']);
  const [mode, setMode] = useState<'direct' | 'lecture' | 'summary'>('direct');
  const [insertMarkers, setInsertMarkers] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<Array<{ language: string; languageName: string; text: string }>>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const toggleTargetLanguage = (code: string) => {
    if (targetLanguages.includes(code)) {
      if (targetLanguages.length > 1) {
        setTargetLanguages(targetLanguages.filter((c) => c !== code));
      }
    } else {
      setTargetLanguages([...targetLanguages, code]);
    }
  };

  const handleTranslate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceText.trim()) {
      setError('Please enter or paste source transcript / script.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/e-learning/ai-video/translate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          sourceText,
          sourceLanguage,
          targetLanguages,
          mode,
          insertMarkers,
          topicTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to translate scripts');
      }

      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleDownload = (text: string, langName: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${topicTitle.replace(/\s+/g, '_')}_${langName}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
            <Languages className="w-4 h-4" />
            <span>Multi-Language AI Script Translation & Condenser</span>
          </div>
          <h2 className="text-xl font-bold text-white">One Language to Multi</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-3xl">
            Input Mohan Sir&apos;s lectures in Hindi, Marathi, or English and automatically convert them into structured avatar scripts in English, Spanish, Russian, German, French, Arabic, and 10+ languages with scene directions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <form onSubmit={handleTranslate} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Topic / Lecture Title
              </label>
              <input
                type="text"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="e.g. Swar Yoga Level 1: Ida and Pingala Sadhana"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Source Language
                </label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {ALL_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Output Format
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="direct">Direct Translation (Exact 1-to-1 Match)</option>
                  <option value="lecture">Natural Spoken Style</option>
                  <option value="summary">Key Points Summary</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Target Languages ({targetLanguages.length})
                </label>
                <button
                  type="button"
                  onClick={() => setTargetLanguages(['hi', 'en', 'mr', 'kn'])}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  Select All Workshop Languages
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-slate-950 rounded-xl border border-slate-800">
                {ALL_LANGUAGES.map((lang) => {
                  const isSelected = targetLanguages.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => toggleTargetLanguage(lang.code)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200 font-semibold shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Source Lecture Transcript / Text
              </label>
              <textarea
                rows={9}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste Mohan Sir's raw speech transcript, lecture notes, or teaching text here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-sans focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{sourceText.length} characters</span>
                <span>~{Math.round(sourceText.split(/\s+/).filter(Boolean).length)} words</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="insertMarkers"
                checked={insertMarkers}
                onChange={(e) => setInsertMarkers(e.target.checked)}
                className="rounded accent-emerald-500 w-4 h-4"
              />
              <label htmlFor="insertMarkers" className="text-xs text-slate-300 cursor-pointer">
                Include Scene Markers <span className="text-emerald-400 font-mono text-[10px]">[AVATAR] [SLIDE]</span>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Condensing & Translating ({targetLanguages.length} Languages)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Translate to {targetLanguages.length} Languages</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Generated Multi-Language Results (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Generated Scripts ({results.length})
            </h3>
            {results.length > 0 && (
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                Ready for Avatar Voice Dubbing
              </span>
            )}
          </div>

          {results.length === 0 ? (
            <div className="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500">
              <Languages className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <div className="text-sm font-semibold text-slate-400">No Scripts Generated Yet</div>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Paste a lecture in the input box on the left, select target languages, and click Translate.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((item, idx) => {
                const words = item.text.split(/\s+/).filter(Boolean).length;
                const readingMinutes = (words / 140).toFixed(1);

                return (
                  <div
                    key={item.language}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center uppercase">
                          {item.language}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-white">{item.languageName} Script</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{words} words</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-400" />
                              ~{readingMinutes} min speech
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(item.text, idx)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] rounded-lg transition-colors flex items-center gap-1 border border-slate-700"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDownload(item.text, item.languageName)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] rounded-lg transition-colors flex items-center gap-1 border border-slate-700"
                        >
                          <Download className="w-3 h-3" />
                          <span>TXT</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-950 rounded-xl p-3 max-h-60 overflow-y-auto text-xs text-slate-300 font-serif leading-relaxed whitespace-pre-wrap border border-slate-800/60">
                      {item.text}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
