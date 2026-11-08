'use client';

import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import {
  Mic,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Sparkles,
  Share2,
  Check,
  Search,
  Filter,
  Flame,
  Droplets,
  Wind,
  Brain,
  Compass,
  MessageSquare,
  HelpCircle,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import {
  PodcastEpisode,
  DialogueTurn,
  HOST_CLONE_PRESETS,
  MOHAN_CLONE_PRESETS,
  PODCAST_BACKGROUND_PRESETS,
} from '@/lib/mohanRag/podcastTypes';
import ManualPodcastCreatorModal from '@/components/admin/crm/mohan-rag/ManualPodcastCreatorModal';

export default function PodcastsPage() {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [activeEpisode, setActiveEpisode] = useState<PodcastEpisode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Audio Playback State (Web Speech Synthesis + Simulated Turns)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Question Form (Ask Mohan Sir & Manual Creator)
  const [showAskModal, setShowAskModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [customLang, setCustomLang] = useState<'mr' | 'hi' | 'en'>('en');
  const [generatingCustom, setGeneratingCustom] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Ref for speech synthesis
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  // Load Episodes on Mount
  useEffect(() => {
    fetchEpisodes();
  }, [selectedCategory, selectedLanguage]);

  const fetchEpisodes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.set('category', selectedCategory);
      if (selectedLanguage !== 'all') params.set('language', selectedLanguage);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/podcasts?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch episodes');

      setEpisodes(data.episodes || []);
      if (data.episodes?.length > 0 && !activeEpisode) {
        setActiveEpisode(data.episodes[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching episodes');
    } finally {
      setLoading(false);
    }
  };

  // Handle Search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEpisodes();
  };

  // Stop Speech when unmounting or switching episode
  const stopPlayback = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const selectEpisode = (ep: PodcastEpisode) => {
    stopPlayback();
    setActiveEpisode(ep);
    setCurrentTurnIndex(0);
    // increment listen count
    fetch(`/api/podcasts/${ep.id}`).catch(() => {});
  };

  // Play a specific turn
  const playTurn = (turnIndex: number, episode = activeEpisode) => {
    if (!episode || !episode.dialogueTurns || turnIndex >= episode.dialogueTurns.length) {
      stopPlayback();
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      // Speech not supported, simply highlight turns with a timer
      setCurrentTurnIndex(turnIndex);
      setIsPlaying(true);
      const words = episode.dialogueTurns[turnIndex].text.split(' ').length;
      const durationMs = (words / (140 * playbackSpeed)) * 60 * 1000;
      setTimeout(() => {
        if (isPlayingRef.current) {
          playTurn(turnIndex + 1, episode);
        }
      }, Math.max(2500, durationMs));
      return;
    }

    window.speechSynthesis.cancel();
    setCurrentTurnIndex(turnIndex);
    setIsPlaying(true);

    const turn = episode.dialogueTurns[turnIndex];
    const utterance = new SpeechSynthesisUtterance(turn.text);
    speechRef.current = utterance;

    utterance.rate = playbackSpeed * (turn.speaker === 'mohan_sir' ? 0.95 : 1.05);
    utterance.pitch = turn.speaker === 'mohan_sir' ? 0.85 : 1.15; // deeper voice for Mohan Sir

    // Try to match available system voices (strictly male for Mohan Sir)
    const voices = window.speechSynthesis.getVoices();
    const candidateVoices = turn.speaker === 'mohan_sir' 
      ? voices.filter(v => {
          const n = v.name.toLowerCase();
          return !n.includes('female') && !n.includes('woman') && !n.includes('girl') && !n.includes('zira') && !n.includes('heera') && !n.includes('lekha') && !n.includes('samantha') && !n.includes('victoria');
        })
      : voices;

    if (candidateVoices.length > 0) {
      if (episode.language === 'mr') {
        const mrVoice = candidateVoices.find(v => v.lang.startsWith('mr') || v.lang.includes('IN')) || candidateVoices[0];
        if (mrVoice) utterance.voice = mrVoice;
      } else if (episode.language === 'hi') {
        const hiVoice = candidateVoices.find(v => v.lang.startsWith('hi') || v.lang.includes('IN')) || candidateVoices[0];
        if (hiVoice) utterance.voice = hiVoice;
      } else {
        const inVoice = candidateVoices.find(v => v.lang.includes('en-IN') || v.lang.includes('en_GB') || v.lang.includes('en-US')) || candidateVoices[0];
        if (inVoice) utterance.voice = inVoice;
      }
    }

    utterance.onend = () => {
      if (!isPlayingRef.current) return;
      if (turnIndex + 1 < episode.dialogueTurns.length) {
        setTimeout(() => {
          if (isPlayingRef.current) playTurn(turnIndex + 1, episode);
        }, 500);
      } else {
        setIsPlaying(false);
        setCurrentTurnIndex(0);
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      playTurn(currentTurnIndex);
    }
  };

  const handleNextTurn = () => {
    if (!activeEpisode) return;
    const nextIndex = Math.min(activeEpisode.dialogueTurns.length - 1, currentTurnIndex + 1);
    stopPlayback();
    playTurn(nextIndex);
  };

  const handlePrevTurn = () => {
    if (!activeEpisode) return;
    const prevIndex = Math.max(0, currentTurnIndex - 1);
    stopPlayback();
    playTurn(prevIndex);
  };

  const handleGeneratePodcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;

    try {
      setGeneratingCustom(true);
      setGenerateError('');
      const res = await fetch('/api/podcasts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: customQuestion.trim(),
          language: customLang,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate podcast dialogue');

      if (data.episode) {
        setEpisodes(prev => [data.episode, ...prev]);
        setActiveEpisode(data.episode);
        setCurrentTurnIndex(0);
        setShowAskModal(false);
        setCustomQuestion('');
        // Auto-play the newly generated episode
        setTimeout(() => {
          playTurn(0, data.episode);
        }, 600);
      }
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Error generating episode');
    } finally {
      setGeneratingCustom(false);
    }
  };

  const copyEpisodeLink = () => {
    if (!activeEpisode) return;
    const url = `${window.location.origin}/podcasts#${activeEpisode.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const currentTurn: DialogueTurn | undefined = activeEpisode?.dialogueTurns?.[currentTurnIndex];

  // Selected Studio Elements (Custom Clones & Backgrounds)
  const activeBgPreset = PODCAST_BACKGROUND_PRESETS.find(b => b.id === activeEpisode?.backgroundId);
  const currentStageBg = activeEpisode?.backgroundUrl || activeBgPreset?.previewUrl || '';
  const activeHostClone = HOST_CLONE_PRESETS.find(h => h.id === activeEpisode?.hostCloneId) || HOST_CLONE_PRESETS[0];
  const activeMohanClone = MOHAN_CLONE_PRESETS.find(m => m.id === activeEpisode?.mohanCloneId) || MOHAN_CLONE_PRESETS[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header Bar */}
      <header className="border-b border-emerald-900/50 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Mic className="h-5 w-5 text-slate-950 font-bold" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Swar Vani Podcast <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">स्वर वाणी</span>
              </h1>
              <p className="text-xs text-slate-400">Authentic Student Questions & Exact Answers by Mohan Sir</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowManualModal(true)}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/20 transition transform active:scale-95 border border-emerald-300/40"
              title="Add AI Question, Mohan Sir Answer, Clones and Studio Background manually"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Create Podcast (Manual)</span>
            </button>
            <button
              onClick={() => setShowAskModal(true)}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 shadow-sm transition transform active:scale-95"
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="hidden sm:inline">Ask Mohan Sir (AI Auto)</span>
              <span className="sm:hidden">AI Auto</span>
            </button>
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-white px-3 py-2 rounded-lg border border-slate-800 hover:bg-slate-800 transition hidden md:inline-flex"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero Section */}
        <div className="mb-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

          <div className="max-w-3xl relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
              🎙️ Interactive 2-Speaker AI Podcast Studio
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Real Class Discussions, Authentic Answers with Mohan Sir
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              In every workshop, hundreds of real students ask deep questions about water therapy, food rules, gas, anger, Level 2 Samyama, and Level 3 Ashtavakra Dhyan.
              Listen to our AI Seeker discuss these exact topics with Mohan Sir’s authentic first-person yogic voice.
            </p>
          </div>
        </div>

        {/* Studio Player & Active Episode Grid */}
        {activeEpisode && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
            {/* Left 7 Columns: Dual-Speaker Visual Studio & Live Turns */}
            <div className="lg:col-span-7 space-y-6">
              {/* Studio Stage: Host & Mohan Sir Visual Dual Avatars */}
              <div
                className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl relative overflow-hidden bg-cover bg-center transition-all duration-500"
                style={currentStageBg ? { backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.88), rgba(15, 23, 42, 0.94)), url(${currentStageBg})` } : undefined}
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Live Studio Dialogue · Turn {currentTurnIndex + 1} of {activeEpisode.dialogueTurns.length}
                    </span>
                    {activeBgPreset && (
                      <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-emerald-400 border border-slate-700 font-medium">
                        {activeBgPreset.name}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={copyEpisodeLink}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg border border-slate-800 hover:bg-slate-800 transition"
                  >
                    {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Share Episode'}</span>
                  </button>
                </div>

                {/* Dual Speaker Avatars */}
                <div className="grid grid-cols-2 gap-4 my-6">
                  {/* Speaker 1: AI Host */}
                  <div
                    className={`rounded-2xl border p-4 transition-all duration-300 flex flex-col items-center text-center backdrop-blur-sm ${
                      currentTurn?.speaker === 'host'
                        ? 'border-sky-500 bg-sky-950/40 shadow-lg shadow-sky-500/10 scale-102 ring-2 ring-sky-500/40'
                        : 'border-slate-800/80 bg-slate-900/60 opacity-80'
                    }`}
                  >
                    <div className="relative mb-3">
                      <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-500 p-1 flex items-center justify-center shadow-md">
                        <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center overflow-hidden">
                          <span className="text-3xl">{activeHostClone.avatarIcon || '🎙️'}</span>
                        </div>
                      </div>
                      {currentTurn?.speaker === 'host' && isPlaying && (
                        <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-sky-500 text-slate-950 text-[10px] font-black uppercase tracking-wider animate-bounce">
                          Speaking
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-white">{activeEpisode.hostName || activeHostClone.name}</span>
                    <span className="text-[11px] text-sky-400 font-medium">{activeHostClone.title || 'Curious Seeker / Host'}</span>
                  </div>

                  {/* Speaker 2: Mohan Sir (Clone Avatar) */}
                  <div
                    className={`rounded-2xl border p-4 transition-all duration-300 flex flex-col items-center text-center backdrop-blur-sm ${
                      currentTurn?.speaker === 'mohan_sir'
                        ? 'border-emerald-500 bg-emerald-950/40 shadow-lg shadow-emerald-500/10 scale-102 ring-2 ring-emerald-500/40'
                        : 'border-slate-800/80 bg-slate-900/60 opacity-80'
                    }`}
                  >
                    <div className="relative mb-3">
                      <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 flex items-center justify-center shadow-md overflow-hidden">
                        <img
                          src={activeMohanClone.avatarUrl || "/avatar-studio/looks/mohan_white_khadi_1080p.jpg"}
                          alt="Mohan Sir"
                          className="h-full w-full object-cover rounded-full"
                        />
                      </div>
                      {currentTurn?.speaker === 'mohan_sir' && isPlaying && (
                        <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider animate-bounce">
                          Guiding
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-white">Mohan Sir (मोहन काळबुर्गी)</span>
                    <span className="text-[11px] text-emerald-400 font-medium">{activeMohanClone.badge || 'Swar Yoga Master & Founder'}</span>
                  </div>
                </div>

                {/* Active Speaking Subtitle / Speech Bubble */}
                {currentTurn && (
                  <div
                    className={`rounded-2xl p-5 border transition-all ${
                      currentTurn.speaker === 'mohan_sir'
                        ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100'
                        : 'border-sky-500/40 bg-sky-950/30 text-sky-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        {currentTurn.speaker === 'mohan_sir' ? '🕉️ ' : '🎤 '}
                        {currentTurn.speakerName}
                      </span>
                      {currentTurn.toneCue && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                          {currentTurn.toneCue}
                        </span>
                      )}
                    </div>
                    <p className="text-sm sm:text-base leading-relaxed font-medium">
                      "{currentTurn.text}"
                    </p>
                  </div>
                )}

                {/* Player Controls */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrevTurn}
                      disabled={currentTurnIndex === 0}
                      className="h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center text-white transition active:scale-95"
                      title="Previous Turn"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>

                    <button
                      onClick={togglePlayPause}
                      className="h-12 w-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20 transition active:scale-95"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
                    </button>

                    <button
                      onClick={handleNextTurn}
                      disabled={currentTurnIndex >= activeEpisode.dialogueTurns.length - 1}
                      className="h-10 w-10 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center text-white transition active:scale-95"
                      title="Next Turn"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Playback speed selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Speed:</span>
                    {[1, 1.25, 1.5].map(speed => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-bold transition ${
                          playbackSpeed === speed
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                            : 'border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Full Dialogue Transcript (All Turns) */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-400" />
                    <span>Complete Q&A Dialogue Script</span>
                  </h3>
                  <span className="text-xs text-slate-400">{activeEpisode.dialogueTurns.length} dialogue turns</span>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {activeEpisode.dialogueTurns.map((turn, idx) => (
                    <div
                      key={idx}
                      onClick={() => playTurn(idx)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                        currentTurnIndex === idx
                          ? 'border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/40'
                          : 'border-slate-800/80 bg-slate-900/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-bold ${turn.speaker === 'mohan_sir' ? 'text-emerald-400' : 'text-sky-400'}`}>
                          {turn.speaker === 'mohan_sir' ? '🕉️ ' : '🎤 '} {turn.speakerName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Turn {turn.turnNumber}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{turn.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Episode Details, Grounded Knowledge & Origin */}
            <div className="lg:col-span-5 space-y-6">
              {/* Active Episode Metadata Card */}
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black">
                    EPISODE {activeEpisode.episodeNumber}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold capitalize">
                    {activeEpisode.category.replace(/_/g, ' ')}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold uppercase">
                    {activeEpisode.language}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white leading-snug">{activeEpisode.title}</h3>
                <p className="text-xs text-slate-400 font-medium">{activeEpisode.topic}</p>

                {/* Real Student Question Box */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1.5">
                    <HelpCircle className="h-4 w-4" />
                    <span>Real Student Question Asked in Class</span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-100 font-medium italic">
                    "{activeEpisode.studentQuestion}"
                  </p>
                </div>

                {/* Mohan Sir's Exact Grounded Answer Summary */}
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold mb-1.5">
                    <span>🕉️</span>
                    <span>Mohan Sir's Exact Yogic Guidance</span>
                  </div>
                  <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                    {activeEpisode.mohanSirAnswer}
                  </p>
                </div>

                {/* Tags */}
                {activeEpisode.tags?.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-2">
                    {activeEpisode.tags.map(tag => (
                      <span key={tag} className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter and Episode List Section */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Browse All Podcast Discussions</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-semibold">
                  {episodes.length} Episodes
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Select any episode to listen to Mohan Sir and our seeker host</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search topics (water, gas, Level 2...)"
                className="pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full sm:w-64"
              />
            </form>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'water_digestion', label: '💧 Water & Digestion' },
              { id: 'gas_sleep_health', label: '🌙 Gas & Sleep' },
              { id: 'mind_emotions', label: '🧠 Mind & Anger' },
              { id: 'weight_loss_metabolism', label: '🔥 Weight Loss' },
              { id: 'level2_samyama', label: '🧘 Level 2 Samyama' },
              { id: 'level3_ashtavakra', label: '✨ Level 3 Ashtavakra' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === tab.id
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Language Pills */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Language:</span>
            {[
              { id: 'all', label: 'All' },
              { id: 'mr', label: 'मराठी (Marathi)' },
              { id: 'hi', label: 'हिंदी (Hindi)' },
              { id: 'en', label: 'English' },
            ].map(lang => (
              <button
                key={lang.id}
                onClick={() => setSelectedLanguage(lang.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  selectedLanguage === lang.id
                    ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Episode Cards Grid */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-400" />
              <span>Loading podcast discussions...</span>
            </div>
          ) : episodes.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm rounded-2xl border border-slate-800 bg-slate-900/40">
              No podcast episodes found for this filter. Try asking a question using the button above!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {episodes.map(ep => (
                <div
                  key={ep.id}
                  onClick={() => selectEpisode(ep)}
                  className={`rounded-2xl border p-5 transition cursor-pointer flex flex-col justify-between ${
                    activeEpisode?.id === ep.id
                      ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-900/20 ring-1 ring-emerald-500'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                        EP {ep.episodeNumber}
                      </span>
                      <span className="text-slate-400 text-[11px] uppercase font-semibold">
                        {ep.language} · {ep.dialogueTurns.length} turns
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white line-clamp-2 leading-snug">
                      {ep.title}
                    </h4>

                    <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-2.5">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                        Student Question:
                      </span>
                      <p className="text-xs text-slate-300 line-clamp-2 italic">
                        "{ep.studentQuestion}"
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Listen Now</span>
                    </span>
                    <span>{Math.round(ep.durationSeconds / 60)} mins</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Ask Mohan Sir / Generate Podcast Episode Modal */}
      {showAskModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎙️</span>
                <h3 className="text-lg font-bold text-white">Ask Mohan Sir a Question</h3>
              </div>
              <button
                onClick={() => setShowAskModal(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Enter any real question you have about Swar Yoga, water rules, meal times, breathing, or sadness.
              Our system will ground the answer in Mohan Sir’s verbatim teachings and generate a new 2-speaker podcast episode for you.
            </p>

            <form onSubmit={handleGeneratePodcast} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Your Question
                </label>
                <textarea
                  required
                  rows={3}
                  value={customQuestion}
                  onChange={e => setCustomQuestion(e.target.value)}
                  placeholder="e.g. Mohan Sir, can I drink warm water while eating spicy food? What happens to Jatharagni?"
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Podcast Language
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'en', label: 'English' },
                    { id: 'hi', label: 'Hindi (हिंदी)' },
                    { id: 'mr', label: 'Marathi (मराठी)' },
                  ].map(l => (
                    <button
                      type="button"
                      key={l.id}
                      onClick={() => setCustomLang(l.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        customLang === l.id
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {generateError && (
                <p className="text-xs text-red-400 bg-red-950/30 p-2.5 rounded-lg border border-red-800/40">
                  {generateError}
                </p>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAskModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingCustom || !customQuestion.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg disabled:opacity-50 transition"
                >
                  {generatingCustom ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Episode…</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate 2-Speaker Episode</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual 2-Speaker AI Podcast Creator Modal */}
      <ManualPodcastCreatorModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onCreated={(newEp) => {
          setEpisodes(prev => [newEp, ...prev]);
          setActiveEpisode(newEp);
          setCurrentTurnIndex(0);
          setShowManualModal(false);
          // Play the newly created episode
          setTimeout(() => {
            playTurn(0, newEp);
          }, 500);
        }}
      />
    </div>
  );
}

