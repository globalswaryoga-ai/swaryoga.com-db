'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Save,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  FileText,
  AlertCircle,
  Eye,
  PenTool,
  BookMarked
} from 'lucide-react';

interface EbookMainViewProps {
  token: string | null;
  selectedJobId?: string;
  topicTitle?: string;
  sourceTranscript?: string;
  sourceLanguage?: string;
}

export default function EbookMainView({
  token,
  selectedJobId,
  topicTitle = 'Swar Yoga Fundamental Principles',
  sourceTranscript = '',
  sourceLanguage = 'hi',
}: EbookMainViewProps) {
  const [chapterTitle, setChapterTitle] = useState(topicTitle);
  const [language, setLanguage] = useState(sourceLanguage || 'hi');
  const [transcriptInput, setTranscriptInput] = useState(sourceTranscript);
  const [chapterText, setChapterText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');

  const handleGenerateChapter = async () => {
    if (!transcriptInput.trim()) {
      setError('Please provide a lecture transcript or summary to convert into a book chapter.');
      return;
    }
    setError('');
    setGenerating(true);

    try {
      // If we have an active job ID, we can hit the dedicated ebook-chapter endpoint
      if (selectedJobId) {
        const res = await fetch(`/api/admin/e-learning/ai-video/jobs/${selectedJobId}/ebook-chapter`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token || ''}`,
          },
          body: JSON.stringify({ language }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate chapter');

        const found = data.data?.ebookChapters?.find((c: any) => c.language === language);
        if (found) setChapterText(found.text);
      } else {
        // Standalone generation via translate-script in long prose format
        const res = await fetch('/api/admin/e-learning/ai-video/translate-script', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token || ''}`,
          },
          body: JSON.stringify({
            sourceText: transcriptInput,
            sourceLanguage,
            targetLanguages: [language],
            mode: 'lecture',
            insertMarkers: false,
            topicTitle: chapterTitle,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate chapter');
        if (data.results?.[0]?.text) {
          setChapterText(data.results[0].text);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chapter generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!chapterText) return;
    navigator.clipboard.writeText(chapterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    if (!chapterText) return;
    const content = `# ${chapterTitle}\n\nLanguage: ${language}\n\n---\n\n${chapterText}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chapter_${chapterTitle.replace(/\s+/g, '_')}_${language}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const wordCount = chapterText.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-900/40 via-pink-900/30 to-slate-900 border border-rose-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Lecture-to-Textbook Prose Converter</span>
            </div>
            <h2 className="text-xl font-bold text-white">E-Book Main: Chapter Editor</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Transform spoken workshop recordings into polished, publication-ready book chapters. Strips audience Q&amp;A and verbal banter, transforming wisdom into structured prose.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode(previewMode === 'edit' ? 'preview' : 'edit')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {previewMode === 'edit' ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Page</span>
                </>
              ) : (
                <>
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Edit Mode</span>
                </>
              )}
            </button>
            <button
              onClick={handleCopy}
              disabled={!chapterText}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownloadMd}
              disabled={!chapterText}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-900/30"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Chapter</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lecture Transcript Source (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Chapter Heading
              </label>
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder="e.g. Chapter 1: The Cosmic Rhythm of Swara"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="en">🇬🇧 English</option>
                <option value="hi">🇮🇳 Hindi (हिंदी)</option>
                <option value="mr">🇮🇳 Marathi (मराठी)</option>
                <option value="kn">🇮🇳 Kannada (ಕನ್ನಡ)</option>
                <option value="ne">🇳🇵 Nepali (नेपाली)</option>
                <option value="zh">🇨🇳 Mandarin (中文)</option>
                <option value="es">🇪🇸 Spanish (Español)</option>
                <option value="fr">🇫🇷 French (Français)</option>
                <option value="ar">🇸🇦 Arabic (العربية)</option>
                <option value="de">🇩🇪 German (Deutsch)</option>
                <option value="pt">🇧🇷 Portuguese (Português)</option>
                <option value="ja">🇯🇵 Japanese (日本語)</option>
                <option value="ko">🇰🇷 Korean (한국어)</option>
                <option value="ru">🇷🇺 Russian (Русский)</option>
                <option value="it">🇮🇹 Italian (Italiano)</option>
                <option value="tr">🇹🇷 Turkish (Türkçe)</option>
                <option value="nl">🇳🇱 Dutch (Nederlands)</option>
                <option value="sv">🇸🇪 Swedish (Svenska)</option>
                <option value="th">🇹🇭 Thai (ไทย)</option>
                <option value="id">🇮🇩 Indonesian (Bahasa)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Spoken Lecture Transcript
              </label>
              <textarea
                rows={11}
                value={transcriptInput}
                onChange={(e) => setTranscriptInput(e.target.value)}
                placeholder="Paste spoken workshop transcript here (with live speech, repetitions, or questions)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 font-sans focus:outline-none focus:border-rose-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>{transcriptInput.length} chars</span>
                <span>~{transcriptInput.split(/\s+/).filter(Boolean).length} words</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleGenerateChapter}
              disabled={generating}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Formatting into Written Prose Chapter...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Convert into Book Chapter</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Book Chapter Output (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Book Chapter Output
                </span>
                {wordCount > 0 && (
                  <span className="text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full">
                    {wordCount} words
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400">
                {previewMode === 'edit' ? 'Editable Text Area' : 'Book Reading Simulation'}
              </span>
            </div>

            {previewMode === 'edit' ? (
              <textarea
                rows={18}
                value={chapterText}
                onChange={(e) => setChapterText(e.target.value)}
                placeholder="The formatted chapter prose will appear here after clicking 'Convert into Book Chapter'..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 placeholder-slate-600 font-serif leading-relaxed focus:outline-none focus:border-rose-500"
              />
            ) : (
              <div className="bg-amber-50/5 border border-amber-900/30 rounded-xl p-6 min-h-[400px] max-h-[520px] overflow-y-auto">
                <h1 className="text-xl font-bold font-serif text-amber-100 mb-4 border-b border-amber-500/20 pb-2">
                  {chapterTitle}
                </h1>
                <div className="text-xs text-slate-200 font-serif leading-loose whitespace-pre-wrap">
                  {chapterText || 'No chapter text generated yet.'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
