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
  Plus,
  Check,
  Trash2,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import { lifePlannerStorage } from '@/lib/lifePlannerMongoStorage';

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
  const tabParam = searchParams.get('tab');
  const initialTab =
    tabParam && ['sadhana-page', 'stopwatch', 'timer', 'meditation', 'samyama'].includes(tabParam)
      ? (tabParam as any)
      : 'sadhana-page';
  const [activeTab, setActiveTab] = useState<'sadhana-page' | 'stopwatch' | 'timer' | 'meditation' | 'samyama'>(initialTab);

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['sadhana-page', 'stopwatch', 'timer', 'meditation', 'samyama'].includes(tab)) {
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
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-12">
      {/* Android Top App Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/life-planner/dashboard"
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 transition flex items-center justify-center text-slate-700 shrink-0"
            title="Back to Launchpad"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight truncate flex items-center gap-1.5">
              <span>🧘‍♂️</span>
              <span>My Sadhana Hub</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              Daily Sadhana Routine, Yogic Timer, Kumbhaka Stopwatch &amp; Samyama
            </p>
          </div>
        </div>

        {/* Quick Launchpad Return Button */}
        <Link
          href="/life-planner/dashboard"
          className="px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-900 text-xs font-bold border border-orange-200/80 transition active:scale-95 shrink-0 self-start sm:self-auto"
        >
          4 Cards Launchpad
        </Link>
      </div>

      {/* Android Material Segment Chips */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => { setActiveTab('sadhana-page'); router.replace('/life-planner/dashboard/sadhana?tab=sadhana-page'); }}
          className={`py-2 px-3 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'sadhana-page' ? 'bg-white text-orange-700 shadow-2xs border border-orange-200/60' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>Sadhana Page</span>
        </button>
        <button
          onClick={() => { setActiveTab('timer'); router.replace('/life-planner/dashboard/sadhana?tab=timer'); }}
          className={`py-2 px-3 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'timer' ? 'bg-white text-orange-700 shadow-2xs border border-orange-200/60' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Timer className="w-3.5 h-3.5 text-orange-600" />
          <span>Singing Bowl Timer</span>
        </button>
        <button
          onClick={() => { setActiveTab('stopwatch'); router.replace('/life-planner/dashboard/sadhana?tab=stopwatch'); }}
          className={`py-2 px-3 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'stopwatch' ? 'bg-white text-orange-700 shadow-2xs border border-orange-200/60' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-orange-600" />
          <span>Kumbhaka Stopwatch</span>
        </button>
        <button
          onClick={() => { setActiveTab('meditation'); router.replace('/life-planner/dashboard/sadhana?tab=meditation'); }}
          className={`py-2 px-3 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'meditation' ? 'bg-white text-orange-700 shadow-2xs border border-orange-200/60' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Play className="w-3.5 h-3.5 text-orange-600" />
          <span>Meditations</span>
        </button>
        <button
          onClick={() => { setActiveTab('samyama'); router.replace('/life-planner/dashboard/sadhana?tab=samyama'); }}
          className={`py-2 px-3 rounded-xl font-bold text-xs whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'samyama' ? 'bg-white text-orange-700 shadow-2xs border border-orange-200/60' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CircleDot className="w-3.5 h-3.5 text-orange-600" />
          <span>Samyama Tratak</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'sadhana-page' && (
        <SadhanaPagePanel
          onSwitchTab={(t) => {
            setActiveTab(t as any);
            router.replace(`/life-planner/dashboard/sadhana?tab=${t}`);
          }}
        />
      )}
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
    <div className="bg-gradient-to-br from-orange-50/40 via-white to-white rounded-2xl border border-orange-200/80 p-4 sm:p-6 shadow-[0_4px_16px_rgba(234,88,12,0.06),0_1px_3px_rgba(0,0,0,0.02)] space-y-6">
      <div className="text-center space-y-1">
        <span className="text-xs font-bold uppercase tracking-widest text-orange-900 bg-orange-100/80 border border-orange-200 px-3 py-0.5 rounded-full shadow-2xs">
          Pranayama &amp; Dhyana
        </span>
        <h2 className="text-base sm:text-lg font-bold text-slate-800">Yogic Meditation Timer</h2>
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
    <div className="bg-gradient-to-br from-emerald-50/40 via-white to-white rounded-2xl border border-emerald-200/80 p-4 sm:p-6 shadow-[0_4px_16px_rgba(5,150,105,0.06),0_1px_3px_rgba(0,0,0,0.02)] space-y-5">
      <div className="text-center space-y-1">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-3 py-0.5 rounded-full shadow-2xs">
          Breath Retention
        </span>
        <h2 className="text-base sm:text-lg font-bold text-slate-800">Kumbhaka Stopwatch</h2>
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
      <div className="bg-gradient-to-r from-[#0b3d2e] to-[#2A5654] text-white p-4 sm:p-5 rounded-2xl shadow-sm">
        <h2 className="text-base sm:text-lg font-bold">🧘 Guided Swar Dhyana</h2>
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
    <div className="bg-gradient-to-br from-purple-50/40 via-white to-white rounded-2xl border border-purple-200/80 p-4 sm:p-6 shadow-[0_4px_16px_rgba(126,58,237,0.06),0_1px_3px_rgba(0,0,0,0.02)] space-y-5 text-center">
      <div className="space-y-1">
        <span className="text-xs font-bold uppercase tracking-widest text-purple-800 bg-purple-100/80 border border-purple-200 px-3 py-0.5 rounded-full shadow-2xs">
          Patanjali Yoga Sutras
        </span>
        <h2 className="text-base sm:text-lg font-bold text-slate-800">Samyama Focus Visualizer</h2>
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

// ==========================================
// 5. Main Sadhana Page Panel (Daily Routine & Log)
// ==========================================
interface SadhanaItem {
  id: string;
  name: string;
  frequency: string;
  duration: string;
  completed: boolean;
}

const DEFAULT_MORNING_SADHANA: SadhanaItem[] = [
  { id: 'm-1', name: 'Pranayama (Nadi Shodhana)', frequency: '2 rounds', duration: '10 mins', completed: false },
  { id: 'm-2', name: 'Kumbhaka Breath Retention', frequency: '3 cycles', duration: '5 mins', completed: false },
  { id: 'm-3', name: 'Swar Dhyana Meditation', frequency: '1 sitting', duration: '15 mins', completed: false },
  { id: 'm-4', name: 'Gayatri / Om Japa', frequency: '108 counts', duration: '11 mins', completed: false },
];

const DEFAULT_EVENING_SADHANA: SadhanaItem[] = [
  { id: 'e-1', name: 'Evening Swar Observation', frequency: 'Check nostril', duration: '3 mins', completed: false },
  { id: 'e-2', name: 'Tratak / Samyama Candle Gaze', frequency: '1 round', duration: '10 mins', completed: false },
  { id: 'e-3', name: 'Shavasana Deep Relaxation', frequency: '1 session', duration: '10 mins', completed: false },
];

function SadhanaPagePanel({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  const getTodayIso = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayIso);
  const [morningList, setMorningList] = useState<SadhanaItem[]>(DEFAULT_MORNING_SADHANA);
  const [eveningList, setEveningList] = useState<SadhanaItem[]>(DEFAULT_EVENING_SADHANA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // New practice input states
  const [morningInput, setMorningInput] = useState({ name: '', frequency: '', duration: '' });
  const [eveningInput, setEveningInput] = useState({ name: '', frequency: '', duration: '' });
  const [showAddMorning, setShowAddMorning] = useState(false);
  const [showAddEvening, setShowAddEvening] = useState(false);

  // Load from Bunny Database for selectedDate
  useEffect(() => {
    let isCancelled = false;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const result = await lifePlannerStorage.getDailyTasks(selectedDate);
        if (isCancelled) return;
        if (result && result.sadhana) {
          if (Array.isArray(result.sadhana.morning) && result.sadhana.morning.length > 0) {
            setMorningList(result.sadhana.morning);
          } else {
            setMorningList(DEFAULT_MORNING_SADHANA);
          }
          if (Array.isArray(result.sadhana.evening) && result.sadhana.evening.length > 0) {
            setEveningList(result.sadhana.evening);
          } else {
            setEveningList(DEFAULT_EVENING_SADHANA);
          }
        } else {
          setMorningList(DEFAULT_MORNING_SADHANA);
          setEveningList(DEFAULT_EVENING_SADHANA);
        }
      } catch (err) {
        console.error('Error loading sadhana data:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };
    loadData();
    return () => {
      isCancelled = true;
    };
  }, [selectedDate]);

  // Save to Bunny Database
  const persistSadhana = async (newMorning: SadhanaItem[], newEvening: SadhanaItem[]) => {
    try {
      await lifePlannerStorage.saveSadhana(selectedDate, {
        morning: newMorning,
        evening: newEvening,
        diet: { waterLiters: 0, dryFruitsBreakfast: null, herbalDrinks: [] },
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error('Error saving sadhana:', err);
    }
  };

  const togglePractice = (section: 'morning' | 'evening', id: string) => {
    if (section === 'morning') {
      const updated = morningList.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      setMorningList(updated);
      persistSadhana(updated, eveningList);
    } else {
      const updated = eveningList.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      );
      setEveningList(updated);
      persistSadhana(morningList, updated);
    }
  };

  const deletePractice = (section: 'morning' | 'evening', id: string) => {
    if (section === 'morning') {
      const updated = morningList.filter((item) => item.id !== id);
      setMorningList(updated);
      persistSadhana(updated, eveningList);
    } else {
      const updated = eveningList.filter((item) => item.id !== id);
      setEveningList(updated);
      persistSadhana(morningList, updated);
    }
  };

  const addPractice = (section: 'morning' | 'evening') => {
    if (section === 'morning') {
      if (!morningInput.name.trim()) return;
      const newItem: SadhanaItem = {
        id: `m-${Date.now()}`,
        name: morningInput.name.trim(),
        frequency: morningInput.frequency.trim() || '1 round',
        duration: morningInput.duration.trim() || '10 mins',
        completed: false,
      };
      const updated = [...morningList, newItem];
      setMorningList(updated);
      persistSadhana(updated, eveningList);
      setMorningInput({ name: '', frequency: '', duration: '' });
      setShowAddMorning(false);
    } else {
      if (!eveningInput.name.trim()) return;
      const newItem: SadhanaItem = {
        id: `e-${Date.now()}`,
        name: eveningInput.name.trim(),
        frequency: eveningInput.frequency.trim() || '1 round',
        duration: eveningInput.duration.trim() || '10 mins',
        completed: false,
      };
      const updated = [...eveningList, newItem];
      setEveningList(updated);
      persistSadhana(morningList, updated);
      setEveningInput({ name: '', frequency: '', duration: '' });
      setShowAddEvening(false);
    }
  };

  const totalCount = morningList.length + eveningList.length;
  const completedCount =
    morningList.filter((p) => p.completed).length + eveningList.filter((p) => p.completed).length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const changeDateBy = (offset: number) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  const isToday = selectedDate === getTodayIso();

  return (
    <div className="space-y-6">
      {/* Top Banner: Date Navigation & Daily Progress */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/90 p-5 sm:p-6 shadow-[0_10px_25px_-5px_rgba(15,23,42,0.06),0_4px_6px_-2px_rgba(15,23,42,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Spiritual Discipline
              </span>
              {isSaved && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
                  ✓ Saved to Bunny
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight mt-1">
              Sadhana Routine &amp; Tracker
            </h2>
            <p className="text-xs text-slate-500">
              Track your daily yogic practices, pranayama, and inner stillness
            </p>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-inner">
            <button
              onClick={() => changeDateBy(-1)}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 transition"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(getTodayIso())}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                isToday ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-700 hover:bg-white'
              }`}
            >
              {isToday ? 'Today' : selectedDate}
            </button>
            <button
              onClick={() => changeDateBy(1)}
              className="p-1.5 rounded-xl hover:bg-white text-slate-600 transition"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1 w-full space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">Daily Completion</span>
              <span className="text-purple-700">
                {completedCount} of {totalCount} completed ({completionPercent}%)
              </span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-600 to-purple-700 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launchers: Jump directly into tools */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onSwitchTab('timer')}
          className="p-3.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-bold text-xs flex items-center gap-2.5 shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition"
        >
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
            <Timer className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] text-amber-100 uppercase tracking-wider">Practice</p>
            <p className="text-xs font-black">Yogic Timer</p>
          </div>
        </button>

        <button
          onClick={() => onSwitchTab('stopwatch')}
          className="p-3.5 rounded-2xl bg-gradient-to-tr from-rose-500 to-red-600 text-white font-bold text-xs flex items-center gap-2.5 shadow-md shadow-red-500/20 hover:scale-[1.02] active:scale-95 transition"
        >
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] text-rose-100 uppercase tracking-wider">Kumbhaka</p>
            <p className="text-xs font-black">Stopwatch</p>
          </div>
        </button>

        <button
          onClick={() => onSwitchTab('meditation')}
          className="p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-700 text-white font-bold text-xs flex items-center gap-2.5 shadow-md shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition"
        >
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
            <Play className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] text-indigo-100 uppercase tracking-wider">Guided</p>
            <p className="text-xs font-black">Meditations</p>
          </div>
        </button>

        <button
          onClick={() => onSwitchTab('samyama')}
          className="p-3.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-violet-800 text-white font-bold text-xs flex items-center gap-2.5 shadow-md shadow-purple-600/20 hover:scale-[1.02] active:scale-95 transition"
        >
          <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
            <CircleDot className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-[10px] text-purple-100 uppercase tracking-wider">Tratak</p>
            <p className="text-xs font-black">Samyama Gaze</p>
          </div>
        </button>
      </div>

      {/* Two Columns: Morning Sadhana & Evening Sadhana */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Morning Sadhana */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/90 p-5 space-y-4 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌅</span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Morning Sadhana</h3>
                <p className="text-[11px] text-slate-500">Pranayama, Kumbhaka &amp; Dhyana</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddMorning(!showAddMorning)}
              className="p-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition flex items-center gap-1 border border-purple-200/60"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Add Form */}
          {showAddMorning && (
            <div className="p-3 bg-purple-50/70 rounded-2xl border border-purple-200/60 space-y-2 text-xs">
              <input
                type="text"
                placeholder="Practice title (e.g., Kapalabhati)"
                value={morningInput.name}
                onChange={(e) => setMorningInput({ ...morningInput, name: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Frequency (e.g. 3 rounds)"
                  value={morningInput.frequency}
                  onChange={(e) => setMorningInput({ ...morningInput, frequency: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-purple-200 rounded-xl focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 10 mins)"
                  value={morningInput.duration}
                  onChange={(e) => setMorningInput({ ...morningInput, duration: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-purple-200 rounded-xl focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowAddMorning(false)}
                  className="px-3 py-1 rounded-xl text-slate-500 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addPractice('morning')}
                  className="px-3 py-1 rounded-xl bg-purple-700 text-white font-bold transition"
                >
                  Save Practice
                </button>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="space-y-2">
            {morningList.map((p) => (
              <div
                key={p.id}
                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                  p.completed
                    ? 'bg-purple-50/60 border-purple-200/80'
                    : 'bg-white/80 border-slate-200/70 hover:shadow-xs'
                }`}
              >
                <button
                  onClick={() => togglePractice('morning', p.id)}
                  className="flex items-center gap-3 text-left flex-1"
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                      p.completed
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'border-slate-300 hover:border-purple-500 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        p.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {p.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {p.frequency} • {p.duration}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => deletePractice('morning', p.id)}
                  className="text-slate-300 hover:text-red-500 transition p-1"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Evening Sadhana */}
        <div className="bg-white/90 backdrop-blur-md rounded-3xl border border-white/90 p-5 space-y-4 shadow-[0_8px_20px_-4px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] ring-1 ring-slate-900/5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌙</span>
              <div>
                <h3 className="text-sm font-black text-slate-900">Evening Sadhana</h3>
                <p className="text-[11px] text-slate-500">Samyama, Tratak &amp; Shavasana</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddEvening(!showAddEvening)}
              className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1 border border-indigo-200/60"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          {/* Add Form */}
          {showAddEvening && (
            <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-200/60 space-y-2 text-xs">
              <input
                type="text"
                placeholder="Practice title (e.g., Shitali Pranayama)"
                value={eveningInput.name}
                onChange={(e) => setEveningInput({ ...eveningInput, name: e.target.value })}
                className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-xl focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Frequency (e.g. 1 cycle)"
                  value={eveningInput.frequency}
                  onChange={(e) => setEveningInput({ ...eveningInput, frequency: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 5 mins)"
                  value={eveningInput.duration}
                  onChange={(e) => setEveningInput({ ...eveningInput, duration: e.target.value })}
                  className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowAddEvening(false)}
                  className="px-3 py-1 rounded-xl text-slate-500 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addPractice('evening')}
                  className="px-3 py-1 rounded-xl bg-indigo-700 text-white font-bold transition"
                >
                  Save Practice
                </button>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="space-y-2">
            {eveningList.map((p) => (
              <div
                key={p.id}
                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                  p.completed
                    ? 'bg-indigo-50/60 border-indigo-200/80'
                    : 'bg-white/80 border-slate-200/70 hover:shadow-xs'
                }`}
              >
                <button
                  onClick={() => togglePractice('evening', p.id)}
                  className="flex items-center gap-3 text-left flex-1"
                >
                  <div
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                      p.completed
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-slate-300 hover:border-indigo-500 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        p.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {p.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {p.frequency} • {p.duration}
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => deletePractice('evening', p.id)}
                  className="text-slate-300 hover:text-red-500 transition p-1"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
