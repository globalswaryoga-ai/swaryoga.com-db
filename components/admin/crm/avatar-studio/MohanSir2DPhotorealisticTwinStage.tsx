'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Pause,
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
  RotateCcw,
  Film,
} from 'lucide-react';

export interface Mohan2DTwin {
  id: string;
  number: number;
  title: string;
  titleHi: string;
  badge: string;
  imageUrl: string;
  videoUrl: string;
  durationSeconds: number;
  roleSpecialty: string;
  description: string;
  voiceDna: string;
  recommendedBackdropId: string;
}

export const THE_5_MOHAN_SIR_2D_TWINS: Mohan2DTwin[] = [
  {
    id: 'twin_1_musetalk',
    number: 1,
    title: 'Twin 1: Sovereign Acharya (MuseTalk 1080p Neural Twin)',
    titleHi: 'ट्विन १: सार्वभौम आचार्य (न्यूरल लिप-सिंक अवतार)',
    badge: 'Neural Lip-Sync',
    imageUrl: '/avatar-twins/twin_1_modi_jacket.jpg',
    videoUrl: '/avatar-twins/twin_1_video.mp4',
    durationSeconds: 10,
    roleSpecialty: 'National & Global Keynotes, Neural Lip-Sync Speaking',
    description: 'Crisp Modi jacket look with real neural mouth viseme articulation and active lip movements.',
    voiceDna: 'Mohan Sir Master DNA (Hindi - Swar Intro)',
    recommendedBackdropId: 'amphitheater',
  },
  {
    id: 'twin_2_whiteboard',
    number: 2,
    title: 'Twin 2: Academic Scientist (Whiteboard Lecture Master)',
    titleHi: 'ट्विन २: वैज्ञानिक व्याख्याता (वाइटबोर्ड मास्टर)',
    badge: 'Whiteboard Master',
    imageUrl: '/avatar-twins/twin_2_white_shirt.jpg',
    videoUrl: '/avatar-twins/twin_2_video.mp4',
    durationSeconds: 10,
    roleSpecialty: 'Whiteboard Anatomy, Jatharagni & Respiratory Science',
    description: 'Clean formal shirt teaching at whiteboard with natural teaching hand gestures and full lip movements.',
    voiceDna: 'Mohan Sir DNA (जठराग्नि व पाचन)',
    recommendedBackdropId: 'classroom',
  },
  {
    id: 'twin_3_professor',
    number: 3,
    title: 'Twin 3: University Professor (Academic Masterclass)',
    titleHi: 'ट्विन ३: विश्वविद्यालय प्राध्यापक (३० से. मास्टरक्लास)',
    badge: 'Academic Authority',
    imageUrl: '/avatar-twins/twin_3_golden_kurta.jpg',
    videoUrl: '/avatar-twins/twin_3_video.mp4',
    durationSeconds: 30,
    roleSpecialty: 'University Level Discourses, Tattva & Breath Rhythm Research',
    description: '30-second continuous 1080p video lecture with active conversational facial dynamics and lip movement.',
    voiceDna: 'Mohan Sir DNA (ऋतु चक्र व स्वर)',
    recommendedBackdropId: 'amphitheater',
  },
  {
    id: 'twin_4_executive',
    number: 4,
    title: 'Twin 4: Keynote Executive (Corporate Boardroom)',
    titleHi: 'ट्विन ४: कॉर्पोरेट व्याख्याता (२० से. एग्जीक्यूटिव)',
    badge: 'Executive Presence',
    imageUrl: '/avatar-twins/twin_4_blue_sadhana.jpg',
    videoUrl: '/avatar-twins/twin_4_video.mp4',
    durationSeconds: 20,
    roleSpecialty: 'Corporate Stress Management, Leadership Prana Activation',
    description: 'Direct executive camera presence with sharp articulation, direct eye contact, and continuous speech.',
    voiceDna: 'Mohan Sir DNA (इड़ा व पिंगला संतुलन)',
    recommendedBackdropId: 'clean_studio',
  },
  {
    id: 'twin_5_mentor',
    number: 5,
    title: 'Twin 5: Intimate Mentor (Philosophy & Q&A Master)',
    titleHi: 'ट्विन ५: आत्मिक गुरु संवाद (३० से. संवाद व समाधान)',
    badge: 'Intimate Teaching',
    imageUrl: '/avatar-twins/twin_5_face_close.jpg',
    videoUrl: '/avatar-twins/twin_5_video.mp4',
    durationSeconds: 30,
    roleSpecialty: '1-on-1 Mentorship, Breath Check, Q&A Punchlines & Humor',
    description: 'Conversational 30-second lecture video with warm smiles, head tilts, and authentic vocal resonance.',
    voiceDna: 'Mohan Sir DNA (दैनिक स्वर परीक्षा)',
    recommendedBackdropId: 'ashram',
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10);
  const [isMuted, setIsMuted] = useState(false);
  const [audioMode, setAudioMode] = useState<'authentic' | 'tts'>('authentic');
  const [audioLevel, setAudioLevel] = useState<number[]>([15, 25, 40, 20, 10]);
  const [showLightingGlow, setShowLightingGlow] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const audioWaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // When Twin changes, reload the video
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.load();
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [selectedTwin.id]);

  // Audio wave animation when video is playing
  useEffect(() => {
    if (!isPlaying) {
      setAudioLevel([12, 18, 22, 16, 10]);
      if (audioWaveTimerRef.current) clearInterval(audioWaveTimerRef.current);
      return;
    }

    audioWaveTimerRef.current = setInterval(() => {
      setAudioLevel([
        Math.floor(25 + Math.random() * 65),
        Math.floor(35 + Math.random() * 60),
        Math.floor(50 + Math.random() * 50),
        Math.floor(30 + Math.random() * 65),
        Math.floor(20 + Math.random() * 55),
      ]);
    }, 80);

    return () => {
      if (audioWaveTimerRef.current) clearInterval(audioWaveTimerRef.current);
    };
  }, [isPlaying]);

  // Video Time & Duration Sync
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || selectedTwin.durationSeconds);
      videoRef.current.playbackRate = playbackSpeed;
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Play / Speak Handler
  const handleStartSpeaking = () => {
    if (!videoRef.current) return;

    if (audioMode === 'tts') {
      // In TTS mode, speak the custom script while looping video lips
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(scriptText);
        utterance.rate = playbackSpeed;
        utterance.pitch = 0.95;

        const voices = window.speechSynthesis.getVoices();
        const hindiVoice = voices.find((v) => v.lang.startsWith('hi') || v.name.includes('Hindi'));
        if (hindiVoice) utterance.voice = hindiVoice;

        utterance.onend = () => {
          if (videoRef.current) videoRef.current.pause();
          setIsPlaying(false);
        };

        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
      videoRef.current.muted = true;
    } else {
      // In Authentic mode, use Mohan Sir's real recorded voice & lips
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      videoRef.current.muted = isMuted;
    }

    videoRef.current.playbackRate = playbackSpeed;
    videoRef.current.play().then(() => {
      setIsPlaying(true);
      showToast(`⚡ ${selectedTwin.title} is speaking with real 2D lip movement!`);
    }).catch((err) => {
      console.warn('Autoplay error:', err);
      showToast('Click play to allow audio in your browser.');
    });
  };

  const handleStopSpeaking = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
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

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

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
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Film className="w-3 h-3" />
                Active 2D Video Twins (Full Lip Movement)
              </span>
              <h2 className="text-base font-black text-white">Select Any of Mohan Sir's 5 2D Digital Twins</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Each twin is a real 1080p high-definition video avatar featuring Mohan Sir speaking with natural lip articulation, facial dynamics, and teaching presence.
            </p>
          </div>

          <div className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <UserCheck className="w-4 h-4" />
            Active: Twin {selectedTwin.number}
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
                  showToast(`Loaded: ${twin.title}`);
                }}
                className={`relative rounded-2xl p-3 border-2 transition-all cursor-pointer flex flex-col justify-between group overflow-hidden ${
                  isSelected
                    ? 'bg-gradient-to-b from-amber-500/20 via-slate-900 to-slate-950 border-amber-400 shadow-xl shadow-amber-500/20 scale-[1.02]'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Twin Image Thumbnail */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden mb-3 border border-slate-800 group-hover:border-slate-700 bg-black">
                  <img
                    src={twin.imageUrl}
                    alt={twin.title}
                    className="w-full h-full object-cover object-top transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-black text-amber-300 border border-amber-500/30">
                    Twin {twin.number}
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300">
                    {twin.durationSeconds}s HD
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
      {/* MAIN 2D VIDEO AVATAR STAGE                                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div
        ref={stageContainerRef}
        className="bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col xl:flex-row relative"
      >
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN: 2D REAL VIDEO AVATAR STAGE                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col border-b xl:border-b-0 xl:border-r border-slate-800 relative min-h-[540px]">
          {/* Top Stage Bar */}
          <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300 z-20 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="text-white font-black tracking-wide uppercase">
                {selectedTwin.title}
              </span>
              <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                1080p Real Lip Movement
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400" />}
              </button>

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

          {/* 2D Video Player Stage Area */}
          <div
            className="flex-1 relative flex items-center justify-center overflow-hidden p-6 select-none bg-black"
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

            {/* Video Container */}
            <div
              className={`relative z-10 max-w-2xl w-full aspect-video rounded-2xl overflow-hidden border-2 ${selectedBackdrop.borderColor} shadow-2xl bg-black flex items-center justify-center`}
            >
              {/* REAL HTML5 VIDEO ELEMENT WITH DIRECT LIP-SYNC & VOICE */}
              <video
                ref={videoRef}
                src={selectedTwin.videoUrl}
                poster={selectedTwin.imageUrl}
                playsInline
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleVideoEnded}
                className="w-full h-full object-contain bg-black"
              />

              {/* Reactive Audio Frequency Visualizer (Pulsing while playing) */}
              {isPlaying && (
                <div className="absolute bottom-3 left-4 right-4 bg-black/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-amber-500/30 flex items-center justify-between z-20">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <div>
                      <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                        Mohan Sir 2D Twin Speaking
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {audioMode === 'authentic' ? 'Authentic Spoken Voice • 1080p Real Lips' : 'AI Custom Script Synthesizer'}
                      </div>
                    </div>
                  </div>

                  {/* 5-bar Waveform */}
                  <div className="flex items-end gap-1 h-5">
                    {audioLevel.map((lvl, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-gradient-to-t from-amber-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-75"
                        style={{ height: `${lvl}%` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* HD Tag */}
              <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/80 text-[10px] font-mono text-slate-300 font-bold flex items-center gap-1.5 shadow-lg z-20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Twin {selectedTwin.number} • 1080p Real Video
              </div>
            </div>
          </div>

          {/* Video Playback Bar Controls */}
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex flex-col gap-2 z-20">
            {/* Timeline Scrubber */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
                {formatSeconds(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 10}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <span className="text-[11px] font-mono text-slate-400 w-10">
                {formatSeconds(duration)}
              </span>
            </div>

            {/* Quick Playback Bar Buttons */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {!isPlaying ? (
                  <button
                    onClick={handleStartSpeaking}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Play / Speak
                  </button>
                ) : (
                  <button
                    onClick={handleStopSpeaking}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    Pause
                  </button>
                )}

                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      setCurrentTime(0);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  title="Restart to Beginning"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Playback speed buttons */}
                <div className="flex items-center gap-1 ml-2 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
                  {[0.8, 1.0, 1.25].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleSpeedChange(spd)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                        playbackSpeed === spd ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                <button
                  onClick={() => {
                    setAudioMode('authentic');
                    showToast('Mode: Authentic Mohan Sir Lecture Voice & Real Lips');
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                    audioMode === 'authentic' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Authentic Voice
                </button>
                <button
                  onClick={() => {
                    setAudioMode('tts');
                    showToast('Mode: AI Custom Script Synthesizer');
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                    audioMode === 'tts' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Custom Script
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN: SCRIPT & STUDIO CONTROLS                         */}
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
                    Twin {selectedTwin.number}: 2D Studio Controls
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
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            {/* Primary Speak Now CTA */}
            {!isPlaying ? (
              <button
                onClick={handleStartSpeaking}
                className="w-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer scale-[1.01] hover:scale-[1.02]"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                ⚡ Speak Now (Real 2D Lip Movement & Voice)
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
    </div>
  );
}
