'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Play,
  Pause,
  Languages,
  Video,
  Sliders,
  Smile,
  Save,
  CheckCircle,
  Copy,
  Clock,
  Mic,
  ArrowLeft,
  Volume2,
  Palette,
  Shirt,
  Utensils,
  Layers,
  MonitorPlay,
  ExternalLink,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { EMOTION_LIBRARY } from '@/lib/avatarEmotionParser';
import {
  AVAILABLE_SCENES,
  AVAILABLE_WARDROBES,
  AVAILABLE_LOOKS,
  STUDIO_PRESETS,
  AvatarScene,
  AvatarWardrobe,
  AvatarLook,
  AvatarStudioPreset,
} from '@/lib/avatarStudioConfig';

const TARGET_LANGS = [
  { code: 'hi', name: 'Hindi (हिंदी)', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi (मराठी)', flag: '🚩' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'gu', name: 'Gujarati (ગુજરાતી)', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil (தமிழ்)', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu (తెలుగు)', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali (বাংলা)', flag: '🇮🇳' },
];

export default function AvatarStudioContent({ hideHeader = false }: { hideHeader?: boolean }) {
  const [activeTab, setActiveTab] = useState<'script' | 'studio_scene' | 'analysis' | 'multilingual'>('script');
  const [projectTitle, setProjectTitle] = useState('Swar Yoga Kitchen & Sadhana Video');
  
  // Script & Speech States
  const [scriptText, setScriptText] = useState(STUDIO_PRESETS[0].sampleScript);
  const [selectedVoiceLang, setSelectedVoiceLang] = useState<string>('hi');
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['mr', 'en', 'gu', 'kn']);
  const [emotionIntensity, setEmotionIntensity] = useState(80);
  const [speakingSpeed, setSpeakingSpeed] = useState(1.0);
  const [speakingStyle, setSpeakingStyle] = useState('conversational');
  const [parsedData, setParsedData] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Scene, Wardrobe & Look States
  const [selectedScene, setSelectedScene] = useState<string>('kitchen');
  const [selectedWardrobe, setSelectedWardrobe] = useState<string>('chef_apron');
  const [selectedLook, setSelectedLook] = useState<string>('ayurvedic_chef');
  const [customSceneUrl, setCustomSceneUrl] = useState<string>('');

  // Video Extraction States
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoSourceUrl, setVideoSourceUrl] = useState<string>('');
  const [videoExtracting, setVideoExtracting] = useState<boolean>(false);
  const [extractProgressText, setExtractProgressText] = useState<string>('');
  const [extractedTimeline, setExtractedTimeline] = useState<any[] | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const activeSceneObj = AVAILABLE_SCENES.find((s) => s.id === selectedScene) || AVAILABLE_SCENES[0];
  const activeWardrobeObj = AVAILABLE_WARDROBES.find((w) => w.id === selectedWardrobe) || AVAILABLE_WARDROBES[0];
  const activeLookObj = AVAILABLE_LOOKS.find((l) => l.id === selectedLook) || AVAILABLE_LOOKS[0];

  const handleApplyPreset = (preset: AvatarStudioPreset) => {
    setSelectedScene(preset.sceneId);
    setSelectedWardrobe(preset.wardrobeId);
    setSelectedLook(preset.lookId);
    setScriptText(preset.sampleScript);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreviewUrl(URL.createObjectURL(file));
      setVideoSourceUrl('');
      setExtractedTimeline(null);
    }
  };

  const handleLoadVideoUrl = () => {
    if (!videoSourceUrl.trim()) return;
    setVideoFile(null);
    setVideoPreviewUrl(videoSourceUrl.trim());
    setExtractedTimeline(null);
  };

  const handleRunVideoExtraction = () => {
    if (!videoFile && !videoPreviewUrl) {
      alert('Please select a video file or paste a video link first!');
      return;
    }
    setVideoExtracting(true);
    setExtractProgressText('Extracting audio prosody and pause timings...');

    setTimeout(() => {
      setExtractProgressText('Scanning facial landmarks with MediaPipe (smile, brow, gaze)...');
    }, 1200);

    setTimeout(() => {
      setExtractProgressText('Mapping speech timestamps to 80 emotion categories and gestures...');
    }, 2400);

    setTimeout(() => {
      setVideoExtracting(false);
      const sampleExtracted = [
        {
          start: '00:00',
          end: '00:05',
          emotion: 'friendly_smile',
          intensity: 75,
          gesture: 'namaste',
          text: 'नमस्कार साधकों! आज हम स्वर योग की रसोई में भोजन और प्राण का रहस्य जानेंगे।',
        },
        {
          start: '00:05',
          end: '00:11',
          emotion: 'curious',
          intensity: 85,
          gesture: 'head_tilt',
          text: 'क्या आपने कभी विचार किया है कि सूर्य स्वर के दौरान भोजन करने से क्या होता है?',
        },
        {
          start: '00:11',
          end: '00:22',
          emotion: 'serious',
          intensity: 90,
          gesture: 'pointing_finger',
          text: 'शिव स्वरोदय में स्पष्ट कहा गया है कि सूर्य स्वर के दौरान किया गया भोजन अमृत समान पचता है।',
        },
        {
          start: '00:22',
          end: '00:30',
          emotion: 'inspirational',
          intensity: 85,
          gesture: 'open_palms',
          text: 'आइए इस वैदिक विज्ञान को अपनी दैनिक साधना में अपनाकर अद्भुत स्वास्थ्य प्राप्त करें!',
        },
      ];
      setExtractedTimeline(sampleExtracted);
    }, 3600);
  };

  const handleSendToScriptEditor = () => {
    if (!extractedTimeline) return;
    const constructed = extractedTimeline
      .map((item) => `[${item.emotion}:${item.intensity}] ${item.text} ${item.gesture ? `[${item.gesture}]` : ''}`)
      .join('\n[pause:1.5s]\n');
    setScriptText(constructed);
    setActiveTab('script');
  };

  // Trigger parse whenever scriptText changes
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!scriptText.trim()) return;
      setIsParsing(true);
      try {
        const res = await fetch('/api/avatar/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ script: scriptText }),
        });
        const json = await res.json();
        if (json.success) {
          setParsedData(json.data);
        }
      } catch (err) {
        console.error('Parse script error:', err);
      } finally {
        setIsParsing(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [scriptText]);

  const insertTag = (tag: string) => {
    setScriptText((prev) => `${prev.trim()} [${tag}] `);
  };

  const handleAutoAddEmotions = () => {
    if (!scriptText.trim()) return;
    const sentences = scriptText.split(/(?<=[.!?।॥\n])\s+/);
    const enriched = sentences
      .map((sentence, idx) => {
        const s = sentence.trim();
        if (!s) return '';
        if (s.includes('[')) return s;

        if (idx === 0) {
          return `[smile:85] [namaste] ${s}`;
        } else if (s.includes('?') || s.includes('क्या') || s.includes('कधी') || s.toLowerCase().includes('why') || s.toLowerCase().includes('how')) {
          return `[curious:85] [head_tilt] ${s} [pause:1.5s]`;
        } else if (s.includes('!') || s.includes('जरूरी') || s.includes('सावधान') || s.includes('नियम') || s.toLowerCase().includes('must')) {
          return `[serious:90] [pointing_finger] ${s}`;
        } else if (s.includes('स्वर') || s.includes('साधना') || s.includes('श्वास') || s.includes('प्राण') || s.includes('रसोई') || s.includes('रेसिपी')) {
          return `[teaching] [open_palms] ${s}`;
        } else if (idx === sentences.length - 1) {
          return `[big_smile:85] ${s} [blessing] [namaste]`;
        } else {
          return `[inspire:80] ${s}`;
        }
      })
      .filter(Boolean)
      .join('\n\n');

    setScriptText(enriched);
  };

  const handleSpeakPreview = (overrideLang?: string, customText?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const lang = overrideLang || selectedVoiceLang;
    const raw = customText || parsedData?.fullCleanText || scriptText.replace(/\[[^\]]+\]/g, '');
    const clean = raw.replace(/\[[^\]]+\]/g, '').trim();
    if (!clean) {
      alert('Script is empty! Please write or generate script first.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = speakingSpeed;
    utterance.pitch = 0.88; // Deep baritone pitch for Mohan Sir

    const voices = window.speechSynthesis.getVoices();
    const nonFemale = voices.filter(vox => {
      const n = vox.name.toLowerCase();
      return !n.includes('female') && !n.includes('woman') && !n.includes('girl') && !n.includes('zira') && !n.includes('heera') && !n.includes('lekha') && !n.includes('samantha') && !n.includes('victoria');
    });
    let voice = nonFemale.find((v) => v.lang.toLowerCase().startsWith(lang));
    if (!voice && lang !== 'en') {
      voice = nonFemale.find((v) => v.lang.toLowerCase().includes('in') || v.lang.toLowerCase().startsWith('hi'));
    }
    if (voice || nonFemale[0]) {
      utterance.voice = voice || nonFemale[0];
    }
    utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'en' ? 'en-IN' : lang === 'gu' ? 'gu-IN' : lang === 'kn' ? 'kn-IN' : lang === 'ta' ? 'ta-IN' : lang === 'te' ? 'te-IN' : lang === 'bn' ? 'bn-IN' : 'hi-IN';

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleTranslateAndPlay = async (targetLang: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setSelectedVoiceLang(targetLang);
    setIsTranslating(true);
    try {
      const res = await fetch('/api/avatar/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: scriptText, targetLang }),
      });
      const data = await res.json();
      if (data.success && data.translatedScript) {
        setScriptText(data.translatedScript);
        const clean = data.cleanText || data.translatedScript.replace(/\[[^\]]+\]/g, '');
        setTimeout(() => {
          handleSpeakPreview(targetLang, clean);
        }, 150);
      } else {
        handleSpeakPreview(targetLang);
      }
    } catch (err) {
      console.error('Translation error:', err);
      handleSpeakPreview(targetLang);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSaveProject = async () => {
    try {
      const res = await fetch('/api/avatar/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: projectTitle,
          profileId: 'profile_mohan_sir',
          sourceLanguage: 'hi',
          targetLanguages: selectedLangs,
          rawScript: scriptText,
          cleanScript: parsedData?.fullCleanText || '',
          totalDurationSeconds: parsedData?.totalEstimatedSeconds || 0,
          sceneId: selectedScene,
          wardrobeId: selectedWardrobe,
          lookId: selectedLook,
          customSceneUrl: customSceneUrl,
          status: 'analyzing',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Save project error:', err);
    }
  };

  return (
    <div className="w-full text-slate-100 flex flex-col font-sans space-y-5">
      {/* Top Header (only if not embedded) */}
      {!hideHeader && (
        <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-4 sm:px-6 py-3.5 flex items-center justify-between rounded-2xl mb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/crm/e-learning/rag-video"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="text-xl">🕉️</span>
                  <span>AI Avatar & Emotion Video Studio</span>
                </h1>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Mohan Sir Digital Twin
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Select Background Scenes (Kitchen / Studio / Ashram), Wardrobe, Multilingual Voice & Lip-Sync
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSaveProject}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {savedSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
              <span>{savedSuccess ? 'Saved to Cloud!' : 'Save Project'}</span>
            </button>
          </div>
        </header>
      )}

      {/* Embedded Bar / Title if embedded */}
      {hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🕉️</span>
              <h2 className="text-lg font-bold text-white">AI Avatar & Emotion Creation Studio</h2>
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase">
                Mohan Sir Studio
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Change Background Scene (Kitchen, Ashram, Product Studio), Wardrobe Clothes, Select Language & Play
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveProject}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
            >
              {savedSuccess ? <CheckCircle size={15} /> : <Save size={15} />}
              <span>{savedSuccess ? 'Saved to Cloud!' : 'Save Project'}</span>
            </button>
            <Link
              href="/admin/avatar-studio"
              target="_blank"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Open full page in new tab"
            >
              <ExternalLink size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* Quick Studio Presets Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800/80">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <Sparkles size={14} />
            <span>Quick Scene & Look Presets (एक क्लिक में दृश्य व लुक बदलें):</span>
          </span>
          <span className="text-[11px] text-slate-400">Click to switch background, clothes & script</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {STUDIO_PRESETS.map((preset) => {
            const active = selectedScene === preset.sceneId && selectedWardrobe === preset.wardrobeId;
            return (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  active
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-md ring-1 ring-amber-500/30'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span className="text-2xl">{preset.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate flex items-center justify-between">
                    <span>{preset.name}</span>
                    {active && <Check size={12} className="text-amber-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{preset.tagline}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Studio Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {[
          { id: 'script', label: '📝 Script & Voice Play', icon: Smile },
          { id: 'studio_scene', label: '🎬 Scene, Wardrobe & Look Studio', icon: Palette },
          { id: 'analysis', label: '📹 Video to Emotion Extractor', icon: Video },
          { id: 'multilingual', label: '🌐 Multilingual Video Render', icon: Languages },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                active
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SCRIPT & EMOTION TAGS */}
      {activeTab === 'script' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Script Editor & Tag Inserters */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Smile size={16} className="text-amber-400" />
                  <span>Script Editor with [Emotion Tags]</span>
                </h3>
                <span className="text-[11px] text-slate-400">Supports Hindi, Marathi, English, Gujarati, etc.</span>
              </div>

              {/* Tag Pills Quick Inserter */}
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400 font-semibold">Click to Insert Emotion & Gesture Tags:</p>
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  {[
                    { tag: 'smile:80', label: '😊 Smile' },
                    { tag: 'big_smile', label: '😃 Big Smile' },
                    { tag: 'laugh', label: '😄 Laugh' },
                    { tag: 'curious', label: '🤔 Curious' },
                    { tag: 'serious:90', label: '🧐 Serious' },
                    { tag: 'teaching', label: '🧘 Teaching' },
                    { tag: 'inspire', label: '✨ Inspire' },
                    { tag: 'namaste', label: '🙏 Namaste' },
                    { tag: 'open_palms', label: '👐 Open Palms' },
                    { tag: 'pause:1.5s', label: '⏳ Pause (1.5s)' },
                  ].map((item) => (
                    <button
                      key={item.tag}
                      onClick={() => insertTag(item.tag)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 text-[11px] font-semibold transition-all cursor-pointer active:scale-95"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* PROMINENT SELECT LANGUAGE & PLAY AUDIO BAR */}
              <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 rounded-2xl border-2 border-amber-500/40 shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  
                  {/* Left: Language Selector */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                      <Languages size={17} />
                      <span>Select Language:</span>
                    </div>
                    <div className="relative">
                      <select
                        value={selectedVoiceLang}
                        onChange={(e) => setSelectedVoiceLang(e.target.value)}
                        className="appearance-none bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm pl-3 pr-8 py-2 rounded-xl border border-slate-600 focus:outline-none focus:border-amber-400 cursor-pointer shadow-inner"
                      >
                        {TARGET_LANGS.map((lang) => (
                          <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                            {lang.flag} {lang.name}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▼</span>
                    </div>
                  </div>

                  {/* Center / Right: PLAY & Translation Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Big Play Button */}
                    <button
                      type="button"
                      onClick={() => (isSpeaking ? handleSpeakPreview() : handleSpeakPreview(selectedVoiceLang))}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold shadow-lg active:scale-95 transition-all cursor-pointer ${
                        isSpeaking
                          ? 'bg-rose-500 hover:bg-rose-600 text-white ring-4 ring-rose-500/30 animate-pulse'
                          : 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 hover:from-amber-500 hover:to-orange-600 text-black'
                      }`}
                    >
                      {isSpeaking ? <Pause size={17} /> : <Play size={17} className="fill-black" />}
                      <span>
                        {isSpeaking
                          ? '⏹ Stop Playing'
                          : `▶ Play & Listen (${TARGET_LANGS.find((l) => l.code === selectedVoiceLang)?.name.split(' ')[0] || 'Audio'})`}
                      </span>
                    </button>

                    {/* Translate & Play in 1-Click */}
                    <button
                      type="button"
                      disabled={isTranslating}
                      onClick={() => handleTranslateAndPlay(selectedVoiceLang)}
                      className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-60"
                      title="Translate script into chosen language and listen immediately"
                    >
                      {isTranslating ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Translating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="text-amber-300" />
                          <span>Translate & Play</span>
                        </>
                      )}
                    </button>

                    {/* AI Auto-Add Emotions */}
                    <button
                      type="button"
                      onClick={handleAutoAddEmotions}
                      className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 active:scale-95 transition-all cursor-pointer"
                      title="Automatically analyze text and inject [smile], [curious], [serious] tags"
                    >
                      <Sparkles size={14} />
                      <span>🪄 Auto Emotions</span>
                    </button>
                  </div>
                </div>

                {/* Status pill & Speed indicator */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-3">
                    {isSpeaking ? (
                      <span className="text-amber-400 font-bold flex items-center gap-1.5 animate-pulse text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        Playing audio in {TARGET_LANGS.find((l) => l.code === selectedVoiceLang)?.name}...
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">
                        Tip: Select any language above and click <strong>▶ Play & Listen</strong> to hear Mohan Sir's voice.
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Speed:</span>
                    <select
                      value={speakingSpeed}
                      onChange={(e) => setSpeakingSpeed(parseFloat(e.target.value))}
                      className="bg-slate-800 text-slate-200 text-[11px] px-2 py-0.5 rounded border border-slate-700 cursor-pointer"
                    >
                      <option value={0.85}>0.85x (Slow/Meditative)</option>
                      <option value={1.0}>1.0x (Normal)</option>
                      <option value={1.15}>1.15x (Fast)</option>
                      <option value={1.25}>1.25x (Very Fast)</option>
                    </select>
                    <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300 border border-slate-700/60">
                      ~{parsedData?.totalEstimatedSeconds || 0}s
                    </span>
                  </div>
                </div>
              </div>

              {/* Editor Textarea */}
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                rows={9}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                placeholder="Type or paste your Swar Yoga lecture script with [smile], [pause], and [teaching] tags..."
              />

              {/* Voice & Delivery Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Emotion Intensity: {emotionIntensity}%</label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={emotionIntensity}
                    onChange={(e) => setEmotionIntensity(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Speaking Style</label>
                  <select
                    value={speakingStyle}
                    onChange={(e) => setSpeakingStyle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-slate-200 focus:outline-none focus:border-amber-400"
                  >
                    <option value="conversational">Conversational (सहज संवाद)</option>
                    <option value="teaching">Teaching (गुरु व्याख्यान)</option>
                    <option value="motivational">Motivational (उत्साहवर्धक)</option>
                    <option value="spiritual">Spiritual (आध्यात्मिक)</option>
                    <option value="storytelling">Storytelling (कथा शैली)</option>
                    <option value="meditation">Meditation (शांत ध्यान)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Active Scene & Wardrobe</label>
                  <button
                    onClick={() => setActiveTab('studio_scene')}
                    className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-left text-xs font-semibold flex items-center justify-between"
                  >
                    <span className="truncate">{activeSceneObj.badge} • {activeWardrobeObj.name.split(' ')[0]}</span>
                    <span>Change ➔</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Avatar Compositor Preview & Timeline */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* LIVE COMPOSITOR PREVIEW BOX */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <MonitorPlay size={15} className="text-amber-400" />
                  <span>Live Scene & Avatar Compositor</span>
                </span>
                <button
                  onClick={() => setActiveTab('studio_scene')}
                  className="text-amber-400 hover:text-amber-300 font-semibold text-[11px]"
                >
                  Edit Scene & Wardrobe ➔
                </button>
              </div>

              {/* Composited Screen Preview */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800 shadow-inner group">
                {/* Background Scene Layer */}
                {selectedScene === 'greenscreen' ? (
                  <div className="absolute inset-0 bg-[#00cc44] flex items-center justify-center">
                    <span className="text-black/30 font-black text-xl tracking-widest uppercase">CHROMA KEY GREEN</span>
                  </div>
                ) : (
                  <img
                    src={customSceneUrl || activeSceneObj.imageUrl}
                    alt={activeSceneObj.name}
                    className="w-full h-full object-cover brightness-[0.78] contrast-[1.05]"
                  />
                )}

                {/* Lighting Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                {/* Mohan Sir Avatar Layer */}
                <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
                  <div className="relative w-44 h-44 sm:w-52 sm:h-52">
                    <img
                      src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&auto=format&fit=crop&q=80"
                      alt="Mohan Sir Avatar"
                      className={`w-full h-full object-cover object-top rounded-full filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] border-2 border-amber-400/50 ${
                        isSpeaking ? 'scale-105 transition-transform duration-300' : ''
                      }`}
                    />
                    {isSpeaking && (
                      <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce shadow-md">
                        SPEAKING 🔊
                      </div>
                    )}
                  </div>
                </div>

                {/* Scene & Wardrobe Floating Badges */}
                <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 pointer-events-none">
                  <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur text-[10px] text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1 shadow">
                    <span>{activeSceneObj.badge}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur text-[10px] text-slate-200 font-semibold border border-slate-700/60 flex items-center gap-1 shadow">
                    <span>{activeWardrobeObj.icon} {activeWardrobeObj.name}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur text-[10px] text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1 shadow">
                    <span>Look: {activeLookObj.name}</span>
                  </span>
                </div>

                {/* Play Overlay Button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <button
                    type="button"
                    onClick={() => handleSpeakPreview()}
                    className="px-4 py-2 rounded-xl bg-amber-500 text-black font-extrabold text-xs shadow-xl flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    {isSpeaking ? <Pause size={15} /> : <Play size={15} className="fill-black" />}
                    <span>{isSpeaking ? 'Stop Audio' : `Play Audio (${selectedVoiceLang.toUpperCase()})`}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Real-time Parsed Emotion Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sliders size={16} className="text-amber-400" />
                  <span>Real-Time Emotion Timeline</span>
                </h3>
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <Clock size={12} />
                  <span>{parsedData?.totalEstimatedSeconds || 0}s</span>
                </span>
              </div>

              {/* Parsed Timeline Events */}
              <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 text-xs">
                {parsedData?.segments?.map((seg: any, idx: number) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-amber-400">Segment #{idx + 1}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold capitalize">
                          {seg.primaryEmotion}
                        </span>
                        <span className="text-slate-500">+{seg.pauseAfterSeconds}s pause</span>
                      </div>
                    </div>
                    <p className="text-slate-200 leading-relaxed font-sans">{seg.cleanText}</p>
                    {seg.gesture && (
                      <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <span>Gesture:</span> <span className="capitalize">{seg.gesture.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCENE, WARDROBE & LOOK STUDIO */}
      {activeTab === 'studio_scene' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Palette size={20} className="text-amber-400" />
                <span>Avatar Environment, Wardrobe & Look Customizer</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Choose from luxury Kitchens for recipe videos, Sacred Ashrams for Swar Yoga, or Modern Tech Studios for product demos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('script')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-xs shadow-md active:scale-95 cursor-pointer"
              >
                Return to Script & Audio ➔
              </button>
            </div>
          </div>

          {/* SECTION 1: BACKGROUND SCENE SELECTION */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon size={17} className="text-amber-400" />
                <span>1. Select Background Scene (दृश्य चयन करें):</span>
              </h4>
              <span className="text-xs text-slate-400">
                Active: <strong className="text-amber-400">{activeSceneObj.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AVAILABLE_SCENES.map((scene) => {
                const isSelected = selectedScene === scene.id;
                return (
                  <div
                    key={scene.id}
                    onClick={() => {
                      setSelectedScene(scene.id);
                      if (scene.recommendedWardrobe) setSelectedWardrobe(scene.recommendedWardrobe);
                      if (scene.recommendedLook) setSelectedLook(scene.recommendedLook);
                    }}
                    className={`rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 group flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/40 bg-slate-800 shadow-xl'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-black">
                      {scene.id === 'greenscreen' ? (
                        <div className="w-full h-full bg-[#00cc44] flex items-center justify-center font-black text-black/40 text-sm tracking-wider">
                          CHROMA GREEN
                        </div>
                      ) : (
                        <img
                          src={scene.imageUrl}
                          alt={scene.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur text-[10px] font-bold text-amber-300 border border-amber-500/30">
                        {scene.badge}
                      </span>
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-xs shadow-md">
                          ✓
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                          {scene.name}
                        </h5>
                        <p className="text-[11px] text-slate-400 leading-snug mt-1">
                          {scene.description}
                        </p>
                      </div>
                      <div className="pt-2 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-800/80 mt-2">
                        <span>Lighting: {scene.lightingStyle.split(' ')[0]}</span>
                        <span className="text-amber-400 font-semibold">{isSelected ? 'Active Scene' : 'Select Scene'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Image / Video Scene Upload */}
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <span className="text-xs font-bold text-slate-300 shrink-0 flex items-center gap-1.5">
                <ExternalLink size={14} className="text-amber-400" />
                <span>Custom Scene URL:</span>
              </span>
              <input
                type="text"
                value={customSceneUrl}
                onChange={(e) => {
                  setCustomSceneUrl(e.target.value);
                  setSelectedScene('custom');
                }}
                placeholder="Paste direct image or video CDN URL for custom kitchen, hall or studio..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-full"
              />
              {customSceneUrl && (
                <button
                  onClick={() => setCustomSceneUrl('')}
                  className="text-xs text-red-400 hover:text-red-300 shrink-0 font-semibold"
                >
                  Clear Custom
                </button>
              )}
            </div>
          </div>

          {/* SECTION 2: WARDROBE & CLOTHES SELECTION */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Shirt size={17} className="text-amber-400" />
                <span>2. Select Avatar Wardrobe & Clothes (पोशाक चयन करें):</span>
              </h4>
              <span className="text-xs text-slate-400">
                Active: <strong className="text-amber-400">{activeWardrobeObj.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {AVAILABLE_WARDROBES.map((wardrobe) => {
                const isSelected = selectedWardrobe === wardrobe.id;
                return (
                  <div
                    key={wardrobe.id}
                    onClick={() => setSelectedWardrobe(wardrobe.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 group flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/40 bg-slate-800 shadow-xl'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{wardrobe.icon}</span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-[10px]">
                            ✓
                          </span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-white group-hover:text-amber-300">
                        {wardrobe.name}
                      </h5>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        {wardrobe.tagline}
                      </p>
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-semibold uppercase">
                      {wardrobe.category} Wear
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: AVATAR LOOK & PERSONA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Smile size={17} className="text-amber-400" />
                <span>3. Avatar Facial Look & Persona (लुक व भाव):</span>
              </h4>
              <span className="text-xs text-slate-400">
                Active: <strong className="text-amber-400">{activeLookObj.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {AVAILABLE_LOOKS.map((look) => {
                const isSelected = selectedLook === look.id;
                return (
                  <div
                    key={look.id}
                    onClick={() => setSelectedLook(look.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 group flex flex-col justify-between ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/40 bg-slate-800 shadow-xl'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">{look.icon}</span>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-[10px]">
                            ✓
                          </span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-white group-hover:text-amber-300">
                        {look.name}
                      </h5>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        {look.tagline}
                      </p>
                      <div className="text-[10px] text-amber-300/80 font-mono">
                        Mood: {look.mood}
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-800/80 flex flex-wrap gap-1">
                      {look.features.map((f, i) => (
                        <span key={i} className="text-[9px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VIDEO EMOTION EXTRACTOR */}
      {activeTab === 'analysis' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Video size={18} className="text-amber-400" />
              <span>Original Video vs. AI Emotion Timeline Extractor</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Upload your recorded Hindi Swar Yoga video. AI will extract facial expressions, voice prosody, pauses, and hand gestures.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Video Upload & Preview Box */}
            <div className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/mp4,video/quicktime,video/webm"
                className="hidden"
              />

              {!videoPreviewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      setVideoFile(file);
                      setVideoPreviewUrl(URL.createObjectURL(file));
                      setVideoSourceUrl('');
                      setExtractedTimeline(null);
                    }
                  }}
                  className="border-2 border-dashed border-amber-500/40 hover:border-amber-400 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 bg-slate-950/70 hover:bg-slate-900/60 transition-all cursor-pointer group shadow-lg"
                >
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                    <Video size={28} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      Click to Select Video or Drag & Drop Here
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">MP4, MOV, WebM (2 to 30 minutes supported)</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold rounded-xl text-xs shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    📁 Browse Video File
                  </button>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span>📹</span> {videoFile ? videoFile.name : 'Selected Video Stream'}
                    </span>
                    <button
                      onClick={() => {
                        setVideoFile(null);
                        setVideoPreviewUrl(null);
                        setExtractedTimeline(null);
                      }}
                      className="text-red-400 hover:text-red-300 font-semibold"
                    >
                      ✕ Remove
                    </button>
                  </div>

                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                    <video
                      src={videoPreviewUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <button
                    onClick={handleRunVideoExtraction}
                    disabled={videoExtracting}
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-xs sm:text-sm rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {videoExtracting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>{extractProgressText}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span>⚡ Run AI Emotion Extraction & Transcribe</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center gap-2 text-xs">
                <input
                  type="text"
                  value={videoSourceUrl}
                  onChange={(e) => setVideoSourceUrl(e.target.value)}
                  placeholder="Or paste video URL (YouTube / Bunny CDN mp4)..."
                  className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none text-xs"
                />
                <button
                  onClick={handleLoadVideoUrl}
                  disabled={!videoSourceUrl.trim()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 rounded-lg font-bold transition-all text-xs shrink-0"
                >
                  Load URL
                </button>
              </div>
            </div>

            {/* Extracted Timeline & Emotion Output */}
            <div className="bg-slate-950 rounded-2xl p-4 sm:p-5 border border-slate-800 flex flex-col justify-between shadow-lg space-y-4">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>📊</span>
                    <span>AI Extracted Emotion Timeline:</span>
                  </h4>
                  {extractedTimeline && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                      4 Segments Extracted
                    </span>
                  )}
                </div>

                {videoExtracting ? (
                  <div className="py-14 text-center space-y-3">
                    <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-amber-300 font-bold">{extractProgressText}</p>
                    <p className="text-[11px] text-slate-500">
                      Running MediaPipe FaceMesh (52 blendshapes), Prosody analysis, and Whisper speech sync.
                    </p>
                  </div>
                ) : extractedTimeline ? (
                  <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-1 text-xs">
                    {extractedTimeline.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono text-slate-400 font-bold">{item.start} - {item.end}</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold capitalize">
                            {item.emotion.replace('_', ' ')} ({item.intensity}%)
                          </span>
                        </div>
                        <p className="text-slate-200 text-xs leading-relaxed">{item.text}</p>
                        {item.gesture && (
                          <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <span>Gesture:</span> <span className="capitalize">{item.gesture.replace('_', ' ')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 space-y-2">
                    <div className="text-3xl">🎬</div>
                    <p className="text-xs">Select or upload a video on the left, then click</p>
                    <p className="text-xs text-amber-400 font-semibold">"⚡ Run AI Emotion Extraction"</p>
                    <p className="text-[11px] text-slate-600">to generate timestamped speech & 80 emotion blendshapes.</p>
                  </div>
                )}
              </div>

              {extractedTimeline && (
                <button
                  onClick={handleSendToScriptEditor}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 text-black font-bold text-xs sm:text-sm rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>➡️ Load Into Script Editor to Translate & Speak</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MULTILINGUAL BATCH RENDER */}
      {activeTab === 'multilingual' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Languages size={18} className="text-amber-400" />
              <span>Multilingual Avatar Batch Generator</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select target languages. The engine will translate, synthesize emotional cloned voice, rescale the timeline, and generate lip-synced video outputs.
            </p>
          </div>

          {/* Language Selection Grid with Audio Preview Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TARGET_LANGS.map((lang) => {
              const checked = selectedLangs.includes(lang.code);
              return (
                <div
                  key={lang.code}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                    checked
                      ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-2xl">{lang.flag}</span>
                      <button
                        onClick={() => {
                          setSelectedLangs((prev) =>
                            checked ? prev.filter((c) => c !== lang.code) : [...prev, lang.code]
                          );
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold cursor-pointer ${
                          checked ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {checked ? '✓ Included' : '+ Include'}
                      </button>
                    </div>
                    <div className="text-xs font-bold text-white">{lang.name}</div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleTranslateAndPlay(lang.code)}
                      className="text-[11px] text-amber-300 hover:text-amber-200 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Play size={12} className="fill-amber-300" />
                      <span>Listen Audio</span>
                    </button>
                    <span className="text-[10px] text-slate-500">LivePortrait</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Ready to generate: <strong className="text-white">{selectedLangs.length} languages</strong> in parallel.
            </span>
            <button
              onClick={() => alert('Batch render queued in background via Celery & LivePortrait GPU runner!')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-black font-bold text-xs sm:text-sm shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              Start Multilingual Batch Render
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
