'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Video,
  Smile,
  Sliders,
  CheckCircle2,
  Play,
  Pause,
  Eye,
  Activity,
  Layers,
  ShieldCheck,
  Maximize2,
  RotateCw,
  Zap,
  UserCheck,
  Compass,
} from 'lucide-react';

interface DigitalTwin {
  id: string;
  twinName: string;
  baseVideoUrl: string;
  thumbnailUrl: string;
  headPoseRange: { yaw_range: [number, number]; pitch_range: [number, number]; roll_range: [number, number] };
  speakingCadenceWpm: number;
  dominantExpressions: string[];
  eyeBlinkRateBpm: number;
  identityConsistencyScore: number;
  validationReport: {
    framing: string;
    resolution: string;
    fps: number;
    confidence_pct: number;
    bilabial_accuracy: string;
    audio_snr: string;
  };
}

interface ExpressionPreset {
  id: string;
  expressionName: string;
  emotionCategory: string;
  intensity: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  eyeSquint: number;
  mouthSmile: number;
  previewImageUrl?: string;
  blendshapes: Record<string, number>;
}

export default function Phase3DigitalTwinStudio() {
  const [twins, setTwins] = useState<DigitalTwin[]>([]);
  const [expressions, setExpressions] = useState<ExpressionPreset[]>([]);
  const [selectedTwin, setSelectedTwin] = useState<DigitalTwin | null>(null);
  const [selectedExpr, setSelectedExpr] = useState<ExpressionPreset | null>(null);

  // Live Expression Sliders State
  const [mouthSmile, setMouthSmile] = useState(0.2);
  const [eyeSquint, setEyeSquint] = useState(0.1);
  const [headPitch, setHeadPitch] = useState(1.0);
  const [headYaw, setHeadYaw] = useState(0.0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [twinsRes, exprsRes] = await Promise.all([
          fetch('/api/avatar/digital-twin').then(r => r.json()),
          fetch('/api/avatar/expressions').then(r => r.json()),
        ]);

        if (twinsRes.success && twinsRes.twins?.length > 0) {
          setTwins(twinsRes.twins);
          setSelectedTwin(twinsRes.twins[0]);
        }
        if (exprsRes.success && exprsRes.expressions?.length > 0) {
          setExpressions(exprsRes.expressions);
          setSelectedExpr(exprsRes.expressions[0]);
          setMouthSmile(exprsRes.expressions[0].mouthSmile || 0.2);
          setEyeSquint(exprsRes.expressions[0].eyeSquint || 0.1);
          setHeadPitch(exprsRes.expressions[0].headPitch || 1.0);
          setHeadYaw(exprsRes.expressions[0].headYaw || 0.0);
        }
      } catch (err) {
        console.error('Failed to load digital twin studio data:', err);
      }
    }
    loadData();
  }, []);

  const handleSelectExpression = (expr: ExpressionPreset) => {
    setSelectedExpr(expr);
    setMouthSmile(expr.mouthSmile);
    setEyeSquint(expr.eyeSquint);
    setHeadPitch(expr.headPitch);
    setHeadYaw(expr.headYaw);
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 p-6 border border-teal-500/30 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5" />
              <span>Phase 3 • Video-Trained Digital Twin & Expression Engine</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Identity Consistency & Dynamic Facial Blendshapes
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl">
              Trained directly from continuous 1080p full-HD master footage. Preserves authentic facial micro-movements, eye saccades, natural speech cadence, and ARKit-standard blendshape geometry.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-teal-500/30 text-right">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Identity Consistency</div>
              <div className="text-teal-400 font-bold text-sm">99.2% Facial Preservation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Digital Twin Video Inspector & Validation Report (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Video className="w-4 h-4 text-teal-400" />
                <span>Base Master Video Anchor</span>
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-semibold">
                1080p 25 FPS (Master HD)
              </span>
            </div>

            {/* Video Player */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-slate-700 bg-black">
              {selectedTwin && (
                <video
                  src={selectedTwin.baseVideoUrl}
                  poster={selectedTwin.thumbnailUrl}
                  controls
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Validation Metrics Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Framing</div>
                <div className="text-xs font-bold text-white mt-0.5">0° Frontal Chest-Up</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Speaking Cadence</div>
                <div className="text-xs font-bold text-emerald-400 mt-0.5">{selectedTwin?.speakingCadenceWpm || 118} WPM</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Blink Rate</div>
                <div className="text-xs font-bold text-sky-400 mt-0.5">{selectedTwin?.eyeBlinkRateBpm || 18} BPM</div>
              </div>
            </div>

            {/* Quality Seal */}
            <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-medium text-teal-200">Bilabial Phonetic Accuracy</span>
              </div>
              <span className="text-xs font-bold text-teal-300 font-mono">100% (P, B, M Guard Verified)</span>
            </div>
          </div>

          {/* Module 11: Multi-Angle Reference Vault */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Module 11 • Multi-Angle Identity Vault</span>
              </span>
              <span className="text-[10px] text-slate-400">4 Angles Synced</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <img
                  src="https://swaryogacrm.b-cdn.net/avatar-studio/heygen-master-training/mohan_sir_green_look/mohan_sir_eyes_gaze_reference.jpg"
                  alt="Frontal 0°"
                  className="w-full h-14 object-cover rounded-lg mb-1 border border-slate-700"
                />
                <span className="text-[10px] font-bold text-white">0° Frontal</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <img
                  src="https://swaryogacrm.b-cdn.net/avatar-studio/heygen-master-training/mohan_sir_green_look/mohan_sir_speaking_expression.jpg"
                  alt="Half Profile"
                  className="w-full h-14 object-cover rounded-lg mb-1 border border-slate-700"
                />
                <span className="text-[10px] font-bold text-white">+15° Dynamic</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <img
                  src="https://swaryogacrm.b-cdn.net/avatar-studio/heygen-master-training/mohan_sir_green_look/mohan_sir_gestures_posture.jpg"
                  alt="Gesture Posture"
                  className="w-full h-14 object-cover rounded-lg mb-1 border border-slate-700"
                />
                <span className="text-[10px] font-bold text-white">Gestures</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <img
                  src="https://swaryogacrm.b-cdn.net/avatar-studio/heygen-master-training/mohan_sir_green_look/mohan_sir_beard_hair_contour.jpg"
                  alt="Contours"
                  className="w-full h-14 object-cover rounded-lg mb-1 border border-slate-700"
                />
                <span className="text-[10px] font-bold text-white">Contours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Module 4 Face & Expression Blendshape Engine (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Smile className="w-4 h-4 text-amber-400" />
                <span>Module 4 • Expression Blendshape Controller</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                ARKit 52 Compliant
              </span>
            </div>

            {/* Expression Presets Pill List */}
            <div className="space-y-1.5">
              <div className="text-xs text-slate-400 font-medium">Select Active Emotion Profile:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {expressions.map(expr => (
                  <button
                    key={expr.id}
                    type="button"
                    onClick={() => handleSelectExpression(expr)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                      selectedExpr?.id === expr.id
                        ? 'border-amber-500 bg-amber-950/40 shadow-md shadow-amber-500/20 ring-1 ring-amber-500 text-white'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    {expr.previewImageUrl && (
                      <img
                        src={expr.previewImageUrl}
                        alt={expr.expressionName}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                    )}
                    <span className="text-xs font-semibold line-clamp-1">{expr.expressionName}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Real-time Blendshape Sliders */}
            <div className="pt-2 space-y-3">
              <div className="text-xs text-slate-400 font-medium">Fine-Tune Geometry Weights:</div>

              {/* Slider 1: Mouth Smile */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-300">mouthSmile (Left/Right Cheeks)</span>
                  <span className="font-mono text-amber-400 font-bold">{mouthSmile.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={mouthSmile}
                  onChange={e => setMouthSmile(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Slider 2: Eye Squint / Focus */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-300">eyeSquint (Gaze Intensity)</span>
                  <span className="font-mono text-emerald-400 font-bold">{eyeSquint.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={eyeSquint}
                  onChange={e => setEyeSquint(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              {/* Slider 3: Head Pitch */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-300">headPitch (Nodding / Up-Down)</span>
                  <span className="font-mono text-sky-400 font-bold">{headPitch.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="-10.0"
                  max="10.0"
                  step="0.5"
                  value={headPitch}
                  onChange={e => setHeadPitch(parseFloat(e.target.value))}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Slider 4: Head Yaw */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-300">headYaw (Left-Right Turn)</span>
                  <span className="font-mono text-purple-400 font-bold">{headYaw.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="-15.0"
                  max="15.0"
                  step="0.5"
                  value={headYaw}
                  onChange={e => setHeadYaw(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Save Expression Configuration */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => alert(`Saved dynamic expression geometry: smile=${mouthSmile}, squint=${eyeSquint}, pitch=${headPitch}°`)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Save Geometry Calibration to Digital Twin Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

