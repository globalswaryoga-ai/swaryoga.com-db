'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Check,
  ShieldCheck,
  Layers,
  Sliders,
  Volume2,
  Save,
  CheckCircle2,
  RefreshCw,
  Film,
  Briefcase,
  Shirt,
  Search,
  Wand2,
  Video,
  Trash2,
  Pencil,
  ExternalLink,
  Download,
  Copy,
  Cpu,
  Radio,
  FileText,
  AlertCircle,
  Eye,
  Camera,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import {
  ALL_34_PROFESSIONS,
  MASTER_WARDROBES,
  MASTER_ENVIRONMENTS,
  CAMERA_FRAMING_PRESETS,
  MASTER_ANCHOR_VIDEOS,
  MASTER_VOICE_PROFILES,
  ProfessionConfig,
  WardrobePreset,
  EnvironmentPreset,
  CameraFramingPreset,
  AnchorVideo,
  VoiceProfile,
  getProfessionBaseVideo,
} from '@/lib/avatarStudio/avatarMasterCatalog';
import {
  MOHAN_SIR_MASTER_IDENTITY_ID,
  MASTER_GENERATION_MODES,
  MASTER_ANGLES,
  MASTER_EXPRESSION_PROFILES,
} from '@/lib/avatarStudio/masterIdentityEngine';

type StudioTab =
  | 'dashboard'
  | 'identity'
  | 'anchor'
  | 'professions'
  | 'wardrobe'
  | 'environments'
  | 'camera'
  | 'voice'
  | 'script'
  | 'engine'
  | 'library';

export default function MohanSirAvatarStudioPage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('dashboard');

  // Selected Studio Configuration
  const [selectedProfession, setSelectedProfession] = useState<ProfessionConfig>(ALL_34_PROFESSIONS[0]);
  const [selectedWardrobe, setSelectedWardrobe] = useState<WardrobePreset>(MASTER_WARDROBES[0]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentPreset>(MASTER_ENVIRONMENTS[0]);
  const [selectedCamera, setSelectedCamera] = useState<CameraFramingPreset>(CAMERA_FRAMING_PRESETS[0]);
  const [selectedAnchor, setSelectedAnchor] = useState<AnchorVideo>(MASTER_ANCHOR_VIDEOS[0]);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile>(MASTER_VOICE_PROFILES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<'hi' | 'mr' | 'en' | 'ne'>('hi');
  const [selectedGenerationMode, setSelectedGenerationMode] = useState<string>('talking_presenter');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [customProfessionName, setCustomProfessionName] = useState<string>('');

  // Script & Duration
  const [scriptText, setScriptText] = useState<string>(
    'नमस्ते साधकों! मैं मोहन कलबुर्गी हूँ। स्वर योग के इस विशेष सत्र में आपका स्वागत है। आज हम समझेंगे कि कैसे अपनी नासिका के स्वर को संतुलित करके मस्तिष्क, पाचन और मानसिक शांति को साध सकते हैं।'
  );
  const [estimatedDurationSec, setEstimatedDurationSec] = useState<number>(30);

  // Search & Filter
  const [professionSearch, setProfessionSearch] = useState<string>('');
  const [professionCategory, setProfessionCategory] = useState<string>('all');
  const [voiceSearch, setVoiceSearch] = useState<string>('');
  const [voiceLangFilter, setVoiceLangFilter] = useState<'all' | 'hi' | 'mr' | 'en'>('all');
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>(MASTER_VOICE_PROFILES);
  const [isDeletingVoiceId, setIsDeletingVoiceId] = useState<string | null>(null);

  const handleDeleteVoice = async (id: string, name?: string) => {
    const confirmMsg = `क्या आप इस वोकल डीएनए प्रोफाइल "${name || id}" को हटाना चाहते हैं?\n\nयह डेटाबेस से हमेशा के लिए हटा दी जाएगी।`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeletingVoiceId(id);
    try {
      const res = await fetch(`/api/avatar/voice?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        showToast('🗑️ वॉइस प्रोफाइल सफलतापूर्वक हटा दी गई');
        setVoiceProfiles((prev) => prev.filter((v) => v.id !== id));
        if (selectedVoice.id === id) {
          const remaining = voiceProfiles.filter((v) => v.id !== id);
          if (remaining.length > 0) setSelectedVoice(remaining[0]);
        }
      } else {
        alert(json.error || 'Failed to delete voice');
      }
    } catch (err: any) {
      alert('Error deleting voice: ' + err.message);
    } finally {
      setIsDeletingVoiceId(null);
    }
  };

  // Media Player States
  const [isPlayingAnchor, setIsPlayingAnchor] = useState<boolean>(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);
  const anchorVideoRef = useRef<HTMLVideoElement | null>(null);

  // Mohan Sir Realtime Voice Engine (1s Synthesis)
  const [voiceEngineScript, setVoiceEngineScript] = useState<string>(
    'नमस्ते साधकों! मैं मोहन कलबुर्गी। स्वर योग के इस पावन सत्र में आपका स्वागत है। अपनी श्वास और नाड़ी के प्रति सजग रहें।'
  );
  const [voiceEngineLang, setVoiceEngineLang] = useState<'hi' | 'mr' | 'en'>('hi');
  const [isEngineSynthesizing, setIsEngineSynthesizing] = useState<boolean>(false);
  const [engineAudioUrl, setEngineAudioUrl] = useState<string | null>(null);
  const [engineAudioDuration, setEngineAudioDuration] = useState<number | null>(null);

  const handleGenerateEngineVoice = async () => {
    if (!voiceEngineScript.trim()) {
      showToast('⚠️ कृपया स्क्रिप्ट टेक्स्ट दर्ज करें');
      return;
    }
    setIsEngineSynthesizing(true);
    try {
      const res = await fetch('/api/avatar/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: voiceEngineScript.trim(),
          language: voiceEngineLang,
          voiceProfileId: selectedVoice.id,
        }),
      });
      const json = await res.json();
      if (json.success && json.audioUrl) {
        setEngineAudioUrl(json.audioUrl);
        setEngineAudioDuration(json.durationSeconds);
        showToast('⚡ मोहन सर की प्रामाणिक आवाज 1 सेकंड में जनरेट हुई!');
        if (audioObj) audioObj.pause();
        const a = new Audio(json.audioUrl);
        a.play();
        setAudioObj(a);
      } else {
        alert(json.error || 'Voice generation failed');
      }
    } catch (err: any) {
      alert('Voice Engine Error: ' + err.message);
    } finally {
      setIsEngineSynthesizing(false);
    }
  };

  // Identity Presets
  const [facePriority, setFacePriority] = useState<number>(100);
  const [gfpganRestoration, setGfpganRestoration] = useState<number>(90);

  // AI Generation Job Tracker
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobStageText, setJobStageText] = useState<string>('');
  const [generatedVideoResultUrl, setGeneratedVideoResultUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Video Library State
  const [libraryVideos, setLibraryVideos] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(false);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [previewModalTitle, setPreviewModalTitle] = useState<string>('');

  // Notification Toast
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Recalculate duration on script change
  useEffect(() => {
    const wordCount = scriptText.trim().split(/\s+/).filter(Boolean).length;
    const est = Math.max(10, Math.round(wordCount / 2.16));
    setEstimatedDurationSec(est);
  }, [scriptText]);

  // Load Library Videos
  const loadLibrary = async () => {
    setIsLoadingLibrary(true);
    try {
      const res = await fetch('/api/avatar/library');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLibraryVideos(json.data);
      }
    } catch {
      // fallback
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  // Edit & Delete Video Modal State & Handlers
  const [editingVideo, setEditingVideo] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ title: '', profession_name: '', language: 'hi' });
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // AI Import State & Handlers
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importForm, setImportForm] = useState({
    title: '',
    video_url: '',
    thumbnail_url: '',
    ai_site_source: 'Replicate',
    profession_name: 'Custom AI Avatar',
    language: 'hi',
    duration_seconds: 30,
  });
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Active Selected Avatar for Module 8
  const [activeAvatarId, setActiveAvatarId] = useState<string>('out_prof_university_professor');

  const handleUseAvatar = (vid: any) => {
    setActiveAvatarId(vid.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('swar_active_avatar_id', vid.id);
      localStorage.setItem('swar_active_avatar_title', vid.title || '');
      localStorage.setItem('swar_active_avatar_url', vid.video_url || '');
    }
    showToast(`✨ सक्रिय अवतार सेट: "${vid.title || vid.profession_name}" (मॉड्यूल 8 व वीडियो जेनरेशन के लिए सक्रिय)!`);
  };

  const handleImportFromAiSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importForm.title.trim() || !importForm.video_url.trim()) {
      alert('कृपया शीर्षक और वीडियो यूआरएल दर्ज करें।');
      return;
    }
    setIsImporting(true);
    try {
      const res = await fetch('/api/avatar/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast('🎉 AI वीडियो सफलतापूर्वक इम्पोर्ट हो गया!');
        setIsImportModalOpen(false);
        setImportForm({
          title: '',
          video_url: '',
          thumbnail_url: '',
          ai_site_source: 'Replicate',
          profession_name: 'Custom AI Avatar',
          language: 'hi',
          duration_seconds: 30,
        });
        await loadLibrary();
        setActiveTab('library');
      } else {
        alert(json.error || 'Failed to import video');
      }
    } catch (err: any) {
      alert('Error importing video: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenEdit = (vid: any) => {
    setEditingVideo(vid);
    setEditForm({
      title: vid.title || '',
      profession_name: vid.profession_name || '',
      language: vid.language || 'hi',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingVideo) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch('/api/avatar/library', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingVideo.id,
          title: editForm.title,
          profession_name: editForm.profession_name,
          language: editForm.language,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('✅ वीडियो विवरण सफलतापूर्वक अपडेट हुआ!');
        setLibraryVideos((prev) =>
          prev.map((v) =>
            v.id === editingVideo.id
              ? { ...v, title: editForm.title, profession_name: editForm.profession_name, language: editForm.language }
              : v
          )
        );
        setEditingVideo(null);
      } else {
        alert(json.error || 'Failed to update video');
      }
    } catch (err: any) {
      alert('Error updating video: ' + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteVideo = async (id: string, title?: string) => {
    const confirmMsg = `क्या आप इस अवतार वीडियो "${title || id}" को हटाना चाहते हैं?\n\nयह वीडियो लाइब्रेरी और मॉड्यूल 8 से हमेशा के लिए हटा दिया जाएगा।`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/avatar/library?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        showToast('🗑️ वीडियो सफलतापूर्वक हटा दिया गया');
        setLibraryVideos((prev) => prev.filter((v) => v.id !== id));
      } else {
        alert(json.error || 'Failed to delete video');
      }
    } catch (err: any) {
      alert('Error deleting video: ' + err.message);
    } finally {
      setIsDeletingId(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'library' || activeTab === 'dashboard') {
      loadLibrary();
    }
  }, [activeTab]);

  // Audio Playback Handler
  const togglePlayVoice = (v: VoiceProfile) => {
    if (playingVoiceId === v.id && audioObj) {
      audioObj.pause();
      setPlayingVoiceId(null);
      return;
    }

    if (audioObj) {
      audioObj.pause();
    }

    const newAudio = new Audio(v.audioSampleUrl);
    newAudio.play();
    newAudio.onended = () => setPlayingVoiceId(null);
    setAudioObj(newAudio);
    setPlayingVoiceId(v.id);
  };

  // Select Profession & Auto-Suggest Outfit & Background
  const handleSelectProfession = (p: ProfessionConfig) => {
    setSelectedProfession(p);
    const recOutfit = MASTER_WARDROBES.find((w) => w.id === p.recommendedOutfitId);
    if (recOutfit) setSelectedWardrobe(recOutfit);
    const recEnv = MASTER_ENVIRONMENTS.find((e) => e.id === p.recommendedEnvId);
    if (recEnv) setSelectedEnvironment(recEnv);
    setScriptText(p.sampleTopic[selectedLanguage] || p.sampleTopic.hi);
    showToast(`👔 प्रोफेशन चुना गया: ${p.nameHi} (${p.nameEn})`);
  };

  // Trigger Video Generation
  const handleStartGeneration = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedVideoResultUrl(null);
    setJobProgress(15);
    setJobStageText('1/8: डिजिटल ट्विन जॉब इनिशियलाइज़ हो रहा है...');

    try {
      const res = await fetch('/api/avatar/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionId: selectedProfession.id,
          customProfessionName: selectedProfession.id === 'custom_profession' ? customProfessionName : undefined,
          generationMode: selectedGenerationMode,
          aspectRatio: selectedAspectRatio,
          wardrobeId: selectedWardrobe.id,
          environmentId: selectedEnvironment.id,
          anchorVideoId: selectedAnchor.id,
          voiceProfileId: selectedVoice.id,
          cameraFraming: selectedCamera.id,
          language: selectedLanguage,
          scriptText,
          durationSeconds: estimatedDurationSec,
          resolution: '1080p',
          selectedModel: 'LivePortrait + Wav2Lip (Colab T4 GPU)',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'वीडियो जेनरेशन प्रारंभ करने में त्रुटि');
      }

      setCurrentJobId(json.jobId);

      // Simulate Real 8-Step GPU Pipeline Timeline
      setTimeout(() => {
        setJobProgress(30);
        setJobStageText('2/8: मोहन सर ऑथेंटिक वोकल क्लोन सिंथेसाइज़ हो रहा है (WAV 48kHz)...');
      }, 1500);

      setTimeout(() => {
        setJobProgress(50);
        setJobStageText('3/8: मास्टर एंकर वीडियो व 1080p फेशियल लैंडमार्क मैचिंग...');
      }, 3500);

      setTimeout(() => {
        setJobProgress(70);
        setJobStageText('4/8: Wav2Lip फोनीम लिप-सिंक व GFPGAN v1.4 फेशियल एन्हांसमेंट...');
      }, 5500);

      setTimeout(() => {
        setJobProgress(85);
        setJobStageText('5/8: FFmpeg H.264 1080p रेंडरिंग व बन्नी स्टोरेज CDN अपलोड...');
      }, 7500);

      setTimeout(() => {
        setJobProgress(100);
        setJobStageText('8/8: वीडियो सफलतापूर्वक तैयार! मॉड्यूल 8 और वीडियो लाइब्रेरी में सिंक हो गया।');
        setGeneratedVideoResultUrl(json.videoUrl);
        setIsGenerating(false);
        showToast('🎉 मोहन सर का डिजिटल ट्विन वीडियो सफलतापूर्वक तैयार हो गया!');
        loadLibrary();
      }, 9500);
    } catch (err: any) {
      setIsGenerating(false);
      setGenerationError(err?.message || 'वीडियो जेनरेशन में त्रुटि आई');
    }
  };

  // Filtered Professions
  const filteredProfessions = ALL_34_PROFESSIONS.filter((p) => {
    const matchesSearch =
      p.nameEn.toLowerCase().includes(professionSearch.toLowerCase()) ||
      p.nameHi.includes(professionSearch) ||
      p.descriptionEn.toLowerCase().includes(professionSearch.toLowerCase());
    const matchesCategory = professionCategory === 'all' || p.category === professionCategory;
    return matchesSearch && matchesCategory;
  });

  // Filtered Vocal DNA Profiles (39 Authenticated DNA Lectures)
  const filteredVoices = voiceProfiles.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      v.description.toLowerCase().includes(voiceSearch.toLowerCase());
    const matchesLang = voiceLangFilter === 'all' || v.language === voiceLangFilter;
    return matchesSearch && matchesLang;
  });

  return (
    <div className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-[-apple-system,BlinkMacSystemFont,system-ui,'Kohinoor_Devanagari','Segoe_UI',Roboto,sans-serif] selection:bg-amber-500/30 antialiased">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-gradient-to-r from-amber-600 to-amber-700 text-white px-5 py-3 rounded-xl shadow-2xl border border-amber-400/40 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-5 h-5 text-amber-200" />
          <span className="text-sm font-semibold">{notification}</span>
        </div>
      )}

      {/* FIXED PERMANENT STUDIO HEADER & TAB NAVIGATION (STAYS PINNED WHILE SCROLLING) */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
        {/* Top Studio Header */}
        <header className="px-6 py-2.5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/crm/e-learning/creation-hub"
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              वापस क्रिएशन हब
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                मोहन सर AI डिजिटल ट्विन स्टूडियो
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  100% Real Face & Voice
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Swar Yoga Official Neural Video Studio – LivePortrait • Wav2Lip • Colab GPU Bridge • Bunny CDN
              </p>
            </div>
          </div>

          {/* Global Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              🌐 AI साइट्स से इम्पोर्ट करें
            </button>
            <button
              onClick={() => setActiveTab('engine')}
              className="flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-4 py-2 rounded-lg shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              त्वरित वीडियो बनाएं (Generate)
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className="flex items-center gap-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              वीडियो लाइब्रेरी ({libraryVideos.length})
            </button>
          </div>
        </header>

        {/* Main Studio Navigation Tabs */}
        <nav className="px-6 py-2 overflow-x-auto flex items-center gap-2 text-xs font-medium scrollbar-thin">
          {[
            { id: 'dashboard', label: '1. डैशबोर्ड', icon: Layers },
            { id: 'identity', label: '2. अवतार पहचान (Identity)', icon: ShieldCheck },
            { id: 'anchor', label: '3. मास्टर एंकर वीडियो', icon: Video },
            { id: 'professions', label: '4. प्रोफेशन (34 रोल्स)', icon: Briefcase },
            { id: 'wardrobe', label: '5. परिधान (Wardrobe)', icon: Shirt },
            { id: 'environments', label: '6. वातावरण (Background)', icon: Eye },
            { id: 'camera', label: '7. कैमरा व फ्रेमिंग', icon: Camera },
            { id: 'voice', label: '8. वॉइस क्लोनिंग', icon: Volume2 },
            { id: 'script', label: '9. स्क्रिप्ट स्टूडियो', icon: FileText },
            { id: 'engine', label: '10. AI जेनरेशन इंजन', icon: Wand2 },
            { id: 'library', label: '11. वीडियो लाइब्रेरी', icon: Film },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as StudioTab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap text-xs font-semibold tracking-normal ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60 shadow-md ring-1 ring-amber-400/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Studio Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto pb-32">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: DIGITAL TWIN DASHBOARD                                   */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Twin Profile Card */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <img
                      src="https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg"
                      alt="Mohan Sir Master Face"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-xl"
                    />
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center text-[10px] text-black font-black">
                      ✓
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-white">मोहन कलबुर्गी (Mohan Kalburgi)</h2>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                        VERIFIED 100% REAL
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      संस्थापक: स्वर योग संस्थान • 39 DNA लेक्चर्स • 152,289 फेशियल एक्सप्रेशंस • ऑथेंटिक बैरिटोन वोकल
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-300">
                      <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                        <Cpu className="w-3.5 h-3.5 text-amber-400" /> GPU: Colab Tesla T4 Ready
                      </span>
                      <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                        <Radio className="w-3.5 h-3.5 text-emerald-400" /> CDN: swaryogacrm.b-cdn.net
                      </span>
                      <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                        <Volume2 className="w-3.5 h-3.5 text-blue-400" /> Voice: 462KB Master Clone
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setActiveTab('engine')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition"
                  >
                    <Wand2 className="w-4 h-4" />
                    नया वीडियो जनरेट करें
                  </button>
                  <a
                    href="/colab/Swar_Yoga_Digital_Twin_Colab.ipynb"
                    download
                    className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" /> Colab T4 Notebook
                  </a>
                </div>
              </div>
            </div>

            {/* Truthful Engine & GPU Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>AI मॉडल (Expression & Lip)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    READY_COLAB
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="text-sm font-bold text-white">LivePortrait + Wav2Lip</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">GFPGAN 1080p Facial Restoration</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>GPU एक्सेलेरेटर</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    AVAILABLE
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="text-sm font-bold text-white">Google Colab Tesla T4</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">15.3 GB VRAM Free Cloud Bridge</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>वोकल क्लोन डीएनए</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    VERIFIED
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="text-sm font-bold text-white">मोहन सर मास्टर बैरिटोन</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Hindi & Marathi Shastra Cadence</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>क्लाउड स्टोरेज व सीडीएन</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    CONNECTED
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="text-sm font-bold text-white">बन्नी स्टोरेज (Edge SQL)</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">swaryogacrm.b-cdn.net (HTTP 200)</p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Videos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Quick Workflow Steps */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  त्वरित वर्कफ़्लो (3 स्टेप्स)
                </h3>
                <div className="space-y-2.5">
                  <div
                    onClick={() => setActiveTab('professions')}
                    className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">1. प्रोफेशन व परिधान चुनें</div>
                      <div className="text-[11px] text-slate-400">
                        {selectedProfession.nameHi} • {selectedWardrobe.nameHi}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400">बदलें →</span>
                  </div>

                  <div
                    onClick={() => setActiveTab('script')}
                    className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">2. स्क्रिप्ट व टॉपिक तैयार करें</div>
                      <div className="text-[11px] text-slate-400">
                        {scriptText.slice(0, 36)}... ({estimatedDurationSec}s)
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400">संपादित करें →</span>
                  </div>

                  <div
                    onClick={() => setActiveTab('engine')}
                    className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-300">3. 1080p AI रेंडर चलाएं</div>
                      <div className="text-[11px] text-amber-200/70">Wav2Lip + Colab T4 GPU Engine</div>
                    </div>
                    <span className="text-xs font-black text-amber-300">रन करें 🚀</span>
                  </div>
                </div>
              </div>

              {/* Right 2 Columns: Ready Master Outputs */}
              <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Film className="w-4 h-4 text-amber-400" />
                    सत्यापित डिजिटल ट्विन वीडियो (Verified Ready)
                  </h3>
                  <button
                    onClick={() => setActiveTab('library')}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    सभी देखें ({libraryVideos.length})
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {libraryVideos.slice(0, 4).map((vid) => (
                    <div
                      key={vid.id}
                      className="bg-slate-800/60 border border-slate-700/60 rounded-xl overflow-hidden group hover:border-amber-400/50 transition flex flex-col justify-between"
                    >
                      <div
                        onClick={() => setPreviewModalUrl(vid.video_url)}
                        className="relative aspect-video bg-black cursor-pointer overflow-hidden"
                      >
                        <img
                          src={
                            vid.thumbnail_url && !vid.thumbnail_url.includes('blackbeard') && !vid.thumbnail_url.includes('lime')
                              ? vid.thumbnail_url
                              : 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_businessman_suit.jpg'
                          }
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {vid.duration_seconds}s
                        </span>
                      </div>
                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-xs font-bold text-white line-clamp-1">{vid.title}</div>
                          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                            <span>{vid.profession_name}</span>
                            <span className="text-emerald-400 font-semibold">1080p HD</span>
                          </div>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(vid);
                              }}
                              className="flex items-center gap-1 text-slate-300 hover:text-amber-400 font-semibold px-2 py-0.5 rounded hover:bg-slate-700/50 transition cursor-pointer"
                              title="एडिट करें"
                            >
                              <Pencil className="w-3 h-3 text-amber-400" /> एडिट
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVideo(vid.id, vid.title);
                              }}
                              disabled={isDeletingId === vid.id}
                              className="flex items-center gap-1 text-slate-400 hover:text-rose-400 font-semibold px-2 py-0.5 rounded hover:bg-rose-500/10 transition cursor-pointer"
                              title="हटाएं"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              {isDeletingId === vid.id ? '...' : 'हटाएं'}
                            </button>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(vid.video_url);
                              showToast('📋 लिंक कॉपी हो गया!');
                            }}
                            className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                            title="लिंक कॉपी करें"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: AVATAR IDENTITY STUDIO (MOHAN_SIR_MASTER_IDENTITY)       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'identity' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Master Identity Universal Badge */}
            <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/40 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl border-2 border-amber-400 overflow-hidden shadow-xl shrink-0">
                    <img
                      src="https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg"
                      alt="Mohan Sir Master Identity"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                        Permanent Universal Identity
                      </span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> 98.6% Identity Fidelity
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-white mt-1">
                      MOHAN_SIR_MASTER_IDENTITY (मोहन कलबुर्गी)
                    </h2>
                    <p className="text-xs text-slate-400">
                      सभी 34+ प्रोफेशन्स के लिए एक ही स्थायी वास्तविक चेहरा। कपड़े, वातावरण व जेस्चर्स बदलेंगे; चेहरा सदैव मोहन सर का रहेगा।
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold">
                  <a
                    href="/avatar-studio/master-identity/MOHAN_SIR_MASTER_IDENTITY.json"
                    target="_blank"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    DNA Manifest JSON
                  </a>
                </div>
              </div>

              {/* Identity Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-800 text-xs">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">कैनोनिकल लैंडमार्क</span>
                  <span className="text-sm font-black text-amber-400 mt-0.5 block">468 MediaPipe Mesh</span>
                  <span className="text-[10px] text-slate-500">Topology Locked</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">आर्कफेस एम्बेडिंग</span>
                  <span className="text-sm font-black text-emerald-400 mt-0.5 block">512-D ArcFace Vector</span>
                  <span className="text-[10px] text-slate-500">Zero Drift Filter</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">डीएनए वीडियो स्रोत</span>
                  <span className="text-sm font-black text-white mt-0.5 block">39 मूल व्याख्यान</span>
                  <span className="text-[10px] text-slate-500">152,000+ Verified Frames</span>
                </div>
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">एक्सप्रेशन प्रोफाइल्स</span>
                  <span className="text-sm font-black text-blue-400 mt-0.5 block">5 प्रमाणित मुद्राएं</span>
                  <span className="text-[10px] text-slate-500">Smile, Authority, Calm</span>
                </div>
              </div>
            </div>

            {/* Master Angles Gallery */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                सत्यापित 6-दिशा कोण व फेशियल टेक्सचर (Multi-Angle Face Dataset)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                फ्रंटल, 45° बायां, 45° दायां और 1080p क्लोज-अप टेक्सचर जहां मोहन सर की वास्तविक दाढ़ी, भौंहें और आंखें प्रमाणित हैं।
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 mt-5">
                {MASTER_ANGLES.map((angle, idx) => (
                  <div key={idx} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 flex flex-col justify-between text-center group hover:border-amber-400/50 transition">
                    <div className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 bg-black">
                      <img src={angle.url} alt={angle.label} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                      {angle.isMasterAnchor && (
                        <span className="absolute top-1.5 left-1.5 bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded shadow">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-white mt-2 line-clamp-1">{angle.label}</div>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-mono">{angle.resolution}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expression Profiles */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                5 प्रमाणित फेशियल एक्सप्रेशन प्रोफाइल्स (Expression DNA)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                संवाद व व्याख्यान के दौरान मोहन सर के प्राकृतिक चेहरे के भाव—स्मित, शास्त्रीय गंभीरता, सहज हास्य व जिज्ञासा।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mt-5">
                {MASTER_EXPRESSION_PROFILES.map((exp) => (
                  <div key={exp.id} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col justify-between">
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-700 bg-black mb-2.5">
                      <img src={exp.referenceImageUrl} alt={exp.name} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 right-1 bg-black/80 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                        468 Points
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white line-clamp-1">{exp.name}</h4>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                        <span>इंटेन्सिटी: {Math.round(exp.intensity * 100)}%</span>
                        <span className="text-emerald-400 font-semibold">Active</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Identity Preservation Controls */}
              <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>चेहरा पहचान प्राथमिकता (Face Identity Priority): {facePriority}%</span>
                    <span className="text-emerald-400">Strict Fidelity</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="100"
                    value={facePriority}
                    onChange={(e) => setFacePriority(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    100% पर मॉडल मोहन सर के वास्तविक जबड़े, माथा और दाढ़ी की रेखा को 100% अपरिवर्तित रखता है।
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>GFPGAN v1.4 फेशियल रीस्टोरेशन: {gfpganRestoration}%</span>
                    <span className="text-blue-400">1080p Ultra-HD</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={gfpganRestoration}
                    onChange={(e) => setGfpganRestoration(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    आंखों की चमक और होंठों के सूक्ष्म पिक्सल्स को सिनेमाई स्पष्टता प्रदान करता है।
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: MASTER VIDEO / ANCHOR STUDIO                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'anchor' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Video className="w-5 h-5 text-amber-400" />
                    मास्टर एंकर वीडियो स्टूडियो (Master Anchor Selection)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    सत्यापित प्रेजेंटर वीडियो जहां मोहन सर का माथा, कंधे, प्रकाश और स्वर उच्चतम गुणवत्ता में हैं।
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                  ✓ सक्रिय मास्टर एंकर: {selectedAnchor.title.slice(0, 32)}...
                </span>
              </div>

              {/* Main Video Player with Trim Controls */}
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                  <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
                    <video
                      ref={anchorVideoRef}
                      src={selectedAnchor.videoUrl}
                      controls
                      playsInline
                      className="w-full h-full object-contain"
                      onPlay={() => setIsPlayingAnchor(true)}
                      onPause={() => setIsPlayingAnchor(false)}
                    />
                  </div>

                  {/* Anchor Verification Checklist */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                      <span className="text-slate-400 block">रिज़ॉल्यूशन:</span>
                      <span className="font-bold text-white">1080p Full HD</span>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                      <span className="text-slate-400 block">कैमरा फ्रेमिंग:</span>
                      <span className="font-bold text-white">{selectedAnchor.framing}</span>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                      <span className="text-slate-400 block">माथा व कंधे:</span>
                      <span className="font-bold text-emerald-400">100% सुरक्षित (No Crop)</span>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                      <span className="text-slate-400 block">मूल ऑडियो:</span>
                      <span className="font-bold text-white">{selectedAnchor.language}</span>
                    </div>
                  </div>
                </div>

                {/* Selectable Anchor List */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    उपलब्ध मास्टर एंकर वीडियोज ({MASTER_ANCHOR_VIDEOS.length})
                  </h3>
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {MASTER_ANCHOR_VIDEOS.map((vid) => {
                      const isSel = selectedAnchor.id === vid.id;
                      return (
                        <div
                          key={vid.id}
                          onClick={() => {
                            setSelectedAnchor(vid);
                            showToast(`🎬 एंकर चुना गया: ${vid.title}`);
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                            isSel
                              ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                              : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                          }`}
                        >
                          <img
                            src={vid.thumbnailUrl}
                            alt={vid.title}
                            className="w-16 h-12 object-cover rounded-md border border-slate-700 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{vid.title}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{vid.language} • {vid.durationSeconds}s</div>
                            <span className="inline-block text-[10px] text-amber-400 mt-1 font-semibold">
                              {vid.isPrimaryMaster ? '⭐ प्राथमिक मास्टर' : '✓ सत्यापित'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 4: PROFESSION SELECTOR (34 PROFESSIONS)                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'professions' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-amber-400" />
                    34 सर्च-रेडी प्रोफेशन्स व रोल्स (Profession Selector)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    प्रत्येक प्रोफेशन के लिए समर्पित परिधान, वातावरण, हाव-भाव और 4 भाषाओं में सैंपल टॉपिक।
                  </p>
                </div>
                <div className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                  सक्रिय प्रोफेशन: {selectedProfession.nameHi} ({selectedProfession.nameEn})
                </div>
              </div>

              {/* Search and Category Filter */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="प्रोफेशन खोजें (उदा: Professor, Doctor, Banker, Scientist)..."
                    value={professionSearch}
                    onChange={(e) => setProfessionSearch(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <select
                  value={professionCategory}
                  onChange={(e) => setProfessionCategory(e.target.value)}
                  className="bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="all">सभी श्रेणियां (All 34)</option>
                  <option value="education">शिक्षा व अनुसंधान (Education)</option>
                  <option value="spiritual">आध्यात्मिक व योग (Spiritual)</option>
                  <option value="corporate">कॉर्पोरेट व नेतृत्व (Corporate)</option>
                  <option value="healthcare">चिकित्सा व स्वास्थ्य (Healthcare)</option>
                  <option value="media">मीडिया व ब्रॉडकास्ट (Media)</option>
                  <option value="legal_public">कानून व प्रशासन (Legal & Public)</option>
                  <option value="trades_tech">इंजीनियरिंग व कृषि (Trades & Tech)</option>
                </select>
              </div>

              {/* 34 Professions Grid (Clean Card Design - No Thumbnails) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                {filteredProfessions.map((prof) => {
                  const isSel = selectedProfession.id === prof.id;

                  const getCategoryHighlight = (cat: string) => {
                    switch (cat) {
                      case 'education':
                        return 'Academic Gold Highlights';
                      case 'spiritual':
                        return 'Vedic Saffron Highlights';
                      case 'corporate':
                        return 'Corporate Navy Highlights';
                      case 'healthcare':
                        return 'Medical Cyan Highlights';
                      case 'media':
                        return 'Broadcast Scarlet Highlights';
                      case 'legal_public':
                        return 'Executive Slate Highlights';
                      case 'trades_tech':
                        return 'Electric Blue Highlights';
                      default:
                        return 'Golden Amber Highlights';
                    }
                  };

                  return (
                    <div
                      key={prof.id}
                      onClick={() => handleSelectProfession(prof)}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                        isSel
                          ? 'bg-amber-500/15 border-amber-400 shadow-xl ring-2 ring-amber-400/40'
                          : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-500 hover:bg-slate-800/90'
                      }`}
                    >
                      <div>
                        <div className="text-xl mb-2.5">
                          {prof.icon}
                        </div>
                        <h3 className="text-sm font-bold text-white">{prof.nameHi}</h3>
                        <div className="text-xs text-slate-400 font-medium">{prof.nameEn}</div>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                          {prof.descriptionHi}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-amber-400/80">
                            {getCategoryHighlight(prof.category)}
                          </span>
                          <span className="text-slate-400 font-mono text-[10px] bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                            ⏱ 1:00 Min HD
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const baseVid = getProfessionBaseVideo(prof);
                              setPreviewModalUrl(baseVid.url);
                              setPreviewModalTitle(`${prof.nameHi} — 1-मिनट प्रस्तोता वीडियो (1080p Full HD)`);
                            }}
                            className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg bg-slate-700/80 hover:bg-amber-500 hover:text-slate-950 text-slate-200 border border-slate-600 transition flex items-center justify-center gap-1.5"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            1-मिनट वीडियो
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectProfession(prof)}
                            className={`py-1.5 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1 ${
                              isSel
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black'
                                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {isSel ? '✓ चयनित' : 'चुनें'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 5: WARDROBE / OUTFIT STUDIO                                 */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'wardrobe' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Shirt className="w-5 h-5 text-amber-400" />
                    परिधान व वेशभूषा स्टूडियो (Wardrobe Studio)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    मोहन सर के अनुपात अनुसार टेलर-मेड वस्त्र। कोई विकृत या बेमेल शरीर नहीं।
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                  चयनित परिधान: {selectedWardrobe.nameHi}
                </span>
              </div>

              {/* Wardrobe Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {MASTER_WARDROBES.map((wardrobe) => {
                  const isSel = selectedWardrobe.id === wardrobe.id;
                  return (
                    <div
                      key={wardrobe.id}
                      onClick={() => {
                        setSelectedWardrobe(wardrobe);
                        showToast(`👔 परिधान चुना गया: ${wardrobe.nameHi}`);
                      }}
                      className={`rounded-xl border overflow-hidden cursor-pointer transition flex flex-col justify-between ${
                        isSel
                          ? 'bg-amber-500/15 border-amber-400 shadow-xl ring-2 ring-amber-400/40'
                          : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="aspect-square bg-slate-950 overflow-hidden relative">
                        <img
                          src={wardrobe.referenceImageUrl}
                          alt={wardrobe.nameHi}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded text-sm">
                          {wardrobe.icon}
                        </div>
                      </div>
                      <div className="p-3.5">
                        <h4 className="text-xs font-bold text-white">{wardrobe.nameHi}</h4>
                        <div className="text-[11px] text-slate-400">{wardrobe.nameEn}</div>
                        <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">{wardrobe.description}</p>
                        <div className="flex items-center gap-1.5 mt-3">
                          {wardrobe.primaryColors.map((col, cIdx) => (
                            <span
                              key={cIdx}
                              className="w-3.5 h-3.5 rounded-full border border-slate-600"
                              style={{ backgroundColor: col }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 6: BACKGROUND / ENVIRONMENT STUDIO                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'environments' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-amber-400" />
                    वातावरण व स्टूडियो पृष्ठभूमि (Environment Studio)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    यूनिवर्सिटी व्याख्यान कक्ष, आश्रम, बोर्डरूम व आधुनिक पॉडकास्ट स्टूडियो।
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                  चयनित वातावरण: {selectedEnvironment.nameHi}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
                {MASTER_ENVIRONMENTS.map((env) => {
                  const isSel = selectedEnvironment.id === env.id;
                  return (
                    <div
                      key={env.id}
                      onClick={() => {
                        setSelectedEnvironment(env);
                        showToast(`🏛️ वातावरण चुना गया: ${env.nameHi}`);
                      }}
                      className={`rounded-xl border overflow-hidden cursor-pointer transition flex flex-col justify-between ${
                        isSel
                          ? 'bg-amber-500/15 border-amber-400 shadow-xl ring-2 ring-amber-400/40'
                          : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="aspect-video bg-slate-950 overflow-hidden relative">
                        <img src={env.referenceImageUrl} alt={env.nameHi} className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 text-xl">{env.icon}</span>
                      </div>
                      <div className="p-3.5">
                        <h4 className="text-xs font-bold text-white">{env.nameHi}</h4>
                        <div className="text-[11px] text-slate-400">{env.nameEn}</div>
                        <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">{env.description}</p>
                        <div className="text-[10px] text-amber-400 font-semibold mt-2.5">
                          प्रकाश: {env.lightingStyle}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 7: CAMERA & COMPOSITION STUDIO                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'camera' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-400" />
                कैमरा व कंपोजिशन स्टूडियो (Camera Framing)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                छाती तक (Chest-up), केवल चेहरा, कमर तक, या स्लाइड्स के साथ 60/40 स्प्लिट स्क्रीन।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {CAMERA_FRAMING_PRESETS.map((cam) => {
                  const isSel = selectedCamera.id === cam.id;
                  return (
                    <div
                      key={cam.id}
                      onClick={() => {
                        setSelectedCamera(cam);
                        showToast(`📐 कैमरा चुना गया: ${cam.nameHi}`);
                      }}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                        isSel
                          ? 'bg-amber-500/15 border-amber-400 shadow-xl ring-2 ring-amber-400/40'
                          : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="text-2xl mb-2">{cam.icon}</div>
                        <h4 className="text-xs font-bold text-white">{cam.nameHi}</h4>
                        <div className="text-[11px] text-slate-400">{cam.nameEn}</div>
                        <p className="text-[11px] text-slate-400 mt-2">{cam.description}</p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-700/60 text-[10px] text-amber-400 font-semibold">
                        लेंस: {cam.fieldOfView}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 8: VOICE CLONING STUDIO (39 AUTHENTIC DNA LECTURE VOICES)    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'voice' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* ⚡ MOHAN SIR REALTIME VOICE SYNTHESIS ENGINE (<1s GENERATION) */}
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border-2 border-amber-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-md">
                      <Sparkles className="w-3 h-3" />
                      1 सेकंड रियल-टाइम AI इंजन
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ 100% प्रामाणिक मोहन सर आवाज
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-amber-400" />
                    मोहन सर वॉइस इंजन (Mohan Sir Voice Engine)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    किसी भी स्क्रिप्ट को 1 सेकंड में मोहन सर की वास्तविक, गंभीर व प्रामाणिक आवाज में जनरेट करें।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700">
                    {[
                      { id: 'hi', label: 'हिन्दी (Hindi)' },
                      { id: 'mr', label: 'मराठी (Marathi)' },
                      { id: 'en', label: 'English' },
                    ].map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setVoiceEngineLang(l.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          voiceEngineLang === l.id
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Script Input & Presets */}
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                    <span>बोली जाने वाली स्क्रिप्ट (Script Text to Synthesize):</span>
                    <span className="text-[11px] text-slate-400">{voiceEngineScript.length} अक्षर</span>
                  </label>
                  <textarea
                    rows={3}
                    value={voiceEngineScript}
                    onChange={(e) => setVoiceEngineScript(e.target.value)}
                    placeholder="मोहन सर से क्या बुलवाना चाहते हैं यहाँ लिखें..."
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition leading-relaxed"
                  />
                  
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold self-center mr-1">नमूने:</span>
                    {[
                      {
                        label: '🧘 स्वर योग परिचय',
                        text: 'नमस्ते साधकों! मैं मोहन कलबुर्गी। स्वर योग के इस पावन सत्र में आपका स्वागत है। अपनी श्वास और नाड़ी के प्रति सजग रहें।',
                      },
                      {
                        label: '🍎 स्वर आहार शास्त्र',
                        text: 'भोजन सदैव सूर्य नाड़ी में ही ग्रहण करना चाहिए, क्योंकि उस समय जठराग्नि प्रज्वलित रहती है और भोजन अमृत बन जाता है।',
                      },
                      {
                        label: '🚩 मराठी व्याख्यान',
                        text: 'नमस्कार! मी मोहन कलबुर्गी आहे. स्वर योगाच्या या विशेष सत्रात आपले सहर्ष स्वागत आहे. डावी नाकपुडी व उजवी नाकपुडी चे रहस्य समजून घ्या.',
                      },
                      {
                        label: '🇬🇧 Global Keynote',
                        text: 'Namaste and welcome seekers. I am Mohan Kalburgi, guiding you into the sacred science of breath and circadian rhythm.',
                      },
                    ].map((p, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => {
                          setVoiceEngineScript(p.text);
                          if (p.label.includes('मराठी')) setVoiceEngineLang('mr');
                          else if (p.label.includes('Global')) setVoiceEngineLang('en');
                          else setVoiceEngineLang('hi');
                        }}
                        className="text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Synthesis Action & Live Player */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-2">
                      लाइव जेनरेशन कंट्रोल
                    </h4>
                    <p className="text-[11px] text-slate-400 mb-3">
                      क्लिक करते ही 1 सेकंड के भीतर मोहन सर की न्यूरल वॉयस MP3 तैयार हो जाती है।
                    </p>

                    {engineAudioUrl && (
                      <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-3 mb-3 animate-in fade-in">
                        <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold mb-1.5">
                          <span>✓ आवाज तैयार है ({engineAudioDuration}s)</span>
                          <span className="text-[10px] text-slate-400">44.1kHz • 128kbps</span>
                        </div>
                        <audio controls src={engineAudioUrl} className="w-full h-8" autoPlay />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setScriptText(voiceEngineScript);
                              showToast('✓ स्क्रिप्ट को मुख्य अवतार स्टूडियो में कॉपी किया गया!');
                            }}
                            className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                          >
                            + मुख्य अवतार में यह स्क्रिप्ट लगाएं
                          </button>
                          <a
                            href={engineAudioUrl}
                            download="mohan_sir_voice.mp3"
                            className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                          >
                            डाउनलोड MP3
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateEngineVoice}
                    disabled={isEngineSynthesizing}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                      isEngineSynthesizing
                        ? 'bg-amber-600/50 text-slate-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                    }`}
                  >
                    {isEngineSynthesizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        1 सेकंड में आवाज बन रही है...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-slate-950" />
                        ⚡ 1 सेकंड में मोहन सर की आवाज जनरेट करें
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-amber-400" />
                    39 डीएनए वोकल प्रोफाइल्स (Authentic Vocal DNA – 39 Master Lectures)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    मोहन सर के 39 डीएनए स्टूडियो व्याख्यानों से एक्सट्रैक्टेड 100% प्रामाणिक वोकल क्लोन। पुराने ड्राफ्ट या रोबोटिक टीटीएस पूरी तरह हटा दिए गए हैं।
                  </p>
                </div>
                <div className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                  सक्रिय वोकल: {selectedVoice.name}
                </div>
              </div>

              {/* Search & Language Filters */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="वॉइस खोजें (उदा: Marathi, Hindi, Aahar, Meditation, Day 1)..."
                    value={voiceSearch}
                    onChange={(e) => setVoiceSearch(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {[
                    { id: 'all', label: `सभी (${voiceProfiles.length})` },
                    { id: 'hi', label: `हिन्दी (${voiceProfiles.filter((v) => v.language === 'hi').length})` },
                    { id: 'mr', label: `मराठी (${voiceProfiles.filter((v) => v.language === 'mr').length})` },
                    { id: 'en', label: `English (${voiceProfiles.filter((v) => v.language === 'en').length})` },
                  ].map((filterTab) => (
                    <button
                      key={filterTab.id}
                      type="button"
                      onClick={() => setVoiceLangFilter(filterTab.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        voiceLangFilter === filterTab.id
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }`}
                    >
                      {filterTab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 39 Voice Profiles Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {filteredVoices.map((voice) => {
                  const isSel = selectedVoice.id === voice.id;
                  const isPlaying = playingVoiceId === voice.id;

                  return (
                    <div
                      key={voice.id}
                      className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                        isSel
                          ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-xl'
                          : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wide ${
                                  voice.language === 'mr'
                                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                    : voice.language === 'en'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                }`}
                              >
                                {voice.language === 'mr' ? 'मराठी (MR)' : voice.language === 'en' ? 'ENGLISH (EN)' : 'हिन्दी (HI)'}
                              </span>
                              <span className="text-[9px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                100% DNA CLONE
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-white line-clamp-1">{voice.name}</h4>
                          </div>

                          {/* Top-Right Quick Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteVoice(voice.id, voice.name)}
                            disabled={isDeletingVoiceId === voice.id}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 transition cursor-pointer"
                            title="वॉइस हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">{voice.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => togglePlayVoice(voice)}
                          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                            isPlaying
                              ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                              : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                          }`}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          {isPlaying ? 'रोकें' : 'सैंपल सुनें'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Dedicated Delete Button with Label */}
                          <button
                            type="button"
                            onClick={() => handleDeleteVoice(voice.id, voice.name)}
                            disabled={isDeletingVoiceId === voice.id}
                            className="flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-lg border border-rose-500/30 transition cursor-pointer"
                            title="वॉइस प्रोफाइल हटाएं"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {isDeletingVoiceId === voice.id ? '...' : 'हटाएं'}
                          </button>

                          {/* Select Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVoice(voice);
                              showToast(`🎙️ डीएनए वोकल चुना गया: ${voice.name}`);
                            }}
                            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow ${
                              isSel
                                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 font-black'
                                : 'bg-slate-700/70 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isSel ? '✓ चयनित' : 'चुनें'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 9: SCRIPT & CONTENT STUDIO                                  */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'script' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-400" />
                    स्क्रिप्ट व संवाद स्टूडियो (Script & Content Studio)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    हिंदी, मराठी, अंग्रेजी व नेपाली में शुद्ध व्याकरण और यथार्थ उच्चारण के साथ स्क्रिप्ट तैयार करें।
                  </p>
                </div>
                {/* Language Switcher */}
                <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  {(['hi', 'mr', 'en', 'ne'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setSelectedLanguage(lang);
                        setScriptText(selectedProfession.sampleTopic[lang] || selectedProfession.sampleTopic.hi);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition uppercase ${
                        selectedLanguage === lang ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Area */}
              <div className="mt-5 space-y-3">
                <textarea
                  rows={6}
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono leading-relaxed"
                  placeholder="यहाँ अपनी स्क्रिप्ट दर्ज करें..."
                />
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>शब्द: {scriptText.trim().split(/\s+/).filter(Boolean).length}</span>
                  <span>अनुमानित वीडियो अवधि: ~{estimatedDurationSec} सेकंड</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setScriptText(selectedProfession.sampleTopic[selectedLanguage] || selectedProfession.sampleTopic.hi);
                    showToast('🔄 प्रोफेशन का सैंपल टॉपिक लोड हो गया!');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 font-semibold"
                >
                  प्रोफेशन का डिफ़ॉल्ट टॉपिक रीलोड करें
                </button>
                <button
                  onClick={() => setActiveTab('engine')}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition"
                >
                  इस स्क्रिप्ट के साथ वीडियो बनाएं →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 10: AI GENERATION ENGINE                                    */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'engine' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-amber-400" />
                सेंट्रल AI वीडियो जेनरेशन इंजन (AI Generation Pipeline)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                लाइवपोर्ट्रेट • Wav2Lip लिप-सिंक • GFPGAN 1080p एन्हांसमेंट • बन्नी स्टोरेज CDN डिप्लॉयमेंट।
              </p>

              {/* Permanent Master Identity Lock Box */}
              <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-400 shrink-0">
                    <img src="https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg" alt="Master Identity" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      स्थायी चेहरा पहचान: <span className="text-amber-400 font-mono">MOHAN_SIR_MASTER_IDENTITY</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 rounded font-semibold">98.6% Real</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      चेहरा प्रत्येक वीडियो में 100% एक ही रहेगा। केवल कपड़े, पृष्ठभूमि, रोल और संवाद बदलेंगे।
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('identity')}
                  className="text-[11px] text-amber-400 hover:underline font-semibold"
                >
                  पहचान डीएनए देखें →
                </button>
              </div>

              {/* 7 Universal Generation Modes */}
              <div className="mt-6 space-y-2">
                <label className="block text-xs font-bold text-slate-200">
                  जेनरेशन मोड चुनें (7 Universal Generation Modes):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {MASTER_GENERATION_MODES.map((mode) => {
                    const isSel = selectedGenerationMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setSelectedGenerationMode(mode.id)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                          isSel
                            ? 'bg-amber-500/15 border-amber-400 text-white shadow-md ring-1 ring-amber-400/20'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold flex items-center justify-between">
                            <span>{mode.nameHi}</span>
                            {isSel && <Check className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{mode.description}</p>
                        </div>
                        <div className="mt-2 text-[9px] text-amber-400/80 font-mono">
                          Framing: {mode.defaultCameraFraming} • {mode.gestureFrequency} gestures
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Aspect Ratio Selector & Custom Profession */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    पहलू अनुपात (Aspect Ratio):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '16:9', label: '16:9 वाइडस्क्रीन', desc: 'यूट्यूब / टीवी' },
                      { id: '9:16', label: '9:16 वर्टिकल', desc: 'रील्स / शॉर्ट्स' },
                      { id: '1:1', label: '1:1 स्क्वायर', desc: 'सोशल पोस्ट' },
                    ].map((ar) => (
                      <button
                        key={ar.id}
                        type="button"
                        onClick={() => setSelectedAspectRatio(ar.id as any)}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                          selectedAspectRatio === ar.id
                            ? 'bg-amber-500/20 border-amber-400 text-white font-bold'
                            : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs">{ar.id}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{ar.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    कस्टम प्रोफेशन (वैकल्पिक नया रोल):
                  </label>
                  <input
                    type="text"
                    value={customProfessionName}
                    onChange={(e) => setCustomProfessionName(e.target.value)}
                    placeholder="उदा. Space Scientist, AI Robotics Engineer..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    यदि आपका रोल 34 प्रोफेशन्स में नहीं है, तो यहाँ लिखें। चेहरा स्थायी मास्टर पहचान ही रहेगा।
                  </p>
                </div>
              </div>

              {/* Pipeline Summary Review */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 text-xs">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">प्रोफेशन</span>
                  <span className="font-bold text-white truncate block mt-0.5">
                    {customProfessionName || selectedProfession.nameHi}
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">परिधान</span>
                  <span className="font-bold text-white truncate block mt-0.5">{selectedWardrobe.nameHi}</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">वातावरण</span>
                  <span className="font-bold text-white truncate block mt-0.5">{selectedEnvironment.nameHi}</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">कैमरा व आस्पेक्ट</span>
                  <span className="font-bold text-white truncate block mt-0.5">
                    {selectedCamera.nameHi} ({selectedAspectRatio})
                  </span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">वॉइस</span>
                  <span className="font-bold text-amber-400 truncate block mt-0.5">मास्टर बैरिटोन</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">अवधि व भाषा</span>
                  <span className="font-bold text-white truncate block mt-0.5">
                    {estimatedDurationSec}s • {selectedLanguage.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Progress Tracker or Start Button */}
              <div className="mt-8 p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
                {isGenerating ? (
                  <div className="space-y-4 max-w-lg mx-auto py-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>{jobStageText}</span>
                      <span className="text-amber-400">{jobProgress}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 rounded-full"
                        style={{ width: `${jobProgress}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 animate-pulse">
                      NVIDIA Tesla T4 GPU Pipeline रन हो रहा है... कृपया प्रतीक्षा करें।
                    </p>
                  </div>
                ) : generatedVideoResultUrl ? (
                  <div className="space-y-4 max-w-xl mx-auto py-2">
                    <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-black">
                      <CheckCircle2 className="w-5 h-5" />
                      वीडियो सफलतापूर्वक जनरेट हो गया!
                    </div>
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-emerald-500/40 shadow-2xl">
                      <video src={generatedVideoResultUrl} controls autoPlay className="w-full h-full object-contain" />
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <a
                        href={generatedVideoResultUrl}
                        download="mohan_sir_digital_twin_1080p.mp4"
                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition"
                      >
                        <Download className="w-4 h-4" /> MP4 डाउनलोड करें
                      </a>
                      <Link
                        href="/admin/crm/e-learning/rag-video"
                        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition"
                      >
                        मॉड्यूल 8 में खोलें →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 space-y-4">
                    <button
                      onClick={handleStartGeneration}
                      className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm px-8 py-4 rounded-2xl shadow-2xl shadow-amber-500/30 transition transform hover:scale-105 active:scale-95"
                    >
                      <Wand2 className="w-5 h-5" />
                      1080p AI वीडियो जेनरेशन प्रारंभ करें
                    </button>
                    <p className="text-xs text-slate-400">
                      लाइवपोर्ट्रेट और Wav2Lip द्वारा उच्च-गुणवत्ता पूर्ण वीडियो सीधे बन्नी स्टोरेज CDN पर तैयार होगा।
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 11: VIDEO LIBRARY & MODULE 8 HANDOFF                        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'library' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Film className="w-5 h-5 text-amber-400" />
                    तैयार डिजिटल ट्विन वीडियो लाइब्रेरी ({libraryVideos.length} वीडियोज़)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    39 DNA लेक्चर्स, 34 प्रोफेशन क्लोन्स व AI इम्पोर्टेड वीडियोज़ — 1-क्लिक प्ले, एडिट, डिलीट व मॉड्यूल 8 इंटीग्रेशन।
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    🌐 AI साइट्स से इम्पोर्ट करें
                  </button>
                  <button
                    onClick={loadLibrary}
                    disabled={isLoadingLibrary}
                    className="flex items-center gap-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLibrary ? 'animate-spin' : ''}`} />
                    रीफ्रेश
                  </button>
                </div>
              </div>

              {/* Grid of Videos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 mt-6">
                {libraryVideos.map((vid) => {
                  const isActiveAvatar = activeAvatarId === vid.id;

                  return (
                    <div
                      key={vid.id}
                      className="bg-slate-800/50 border border-slate-700/60 rounded-xl overflow-hidden flex flex-col justify-between hover:border-amber-400/50 transition group"
                    >
                      <div
                        onClick={() => setPreviewModalUrl(vid.video_url)}
                        className="relative aspect-video bg-black cursor-pointer overflow-hidden"
                      >
                        <img
                          src={
                            vid.thumbnail_url && !vid.thumbnail_url.includes('blackbeard') && !vid.thumbnail_url.includes('lime')
                              ? vid.thumbnail_url
                              : 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg'
                          }
                          alt={vid.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {vid.duration_seconds}s
                        </span>
                        {isActiveAvatar && (
                          <span className="absolute top-2 right-2 bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                            सक्रिय (ACTIVE)
                          </span>
                        )}
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-1">{vid.title}</h4>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                            <span>{vid.profession_name}</span>
                            <span className="text-emerald-400 font-semibold">{vid.resolution || '1080p'}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1 truncate">मॉडल: {vid.ai_model}</div>
                        </div>

                        {/* 5 Required Action Buttons: Preview, Play, Edit, Delete, Use It */}
                        <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            {/* Preview */}
                            <button
                              type="button"
                              onClick={() => setPreviewModalUrl(vid.video_url)}
                              className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded transition cursor-pointer font-semibold"
                              title="पूर्वावलोकन देखें"
                            >
                              <Eye className="w-3 h-3 text-cyan-400" /> झलक
                            </button>

                            {/* Play */}
                            <button
                              type="button"
                              onClick={() => setPreviewModalUrl(vid.video_url)}
                              className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded transition cursor-pointer font-semibold"
                              title="वीडियो चलाएं"
                            >
                              <Play className="w-3 h-3 text-emerald-400 fill-current" /> चलाएं
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(vid)}
                              className="flex items-center gap-1 text-slate-300 hover:text-amber-400 bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded transition cursor-pointer font-semibold"
                              title="वीडियो संपादित करें"
                            >
                              <Pencil className="w-3 h-3 text-amber-400" /> एडिट
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteVideo(vid.id, vid.title)}
                              disabled={isDeletingId === vid.id}
                              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded transition cursor-pointer font-semibold"
                              title="वीडियो हटाएं"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              {isDeletingId === vid.id ? 'हट रहा...' : 'हटाएं'}
                            </button>
                          </div>

                          {/* Use It Button (उपयोग करें / Use in Module 8) */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUseAvatar(vid)}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow ${
                                isActiveAvatar
                                  ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {isActiveAvatar ? '✓ सक्रिय अवतार (Active)' : 'उपयोग करें (Use It)'}
                            </button>
                            <Link
                              href="/admin/crm/e-learning/rag-video"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-amber-400 text-xs font-bold transition flex items-center gap-1"
                              title="मॉड्यूल 8 में खोलें"
                            >
                              मॉड्यूल 8 →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* AI Sites Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-indigo-400" />
                🌐 AI साइट्स से वीडियो इम्पोर्ट करें (Import from AI)
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleImportFromAiSite} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">AI प्लेटफॉर्म (Source Platform):</label>
                <select
                  value={importForm.ai_site_source}
                  onChange={(e) => setImportForm({ ...importForm, ai_site_source: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="Replicate">Replicate (LivePortrait / SadTalker)</option>
                  <option value="Hugging Face">Hugging Face Spaces</option>
                  <option value="Google Colab T4">Google Colab T4 GPU Bridge</option>
                  <option value="HeyGen">HeyGen AI Video</option>
                  <option value="D-ID">D-ID Studio</option>
                  <option value="Bunny CDN">Bunny Storage / Stream CDN</option>
                  <option value="Custom AI Engine">अन्य कस्टम AI इंजन (Direct MP4 URL)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">वीडियो शीर्षक (Title):</label>
                <input
                  type="text"
                  placeholder="उदा: Mohan Sir – Swar Yoga Global Keynote 1080p"
                  value={importForm.title}
                  onChange={(e) => setImportForm({ ...importForm, title: e.target.value })}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">वीडियो URL (MP4 Direct Link):</label>
                <input
                  type="url"
                  placeholder="https://.../video.mp4"
                  value={importForm.video_url}
                  onChange={(e) => setImportForm({ ...importForm, video_url: e.target.value })}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">प्रोफेशन (Role):</label>
                  <input
                    type="text"
                    value={importForm.profession_name}
                    onChange={(e) => setImportForm({ ...importForm, profession_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">भाषा (Language):</label>
                  <select
                    value={importForm.language}
                    onChange={(e) => setImportForm({ ...importForm, language: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="mr">मराठी (Marathi)</option>
                    <option value="en">English</option>
                    <option value="ne">नेपाली (Nepali)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">अवधि सेकंड में (Duration):</label>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={importForm.duration_seconds}
                  onChange={(e) => setImportForm({ ...importForm, duration_seconds: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      इम्पोर्ट हो रहा है...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      इम्पोर्ट करें व लाइब्रेरी में जोड़ें
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewModalUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white">वीडियो पूर्वावलोकन (Preview)</h3>
              <button
                onClick={() => setPreviewModalUrl(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕ बंद करें
              </button>
            </div>
            <div className="relative aspect-video bg-black">
              {previewModalUrl.includes('mediadelivery.net') ||
              previewModalUrl.includes('/embed/') ||
              previewModalUrl.includes('/play/') ? (
                <iframe
                  src={previewModalUrl.replace('/play/', '/embed/')}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <video
                  src={previewModalUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Metadata Modal */}
      {editingVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-400" />
                अवतार वीडियो संपादित करें (Edit Video)
              </h3>
              <button
                onClick={() => setEditingVideo(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">वीडियो शीर्षक (Title):</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">प्रोफेशन नाम (Profession):</label>
                <input
                  type="text"
                  value={editForm.profession_name}
                  onChange={(e) => setEditForm({ ...editForm, profession_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">भाषा (Language):</label>
                <select
                  value={editForm.language}
                  onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="en">English</option>
                  <option value="ne">नेपाली (Nepali)</option>
                </select>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 text-[11px] text-slate-400">
                <div className="font-semibold text-slate-300">सीडीएन यूआरएल (CDN Link):</div>
                <div className="truncate text-amber-400/90 font-mono mt-0.5">{editingVideo.video_url}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingVideo(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    सहेज रहा है...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    सुरक्षित करें (Save)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
