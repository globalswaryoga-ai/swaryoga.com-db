'use client';

import React from 'react';
import { AnimationPresetItem } from '@/app/api/avatar/animation-10s/route';
import { Sparkles, Moon, Sun, Flame, CheckCircle, ShieldCheck } from 'lucide-react';

export interface Procedural10sViewportProps {
  preset: AnimationPresetItem;
  currentTime: number; // 0.0 to 10.0s
  isPlaying: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  showTextOverlay?: boolean; // When false, ZERO words or text appear on canvas
  customSubtitleText?: string; // Optional user-defined text
}

export default function Procedural10sViewport({
  preset,
  currentTime,
  isPlaying,
  videoRef,
  showTextOverlay = false,
  customSubtitleText = '',
}: Procedural10sViewportProps) {
  // If preset has a real video (Mohan Sir hybrid)
  if (preset.realVideoUrl) {
    return (
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">
        <video
          ref={videoRef}
          src={preset.realVideoUrl}
          className="w-full h-full object-cover"
          loop
          muted
          playsInline
        />
        {/* Floating PiP of 4K Triphala Remedy */}
        <div className="absolute top-4 right-4 w-44 aspect-video rounded-xl overflow-hidden border border-amber-400/60 shadow-2xl bg-slate-950/90 backdrop-blur-md z-20">
          <Triphala4KCinematicScene currentTime={currentTime} isPiP={true} showTextOverlay={false} />
        </div>
      </div>
    );
  }

  // Routing to 4K Cinematic Master Scenes
  const isBrain =
    preset.id === 'brain_hemispheres_sync' ||
    preset.category === 'internal_anatomy' ||
    preset.title.includes('मस्तिष्क') ||
    preset.title.includes('ब्रेन') ||
    preset.title.includes('Coherence');

  const isLungs =
    preset.id === 'pranayama_lungs_diaphragm' ||
    preset.title.includes('फेफड़े') ||
    preset.title.includes('Lungs') ||
    preset.title.includes('प्राणायाम श्वास');

  const isMudra =
    preset.id === 'nasikagra_mudra_technique' ||
    preset.category === 'hand_mudra' ||
    preset.title.includes('मुद्रा') ||
    preset.title.includes('नासिका');

  const isAsana =
    preset.id === 'padmasana_spine_kundalini' ||
    preset.category === 'yoga_asana' ||
    preset.title.includes('आसन') ||
    preset.title.includes('पद्मासन') ||
    preset.title.includes('चक्र');

  const isDigestion =
    preset.id === 'jatharagni_digestive_fire' ||
    preset.title.includes('जठराग्नि') ||
    preset.title.includes('पाचन') ||
    preset.title.includes('Agni');

  const isResort =
    preset.id === 'resort_ashram_flythrough' ||
    preset.category === 'resort_architecture' ||
    preset.title.includes('रिसॉर्ट') ||
    preset.title.includes('आश्रम');

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {isBrain && <Brain4KCinematicScene currentTime={currentTime} showTextOverlay={showTextOverlay} />}
      {isLungs && <PranayamaLungs4KCinematicScene currentTime={currentTime} showTextOverlay={showTextOverlay} />}
      {isMudra && <Nasikagra4KCinematicScene currentTime={currentTime} showTextOverlay={showTextOverlay} />}
      {isAsana && <Padmasana4KCinematicScene currentTime={currentTime} showTextOverlay={showTextOverlay} />}
      {isDigestion && <Jatharagni4KCinematicScene currentTime={currentTime} showTextOverlay={showTextOverlay} />}
      {isResort && <Resort4KCinematicScene currentTime={currentTime} showTextOverlay={showTextOverlay} />}
      {!isBrain && !isLungs && !isMudra && !isAsana && !isDigestion && !isResort && (
        <Triphala4KCinematicScene currentTime={currentTime} showTextOverlay={showTextOverlay} />
      )}

      {/* User Custom Text Overlay (Only rendered if enabled and text exists) */}
      {showTextOverlay && customSubtitleText.trim() && (
        <div className="absolute bottom-6 inset-x-6 z-30 flex justify-center pointer-events-none">
          <div className="px-6 py-2.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/20 text-white font-bold text-sm sm:text-base text-center shadow-2xl drop-shadow max-w-xl">
            {customSubtitleText}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   1. 4K TRIPHALA REMEDY: CRYSTAL GLASS OF WATER (PURE CINEMATIC)
   ========================================================================= */
function Triphala4KCinematicScene({
  currentTime,
  isPiP = false,
  showTextOverlay = false,
}: {
  currentTime: number;
  isPiP?: boolean;
  showTextOverlay?: boolean;
}) {
  const t = Math.max(0, Math.min(10, currentTime));
  const isNight = t >= 3.5 && t < 6.8;
  const isSunrise = t >= 6.8;
  const drainT = t < 7.5 ? 0 : Math.min(1, (t - 7.5) / 2.0);
  const zoomScale = 1.0 + (t / 10) * 0.06;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {/* 4K Photorealistic Master Image with Slow Cinematic Zoom */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-300 ease-out"
        style={{
          backgroundImage: "url('/images/animation-4k/triphala_cosmic_4k.jpg')",
          transform: `scale(${zoomScale})`,
        }}
      />

      {/* Dynamic Night Ambiance Overlay (3.5s - 6.8s) */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-indigo-950/75 via-slate-950/70 to-black/80 pointer-events-none transition-opacity duration-700"
        style={{ opacity: isNight ? 1 : 0 }}
      />

      {/* Dynamic Golden Sunrise Rays Overlay (6.8s - 10.0s) */}
      <div
        className="absolute inset-0 bg-gradient-to-tr from-amber-600/30 via-yellow-500/20 to-transparent pointer-events-none transition-opacity duration-700"
        style={{ opacity: isSunrise ? 1 : 0 }}
      />

      {/* Swirling Golden Powder Diffusion Particles (0.0s - 3.5s) */}
      {t < 3.5 && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-[48%] top-[38%] w-20 h-28 bg-amber-400/25 blur-xl rounded-full animate-pulse" />
          <div className="absolute left-[50%] top-[42%] w-12 h-16 bg-yellow-300/30 blur-lg rounded-full" />
        </div>
      )}

      {/* Water Draining Mask (7.5s - 10.0s, Drinking Action) */}
      {t >= 7.5 && (
        <div
          className="absolute left-[40%] right-[38%] bottom-[20%] bg-gradient-to-b from-amber-950/90 to-black/80 rounded-b-xl pointer-events-none transition-all duration-300"
          style={{ height: `${drainT * 40}%` }}
        />
      )}

      {/* Optional Badge: ONLY IF showTextOverlay is true */}
      {showTextOverlay && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-black font-extrabold text-[10px] tracking-wider shadow">
            4K AYURVEDIC DETOX
          </span>
          <span className="text-[11px] text-white/90 font-bold drop-shadow">
            त्रिफला चूर्ण जल प्रयोग • रात्रि भिगोना व प्रातः सेवन
          </span>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   2. 4K BRAIN HEMISPHERES: SUSHUMNA TOTAL COHERENCE (PURE CINEMATIC)
   ========================================================================= */
function Brain4KCinematicScene({
  currentTime,
  showTextOverlay = false,
}: {
  currentTime: number;
  showTextOverlay?: boolean;
}) {
  const t = Math.max(0, Math.min(10, currentTime));
  const isLeftSurya = t < 3.2;
  const isRightChandra = t >= 3.2 && t < 6.8;
  const isSushumnaSync = t >= 6.8;
  const zoomScale = 1.0 + (t / 10) * 0.05;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {/* 4K Photorealistic Master Image */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-300 ease-out"
        style={{
          backgroundImage: "url('/images/animation-4k/brain_hemispheres_4k.jpg')",
          transform: `scale(${zoomScale})`,
        }}
      />

      {/* Live Glowing Left Hemisphere (Surya / Pingala: 0.0s - 3.2s) */}
      <div
        className="absolute inset-y-0 left-0 w-1/2 pointer-events-none transition-opacity duration-500 flex items-center justify-center"
        style={{ opacity: isLeftSurya ? 1 : 0.2 }}
      >
        <div className="w-56 h-56 rounded-full bg-amber-400/25 blur-3xl animate-pulse" />
      </div>

      {/* Live Glowing Right Hemisphere (Chandra / Ida: 3.2s - 6.8s) */}
      <div
        className="absolute inset-y-0 right-0 w-1/2 pointer-events-none transition-opacity duration-500 flex items-center justify-center"
        style={{ opacity: isRightChandra ? 1 : 0.2 }}
      >
        <div className="w-56 h-56 rounded-full bg-cyan-400/25 blur-3xl animate-pulse" />
      </div>

      {/* Central Corpus Callosum Coherence Beam (6.8s - 10.0s) */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700 flex items-center justify-center"
        style={{ opacity: isSushumnaSync ? 1 : 0.3 }}
      >
        <div className="w-48 h-48 rounded-full bg-purple-500/30 blur-2xl animate-ping" />
        <div className="w-32 h-32 rounded-full bg-fuchsia-400/40 blur-xl" />
      </div>

      {/* Optional Badge: ONLY IF showTextOverlay is true */}
      {showTextOverlay && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-cyan-500 text-black font-extrabold text-[10px] tracking-wider shadow">
            4K NEURAL CGI
          </span>
          <span className="text-[11px] text-white/90 font-bold drop-shadow">
            {isLeftSurya
              ? '☀️ पिंगला सूर्य स्वर • बायां मस्तिष्क तर्क व क्रिया'
              : isRightChandra
              ? '🌙 इड़ा चंद्र स्वर • दायां मस्तिष्क शांति व अंतर्ज्ञान'
              : '⚡ सुषुम्ना महायोग • दोनों गोलार्धों का पूर्ण समन्वय'}
          </span>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   3. 4K PRANAYAMA LUNGS & DIAPHRAGM (PURE CINEMATIC)
   ========================================================================= */
function PranayamaLungs4KCinematicScene({
  currentTime,
  showTextOverlay = false,
}: {
  currentTime: number;
  showTextOverlay?: boolean;
}) {
  const t = Math.max(0, Math.min(10, currentTime));
  // Breathing cycle: Inhalation expansion (0-3.5s), Retention (3.5-5.5s), Exhalation deflation (5.5-9s)
  const breathPhase = t < 3.5 ? 'Puraka (Inhale)' : t < 5.5 ? 'Kumbhaka (Retain)' : 'Rechaka (Exhale)';
  const expansion = t < 3.5 ? 1.0 + (t / 3.5) * 0.08 : t < 5.5 ? 1.08 : 1.08 - ((t - 5.5) / 3.5) * 0.08;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {/* 4K Master Image with Dynamic Lung Expansion */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-300 ease-out"
        style={{
          backgroundImage: "url('/images/animation-4k/pranayama_lungs_4k.jpg')",
          transform: `scale(${expansion})`,
        }}
      />

      {/* Pranic Oxygenation Glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{ opacity: t < 3.5 ? 0.7 : 0.3 }}
      >
        <div className="absolute left-[30%] top-[40%] w-32 h-32 bg-cyan-400/20 blur-2xl rounded-full animate-pulse" />
        <div className="absolute right-[30%] top-[40%] w-32 h-32 bg-amber-400/20 blur-2xl rounded-full animate-pulse" />
      </div>

      {/* Optional Badge */}
      {showTextOverlay && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-emerald-500 text-black font-extrabold text-[10px] tracking-wider shadow">
            4K RESPIRATORY PRANA
          </span>
          <span className="text-[11px] text-white/90 font-bold drop-shadow">
            प्राणायाम श्वास चक्र • {breathPhase}
          </span>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   4. 4K NASIKAGRA MUDRA: SACRED PROFILE & PRANA AIRFLOW (PURE CINEMATIC)
   ========================================================================= */
function Nasikagra4KCinematicScene({
  currentTime,
  showTextOverlay = false,
}: {
  currentTime: number;
  showTextOverlay?: boolean;
}) {
  const t = Math.max(0, Math.min(10, currentTime));
  const isPingalaInhale = t < 3.2;
  const isIdaExhale = t >= 3.2 && t < 6.8;
  const isAjnaAwakening = t >= 6.8;
  const zoomScale = 1.0 + (t / 10) * 0.05;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {/* 4K Photorealistic Master Image */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-300 ease-out"
        style={{
          backgroundImage: "url('/images/animation-4k/nasikagra_prana_4k.jpg')",
          transform: `scale(${zoomScale})`,
        }}
      />

      {/* Dynamic Golden Solar Airflow Glow */}
      <div
        className="absolute top-[35%] left-[20%] w-56 h-24 bg-amber-400/25 blur-2xl rounded-full pointer-events-none transition-opacity duration-500"
        style={{ opacity: isPingalaInhale ? 1 : 0.2 }}
      />

      {/* Third Eye (Ajna) Radiant Pulse */}
      <div
        className="absolute top-[16%] left-[60%] w-24 h-24 bg-purple-500/35 blur-xl rounded-full pointer-events-none transition-opacity duration-500"
        style={{ opacity: isAjnaAwakening ? 1 : 0.3 }}
      />

      {/* Optional Badge */}
      {showTextOverlay && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-black font-extrabold text-[10px] tracking-wider shadow">
            4K YOGIC MUDRA
          </span>
          <span className="text-[11px] text-white/90 font-bold drop-shadow">
            {isPingalaInhale
              ? '☀️ दाईं नासिका सूर्य स्वर प्रवाह'
              : isIdaExhale
              ? '🌙 बाईं नासिका चंद्र स्वर प्रवाह'
              : '👁️ आज्ञा चक्र स्पंदन • ध्यान धारणा'}
          </span>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   5. 4K PADMASANA & 7 CHAKRAS: SACRED KUNDALINI ASCENT (PURE CINEMATIC)
   ========================================================================= */
function Padmasana4KCinematicScene({
  currentTime,
  showTextOverlay = false,
}: {
  currentTime: number;
  showTextOverlay?: boolean;
}) {
  const t = Math.max(0, Math.min(10, currentTime));
  const zoomScale = 1.0 + (t / 10) * 0.05;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {/* 4K Photorealistic Master Image */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-300 ease-out"
        style={{
          backgroundImage: "url('/images/animation-4k/chakras_kundalini_4k.jpg')",
          transform: `scale(${zoomScale})`,
        }}
      />

      {/* Dynamic Kundalini Spine Aura */}
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-24 bg-gradient-to-b from-purple-500/25 via-emerald-500/20 to-red-500/25 blur-2xl pointer-events-none animate-pulse" />

      {/* Crown Lotus Radiance Pulse */}
      {t >= 7.0 && (
        <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-36 h-36 bg-yellow-300/30 blur-2xl rounded-full pointer-events-none animate-ping" />
      )}

      {/* Optional Badge */}
      {showTextOverlay && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-purple-500 text-white font-extrabold text-[10px] tracking-wider shadow">
            4K CHAKRA MATRIX
          </span>
          <span className="text-[11px] text-white/90 font-bold drop-shadow">
            पद्मासन • 7 चक्र संरेखण व कुंडलिनी ऊर्ध्वगामी प्रवाह
          </span>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   6. 4K JATHARAGNI: DIGESTIVE FIRE & INTERNAL METABOLISM (PURE CINEMATIC)
   ========================================================================= */
function Jatharagni4KCinematicScene({
  currentTime,
  showTextOverlay = false,
}: {
  currentTime: number;
  showTextOverlay?: boolean;
}) {
  const t = Math.max(0, Math.min(10, currentTime));
  const zoomScale = 1.0 + (t / 10) * 0.05;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {/* 4K Clean Visual Image */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-300 ease-out"
        style={{
          backgroundImage: "url('/images/animation-4k/jatharagni_clean_4k.jpg')",
          transform: `scale(${zoomScale})`,
        }}
      />

      {/* Internal Agni Flame Pulse */}
      <div className="absolute top-[32%] left-[45%] w-28 h-28 bg-amber-500/30 blur-2xl rounded-full pointer-events-none animate-pulse" />

      {/* Optional Badge */}
      {showTextOverlay && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-black font-extrabold text-[10px] tracking-wider shadow">
            4K AYURVEDIC PHYSIOLOGY
          </span>
          <span className="text-[11px] text-white/90 font-bold drop-shadow">
            जठराग्नि प्रदीपन • पाचन तंत्र एवं ऊर्जा चयापचय
          </span>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   7. 4K SWAR YOGA WELLNESS RESORT & ASHRAM (PURE CINEMATIC)
   ========================================================================= */
function Resort4KCinematicScene({
  currentTime,
  showTextOverlay = false,
}: {
  currentTime: number;
  showTextOverlay?: boolean;
}) {
  const t = Math.max(0, Math.min(10, currentTime));
  const zoomScale = 1.0 + (t / 10) * 0.08;

  return (
    <div className="relative w-full h-full overflow-hidden bg-black select-none">
      {/* 4K Photorealistic Master Image with Slow Cinematic Drone Push */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-300 ease-out"
        style={{
          backgroundImage: "url('/images/animation-4k/swar_ashram_cosmic_4k.jpg')",
          transform: `scale(${zoomScale})`,
        }}
      />

      {/* Morning Sunbeam Lens Flare Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-amber-400/15 to-yellow-200/20 pointer-events-none" />

      {/* Optional Badge */}
      {showTextOverlay && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-black font-extrabold text-[10px] tracking-wider shadow">
            4K CINEMATIC ASHRAM
          </span>
          <span className="text-[11px] text-white/90 font-bold drop-shadow">
            स्वर योग वेलनेस रिसॉर्ट & आश्रम • प्राकृतिक शांत वातावरण
          </span>
        </div>
      )}
    </div>
  );
}
