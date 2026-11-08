'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Sparkles, X, Heart, Flame, Volume2, VolumeX, ArrowRight } from 'lucide-react';

interface DiyaBlessing {
  id: number;
  titleHi: string;
  titleEn: string;
  blessingHi: string;
  blessingEn: string;
}

const DIYA_BLESSINGS: DiyaBlessing[] = [
  {
    id: 1,
    titleHi: 'ज्ञान दीप (Light of Knowledge)',
    titleEn: 'Spiritual Wisdom',
    blessingHi: 'ज्ञान का दीप जलाएं, अज्ञान का अंधकार मिटाएं और जीवन को प्रकाशमय बनाएं।',
    blessingEn: 'May the sacred flame of yogic awareness illuminate your path with truth and clarity.',
  },
  {
    id: 2,
    titleHi: 'आरोग्य दीप (Light of Health)',
    titleEn: 'Vibrant Prana & Health',
    blessingHi: 'स्वर के संतुलन और प्राणायाम से आपका तन निरोगी, ओजस्वी व दीर्घायु रहे।',
    blessingEn: 'May balanced solar and lunar breaths bless your body with vitality and radiant wellness.',
  },
  {
    id: 3,
    titleHi: 'शांति दीप (Light of Peace)',
    titleEn: 'Inner Peace & Calm',
    blessingHi: 'तमसो मा ज्योतिर्गमय — आंतरिक विश्राम, सहज ध्यान और परम शांति की प्राप्ति हो।',
    blessingEn: 'From darkness into light — may your mind find profound stillness, gratitude and joy.',
  },
  {
    id: 4,
    titleHi: 'समृद्धि दीप (Light of Prosperity)',
    titleEn: 'Spiritual & Material Abundance',
    blessingHi: 'दीपावली की पावन ज्योति आपके परिवार में सुख, सौहार्द व अक्षय समृद्धि का संचार करे।',
    blessingEn: 'May Lakshmi and spiritual grace bless your home with unending peace, joy and prosperity.',
  },
];

export default function DiwaliCelebrationExperience() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [activeBlessing, setActiveBlessing] = useState<DiyaBlessing | null>(null);
  const [litDiyas, setLitDiyas] = useState<number[]>([1, 2, 3, 4]); // all gently lit by default
  const [superLitDiya, setSuperLitDiya] = useState<number | null>(null);
  const [floatingWidgetVisible, setFloatingWidgetVisible] = useState(false);

  // Canvas ref for silent fireworks
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Check display preferences on mount
  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem('swar_diwali_seen_2026');
      if (!isDismissed) {
        // Small delay for natural entrance
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 350);
        return () => clearTimeout(timer);
      } else {
        setFloatingWidgetVisible(true);
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  // Silent Fireworks Canvas Animation
  useEffect(() => {
    if (!isVisible) {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle system
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      alpha: number;
      color: string;
      radius: number;
      decay: number;
    }

    const particles: Particle[] = [];
    const colors = ['#f59e0b', '#fbbf24', '#f43f5e', '#10b981', '#38bdf8', '#e879f9', '#ffffff'];

    const spawnFirework = () => {
      if (particles.length > 250) return;
      const x = width * 0.15 + Math.random() * (width * 0.7);
      const y = height * 0.15 + Math.random() * (height * 0.4);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const count = 35 + Math.floor(Math.random() * 25);

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 3.5;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color,
          radius: 1.2 + Math.random() * 2,
          decay: 0.012 + Math.random() * 0.015,
        });
      }
    };

    let lastSpawn = Date.now();

    const loop = () => {
      ctx.clearRect(0, 0, width, height);

      // Spawn every 1.2 - 2 seconds
      if (Date.now() - lastSpawn > 1400) {
        spawnFirework();
        lastSpawn = Date.now();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.025; // gravity
        p.vx *= 0.985;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isVisible]);

  // Handle Diya Click
  const handleDiyaClick = (id: number) => {
    setSuperLitDiya(id);
    const blessing = DIYA_BLESSINGS.find((b) => b.id === id) || DIYA_BLESSINGS[0];
    setActiveBlessing(blessing);

    // Reset super-glow after 3 seconds
    setTimeout(() => {
      setSuperLitDiya(null);
    }, 3000);
  };

  // Dismiss and enter normal app
  const handleDismiss = () => {
    setIsExiting(true);
    try {
      sessionStorage.setItem('swar_diwali_seen_2026', 'true');
    } catch {}

    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      setFloatingWidgetVisible(true);
    }, 600);
  };

  // Re-open from floating widget
  const handleReopen = () => {
    setIsVisible(true);
    setIsExiting(false);
    setFloatingWidgetVisible(false);
  };

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. FULLSCREEN GRAND DIWALI CELEBRATION MODAL OVERLAY                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isVisible && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Happy Diwali Swar Yoga Celebration"
          className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between overflow-y-auto overflow-x-hidden bg-[#060913] text-slate-100 transition-all duration-700 select-none ${
            isExiting ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
          }`}
          style={{
            backgroundImage: `radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.12) 0%, transparent 60%), radial-gradient(circle at 50% 80%, rgba(239, 68, 68, 0.1) 0%, transparent 70%)`,
          }}
        >
          {/* Canvas Background for Gentle Fireworks */}
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-80"
          />

          {/* Top Marigold Garland Toran (Traditional Indian Marigold SVG) */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 flex justify-around overflow-hidden opacity-90">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center animate-festive-float"
                style={{ animationDelay: `${(i % 5) * 0.4}s` }}
              >
                {/* Thread */}
                <div className="w-0.5 h-3 sm:h-5 bg-amber-600/60" />
                {/* Marigold flower */}
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-orange-500 shadow-md shadow-amber-500/30 flex items-center justify-center border border-amber-300/40">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-700/60" />
                </div>
                {/* Hanging Mango Leaf (Toran) */}
                {i % 2 === 0 && (
                  <div className="w-2 h-4 sm:w-3 sm:h-6 bg-emerald-600 rounded-b-full shadow-xs -mt-1 transform rotate-1" />
                )}
              </div>
            ))}
          </div>

          {/* Top Controls Bar: Brand + Skip */}
          <div className="relative z-30 w-full max-w-5xl px-4 sm:px-6 pt-5 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 shadow-lg shadow-amber-500/40">
                <Image
                  src="/icon.png"
                  alt="Swar Yoga Logo"
                  width={44}
                  height={44}
                  className="w-full h-full object-contain rounded-full"
                  priority
                />
              </div>
              <div>
                <span className="block text-xs sm:text-sm font-black tracking-widest text-amber-300 uppercase">
                  SWAR YOGA
                </span>
                <span className="text-[10px] text-amber-200/80 font-medium tracking-wide">
                  स्वर योग संस्थान
                </span>
              </div>
            </div>

            {/* Skip Button */}
            <button
              onClick={handleDismiss}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-amber-500/30 text-xs font-semibold backdrop-blur-md transition-all active:scale-95 shadow-lg"
              title="Skip to Dashboard"
            >
              <span>Skip / छोड़ें</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center Main Festive Content */}
          <main className="relative z-30 flex-1 w-full max-w-3xl px-4 py-4 flex flex-col items-center justify-center text-center my-auto">
            {/* Sacred Rotating Rangoli (Background Mandala Accent) */}
            <div className="pointer-events-none absolute -z-10 w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] opacity-25 animate-rangoli-spin">
              <svg viewBox="0 0 200 200" className="w-full h-full text-amber-400">
                <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" />
                <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="100" cy="100" r="50" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 2" />
                {Array.from({ length: 8 }).map((_, idx) => {
                  const deg = idx * 45;
                  return (
                    <g key={idx} transform={`rotate(${deg} 100 100)`}>
                      <path
                        d="M100,20 C112,45 112,65 100,80 C88,65 88,45 100,20 Z"
                        fill="rgba(245, 158, 11, 0.2)"
                        stroke="currentColor"
                        strokeWidth="0.8"
                      />
                      <circle cx="100" cy="15" r="2.5" fill="currentColor" />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Glowing Golden Aura Diya Icon */}
            <div className="relative mb-3 flex items-center justify-center animate-festive-float">
              {/* Golden Radiance Backdrop */}
              <div className="absolute w-28 h-28 bg-amber-500/25 blur-2xl rounded-full" />
              
              {/* Flame Symbol */}
              <div className="relative flex flex-col items-center">
                {/* Outer Flame Glow */}
                <div className="w-10 h-16 sm:w-14 sm:h-20 animate-diya-flame bg-gradient-to-t from-orange-600 via-amber-400 to-yellow-200 rounded-full blur-[1px] shadow-[0_0_35px_rgba(251,191,36,0.9)] flex items-center justify-center">
                  {/* Intense White Core Tip */}
                  <div className="w-4 h-8 sm:w-6 sm:h-10 animate-diya-core bg-gradient-to-t from-amber-300 via-yellow-100 to-white rounded-full" />
                </div>

                {/* Clay Diya Base SVG */}
                <div className="-mt-3 w-28 sm:w-36 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]">
                  <svg viewBox="0 0 120 40" className="w-full h-auto">
                    <defs>
                      <linearGradient id="clayGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#b45309" />
                        <stop offset="60%" stopColor="#78350f" />
                        <stop offset="100%" stopColor="#451a03" />
                      </linearGradient>
                      <linearGradient id="rimGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="50%" stopColor="#fef08a" />
                        <stop offset="100%" stopColor="#f59e0b" />
                      </linearGradient>
                    </defs>
                    <ellipse cx="60" cy="12" rx="48" ry="9" fill="url(#clayGrad)" stroke="url(#rimGrad)" strokeWidth="1.2" />
                    <path
                      d="M12,12 C18,34 102,34 108,12 C96,28 24,28 12,12 Z"
                      fill="url(#clayGrad)"
                      stroke="#92400e"
                      strokeWidth="1"
                    />
                    {/* Diya decorative carvings */}
                    <circle cx="60" cy="22" r="2.5" fill="#fef08a" />
                    <circle cx="45" cy="20" r="2" fill="#fbbf24" />
                    <circle cx="75" cy="20" r="2" fill="#fbbf24" />
                    <circle cx="32" cy="17" r="1.5" fill="#f59e0b" />
                    <circle cx="88" cy="17" r="1.5" fill="#f59e0b" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Sacred Devanagari Greeting */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight drop-shadow-[0_4px_16px_rgba(245,158,11,0.5)]">
              <span className="bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-100 bg-clip-text text-transparent">
                शुभ दीपावली
              </span>
            </h1>

            {/* English Title */}
            <h2 className="text-xl sm:text-3xl font-extrabold tracking-wide text-amber-200 mt-1 mb-3">
              Happy Diwali!
            </h2>

            {/* Warm Blessing Prose */}
            <p className="max-w-xl text-sm sm:text-base font-normal text-amber-100/90 leading-relaxed px-2">
              May the light of knowledge remove darkness and bring peace, health, happiness and prosperity into your life.
            </p>

            {/* Team Sender Stamp */}
            <div className="mt-3 text-xs sm:text-sm font-semibold text-amber-300/90 flex items-center gap-1.5 justify-center">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>With warm wishes, <strong>Swar Yoga Team & Mohan Sir</strong></span>
            </div>

            {/* Interactive Blessing Box (Appears on Diya Tap) */}
            {activeBlessing && (
              <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/80 border border-amber-400/50 shadow-2xl backdrop-blur-md max-w-lg w-full animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/30 text-xs font-black text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    {activeBlessing.titleHi}
                  </span>
                  <button
                    onClick={() => setActiveBlessing(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-yellow-100 font-medium mt-2 leading-relaxed">
                  &ldquo;{activeBlessing.blessingHi}&rdquo;
                </p>
                <p className="text-[11px] text-amber-200/80 mt-1 italic">
                  {activeBlessing.blessingEn}
                </p>
              </div>
            )}

            {/* ───────────────────────────────────────────────────────────── */}
            {/* 4 INTERACTIVE DIYAS (TAP TO LIGHT & RECEIVE BLESSINGS)       */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="mt-6 w-full max-w-2xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80 mb-2 flex items-center justify-center gap-1.5">
                <span>🪔 दीपकों पर स्पर्श करें (Tap any Diya to light & receive blessing)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {DIYA_BLESSINGS.map((blessing) => {
                  const isSuperLit = superLitDiya === blessing.id;
                  const isActive = activeBlessing?.id === blessing.id;

                  return (
                    <button
                      key={blessing.id}
                      onClick={() => handleDiyaClick(blessing.id)}
                      className={`group relative p-3 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-between cursor-pointer active:scale-95 ${
                        isActive || isSuperLit
                          ? 'bg-amber-500/25 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.5)] scale-105'
                          : 'bg-slate-900/60 hover:bg-slate-800/80 border-amber-500/30 hover:border-amber-400/60'
                      }`}
                    >
                      {/* Animated Diya Flame */}
                      <div className="relative flex flex-col items-center mb-1">
                        <div
                          className={`w-4 h-7 rounded-full transition-all duration-300 ${
                            isSuperLit
                              ? 'w-6 h-10 bg-gradient-to-t from-red-600 via-amber-300 to-white shadow-[0_0_30px_#f59e0b] scale-125'
                              : 'bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-200 animate-diya-flame shadow-[0_0_15px_rgba(245,158,11,0.8)]'
                          }`}
                        />
                        {/* Mini Clay Diya Bowl */}
                        <div className="-mt-1.5 w-12 h-3.5 rounded-b-full bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 border-t border-amber-400/80 shadow-xs" />
                      </div>

                      {/* Title */}
                      <span className="text-[11px] font-black text-amber-200 group-hover:text-white transition">
                        {blessing.titleHi.split(' ')[0]} दीप
                      </span>
                      <span className="text-[9px] text-amber-300/70 font-medium">
                        {blessing.titleEn.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────── */}
            {/* PRIMARY ENTER SWAR YOGA CTA BUTTON                            */}
            {/* ───────────────────────────────────────────────────────────── */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleDismiss}
                className="group relative px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm sm:text-base tracking-wide flex items-center gap-2.5 shadow-[0_0_35px_rgba(245,158,11,0.6)] hover:shadow-[0_0_50px_rgba(245,158,11,0.8)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer border-2 border-yellow-100"
              >
                <span>स्वर योग में प्रवेश करें • Enter Swar Yoga</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          </main>

          {/* Bottom Traditional Shloka Footer */}
          <footer className="relative z-30 w-full max-w-5xl px-4 py-3 text-center border-t border-amber-500/20 text-[11px] text-amber-300/70">
            <span>ॐ असतो मा सद्गमय । तमसो मा ज्योतिर्गमय । मृत्योर्मा अमृतं गमय । ॐ शान्तिः शान्तिः शान्तिः ॥</span>
          </footer>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. PERSISTENT MINI FLOATING DIYA WIDGET (AFTER ENTERING SWAR YOGA)   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {floatingWidgetVisible && !isVisible && (
        <aside
          aria-label="Diwali Festive Greeting Button"
          className="fixed bottom-24 right-5 z-40 animate-festive-float"
        >
          <button
            onClick={handleReopen}
            className="group relative p-2.5 rounded-full bg-gradient-to-r from-amber-950/95 via-slate-900/95 to-amber-950/95 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.5)] hover:shadow-[0_0_30px_rgba(245,158,11,0.8)] backdrop-blur-md flex items-center gap-2 transition-all hover:scale-110 active:scale-95 cursor-pointer"
            title="शुभ दीपावली — Reopen Diwali Greeting"
          >
            {/* Little Flame */}
            <div className="w-4 h-6 rounded-full bg-gradient-to-t from-orange-500 via-amber-400 to-yellow-100 animate-diya-flame shadow-[0_0_12px_#f59e0b]" />
            <span className="hidden sm:inline text-xs font-black text-amber-200 group-hover:text-white pr-1">
              शुभ दीपावली ✨
            </span>
          </button>
        </aside>
      )}
    </>
  );
}

