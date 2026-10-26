'use client';

import React, { useState } from 'react';
import {
  Library,
  BookOpen,
  Sparkles,
  Download,
  Loader2,
  FileCheck,
  Languages,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  FileText
} from 'lucide-react';

interface EbookOneToAllViewProps {
  token: string | null;
  jobs?: Array<{
    _id: string;
    workshopName?: string;
    topicTitle: string;
    targetLanguages: string[];
    ebookChapters?: Array<{ language: string; text: string }>;
  }>;
}

export default function EbookOneToAllView({
  token,
  jobs = [],
}: EbookOneToAllViewProps) {
  const [workshopName, setWorkshopName] = useState('Swar Yoga Sadhana Intensive');
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [bookTitle, setBookTitle] = useState('Swar Yoga: The Ancient Science of Sacred Breath');
  const [authorName, setAuthorName] = useState('Mohan Sir');
  const [compiling, setCompiling] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Extract unique workshops from existing jobs
  const availableWorkshops = Array.from(
    new Set(jobs.map((j) => j.workshopName).filter(Boolean))
  ) as string[];

  const handleCompilePdf = async () => {
    if (!workshopName.trim()) {
      setError('Please provide a workshop name.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setCompiling(true);

    try {
      const res = await fetch('/api/admin/e-learning/ai-video/ebook/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          workshopName: workshopName.trim(),
          language: selectedLanguage,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `PDF compilation failed with status ${res.status}`);
      }

      // Download the PDF stream
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workshopName.replace(/[^a-zA-Z0-9_-]+/g, '_')}_${selectedLanguage}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMsg(`PDF successfully generated and downloaded for ${selectedLanguage.toUpperCase()}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compilation failed');
    } finally {
      setCompiling(false);
    }
  };

  const matchingJobs = jobs.filter(
    (j) => !workshopName || j.workshopName?.toLowerCase() === workshopName.toLowerCase()
  );

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900/40 via-emerald-900/30 to-slate-900 border border-teal-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-400 mb-1">
              <Library className="w-4 h-4" />
              <span>Multi-Chapter & Multi-Language E-Book Compiler</span>
            </div>
            <h2 className="text-xl font-bold text-white">E-Book One to All</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Compile full multi-day workshop lectures into complete, beautifully typeset PDF books with Devanagari font support for Hindi, Marathi, and international languages.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Workshop Book Setup (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Workshop
              </label>
              <input
                type="text"
                list="workshops-list"
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                placeholder="e.g. Swar Yoga Sadhana Intensive"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
              <datalist id="workshops-list">
                {availableWorkshops.map((w) => (
                  <option key={w} value={w} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Target E-Book Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="en">🇬🇧 English</option>
                <option value="hi">🇮🇳 Hindi (हिंदी - Devanagari)</option>
                <option value="mr">🇮🇳 Marathi (मराठी - Devanagari)</option>
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Author Signature
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Page Layout
                </label>
                <div className="text-xs text-slate-400 py-2 font-mono">
                  A4 / 56pt Margin
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Book Display Title
              </label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <button
              onClick={handleCompilePdf}
              disabled={compiling}
              className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30 transition-all disabled:opacity-50"
            >
              {compiling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compiling PDF with Devanagari Typography...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>1-Click Compile &amp; Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Workshop Chapters & Table of Contents (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Workshop Chapters in Database ({matchingJobs.length})
                </span>
              </div>
              <span className="text-[10px] text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded-full">
                {selectedLanguage.toUpperCase()} Ready
              </span>
            </div>

            {matchingJobs.length === 0 ? (
              <div className="bg-slate-950 rounded-xl p-8 text-center text-slate-500 border border-dashed border-slate-800">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-xs text-slate-400 font-semibold">No Chapters Found for this Workshop</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Upload lecture audio or generate chapters in &quot;E-Book Main&quot; or &quot;One Video to Multi Dub&quot; first.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {matchingJobs.map((job, idx) => {
                  const hasCurrentLangChapter = job.ebookChapters?.some(
                    (c) => c.language === selectedLanguage
                  );

                  return (
                    <div
                      key={job._id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 font-mono text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-semibold text-white">{job.topicTitle}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Workshop: {job.workshopName || 'General'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Languages className="w-3 h-3 text-teal-400" />
                              {job.ebookChapters?.length || 0} Languages
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {hasCurrentLangChapter ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Compiled
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Typography info */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                Font: NotoSansDevanagari-Regular.ttf
              </span>
              <span className="text-slate-500">PDFKit Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
