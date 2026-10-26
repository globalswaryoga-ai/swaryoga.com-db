'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Palette,
  Shirt,
  Volume2,
  Film,
  RotateCw,
  Move,
  ZoomIn,
  Eye,
  Camera,
  Layers,
  ChefHat,
  BookOpen,
  ArrowRight,
  User,
  Play,
  Video,
  Download,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import InhouseAudioStudio from './InhouseAudioStudio';
import Inhouse3DAvatarCanvas from './Inhouse3DAvatarCanvas';
import { VisemeFrame } from '@/lib/avatarEngine/visemeMapper';
import {
  MASTER_BACKGROUNDS,
  MASTER_CLOTHING,
  BackgroundItem,
  ClothingItem,
} from '@/lib/avatarStudioMasterConfig';

export default function InhouseStudioView() {
  // Mode: '3d_stage' (Three.js WebGL Real-time Viseme Stage) vs '2d_video' (Photorealistic Twin)
  const [activeStageMode, setActiveStageMode] = useState<'3d_stage' | '2d_video'>('3d_stage');

  // Audio & Speech State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [visemeFrames, setVisemeFrames] = useState<VisemeFrame[]>([]);
  const [currentScript, setCurrentScript] = useState<string>('');
  const [currentDuration, setCurrentDuration] = useState<number>(0);

  // Background & Appearance
  const [selectedBgId, setSelectedBgId] = useState<string>('bg_kitchen');
  const [selectedClothId, setSelectedClothId] = useState<string>('cloth_white_kurta');
  const [posture, setPosture] = useState<'sitting' | 'standing' | 'walking'>('sitting');

  const activeBg = MASTER_BACKGROUNDS.find((b) => b.id === selectedBgId) || MASTER_BACKGROUNDS[0];
  const activeCloth = MASTER_CLOTHING.find((c) => c.id === selectedClothId) || MASTER_CLOTHING[0];

  // 2D Video Rendering State
  const [isRenderingVideo, setIsRenderingVideo] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Callback when audio is synthesized
  const handleAudioSynthesized = (data: {
    audioUrl: string;
    durationSeconds: number;
    visemeFrames: VisemeFrame[];
    voiceId: string;
    script: string;
  }) => {
    setAudioUrl(data.audioUrl);
    setVisemeFrames(data.visemeFrames);
    setCurrentScript(data.script);
    setCurrentDuration(data.durationSeconds);
  };

  // Trigger In-House 2D Video Generation ($0 API Cost)
  const handleRenderInhouseVideo = async () => {
    if (!currentScript.trim()) {
      alert('Please enter a script text and click Synthesize Voice Audio first.');
      return;
    }

    setIsRenderingVideo(true);
    setRenderProgress(20);
    setVideoError(null);

    try {
      setRenderProgress(45);
      const res = await fetch('/api/avatar/inhouse/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: currentScript.trim(),
          avatarName: 'Mohan Sir (Vedic Twin)',
          voiceId: 'hi-IN-MadhurNeural',
          backgroundId: selectedBgId,
          clothingId: selectedClothId,
          posture,
        }),
      });

      setRenderProgress(80);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to render in-house video');
      }

      setRenderProgress(100);
      if (data.job?.videoUrl) {
        setRenderedVideoUrl(data.job.videoUrl);
        setActiveStageMode('2d_video');
      }
    } catch (err: any) {
      setVideoError(err.message || 'Error occurred while rendering video');
    } finally {
      setIsRenderingVideo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/50 border border-emerald-500/40 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-400 to-cyan-500 flex items-center justify-center text-black font-black shadow-xl shadow-emerald-500/20">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-white">In-House HeyGen Digital Twin Engine</h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                100% In-House • $0 API Cost
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Isolated studio engine: Indian Neural Voice Synthesis, 3D WebGL Viseme Lip-Sync & 20 Photorealistic Scenes.
            </p>
          </div>
        </div>

        {/* View Switcher: 3D Stage vs 2D Photorealistic Twin */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-950/80 border border-slate-800 rounded-2xl backdrop-blur-md self-start lg:self-auto">
          <button
            onClick={() => setActiveStageMode('3d_stage')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeStageMode === '3d_stage'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            3D WebGL Stage
          </button>
          <button
            onClick={() => setActiveStageMode('2d_video')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeStageMode === '2d_video'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-lg shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            2D Video Twin
          </button>
        </div>
      </div>

      {/* Main Studio Viewport & Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Viewport (3D Stage or 2D Video) */}
        <div className="lg:col-span-8 space-y-4">
          {activeStageMode === '3d_stage' ? (
            <Inhouse3DAvatarCanvas
              backgroundUrl={activeBg.imageUrl}
              clothingName={activeCloth.name}
              clothingId={activeCloth.id}
              audioUrl={audioUrl}
              visemeFrames={visemeFrames}
              posture={posture}
            />
          ) : renderedVideoUrl ? (
            <div className="relative w-full rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/70 shadow-2xl aspect-video">
              <video
                controls
                autoPlay
                src={renderedVideoUrl}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/50 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  1080p In-House Video Ready (Bunny CDN)
                </span>
              </div>
              <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
                <a
                  href={renderedVideoUrl}
                  download="mohan_sir_avatar_video.mp4"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download MP4
                </a>
              </div>
            </div>
          ) : (
            <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl aspect-video flex items-center justify-center">
              {/* Background Scene */}
              <img
                src={activeBg.imageUrl}
                alt={activeBg.name}
                className="w-full h-full object-cover filter brightness-90"
              />

              {/* Mohan Sir Photorealistic Cutout */}
              <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
                <img
                  src="https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png"
                  alt="Mohan Kalburgi"
                  className="h-[88%] object-contain object-bottom filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)]"
                />
              </div>

              {/* Overlay Badge */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-900/80 text-white border border-slate-700 backdrop-blur-md">
                  2D Photorealistic Twin • {activeBg.name}
                </span>
              </div>

              {/* Native Audio Overlay Player */}
              {audioUrl && (
                <div className="absolute bottom-4 inset-x-6 z-20 p-3 bg-slate-900/90 border border-slate-800 rounded-xl backdrop-blur-md shadow-2xl flex items-center justify-between gap-4">
                  <div className="text-xs">
                    <span className="text-slate-400">Duration: </span>
                    <span className="font-bold text-white">{currentDuration}s</span>
                  </div>
                  <audio controls src={audioUrl} className="w-2/3 h-8" />
                </div>
              )}
            </div>
          )}

          {/* Render 2D Video Action Bar (When in 2D mode) */}
          {activeStageMode === '2d_video' && (
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-200">2D Photorealistic Video Compositor</h4>
                <p className="text-[11px] text-slate-400">
                  Renders high-definition speech video merged with the selected background scene.
                </p>
              </div>

              <button
                onClick={handleRenderInhouseVideo}
                disabled={isRenderingVideo}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
              >
                {isRenderingVideo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Rendering Video ({renderProgress}%)...
                  </>
                ) : (
                  <>
                    <Video className="w-3.5 h-3.5 fill-current" />
                    Render 2D Video ($0 Cost)
                  </>
                )}
              </button>
            </div>
          )}

          {/* Quick Scene Background Picker */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-emerald-400" />
                Select Scene Background ({MASTER_BACKGROUNDS.length})
              </span>
              <span className="text-[11px] text-slate-500">Active: {activeBg.name}</span>
            </div>

            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
              {MASTER_BACKGROUNDS.map((bg) => {
                const isSelected = bg.id === selectedBgId;
                return (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBgId(bg.id)}
                    className={`shrink-0 w-28 text-left rounded-xl overflow-hidden border transition-all ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105'
                        : 'border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={bg.imageUrl} alt={bg.name} className="w-full h-16 object-cover" />
                    <div className="p-1.5 bg-slate-950">
                      <p className="text-[11px] font-medium text-slate-200 truncate">{bg.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Outfit & Posture Configurator */}
        <div className="lg:col-span-4 space-y-4">
          {/* Posture Picker */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Posture Selection
            </span>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'sitting', label: '🧘 Sitting (पद्मासन)', desc: 'Meditation' },
                { id: 'standing', label: '🧍 Standing (सहज)', desc: 'Keynote' },
                { id: 'walking', label: '🚶 Walking (चलना)', desc: 'Ashram' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPosture(p.id as any)}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    posture === p.id
                      ? 'bg-emerald-950/40 border-emerald-500 text-white font-bold'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs">{p.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Clothing & Attire Selector */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-3">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Shirt className="w-3.5 h-3.5 text-emerald-400" />
              Select Attire & Wardrobe
            </span>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {MASTER_CLOTHING.map((c) => {
                const isSelected = c.id === selectedClothId;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClothId(c.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500 text-white'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl">{c.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{c.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Audio Studio Component */}
      <InhouseAudioStudio onAudioSynthesized={handleAudioSynthesized} />
    </div>
  );
}
