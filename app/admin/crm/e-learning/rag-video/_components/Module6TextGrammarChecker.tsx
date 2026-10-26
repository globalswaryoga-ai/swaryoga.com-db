'use client';

import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Copy,
  ArrowRight,
  RefreshCw,
  Sliders,
  Check,
  X,
  Languages,
} from 'lucide-react';

interface Module6Props {
  token?: string | null;
  initialText?: string;
  onSendToTranslation?: (approvedText: string) => void;
  onSendToVideoStudio?: (approvedText: string) => void;
}

export default function Module6TextGrammarChecker({
  token,
  initialText = '',
  onSendToTranslation,
  onSendToVideoStudio,
}: Module6Props) {
  const [inputText, setInputText] = useState(
    initialText ||
      `नमस्कार साधको! क्या आप जानते है की हमारी सांस हमारे शरीर को केसे नियंत्रित करती है?
जब सूर्य स्वर चलता है तो भोजन करना चाहिये ओर जब चंद्र स्वर चले तो पानी पीना चाहिये।
स्वर योग के इस चमत्कारिक विज्ञान को अपने जिवन मे अपनाये।`
  );

  const [language, setLanguage] = useState('hi');
  const [mode, setMode] = useState<'strict_exact' | 'expand_detail' | 'ebook_chapter'>('strict_exact');
  const [activeOutputTab, setActiveOutputTab] = useState<'original' | 'corrected' | 'improved'>('corrected');
  const [isChecking, setIsChecking] = useState(false);

  // Results
  const [correctedText, setCorrectedText] = useState('');
  const [improvedText, setImprovedText] = useState('');
  const [correctionsList, setCorrectionsList] = useState<Array<{ original: string; corrected: string; reason: string }>>([]);
  const [copied, setCopied] = useState(false);

  const handleRunGrammarCheck = async () => {
    if (!inputText.trim()) {
      alert('Please enter or paste text to check.');
      return;
    }
    setIsChecking(true);
    try {
      const res = await fetch('/api/avatar/grammar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, language, mode }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCorrectedText(json.data.correctedText);
        setImprovedText(json.data.improvedText);
        setCorrectionsList(json.data.corrections || []);
        setActiveOutputTab('corrected');
      } else {
        alert(json.error || 'Failed to check grammar');
      }
    } catch (err) {
      console.error('Grammar check error:', err);
    } finally {
      setIsChecking(false);
    }
  };

  const getActiveText = () => {
    if (activeOutputTab === 'original') return inputText;
    if (activeOutputTab === 'corrected') return correctedText || inputText;
    return improvedText || correctedText || inputText;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black shadow-lg">
            <FileText size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Module 6: Text Grammar & Vedic Terminology Checker
              </h2>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                Original • Corrected • Improved
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Refines grammar and oratorical cadence while strictly preserving sacred Swar Yoga terms and emotion symbols.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setMode('strict_exact')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'strict_exact'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Strict 1:1 Line Matching - No Hallucination"
            >
              🎯 Strict 1:1
            </button>
            <button
              type="button"
              onClick={() => setMode('expand_detail')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'expand_detail'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Expand into 2-4 Explanatory Lines"
            >
              📝 Expand (2-4 Lines)
            </button>
            <button
              type="button"
              onClick={() => setMode('ebook_chapter')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                mode === 'ebook_chapter'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Transform into Full E-Book Chapter"
            >
              📖 E-Book Chapter
            </button>
          </div>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 font-bold"
          >
            <option value="hi">🇮🇳 Hindi (हिंदी)</option>
            <option value="mr">🚩 Marathi (मराठी)</option>
            <option value="en">🇬🇧 English</option>
            <option value="kn">🇮🇳 Kannada (ಕನ್ನಡ)</option>
            <option value="gu">🇮🇳 Gujarati (ગુજરાતી)</option>
            <option value="ta">🇮🇳 Tamil (தமிழ்)</option>
            <option value="te">🇮🇳 Telugu (తెలుగు)</option>
            <option value="ml">🇮🇳 Malayalam (മലയാളം)</option>
            <option value="bn">🇮🇳 Bengali (বাংলা)</option>
            <option value="pa">🇮🇳 Punjabi (ਪੰਜਾਬੀ)</option>
            <option value="or">🇮🇳 Odia (ଓଡ଼ିଆ)</option>
            <option value="sa">🕉️ Sanskrit (संस्कृत)</option>
            <option value="es">🇪🇸 Spanish (Español)</option>
            <option value="fr">🇫🇷 French (Français)</option>
            <option value="de">🇩🇪 German (Deutsch)</option>
            <option value="ja">🇯🇵 Japanese (日本語)</option>
            <option value="ar">🇸🇦 Arabic (العربية)</option>
            <option value="ru">🇷🇺 Russian (Русский)</option>
            <option value="pt">🇧🇷 Portuguese (Português)</option>
            <option value="id">🇮🇩 Indonesian (Bahasa)</option>
          </select>
        </div>
      </div>

      {/* Editor & Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Input Textarea */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>Input Raw Script / Lecture Transcript</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">{inputText.length} characters</span>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={12}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 font-mono leading-relaxed"
              placeholder="Paste Hindi, Marathi or English lecture script..."
            />
          </div>

          <button
            disabled={isChecking || !inputText.trim()}
            onClick={handleRunGrammarCheck}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-lg active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isChecking ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Checking Grammar & Preserving Sacred Sutras...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Run AI Grammar Check & Enhancement</span>
              </>
            )}
          </button>
        </div>

        {/* Right: 3-Way Output View (Original vs Corrected vs Improved) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            {/* 3 Output Tabs */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
                <button
                  onClick={() => setActiveOutputTab('original')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeOutputTab === 'original' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Original
                </button>
                <button
                  onClick={() => setActiveOutputTab('corrected')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeOutputTab === 'corrected' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Corrected Text ✓
                </button>
                <button
                  onClick={() => setActiveOutputTab('improved')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeOutputTab === 'improved' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Improved Flow ✨
                </button>
              </div>

              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Copy size={13} />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            {/* Editable Output View */}
            <div className="space-y-2">
              <textarea
                value={getActiveText()}
                onChange={(e) => {
                  if (activeOutputTab === 'corrected') setCorrectedText(e.target.value);
                  else if (activeOutputTab === 'improved') setImprovedText(e.target.value);
                  else setInputText(e.target.value);
                }}
                rows={11}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 font-mono leading-relaxed"
                placeholder="Check results will appear here..."
              />
            </div>

            {/* List of Corrections Detected */}
            {correctionsList.length > 0 && (
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5 max-h-36 overflow-y-auto">
                <span className="font-bold text-amber-400 block text-[11px]">
                  Detected Corrections ({correctionsList.length}):
                </span>
                {correctionsList.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] text-slate-300 pb-1 border-b border-slate-900">
                    <span className="line-through text-rose-400">{c.original}</span>
                    <span className="text-slate-500">➔</span>
                    <span className="text-emerald-400 font-bold">{c.corrected}</span>
                    <span className="text-[10px] text-slate-500 italic">({c.reason})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action to dispatch to next modules */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Send final approved text to:</span>
            <div className="flex items-center gap-2">
              {onSendToTranslation && (
                <button
                  onClick={() => onSendToTranslation(getActiveText())}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Languages size={13} />
                  <span>Translate to Multi-Lang ➔</span>
                </button>
              )}
              {onSendToVideoStudio && (
                <button
                  onClick={() => onSendToVideoStudio(getActiveText())}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs shadow cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <span>Video Studio ➔</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
