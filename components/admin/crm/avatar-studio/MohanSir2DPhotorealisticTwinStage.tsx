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
} from 'lucide-react';

interface AttireLook {
  id: string;
  title: string;
  titleHi: string;
  badge: string;
  imageUrl: string;
  description: string;
  framing: 'chest_up' | 'waist_up' | 'close_up';
}

const MOHAN_SIR_HD_LOOKS: AttireLook[] = [
  {
    id: 'charcoal_whiteboard',
    title: 'Academic Presentation Look',
    titleHi: 'चैस्ट-अप एकेडमिक व वाइटबोर्ड व्याख्याता',
    badge: 'Whiteboard Master',
    imageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
    description: 'Charcoal waistcoat, light collared shirt, direct teaching eye contact with authoritative warmth.',
    framing: 'chest_up',
  },
  {
    id: 'sadhana_meditation',
    title: 'Deep Pranayama & Meditation Look',
    titleHi: 'शांत प्राणायाम व ध्यान साधना (Oceanic Blue)',
    badge: 'Pranayama Master',
    imageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_pranayama_master.jpg',
    description: 'Oceanic blue sadhana attire, hands raised in sacred mudra, deep meditative presence.',
    framing: 'chest_up',
  },
  {
    id: 'sitting_anchor',
    title: 'Sitting Anchor & Conversational Look',
    titleHi: 'चेस्ट-अप सिटिंग एंकर (क्लासिक खादी)',
    badge: 'Daily Masterclass',
    imageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_chest_up_master.jpg',
    description: 'Classic khadi look, natural conversational angle for daily Swar Yoga lectures and QA sessions.',
    framing: 'chest_up',
  },
  {
    id: 'close_texture',
    title: 'High-Definition Facial Close-Up',
    titleHi: 'क्लोज-अप फेशियल टेक्सचर (Skin, Beard & Eyes)',
    badge: 'Micro Expressions',
    imageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_close_blackbeard.jpg',
    description: 'Ultra-sharp skin texture, focused eye gaze, calibrated for neural lip-sync fine tuning.',
    framing: 'close_up',
  },
  {
    id: 'left_profile',
    title: 'Dynamic Left 45° Teaching Angle',
    titleHi: 'बायां प्रोफ़ाइल (Left 45° Perspective)',
    badge: 'Multi-Angle',
    imageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_left_1080p.jpg',
    description: 'Three-quarter left angle for natural conversational flow and multi-speaker webinars.',
    framing: 'chest_up',
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
  const [selectedLook, setSelectedLook] = useState<AttireLook>(MOHAN_SIR_HD_LOOKS[0]);
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

  // Natural Eye Blink Cycle (Every 3.5 to 5.5 seconds)
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
    utterance.pitch = 0.95; // Mohan Sir has a warm, deep resonance

    // Try finding Hindi or Indian English voice
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
      showToast('⚡ Mohan Sir 2D Twin is speaking with real-time lip-sync.');
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

  // Viseme CSS / SVG Morph Values
  // A: Open mouth (jaw dropped)
  // O: Rounded funnel mouth
  // E: Wide smile
  // M: Lips closed pressed
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

      {/* Main Twin Studio Card */}
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
                Mohan Sir 2D Photorealistic Twin (1080p HD)
              </span>
              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                {selectedLook.badge}
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
                // Natural thoracic breathing animation: gentle sinusoidal expansion
                animation: isSpeaking ? 'none' : 'subtleBreathing 4.5s ease-in-out infinite',
              }}
            >
              {/* High-Definition Mohan Sir Portrait */}
              <img
                src={selectedLook.imageUrl}
                alt={selectedLook.title}
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
                  {/* Natural mouth cavity & lip line */}
                  <div className="w-full h-full rounded-full bg-red-950/70 border border-amber-900/40 shadow-inner flex items-center justify-center overflow-hidden">
                    {/* Subtle teeth highlight */}
                    <div className="w-3/4 h-[2px] bg-amber-50/70 rounded-full mb-1" />
                  </div>
                </div>
              )}

              {/* Reactive Audio Frequency Visualizer (Pulses when speaking) */}
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
                1080p Master 2D Twin
              </div>
            </div>
          </div>

          {/* Quick Attire Look Switcher Bar */}
          <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-thin z-20">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 whitespace-nowrap flex items-center gap-1">
              <Camera className="w-3 h-3 text-amber-400" />
              Verified Looks:
            </span>

            {MOHAN_SIR_HD_LOOKS.map((look) => {
              const isSelected = selectedLook.id === look.id;
              return (
                <button
                  key={look.id}
                  onClick={() => {
                    setSelectedLook(look);
                    showToast(`Look switched to: ${look.title}`);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 scale-[1.02]'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-700'
                  }`}
                >
                  <img
                    src={look.imageUrl}
                    alt={look.title}
                    className="w-5 h-5 rounded-full object-cover border border-black/30"
                  />
                  <span>{look.badge}</span>
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
                    2D Live Speech & Script Studio
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Real-time neural lip-sync matching Mohan Sir's authentic lecture tone.
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
                  Script for Mohan Sir 2D Twin:
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
                    onQueueRender(scriptText, selectedLook.id);
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
