'use client';

import React, { useState } from 'react';
import {
  X,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Brain,
  Sparkles,
  Layers,
  Save,
  Globe2,
  Download,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Film
} from 'lucide-react';
import type { IntelligenceSegment } from '@/lib/mohanAiClone/videoIntelligenceService';

interface VideoIntelligenceEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
  videoUrl: string;
  initialSegments: IntelligenceSegment[];
  onSaveSegments: (updated: IntelligenceSegment[]) => Promise<void>;
  onApproveRag: (category: string) => Promise<void>;
}

export default function VideoIntelligenceEditorModal({
  isOpen,
  onClose,
  videoTitle,
  videoUrl,
  initialSegments,
  onSaveSegments,
  onApproveRag,
}: VideoIntelligenceEditorModalProps) {
  const [segments, setSegments] = useState<IntelligenceSegment[]>(initialSegments);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ragCategory, setRagCategory] = useState('WHY_SWAR_YOGA');
  const [isSaving, setIsSaving] = useState(false);
  const [ragSuccess, setRagSuccess] = useState(false);

  if (!isOpen) return null;

  const currentSegment = segments[activeSegmentIndex] || segments[0];

  const updateCurrentSegment = (patch: Partial<IntelligenceSegment>) => {
    setSegments((prev) =>
      prev.map((s, idx) => (idx === activeSegmentIndex ? { ...s, ...patch } : s)),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSegments(segments);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRagIndex = async () => {
    setIsSaving(true);
    try {
      await onApproveRag(ragCategory);
      setRagSuccess(true);
      setTimeout(() => setRagSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0b101b] border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-emerald-500 to-teal-500 flex items-center justify-center text-black font-extrabold shadow-md">
              <Brain className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white truncate max-w-md">
                  Video Intelligence & DNA Inspector
                </h2>
                <span className="text-[10px] uppercase font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full">
                  Multimodal Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xl">
                {videoTitle} • Word-level timestamps & gesture-emotion tracking
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

        {/* Content Body: Left Video & Segment Inspector, Right Timeline & Transcripts */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Left Column: Video Preview + Deep Segment DNA Editor (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Video Player */}
            <div className="rounded-xl overflow-hidden bg-black aspect-video border border-slate-800 relative group flex items-center justify-center">
              <div className="text-center p-4">
                <Film className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <span className="text-xs text-slate-400 font-mono">
                  Current Playhead: {(currentSegment?.startMs / 1000).toFixed(1)}s – {(currentSegment?.endMs / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-lg active:scale-95 transition"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>
              </div>
            </div>

            {/* Segment Inspector Card */}
            {currentSegment && (
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-amber-400">
                    Segment #{currentSegment.index} DNA Attributes
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Emotion Confidence:</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {Math.round(currentSegment.emotionConfidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Emotion & Expression Selectors */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Emotion</label>
                    <select
                      value={currentSegment.emotion}
                      onChange={(e) => updateCurrentSegment({ emotion: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="teaching">Teaching (गुरु भाव)</option>
                      <option value="blissful">Blissful (आनंद भाव)</option>
                      <option value="serious">Serious / Strict (गंभीर)</option>
                      <option value="compassionate">Compassionate (करुणा)</option>
                      <option value="questioning">Questioning (जिज्ञासा)</option>
                      <option value="miraculous">Miraculous (चमत्कार)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Facial Expression</label>
                    <select
                      value={currentSegment.facialExpression}
                      onChange={(e) => updateCurrentSegment({ facialExpression: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="warm_smile">Warm Smile</option>
                      <option value="serene">Serene / Calm</option>
                      <option value="focused_brow">Focused Brow</option>
                      <option value="inquiring">Inquiring / Raised Brow</option>
                      <option value="deep_meditative">Deep Meditative</option>
                    </select>
                  </div>
                </div>

                {/* Gestures & Posture */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Hand Gesture</label>
                    <select
                      value={currentSegment.handGesture}
                      onChange={(e) => updateCurrentSegment({ handGesture: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="open_palms">Open Palms (खुली हथेलियाँ)</option>
                      <option value="chin_mudra">Chin Mudra (चिन् मुद्रा)</option>
                      <option value="gyan_mudra">Gyan Mudra (ज्ञान मुद्रा)</option>
                      <option value="namaste">Namaste (प्रणामासन)</option>
                      <option value="pointing_finger">Pointing / Guiding (निर्देशन)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Head Movement</label>
                    <select
                      value={currentSegment.headMovement}
                      onChange={(e) => updateCurrentSegment({ headMovement: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="still">Still (अचल)</option>
                      <option value="subtle_nod">Subtle Nod (हल्का सिर हिलाना)</option>
                      <option value="head_tilt_left">Head Tilt (झुकाव)</option>
                      <option value="slow_sweep">Slow Panoramic Sweep</option>
                    </select>
                  </div>
                </div>

                {/* Timing & Pacing */}
                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
                    <span className="text-slate-400 block text-[9px] uppercase">Start</span>
                    <span className="font-mono font-bold text-amber-300">{(currentSegment.startMs / 1000).toFixed(2)}s</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
                    <span className="text-slate-400 block text-[9px] uppercase">End</span>
                    <span className="font-mono font-bold text-amber-300">{(currentSegment.endMs / 1000).toFixed(2)}s</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
                    <span className="text-slate-400 block text-[9px] uppercase">Pace</span>
                    <span className="font-mono font-bold text-emerald-300">{currentSegment.speakingSpeedWpm} WPM</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Timestamped Transcript Editor & RAG Bridge (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* Segments List */}
            <div className="flex-1 rounded-xl bg-slate-900/60 border border-slate-800 p-3 space-y-2.5 overflow-y-auto max-h-[380px]">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1 mb-1">
                <span>Transcript Segments ({segments.length})</span>
                <span className="text-[10px]">Click any row to inspect & jump video</span>
              </div>

              {segments.map((seg, idx) => {
                const isActive = idx === activeSegmentIndex;
                return (
                  <div
                    key={seg.id || idx}
                    onClick={() => setActiveSegmentIndex(idx)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                        : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-400">
                          {(seg.startMs / 1000).toFixed(1)}s – {(seg.endMs / 1000).toFixed(1)}s
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 text-[9px] uppercase">
                          {seg.emotion}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {seg.handGesture}
                      </span>
                    </div>

                    {/* Inline Text Editor */}
                    <textarea
                      value={seg.text}
                      onChange={(e) => {
                        const newText = e.target.value;
                        setSegments((prev) =>
                          prev.map((s, i) => (i === idx ? { ...s, text: newText } : s)),
                        );
                      }}
                      onClick={(e) => e.stopPropagation()}
                      rows={2}
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />

                    {/* Word-level preview pills */}
                    {seg.words && seg.words.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {seg.words.slice(0, 8).map((w, wIdx) => (
                          <span
                            key={wIdx}
                            className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded border border-slate-700"
                          >
                            {w.word}
                          </span>
                        ))}
                        {seg.words.length > 8 && (
                          <span className="text-[9px] text-slate-500">+{seg.words.length - 8} words</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* RAG Assignment & Save Controls */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    Swar Yoga RAG Hub Assignment
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Assign approved authentic transcripts directly to RAG knowledge vector store.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={ragCategory}
                    onChange={(e) => setRagCategory(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="WHY_SWAR_YOGA">WHY SWAR YOGA</option>
                    <option value="LEVEL_1">LEVEL 1</option>
                    <option value="LEVEL_2">LEVEL 2</option>
                    <option value="LEVEL_3">LEVEL 3</option>
                    <option value="GENERAL_TOPICS">GENERAL TOPICS</option>
                    <option value="RESEARCH">RESEARCH &amp; SEARCH ENGINE</option>
                  </select>

                  <button
                    onClick={handleRagIndex}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Approve &amp; Index</span>
                  </button>
                </div>
              </div>

              {ragSuccess && (
                <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Transcript verified and submitted to Swar Yoga RAG Hub under {ragCategory}!</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                All changes automatically persist to Bunny Edge Database.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
                >
                  Close
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-black" />
                  <span>{isSaving ? 'Saving...' : 'Save All Corrections'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

