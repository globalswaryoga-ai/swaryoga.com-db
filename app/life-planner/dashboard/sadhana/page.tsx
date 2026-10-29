'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Flag,
  Volume2,
  VolumeX,
  Bell,
  Sparkles,
  ArrowLeft,
  Flame,
  Award,
  CircleDot,
  Heart,
  Wind,
} from 'lucide-react';

// Web Audio API pure harmonic singing bowl / Tibetan bell sound generator (100% offline, no external assets needed)
function playTibetanBowl(type: 'start' | 'interval' | 'finish' = 'interval') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const baseFreq = type === 'start' ? 432 : type === 'finish' ? 528 : 396; // Solfeggio / Vedic healing frequencies

    // Create dual oscillators for warm acoustic shimmer
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 1.5, now); // Perfect fifth harmonic

    // Gentle strike and long singing bell decay
    const duration = type === 'finish' ? 4.5 : 3.0;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
  } catch (e) {
    console.error('Audio chime error:', e);
  }
}

export default function SadhanaToolsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'timer';
  const [activeTab, setActiveTab] = useState<'stopwatch' | 'timer' | 'meditation' | 'samyama'>(initialTab);

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['stopwatch', 'timer', 'meditation', 'samyama'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  // Keep screen awake during meditation/sadhana using Screen WakeLock API
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (_) {}
    };
    requestWakeLock();
    return () => {
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/life-planner/dashboard"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              🧘‍♂️ Sadhana Tools
            </h1>
            <p className="text-xs sm:text-sm text-slate-600">Yogic Timer, Kumbhaka Stopwatch &amp; Samyama</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-2 p-1.5 bg-slate-100 rounded-2xl">
        <button
          onClick={() => { setActiveTab('timer'); router.replace('/life-planner/dashboard/sadhana?tab=timer'); }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
            activeTab === 'timer' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Timer className="w-4 h-4" />
          <span>Timer</span>
        </button>
        <button
          onClick={() => { setActiveTab('stopwatch'); router.replace('/life-planner/dashboard/sadhana?tab=stopwatch'); }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
            activeTab === 'stopwatch' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Stopwatch</span>
        </button>
        <button
          onClick={() => { setActiveTab('meditation'); router.replace('/life-planner/dashboard/sadhana?tab=meditation'); }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
            activeTab === 'meditation' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Meditation</span>
        </button>
        <button
          onClick={() => { setActiveTab('samyama'); router.replace('/life-planner/dashboard/sadhana?tab=samyama'); }}
          className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 ${
            activeTab === 'samyama' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>Samyama</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'timer' && <YogicTimerPanel />}
      {activeTab === 'stopwatch' && <KumbhakaStopwatchPanel />}
      {activeTab === 'meditation' && <MeditationPanel />}
      {activeTab === 'samyama' && <SamyamaPanel />}
    </div>
  );
}

// ==========================================
// 1. Yogic Pranayama & Meditation Timer
// ==========================================
function YogicTimerPanel() {
  const PRESETS = [
    { label: '3 min', sec: 3 * 60, title: 'Quick Swar Balance' },
    { label: '5 min', sec: 5 * 60, title: 'Pranayama Start' },
    { label: '11 min', sec: 11 * 60, title: 'Yogic Alignment' },
    { label: '21 min', sec: 21 * 60, title: 'Deep Dhyana' },
    { label: '31 min', sec: 31 * 60, title: 'Chakra Sadhana' },
    { label: '48 min', sec: 48 * 60, title: '1 Muhurta' },
  ];

  const [totalSeconds, setTotalSeconds] = useState(11 * 60);
  const [secondsLeft, setSecondsLeft] = useState(11 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [completedSessions, setCompletedSessions] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (soundEnabled) playTibetanBowl('finish');
            setCompletedSessions((c) => c + 1);
            return 0;
          }
          // Chime at 5-minute intervals
          if (soundEnabled && prev % 300 === 0 && prev !== totalSeconds) {
            playTibetanBowl('interval');
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, soundEnabled, totalSeconds]);

  const selectPreset = (sec: number) => {
    setIsRunning(false);
    setTotalSeconds(sec);
    setSecondsLeft(sec);
  };

  const toggleRun = () => {
    if (!isRunning && secondsLeft === 0) {
      setSecondsLeft(totalSeconds);
    }
    if (!isRunning && soundEnabled) {
      playTibetanBowl('start');
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(totalSeconds);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const progressPct = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
          Pranayama &amp; Dhyana
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">Yogic Meditation Timer</h2>
        <p className="text-xs sm:text-sm text-slate-500">Includes gentle Tibetan singing bowl chimes at start and finish</p>
      </div>

      {/* Circular Progress & Clock */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              className="text-slate-100 stroke-current"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              className="text-orange-500 stroke-current transition-all duration-1000 ease-linear"
              strokeWidth="10"
              strokeDasharray="283"
              strokeDashoffset={283 - (283 * progressPct) / 100}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight font-mono">
              {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </span>
            <span className="text-xs font-semibold text-slate-400 mt-2">
              {isRunning ? '✨ Deep Focus' : secondsLeft === 0 ? '🎉 Complete' : 'Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={resetTimer}
          className="p-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition"
          title="Reset"
        >
          <RotateCcw className="w-6 h-6" />
        </button>

        <button
          onClick={toggleRun}
          className={`px-8 py-4 rounded-2xl font-black text-lg text-white shadow-lg active:scale-95 transition flex items-center gap-2 ${
            isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:opacity-95'
          }`}
        >
          {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          <span>{isRunning ? 'Pause' : secondsLeft === 0 ? 'Restart' : 'Start'}</span>
        </button>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-4 rounded-2xl transition active:scale-95 ${
            soundEnabled ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
          }`}
          title={soundEnabled ? 'Chime sound enabled' : 'Chime muted'}
        >
          {soundEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
        </button>
      </div>

      {/* Presets Grid */}
      <div className="space-y-3 pt-4 border-t border-slate-100">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center">Select Duration</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {PRESETS.map((p) => {
            const isSelected = totalSeconds === p.sec;
            return (
              <button
                key={p.sec}
                onClick={() => selectPreset(p.sec)}
                className={`py-3 px-2 rounded-2xl border text-center transition active:scale-95 flex flex-col items-center justify-center ${
                  isSelected
                    ? 'border-orange-500 bg-orange-50 text-orange-700 font-black shadow-sm'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-sm font-bold">{p.label}</span>
                <span className="text-[10px] text-slate-500 truncate max-w-full">{p.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. Kumbhaka Breath Retention Stopwatch
// ==========================================
function KumbhakaStopwatchPanel() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<{ id: number; timeMs: number; phase: string }[]>([]);
  const [bestTimeMs, setBestTimeMs] = useState(0);
  const [phase, setPhase] = useState<'Antar Kumbhaka' | 'Bahya Kumbhaka' | 'Free Practice'>('Antar Kumbhaka');
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const saved = localStorage.getItem('swar_kumbhaka_best');
    if (saved) setBestTimeMs(Number(saved));
  }, []);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - elapsedMs;
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current);
      }, 30);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  const toggleRun = () => {
    if (!isRunning) {
      setIsRunning(true);
    } else {
      setIsRunning(false);
      // Check personal best
      if (elapsedMs > bestTimeMs) {
        setBestTimeMs(elapsedMs);
        localStorage.setItem('swar_kumbhaka_best', String(elapsedMs));
      }
    }
  };

  const recordLap = () => {
    if (elapsedMs > 0) {
      setLaps([{ id: laps.length + 1, timeMs: elapsedMs, phase }, ...laps]);
    }
  };

  const reset = () => {
    setIsRunning(false);
    setElapsedMs(0);
  };

  const fmtTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const centis = Math.floor((ms % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
      <div className="text-center space-y-1">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
          Breath Retention
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">Kumbhaka Stopwatch</h2>
        <p className="text-xs sm:text-sm text-slate-500">Track and expand your lung capacity &amp; breath-hold duration</p>
      </div>

      {/* Phase Selector */}
      <div className="flex justify-center gap-2">
        {(['Antar Kumbhaka', 'Bahya Kumbhaka', 'Free Practice'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPhase(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              phase === p ? 'bg-emerald-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p === 'Antar Kumbhaka' ? '🫁 Inhale Hold' : p === 'Bahya Kumbhaka' ? '🌬️ Exhale Hold' : '⏱️ Free'}
          </button>
        ))}
      </div>

      {/* Main Display */}
      <div className="text-center py-6 bg-gradient-to-b from-emerald-50/50 to-white rounded-3xl border border-emerald-100">
        <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1">{phase}</p>
        <div className="text-5xl sm:text-7xl font-mono font-black text-slate-900 tracking-tight">
          {fmtTime(elapsedMs)}
        </div>
        {bestTimeMs > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
            <Award className="w-3.5 h-3.5" />
            <span>Personal Best: {fmtTime(bestTimeMs)}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="p-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition"
        >
          <RotateCcw className="w-6 h-6" />
        </button>

        <button
          onClick={toggleRun}
          className={`px-8 py-4 rounded-2xl font-black text-lg text-white shadow-lg active:scale-95 transition flex items-center gap-2 ${
            isRunning ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-700 hover:bg-emerald-800'
          }`}
        >
          {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          <span>{isRunning ? 'Stop Hold' : 'Start Hold'}</span>
        </button>

        <button
          onClick={recordLap}
          disabled={elapsedMs === 0}
          className="p-4 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 active:scale-95 transition"
        >
          <Flag className="w-6 h-6" />
        </button>
      </div>

      {/* Laps List */}
      {laps.length > 0 && (
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Session Laps</p>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {laps.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-xl text-sm font-semibold">
                <span className="text-slate-500 font-mono">Round {l.id} ({l.phase})</span>
                <span className="font-mono text-emerald-800 font-bold">{fmtTime(l.timeMs)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 3. Guided Meditation Audio & Sessions
// ==========================================
function MeditationPanel() {
  const SESSIONS = [
    {
      title: 'Chandra Swar Cooling Dhyana',
      desc: 'Activate IDA nadi for calmness, stress relief, and deep restorative sleep.',
      swar: 'Chandra (Left)',
      duration: '15 min',
      color: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Surya Swar Prana Awakening',
      desc: 'Activate PINGALA nadi for vitality, confidence, digestion, and clear focus.',
      swar: 'Surya (Right)',
      duration: '15 min',
      color: 'from-orange-500 to-amber-600',
    },
    {
      title: 'Sushumna Samadhi Meditation',
      desc: 'Harmonize both nadis at Sandhya twilight for spiritual enlightenment.',
      swar: 'Sushumna (Center)',
      duration: '21 min',
      color: 'from-purple-500 to-violet-600',
    },
    {
      title: 'Gayatri Mahamantra Resonance',
      desc: '108-cycle rhythmic mantra meditation for mental clarity and divine vibration.',
      swar: 'All Swars',
      duration: '11 min',
      color: 'from-emerald-600 to-teal-700',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-[#0b3d2e] to-[#2A5654] text-white p-6 rounded-3xl shadow-sm">
        <h2 className="text-xl sm:text-2xl font-black">🧘 Guided Swar Dhyana</h2>
        <p className="text-xs sm:text-sm text-white/80 mt-1">
          Tune your meditation to your currently flowing nostril for 10x deeper peace.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {SESSIONS.map((s, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-slate-500">{s.swar}</span>
                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">{s.duration}</span>
              </div>
              <h3 className="text-base font-black text-slate-900">{s.title}</h3>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{s.desc}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/sadhana/live"
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                Join Live Sadhana Room →
              </Link>
              <button
                onClick={() => playTibetanBowl('start')}
                className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition active:scale-95"
                title="Play bowl chime"
              >
                <Bell className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// 4. Samyama (Dharana, Dhyana, Samadhi)
// ==========================================
function SamyamaPanel() {
  const [stage, setStage] = useState<'Dharana (Concentration)' | 'Dhyana (Meditation)' | 'Samadhi (Absorption)'>('Dharana (Concentration)');
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((p) => !p);
    }, 4000); // 4-second breathing pace
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 text-center">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-widest text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
          Patanjali Yoga Sutras
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900">Samyama Focus Visualizer</h2>
        <p className="text-xs sm:text-sm text-slate-500">Unbroken single-pointed concentration on the Ajna Third Eye</p>
      </div>

      {/* 3 Stages */}
      <div className="flex justify-center gap-2">
        {(['Dharana (Concentration)', 'Dhyana (Meditation)', 'Samadhi (Absorption)'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              stage === s ? 'bg-purple-700 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Tratak Breathing Visualizer Point */}
      <div className="py-12 flex flex-col items-center justify-center">
        <div
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-[4000ms] ease-in-out ${
            pulse
              ? 'scale-125 bg-purple-200 shadow-[0_0_50px_rgba(168,85,247,0.5)]'
              : 'scale-90 bg-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 shadow-inner flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white shadow" />
          </div>
        </div>
        <p className="mt-6 text-xs font-mono font-bold tracking-wider text-purple-800">
          {pulse ? 'INHALE / EXPAND (4s)' : 'EXHALE / CENTER (4s)'}
        </p>
      </div>

      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
        Fix your gaze on the center white bindu. Let your breath synchronize with the expansion and contraction.
      </p>
    </div>
  );
}
