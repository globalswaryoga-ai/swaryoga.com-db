'use client';
import { getLoginPath } from '@/hooks/useAuth';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  script: string;
}

interface TranslationResult {
  language: string;
  languageName: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  translation: string;
  transliteration?: string;
  grammarNotes?: string;
}

type TranslationStyle = 'formal' | 'casual' | 'literary' | 'technical' | 'conversational' | 'poetic';

// Commonly used language groups
const LANGUAGE_GROUPS = {
  indian: ['hi', 'mr', 'ne', 'bn', 'ta', 'te', 'gu', 'pa', 'kn', 'ml', 'or', 'as', 'ur'],
  european: ['en', 'es', 'pt', 'fr', 'de', 'it', 'nl', 'sv', 'pl', 'uk', 'ru'],
  asian: ['zh', 'ja', 'ko', 'th', 'id', 'vi', 'ms'],
  middleEast: ['ar', 'fa', 'he', 'tr'],
  african: ['sw'],
};

export default function TranslationPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState('hi');
  const [targetLangs, setTargetLangs] = useState<string[]>(['en']);
  const [style, setStyle] = useState<TranslationStyle>('formal');
  const [context, setContext] = useState('');
  const [includeTransliteration, setIncludeTransliteration] = useState(false);
  
  const [results, setResults] = useState<TranslationResult[]>([]);
  const [error, setError] = useState('');

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push(getLoginPath());
      return;
    }
    setIsAuthenticated(true);
    fetchLanguages();
  }, [router]);

  const fetchLanguages = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/translate', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLanguages(data.languages);
      }
    } catch (err) {
      console.error('Failed to fetch languages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      setError('Please enter text to translate');
      return;
    }
    if (targetLangs.length === 0) {
      setError('Please select at least one target language');
      return;
    }

    setError('');
    setTranslating(true);
    setResults([]);

    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sourceText,
          sourceLang,
          targetLangs,
          style,
          context,
          includeTransliteration,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data.translations);
      } else {
        setError(data.error || 'Translation failed');
      }
    } catch (err: any) {
      setError(err.message || 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const toggleLanguage = (code: string) => {
    if (targetLangs.includes(code)) {
      setTargetLangs(targetLangs.filter((l) => l !== code));
    } else {
      setTargetLangs([...targetLangs, code]);
    }
  };

  const selectGroup = (group: string[]) => {
    const newLangs = new Set([...targetLangs, ...group]);
    setTargetLangs(Array.from(newLangs));
  };

  const clearGroup = (group: string[]) => {
    setTargetLangs(targetLangs.filter((l) => !group.includes(l)));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/crm" className="text-gray-500 hover:text-gray-700">
                ← Back to CRM
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🌐 Multi-Language Translator</h1>
                <p className="text-sm text-gray-500">Professional Hindi to Multilingual with Grammar Adaptation</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Input */}
          <div className="space-y-4">
            {/* Source Language & Style */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Translation Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Language</label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.nativeName} ({lang.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as TranslationStyle)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="formal">📋 Formal (Official)</option>
                    <option value="casual">💬 Casual (Friendly)</option>
                    <option value="literary">📚 Literary (Elegant)</option>
                    <option value="technical">⚙️ Technical (Precise)</option>
                    <option value="conversational">🗣️ Conversational</option>
                    <option value="poetic">🎭 Poetic (Artistic)</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Context (Optional)</label>
                <input
                  type="text"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="e.g., WhatsApp message for yoga workshop promotion"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div className="mt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTransliteration}
                    onChange={(e) => setIncludeTransliteration(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Include Romanized Transliteration</span>
                </label>
              </div>
            </div>

            {/* Source Text Input */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <label className="font-semibold text-gray-900">
                  Source Text ({languages.find((l) => l.code === sourceLang)?.nativeName || sourceLang})
                </label>
                <span className="text-xs text-gray-500">{sourceText.length} characters</span>
              </div>
              <textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="यहाँ हिंदी में टेक्स्ट लिखें..."
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                dir={languages.find((l) => l.code === sourceLang)?.direction || 'ltr'}
              />
            </div>

            {/* Target Languages */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Target Languages ({targetLangs.length} selected)</h3>
              
              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => selectGroup(LANGUAGE_GROUPS.indian)}
                  className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-full hover:bg-orange-200"
                >
                  + Indian Languages
                </button>
                <button
                  onClick={() => selectGroup(LANGUAGE_GROUPS.european)}
                  className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200"
                >
                  + European
                </button>
                <button
                  onClick={() => selectGroup(LANGUAGE_GROUPS.asian)}
                  className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full hover:bg-green-200"
                >
                  + Asian
                </button>
                <button
                  onClick={() => selectGroup(LANGUAGE_GROUPS.middleEast)}
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200"
                >
                  + Middle East
                </button>
                <button
                  onClick={() => setTargetLangs([])}
                  className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                >
                  Clear All
                </button>
              </div>

              {/* Language Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => toggleLanguage(lang.code)}
                    disabled={lang.code === sourceLang}
                    className={`px-2 py-1.5 text-xs rounded-lg border transition-all ${
                      lang.code === sourceLang
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : targetLangs.includes(lang.code)
                        ? 'bg-green-600 text-white border-green-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-green-500'
                    }`}
                  >
                    <span className="block truncate">{lang.nativeName}</span>
                    <span className="block text-[10px] opacity-70">{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Translate Button */}
            <button
              onClick={handleTranslate}
              disabled={translating || !sourceText.trim() || targetLangs.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                translating || !sourceText.trim() || targetLangs.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 shadow-lg hover:shadow-xl'
              }`}
            >
              {translating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Translating {targetLangs.length} languages...
                </span>
              ) : (
                `🌐 Translate to ${targetLangs.length} Language${targetLangs.length !== 1 ? 's' : ''}`
              )}
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">
                📝 Translations {results.length > 0 && `(${results.length})`}
              </h3>
              
              {results.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-5xl mb-4">🌍</div>
                  <p>Translations will appear here</p>
                  <p className="text-sm mt-2">Select languages and click Translate</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {results.map((result, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg p-4 ${
                        result.translation.startsWith('[') ? 'border-red-200 bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{result.nativeName}</span>
                          <span className="text-sm text-gray-500">({result.languageName})</span>
                          {result.direction === 'rtl' && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">RTL</span>
                          )}
                        </div>
                        <button
                          onClick={() => copyToClipboard(result.translation)}
                          className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                        >
                          📋 Copy
                        </button>
                      </div>
                      <div
                        className="text-gray-800 whitespace-pre-wrap"
                        dir={result.direction}
                        style={{ fontFamily: result.direction === 'rtl' ? 'inherit' : undefined }}
                      >
                        {result.translation}
                      </div>
                      {result.transliteration && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500 mr-2">Romanized:</span>
                          <span className="text-sm text-gray-600 italic">{result.transliteration}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Copy All Button */}
            {results.length > 0 && (
              <button
                onClick={() => {
                  const allText = results
                    .map((r) => `### ${r.languageName} (${r.nativeName})\n${r.translation}`)
                    .join('\n\n');
                  copyToClipboard(allText);
                }}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
              >
                📋 Copy All Translations
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
