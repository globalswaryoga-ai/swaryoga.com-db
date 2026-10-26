'use client';

import React, { useState } from 'react';
import {
  Brain,
  Sparkles,
  BookMarked,
  Sliders,
  CheckCircle2,
  Database,
  Search,
  Plus,
  X,
  ShieldCheck,
  Zap
} from 'lucide-react';

const DEFAULT_YOGIC_TERMS = [
  'Swar Yoga', 'Ida Nadi', 'Pingala Nadi', 'Sushumna Nadi',
  'Surya Swara', 'Chandra Swara', 'Pranayama', 'Kumbhaka',
  'Tattva', 'Prithvi Tattva', 'Jal Tattva', 'Agni Tattva',
  'Vayu Tattva', 'Akash Tattva', 'Chakra', 'Muladhara',
  'Svadhisthana', 'Manipura', 'Anahata', 'Vishuddha',
  'Ajna', 'Sahasrara', 'Mohan Sir', 'Sadhana',
  'Brahma Muhurta', 'Asana', 'Mudras', 'Bandhas'
];

export default function RagSettingsView() {
  const [terms, setTerms] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('rag_yogic_terms');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return DEFAULT_YOGIC_TERMS;
  });
  const [newTerm, setNewTerm] = useState('');
  const [chunkSizeMB, setChunkSizeMB] = useState(22);
  const [faithfulnessLevel, setFaithfulnessLevel] = useState<'strict' | 'balanced'>('strict');
  const [searchTest, setSearchTest] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim() || terms.includes(newTerm.trim())) return;
    const updated = [...terms, newTerm.trim()];
    setTerms(updated);
    setNewTerm('');
    localStorage.setItem('rag_yogic_terms', JSON.stringify(updated));
    triggerSaved();
  };

  const handleRemoveTerm = (termToRemove: string) => {
    const updated = terms.filter((t) => t !== termToRemove);
    setTerms(updated);
    localStorage.setItem('rag_yogic_terms', JSON.stringify(updated));
    triggerSaved();
  };

  const triggerSaved = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSearchTest = (q: string) => {
    setSearchTest(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    const matches = terms.filter((t) => t.toLowerCase().includes(q.toLowerCase()));
    setSearchResults(matches);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-400" />
            RAG Setting (Knowledge Ingestion & Yogic Vocabulary Engine)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure how Mohan Sir&apos;s raw spoken lectures are ingested, chunked, and accurately transcribed without speech-to-text mistakes.
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Settings Saved
          </span>
        )}
      </div>

      {/* Transcription & Chunk Engine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Whisper Engine */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Audio Ingestion & Chunking Limits</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Raw workshop recordings often span 1 to 2 hours (60MB–150MB). Whisper limits single uploads to 25MB.
          </p>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">Target Chunk Size per Part:</span>
              <span className="font-mono font-bold text-indigo-300">{chunkSizeMB} MB</span>
            </div>
            <input
              type="range"
              min="15"
              max="24"
              value={chunkSizeMB}
              onChange={(e) => {
                setChunkSizeMB(Number(e.target.value));
                triggerSaved();
              }}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>15 MB (Fast)</span>
              <span>22 MB (Recommended)</span>
              <span>24 MB (Max)</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Audio Compression Engine:</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3" />
              48kbps Mono Speech MP3
            </span>
          </div>
        </div>

        {/* Card 2: Strict Faithfulness Guard */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Strict Faithfulness Guard (Zero Hallucination)</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            In sacred Swar Yoga teachings, the AI must NEVER invent new concepts, fake sutras, or unsaid facts.
          </p>

          <div className="space-y-2 pt-1">
            <label
              onClick={() => {
                setFaithfulnessLevel('strict');
                triggerSaved();
              }}
              className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                faithfulnessLevel === 'strict'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${faithfulnessLevel === 'strict' ? 'text-emerald-400' : 'text-slate-600'}`} />
              <div>
                <div className="text-xs font-bold text-white">Strict Verbatim Mode (Default)</div>
                <div className="text-[11px] text-slate-400">
                  Removes filler words (&quot;um&quot;, &quot;you know&quot;) and repeats, but keeps every single sentence 100% faithful to Mohan Sir&apos;s spoken words.
                </div>
              </div>
            </label>

            <label
              onClick={() => {
                setFaithfulnessLevel('balanced');
                triggerSaved();
              }}
              className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                faithfulnessLevel === 'balanced'
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${faithfulnessLevel === 'balanced' ? 'text-emerald-400' : 'text-slate-600'}`} />
              <div>
                <div className="text-xs font-bold text-white">Polished Lecture Mode</div>
                <div className="text-[11px] text-slate-400">
                  Smooths conversational transitions for cleaner foreign language dubbing.
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Yogic Sanskrit Vocabulary Dictionary */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-purple-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Yogic Sanskrit Terminology Dictionary</h3>
              <p className="text-[11px] text-slate-400">
                These terms are seeded into Whisper&apos;s initial prompt so sacred Swar Yoga terminology is never misspelled or mistranslated.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
            {terms.length} Terms Active
          </span>
        </div>

        {/* Add new term input */}
        <form onSubmit={handleAddTerm} className="flex gap-2">
          <input
            type="text"
            placeholder="Add new Sanskrit/Yogic term (e.g. Swara Shastra, Apana Vayu)..."
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Term
          </button>
        </form>

        {/* Terms Chips */}
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800/60">
          {terms.map((term) => (
            <span
              key={term}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-800/80 border border-slate-700/60 text-slate-200 group hover:border-purple-500/50 transition-all"
            >
              <span>{term}</span>
              <button
                type="button"
                onClick={() => handleRemoveTerm(term)}
                className="text-slate-500 hover:text-rose-400 transition-colors ml-0.5"
                title="Remove Term"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Vocabulary Search Quick Tester */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-indigo-400" />
          Test Vocabulary Lookup
        </h3>
        <input
          type="text"
          placeholder="Type to test if a term is in the RAG dictionary (e.g. Nadi, Tattva)..."
          value={searchTest}
          onChange={(e) => handleSearchTest(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
        {searchTest && (
          <div className="text-xs text-slate-400">
            {searchResults.length > 0 ? (
              <span className="text-emerald-400">
                ✓ Found in dictionary: {searchResults.join(', ')}
              </span>
            ) : (
              <span className="text-amber-400">
                ⚠️ &quot;{searchTest}&quot; not found in dictionary yet. Consider adding it above!
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
