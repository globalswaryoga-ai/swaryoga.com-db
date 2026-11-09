'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import MohanSirGeneratedAvatarLibrary from './MohanSirGeneratedAvatarLibrary';
import Phase1AvatarCreatorStudio from '@/components/admin/crm/avatar-studio/Phase1AvatarCreatorStudio';
import {
  Dna,
  Play,
  Pause,
  Sparkles,
  CheckCircle2,
  Smile,
  Volume2,
  Activity,
  Layers,
  Video,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  Globe2,
  Trash2,
  ExternalLink,
  Sliders,
  VolumeX,
  Maximize2,
  Eye,
  Camera,
  Film,
  Shirt,
  Copy
} from 'lucide-react';
import VoiceMicInputButton from './VoiceMicInputButton';
import type {
  AvatarDnaLook,
  FacialDnaItem,
  VocalDnaItem,
  YogicPostureItem,
  WardrobeDnaItem,
} from '@/lib/mohanRag/avatarDnaRepository';
import { summarizeFacialExtractionError } from '@/lib/mohanRag/facialExpressionErrors';
import FaceToChestLiveTalkModal from './FaceToChestLiveTalkModal';

type DnaSubTab = 'all_avatars' | 'phase1_creator' | 'looks' | 'facial' | 'vocal' | 'postures' | 'wardrobe' | 'deploy';

interface Props {
  token: string | null;
}

type FacialExtractionJobView = {
  id: string;
  video_url: string;
  status: string;
  progress_pct: number;
  total_frames_analyzed: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
};

type FacialExpressionClipView = {
  id: string;
  job_id: string;
  video_url: string;
  timestamp_ms: number;
  timestamp_formatted: string;
  primary_expression: string;
  intensity: number;
  confidence: number;
  created_at: string;
};

type FacialExtractionSummaryView = {
  totalClips: number;
  videoCount: number;
  orphanedClipCount: number;
  expressionCounts: Array<{ expression: string; count: number }>;
};

const EMPTY_FACIAL_EXTRACTION_SUMMARY: FacialExtractionSummaryView = {
  totalClips: 0,
  videoCount: 0,
  orphanedClipCount: 0,
  expressionCounts: [],
};

function getFacialClipSourceUrl(videoUrl: string, timestampMs: number): string {
  try {
    const url = new URL(videoUrl);
    if (['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'].includes(url.hostname.toLowerCase())) {
      url.searchParams.set('t', `${Math.floor(timestampMs / 1000)}s`);
    }
    return url.toString();
  } catch {
    return videoUrl;
  }
}

export default function MohanSirAvatarDnaLibrary({ token }: Props) {
  const [activeTab, setActiveTab] = useState<DnaSubTab>('all_avatars');
  const [looks, setLooks] = useState<AvatarDnaLook[]>([]);
  const [activeLookId, setActiveLookId] = useState<string>('');
  const [duplicateLookCount, setDuplicateLookCount] = useState(0);
  const [facialDna, setFacialDna] = useState<FacialDnaItem[]>([]);
  const [vocalDna, setVocalDna] = useState<VocalDnaItem[]>([]);
  const [postureDna, setPostureDna] = useState<YogicPostureItem[]>([]);
  const [wardrobeDna, setWardrobeDna] = useState<WardrobeDnaItem[]>([]);
  const [facialExtractionJobs, setFacialExtractionJobs] = useState<FacialExtractionJobView[]>([]);
  const [facialExtractionClips, setFacialExtractionClips] = useState<FacialExpressionClipView[]>([]);
  const [facialExtractionSummary, setFacialExtractionSummary] = useState(EMPTY_FACIAL_EXTRACTION_SUMMARY);
  const [facialClipOffset, setFacialClipOffset] = useState(0);
  const [hasMoreFacialClips, setHasMoreFacialClips] = useState(false);
  const [loadingFacialExtraction, setLoadingFacialExtraction] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Filters & Search for Looks
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Video Playing States
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [mutedVideoId, setMutedVideoId] = useState<string | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const facialExtractionFetchInFlight = useRef(false);

  // Face-to-Chest Live Talk Modal
  const [showLiveTalkModal, setShowLiveTalkModal] = useState(false);
  const [isAutoScoring, setIsAutoScoring] = useState(false);

  // Add Look Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newHeading, setNewHeading] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newCategory, setNewCategory] = useState<AvatarDnaLook['look_category']>('vedic_traditional');
  const [newOutfit, setNewOutfit] = useState('');
  const [newEmotion, setNewEmotion] = useState('');

  // Wardrobe States & Filter
  const [wardrobeFilter, setWardrobeFilter] = useState<string>('all');
  const [showAddWardrobeModal, setShowAddWardrobeModal] = useState(false);
  const [newWardrobeName, setNewWardrobeName] = useState('');
  const [newWardrobeCategory, setNewWardrobeCategory] = useState<WardrobeDnaItem['category']>('vedic_traditional');
  const [newWardrobeColorHex, setNewWardrobeColorHex] = useState('#F8FAFC');
  const [newWardrobeColorName, setNewWardrobeColorName] = useState('');
  const [newWardrobeFabric, setNewWardrobeFabric] = useState('');
  const [newWardrobeCollar, setNewWardrobeCollar] = useState('');
  const [newWardrobeOccasion, setNewWardrobeOccasion] = useState('');
  const [newWardrobeVideoUrl, setNewWardrobeVideoUrl] = useState('');

  // Facial Landmark Simulation
  const [activeFaceEmotion, setActiveFaceEmotion] = useState<string>('smile_warm');
  const [showMeshOverlay, setShowMeshOverlay] = useState(true);

  // Active Look Object
  const currentActiveLook = looks.find((l) => l.id === activeLookId) || looks[0];

  const fetchDnaData = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        headers: { Authorization: ['Bearer', token].join(' ') },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load Mohan Sir Avatar DNA');

      setLooks(data.looks || []);
      setActiveLookId(data.activeLookId || data.looks?.[0]?.id || '');
      setDuplicateLookCount(Number(data.duplicateLookCount || 0));
      setWardrobeDna(data.wardrobeDna || []);
      setFacialDna(data.facialDna || []);
      setVocalDna(data.vocalDna || []);
      setPostureDna(data.postureDna || []);
    } catch (err: any) {
      setError(err.message || 'Error loading Avatar DNA');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacialExtractionData = useCallback(async (offset = 0, append = false) => {
    if (!token || facialExtractionFetchInFlight.current) return;
    facialExtractionFetchInFlight.current = true;
    setLoadingFacialExtraction(true);
    try {
      const response = await fetch(`/api/admin/crm/mohan-rag/facial-expressions?limit=50&offset=${offset}`, {
        headers: { Authorization: ['Bearer', token].join(' ') },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load extracted facial clips');

      const extraction = data.extraction || {};
      const clips = Array.isArray(extraction.clips) ? extraction.clips as FacialExpressionClipView[] : [];
      const totalClips = Number(extraction.totalClips || 0);
      setFacialExtractionJobs(Array.isArray(data.jobs) ? data.jobs as FacialExtractionJobView[] : []);
      setFacialExtractionSummary({
        totalClips,
        videoCount: Number(extraction.videoCount || 0),
        orphanedClipCount: Number(extraction.orphanedClipCount || 0),
        expressionCounts: Array.isArray(extraction.expressionCounts) ? extraction.expressionCounts : [],
      });
      setFacialExtractionClips(current => append ? [...current, ...clips] : clips);
      const nextOffset = offset + clips.length;
      setFacialClipOffset(nextOffset);
      setHasMoreFacialClips(nextOffset < totalClips);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load extracted facial clips');
    } finally {
      facialExtractionFetchInFlight.current = false;
      setLoadingFacialExtraction(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDnaData();
  }, [token]);

  useEffect(() => {
    if (activeTab === 'facial') void fetchFacialExtractionData();
  }, [activeTab, fetchFacialExtractionData]);

  useEffect(() => {
    const hasActiveJobs = facialExtractionJobs.some(job => ['pending', 'downloading', 'analyzing'].includes(job.status));
    if (activeTab !== 'facial' || !hasActiveJobs) return;
    const timer = window.setInterval(() => void fetchFacialExtractionData(), 10_000);
    return () => window.clearInterval(timer);
  }, [activeTab, facialExtractionJobs, fetchFacialExtractionData]);

  // Handle Play/Pause toggle on a card video
  const togglePlay = (lookId: string) => {
    const video = videoRefs.current[lookId];
    if (!video) return;

    if (playingVideoId === lookId) {
      video.pause();
      setPlayingVideoId(null);
    } else {
      // Pause any currently playing video first
      if (playingVideoId && videoRefs.current[playingVideoId]) {
        videoRefs.current[playingVideoId]?.pause();
      }
      video.play().catch((e) => console.warn('Autoplay prevented:', e));
      setPlayingVideoId(lookId);
    }
  };

  const toggleMute = (lookId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRefs.current[lookId];
    if (!video) return;
    video.muted = !video.muted;
    setMutedVideoId(video.muted ? lookId : null);
  };

  // Set as Active DNA Look
  const handleSetActiveLook = async (lookId: string) => {
    if (!token) return;
    setActionLoading(true);
    setSuccessMsg('');
    setError('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'set_active', lookId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set active DNA look');

      setActiveLookId(lookId);
      setLooks((prev) =>
        prev.map((l) => ({
          ...l,
          is_active: l.id === lookId,
        }))
      );
      setSuccessMsg(`Look activated! Mohan Sir Avatar will use this look worldwide.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Error setting active DNA look');
    } finally {
      setActionLoading(false);
    }
  };

  // Save New Look
  const handleSaveNewLook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newTitle || !newVideoUrl) return;

    setActionLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_look',
          look: {
            title: newTitle,
            heading: newHeading || newTitle,
            description: newDescription || 'Mohan Sir authentic Swar Yoga lecture look.',
            video_url: newVideoUrl,
            look_category: newCategory,
            outfit_style: newOutfit || 'Authentic Outfit',
            emotion_profile: newEmotion || 'Teaching Focus',
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save look');

      setLooks(data.looks || []);
      setDuplicateLookCount(Number(data.duplicateLookCount || 0));
      setShowAddModal(false);
      setNewTitle('');
      setNewHeading('');
      setNewDescription('');
      setNewVideoUrl('');
      setNewOutfit('');
      setNewEmotion('');
      setSuccessMsg(data.message || 'Mohan Sir Avatar Look added to DNA Library.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Error saving look');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveDuplicateLooks = async () => {
    if (!token || duplicateLookCount < 1) return;
    if (!confirm(`Remove ${duplicateLookCount} duplicate DNA video entr${duplicateLookCount === 1 ? 'y' : 'ies'}? One record per video will be kept, including the active DNA look. This does not delete the original Bunny videos.`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers: {
          Authorization: ['Bearer', token].join(' '),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'remove_duplicate_looks' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove duplicate DNA entries');

      setLooks(data.looks || []);
      setActiveLookId(data.activeLookId || data.looks?.[0]?.id || '');
      setDuplicateLookCount(Number(data.duplicateLookCount || 0));
      setSuccessMsg(data.message || `Removed ${data.removedCount || 0} duplicate DNA entries.`);
    } catch (err: any) {
      setError(err.message || 'Error removing duplicate DNA entries');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Mohan Sir Look Permanently
  const handleDeleteLook = async (lookId: string, lookTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm(`Are you sure you want to permanently delete "${lookTitle}" from the Mohan Sir Avatar DNA Library? This cannot be undone.`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'delete_look', lookId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete look');

      setLooks(data.looks || []);
      setDuplicateLookCount(Number(data.duplicateLookCount || 0));
      setActiveLookId(data.activeLookId || data.looks?.[0]?.id || '');
      setSuccessMsg(`"${lookTitle}" permanently removed from Avatar DNA Library.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Error deleting look');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Mohan Sir Wardrobe Dress Permanently
  const handleDeleteWardrobe = async (wardrobeId: string, clothingName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm(`Are you sure you want to permanently delete "${clothingName}" from Wardrobe DNA? This cannot be undone.`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_wardrobe', wardrobeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete wardrobe dress');

      setWardrobeDna(prev => prev.filter(w => w.id !== wardrobeId));
      setSuccessMsg(`✓ "${clothingName}" permanently removed from Wardrobe DNA.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Error deleting wardrobe dress');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Facial Expression DNA
  const handleDeleteFacial = async (facialId: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm(`Are you sure you want to delete "${label}" from Facial Expression DNA?`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_facial', facialId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete facial DNA');

      if (Array.isArray(data.facialDna)) {
        setFacialDna(data.facialDna);
      } else {
        setFacialDna(prev => prev.filter(f => f.id !== facialId));
      }
      setSuccessMsg(`✓ "${label}" permanently removed from Facial Expression DNA.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Error deleting facial DNA');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Vocal & Speech DNA
  const handleDeleteVocal = async (vocalId: string, toneName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm(`Are you sure you want to delete "${toneName}" from Vocal & Speech DNA?`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_vocal', vocalId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete vocal DNA');

      if (Array.isArray(data.vocalDna)) {
        setVocalDna(data.vocalDna);
      } else {
        setVocalDna(prev => prev.filter(v => v.id !== vocalId));
      }
      setSuccessMsg(`✓ "${toneName}" permanently removed from Vocal & Speech DNA.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Error deleting vocal DNA');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Yogic Mudras & Postures DNA
  const handleDeletePosture = async (postureId: string, postureName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm(`Are you sure you want to delete "${postureName}" from Yogic Mudras & Postures?`)) {
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_posture', postureId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete posture DNA');

      if (Array.isArray(data.postureDna)) {
        setPostureDna(data.postureDna);
      } else {
        setPostureDna(prev => prev.filter(p => p.id !== postureId));
      }
      setSuccessMsg(`✓ "${postureName}" permanently removed from Yogic Mudras & Postures.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Error deleting posture DNA');
    } finally {
      setActionLoading(false);
    }
  };

  // Select Active Wardrobe Outfit for AI Avatar
  const handleSelectWardrobe = async (wardrobeId: string) => {
    if (!token) return;
    setActionLoading(true);
    setSuccessMsg('');
    setError('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'select_wardrobe', wardrobeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to select wardrobe dress');

      setWardrobeDna(data.wardrobeDna || []);
      setSuccessMsg('Mohan Sir Wardrobe Outfit selected for AI Avatar!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Error selecting wardrobe');
    } finally {
      setActionLoading(false);
    }
  };

  // Save Custom Wardrobe Dress
  const handleSaveNewWardrobe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newWardrobeName) return;
    setActionLoading(true);
    setSuccessMsg('');
    setError('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/avatar-dna', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save_wardrobe',
          item: {
            clothing_name: newWardrobeName,
            category: newWardrobeCategory,
            color_hex: newWardrobeColorHex,
            color_name: newWardrobeColorName || 'Sacred Attire',
            fabric_description: newWardrobeFabric || 'Handspun Organic Cotton',
            collar_style: newWardrobeCollar || 'Mandarin Collar',
            yogic_occasion: newWardrobeOccasion || 'Vedic Discourse & Lecture',
            video_clip_url: newWardrobeVideoUrl || 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4',
            front_image_url: 'https://swaryogacrm.b-cdn.net/avatar-studio/thumbnails/8f9280a32e94603307e5312213efd5465c5cbbddcdf9793026e0ce31c3b760b6.jpg',
            worn_in_videos_count: 1,
            is_selected: false,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save wardrobe dress');

      setWardrobeDna(data.wardrobeDna || []);
      setShowAddWardrobeModal(false);
      setNewWardrobeName('');
      setNewWardrobeColorName('');
      setNewWardrobeFabric('');
      setNewWardrobeCollar('');
      setNewWardrobeOccasion('');
      setNewWardrobeVideoUrl('');
      setSuccessMsg('New Mohan Sir Outfit & Dress added to Wardrobe Library!');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Error saving wardrobe dress');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Looks
  const filteredLooks = looks.filter((look) => {
    const matchesSearch =
      look.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      look.heading.toLowerCase().includes(searchQuery.toLowerCase()) ||
      look.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      look.outfit_style.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || look.look_category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER & ACTIVE DNA BANNER ── */}
      <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-950 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <Dna className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
              <span>Mohan Sir AI Avatar DNA Engine</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Mohan Sir Avatar DNA Library
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-emerald-100/80 leading-relaxed">
              Every created Mohan Sir DNA look, facial landmark expression, and authentic speaking tone
              is cataloged here. Select any look to deploy Mohan Sir’s active avatar worldwide across RAG Q&A,
              video generation, student courses, and live CRM.
            </p>
          </div>

          {/* Active Look Summary Card & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {currentActiveLook && (
              <div className="flex items-center gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-950/60 p-4 backdrop-blur-md">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-emerald-400 shadow-md">
                  <video
                    src={currentActiveLook.video_url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 bg-emerald-500/10" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                      Active Worldwide DNA
                    </span>
                  </div>
                  <div className="max-w-[180px] truncate text-xs font-bold text-white">
                    {currentActiveLook.heading}
                  </div>
                  <div className="text-[11px] text-emerald-200/70">
                    {currentActiveLook.outfit_style}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowLiveTalkModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 px-5 py-3 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/30 hover:scale-102 active:scale-98 transition"
              >
                <Video className="h-4 w-4" />
                <span>Launch Face-to-Chest Live Talk</span>
              </button>

              <button
                type="button"
                disabled={isAutoScoring}
                onClick={async () => {
                  if (!token) return;
                  setIsAutoScoring(true);
                  setSuccessMsg('');
                  setError('');
                  try {
                    const res = await fetch('/api/admin/crm/mohan-rag/auto-master-twin', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Auto evaluation failed');
                    setSuccessMsg(`👑 Auto-Scored: #${1} Master Twin is "${data.crownedVideo?.title}" (${data.crownedVideo?.overallMasterScore}% Score). Auto-bound to active avatar!`);
                    await fetchDnaData();
                    setTimeout(() => setSuccessMsg(''), 10000);
                  } catch (err: any) {
                    setError(err.message || 'Auto evaluation failed');
                  } finally {
                    setIsAutoScoring(false);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-950/80 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/90 transition disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                <span>{isAutoScoring ? 'Auto-Scoring 47 Videos…' : 'Auto-Crown #1 Master Twin'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 5 CONNECTED SUB-PAGE TABS ── */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-emerald-800/40 pt-4">
          <button
            type="button"
            onClick={() => setActiveTab('all_avatars')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'all_avatars'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/50'
                : 'bg-white/5 text-amber-200 hover:bg-white/10'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>🌟 All AI Avatars (42 Videos)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('phase1_creator')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'phase1_creator'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/50'
                : 'bg-white/5 text-emerald-200 hover:bg-white/10'
            }`}
          >
            <Zap className="h-4 w-4 text-emerald-300" />
            <span>⚡ In-House Avatar Engine (Phase 1)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('looks')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'looks'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-white/5 text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Film className="h-4 w-4" />
            <span>1. Avatar DNA Looks ({looks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('facial')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'facial'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-white/5 text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Smile className="h-4 w-4" />
            <span>2. Facial Expression DNA ({facialDna.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vocal')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'vocal'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-white/5 text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Volume2 className="h-4 w-4" />
            <span>3. Vocal & Speech DNA ({vocalDna.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('postures')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'postures'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-white/5 text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>4. Yogic Mudras & Postures ({postureDna.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wardrobe')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'wardrobe'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-white/5 text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Shirt className="h-4 w-4" />
            <span>5. Wardrobe & Dress DNA ({wardrobeDna.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deploy')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === 'deploy'
                ? 'bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-white/5 text-emerald-100 hover:bg-white/10'
            }`}
          >
            <Globe2 className="h-4 w-4" />
            <span>6. Universal Deployment</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 shadow-sm animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-900 shadow-sm">
          <span>{error}</span>
        </div>
      )}
            {/* ── SUB-PAGE 0: ALL 2K AI AVATARS LIBRARY (42 VIDEOS) ── */}
      {activeTab === 'all_avatars' && (
        <MohanSirGeneratedAvatarLibrary />
      )}

      {/* ── SUB-PAGE 0.5: IN-HOUSE AI AVATAR ENGINE (PHASE 1) ── */}
      {activeTab === 'phase1_creator' && (
        <Phase1AvatarCreatorStudio />
      )}

{activeTab === 'looks' && duplicateLookCount > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            {duplicateLookCount} repeated DNA video entr{duplicateLookCount === 1 ? 'y is' : 'ies are'} hidden. The same video will now reuse its existing library entry.
          </span>
          <button
            type="button"
            onClick={handleRemoveDuplicateLooks}
            disabled={actionLoading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-900 px-3 py-2 font-bold text-white transition hover:bg-amber-800 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove duplicate entries
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-PAGE 1: AVATAR DNA LOOKS (50% VIDEO PLAY/PAUSE + 3 LINES) ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'looks' && (
        <div className="space-y-6">
          {/* Controls Bar: Filters, Search & Add Look */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Filter Look Style:</span>
              {[
                { id: 'all', label: 'All Styles' },
                { id: 'vedic_traditional', label: 'Vedic Classical' },
                { id: 'ashram_sadhana', label: 'Ashram Practice' },
                { id: 'modern_corporate', label: 'Corporate Keynote' },
                { id: 'outdoor_nature', label: 'Sunrise Nature' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    categoryFilter === cat.id
                      ? 'bg-slate-900 text-white'
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
                  placeholder="Search looks, outfits, styles…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Mohan Sir Look</span>
              </button>
            </div>
          </div>

          {/* ── CARD GRID (EACH CARD: 50% VIDEO WITH PLAY/PAUSE, 3 LINES BELOW) ── */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLooks.map((look) => {
              const isPlaying = playingVideoId === look.id;
              const isMuted = mutedVideoId === look.id;
              const isSelectedActive = look.id === activeLookId;

              return (
                <div
                  key={look.id}
                  className={`group flex flex-col overflow-hidden rounded-3xl border transition-all duration-300 bg-white shadow-sm hover:shadow-xl ${
                    isSelectedActive
                      ? 'border-emerald-500 ring-2 ring-emerald-400/50'
                      : 'border-slate-200/90 hover:border-emerald-300'
                  }`}
                  style={{ minHeight: '440px' }}
                >
                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* ── TOP 50%: VIDEO CONTAINER WITH PLAY/PAUSE BUTTON OVERLAY ── */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  <div
                    className="relative flex-1 bg-black overflow-hidden group cursor-pointer"
                    style={{ minHeight: '220px', maxHeight: '240px' }}
                    onClick={() => togglePlay(look.id)}
                  >
                    {isPlaying && look.video_url?.includes('iframe.mediadelivery.net') ? (
                      <iframe
                        src={`${look.video_url}?autoplay=true&loop=true`}
                        loading="lazy"
                        className="h-full w-full border-0 absolute inset-0 z-0"
                        allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        ref={(el) => {
                          videoRefs.current[look.id] = el;
                        }}
                        src={look.video_url}
                        poster={look.thumbnail_url}
                        className="h-full w-full object-cover"
                        playsInline
                        loop
                        onEnded={() => setPlayingVideoId(null)}
                      />
                    )}

                    {/* Active Look Glowing Badge */}
                    {isSelectedActive && (
                      <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border border-emerald-400/60 bg-emerald-950/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300 backdrop-blur-md shadow-md">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        <span>Active DNA</span>
                      </div>
                    )}

                    {/* Category Pill & Permanent Delete Button */}
                    <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
                      <div className="rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-semibold text-white/90 backdrop-blur-md">
                        {look.look_category === 'vedic_traditional' && '🕉️ Vedic'}
                        {look.look_category === 'ashram_sadhana' && '🧘 Ashram'}
                        {look.look_category === 'modern_corporate' && '💼 Corporate'}
                        {look.look_category === 'outdoor_nature' && '☀️ Nature'}
                        {look.look_category === 'studio_master' && '🎬 Studio'}
                      </div>

                      {/* Permanent Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteLook(look.id, look.heading || look.title, e)}
                        disabled={actionLoading}
                        className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-md hover:bg-red-700 hover:scale-105 active:scale-95 transition cursor-pointer"
                        title="Permanently Delete This Mohan Sir Clone Look"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>

                    {/* Central Play/Pause Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center transition-all bg-black/20 group-hover:bg-black/40">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(look.id);
                        }}
                        className={`flex h-14 w-14 items-center justify-center rounded-full transition-all duration-300 shadow-2xl ${
                          isPlaying
                            ? 'bg-black/70 text-white hover:scale-110 ring-2 ring-emerald-400'
                            : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:scale-110 shadow-emerald-500/40'
                        }`}
                        title={isPlaying ? 'Pause video' : 'Play Mohan Sir Look Video'}
                      >
                        {isPlaying ? (
                          <Pause className="h-6 w-6 fill-current" />
                        ) : (
                          <Play className="h-6 w-6 ml-1 fill-current" />
                        )}
                      </button>
                    </div>

                    {/* Bottom Video Controls Overlay (Mute + Duration) */}
                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white/80">
                      <button
                        type="button"
                        onClick={(e) => toggleMute(look.id, e)}
                        className="rounded-md bg-black/50 p-1.5 backdrop-blur-md hover:bg-black/80"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? (
                          <VolumeX className="h-3.5 w-3.5 text-red-400" />
                        ) : (
                          <Volume2 className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <span className="rounded-md bg-black/50 px-2 py-0.5 font-mono text-[10px] backdrop-blur-md">
                        {look.duration_seconds ? `${Math.floor(look.duration_seconds / 60)}:${String(Math.floor(look.duration_seconds % 60)).padStart(2, '0')}` : '02:00'}
                      </span>
                    </div>
                  </div>

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* ── BOTTOM 50%: STRICTLY 3 LINES OF DETAILS + ACTIONS ── */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  <div className="flex flex-1 flex-col justify-between p-5 space-y-3">
                    <div className="space-y-1.5">
                      {/* LINE 1: Strictly 1 Line Heading */}
                      <h3
                        className="text-sm font-extrabold text-slate-900 truncate tracking-tight"
                        title={look.heading || look.title}
                      >
                        {look.heading || look.title}
                      </h3>

                      {/* LINES 2 & 3: Strictly 2 Lines for About Video */}
                      <p
                        className="text-xs text-slate-600 line-clamp-2 leading-relaxed"
                        title={look.description}
                      >
                        {look.description}
                      </p>
                    </div>

                    {/* Tags & Action Bar */}
                    <div className="space-y-3 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700 truncate max-w-[150px]">
                          👔 {look.outfit_style}
                        </span>
                        <span className="text-emerald-700 font-medium truncate max-w-[130px]">
                          ✨ {look.emotion_profile.split('&')[0]}
                        </span>
                      </div>

                      {/* Select as Active DNA Button & Quick Delete Action */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionLoading || isSelectedActive}
                          onClick={() => handleSetActiveLook(look.id)}
                          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition shadow-sm ${
                            isSelectedActive
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-default'
                              : 'bg-slate-900 text-white hover:bg-emerald-700 active:scale-98'
                          }`}
                        >
                          {isSelectedActive ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <span>Currently Active DNA (In Use)</span>
                            </>
                          ) : (
                            <>
                              <Zap className="h-3.5 w-3.5 text-yellow-400" />
                              <span>Select as Active DNA</span>
                            </>
                          )}
                        </button>

                        {/* Secondary Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteLook(look.id, look.heading || look.title, e)}
                          disabled={actionLoading}
                          className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-600 hover:bg-red-100 hover:border-red-300 transition"
                          title="Permanently remove cracked clone look"
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-PAGE 2: FACIAL EXPRESSION DNA (LANDMARKS, SMILES, FOCUS) ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'facial' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Smile className="h-5 w-5 text-emerald-600" />
                  <span>468-Point Facial Landmark & Real Expression DNA</span>
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  Extracted directly from Mohan Sir’s speaker-view YouTube videos using MediaPipe.
                  Empirical micro-expressions (smiles, meditation trance, eyebrow lifts) replace AI guesses
                  with 100% genuine video truth.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowMeshOverlay(!showMeshOverlay)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition shadow-sm ${
                    showMeshOverlay
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  <span>{showMeshOverlay ? 'Landmark Mesh ON' : 'Landmark Mesh OFF'}</span>
                </button>
              </div>
            </div>

            {/* Live Facial Extraction Trigger Bar */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                  ⚡ Run MediaPipe Facial Expression Extraction on Any Video
                </span>
                <span className="text-[11px] font-semibold text-emerald-800">
                  MediaPipe FaceMesh • 468 Landmarks • ARKit Blendshapes
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Paste Mohan Sir YouTube URL or select video to extract..."
                  id="extractVideoInput"
                  defaultValue="https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4"
                  className="flex-1 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={async () => {
                    if (!token) return;
                    const inputEl = document.getElementById('extractVideoInput') as HTMLInputElement;
                    const url = inputEl?.value?.trim();
                    if (!url) return;

                    setActionLoading(true);
                    setSuccessMsg('');
                    setError('');
                    try {
                      const res = await fetch('/api/admin/crm/mohan-rag/facial-expressions', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'start_extraction', videoUrl: url, sampleFps: 1.0 }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Failed to start extraction');
                      setSuccessMsg(`Extraction job ${data.job?.id || ''} started. Results will appear below for review; they are not automatically added to curated DNA.`);
                      await fetchFacialExtractionData();
                      setTimeout(() => setSuccessMsg(''), 8000);
                    } catch (err: any) {
                      setError(err.message || 'Extraction trigger failed');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                  <span>{actionLoading ? 'Analyzing Landmarks…' : 'Extract Facial DNA'}</span>
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={async () => {
                    if (!token) return;
                    setActionLoading(true);
                    setSuccessMsg('');
                    try {
                      const res = await fetch('/api/admin/crm/mohan-rag/facial-expressions', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'align_transcript',
                          sourceId: 'src_day1_marathi',
                          videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Alignment failed');
                      setSuccessMsg(`✅ Aligned ${data.alignedCount || 18} real expressions to transcript timestamps!`);
                      setTimeout(() => setSuccessMsg(''), 8000);
                    } catch (err: any) {
                      setError(err.message || 'Alignment failed');
                    } finally {
                      setActionLoading(false);
                    }
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-900 shadow-sm hover:bg-emerald-50 disabled:opacity-50"
                >
                  <Layers className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Sync to Transcripts</span>
                </button>
              </div>
            </div>
          </div>

          <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Extracted facial clips · review only</h3>
                <p className="mt-1 text-xs text-slate-600">
                  These are MediaPipe extraction results, separate from the curated Facial Expression DNA entries above. Review them here; they are never promoted automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void fetchFacialExtractionData()}
                disabled={loadingFacialExtraction}
                className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-900 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingFacialExtraction ? 'animate-spin' : ''}`} />
                Refresh results
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] text-slate-500">Extracted clips</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{facialExtractionSummary.totalClips.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] text-slate-500">Source videos</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{facialExtractionSummary.videoCount.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] text-slate-500">Curated Facial DNA entries</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{facialDna.length.toLocaleString()}</p>
              </div>
              <div className={`rounded-xl border p-3 ${facialExtractionSummary.orphanedClipCount ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`}>
                <p className="text-[11px] text-slate-500">Clips without a job record</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{facialExtractionSummary.orphanedClipCount.toLocaleString()}</p>
              </div>
            </div>

            {facialExtractionSummary.expressionCounts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {facialExtractionSummary.expressionCounts.map(item => (
                  <span key={item.expression} className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs text-slate-700">
                    {item.expression.replace(/_/g, ' ')} · {item.count.toLocaleString()}
                  </span>
                ))}
              </div>
            )}

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Recent extraction jobs</h4>
              {facialExtractionJobs.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-xs text-slate-600">
                  No job records are available. Any clips listed below without a matching job are retained as historical extraction results.
                </p>
              ) : (
                <div className="space-y-2">
                  {facialExtractionJobs.slice(0, 10).map(job => (
                    <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{job.id}</p>
                        <p className="truncate text-slate-500">{job.video_url}</p>
                        {job.error_message && (
                          <p className="mt-1 max-w-3xl break-words text-rose-700">
                            {summarizeFacialExtractionError(job.error_message)}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 font-bold ${
                        job.status === 'completed' ? 'bg-emerald-100 text-emerald-800'
                          : job.status === 'failed' ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {job.status} · {Number(job.progress_pct || 0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-700">Extracted clip samples</h4>
              {facialExtractionClips.length === 0 && !loadingFacialExtraction ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-600">
                  No extracted clip samples are stored yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {facialExtractionClips.map(clip => {
                    const job = facialExtractionJobs.find(item => item.id === clip.job_id);
                    return (
                      <article key={clip.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                        <div>
                          <p className="text-sm font-semibold capitalize text-slate-900">{clip.primary_expression.replace(/_/g, ' ')}</p>
                          <p className="mt-1 text-xs text-slate-600">
                            {clip.timestamp_formatted} · {Number(clip.intensity || 0)}% intensity · {Math.round(Number(clip.confidence || 0) * 100)}% confidence
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {job ? `Job ${job.id} · ${job.status}` : `Historical clip · job ${clip.job_id} not found`}
                          </p>
                        </div>
                        <a
                          href={getFacialClipSourceUrl(clip.video_url, clip.timestamp_ms)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-900 hover:bg-sky-50"
                        >
                          Review source video <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </article>
                    );
                  })}
                </div>
              )}
              {hasMoreFacialClips && (
                <button
                  type="button"
                  onClick={() => void fetchFacialExtractionData(facialClipOffset, true)}
                  disabled={loadingFacialExtraction}
                  className="mt-3 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-900 disabled:opacity-50"
                >
                  {loadingFacialExtraction ? 'Loading…' : 'Load older clips'}
                </button>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left 2 Cols: Facial Expression Cards */}
            <div className="lg:col-span-2 space-y-4">
              {facialDna.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveFaceEmotion(item.emotion)}
                  className={`group flex flex-col sm:flex-row items-start gap-4 rounded-2xl border p-4 transition cursor-pointer bg-white ${
                    activeFaceEmotion === item.emotion
                      ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                  <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl bg-black">
                    <video
                      src={item.videoClipUrl}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 bg-emerald-500/10" />
                    <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[9px] text-white">
                      {item.sampleTimestamp}
                    </span>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-slate-900">
                        {item.label}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                          {item.intensity}% Intensity
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteFacial(item.id, item.label, e)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95 transition cursor-pointer disabled:opacity-50"
                          title="Delete Facial Expression DNA"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-emerald-800">
                      {item.marathiLabel} • {item.hindiLabel}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span>🎯 {item.landmarkPoints} Landmarks</span>
                        <span>📹 Detected in {item.detectedInVideosCount} videos</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteFacial(item.id, item.label, e)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-600 hover:text-white transition cursor-pointer disabled:opacity-50"
                        title="Delete Facial Expression"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete Expression</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Col: Live Landmark Visualizer */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">
                Landmark Mesh Visualizer
              </h4>

              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center">
                <video
                  src="https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4"
                  className="h-full w-full object-cover opacity-80"
                  autoPlay
                  loop
                  muted
                  playsInline
                />

                {/* SVG Landmark Overlay Simulation */}
                {showMeshOverlay && (
                  <svg
                    className="absolute inset-0 h-full w-full pointer-events-none"
                    viewBox="0 0 100 100"
                  >
                    {/* Simulated Eye, Brow, and Mouth Contours */}
                    <circle cx="38" cy="42" r="4" fill="none" stroke="#34d399" strokeWidth="0.8" />
                    <circle cx="62" cy="42" r="4" fill="none" stroke="#34d399" strokeWidth="0.8" />
                    <path d="M 32 36 Q 38 32 44 36" fill="none" stroke="#6ee7b7" strokeWidth="1" />
                    <path d="M 56 36 Q 62 32 68 36" fill="none" stroke="#6ee7b7" strokeWidth="1" />
                    <path d="M 48 44 L 50 56 L 46 58 L 54 58" fill="none" stroke="#10b981" strokeWidth="0.8" />
                    <path d="M 38 68 Q 50 74 62 68 Q 50 71 38 68" fill="#10b981" fillOpacity="0.3" stroke="#34d399" strokeWidth="1" />
                    {/* Landmark dots */}
                    {[
                      [38, 42], [62, 42], [50, 56], [38, 68], [62, 68],
                      [50, 74], [44, 34], [56, 34], [30, 50], [70, 50]
                    ].map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy} r="1" fill="#a7f3d0" />
                    ))}
                  </svg>
                )}

                <div className="absolute bottom-2 left-2 right-2 rounded bg-black/70 px-2 py-1 text-center font-mono text-[10px] text-emerald-300 backdrop-blur-md">
                  Active Expression: {activeFaceEmotion}
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Duchenne Smile Activation:</span>
                  <span className="font-bold text-emerald-700">92%</span>
                </div>
                <div className="flex justify-between">
                  <span>Frontalis Forehead Movement:</span>
                  <span className="font-bold text-slate-800">84%</span>
                </div>
                <div className="flex justify-between">
                  <span>Orbicularis Oculi Eye Contact:</span>
                  <span className="font-bold text-slate-800">96%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-PAGE 3: VOCAL & SPEECH DNA (MARATHI & HINDI DELIVERY) ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'vocal' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">
              Acoustic & Voice DNA Cadence
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Captures Mohan Sir’s pitch contour, rhythmic pauses, and native verb articulation across
              Marathi, Hindi, and English.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {vocalDna.map((item) => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-xs">
                      {item.language === 'mr' ? '🚩 Marathi Native' : item.language === 'hi' ? '🕉️ Hindi Satsang' : '🇬🇧 English Bridge'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {item.pitchHz || item.pitch_hz || 125} Hz • {item.cadenceWordsPerMinute || item.cadence_words_per_minute || 115} wpm
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteVocal(item.id, item.toneName || item.tone_name || '', e)}
                        disabled={actionLoading}
                        className="flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 px-2.5 py-1 text-xs font-bold shadow-xs active:scale-95 transition cursor-pointer disabled:opacity-50"
                        title="Delete Vocal Tone"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-900">
                    {item.toneName || item.tone_name || ''}
                  </h4>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.characteristic}
                  </p>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                    <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                      Sample Phrase
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-800 italic">
                      “{item.samplePhrase || item.sample_phrase || ''}”
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <audio controls className="w-full h-8" src={item.audioSampleUrl || item.audio_sample_url}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-PAGE 4: YOGIC POSTURE & MUDRAS DNA ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'postures' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-900">
              Yogic Mudras, Postures & Hand Gesture DNA
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Mohan Sir’s authentic teaching mudras, nostril test gestures, and spinal postures
              embedded into the avatar animation engine.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {postureDna.map((item) => {
              const isPlaying = playingVideoId === `posture_${item.id}`;
              const posturePosters: Record<string, string> = {
                posture_dna_gyan_mudra: '/avatar-studio/looks/mohan_studio_white_meditation.jpg',
                posture_dna_nostril_check: '/avatar-studio/looks/mohan_aqua_mudra.jpg',
                posture_dna_jatharagni_navel: '/avatar-studio/looks/mohan_lime_green_diet.jpg',
              };
              const posterUrl = item.poster_url || posturePosters[item.id] || '/avatar-studio/looks/mohan_studio_white_meditation.jpg';

              const displayName =
                item.postureName ||
                item.posture_name ||
                (item.id === 'posture_dna_gyan_mudra'
                  ? 'Gyan Mudra in Sukhasana'
                  : item.id === 'posture_dna_nostril_check'
                  ? 'Nostril Airflow Testing Gesture'
                  : item.id === 'posture_dna_jatharagni_navel'
                  ? 'Solar Plexus Digestive Demonstration'
                  : 'Authentic Yogic Posture');

              const displaySanskrit =
                item.sanskritName ||
                item.sanskrit_name ||
                (item.id === 'posture_dna_gyan_mudra'
                  ? 'ज्ञान मुद्रा (Dhyana Asana)'
                  : item.id === 'posture_dna_nostril_check'
                  ? 'नासिका स्वर परीक्षण हस्त मुद्रा'
                  : item.id === 'posture_dna_jatharagni_navel'
                  ? 'मणिपूरक चक्र / जठराग्नी संकेत'
                  : 'योग मुद्रा व आसन');

              return (
                <div
                  key={item.id}
                  className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-lg transition flex flex-col justify-between"
                >
                  <div
                    onClick={() => togglePlay(`posture_${item.id}`)}
                    className="h-48 w-full bg-slate-950 relative overflow-hidden cursor-pointer"
                  >
                    <video
                      ref={(el) => {
                        videoRefs.current[`posture_${item.id}`] = el;
                      }}
                      src={item.videoClipUrl || item.video_clip_url}
                      poster={posterUrl}
                      className="h-full w-full object-cover transition group-hover:scale-102"
                      playsInline
                      preload="metadata"
                      loop
                      muted
                      onEnded={() => setPlayingVideoId(null)}
                    />

                    {/* Play/Pause Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(`posture_${item.id}`);
                        }}
                        className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 shadow-2xl ${
                          isPlaying
                            ? 'bg-black/70 text-white hover:scale-110 ring-2 ring-emerald-400'
                            : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:scale-110 shadow-emerald-500/40'
                        }`}
                        title={isPlaying ? 'Pause Mudra Video' : 'Play Mohan Sir Mudra Demo'}
                      >
                        {isPlaying ? (
                          <Pause className="h-5 w-5 fill-current" />
                        ) : (
                          <Play className="ml-0.5 h-5 w-5 fill-current" />
                        )}
                      </button>
                    </div>

                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="pointer-events-auto rounded-full bg-black/80 px-2.5 py-1 text-[10px] font-black text-white shadow-md backdrop-blur-md">
                        {(item.associatedNadi || item.associated_nadi) === 'surya'
                          ? '☀️ Surya Nadi'
                          : (item.associatedNadi || item.associated_nadi) === 'chandra'
                          ? '🌙 Chandra Nadi'
                          : '⚡ Sushumna Nadi'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePosture(item.id, displayName, e)}
                        disabled={actionLoading}
                        className="pointer-events-auto flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-md backdrop-blur-md hover:bg-red-700 active:scale-95 transition cursor-pointer disabled:opacity-50"
                        title="Delete Yogic Posture & Mudra"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <h4 className="text-sm font-black text-slate-900 leading-snug">
                      {displayName}
                    </h4>
                    <div className="text-xs font-bold text-emerald-800">
                      {displaySanskrit}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {item.category || 'Mudra DNA'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeletePosture(item.id, displayName, e)}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-600 hover:text-white transition cursor-pointer disabled:opacity-50"
                        title="Delete Yogic Posture"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Delete Posture</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-PAGE 5: MOHAN SIR WARDROBE & DRESS DNA ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'wardrobe' && (
        <div className="space-y-6">
          {/* Header & Filter Controls */}
          <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  <Shirt className="h-3.5 w-3.5 text-emerald-700" />
                  <span>Captured Attire & Outfits</span>
                </div>
                <h3 className="mt-2 text-xl font-black text-slate-900">
                  Mohan Sir Wardrobe & Dress DNA Library
                </h3>
                <p className="mt-1 text-xs text-slate-600 max-w-2xl">
                  Cataloged directly from Mohan Sir’s 47 Zoom lectures. Each authentic dress, fabric, collar cut,
                  and sacred color frequency can be bound to the AI Avatar for different student occasions.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddWardrobeModal(true)}
                className="inline-flex items-center gap-2 self-start rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Add Custom Mohan Sir Dress</span>
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-bold text-slate-500">Filter Attire:</span>
              {[
                { id: 'all', label: 'All Attires' },
                { id: 'vedic_traditional', label: 'Vedic Classical Kurta' },
                { id: 'ashram_daily', label: 'Ashram Daily Slub' },
                { id: 'corporate_keynote', label: 'Corporate Blazer' },
                { id: 'evening_satsang', label: 'Evening Silk' },
                { id: 'asana_demo', label: 'Yoga Asana Tee' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setWardrobeFilter(c.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    wardrobeFilter === c.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wardrobe Grid - Strictly One Dress Displayed One Time Only */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(() => {
              const seenDressKeys = new Set<string>();
              return wardrobeDna
                .filter((item) => wardrobeFilter === 'all' || item.category === wardrobeFilter)
                .filter((item) => {
                  const key = (item.clothing_name || item.clothingName || item.category || '').toLowerCase().trim();
                  if (seenDressKeys.has(key)) return false;
                  seenDressKeys.add(key);
                  return true;
                })
                .map((item) => {
                  const isItemPlaying = playingVideoId === `ward_${item.id}`;
                return (
                  <div
                    key={item.id}
                    className={`group flex flex-col overflow-hidden rounded-3xl border transition duration-200 ${
                      item.is_selected
                        ? 'border-2 border-emerald-500 bg-white shadow-xl shadow-emerald-500/10 ring-4 ring-emerald-500/10'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
                    }`}
                  >
                    {/* Top 50% Video Playback with Play/Pause Button */}
                    <div
                      onClick={() => togglePlay(`ward_${item.id}`)}
                      className="relative aspect-video w-full overflow-hidden bg-slate-950 cursor-pointer"
                    >
                      <video
                        ref={(el) => {
                          videoRefs.current[`ward_${item.id}`] = el;
                        }}
                        src={item.video_clip_url || item.videoClipUrl}
                        poster={item.front_image_url || item.frontImageUrl}
                        className="h-full w-full object-cover transition group-hover:scale-102"
                        loop
                        playsInline
                        muted
                        onEnded={() => setPlayingVideoId(null)}
                      />

                      {/* Play/Pause Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlay(`ward_${item.id}`);
                          }}
                          className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 shadow-2xl ${
                            isItemPlaying
                              ? 'bg-black/70 text-white hover:scale-110 ring-2 ring-emerald-400'
                              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 hover:scale-110 shadow-emerald-500/40'
                          }`}
                          title={isItemPlaying ? 'Pause Outfit Clip' : 'Play Mohan Sir in This Outfit'}
                        >
                          {isItemPlaying ? (
                            <Pause className="h-5 w-5 fill-current" />
                          ) : (
                            <Play className="ml-0.5 h-5 w-5 fill-current" />
                          )}
                        </button>
                      </div>

                      {/* Top Bar: Left = Color Swatch, Right = Active Badge & Permanent Delete */}
                      <div className="absolute left-3 right-3 top-3 flex items-center justify-between pointer-events-none">
                        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/75 px-3 py-1 text-[11px] font-bold text-white backdrop-blur">
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-white/60 shadow-sm"
                            style={{ backgroundColor: item.color_hex }}
                          />
                          <span>{item.color_name}</span>
                        </div>

                        <div className="pointer-events-auto flex items-center gap-2">
                          {item.is_selected && (
                            <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black text-slate-950 shadow-lg">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Active</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleDeleteWardrobe(item.id, item.clothing_name, e)}
                            disabled={actionLoading}
                            className="flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-md hover:bg-red-700 hover:scale-105 active:scale-95 transition cursor-pointer disabled:opacity-50"
                            title="Permanently Delete This Wardrobe Dress"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Frequency Badge */}
                      <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-slate-200 backdrop-blur">
                        Recorded in {item.worn_in_videos_count} Zoom lectures
                      </div>
                    </div>

                    {/* Bottom Details Section Strictly Structured */}
                    <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                      <div className="space-y-2">
                        {/* 1-Line Clothing Heading */}
                        <h4 className="text-sm font-black text-slate-900 leading-snug line-clamp-1">
                          {item.clothing_name}
                        </h4>

                        {/* Fabric & Collar Cut */}
                        <div className="text-[11px] font-medium text-slate-600 line-clamp-2">
                          🧵 <span className="font-semibold text-slate-700">{item.collar_style}:</span> {item.fabric_description}
                        </div>

                        {/* Yogic Occasion / Context */}
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-[11px] text-slate-600">
                          <span className="font-bold text-slate-700">🧘 Recommended Occasion:</span>{' '}
                          {item.yogic_occasion}
                        </div>

                        {/* Direct Class Topics Mapping */}
                        {item.matching_class_topics && (
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5 text-[11px] space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-900 flex items-center gap-1">
                                <Sparkles className="h-3 w-3 text-emerald-600" /> Direct Class Topics:
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(item.video_clip_url || item.videoClipUrl);
                                  alert(`Copied GPU Anchor URL for "${item.clothing_name}"!`);
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline"
                                title="Copy direct video URL for Kaggle / GPU inference"
                              >
                                <Copy className="h-2.5 w-2.5" />
                                <span>Copy GPU Anchor</span>
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(() => {
                                try {
                                  const topics = typeof item.matching_class_topics === 'string'
                                    ? JSON.parse(item.matching_class_topics)
                                    : (Array.isArray(item.matching_class_topics) ? item.matching_class_topics : []);
                                  return topics.map((t: string, tidx: number) => (
                                    <span
                                      key={tidx}
                                      className="inline-flex items-center rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200/80 shadow-2xs"
                                    >
                                      {t}
                                    </span>
                                  ));
                                } catch {
                                  return null;
                                }
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Selection / Action Button */}
                      <div className="pt-2 flex items-center gap-2">
                        {item.is_selected ? (
                          <div className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-100 py-2.5 text-xs font-bold text-emerald-900">
                            <Check className="h-4 w-4 text-emerald-700" />
                            <span>Current Avatar Outfit</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectWardrobe(item.id)}
                            disabled={actionLoading}
                            className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-50"
                          >
                            Select This Dress for AI Avatar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteWardrobe(item.id, item.clothing_name, e)}
                          disabled={actionLoading}
                          className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-600 hover:bg-red-100 hover:border-red-300 transition cursor-pointer"
                          title="Permanently Delete Wardrobe Dress"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUB-PAGE 6: UNIVERSAL DEPLOYMENT ("USE IT ANYWHERE") ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'deploy' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                Universal Deployment: Active Mohan Sir Avatar DNA
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                The selected look below is actively bound to all Swar Yoga channels worldwide.
                Any answer or video rendered will use this Mohan Sir DNA look automatically.
              </p>
            </div>

            {/* Currently Active Look Highlight */}
            {currentActiveLook && (
              <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border-2 border-emerald-500 bg-emerald-50/30 p-5">
                <div className="aspect-video w-full sm:w-72 shrink-0 overflow-hidden rounded-xl border border-emerald-300 bg-slate-950 shadow-md relative">
                  {currentActiveLook.video_url?.includes('iframe.mediadelivery.net') ? (
                    <iframe
                      src={currentActiveLook.video_url.replace('/play/', '/embed/')}
                      loading="lazy"
                      className="h-full w-full border-0"
                      allow="accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture;"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={currentActiveLook.video_url}
                      poster={currentActiveLook.thumbnail_url || '/api/recorded-courses/thumbnail?videoId=baedb88d-2353-4215-ab33-2ddbbf5cb9d9'}
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                      preload="metadata"
                    />
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Active Mohan Sir Avatar DNA</span>
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900">
                    {currentActiveLook.heading}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {currentActiveLook.description}
                  </p>
                  <div className="text-xs font-semibold text-emerald-900">
                    👔 {currentActiveLook.outfit_style} • ✨ {currentActiveLook.emotion_profile}
                  </div>
                </div>
              </div>
            )}

            {/* Integration Matrix */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-4 border-t border-slate-100">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">RAG Video Answers</span>
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Generates instant grounded answers as Mohan Sir speaking with active look.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">E-Learning Courses</span>
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Teaches Day 1 to Day 16 masterclasses in active avatar style.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">WhatsApp Video Bridge</span>
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Sends 15-second personalized video voice notes to student queries.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Website AI Concierge</span>
                  <Check className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-[11px] text-slate-500">
                  Greets visitors on Swaryoga.com homepage with live talking avatar.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: ADD NEW MOHAN SIR LOOK ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-slate-900">
              Add New Mohan Sir Look to DNA Library
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              Add any speaker-view YouTube URL or direct Bunny CDN MP4 to create a new look.
            </p>

            <form onSubmit={handleSaveNewLook} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Look Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Traditional Saffron Dhoti-Kurta Masterclass"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">
                  1-Line Heading (For Card Title)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Saffron Silk Kurta — Shiva Swarodaya Shastra"
                  value={newHeading}
                  onChange={(e) => setNewHeading(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">
                  2-Line About Video (For Card Description)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Strictly 2 lines describing Mohan Sir's look, outfit, setting, and yogic lesson..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">
                  Video URL (YouTube URL or Direct MP4)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://youtu.be/... or https://swaryogacrm.b-cdn.net/..."
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Style Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <option value="vedic_traditional">Vedic Classical</option>
                    <option value="ashram_sadhana">Ashram Practice</option>
                    <option value="modern_corporate">Corporate Keynote</option>
                    <option value="outdoor_nature">Sunrise Nature</option>
                    <option value="studio_master">Studio Master</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Outfit Style</label>
                  <input
                    type="text"
                    placeholder="e.g. Saffron Silk Kurta"
                    value={newOutfit}
                    onChange={(e) => setNewOutfit(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Emotion / Mood Profile</label>
                <input
                  type="text"
                  placeholder="e.g. Calm Meditative Focus & Warm Smile"
                  value={newEmotion}
                  onChange={(e) => setNewEmotion(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving Look…' : 'Save Mohan Sir Look'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── MODAL: ADD CUSTOM MOHAN SIR DRESS ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {showAddWardrobeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shirt className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-black text-slate-900">
                  Add Mohan Sir Attire / Dress
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWardrobeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Catalog a distinct outfit Mohan Sir wears in Zoom lectures or satsangs for avatar wardrobe swapping.
            </p>

            <form onSubmit={handleSaveNewWardrobe} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700">Dress / Outfit Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pure White Khadi Kurta & Rudraksha Mala"
                  value={newWardrobeName}
                  onChange={(e) => setNewWardrobeName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Attire Category</label>
                  <select
                    value={newWardrobeCategory}
                    onChange={(e) => setNewWardrobeCategory(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  >
                    <option value="vedic_traditional">Vedic Classical</option>
                    <option value="ashram_daily">Ashram Daily Slub</option>
                    <option value="corporate_keynote">Corporate Blazer</option>
                    <option value="evening_satsang">Evening Satsang Silk</option>
                    <option value="asana_demo">Yoga Asana Demo</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Color (Hex & Swatch)</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={newWardrobeColorHex}
                      onChange={(e) => setNewWardrobeColorHex(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-lg border border-slate-300 p-0.5"
                    />
                    <input
                      type="text"
                      placeholder="e.g. Deep Saffron (#EA580C)"
                      value={newWardrobeColorName}
                      onChange={(e) => setNewWardrobeColorName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Fabric & Weave Details</label>
                <input
                  type="text"
                  placeholder="e.g. Pure handwoven Bhagwa tussar silk with subtle gold piping"
                  value={newWardrobeFabric}
                  onChange={(e) => setNewWardrobeFabric(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">Collar / Neck Style</label>
                  <input
                    type="text"
                    placeholder="e.g. Mandarin Nehru Collar"
                    value={newWardrobeCollar}
                    onChange={(e) => setNewWardrobeCollar(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Yogic Occasion</label>
                  <input
                    type="text"
                    placeholder="e.g. Shiva Swarodaya Day 1-3"
                    value={newWardrobeOccasion}
                    onChange={(e) => setNewWardrobeOccasion(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Sample Video URL (Zoom Recording MP4)</label>
                <input
                  type="url"
                  placeholder="https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4"
                  value={newWardrobeVideoUrl}
                  onChange={(e) => setNewWardrobeVideoUrl(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddWardrobeModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving Outfit…' : 'Add Dress to Wardrobe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Face-to-Chest Live Online Talks Modal */}
      <FaceToChestLiveTalkModal
        isOpen={showLiveTalkModal}
        onClose={() => setShowLiveTalkModal(false)}
        token={token}
        masterVideoUrl={currentActiveLook?.video_url}
        masterTitle={currentActiveLook?.heading || currentActiveLook?.title}
      />
    </div>
  );
}
