'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Check,
  ShieldCheck,
  Volume2,
  Video,
  Wand2,
  Download,
  Copy,
  ExternalLink,
  Loader2,
  Film,
  Camera,
  Layers,
  CheckCircle2,
  ArrowRight,
  Flame,
  Globe2,
  User,
  RefreshCw,
  Plus,
} from 'lucide-react';
import {
  ALL_34_PROFESSIONS,
  MASTER_WARDROBES,
  MASTER_VOICE_PROFILES,
  MOHAN_SIR_MASTER_ANTHROPOMETRICS,
  ProfessionConfig,
  WardrobePreset,
  VoiceProfile,
  getProfessionBaseVideo,
} from '@/lib/avatarStudio/avatarMasterCatalog';
import { MOHAN_SIR_MASTER_IDENTITY_ID } from '@/lib/avatarStudio/masterIdentityEngine';

interface AvatarEditStudioProps {
  token?: string | null;
  onNavigateToProduction?: (avatar: any) => void;
}

// Existing audio samples are previews, not validated voice-clone outputs.
const VOICE_PREVIEW_SAMPLES = [
  {
    id: 'voice_dna_01',
    nameHi: 'हिन्दी audio sample',
    nameEn: 'Hindi audio sample',
    lang: 'hi',
    pitch: '130 Hz',
    speed: '115 wpm',
    description: 'Unverified sample recording; this does not establish a trained voice clone.',
    audioUrl: 'https://swaryogacrm.b-cdn.net/voice-clones/dna-39/dna_voice_04f6e33e.mp3',
  },
  {
    id: 'voice_dna_02',
    nameHi: 'मराठी audio sample',
    nameEn: 'Marathi audio sample',
    lang: 'mr',
    pitch: '134 Hz',
    speed: '120 wpm',
    description: 'Unverified sample recording; this does not establish a trained voice clone.',
    audioUrl: 'https://swaryogacrm.b-cdn.net/voice-clones/dna-39/dna_voice_3c2d61d1.mp3',
  },
  {
    id: 'voice_dna_03',
    nameHi: 'English audio sample',
    nameEn: 'English audio sample',
    lang: 'en',
    pitch: '128 Hz',
    speed: '118 wpm',
    description: 'Unverified sample recording; this does not establish a trained voice clone.',
    audioUrl: 'https://swaryogacrm.b-cdn.net/voice-clones/dna-39/dna_voice_77611a12.mp3',
  },
  {
    id: 'voice_dna_04',
    nameHi: 'शांत audio sample',
    nameEn: 'Calm audio sample',
    lang: 'hi',
    pitch: '122 Hz',
    speed: '95 wpm',
    description: 'Unverified sample recording; this does not establish a trained voice clone.',
    audioUrl: 'https://swaryogacrm.b-cdn.net/voice-clones/dna-39/dna_voice_24e24177.mp3',
  },
  {
    id: 'voice_dna_05',
    nameHi: 'कक्षा audio sample',
    nameEn: 'Classroom audio sample',
    lang: 'hi',
    pitch: '138 Hz',
    speed: '125 wpm',
    description: 'Unverified sample recording; this does not establish a trained voice clone.',
    audioUrl: 'https://swaryogacrm.b-cdn.net/voice-clones/dna-39/dna_voice_a1ecbc93.mp3',
  },
  {
    id: 'voice_dna_06',
    nameHi: 'परामर्श audio sample',
    nameEn: 'Counseling audio sample',
    lang: 'hi',
    pitch: '126 Hz',
    speed: '110 wpm',
    description: 'Unverified sample recording; this does not establish a trained voice clone.',
    audioUrl: 'https://swaryogacrm.b-cdn.net/voice-clones/dna-39/dna_voice_21f64627.mp3',
  },
];

const SUGGESTED_PROMPTS = [
  'स्वर योग में सूर्य नाड़ी (Pingala) के 5 चमत्कारी लाभ और दोपहर के भोजन का सही समय।',
  'चंद्र नाड़ी (Ida) और रात्रि में शांत गहरी निद्रा प्राप्त करने का यौगिक विज्ञान।',
  'सुषुम्ना नाड़ी का प्रवाह कैसे पहचानें और ध्यान में कुंडलिनी जागरण का अनुभव।',
  'कॉर्पोरेट तनाव और अनिर्णय की स्थिति में श्वास बदलकर तुरंत मानसिक स्पष्टता पाएं।',
  'जठराग्नि और आहार शास्त्र: स्वर के अनुसार जल व भोजन ग्रहण करने के नियम।',
];

export default function AvatarEditStudio({
  token,
  onNavigateToProduction,
}: AvatarEditStudioProps) {
  // Active Selections
  const [selectedVoice, setSelectedVoice] = useState(VOICE_PREVIEW_SAMPLES[0]);
  const [selectedAspect, setSelectedAspect] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [selectedLanguage, setSelectedLanguage] = useState<'hi' | 'mr' | 'en'>('hi');

  // Prompt State
  const [promptInput, setPromptInput] = useState(SUGGESTED_PROMPTS[0]);

  // Audio Playback
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Video Generation Process
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [avatarProfiles, setAvatarProfiles] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedAvatarProfileId, setSelectedAvatarProfileId] = useState('');
  const [sourceVideoUrl, setSourceVideoUrl] = useState('');
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [speechInputMode, setSpeechInputMode] = useState<'recorded' | 'tts'>('recorded');
  const [recordedAudioStoragePath, setRecordedAudioStoragePath] = useState('');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState('');
  const [isUploadingRecordedAudio, setIsUploadingRecordedAudio] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    let active = true;
    if (!token) {
      setGenerationError('Sign in again to load consented avatar profiles.');
      return () => {
        active = false;
      };
    }

    fetch('/api/avatar/creator', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load consented avatar profiles.');
        }
        return json.profiles as Array<{ id: string; name: string }>;
      })
      .then((profiles) => {
        if (!active) return;
        setAvatarProfiles(profiles);
        setSelectedAvatarProfileId((current) => current || profiles[0]?.id || '');
      })
      .catch((error: unknown) => {
        if (active) setGenerationError(error instanceof Error ? error.message : 'Failed to load avatar profiles.');
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!generationJobId || !token) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const pollJob = async () => {
      try {
        const res = await fetch(`/api/avatar/inhouse/video?jobId=${encodeURIComponent(generationJobId)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok || !json.success || !json.job) {
          throw new Error(json.error || 'Could not read the render job status.');
        }
        if (!active) return;

        const job = json.job;
        if (job.status === 'completed' && job.videoUrl) {
          setGeneratedVideoUrl(job.videoUrl);
          setGenerationStep('Completed by the in-house worker.');
          setIsGenerating(false);
          setGenerationJobId(null);
          return;
        }
        if (job.status === 'failed') {
          setGenerationError(job.errorMessage || 'The in-house render worker reported a failure.');
          setIsGenerating(false);
          setGenerationJobId(null);
          return;
        }

        const stageByStatus: Record<string, string> = {
          synthesizing_speech: 'Preparing speech preview…',
          ready_for_worker: 'Queued; waiting for the configured GPU worker. No video has been rendered yet.',
          rendering_video: 'The configured worker is rendering the video…',
        };
        setGenerationStep(stageByStatus[job.status] || `Job status: ${job.status}`);
        timer = setTimeout(pollJob, 5000);
      } catch (error) {
        if (!active) return;
        setGenerationError(error instanceof Error ? error.message : 'Could not read the render job status.');
        setIsGenerating(false);
      }
    };

    void pollJob();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [generationJobId, token]);

  // Play / Pause Voice Samples
  const handleToggleVoicePreview = (voice: typeof VOICE_PREVIEW_SAMPLES[0]) => {
    if (playingVoiceId === voice.id) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingVoiceId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(voice.audioUrl);
      audioPlayerRef.current = audio;
      setPlayingVoiceId(voice.id);
      audio.play().catch(() => setPlayingVoiceId(null));
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = () => setPlayingVoiceId(null);
    }
  };

  // 1-Click Prompt to Video Generation
  const handleRecordedAudioUpload = async (file?: File) => {
    if (!file || !token) return;
    setIsUploadingRecordedAudio(true);
    setGenerationError(null);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const response = await fetch('/api/avatar/inhouse/audio/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.audioStoragePath || !result.audioUrl) {
        throw new Error(result.error || 'Could not upload recorded speech.');
      }
      setRecordedAudioStoragePath(result.audioStoragePath);
      setRecordedAudioUrl(result.audioUrl);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Could not upload recorded speech.');
    } finally {
      setIsUploadingRecordedAudio(false);
    }
  };

  const handleConvertPromptToVideo = async () => {
    if (speechInputMode === 'tts' && !promptInput.trim()) {
      showToast('⚠️ कृपया कोई प्रॉम्प्ट या विषय लिखें!');
      return;
    }
    if (speechInputMode === 'recorded' && !recordedAudioStoragePath) {
      setGenerationError('Upload your recorded MP3/WAV speech before queuing this job.');
      return;
    }
    if (!selectedAvatarProfileId || !token) {
      setGenerationError(!token ? 'Sign in again before creating a render job.' : 'Select a saved, consented avatar profile first.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedVideoUrl(null);
    setGenerationStep('Submitting to the consent-gated in-house queue…');

    try {
      const res = await fetch('/api/avatar/inhouse/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          avatarProfileId: selectedAvatarProfileId,
          sourceVideoUrl: sourceVideoUrl.trim(),
          backgroundId: 'bg_kitchen',
          clothingId: 'cloth_white_kurta',
          posture: 'sitting',
          language: selectedLanguage,
          script: speechInputMode === 'recorded' ? '' : promptInput,
          audioStoragePath: speechInputMode === 'recorded' ? recordedAudioStoragePath : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.job?.id) {
        throw new Error(json.error || 'Failed to submit the in-house render job.');
      }
      setGenerationJobId(json.job.id);
      setGenerationStep(json.message || 'Queued for the in-house render worker.');
    } catch (error: unknown) {
      setGenerationError(error instanceof Error ? error.message : 'Failed to submit the render job.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 text-slate-100 font-[-apple-system,BlinkMacSystemFont,system-ui,'Kohinoor_Devanagari','Segoe_UI',Roboto,sans-serif]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-400/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5 text-amber-200" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MASTER IDENTITY HEADER & ANTHROPOMETRIC SPECS                          */}
      {/* ========================================================================= */}
      <div className="relative rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl border-2 border-amber-400/50 bg-slate-950 flex flex-col items-center justify-center gap-1 text-center">
                <Camera className="w-6 h-6 text-amber-300" aria-hidden="true" />
                <span className="text-[8px] text-slate-400">New image needed</span>
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-white">मोहन कलबुर्गी — Avatar Prototype</h2>
                <span className="bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Likeness and voice not validated
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Reference catalog metadata only • no verified identity model, voice clone, or neural render
              </p>
              {/* Anthropometric Badge Row */}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] font-semibold text-slate-300">
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
                  📏 ऊँचाई: <strong className="text-amber-300">167 cm</strong>
                </span>
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
                  ⚖️ वज़न: <strong className="text-amber-300">पुष्टि बाकी</strong>
                </span>
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
                  कंधे: <strong className="text-amber-300">18.5&quot;</strong>
                </span>
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
                  छाती: <strong className="text-amber-300">41&quot;</strong>
                </span>
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
                  कमर: <strong className="text-amber-300">32&quot;</strong>
                </span>
                <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/80">
                  हिप्स: <strong className="text-amber-300">38&quot;</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/crm/mohan-rag/avatar-studio"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>पूर्ण 10-स्टूडियो खोलें</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1B. 4-GOOGLE ACCOUNT MULTI-GPU AUTO-SWITCH ENGINE                          */}
      {/* ========================================================================= */}
      <div className="rounded-2xl p-4 bg-slate-900 border border-emerald-500/30 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-white flex items-center gap-2">
                <span>GPU Render Status</span>
                <span className="bg-amber-500/15 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30">
                  Not connected
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                No inference worker is configured. The current adapter returns HTTP 501; queued jobs do not produce videos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://colab.research.google.com/github/globalswaryoga-ai/swaryoga.com-db/blob/main/public/colab/Mohan_Sir_Multilingual_LipSync_Pilot.ipynb"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Lip-Sync Preflight</span>
            </a>
            <a
              href="/colab/Mohan_Sir_Multilingual_LipSync_Pilot.ipynb"
              download="Mohan_Sir_Multilingual_LipSync_Pilot.ipynb"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download preflight</span>
            </a>
          </div>
        </div>

        <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200">
          The Colab link below is a metadata preflight, not a GPU worker or render engine.
        </p>
      </div>
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: CONTROLS (8 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100">
            Old avatar photos and preset looks have been retired. A fresh approved reference image and authorized source footage are required before a new twin can be prepared.
          </div>

          {/* ───────────────────────────────────────────────────────────────────── */}
          {/* STEP 2: CHOOSE AUTHENTIC REAL VOICE (WITH 1-CLICK AUDIO PREVIEW)      */}
          {/* ───────────────────────────────────────────────────────────────────── */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                स्टेप 2: Audio samples (preview only)
              </h3>
              <span className="text-[11px] text-slate-400">
                चयनित: <strong className="text-white">{selectedVoice.nameHi}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {VOICE_PREVIEW_SAMPLES.map((voice) => {
                const isSel = selectedVoice.id === voice.id;
                const isPlaying = playingVoiceId === voice.id;

                return (
                  <div
                    key={voice.id}
                    onClick={() => {
                      setSelectedVoice(voice);
                      showToast(`🎙️ चयनित आवाज़: ${voice.nameHi}`);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                      isSel
                        ? 'bg-emerald-500/15 border-emerald-400 shadow-md ring-1 ring-emerald-400/30'
                        : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white truncate">{voice.nameHi}</span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-500/30">
                          {voice.lang.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                        {voice.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 font-mono">
                        <span>पिच: {voice.pitch}</span>
                        <span>•</span>
                        <span>गति: {voice.speed}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleVoicePreview(voice);
                      }}
                      className={`p-2.5 rounded-xl border transition active:scale-95 cursor-pointer shrink-0 ${
                        isPlaying
                          ? 'bg-emerald-500 text-black border-emerald-400 animate-pulse'
                          : 'bg-slate-800 hover:bg-emerald-600 hover:text-black text-slate-200 border-slate-700'
                      }`}
                      title={isPlaying ? 'रोकें' : 'आवाज़ सुनें'}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-amber-300">
              These samples are unverified and are not used when you select My recorded speech.
            </p>
          </div>

          {/* ───────────────────────────────────────────────────────────────────── */}
          {/* STEP 3: PROMPT TO VIDEO ENGINE ("ANY PROMPT CAN CONVERT IN VIDEO")    */}
          {/* ───────────────────────────────────────────────────────────────────── */}
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                स्टेप 3: Recorded speech or TTS preview
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">भाषा:</span>
                {(['hi', 'mr', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setSelectedLanguage(l)}
                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase transition ${
                      selectedLanguage === l
                        ? 'bg-amber-500 text-black'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {l === 'hi' ? 'हिन्दी' : l === 'mr' ? 'मराठी' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Topic Chips */}
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_PROMPTS.map((promptText, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPromptInput(promptText)}
                  className="text-[11px] text-slate-300 bg-slate-800/80 hover:bg-slate-700 hover:text-white border border-slate-700/80 px-2.5 py-1 rounded-lg transition text-left truncate max-w-full cursor-pointer"
                >
                  💡 {promptText.slice(0, 38)}...
                </button>
              ))}
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-1.5">
              <label htmlFor="consented-avatar-profile" className="block text-xs font-bold text-slate-200">
                Consent-verified avatar profile
              </label>
              <select
                id="consented-avatar-profile"
                value={selectedAvatarProfileId}
                onChange={(event) => setSelectedAvatarProfileId(event.target.value)}
                disabled={isGenerating}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white disabled:opacity-60"
              >
                <option value="">Select a saved profile</option>
                {avatarProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
              <label htmlFor="avatar-source-video-url" className="block text-xs font-bold text-slate-200">
                Authorized continuous source footage (Bunny MP4 URL)
              </label>
              <input
                id="avatar-source-video-url"
                type="url"
                value={sourceVideoUrl}
                onChange={(event) => setSourceVideoUrl(event.target.value)}
                placeholder="https://swaryogacrm.b-cdn.net/…/authorized-source.mp4"
                disabled={isGenerating}
                autoComplete="url"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500"
              />
              <p className="text-[11px] text-slate-400">
                A still image or synthetic sample is not valid source footage and will not be rendered as talking video.
              </p>
              <fieldset className="space-y-2 rounded-xl border border-slate-800 p-3">
                <legend className="px-1 text-xs font-bold text-slate-200">Speech input</legend>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSpeechInputMode('recorded')} aria-pressed={speechInputMode === 'recorded'} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">
                    My recorded speech
                  </button>
                  <button type="button" onClick={() => setSpeechInputMode('tts')} aria-pressed={speechInputMode === 'tts'} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">
                    TTS preview
                  </button>
                </div>
                {speechInputMode === 'recorded' ? (
                  <>
                    <label className="block text-xs text-slate-300">
                      Upload MP3/WAV recording (max 25 MB)
                      <input
                        type="file"
                        accept=".mp3,.wav,audio/mpeg,audio/wav"
                        onChange={(event) => void handleRecordedAudioUpload(event.currentTarget.files?.[0])}
                        disabled={isUploadingRecordedAudio || isGenerating}
                        className="mt-1 block w-full text-xs"
                      />
                    </label>
                    {isUploadingRecordedAudio && <p className="text-xs text-slate-400">Uploading recording…</p>}
                    {recordedAudioUrl && <audio controls src={recordedAudioUrl} className="w-full" />}
                    <p className="text-[11px] text-amber-300">This queues recorded audio only; the GPU adapter does not render a video yet.</p>
                  </>
                ) : (
                  <>
                    <textarea
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="यहाँ कोई भी विषय, सवाल या व्याख्यान का प्रॉम्प्ट लिखें..."
                      rows={4}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 resize-none font-sans leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-400">TTS preview only; this is not your recorded voice.</p>
                  </>
                )}
              </fieldset>
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                {speechInputMode === 'tts' && <span>अक्षर: {promptInput.length} • अनुमानित अवधि: ~{Math.max(15, Math.round(promptInput.length / 8))} सेकंड</span>}
                <div className="flex items-center gap-2">
                  <span className="font-semibold">आस्पेक्ट रेशियो:</span>
                  {(['16:9', '9:16', '1:1'] as const).map((asp) => (
                    <button
                      key={asp}
                      type="button"
                      onClick={() => setSelectedAspect(asp)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedAspect === asp ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {asp}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">
                  The current queue prepares speech and waits for a configured GPU worker. The selected sample voice, aspect ratio, and avatar look are not applied by the renderer yet.
                </p>
                {generationError && (
                  <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-200">
                    {generationError}
                  </p>
                )}
                {generationStep && (
                  <p className="text-xs text-amber-200">{generationStep}</p>
                )}
              </div>
            </div>

            {/* Generate Action Button */}
            <button
              type="button"
              onClick={handleConvertPromptToVideo}
              disabled={
                isGenerating ||
                !selectedAvatarProfileId ||
                !sourceVideoUrl.trim() ||
                (speechInputMode === 'recorded' && (!recordedAudioStoragePath || isUploadingRecordedAudio)) ||
                (speechInputMode === 'tts' && !promptInput.trim())
              }
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{generationStep || 'वीडियो तैयार हो रहा है...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Send to in-house render queue</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE VIDEO PREVIEW & PRODUCTION EXPORT (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 sticky top-20">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                Unverified source or completed render
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                output pending
              </span>
            </div>

            {/* HTML5 Video Player */}
            {generatedVideoUrl ? (
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-700 shadow-inner group">
                <video
                  key={generatedVideoUrl}
                  src={generatedVideoUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-xl border border-dashed border-slate-700 bg-slate-950 flex items-center justify-center p-6 text-center text-xs text-slate-400">
                No render output yet. A queued job is not a completed video.
              </div>
            )}

            {/* Video Specs Card */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">लुक परिधान:</span>
                <span className="font-bold text-white">
                  {avatarProfiles.find((profile) => profile.id === selectedAvatarProfileId)?.name || 'No profile selected'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">आवाज़:</span>
                <span className="font-bold text-emerald-400">{selectedVoice.nameHi.slice(0, 24)}...</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">क्वालिटी:</span>
                <span className="font-mono text-amber-300">{generatedVideoUrl ? 'Worker output available' : 'Not rendered'}</span>
              </div>
              {generatedVideoUrl && <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">सीडीएन लिंक:</span>
                <a
                  href={generatedVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline truncate max-w-[200px] text-[11px] font-mono flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span>{generatedVideoUrl.split('/').pop()}</span>
                </a>
              </div>}
            </div>

            {/* Direct Send to Final Video Production CTA */}
            {onNavigateToProduction && generatedVideoUrl && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToProduction({
                    id: selectedAvatarProfileId,
                    name: avatarProfiles.find((profile) => profile.id === selectedAvatarProfileId)?.name || 'Avatar profile',
                    video_url: generatedVideoUrl,
                    voice_id: selectedVoice.id,
                  });
                  showToast('🎬 फाइनल वीडियो प्रोडक्शन में भेजा गया!');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <span>फाइनल वीडियो प्रोडक्शन में भेजें (Step 6)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-200/90 leading-relaxed">
              💡 <strong>नोट:</strong> The library displays a video only after the in-house worker reports a completed Bunny-hosted render.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
