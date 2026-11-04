'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Trash2,
  CheckCircle2,
  Check,
  Plus,
  AlertCircle,
  RefreshCw,
  X,
  Radio,
  Mic,
  Eye,
  Shirt,
  Activity,
  Globe,
  Sliders,
  ShieldCheck,
  Video,
  Search,
  ExternalLink,
  Award,
  Zap,
} from 'lucide-react';
import { AVATAR_DNA_50_CATALOG, MOHAN_VOCAL_DNA_MODELS } from '@/lib/mohanAiClone/avatarDna50Catalog';

export interface AvatarLookItem {
  id: string;
  title: string;
  heading: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  look_category: string;
  outfit_style: string;
  emotion_profile: string;
  speaking_tone?: string;
  duration_seconds?: number;
  is_active?: number | boolean;
  created_at?: string;
}

export interface VocalDnaItem {
  id: string;
  language: string;
  tone_name: string;
  pitch_hz: number;
  cadence_words_per_minute: number;
  characteristic: string;
  sample_phrase: string;
  audio_sample_url: string;
}

interface AvatarDnaDetailsProps {
  token: string | null;
}

export default function AvatarDnaDetails({ token }: AvatarDnaDetailsProps) {
  // Navigation subtabs
  const [activeSubTab, setActiveSubTab] = useState<'looks' | 'facial' | 'vocal' | 'postures' | 'wardrobe' | 'deploy'>('looks');

  // Core Data State
  const [looks, setLooks] = useState<AvatarLookItem[]>([]);
  const [activeLookId, setActiveLookId] = useState<string>('');
  const [vocalDna, setVocalDna] = useState<VocalDnaItem[]>([]);
  const [wardrobeDna, setWardrobeDna] = useState<any[]>([]);
  const [facialDna, setFacialDna] = useState<any[]>([]);
  const [postureDna, setPostureDna] = useState<any[]>([]);

  // UI State
  const [loading, setLoading] = useState<boolean>(true);
  const [operating, setOperating] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string>('');
  const [successNotice, setSuccessNotice] = useState<string>('');

  // Filtering & Search for Looks
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Video Playing State
  const [playingLookId, setPlayingLookId] = useState<string | null>(null);
  const [mutedLookId, setMutedLookId] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Audio Playing State (for Vocal DNA)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [ttsInputText, setTtsInputText] = useState<string>(
    'सूर्य नाड़ी में जब भोजन किया जाता है, तो जठराग्नि तीव्र होती है और पाचन सर्वोत्तम होता है।'
  );
  const [ttsTesting, setTtsTesting] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Modal: Add New Look
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newHeading, setNewHeading] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newVideoUrl, setNewVideoUrl] = useState<string>('');
  const [newThumbnailUrl, setNewThumbnailUrl] = useState<string>('https://swaryogacrm.b-cdn.net/mohan.jpg');
  const [newCategory, setNewCategory] = useState<string>('vedic_traditional');
  const [newOutfitStyle, setNewOutfitStyle] = useState<string>('');
  const [newEmotionProfile, setNewEmotionProfile] = useState<string>('');

  // Fetch all Avatar DNA assets
  const fetchDnaData = async () => {
    setLoading(true);
    setErrorNotice('');
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.looks && Array.isArray(data.looks) && data.looks.length > 0) {
          setLooks(data.looks);
          setActiveLookId(data.activeLookId || data.looks[0].id);
        } else {
          // Fallback to 50 catalog
          loadFallbackCatalog();
        }

        if (data.vocalDna && Array.isArray(data.vocalDna) && data.vocalDna.length > 0) {
          setVocalDna(data.vocalDna);
        } else {
          loadFallbackVocal();
        }

        if (Array.isArray(data.wardrobeDna)) setWardrobeDna(data.wardrobeDna);
        if (Array.isArray(data.facialDna)) setFacialDna(data.facialDna);
        if (Array.isArray(data.postureDna)) setPostureDna(data.postureDna);
      } else {
        loadFallbackCatalog();
        loadFallbackVocal();
      }
    } catch {
      loadFallbackCatalog();
      loadFallbackVocal();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackCatalog = () => {
    const catalogFormatted: AvatarLookItem[] = AVATAR_DNA_50_CATALOG.map(c => ({
      id: c.id,
      title: c.name,
      heading: c.heading || c.name,
      description: c.description || 'Authentic Swar Yoga posture and discourse by Mohan Sir.',
      video_url: c.videoUrl || 'https://swaryogacrm.b-cdn.net/users/mohan-rag-avatar/training-vault/1793151988088-hgfwl8-Shad_Ripu_Explained___6_Enemies_of_the_Mind_That_Destroy_Peace.mp4',
      thumbnail_url: c.thumbnailUrl || 'https://swaryogacrm.b-cdn.net/mohan.jpg',
      look_category: c.category || 'vedic_traditional',
      outfit_style: c.outfitStyle || 'White Khadi Kurta',
      emotion_profile: c.emotionProfile || 'Calm Meditative Focus',
      speaking_tone: c.speakingTone || 'Serene, Measured Cadence',
      duration_seconds: c.durationSeconds || 120,
      is_active: c.isPrimary ? 1 : 0,
    }));
    setLooks(catalogFormatted);
    setActiveLookId(catalogFormatted[0]?.id || 'avatar-vedic-white-pranayama');
  };

  const loadFallbackVocal = () => {
    setVocalDna(
      MOHAN_VOCAL_DNA_MODELS.map(v => ({
        id: v.id,
        language: v.language,
        tone_name: v.toneName,
        pitch_hz: v.pitchHz,
        cadence_words_per_minute: v.cadenceWordsPerMinute,
        characteristic: v.characteristic,
        sample_phrase: v.samplePhrase,
        audio_sample_url: v.audioSampleUrl,
      }))
    );
  };

  useEffect(() => {
    fetchDnaData();
  }, [token]);

  // Video playback toggling
  const togglePlayVideo = (lookId: string) => {
    if (playingLookId === lookId) {
      if (videoRefs.current[lookId]) {
        videoRefs.current[lookId]?.pause();
      }
      setPlayingLookId(null);
    } else {
      if (playingLookId && videoRefs.current[playingLookId]) {
        videoRefs.current[playingLookId]?.pause();
      }
      setPlayingLookId(lookId);
      setTimeout(() => {
        if (videoRefs.current[lookId]) {
          videoRefs.current[lookId]?.play().catch(e => console.warn('Playback error:', e));
        }
      }, 50);
    }
  };

  const toggleMuteVideo = (lookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRefs.current[lookId];
    if (vid) {
      vid.muted = !vid.muted;
      setMutedLookId(vid.muted ? lookId : null);
    }
  };

  // Vocal audio playback toggling
  const togglePlayAudio = (voice: VocalDnaItem) => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    if (playingVoiceId === voice.id) {
      audio.pause();
      setPlayingVoiceId(null);
    } else {
      audio.src = voice.audio_sample_url;
      audio.play().catch(e => console.warn('Audio play error:', e));
      setPlayingVoiceId(voice.id);
      audio.onended = () => setPlayingVoiceId(null);
    }
  };

  // Set Active DNA Look Worldwide
  const handleSetActiveLook = async (lookId: string) => {
    setOperating(true);
    setErrorNotice('');
    setSuccessNotice('');
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'set_active', lookId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to set active DNA look');
      }

      setActiveLookId(lookId);
      setLooks(prev => prev.map(l => ({ ...l, is_active: l.id === lookId ? 1 : 0 })));
      setSuccessNotice('⚡ Look activated worldwide! Mohan Sir Digital Twin is bound to this look.');
      setTimeout(() => setSuccessNotice(''), 5000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Error setting active DNA look');
    } finally {
      setOperating(false);
    }
  };

  // Delete Look
  const handleDeleteLook = async (lookId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to permanently delete "${title}" from the Avatar DNA Library?`)) {
      return;
    }
    setOperating(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'delete_look', lookId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete look');
      }

      setLooks(prev => prev.filter(l => l.id !== lookId));
      if (activeLookId === lookId && looks.length > 1) {
        setActiveLookId(looks[0].id);
      }
      setSuccessNotice(`"${title}" permanently removed from Avatar DNA Library.`);
      setTimeout(() => setSuccessNotice(''), 4000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Error deleting look');
    } finally {
      setOperating(false);
    }
  };

  // Add Look Modal Submit
  const handleSaveNewLook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newVideoUrl.trim()) return;

    setOperating(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const newLookObj = {
        title: newTitle,
        heading: newHeading || newTitle,
        description: newDescription || 'Mohan Sir authentic Swar Yoga teaching look.',
        video_url: newVideoUrl,
        thumbnail_url: newThumbnailUrl || 'https://swaryogacrm.b-cdn.net/mohan.jpg',
        look_category: newCategory,
        outfit_style: newOutfitStyle || 'Authentic Handspun Kurta',
        emotion_profile: newEmotionProfile || 'Meditation Focus',
      };

      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'save_look', look: newLookObj }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save look');
      }

      const data = await res.json();
      if (Array.isArray(data.looks)) {
        setLooks(data.looks);
      } else {
        await fetchDnaData();
      }

      setShowAddModal(false);
      setNewTitle('');
      setNewHeading('');
      setNewDescription('');
      setNewVideoUrl('');
      setNewOutfitStyle('');
      setNewEmotionProfile('');
      setSuccessNotice('✨ New Mohan Sir Avatar Look successfully added to DNA Library!');
      setTimeout(() => setSuccessNotice(''), 5000);
    } catch (err: any) {
      setErrorNotice(err.message || 'Error saving look');
    } finally {
      setOperating(false);
    }
  };

  // Filter Look items
  const filteredLooks = looks.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (item.title || '').toLowerCase().includes(q) ||
      (item.heading || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q) ||
      (item.outfit_style || '').toLowerCase().includes(q);

    const cat = item.look_category || '';
    const matchesCategory =
      categoryFilter === 'all' ||
      cat === categoryFilter ||
      (categoryFilter === 'vedic_traditional' && (cat === 'spiritual' || cat === 'vedic_traditional')) ||
      (categoryFilter === 'ashram_sadhana' && (cat === 'ashram' || cat === 'ashram_sadhana')) ||
      (categoryFilter === 'pranayama' && cat === 'pranayama') ||
      (categoryFilter === 'himalayan' && (cat === 'himalayan' || cat === 'ancient')) ||
      (categoryFilter === 'modern_corporate' && (cat === 'corporate' || cat === 'modern_corporate')) ||
      (categoryFilter === 'wellness' && cat === 'wellness') ||
      (categoryFilter === 'mudra' && cat === 'mudra') ||
      (categoryFilter === 'modern' && cat === 'modern');

    return matchesSearch && matchesCategory;
  });

  const activeLook = looks.find(l => l.id === activeLookId) || looks[0];

  return (
    <div className="space-y-6">
      {/* 1. Master Header Card with Ambient Emerald Gradient */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-6 text-white shadow-2xl">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Mohan Digital Clone Master Engine • 50+ DNA Presets
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-white">
              Mohan Sir Avatar DNA Library
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              50+ Full-Body Digital Twins, High-Fidelity Vocal Models, Facial Kinematics, Mudras, and Authentic Vedic Attire.
            </p>
          </div>

          {/* Active Worldwide DNA Showcase Pill */}
          {activeLook && (
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-500/40 bg-black/40 p-3.5 backdrop-blur-md">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-emerald-400 bg-slate-900 shadow-lg">
                <img
                  src={activeLook.thumbnail_url || 'https://swaryogacrm.b-cdn.net/mohan.jpg'}
                  alt={activeLook.heading}
                  className="h-full w-full object-cover object-top"
                  onError={e => {
                    (e.target as HTMLImageElement).src = 'https://swaryogacrm.b-cdn.net/mohan.jpg';
                  }}
                />
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-black" />
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    Active Worldwide DNA
                  </span>
                </div>
                <div className="max-w-[200px] truncate text-xs font-bold text-white">
                  {activeLook.heading || activeLook.title}
                </div>
                <div className="text-[11px] text-emerald-200/70 truncate max-w-[200px]">
                  {activeLook.outfit_style}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6 Master DNA Subtabs Navigation */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-emerald-800/40 pt-4">
          <button
            type="button"
            onClick={() => setActiveSubTab('looks')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === 'looks'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'bg-white/5 text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Video className="h-4 w-4" />
            <span>1. Avatar DNA Looks ({looks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('vocal')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === 'vocal'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'bg-white/5 text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Mic className="h-4 w-4" />
            <span>2. Vocal &amp; Speech DNA ({vocalDna.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('facial')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === 'facial'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'bg-white/5 text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span>3. Facial Expression DNA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('postures')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === 'postures'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'bg-white/5 text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>4. Yogic Mudras &amp; Asanas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('wardrobe')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === 'wardrobe'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'bg-white/5 text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Shirt className="h-4 w-4" />
            <span>5. Wardrobe &amp; Dress DNA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('deploy')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeSubTab === 'deploy'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'bg-white/5 text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>6. Universal Deployment</span>
          </button>
        </div>
      </div>

      {/* Floating Notices */}
      {successNotice && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 shadow-sm animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {errorNotice && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-900 shadow-sm animate-fade-in">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* SUBTAB 1: AVATAR DNA LOOKS (50+ PRESETS) */}
      {activeSubTab === 'looks' && (
        <div className="space-y-6">
          {/* Controls: Search, Category Filters, and Add Button */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Style Filter:</span>
              {[
                { id: 'all', label: `All Styles (${looks.length})` },
                { id: 'vedic_traditional', label: 'Vedic Classical' },
                { id: 'ashram_sadhana', label: 'Ashram Practice' },
                { id: 'pranayama', label: 'Pranayama Master' },
                { id: 'himalayan', label: 'Himalayan Silence' },
                { id: 'modern_corporate', label: 'Corporate Keynote' },
                { id: 'wellness', label: 'Ayurvedic Healer' },
                { id: 'mudra', label: 'Mudras & Asanas' },
                { id: 'modern', label: 'Modern Flow' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    categoryFilter === cat.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search 50+ avatars, outfits, mudras…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Mohan Look</span>
              </button>
            </div>
          </div>

          {/* Avatar Cards Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLooks.map(item => {
              const isPlaying = playingLookId === item.id;
              const isMuted = mutedLookId === item.id;
              const isActive = item.id === activeLookId || item.is_active === 1 || item.is_active === true;
              const durationMin = item.duration_seconds
                ? `${Math.floor(item.duration_seconds / 60)}:${String(Math.floor(item.duration_seconds % 60)).padStart(2, '0')}`
                : '2:00';

              return (
                <div
                  key={item.id}
                  className={`group flex flex-col overflow-hidden rounded-3xl border transition-all duration-300 bg-white shadow-sm hover:shadow-xl ${
                    isActive
                      ? 'border-emerald-500 ring-2 ring-emerald-400/50 shadow-emerald-500/10'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                  style={{ minHeight: '440px' }}
                >
                  {/* Video & Poster Area */}
                  <div className="relative flex-1 bg-black overflow-hidden min-h-[220px]">
                    {isPlaying ? (
                      item.video_url.includes('iframe.mediadelivery.net') ? (
                        <iframe
                          src={`${item.video_url}?autoplay=true&preload=true`}
                          className="h-full w-full border-0 absolute inset-0"
                          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          ref={el => {
                            videoRefs.current[item.id] = el;
                          }}
                          src={item.video_url}
                          autoPlay
                          playsInline
                          controls
                          className="h-full w-full object-cover object-top absolute inset-0"
                        />
                      )
                    ) : (
                      <div className="relative h-full w-full min-h-[220px]">
                        <img
                          src={item.thumbnail_url || (item.video_url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i) ? `https://vz-d0769ece-079.b-cdn.net/${item.video_url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)?.[1]}/preview.webp` : '/avatar-studio/looks/mohan_white_khadi_1080p.jpg')}
                          alt={item.title}
                          className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                          onError={e => {
                            const guid = item.video_url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)?.[1];
                            if (guid && !e.currentTarget.src.includes('thumbnail.jpg')) {
                              e.currentTarget.src = `https://vz-d0769ece-079.b-cdn.net/${guid}/thumbnail.jpg`;
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
                      </div>
                    )}

                    {/* Top Floating Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-10">
                      <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md border border-white/10 uppercase tracking-wide">
                        {item.look_category.replace(/_/g, ' ')}
                      </span>

                      <button
                        type="button"
                        onClick={e => handleDeleteLook(item.id, item.heading || item.title, e)}
                        disabled={operating}
                        className="pointer-events-auto flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-md hover:bg-red-700 hover:scale-105 active:scale-95 transition cursor-pointer"
                        title="Delete look from library"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>

                    {/* Center Play / Pause Circle Button */}
                    {!isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center transition-all bg-black/10 group-hover:bg-black/30 z-10">
                        <button
                          type="button"
                          onClick={() => togglePlayVideo(item.id)}
                          className="flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 shadow-2xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:scale-110 shadow-emerald-500/40 cursor-pointer"
                          title="Play Mohan Sir Look Video"
                        >
                          <Play className="h-6 w-6 ml-0.5 fill-current" />
                        </button>
                      </div>
                    )}

                    {/* Bottom Control Strip */}
                    {!isPlaying && (
                      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/90 z-10">
                        <button
                          type="button"
                          onClick={e => toggleMuteVideo(item.id, e)}
                          className="rounded-md bg-black/60 p-1.5 backdrop-blur-md hover:bg-black/80 cursor-pointer"
                          title={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted ? (
                            <VolumeX className="h-3.5 w-3.5 text-red-400" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <span className="rounded-md bg-black/60 px-2 py-0.5 font-mono text-[10px] backdrop-blur-md">
                          {durationMin}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Content & Action Buttons */}
                  <div className="flex flex-1 flex-col justify-between p-5 space-y-3">
                    <div className="space-y-1.5">
                      <h3
                        className="text-sm font-extrabold text-slate-900 truncate tracking-tight"
                        title={item.heading || item.title}
                      >
                        {item.heading || item.title}
                      </h3>
                      <p
                        className="text-xs text-slate-600 line-clamp-2 leading-relaxed"
                        title={item.description}
                      >
                        {item.description}
                      </p>
                    </div>

                    <div className="space-y-3 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                          👔 {item.outfit_style}
                        </span>
                        <span className="text-emerald-700 font-medium truncate max-w-[140px]">
                          ✨ {(item.emotion_profile || '').split('&')[0]}
                        </span>
                      </div>

                      {/* Select as Active DNA Button */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={operating || isActive}
                          onClick={() => handleSetActiveLook(item.id)}
                          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition shadow-sm ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-default'
                              : 'bg-slate-900 text-white hover:bg-emerald-700 active:scale-98'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span>Currently Active DNA (In Use)</span>
                            </>
                          ) : (
                            <>
                              <Zap className="h-3.5 w-3.5 text-yellow-400" />
                              <span>⚡ Select as Active DNA</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={e => handleDeleteLook(item.id, item.heading || item.title, e)}
                          disabled={operating}
                          className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-600 hover:bg-red-100 hover:border-red-300 transition"
                          title="Delete look"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: VOCAL & SPEECH DNA (8 VOCAL MODELS & TTS PLAYER) */}
      {activeSubTab === 'vocal' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Mic className="h-5 w-5 text-emerald-600" />
                  Mohan Sir Vocal Timbre &amp; Authentic Speech Models
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Trained on authentic Satsang discourses, Shiva Swarodaya verses, and morning pranayama instruction.
                  Pitch and rhythm cadence configured for all supported languages.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
                  8 Vocal Archetypes Ready
                </span>
              </div>
            </div>

            {/* Vocal Models Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {vocalDna.map(voice => {
                const isPlaying = playingVoiceId === voice.id;

                return (
                  <div
                    key={voice.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition hover:border-emerald-300 hover:shadow-md"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                          {voice.language}
                        </span>
                        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                          <span>Pitch: {voice.pitch_hz} Hz</span>
                          <span>•</span>
                          <span>{voice.cadence_words_per_minute} WPM</span>
                        </div>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900">{voice.tone_name}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{voice.characteristic}</p>

                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs italic text-slate-800">
                        &quot;{voice.sample_phrase}&quot;
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                      <button
                        type="button"
                        onClick={() => togglePlayAudio(voice)}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                          isPlaying
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                            : 'bg-slate-900 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="h-3.5 w-3.5 fill-current" />
                            <span>Pause Audio</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>Listen Audio Sample</span>
                          </>
                        )}
                      </button>

                      {/* Animated audio bars if playing */}
                      {isPlaying && (
                        <div className="flex items-center gap-1">
                          {[40, 70, 100, 60, 90, 50, 80].map((h, i) => (
                            <span
                              key={i}
                              className="w-1 bg-emerald-500 rounded-full animate-pulse"
                              style={{ height: `${h}%`, animationDelay: `${i * 120}ms` }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive Voice Test Console */}
            <div className="mt-6 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Radio className="h-4 w-4 text-emerald-600" />
                  Live Voice Test Console (OpenAI &amp; Replicate TTS)
                </h4>
                <span className="text-[11px] font-semibold text-slate-500">
                  Synthesize any script in Mohan Sir voice
                </span>
              </div>

              <textarea
                value={ttsInputText}
                onChange={e => setTtsInputText(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Type script in Hindi, Marathi, or English to hear the speech model…"
              />

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  Uses natural Indian Sanskrit/Hindi cadence matching Mohan Sir satsangs.
                </p>

                <button
                  type="button"
                  disabled={ttsTesting}
                  onClick={() => {
                    setTtsTesting(true);
                    // Play primary vocal model sample as verification
                    if (vocalDna[0]) togglePlayAudio(vocalDna[0]);
                    setTimeout(() => setTtsTesting(false), 2000);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm transition disabled:opacity-50"
                >
                  <Volume2 className="h-4 w-4" />
                  <span>{ttsTesting ? 'Synthesizing…' : 'Synthesize Voice Test'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: FACIAL EXPRESSION DNA */}
      {activeSubTab === 'facial' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Eye className="h-5 w-5 text-emerald-600" />
                Facial Expression DNA &amp; Kinematics
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Measured facial micro-movements, gaze alignment, and natural blinking patterns.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: 'Warm Satsang Smile', blendShape: 'smile_warm_01', intensity: '85%', desc: 'Tender mouth curve with gentle eye crinkle for compassionate discourses.' },
              { name: 'Scriptural Authority Gaze', blendShape: 'shastra_focus_02', intensity: '95%', desc: 'Steady forward unblinking gaze during sacred Shiva Swarodaya recitation.' },
              { name: 'Meditative Half-Closed', blendShape: 'dhyan_closed_03', intensity: '60%', desc: 'Inwardly focused eyelids during Pranayama and Kumbhaka guidance.' },
              { name: 'Conversational Nodding', blendShape: 'mentor_nod_04', intensity: '75%', desc: 'Affirmative head cadence during student questions and answers.' },
            ].map(item => (
              <div key={item.blendShape} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                  <span>{item.name}</span>
                  <span className="text-emerald-700">{item.intensity}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">{item.desc}</p>
                <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: item.intensity }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: YOGIC MUDRAS & ASANAS */}
      {activeSubTab === 'postures' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-600" />
            Yogic Mudras, Asanas &amp; Hand Gestures
          </h3>
          <p className="text-xs text-slate-600">
            Certified 3D bone kinematics for classical Swar Yoga hand seals and postures.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { name: 'Nasagra Mudra', category: 'Pranayama Seal', desc: 'Right hand thumb on right nostril, ring finger on left nostril for Nadi Shodhana.' },
              { name: 'Chin Mudra (Gyan Mudra)', category: 'Meditation Seal', desc: 'Index finger touching tip of thumb, forming a circle of consciousness.' },
              { name: 'Shanmukhi Mudra', category: 'Nada Yoga Seal', desc: 'Six sensory gates sealed with gentle fingertips to perceive inner cosmic sound.' },
              { name: 'Bhairava Mudra', category: 'Shiva Swar Posture', desc: 'Right hand placed gently upon left hand in lap, balancing Ida and Pingala.' },
              { name: 'Vayu Mudra', category: 'Therapeutic Seal', desc: 'Index finger folded to root of thumb to pacify gastric and nervous tremors.' },
              { name: 'Prana Mudra', category: 'Vital Energy', desc: 'Tips of ring and little finger joined with thumb for vitality amplification.' },
            ].map(item => (
              <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                  {item.category}
                </span>
                <h4 className="text-sm font-extrabold text-slate-900">{item.name}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 5: WARDROBE & DRESS DNA */}
      {activeSubTab === 'wardrobe' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Shirt className="h-5 w-5 text-emerald-600" />
            Mohan Sir Wardrobe DNA &amp; Sacred Attire
          </h3>
          <p className="text-xs text-slate-600">
            Digital human cloth physics for organic cottons, tussar silks, and ashram garments.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { name: 'Pristine White Khadi Kurta', occasion: 'Morning Pranayama & Tithi Sadhana', fabric: '100% Handspun Organic Khadi' },
              { name: 'Ashram Lime Green Kurta', occasion: 'Swar Shastra & Diet Mastery Discourses', fabric: 'Natural Dyed Breathable Linen' },
              { name: 'Sacred Saffron Ochre Silk', occasion: 'Shiva Swarodaya Temple Discourses', fabric: 'Handloom Tussar Silk with Zari Border' },
              { name: 'Sand Botanical Ashram Wear', occasion: 'Anahata Meditation & Compassion Satsang', fabric: 'Earth Handloom Cotton' },
              { name: 'Tailored Corporate Bandhgala', occasion: 'Global Health Summits & Keynotes', fabric: 'Refined Wool Silk Blend' },
              { name: 'Dynamic Slate Breathwear', occasion: 'Athletic Cadence & Movement Flow', fabric: 'Kinematic Stretch Fabric' },
            ].map(item => (
              <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                <h4 className="text-sm font-extrabold text-slate-900">{item.name}</h4>
                <p className="text-xs text-slate-600"><strong className="text-slate-800">Occasion:</strong> {item.occasion}</p>
                <p className="text-xs text-slate-600"><strong className="text-slate-800">Fabric:</strong> {item.fabric}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 6: UNIVERSAL DEPLOYMENT */}
      {activeSubTab === 'deploy' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-600" />
            Universal Infrastructure &amp; Deployment Pipeline
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Bunny Database (LibSQL)</span>
              </div>
              <p className="text-xs text-slate-600">
                All 50+ looks and 8 vocal models are active and synced across global edge regions.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Bunny CDN Media Acceleration</span>
              </div>
              <p className="text-xs text-slate-600">
                Direct MP4 and MP3 streaming endpoints with 100% uptime and high-speed delivery.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Contabo VPS Production Target</span>
              </div>
              <p className="text-xs text-slate-600">
                PM2 cluster reload with atomic build swap ensures zero downtime.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Mohan Sir Avatar Look */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Add Mohan Sir Look to DNA Library</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewLook} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Look Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Saffron Silk — Shiva Swarodaya Discourse"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Video MP4 URL</label>
                <input
                  type="url"
                  required
                  value={newVideoUrl}
                  onChange={e => setNewVideoUrl(e.target.value)}
                  placeholder="https://swaryogacrm.b-cdn.net/zoom-videos/...mp4"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="vedic_traditional">Vedic Classical</option>
                    <option value="ashram_sadhana">Ashram Practice</option>
                    <option value="pranayama">Pranayama Master</option>
                    <option value="himalayan">Himalayan Silence</option>
                    <option value="modern_corporate">Corporate Keynote</option>
                    <option value="wellness">Ayurvedic Healer</option>
                    <option value="mudra">Mudras &amp; Asanas</option>
                    <option value="modern">Modern Flow</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Outfit Style</label>
                  <input
                    type="text"
                    value={newOutfitStyle}
                    onChange={e => setNewOutfitStyle(e.target.value)}
                    placeholder="e.g. White Khadi Kurta & Mala"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                  </input>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Brief description of discourse topic, breathing focus, and context..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={operating}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 shadow-sm transition disabled:opacity-50"
                >
                  {operating ? 'Saving…' : 'Save Avatar Look'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
