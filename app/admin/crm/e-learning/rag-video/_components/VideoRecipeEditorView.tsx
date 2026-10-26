'use client';

import React, { useState, useEffect } from 'react';
import {
  Clapperboard,
  Plus,
  Trash2,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Video as VideoIcon,
  User,
  Tv,
  Save,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  Clock,
  Languages,
  Film,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { RecipeScene, MultiLangScene, VideoRecipeProject } from '@/lib/bunnyVideoRecipeRepository';

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
];

const DEFAULT_PRESET_SCENES: RecipeScene[] = [
  {
    id: 's1',
    order: 1,
    stepTitle: 'Introduction & Health Benefits',
    spokenScript: 'Hari Om. Today I will teach you the ancient Swar Yoga Golden Milk recipe for deep sleep and vital Ojas.',
    visualType: 'avatar',
    mediaUrl: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
    avatarId: 'avatar_mohan_sir_portrait',
    durationSeconds: 8,
  },
  {
    id: 's2',
    order: 2,
    stepTitle: 'Step 1: The Sacred Ingredients',
    spokenScript: 'Take one cup of fresh milk, half teaspoon organic turmeric powder, two crushed green cardamoms, and a pinch of black pepper.',
    visualType: 'image',
    mediaUrl: 'https://swaryogacrm.b-cdn.net/Aamrut%20Aahar.jpg',
    durationSeconds: 10,
  },
  {
    id: 's3',
    order: 3,
    stepTitle: 'Step 2: Slow Boiling Technique',
    spokenScript: 'Simmer on low flame for four to five minutes so the curcumins blend thoroughly with the milk.',
    visualType: 'pip',
    mediaUrl: 'https://swaryogacrm.b-cdn.net/zoom-videos/2026-10-13%20H1P12YTMTRy5J0baEAa-bQ--%20Hindi%20Oct-26%20Mor%20Swar%20Yoga%20L-1%20(speaker).mp4',
    avatarId: 'avatar_mohan_sir_portrait',
    durationSeconds: 8,
  },
  {
    id: 's4',
    order: 4,
    stepTitle: 'Step 3: Yogic Consumption Timing',
    spokenScript: 'Drink this warm right before sleep when your Surya Swara or Chandra Swara is in balance.',
    visualType: 'avatar',
    mediaUrl: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
    avatarId: 'avatar_mohan_sir_portrait',
    durationSeconds: 7,
  },
];

interface VideoRecipeEditorViewProps {
  token: string | null;
}

export default function VideoRecipeEditorView({ token }: VideoRecipeEditorViewProps) {
  const [title, setTitle] = useState('Ayurvedic Golden Turmeric Milk Recipe');
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [targetLanguages, setTargetLanguages] = useState<string[]>(['hi', 'mr', 'kn']);
  const [scenes, setScenes] = useState<RecipeScene[]>(DEFAULT_PRESET_SCENES);
  const [multiLangScenes, setMultiLangScenes] = useState<MultiLangScene[]>([]);
  
  const [activePreviewLang, setActivePreviewLang] = useState('en');
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  // Handle Play/Pause simulation
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      const dur = (scenes[currentSceneIndex]?.durationSeconds || 6) * 1000;
      timer = setTimeout(() => {
        if (currentSceneIndex < scenes.length - 1) {
          setCurrentSceneIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
          setCurrentSceneIndex(0);
        }
      }, dur);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentSceneIndex, scenes]);

  const currentScene = scenes[currentSceneIndex] || scenes[0];

  // Resolve active script based on selected preview language
  const getSceneScript = (sceneId: string, fallback: string) => {
    if (activePreviewLang === sourceLanguage) return fallback;
    const match = multiLangScenes.find(
      (m) => m.sceneId === sceneId && m.language === activePreviewLang
    );
    return match?.translatedScript || fallback;
  };

  const getSceneTitle = (sceneId: string, fallback: string) => {
    if (activePreviewLang === sourceLanguage) return fallback;
    const match = multiLangScenes.find(
      (m) => m.sceneId === sceneId && m.language === activePreviewLang
    );
    return match?.translatedTitle || fallback;
  };

  const handleAddScene = () => {
    const newScene: RecipeScene = {
      id: `s_${Date.now()}`,
      order: scenes.length + 1,
      stepTitle: `Step ${scenes.length + 1}: Preparation`,
      spokenScript: 'Explain the next step of the recipe here...',
      visualType: 'pip',
      mediaUrl: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
      durationSeconds: 6,
    };
    setScenes([...scenes, newScene]);
    setCurrentSceneIndex(scenes.length);
  };

  const handleRemoveScene = (idx: number) => {
    if (scenes.length <= 1) return;
    const updated = scenes.filter((_, i) => i !== idx);
    setScenes(updated);
    if (currentSceneIndex >= updated.length) {
      setCurrentSceneIndex(updated.length - 1);
    }
  };

  const handleUpdateCurrentScene = (updates: Partial<RecipeScene>) => {
    const updated = [...scenes];
    updated[currentSceneIndex] = { ...updated[currentSceneIndex], ...updates };
    setScenes(updated);
  };

  // 1-Click Multi-Language Translation
  const handleTranslateAllScenes = async () => {
    setError('');
    setTranslating(true);

    try {
      const res = await fetch('/api/admin/e-learning/ai-video/video-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          action: 'translate_scenes',
          project: {
            title,
            sourceLanguage,
            scenes,
          },
          targetLanguages: [sourceLanguage, ...targetLanguages],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to translate video recipe');

      if (data.project?.multiLangScenes) {
        setMultiLangScenes(data.project.multiLangScenes);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const toggleTargetLanguage = (code: string) => {
    if (targetLanguages.includes(code)) {
      if (targetLanguages.length > 1) {
        setTargetLanguages(targetLanguages.filter((c) => c !== code));
      }
    } else {
      setTargetLanguages([...targetLanguages, code]);
    }
  };

  const totalDuration = scenes.reduce((acc, s) => acc + (s.durationSeconds || 6), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900/40 via-orange-900/30 to-slate-900 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
              <Clapperboard className="w-4 h-4" />
              <span>Multi-Track Timeline &amp; Recipe Video Studio</span>
            </div>
            <h2 className="text-xl font-bold text-white">Video Recipe Editor</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl">
              Mix Mohan Sir&apos;s Avatar, cooking videos, and recipe step photos into a unified multi-media video. Translate and narrate into all languages with 1-click.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTranslateAllScenes}
              disabled={translating}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
            >
              {translating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Translating Recipe into {targetLanguages.length} Languages...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Translate &amp; Mix All Languages</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Timeline / Right Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Timeline & Scene Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Recipe Metadata Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Recipe / Video Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Primary Language
                </label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {ALL_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Multi-Languages Selection */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Dubbing Languages ({targetLanguages.length})
                </label>
                <span className="text-[10px] text-amber-400">
                  Total Duration: ~{totalDuration}s
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ALL_LANGUAGES.map((lang) => {
                  const isSelected = targetLanguages.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => toggleTargetLanguage(lang.code)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-600/30 border-amber-500 text-amber-200 font-semibold shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timeline Tracks Header */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Timeline Scenes ({scenes.length})
                </span>
              </div>
              <button
                onClick={handleAddScene}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Scene</span>
              </button>
            </div>

            {/* Horizontal Timeline Scrubber Blocks */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
              {scenes.map((s, idx) => {
                const isSelected = currentSceneIndex === idx;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setCurrentSceneIndex(idx);
                      setIsPlaying(false);
                    }}
                    className={`shrink-0 p-2.5 rounded-xl border text-left transition-all relative w-36 ${
                      isSelected
                        ? 'bg-amber-600/20 border-amber-500 text-white shadow-md shadow-amber-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                      <span>Scene {idx + 1}</span>
                      <span className="font-mono text-amber-400">{s.durationSeconds || 6}s</span>
                    </div>
                    <div className="text-xs font-semibold text-white truncate">
                      {s.stepTitle}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                      {s.visualType === 'avatar' && <User className="w-3 h-3 text-purple-400" />}
                      {s.visualType === 'image' && <ImageIcon className="w-3 h-3 text-blue-400" />}
                      {s.visualType === 'video' && <VideoIcon className="w-3 h-3 text-emerald-400" />}
                      {s.visualType === 'pip' && <Tv className="w-3 h-3 text-amber-400" />}
                      <span className="capitalize">{s.visualType}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Scene Detailed Editor */}
            {currentScene && (
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <span>Editing Scene {currentSceneIndex + 1}</span>
                  </span>
                  {scenes.length > 1 && (
                    <button
                      onClick={() => handleRemoveScene(currentSceneIndex)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Delete Scene"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Step Title
                    </label>
                    <input
                      type="text"
                      value={currentScene.stepTitle}
                      onChange={(e) => handleUpdateCurrentScene({ stepTitle: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Visual Presentation Mode
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'avatar' as const, label: 'Avatar', icon: User },
                        { id: 'image' as const, label: 'Image', icon: ImageIcon },
                        { id: 'video' as const, label: 'Video', icon: VideoIcon },
                        { id: 'pip' as const, label: 'PiP Mix', icon: Tv },
                      ].map((t) => {
                        const Icon = t.icon;
                        const active = currentScene.visualType === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleUpdateCurrentScene({ visualType: t.id })}
                            className={`p-1.5 rounded-lg border text-center text-[10px] flex flex-col items-center justify-center transition-all ${
                              active
                                ? 'bg-amber-600/30 border-amber-500 text-white font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <Icon className="w-3 h-3 mb-0.5" />
                            <span>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Spoken Dialogue / Recipe Instruction ({sourceLanguage.toUpperCase()})
                  </label>
                  <textarea
                    rows={3}
                    value={currentScene.spokenScript}
                    onChange={(e) => handleUpdateCurrentScene({ spokenScript: e.target.value })}
                    placeholder="Enter what Mohan Sir speaks during this scene..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Bunny CDN Media URL
                    </label>
                    <input
                      type="text"
                      value={currentScene.mediaUrl || ''}
                      onChange={(e) => handleUpdateCurrentScene({ mediaUrl: e.target.value })}
                      placeholder="https://swaryogacrm.b-cdn.net/..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Duration (Seconds)
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={60}
                      value={currentScene.durationSeconds || 6}
                      onChange={(e) => handleUpdateCurrentScene({ durationSeconds: parseInt(e.target.value, 10) || 6 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Quick Asset Selector */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] text-slate-400 mb-1.5 font-semibold">
                    Quick Insert from Bunny Storage:
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentScene({
                        mediaUrl: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
                        visualType: 'avatar'
                      })}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1"
                    >
                      <User className="w-3 h-3 text-purple-400" />
                      Mohan Sir Portrait
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentScene({
                        mediaUrl: 'https://swaryogacrm.b-cdn.net/zoom-videos/2026-10-13%20H1P12YTMTRy5J0baEAa-bQ--%20Hindi%20Oct-26%20Mor%20Swar%20Yoga%20L-1%20(speaker).mp4',
                        visualType: 'video'
                      })}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1"
                    >
                      <VideoIcon className="w-3 h-3 text-emerald-400" />
                      Speaker View Video
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentScene({
                        mediaUrl: 'https://swaryogacrm.b-cdn.net/Aamrut%20Aahar.jpg',
                        visualType: 'image'
                      })}
                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1"
                    >
                      <ImageIcon className="w-3 h-3 text-blue-400" />
                      Aamrut Aahar Food Slide
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Player & Multi-Language Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            {/* Live Preview Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Tv className="w-4 h-4 text-amber-400" />
                Live Video Mix Canvas
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                Scene {currentSceneIndex + 1} of {scenes.length}
              </span>
            </div>

            {/* Language Switch Tabs for Live Simulation */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActivePreviewLang(sourceLanguage)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${
                  activePreviewLang === sourceLanguage
                    ? 'bg-amber-600/30 border-amber-500 text-white font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Primary ({sourceLanguage.toUpperCase()})
              </button>
              {targetLanguages.map((tCode) => {
                const langObj = ALL_LANGUAGES.find((l) => l.code === tCode);
                const hasTranslation = multiLangScenes.some((m) => m.language === tCode);
                return (
                  <button
                    key={tCode}
                    type="button"
                    onClick={() => setActivePreviewLang(tCode)}
                    className={`text-[10px] px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                      activePreviewLang === tCode
                        ? 'bg-emerald-600/30 border-emerald-500 text-white font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>{langObj?.flag}</span>
                    <span>{langObj?.code.toUpperCase()}</span>
                    {hasTranslation && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </button>
                );
              })}
            </div>

            {/* Simulated 16:9 Screen */}
            <div className="relative aspect-video w-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
              {/* Main Visual Layer */}
              {currentScene.visualType === 'image' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentScene.mediaUrl || 'https://swaryogacrm.b-cdn.net/Aamrut%20Aahar.jpg'}
                  alt="Scene slide"
                  className="w-full h-full object-cover transition-all duration-700"
                />
              )}

              {currentScene.visualType === 'video' && (
                <video
                  src={currentScene.mediaUrl}
                  autoPlay
                  loop
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {currentScene.visualType === 'avatar' && (
                <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://swaryogacrm.b-cdn.net/mohan.jpg"
                    alt="Mohan Sir Avatar"
                    className="h-full object-contain"
                  />
                  <div className="absolute top-2 left-2 text-[9px] bg-purple-500/80 text-white px-1.5 py-0.5 rounded font-mono">
                    Mohan Sir Avatar Full
                  </div>
                </div>
              )}

              {currentScene.visualType === 'pip' && (
                <div className="relative w-full h-full">
                  {/* Background B-roll/Food Media */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={currentScene.mediaUrl?.endsWith('.mp4') ? 'https://swaryogacrm.b-cdn.net/Aamrut%20Aahar.jpg' : (currentScene.mediaUrl || 'https://swaryogacrm.b-cdn.net/Aamrut%20Aahar.jpg')}
                    alt="Background recipe step"
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay Picture in Picture Avatar in Bottom-Right */}
                  <div className="absolute bottom-10 right-3 w-28 h-28 rounded-xl overflow-hidden border-2 border-amber-400 shadow-2xl bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="https://swaryogacrm.b-cdn.net/mohan.jpg"
                      alt="Mohan Sir PiP"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 text-[8px] bg-black/80 text-amber-300 px-1 rounded">
                      Mohan Sir PiP
                    </div>
                  </div>
                </div>
              )}

              {/* Subtitle / Dialogue Banner Overlay at Bottom */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 pt-6 text-center">
                <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider mb-0.5">
                  {getSceneTitle(currentScene.id, currentScene.stepTitle)}
                </div>
                <div className="text-xs text-white font-medium drop-shadow-md max-w-sm mx-auto leading-snug">
                  &ldquo;{getSceneScript(currentScene.id, currentScene.spokenScript)}&rdquo;
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setCurrentSceneIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentSceneIndex === 0}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-black" />}
                <span>{isPlaying ? 'Pause' : 'Play Timeline'}</span>
              </button>

              <button
                onClick={() => setCurrentSceneIndex((prev) => Math.min(scenes.length - 1, prev + 1))}
                disabled={currentSceneIndex === scenes.length - 1}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {savedSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>All scenes successfully translated and synchronized across target languages!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
