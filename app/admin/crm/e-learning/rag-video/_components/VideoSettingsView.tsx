'use client';

import React, { useState, useEffect } from 'react';
import {
  Video,
  Monitor,
  Smartphone,
  Sparkles,
  Sliders,
  CheckCircle2,
  Zap,
  Layers,
  Film,
  Camera,
  Cpu,
  Save,
  RotateCcw
} from 'lucide-react';

export interface VideoSettings {
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: '1080p' | '720p' | '2k';
  enhancer: 'gfpgan' | 'none';
  preprocess: 'full' | 'crop' | 'resize';
  stillMode: boolean;
  expressionScale: number; // 0.8 to 1.5
  outputFormat: 'mp4';
}

const DEFAULT_SETTINGS: VideoSettings = {
  aspectRatio: '16:9',
  resolution: '1080p',
  enhancer: 'gfpgan',
  preprocess: 'full',
  stillMode: false,
  expressionScale: 1.0,
  outputFormat: 'mp4',
};

const STORAGE_KEY = 'swar_studio_video_settings';

export default function VideoSettingsView() {
  const [settings, setSettings] = useState<VideoSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return DEFAULT_SETTINGS;
  });

  const [saved, setSaved] = useState(false);

  const saveSettings = (newSettings: VideoSettings) => {
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    saveSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400 mb-1">
              <Film className="w-4 h-4" />
              <span>SadTalker & GFPGAN Pipeline</span>
            </div>
            <h2 className="text-xl font-bold text-white">Video Studio Configuration</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Control video aspect ratios for course chapters vs vertical reels, configure GFPGAN neural facial restoration, and customize speaking dynamics for Mohan Sir&apos;s avatar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Aspect Ratio Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4 text-blue-400" />
              Aspect Ratio & Display Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  id: '16:9' as const,
                  title: '16:9 Landscape',
                  subtitle: 'E-Learning Course & LMS',
                  icon: Monitor,
                  desc: 'Full course lessons, desktop screens & YouTube'
                },
                {
                  id: '9:16' as const,
                  title: '9:16 Vertical',
                  subtitle: 'Reels, Shorts & Status',
                  icon: Smartphone,
                  desc: 'Mobile short-form clips & WhatsApp broadcast'
                },
                {
                  id: '1:1' as const,
                  title: '1:1 Square',
                  subtitle: 'Community Feed',
                  icon: Layers,
                  desc: 'Course promo cards & Instagram feed posts'
                }
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = settings.aspectRatio === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => saveSettings({ ...settings, aspectRatio: opt.id })}
                    className={`p-3.5 rounded-xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/10'
                        : 'bg-slate-800/40 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-blue-400' : 'text-slate-500'}`} />
                    <div className="text-xs font-bold text-white">{opt.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{opt.subtitle}</div>
                    <div className="text-[9px] text-slate-500 mt-1 line-clamp-2">{opt.desc}</div>
                    {isSelected && (
                      <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-400 ring-4 ring-blue-400/20" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Resolution & GFPGAN Enhancer */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Facial AI Enhancement (GFPGAN)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => saveSettings({ ...settings, enhancer: 'gfpgan' })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    settings.enhancer === 'gfpgan'
                      ? 'bg-purple-600/20 border-purple-500 text-white'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">GFPGAN Active (Recommended)</span>
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
                      Studio HD
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Restores crystal clear face details, sharp eyes, and realistic lips on Mohan Sir&apos;s avatar.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => saveSettings({ ...settings, enhancer: 'none' })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    settings.enhancer === 'none'
                      ? 'bg-slate-700/40 border-slate-500 text-white'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white mb-1">Fast Standard (No Enhancer)</div>
                  <p className="text-[10px] text-slate-400">
                    Generates 2x faster, suitable for quick test renders and rough script checks.
                  </p>
                </button>
              </div>
            </div>

            {/* Resolution Selector */}
            <div className="pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Render Quality & Resolution
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: '720p', label: '720p HD', desc: 'Fast turnaround, compact file size' },
                  { id: '1080p', label: '1080p Full HD', desc: 'Default studio standard for all course lessons' },
                  { id: '2k', label: '2K Cinema', desc: 'Highest definition for master workshop archiving' },
                ].map((res) => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => saveSettings({ ...settings, resolution: res.id as any })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      settings.resolution === res.id
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{res.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{res.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Speaking Expression Dynamics */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Facial Expression Multiplier ({settings.expressionScale.toFixed(1)}x)
                </label>
                <span className="text-[10px] text-slate-400">
                  {settings.expressionScale < 1.0 ? 'Calm Meditative' : settings.expressionScale > 1.1 ? 'Expressive' : 'Natural Balanced'}
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.1"
                value={settings.expressionScale}
                onChange={(e) => saveSettings({ ...settings, expressionScale: parseFloat(e.target.value) })}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.8x (Subtle / Yoga Sadhana)</span>
                <span>1.0x (Natural Speaking)</span>
                <span>1.4x (Dynamic Lecture)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Live Pipeline Preview */}
        <div className="space-y-5">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-amber-400" />
              Live Frame Canvas Preview
            </h3>

            {/* Aspect Ratio Mock Screen */}
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 flex items-center justify-center min-h-[220px]">
              <div
                className={`transition-all duration-300 rounded-lg border-2 border-dashed border-blue-500/50 bg-blue-500/5 flex flex-col items-center justify-center p-3 text-center ${
                  settings.aspectRatio === '16:9'
                    ? 'w-full h-36'
                    : settings.aspectRatio === '9:16'
                    ? 'w-32 h-52'
                    : 'w-40 h-40'
                }`}
              >
                <Film className="w-6 h-6 text-blue-400 mb-1" />
                <div className="text-[11px] font-bold text-white">{settings.aspectRatio} Canvas</div>
                <div className="text-[9px] text-blue-300 font-mono mt-0.5">{settings.resolution}</div>
                <div className="text-[8px] text-slate-400 mt-1">
                  GFPGAN: {settings.enhancer === 'gfpgan' ? 'ON (1080p)' : 'OFF'}
                </div>
              </div>
            </div>

            {/* Pipeline Specs Summary */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400 py-1 border-b border-slate-800">
                <span>Model Engine:</span>
                <span className="text-white font-mono text-[11px]">Replicate SadTalker v2</span>
              </div>
              <div className="flex justify-between text-slate-400 py-1 border-b border-slate-800">
                <span>Audio Driving:</span>
                <span className="text-white font-mono text-[11px]">OpenAI TTS-1 HD</span>
              </div>
              <div className="flex justify-between text-slate-400 py-1 border-b border-slate-800">
                <span>Storage Target:</span>
                <span className="text-white font-mono text-[11px]">Bunny CDN /materials</span>
              </div>
              <div className="flex justify-between text-slate-400 py-1">
                <span>Export Format:</span>
                <span className="text-emerald-400 font-mono text-[11px]">MP4 (H.264 / AAC)</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-950/30 border border-blue-800/40 rounded-2xl p-4 text-xs text-blue-300">
            <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              Auto-Linked to Render Queue
            </div>
            These settings automatically apply when you click &quot;Render Approved Scripts&quot; in the video dubbing pipeline.
          </div>
        </div>
      </div>
    </div>
  );
}
