'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Box,
  Layers,
  Sliders,
  Compass,
  CheckCircle2,
  Download,
  ShieldCheck,
  Maximize2,
  Zap,
  Activity,
  User,
  Heart,
  Film,
} from 'lucide-react';

interface BodyModel {
  id: string;
  name: string;
  anthropometrics: {
    heightM: number;
    weightKg: number;
    shoulderWidthM: number;
    chestCircM: number;
    waistCircM: number;
    hipsCircM: number;
  };
  rigType: string;
  boneCount: number;
  meshGlbUrl?: string;
  frontViewUrl?: string;
  riggingStatus: string;
}

interface MotionProfile {
  id: string;
  motionName: string;
  motionCategory: string;
  loopable: boolean;
  durationSeconds: number;
  fps: number;
  keyframeCount: number;
  description?: string;
}

export default function Phase4FullBody3DStudio() {
  const [bodies, setBodies] = useState<BodyModel[]>([]);
  const [motions, setMotions] = useState<MotionProfile[]>([]);
  const [selectedBody, setSelectedBody] = useState<BodyModel | null>(null);
  const [selectedMotion, setSelectedMotion] = useState<MotionProfile | null>(null);

  // Dynamic Anthropometric Sliders (calibrated to Mohan Sir: 167.6cm, 80kg)
  const [heightCm, setHeightCm] = useState(167.6);
  const [weightKg, setWeightKg] = useState(80.0);
  const [shoulderCm, setShoulderCm] = useState(47.0);
  const [chestCm, setChestCm] = useState(96.5);
  const [waistCm, setWaistCm] = useState(81.3);

  // View Angle & Animation Playback State
  const [viewAngle, setViewAngle] = useState<'front' | 'left' | 'back' | 'right'>('front');
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [bodiesRes, motionsRes] = await Promise.all([
          fetch('/api/avatar/3d-body').then(r => r.json()),
          fetch('/api/avatar/motion').then(r => r.json()),
        ]);

        if (bodiesRes.success && bodiesRes.bodies?.length > 0) {
          setBodies(bodiesRes.bodies);
          setSelectedBody(bodiesRes.bodies[0]);
          const a = bodiesRes.bodies[0].anthropometrics;
          setHeightCm(Math.round(a.heightM * 1000) / 10);
          setWeightKg(a.weightKg);
          setShoulderCm(Math.round(a.shoulderWidthM * 1000) / 10);
          setChestCm(Math.round(a.chestCircM * 1000) / 10);
          setWaistCm(Math.round(a.waistCircM * 1000) / 10);
        }

        if (motionsRes.success && motionsRes.motions?.length > 0) {
          setMotions(motionsRes.motions);
          setSelectedMotion(motionsRes.motions[0]);
        }
      } catch (err) {
        console.error('Failed to load 3D studio data:', err);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 p-6 border border-purple-500/30 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-bold uppercase tracking-wider">
              <Box className="w-3.5 h-3.5" />
              <span>Phase 4 • Body model & motion profile records</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              3D Rigging and Motion Runtime Status
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              This studio stores anthropometric and motion metadata. Mesh generation, Blender rigging, GLB validation, and motion playback are not connected.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-purple-500/30 text-right">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Armature Spec</div>
              <div className="text-purple-400 font-bold text-sm">Rig status: {selectedBody?.riggingStatus || 'not generated'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: illustrative reference preview (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-purple-400" />
                <span>Reference image (not a 3D mesh viewport)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSkeleton(!showSkeleton)}
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold transition border ${
                    showSkeleton
                      ? 'bg-purple-500 text-slate-950 border-purple-400'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {showSkeleton ? 'Illustration visible' : 'Show illustrative overlay'}
                </button>
              </div>
            </div>

            {/* Reference image preview, not a rendered 3D viewport. */}
            <div className="relative w-full h-96 rounded-xl overflow-hidden border border-slate-700 bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center">
              {/* Studio Grid Plane */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:16px_16px]" />

              {/* Static master reference image. */}
              <div className="relative z-10 flex flex-col items-center">
                <img
                  src="https://swaryogacrm.b-cdn.net/avatar-studio/heygen-master-training/mohan_sir_green_look/mohan_sir_gestures_posture.jpg"
                  alt="Static avatar reference"
                  className={`max-h-72 object-contain rounded-2xl drop-shadow-[0_20px_35px_rgba(168,85,247,0.35)] transition-all duration-500 ${
                    viewAngle === 'left' ? 'scale-x-[-1] -rotate-3' : viewAngle === 'back' ? 'brightness-50 grayscale' : viewAngle === 'right' ? 'rotate-3' : ''
                  }`}
                />

                {/* Skeleton Wireframe Overlay */}
                {showSkeleton && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-64 border-2 border-emerald-400/80 rounded-full animate-pulse border-dashed flex flex-col justify-around items-center p-4">
                      <div className="w-12 h-12 border-2 border-amber-400 rounded-full" />
                      <div className="w-1 h-24 bg-sky-400" />
                      <div className="w-32 h-1 bg-emerald-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* Angle View Selector HUD */}
              <div className="absolute top-3 left-3 flex gap-1.5 z-20">
                {(['front', 'left', 'back', 'right'] as const).map(angle => (
                  <button
                    key={angle}
                    type="button"
                    onClick={() => setViewAngle(angle)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                      viewAngle === angle
                        ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/30'
                        : 'bg-slate-950/80 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {angle}
                  </button>
                ))}
              </div>

              {/* Stored motion profile metadata; no motion asset is played here. */}
              <div className="absolute bottom-3 left-3 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-xl z-20 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-bold text-white">{selectedMotion?.motionName || 'No motion profile selected'}</span>
              </div>

              <div className="absolute bottom-3 right-3 bg-slate-950/90 border border-slate-800 px-3 py-1.5 rounded-xl text-[10px] text-slate-400 z-20">
                Motion playback not connected
              </div>
            </div>

            {/* Export GLB & 3D Assets Button */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <a
                href="/avatar-studio/3d-digital-twin/mohan_master_character.glb"
                download="mohan_sir_master_character.glb"
                className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-md shadow-purple-600/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Download stored GLB sample (validation not recorded)</span>
              </a>
              <a
                href="/avatar-studio/3d-digital-twin/renders/mohan_sir_3d_acceptance_1080p.mp4"
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 font-bold text-xs transition border border-purple-500/30 flex items-center justify-center gap-2"
              >
                <Film className="w-4 h-4" />
                <span>Stored sample video (not acceptance-certified)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Module 3 Anthropometrics & Module 7 Motion Engine (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Module 3 Anthropometric Sliders */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" />
                <span>Module 3 • Anthropometric Calibration</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                Calibrated to 5&apos;6&quot; (167.6 cm)
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Slider: Height */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-300">Height (उंची)</span>
                  <span className="font-mono text-purple-400 font-bold">{heightCm.toFixed(1)} cm</span>
                </div>
                <input
                  type="range"
                  min="150.0"
                  max="195.0"
                  step="0.5"
                  value={heightCm}
                  onChange={e => setHeightCm(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Slider: Shoulder Width */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-300">Shoulder Width (खांद्याची रुंदी)</span>
                  <span className="font-mono text-purple-400 font-bold">{shoulderCm.toFixed(1)} cm (18.5 in)</span>
                </div>
                <input
                  type="range"
                  min="38.0"
                  max="58.0"
                  step="0.5"
                  value={shoulderCm}
                  onChange={e => setShoulderCm(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Slider: Chest Circumference */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-300">Chest Circumference (छातीचा घेर)</span>
                  <span className="font-mono text-purple-400 font-bold">{chestCm.toFixed(1)} cm (38 in)</span>
                </div>
                <input
                  type="range"
                  min="75.0"
                  max="125.0"
                  step="0.5"
                  value={chestCm}
                  onChange={e => setChestCm(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Slider: Waist Circumference */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-300">Waist Circumference (कमरेचा घेर)</span>
                  <span className="font-mono text-purple-400 font-bold">{waistCm.toFixed(1)} cm (32 in)</span>
                </div>
                <input
                  type="range"
                  min="65.0"
                  max="115.0"
                  step="0.5"
                  value={waistCm}
                  onChange={e => setWaistCm(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Module 7 Body Motion & Yogic Gestures Selector */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Module 7 • Motion & Yogic Mudra Library</span>
              </h3>
              <span className="text-[10px] text-slate-400">{motions.length} stored profiles • motion assets unverified</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {motions.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMotion(m)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col ${
                    selectedMotion?.id === m.id
                      ? 'border-emerald-500 bg-emerald-950/40 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500'
                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-white">{m.motionName}</div>
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{m.description}</div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 mt-2">
                    <span>{m.durationSeconds}s loop</span>
                    <span>{m.keyframeCount} frames</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
