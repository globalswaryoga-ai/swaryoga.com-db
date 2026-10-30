'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  Filter,
  Search,
  Activity,
  Layers,
  ShieldCheck,
  Flame,
  Brain,
  Video,
  AlertTriangle
} from 'lucide-react';
import type { PerformanceDnaRecord } from '@/lib/mohanAiClone/mohanAiCloneRepository';
import { YOGA_MOTION_CATALOG, type YogaMotionSpec } from '@/lib/mohanAiClone/yogaMotionCatalog';

interface PerformanceDnaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAnchor?: (anchor: PerformanceDnaRecord) => void;
}

export default function PerformanceDnaLibraryModal({
  isOpen,
  onClose,
  onSelectAnchor,
}: PerformanceDnaLibraryModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'dna' | 'yoga'>('dna');
  const [dnaRecords, setDnaRecords] = useState<PerformanceDnaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEmotion, setFilterEmotion] = useState('all');
  const [filterCategory, setFilterCategory] = useState<'all' | 'asana' | 'pranayama' | 'mudra'>('all');

  useEffect(() => {
    if (!isOpen) return;
    const fetchDna = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/avatar/performance-dna');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setDnaRecords(json.data);
        }
      } catch (err) {
        console.error('Failed to load performance DNA:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDna();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredDna = dnaRecords.filter((r) => {
    const matchesSearch =
      r.phrase_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.hand_gesture?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.emotion?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEmotion = filterEmotion === 'all' || r.emotion === filterEmotion;
    return matchesSearch && matchesEmotion;
  });

  const filteredYoga = YOGA_MOTION_CATALOG.filter((y) => {
    const matchesSearch =
      y.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      y.sanskritName.includes(searchQuery) ||
      y.postureDescription.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || y.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b101b] border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-black font-extrabold shadow-md">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Mohanji Performance DNA &amp; Yogic Kinematics Library
                </h2>
                <span className="text-[10px] uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Authentic Corpus
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Verified speaking styles, emotional anchors, Asanas, Pranayama and Mudras
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Toggle & Search Filters */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center p-1 rounded-xl bg-slate-800/90 border border-slate-700/80 self-stretch sm:self-auto">
            <button
              onClick={() => setActiveSubTab('dna')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'dna'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Performance DNA Anchors ({dnaRecords.length})
            </button>
            <button
              onClick={() => setActiveSubTab('yoga')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeSubTab === 'yoga'
                  ? 'bg-emerald-500 text-black shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Yoga &amp; Mudra Motion Library ({YOGA_MOTION_CATALOG.length})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search phrases, emotions, mudras..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 w-full sm:w-64"
            />
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeSubTab === 'dna' ? (
            <div className="space-y-3">
              {loading ? (
                <div className="py-16 text-center text-slate-400 text-xs">Loading Performance DNA anchors...</div>
              ) : filteredDna.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  No DNA anchors found matching criteria. Upload and analyze an original video to extract DNA anchors.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredDna.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-amber-400 font-bold">
                          {(item.start_ms / 1000).toFixed(1)}s – {(item.end_ms / 1000).toFixed(1)}s
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] uppercase font-bold">
                            {item.emotion}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                            {Math.round(item.confidence_score * 100)}%
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-200 font-medium leading-relaxed">
                        &quot;{item.phrase_text}&quot;
                      </p>

                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800">Gesture: {item.hand_gesture}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800">Head: {item.head_movement}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800">Posture: {item.body_posture}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800">Speed: {item.speaking_speed}x</span>
                      </div>

                      {onSelectAnchor && (
                        <button
                          onClick={() => onSelectAnchor(item)}
                          className="w-full mt-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition"
                        >
                          Use As Performance Anchor →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredYoga.map((ym) => (
                  <div
                    key={ym.id}
                    className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{ym.icon}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {ym.category}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{ym.sanskritName}</h4>
                      <p className="text-xs text-slate-400 font-medium">{ym.englishName}</p>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug line-clamp-3">
                      {ym.postureDescription}
                    </p>

                    <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[10px] space-y-1">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Breath Timing:</span>
                        <span className="text-emerald-300 font-mono font-bold">
                          Inhale {ym.breathingRatio.inhaleSeconds}s • Hold {ym.breathingRatio.kumbhakaSeconds}s • Exhale {ym.breathingRatio.exhaleSeconds}s
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Swar Alignment:</span>
                        <span className="text-amber-300 font-semibold">{ym.swarAlignment.replace('_', ' ')}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px]">
                      {ym.isVerified ? (
                        <div className="flex items-center gap-1 text-emerald-400 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified Safe by Acharya</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Pending Qualified Review</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

