'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Square,
  Volume2,
  VolumeX,
  Layers,
  Wand2,
  FileText,
  Camera,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Mic,
  Sliders,
  RefreshCw,
  Sun,
  Moon,
  Info,
  Check,
  UserCheck,
  Send,
  Download,
} from 'lucide-react';

export interface Mohan2DTwin {
  id: string;
  number: number;
  title: string;
  titleHi: string;
  badge: string;
  imageUrl: string;
  roleSpecialty: string;
  description: string;
  voiceDna: string;
  recommendedBackdropId: string;
}

export const THE_5_MOHAN_SIR_2D_TWINS: Mohan2DTwin[] = [
  {
    id: 'twin_1_modi_jacket',
    number: 1,
    title: 'Twin 1: Sovereign Acharya (Modi Jacket Look)',
    titleHi: 'ट्विन १: सार्वभौम आचार्य (मोदी जैकेट अवतार)',
    badge: 'Authority & Keynote',
    imageUrl: '/avatar-twins/twin_1_modi_jacket.jpg',
    roleSpecialty: 'National & Global Keynotes, Strategic Swar Yoga Masterclasses',
    description: 'Crisp charcoal-black Modi Nehru jacket with light blue shirt. Commands full teaching authority with gravitas and warmth.',
    voiceDna: 'Mohan Sir Master DNA (Hindi - Swar Intro)',
    recommendedBackdropId: 'amphitheater',
  },
  {
    id: 'twin_2_white_shirt',
    number: 2,
    title: 'Twin 2: Academic Scientist (Crisp White Shirt Look)',
    titleHi: 'ट्विन २: वैज्ञानिक व्याख्याता (शुद्ध श्वेत शर्ट अवतार)',
    badge: 'Anatomy & Science',
    imageUrl: '/avatar-twins/twin_2_white_shirt.jpg',
    roleSpecialty: 'Whiteboard Anatomy, Jatharagni & Respiratory Science',
    description: 'Clean formal white shirt presenting empirical Swar Shastra charts and physiological breath observations.',
    voiceDna: 'Mohan Sir DNA (जठराग्नि व पाचन)',
    recommendedBackdropId: 'classroom',
  },
  {
    id: 'twin_3_golden_kurta',
    number: 3,
    title: 'Twin 3: Sacred Shastra Guru (Golden Silk Kurta Look)',
    titleHi: 'ट्विन ३: पवित्र शास्त्र गुरु (स्वर्णिम सिल्क कुर्ता अवतार)',
    badge: 'Vedic Heritage',
    imageUrl: '/avatar-twins/twin_3_golden_kurta.jpg',
    roleSpecialty: 'Shiva Swarodaya Discourses, Mantra & Tattva Philosophy',
    description: 'Luminous royal golden silk kurta radiating positive Vedic prana. Ideal for spiritual lectures and sacred dates.',
    voiceDna: 'Mohan Sir DNA (ऋतु चक्र व स्वर)',
    recommendedBackdropId: 'ashram',
  },
  {
    id: 'twin_4_blue_sadhana',
    number: 4,
    title: 'Twin 4: Deep Sadhana Master (Oceanic Blue Kurta Look)',
    titleHi: 'ट्विन ४: प्राणायाम व ध्यान साधक (गहरा नीला कुर्ता अवतार)',
    badge: 'Meditation & Mudra',
    imageUrl: '/avatar-twins/twin_4_blue_sadhana.jpg',
    roleSpecialty: 'Pranayama Guided Practice, Ida-Pingala Balancing',
    description: 'Rich oceanic blue sadhana kurta with hands in mudra. Radiates deep internal stillness and meditative focus.',
    voiceDna: 'Mohan Sir DNA (इड़ा व पिंगला संतुलन)',
    recommendedBackdropId: 'ashram',
  },
  {
    id: 'twin_5_face_close',
    number: 5,
    title: 'Twin 5: Intimate Mentor (Ultra-HD Facial Close-Up)',
    titleHi: 'ट्विन ५: आत्मिक गुरु संवाद (अल्ट्रा-एचडी क्लोज-अप अवतार)',
    badge: 'Direct Eye Contact',
    imageUrl: '/avatar-twins/twin_5_face_close.jpg',
    roleSpecialty: '1-on-1 Mentorship, Breath Check, Q&A Punchlines & Humor',
    description: 'High-definition facial framing showing razor-sharp eyes, natural beard contours, and real-time responsive mouth visemes.',
    voiceDna: 'Mohan Sir DNA (दैनिक स्वर परीक्षा)',
    recommendedBackdropId: 'clean_studio',
  },
];

const VIRTUAL_BACKDROPS = [
  {
    id: 'ashram',
    name: 'Himalayan Ashram Sanctum',
    nameHi: 'हिमालयन आश्रम व ध्यान साधना पीठ',
    bgStyle: 'radial-gradient(ellipse at top, #451a03 0%, #1c1917 50%, #09090b 100%)',
    ambientColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'border-amber-500/40',
  },
  {
    id: 'classroom',
    name: 'Swar Yoga Smart Digital Classroom',
    nameHi: 'स्वर योग डिजिटल स्मार्ट क्लासरूम',
    bgStyle: 'radial-gradient(ellipse at top, #1e293b 0%, #0f172a 60%, #020617 100%)',
    ambientColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: 'border-cyan-500/40',
  },
  {
    id: 'amphitheater',
    name: 'Grand University Amphitheater',
    nameHi: 'ग्रैंड यूनिवर्सिटी व्याख्यान कक्ष',
    bgStyle: 'radial-gradient(ellipse at top, #2e1065 0%, #1e1b4b 55%, #050505 100%)',
    ambientColor: 'rgba(168, 85, 247, 0.12)',
    borderColor: 'border-purple-500/40',
  },
  {
    id: 'clean_studio',
    name: 'Clean Broadcast Dark Studio',
    nameHi: 'क्लीन ब्रॉडकास्ट स्टूडियो (डार्क ग्रेडिएंट)',
    bgStyle: 'radial-gradient(ellipse at top, #18181b 0%, #09090b 70%, #000000 100%)',
    ambientColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'border-slate-700',
  },
];

const QUICK_SCRIPTS = [
  {
    lang: 'Hindi',
    label: 'स्वर योग रहस्य (Hindi)',
    text: 'नमस्ते! मैं मोहन कलबुर्गी हूँ। स्वर योग केवल सांस लेना नहीं, बल्कि ब्रह्मांडीय ऊर्जा और जठराग्नि को जाग्रत करने का परम विज्ञान है। जब आपका सूर्य स्वर चलता है तो भोजन का पाचन तीव्र होता है।',
  },
  {
    lang: 'Marathi',
    label: 'स्वर साधना (Marathi)',
    text: 'नमस्कार साधकांनो! मी मोहन कलबुर्गी बोलत आहे. डाव्या व उजव्या नाकपुडीचा श्वास आपल्या शरीरातील आरोग्य आणि मन संतुलित ठेवतो. सूर्य आणि चंद्र नाडीचे संतुलन हेच उत्तम आरोग्याचे रहस्य आहे.',
  },
  {
    lang: 'English',
    label: 'Breath Wisdom (English)',
    text: 'Namaste! I am Mohan Kalburgi. Welcome to Swar Yoga — the timeless science of breath rhythms, Prana activation, and mind balance. Align your breath with nature to unlock vitality.',
  },
];

interface Props {
  onTransferScript?: (script: string) => void;
  onQueueRender?: (script: string, lookId: string) => void;
}

export default function MohanSir2DPhotorealisticTwinStage({
  onTransferScript,
  onQueueRender,
}: Props) {
  // State
  const [selectedTwin, setSelectedTwin] = useState<Mohan2DTwin>(THE_5_MOHAN_SIR_2D_TWINS[0]);
  const [selectedBackdrop, setSelectedBackdrop] = useState(VIRTUAL_BACKDROPS[0]);
  const [scriptText, setScriptText] = useState(QUICK_SCRIPTS[0].text);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentViseme, setCurrentViseme] = useState<'REST' | 'A' | 'O' | 'E' | 'M'>('REST');
  const [isBlinking, setIsBlinking] = useState(false);
  const [audioLevel, setAudioLevel] = useState<number[]>([15, 25, 40, 20, 10]);
  const [showLightingGlow, setShowLightingGlow] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const visemeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioWaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Natural Eye Blink Cycle
  useEffect(() => {
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        const nextBlinkDelay = 3200 + Math.random() * 2400;
        blinkTimerRef.current = setTimeout(triggerBlink, nextBlinkDelay);
      }, 140);
    };

    blinkTimerRef.current = setTimeout(triggerBlink, 3500);
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

  // Neural Lip-Sync Viseme Simulation while Speaking
  useEffect(() => {
    if (!isSpeaking) {
      setCurrentViseme('REST');
      setAudioLevel([12, 18, 22, 16, 10]);
      if (visemeTimerRef.current) clearInterval(visemeTimerRef.current);
      if (audioWaveTimerRef.current) clearInterval(audioWaveTimerRef.current);
      return;
    }

    const visemes: ('A' | 'O' | 'E' | 'M')[] = ['A', 'E', 'O', 'M', 'A', 'E', 'O'];
    let idx = 0;

    visemeTimerRef.current = setInterval(() => {
      idx = (idx + 1) % visemes.length;
      setCurrentViseme(visemes[idx]);
    }, 110);

    audioWaveTimerRef.current = setInterval(() => {
      setAudioLevel([
        Math.floor(20 + Math.random() * 70),
        Math.floor(30 + Math.random() * 65),
        Math.floor(45 + Math.random() * 55),
        Math.floor(25 + Math.random() * 70),
        Math.floor(15 + Math.random() * 60),
      ]);
    }, 90);

    return () => {
      if (visemeTimerRef.current) clearInterval(visemeTimerRef.current);
      if (audioWaveTimerRef.current) clearInterval(audioWaveTimerRef.current);
    };
  }, [isSpeaking]);

  // Handle Speech Synthesizer
  const handleStartSpeaking = () => {
    if (typeof window === 'undefined') return;

    if (!('speechSynthesis' in window)) {
      showToast('Web Speech API is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();

    if (!scriptText.trim()) {
      showToast('Please type a script first.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(scriptText);
    utterance.rate = speechRate;
    utterance.pitch = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find((v) => v.lang.startsWith('hi') || v.name.includes('Hindi'));
    const indianVoice = voices.find((v) => v.lang.includes('IN') || v.name.includes('India'));
    if (hindiVoice) {
      utterance.voice = hindiVoice;
    } else if (indianVoice) {
      utterance.voice = indianVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      showToast(`⚡ ${selectedTwin.title} is speaking with real-time 2D lip-sync.`);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentViseme('REST');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setCurrentViseme('REST');
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setCurrentViseme('REST');
  };

  const handleToggleFullscreen = () => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const getVisemeTransform = () => {
    switch (currentViseme) {
      case 'A':
        return { scaleY: 1.6, scaleX: 1.1, translateY: '3px', opacity: 0.95 };
      case 'O':
        return { scaleY: 1.4, scaleX: 0.85, translateY: '2px', opacity: 0.95 };
      case 'E':
        return { scaleY: 0.9, scaleX: 1.3, translateY: '0px', opacity: 0.9 };
      case 'M':
        return { scaleY: 0.7, scaleX: 1.05, translateY: '-1px', opacity: 0.85 };
      default:
        return { scaleY: 1.0, scaleX: 1.0, translateY: '0px', opacity: 0.0 };
    }
  };

  const visemeProps = getVisemeTransform();

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-amber-300 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* 5 2D TWINS HERO SELECTOR CARDS                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                5 Active 2D Twins
              </span>
              <h2 className="text-base font-black text-white">Select From Your 5 Photorealistic 2D Twins</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Pure 2D photorealistic digital twin avatars. Click any twin below to load him on the live stage instantly.
            </p>
          </div>

          <div className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <UserCheck className="w-4 h-4" />
            Active: {selectedTwin.title.split(':')[0]}
          </div>
        </div>

        {/* The 5 Twin Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {THE_5_MOHAN_SIR_2D_TWINS.map((twin) => {
            const isSelected = selectedTwin.id === twin.id;
            return (
              <div
                key={twin.id}
                onClick={() => {
                  setSelectedTwin(twin);
                  showToast(`Selected: ${twin.title}`);
                }}
                className={`relative rounded-2xl p-3 border-2 transition-all cursor-pointer flex flex-col justify-between group overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border-amber-400 shadow-xl shadow-amber-500/20 scale-[1.02]'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Twin Image */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 border border-slate-800 group-hover:border-slate-700">
                  <img
                    src={twin.imageUrl}
                    alt={twin.title}
                    className="w-full h-full object-cover object-top transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-black text-amber-300 border border-amber-500/30">
                    Twin {twin.number}
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black shadow-lg">
                      ✓
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-amber-400">{twin.badge}</span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{twin.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug">{twin.roleSpecialty}</p>
                </div>

                {/* Select Button */}
                <button
                  type="button"
                  className={`mt-3 w-full py-1.5 px-2 rounded-xl text-[11px] font-black transition flex items-center justify-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {isSelected ? '✓ Using This Twin' : 'Use This Twin'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MAIN 2D PHOTOREALISTIC STAGE & SCRIPT STUDIO CARD               */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div
        ref={stageContainerRef}
        className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col xl:flex-row relative"
      >
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN: 2D PHOTOREALISTIC AVATAR CANVAS STAGE             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col border-b xl:border-b-0 xl:border-r border-slate-800 relative min-h-[520px]">
          {/* Top Stage Bar */}
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300 z-20 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-white font-black tracking-wide uppercase">
                {selectedTwin.title}
              </span>
              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                1080p Pure 2D
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLightingGlow(!showLightingGlow)}
                title="Toggle Studio Lighting Accent"
                className={`p-2 rounded-lg border transition ${
                  showLightingGlow
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleToggleFullscreen}
                title="Toggle Fullscreen"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* 2D Canvas Stage Area */}
          <div
            className="flex-1 relative flex items-center justify-center overflow-hidden p-6 select-none"
            style={{ background: selectedBackdrop.bgStyle }}
          >
            {/* Ambient Lighting Rim Glow */}
            {showLightingGlow && (
              <div
                className="absolute inset-0 pointer-events-none transition-all duration-700"
                style={{
                  background: `radial-gradient(circle at 50% 25%, ${selectedBackdrop.ambientColor} 0%, transparent 65%)`,
                }}
              />
            )}

            {/* Subtle Studio Dais Base Rim */}
            <div className="absolute bottom-4 w-3/4 max-w-md h-8 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 blur-md pointer-events-none" />

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* PHOTOREALISTIC 2D AVATAR PORTRAIT CONTAINER                   */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div
              className={`relative z-10 max-w-sm sm:max-w-md w-full rounded-2xl overflow-hidden border-2 ${selectedBackdrop.borderColor} shadow-2xl transition-transform duration-500 ${
                isSpeaking ? 'scale-[1.01]' : 'scale-100'
              }`}
              style={{
                animation: isSpeaking ? 'none' : 'subtleBreathing 4.5s ease-in-out infinite',
              }}
            >
              {/* High-Definition Mohan Sir 2D Portrait */}
              <img
                src={selectedTwin.imageUrl}
                alt={selectedTwin.title}
                className="w-full h-auto object-cover object-top select-none pointer-events-none block"
                style={{
                  filter: 'contrast(1.03) brightness(1.02)',
                }}
              />

              {/* Natural Eye Blink Overlay */}
              {isBlinking && (
                <div
                  className="absolute inset-x-0 pointer-events-none bg-slate-900/60 backdrop-blur-[1px] transition-all duration-75"
                  style={{
                    top: '28%',
                    height: '6%',
                  }}
                />
              )}

              {/* Neural Mouth Viseme Morph Overlay */}
              {isSpeaking && (
                <div
                  className="absolute pointer-events-none transition-transform duration-100 ease-out"
                  style={{
                    bottom: '34%',
                    left: '42%',
                    width: '16%',
                    height: '8%',
                    transform: `translate(${visemeProps.translateY}) scaleX(${visemeProps.scaleX}) scaleY(${visemeProps.scaleY})`,
                    transformOrigin: 'center center',
                    opacity: visemeProps.opacity,
                  }}
                >
                  <div className="w-full h-full rounded-full bg-red-950/70 border border-amber-900/40 shadow-inner flex items-center justify-center overflow-hidden">
                    <div className="w-3/4 h-[2px] bg-amber-50/70 rounded-full mb-1" />
                  </div>
                </div>
              )}

              {/* Reactive Audio Frequency Visualizer */}
              {isSpeaking && (
                <div className="absolute bottom-3 left-4 right-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">
                      Speaking • Viseme [{currentViseme}]
                    </span>
                  </div>

                  {/* 5-bar Waveform */}
                  <div className="flex items-end gap-1 h-4">
                    {audioLevel.map((lvl, i) => (
                      <div
                        key={i}
                        className="w-1 bg-gradient-to-t from-amber-500 to-amber-300 rounded-full transition-all duration-75"
                        style={{ height: `${lvl}%` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* HD Watermark Tag */}
              <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/80 text-[10px] font-mono text-slate-300 font-bold flex items-center gap-1.5 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Twin {selectedTwin.number} • 1080p HD
              </div>
            </div>
          </div>

          {/* Quick Twin Bar */}
          <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-thin z-20">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 whitespace-nowrap flex items-center gap-1">
              <Camera className="w-3 h-3 text-amber-400" />
              5 2D Twins:
            </span>

            {THE_5_MOHAN_SIR_2D_TWINS.map((twin) => {
              const isSelected = selectedTwin.id === twin.id;
              return (
                <button
                  key={twin.id}
                  onClick={() => {
                    setSelectedTwin(twin);
                    showToast(`Switched to: ${twin.title}`);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 scale-[1.02]'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-700'
                  }`}
                >
                  <img
                    src={twin.imageUrl}
                    alt={twin.title}
                    className="w-5 h-5 rounded-full object-cover border border-black/30"
                  />
                  <span>Twin {twin.number}</span>
                  {isSelected && <Check className="w-3 h-3 text-slate-950" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN: SPEECH SYNTHESIS & SCRIPT CONTROLS               */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="w-full xl:w-[440px] p-6 flex flex-col justify-between bg-slate-950 space-y-6">
          <div className="space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Twin {selectedTwin.number}: Live Voice & Script
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedTwin.roleSpecialty}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Script Prompts */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-amber-400" />
                Quick Preset Scripts (Multilingual):
              </label>
              <div className="grid grid-cols-3 gap-2">
                {QUICK_SCRIPTS.map((qs) => (
                  <button
                    key={qs.label}
                    onClick={() => {
                      setScriptText(qs.text);
                      showToast(`Loaded ${qs.lang} script.`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] font-bold border border-slate-800 hover:border-amber-400/40 text-left truncate transition"
                  >
                    {qs.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Script Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  Script for Twin {selectedTwin.number}:
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {scriptText.length} characters • ~{Math.max(5, Math.round(scriptText.split(/\s+/).length / 2.2))}s
                </span>
              </div>
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                rows={5}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/80 transition leading-relaxed"
                placeholder="Type Hindi, Marathi, or English lecture text here..."
              />
            </div>

            {/* Virtual Backdrop Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-amber-400" />
                Virtual Studio Environment:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {VIRTUAL_BACKDROPS.map((bd) => {
                  const isSelected = selectedBackdrop.id === bd.id;
                  return (
                    <button
                      key={bd.id}
                      onClick={() => setSelectedBackdrop(bd)}
                      className={`px-3 py-2 rounded-xl text-left border transition text-xs font-bold ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="truncate">{bd.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{bd.nameHi}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Speech Cadence Speed Slider */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300 flex items-center gap-1.5 text-[11px]">
                  <Sliders className="w-3 h-3 text-amber-400" />
                  Teaching Pace / Speech Rate:
                </span>
                <span className="text-amber-400 font-mono text-[11px]">{speechRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.25"
                step="0.05"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-1 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            {/* Primary Speak Now CTA */}
            {!isSpeaking ? (
              <button
                onClick={handleStartSpeaking}
                className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer scale-[1.01] hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                ⚡ Speak Now (2D Live Voice & Lip-Sync)
              </button>
            ) : (
              <button
                onClick={handleStopSpeaking}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" />
                ⏹ Stop Speaking
              </button>
            )}

            {/* Workflow Transfer Actions */}
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                onClick={() => {
                  if (onTransferScript) {
                    onTransferScript(scriptText);
                    showToast('Script transferred to Script Studio.');
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Transfer Script
              </button>

              <button
                onClick={() => {
                  if (onQueueRender) {
                    onQueueRender(scriptText, selectedTwin.id);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-indigo-600/20"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Render 1080p
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes subtleBreathing {
          0%,
          100% {
            transform: scale(1) translateY(0px);
          }
          50% {
            transform: scale(1.008) translateY(-1px);
          }
        }
      `}</style>
    </div>
  );
}
