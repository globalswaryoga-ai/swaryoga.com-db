'use client';

import React, { useEffect, useState } from 'react';
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

interface AvatarProfileOption {
  id: string;
  name: string;
  consent_record_id?: string | null;
}

function getAdminAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('adminToken')
    || localStorage.getItem('admin_token')
    || localStorage.getItem('crm_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function InhouseStudioView() {
  // Mode: '3d_stage' (Three.js WebGL Real-time Viseme Stage) vs '2d_video' (Photorealistic Twin)
  const [activeStageMode, setActiveStageMode] = useState<'3d_stage' | '2d_video'>('3d_stage');

  // Audio & Speech State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [visemeFrames, setVisemeFrames] = useState<VisemeFrame[]>([]);
  const [currentScript, setCurrentScript] = useState<string>('');
  const [currentDuration, setCurrentDuration] = useState<number>(0);
  const [currentVoiceId, setCurrentVoiceId] = useState('hi-IN-MadhurNeural');
  const [currentLanguage, setCurrentLanguage] = useState('hi');
  const [currentSpeechSpeed, setCurrentSpeechSpeed] = useState(0.98);
  const [currentSpeechPitchHz, setCurrentSpeechPitchHz] = useState(0);

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
  const [avatarProfiles, setAvatarProfiles] = useState<AvatarProfileOption[]>([]);
  const [selectedAvatarProfileId, setSelectedAvatarProfileId] = useState('');
  const [sourceVideoUrl, setSourceVideoUrl] = useState('');
  const [activeRenderJobId, setActiveRenderJobId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/avatar/creator', { headers: getAdminAuthHeaders() })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Could not load consented avatar profiles.');
        }
        const profiles = (data.profiles || []).filter(
          (profile: AvatarProfileOption) => profile.consent_record_id,
        );
        if (active) {
          setAvatarProfiles(profiles);
          setSelectedAvatarProfileId(profiles[0]?.id || '');
        }
      })
      .catch((error) => {
        if (active) setVideoError(error instanceof Error ? error.message : 'Could not load avatar profiles.');
      });
    return () => {
      active = false;
    };
  }, []);

  // Callback when audio is synthesized
  const handleAudioSynthesized = (data: {
    audioUrl: string;
    durationSeconds: number;
    visemeFrames: VisemeFrame[];
    voiceId: string;
    language: string;
    script: string;
    speed: number;
    pitchHz: number;
  }) => {
    setAudioUrl(data.audioUrl);
    setVisemeFrames(data.visemeFrames);
    setCurrentScript(data.script);
    setCurrentDuration(data.durationSeconds);
    setCurrentVoiceId(data.voiceId);
    setCurrentLanguage(data.language);
    setCurrentSpeechSpeed(data.speed);
    setCurrentSpeechPitchHz(data.pitchHz);
  };

  // Queue a consent-checked render and wait for the external GPU worker.
  const handleRenderInhouseVideo = async () => {
    if (!currentScript.trim()) {
      alert('Please enter a script text and click Synthesize Voice Audio first.');
      return;
    }
    if (!selectedAvatarProfileId) {
      setVideoError('Create or select a consented avatar profile before rendering.');
      return;
    }

    setIsRenderingVideo(true);
    setRenderProgress(10);
    setVideoError(null);
    setRenderedVideoUrl(null);

    try {
      const res = await fetch('/api/avatar/inhouse/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminAuthHeaders() },
        body: JSON.stringify({
          script: currentScript.trim(),
          avatarProfileId: selectedAvatarProfileId,
          sourceVideoUrl: sourceVideoUrl.trim(),
          voiceId: currentVoiceId,
          language: currentLanguage,
          speed: currentSpeechSpeed,
          pitchHz: currentSpeechPitchHz,
          backgroundId: selectedBgId,
          clothingId: selectedClothId,
          posture,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to queue the in-house video render.');
      }
      if (!data.job?.id) throw new Error('Render API did not return a job ID.');
      setActiveRenderJobId(data.job.id);
      setRenderProgress(data.job.progressPercent || 40);

      for (let attempt = 0; attempt < 120; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        const statusResponse = await fetch(
          `/api/avatar/inhouse/video?jobId=${encodeURIComponent(data.job.id)}`,
          { headers: getAdminAuthHeaders() },
        );
        const statusData = await statusResponse.json();
        if (!statusResponse.ok || !statusData.success) {
          throw new Error(statusData.error || 'Unable to check GPU render status.');
        }
        const job = statusData.job;
        setRenderProgress(job.progressPercent || 40);
        if (job.status === 'completed' && job.videoUrl) {
          setRenderedVideoUrl(job.videoUrl);
          setRenderProgress(100);
          setActiveStageMode('2d_video');
          return;
        }
        if (job.status === 'failed') {
          setActiveRenderJobId(null);
          throw new Error(job.errorMessage || 'GPU worker could not render this video.');
        }
      }
      throw new Error(`Render job ${data.job.id} is still queued. Use “Check job status” to refresh it.`);
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : 'Error occurred while rendering video.');
    } finally {
      setIsRenderingVideo(false);
    }
  };

  const handleCheckRenderStatus = async () => {
    if (!activeRenderJobId) return;
    setIsRenderingVideo(true);
    setVideoError(null);
    try {
      const response = await fetch(
        `/api/avatar/inhouse/video?jobId=${encodeURIComponent(activeRenderJobId)}`,
        { headers: getAdminAuthHeaders() },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Unable to check GPU render status.');
      }
      const job = data.job;
      setRenderProgress(job.progressPercent || 40);
      if (job.status === 'completed' && job.videoUrl) {
        setRenderedVideoUrl(job.videoUrl);
        setRenderProgress(100);
        setActiveStageMode('2d_video');
      } else if (job.status === 'failed') {
        setActiveRenderJobId(null);
        throw new Error(job.errorMessage || 'GPU worker could not render this video.');
      } else {
        setVideoError(`Render job ${job.id} is ${job.status.replaceAll('_', ' ')}. Check again later.`);
      }
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : 'Unable to check GPU render status.');
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
                GPU worker render queue
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Browser-based 3D preview, approximate speech cues, and a consent-checked queue for the external GPU renderer.
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
                  GPU worker output (Bunny CDN; quality not independently verified)
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
                  Static layout preview only • {activeBg.name}
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
                <h4 className="text-xs font-bold text-slate-200">GPU Avatar Render</h4>
                <p className="text-[11px] text-slate-400">
                  The GPU renderer requires authorized, continuous source footage; the portrait preview is not used as a video substitute.
                </p>
              </div>

              <button
                onClick={handleRenderInhouseVideo}
                disabled={isRenderingVideo || !selectedAvatarProfileId || !sourceVideoUrl.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
              >
                {isRenderingVideo ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    GPU Render ({renderProgress}%)...
                  </>
                ) : (
                  <>
                    <Video className="w-3.5 h-3.5 fill-current" />
                    Queue GPU Render
                  </>
                )}
              </button>
              {activeRenderJobId && !renderedVideoUrl && (
                <button
                  onClick={handleCheckRenderStatus}
                  disabled={isRenderingVideo}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 text-xs font-bold disabled:opacity-50"
                >
                  Check job status
                </button>
              )}
            </div>
          )}

          {activeStageMode === '2d_video' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Consented avatar identity
                <select
                  value={selectedAvatarProfileId}
                  onChange={(event) => setSelectedAvatarProfileId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  disabled={isRenderingVideo}
                >
                  <option value="">Select an avatar profile</option>
                  {avatarProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-300">
                Authorized source footage (Bunny MP4 URL)
                <input
                  type="url"
                  value={sourceVideoUrl}
                  onChange={(event) => setSourceVideoUrl(event.target.value)}
                  placeholder="https://swaryogacrm.b-cdn.net/…/authorized-source.mp4"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  disabled={isRenderingVideo}
                  autoComplete="url"
                />
              </label>
              <p className="text-xs text-slate-400">
                Use continuous real footage of the consented avatar. Still images and the synthetic sample clips do not meet the render acceptance criteria.
              </p>
              {!avatarProfiles.length && (
                <p className="text-xs text-amber-300">
                  No consented profiles found. Create one in the Phase 1 Avatar Creator first.
                </p>
              )}
              {videoError && <p role="alert" className="text-xs text-red-300">{videoError}</p>}
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
