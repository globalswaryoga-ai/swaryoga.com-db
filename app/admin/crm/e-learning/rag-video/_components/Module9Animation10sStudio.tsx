'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Film,
  Video,
  Download,
  Layers,
  Compass,
  CheckCircle2,
  Sliders,
  ExternalLink,
  ChevronRight,
  Eye,
  Camera,
  Sun,
  Moon,
  Clock,
  Heart,
  Activity,
  Feather,
  Building,
  User,
} from 'lucide-react';
import {
  ANIMATION_10S_PRESETS,
  AnimationPresetItem,
} from '@/app/api/avatar/animation-10s/route';
import Procedural10sViewport from './Procedural10sViewport';
import CustomAnimationStudio from './CustomAnimationStudio';

interface Module9Props {
  token?: string | null;
  initialTopic?: string;
  onSendToVideoStudio?: (animationClip: any) => void;
}

export default function Module9Animation10sStudio({
  token,
  initialTopic = '',
  onSendToVideoStudio,
}: Module9Props) {
  const [studioMode, setStudioMode] = useState<'presets' | 'custom_creator'>('presets');
  const [selectedCategory, setSelectedCategory] = useState<string>('ayurveda_remedy');
  const [activePreset, setActivePreset] = useState<AnimationPresetItem>(ANIMATION_10S_PRESETS[0]);
  const [language, setLanguage] = useState<string>('hi');
  const [promptInput, setPromptInput] = useState<string>('1 चम्मच त्रिफला पाउडर कांच के गिलास में घोलकर रात भर रखें और सुबह पिएं');
  const [realVideoInput, setRealVideoInput] = useState<string>(
    'https://swaryogacrm.b-cdn.net/zoom-videos/2026-10-13%20H1P12YTMTRy5J0baEAa-bQ--%20Hindi%20Oct-26%20Mor%20Swar%20Yoga%20L-1%20(speaker).mp4'
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const [showTextOverlay, setShowTextOverlay] = useState<boolean>(false); // Pure visual / clean mode by default
  const [customSubtitleText, setCustomSubtitleText] = useState<string>('');
  const [isCustomTextOpen, setIsCustomTextOpen] = useState<boolean>(false);

  // Playback timer states (10 seconds)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0); // 0.0 to 10.0
  const videoRef = useRef<HTMLVideoElement>(null);

  // Filter presets by active category
  const filteredPresets = ANIMATION_10S_PRESETS.filter(
    (p) => p.category === selectedCategory || selectedCategory === 'all'
  );

  // Playback loop for 10-second simulation
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= 9.8) {
            setIsPlaying(false);
            return 10.0;
          }
          return parseFloat((prev + 0.1).toFixed(1));
        });
      }, 100);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (currentTime >= 10.0) {
      setCurrentTime(0);
      setIsPlaying(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
    } else {
      const nextPlay = !isPlaying;
      setIsPlaying(nextPlay);
      if (videoRef.current) {
        if (nextPlay) videoRef.current.play();
        else videoRef.current.pause();
      }
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  const handleSelectPreset = (preset: AnimationPresetItem) => {
    setActivePreset(preset);
    setPromptInput(preset.description);
    setCurrentTime(0);
    setIsPlaying(false);
    if (preset.realVideoUrl) {
      setRealVideoInput(preset.realVideoUrl);
    }
  };

  const handleGenerateCustom = async () => {
    if (!promptInput.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/avatar/animation-10s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
          category: selectedCategory,
          language,
          customRealVideoUrl: selectedCategory === 'real_video_hybrid' ? realVideoInput : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setActivePreset(data.data);
        setCurrentTime(0);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Animation generate error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Determine which step is currently active (0-3s, 3-6s, 6-10s)
  const getActiveStepIndex = () => {
    if (currentTime < 3.0) return 0;
    if (currentTime < 6.5) return 1;
    return 2;
  };

  const currentStep = activePreset.steps[getActiveStepIndex()] || activePreset.steps[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center text-white font-black shadow-lg">
            <Film size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Module 9: Universal 10-Second Visual & Animation Engine
              </h2>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                Triphala & Remedies • Asanas • Mudras • Resort • Mohan Sir Hybrid
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Turn any remedy, asana, hand mudra, or real video into an ultra-high definition 10-second scientific video cutaway.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStudioMode('presets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                studioMode === 'presets'
                  ? 'bg-emerald-500 text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌟 4K Master Presets
            </button>
            <button
              onClick={() => setStudioMode('custom_creator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                studioMode === 'custom_creator'
                  ? 'bg-cyan-500 text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎬 Custom 0–30s Creator
            </button>
          </div>

          {onSendToVideoStudio && (
            <button
              onClick={() => onSendToVideoStudio(activePreset)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 text-black font-extrabold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Video size={14} />
              <span>Insert 10s Clip into Master Video ➔</span>
            </button>
          )}
        </div>
      </div>

      {/* If Custom 0-30s Storyboard Mode is active */}
      {studioMode === 'custom_creator' ? (
        <CustomAnimationStudio />
      ) : (
        <>
          {/* Category Tabs Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-slate-900 p-2 rounded-2xl border border-slate-800">
        {[
          { id: 'ayurveda_remedy', label: '🌿 Ayurvedic Daily Remedies (त्रिफला, नस्य)', icon: Feather },
          { id: 'yoga_asana', label: '🧘 3D Yoga Asanas (पद्मासन, भुजंगासन)', icon: Activity },
          { id: 'hand_mudra', label: '🖐️ Sacred Hand Mudras (नासिकाग्र, ज्ञान)', icon: Compass },
          { id: 'internal_anatomy', label: '🔬 3D Anatomy & Physiology (जठराग्नि, Brain)', icon: Heart },
          { id: 'resort_architecture', label: '🏛️ Resort & Ashram Drone (रिसॉर्ट टूर)', icon: Building },
          { id: 'real_video_hybrid', label: '🎥 Mohan Sir Real Video + 3D PiP', icon: User },
        ].map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                const first = ANIMATION_10S_PRESETS.find((p) => p.category === cat.id);
                if (first) handleSelectPreset(first);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-500 text-black shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={13} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Studio Viewport (12 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 16:9 Viewport & 10s Playback (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top Info Bar: Outside Video Canvas */}
          <div className="flex items-center justify-between text-xs px-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-black font-extrabold text-[10px]">
                4K Clip
              </span>
              <span className="text-white font-bold truncate max-w-sm">
                {activePreset.title}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-xl font-mono text-emerald-400 font-bold text-xs">
              <Clock size={12} />
              <span>00:{currentTime.toFixed(1).padStart(4, '0')}s / 00:10.0s</span>
            </div>
          </div>

          {/* 16:9 Pristine 4K Video Canvas (ZERO TEXT OVERLAYS BY DEFAULT) */}
          <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
            <Procedural10sViewport
              preset={activePreset}
              currentTime={currentTime}
              isPlaying={isPlaying}
              videoRef={videoRef}
              showTextOverlay={showTextOverlay}
              customSubtitleText={customSubtitleText}
            />
          </div>

          {/* Optional User Custom Subtitle Input Box */}
          {isCustomTextOpen && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                <span>Add Your Custom Title / Subtitle (Optional)</span>
                {customSubtitleText && (
                  <button
                    onClick={() => setCustomSubtitleText('')}
                    className="text-[10px] text-red-400 hover:underline cursor-pointer"
                  >
                    Clear Text
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSubtitleText}
                  onChange={(e) => {
                    setCustomSubtitleText(e.target.value);
                    if (!showTextOverlay) setShowTextOverlay(true);
                  }}
                  placeholder="Type custom text (e.g., सूर्य नाड़ी प्राणायाम • मोहन सर)"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => setIsCustomTextOpen(false)}
                  className="px-3.5 py-1.5 bg-emerald-500 text-black font-bold text-xs rounded-lg cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {/* 10-Second Progress Bar & Controls */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
            {/* Timeline Bar with 3 Step Milestones */}
            <div className="space-y-1.5">
              <div
                className="relative w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 cursor-pointer group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  const newTime = parseFloat((pct * 10).toFixed(1));
                  setCurrentTime(newTime);
                  if (videoRef.current) {
                    videoRef.current.currentTime = newTime;
                  }
                }}
                title="Click anywhere to seek"
              >
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 transition-all duration-75 relative"
                  style={{ width: `${(currentTime / 10.0) * 100}%` }}
                >
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full shadow" />
                </div>
              </div>

              {/* Step Markers (0s, 3s, 6s, 10s) */}
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>00:00s (Step 1)</span>
                <span>00:03s (Step 2)</span>
                <span>00:06s (Step 3)</span>
                <span>00:10s (Finish)</span>
              </div>
            </div>

            {/* Play / Restart / Clean Mode Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayPause}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-xs shadow flex items-center gap-1.5 cursor-pointer"
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} className="fill-black" />}
                  <span>{isPlaying ? 'Pause' : currentTime >= 10 ? 'Replay' : 'Play 10s Preview'}</span>
                </button>

                <button
                  onClick={handleRestart}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
                  title="Restart to 0s"
                >
                  <RotateCcw size={14} />
                </button>

                {/* Clean Mode Toggle: No Text by default */}
                <button
                  onClick={() => setShowTextOverlay((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    showTextOverlay
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  }`}
                  title={showTextOverlay ? 'Click to remove all text' : 'Click to show text & labels'}
                >
                  {showTextOverlay ? (
                    <>
                      <Eye size={13} />
                      <span>Text: ON</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} />
                      <span>✨ Clean 4K (No Text)</span>
                    </>
                  )}
                </button>

                {/* Custom Text Toggle */}
                <button
                  onClick={() => setIsCustomTextOpen((prev) => !prev)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
                  title="Add custom text or title"
                >
                  <span>➕ {customSubtitleText ? 'Edit Text' : 'Add Text'}</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-medium">
                Auto-loops 60 FPS • 4K Master
              </span>
            </div>
          </div>

          {/* Active Action Step Information Card (Placed Cleanly Outside the Video Canvas) */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold font-mono">
                {currentStep.timeRange} • {currentStep.calloutText}
              </span>
              <span className="text-slate-400 text-[10px]">
                Step {getActiveStepIndex() + 1} of 3
              </span>
            </div>
            <p className="text-white text-xs sm:text-sm font-semibold leading-snug">
              {currentStep.action}
            </p>
            <div className="text-[11px] text-slate-400 truncate pt-1 border-t border-slate-800/60">
              📷 Camera Motion: <strong className="text-slate-300">{activePreset.cameraMotion}</strong>
            </div>
          </div>
        </div>

        {/* Right: 3-Step Choreography & Prompt Input (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Custom Prompt & Real Video Input Box */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles size={13} className="text-emerald-400" />
                <span>Create New 10-Second Animation</span>
              </span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white font-bold"
              >
                <option value="hi">🇮🇳 Hindi</option>
                <option value="kn">🇮🇳 Kannada</option>
                <option value="mr">🚩 Marathi</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400">Describe the 10-Second Action:</label>
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                rows={3}
                placeholder="उदा. 1 चम्मच त्रिफला पाउडर पानी में घोलकर सुबह पिएं या पद्मासन में चक्र जागृति..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 font-sans leading-relaxed"
              />
            </div>

            {selectedCategory === 'real_video_hybrid' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400">Mohan Sir Video URL (Bunny Storage / Zoom):</label>
                <input
                  type="text"
                  value={realVideoInput}
                  onChange={(e) => setRealVideoInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono truncate"
                />
              </div>
            )}

            <button
              disabled={isGenerating || !promptInput.trim()}
              onClick={handleGenerateCustom}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 text-black font-extrabold text-xs rounded-xl shadow-lg active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Synthesizing 10s Choreography...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Generate 10-Second Animation</span>
                </>
              )}
            </button>
          </div>

          {/* 3 Step Breakdown Cards */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-2.5">
            <span className="text-xs font-bold text-white block pb-1 border-b border-slate-800">
              10-Second Action Breakdown (3 Steps):
            </span>

            {activePreset.steps.map((st, i) => {
              const isActive = i === getActiveStepIndex();
              return (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isActive
                      ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/30'
                      : 'bg-slate-950 border-slate-800/80 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className={isActive ? 'text-emerald-400 font-mono' : 'text-slate-400 font-mono'}>
                      {st.timeRange}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[10px]">
                      {st.calloutText}
                    </span>
                  </div>
                  <p className="text-slate-200 mt-1 font-medium">{st.action}</p>
                </div>
              );
            })}
          </div>

          {/* Preset Quick Switcher */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
            <span className="text-xs font-bold text-slate-300">Quick Switch Preset:</span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredPresets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`w-full text-left p-2 rounded-xl border text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    activePreset.id === p.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-bold truncate max-w-[240px]">{p.title}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">10s ➔</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
