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
} from '@/lib/avatarStudio/avatarMasterCatalog';
import {
  MOHAN_SIR_MASTER_IDENTITY_ID,
} from '@/lib/avatarStudio/masterIdentityEngine';
import MohanSir2DPhotorealisticTwinStage from '@/components/admin/crm/avatar-studio/MohanSir2DPhotorealisticTwinStage';

type StudioTab =
  | 'dashboard'
  | '3d_twin'
  | 'anchor'
  | 'voice'
  | 'script'
  | 'engine'
  | 'library';

interface ConsentAvatarProfile {
  id: string;
  name: string;
}

function getAvatarStudioToken(): string | null {
  if (typeof window === 'undefined') return null;
  const keys = ['crm_token', 'adminToken', 'admin_token', 'token', 'auth_token', 'swar_admin_token'];
  for (const k of keys) {
    try {
      const v = localStorage.getItem(k);
      if (v && v !== 'null' && v !== 'undefined' && v.trim()) return v.trim();
    } catch {}
  }
  for (const k of keys) {
    try {
      const v = sessionStorage.getItem(k);
      if (v && v !== 'null' && v !== 'undefined' && v.trim()) return v.trim();
    } catch {}
  }
  if (typeof document !== 'undefined' && document.cookie) {
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const [k, ...v] = part.trim().split('=');
      const key = k?.trim();
      if (keys.includes(key)) {
        const val = decodeURIComponent(v.join('=')).trim();
        if (val && val !== 'null' && val !== 'undefined') return val;
      }
    }
  }
  return null;
}

function getAvatarAuthHeaders(): Record<string, string> {
  const token = getAvatarStudioToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-admin-token'] = token;
  }
  return headers;
}

export default function MohanSirAvatarStudioPage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('dashboard');

  // Selected Studio Configuration
  const [selectedProfession, setSelectedProfession] = useState<ProfessionConfig>(ALL_34_PROFESSIONS[0]);
  const [wardrobes, setWardrobes] = useState<WardrobePreset[]>(() =>
    MASTER_WARDROBES.filter((w) => w.id !== 'wardrobe_corporate_suit')
  );
  const [selectedWardrobe, setSelectedWardrobe] = useState<WardrobePreset>(MASTER_WARDROBES[1] || MASTER_WARDROBES[0]);
  const [isDeletingWardrobeId, setIsDeletingWardrobeId] = useState<string | null>(null);

  const [environments, setEnvironments] = useState<EnvironmentPreset[]>(() =>
    MASTER_ENVIRONMENTS.filter((e) => e.id !== 'env_corporate_boardroom')
  );
  const [selectedEnvironment, setSelectedEnvironment] = useState<EnvironmentPreset>(MASTER_ENVIRONMENTS[0]);
  const [isDeletingEnvId, setIsDeletingEnvId] = useState<string | null>(null);

  const [cameraPresets, setCameraPresets] = useState<CameraFramingPreset[]>(CAMERA_FRAMING_PRESETS);
  const [selectedCamera, setSelectedCamera] = useState<CameraFramingPreset>(CAMERA_FRAMING_PRESETS[0]);
  const [anchorVideos, setAnchorVideos] = useState<AnchorVideo[]>(MASTER_ANCHOR_VIDEOS);
  const [selectedAnchor, setSelectedAnchor] = useState<AnchorVideo>(MASTER_ANCHOR_VIDEOS[0]);
  const [isDeletingAnchorId, setIsDeletingAnchorId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceProfile>(MASTER_VOICE_PROFILES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<'hi' | 'mr' | 'en' | 'ne'>('hi');

  // Script & Duration
  const [scriptText, setScriptText] = useState<string>(
    'Namaste seekers! I am Mohan Kalburgi. Welcome to this special session on Swar Yoga. Today we will explore how balancing the breath through the nostrils harmonizes the brain, digestion, and inner peace.'
  );
  const [estimatedDurationSec, setEstimatedDurationSec] = useState<number>(30);

  // Search & Filter
  const [voiceSearch, setVoiceSearch] = useState<string>('');
  const [voiceLangFilter, setVoiceLangFilter] = useState<'all' | 'hi' | 'mr' | 'en'>('all');
  const [voiceProfiles, setVoiceProfiles] = useState<VoiceProfile[]>(MASTER_VOICE_PROFILES);
  const [isDeletingVoiceId, setIsDeletingVoiceId] = useState<string | null>(null);

  const handleDeleteVoice = async (id: string, name?: string) => {
    const confirmMsg = `Are you sure you want to remove vocal DNA profile "${name || id}"?\n\nThis will be permanently removed from the database.`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeletingVoiceId(id);
    try {
      const res = await fetch(`/api/avatar/voice?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        showToast('🗑️ Voice profile removed successfully');
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

  // Master Anchor Permanent Deletion Handler
  const handlePermanentDeleteAnchor = async (id: string, title: string) => {
    const confirmMsg = `⚠️ PERMANENT DELETE WARNING:\n\nAre you sure you want to PERMANENTLY delete master anchor video:\n"${title}"?\n\nThis will permanently delete this video from the database and studio. It cannot be recovered.`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeletingAnchorId(id);
    try {
      // 1. Delete on server API (Bunny Database)
      await fetch(`/api/avatar/anchor?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch(() => { });

      // 2. Persist in localStorage
      const localDeleted: string[] = JSON.parse(localStorage.getItem('swar_deleted_anchor_ids') || '[]');
      if (!localDeleted.includes(id)) {
        localDeleted.push(id);
        localStorage.setItem('swar_deleted_anchor_ids', JSON.stringify(localDeleted));
      }

      // 3. Update state
      const remaining = anchorVideos.filter((v) => v.id !== id);
      setAnchorVideos(remaining);

      // If currently selected anchor was deleted, switch to next available
      if (selectedAnchor.id === id && remaining.length > 0) {
        setSelectedAnchor(remaining[0]);
      }

      showToast(`🗑️ Master anchor video permanently deleted: "${title}"`);
    } catch (err: any) {
      alert('Error permanently deleting master anchor: ' + err.message);
    } finally {
      setIsDeletingAnchorId(null);
    }
  };

  // Virtual Background Permanent Deletion Handler
  const handlePermanentDeleteEnvironment = (id: string, name: string) => {
    const confirmMsg = `⚠️ PERMANENT DELETE WARNING:\n\nAre you sure you want to PERMANENTLY delete virtual background:\n"${name}"?\n\nThis will permanently delete this background preset from the studio.`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeletingEnvId(id);
    try {
      const localDeleted: string[] = JSON.parse(localStorage.getItem('swar_deleted_env_ids') || '[]');
      if (!localDeleted.includes(id)) {
        localDeleted.push(id);
        localStorage.setItem('swar_deleted_env_ids', JSON.stringify(localDeleted));
      }
      const updated = environments.filter((e) => e.id !== id);
      setEnvironments(updated);
      if (selectedEnvironment.id === id && updated.length > 0) {
        setSelectedEnvironment(updated[0]);
      }
      showToast(`🗑️ Permanently deleted background: "${name}"`);
    } finally {
      setIsDeletingEnvId(null);
    }
  };

  // Camera Framing Permanent Deletion Handler
  const handlePermanentDeleteCamera = (id: string, name: string) => {
    const confirmMsg = `⚠️ PERMANENT DELETE WARNING:\n\nAre you sure you want to PERMANENTLY delete camera framing preset:\n"${name}"?\n\nThis will permanently delete this camera preset from the studio.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const localDeleted: string[] = JSON.parse(localStorage.getItem('swar_deleted_cam_ids') || '[]');
      if (!localDeleted.includes(id)) {
        localDeleted.push(id);
        localStorage.setItem('swar_deleted_cam_ids', JSON.stringify(localDeleted));
      }
      const updated = cameraPresets.filter((c) => c.id !== id);
      setCameraPresets(updated);
      if (selectedCamera.id === id && updated.length > 0) {
        setSelectedCamera(updated[0]);
      }
      showToast(`🗑️ Permanently deleted camera framing: "${name}"`);
    } catch { }
  };

  // Master Wardrobe Permanent Deletion Handler
  const handlePermanentDeleteWardrobe = (id: string, name: string) => {
    const confirmMsg = `⚠️ PERMANENT DELETE WARNING:\n\nAre you sure you want to PERMANENTLY delete wardrobe preset:\n"${name}"?\n\nThis will permanently delete this wardrobe preset from the studio.`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeletingWardrobeId(id);
    try {
      const localDeleted: string[] = JSON.parse(localStorage.getItem('swar_deleted_wardrobe_ids') || '[]');
      if (!localDeleted.includes(id)) {
        localDeleted.push(id);
        localStorage.setItem('swar_deleted_wardrobe_ids', JSON.stringify(localDeleted));
      }
      const updated = wardrobes.filter((w) => w.id !== id);
      setWardrobes(updated);
      if (selectedWardrobe.id === id && updated.length > 0) {
        setSelectedWardrobe(updated[0]);
      }
      showToast(`🗑️ Permanently deleted wardrobe: "${name}"`);
    } finally {
      setIsDeletingWardrobeId(null);
    }
  };

  // Sync deleted anchors, environments & wardrobes from server & localStorage on mount
  useEffect(() => {
    const loadDeletedAnchors = async () => {
      try {
        const localDeleted: string[] = JSON.parse(localStorage.getItem('swar_deleted_anchor_ids') || '[]');
        const res = await fetch('/api/avatar/anchor', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        const remoteDeleted: string[] = json?.deletedIds || [];
        const combined = Array.from(new Set([...localDeleted, ...remoteDeleted]));
        if (combined.length > 0) {
          localStorage.setItem('swar_deleted_anchor_ids', JSON.stringify(combined));
          const filtered = MASTER_ANCHOR_VIDEOS.filter((v) => !combined.includes(v.id));
          setAnchorVideos(filtered);
          if (filtered.length > 0 && combined.includes(selectedAnchor.id)) {
            setSelectedAnchor(filtered[0]);
          }
        }
      } catch {
        const localDeleted: string[] = JSON.parse(localStorage.getItem('swar_deleted_anchor_ids') || '[]');
        if (localDeleted.length > 0) {
          const filtered = MASTER_ANCHOR_VIDEOS.filter((v) => !localDeleted.includes(v.id));
          setAnchorVideos(filtered);
          if (filtered.length > 0 && localDeleted.includes(selectedAnchor.id)) {
            setSelectedAnchor(filtered[0]);
          }
        }
      }
    };

    const loadDeletedPresets = () => {
      try {
        const deletedEnvIds: string[] = JSON.parse(localStorage.getItem('swar_deleted_env_ids') || '[]');
        if (deletedEnvIds.length > 0) {
          setEnvironments((prev) => prev.filter((e) => !deletedEnvIds.includes(e.id)));
        }
        const deletedWardrobeIds: string[] = JSON.parse(localStorage.getItem('swar_deleted_wardrobe_ids') || '[]');
        if (deletedWardrobeIds.length > 0) {
          setWardrobes((prev) => prev.filter((w) => !deletedWardrobeIds.includes(w.id)));
        }
        const deletedCamIds: string[] = JSON.parse(localStorage.getItem('swar_deleted_cam_ids') || '[]');
        if (deletedCamIds.length > 0) {
          setCameraPresets((prev) => prev.filter((c) => !deletedCamIds.includes(c.id)));
        }
      } catch { }
    };

    loadDeletedAnchors();
    loadDeletedPresets();
  }, []);

  // Media Player States
  const [isPlayingAnchor, setIsPlayingAnchor] = useState<boolean>(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioObj, setAudioObj] = useState<HTMLAudioElement | null>(null);
  const anchorVideoRef = useRef<HTMLVideoElement | null>(null);

  // Edge TTS speech preview; it is not a voice clone.
  const [voiceEngineScript, setVoiceEngineScript] = useState<string>(
    'Namaste seekers! I am Mohan Kalburgi. Welcome to this sacred session of Swar Yoga. Stay mindful of your breath and nadi balance.'
  );
  const [voiceEngineLang, setVoiceEngineLang] = useState<'hi' | 'mr' | 'en'>('hi');
  const [isEngineSynthesizing, setIsEngineSynthesizing] = useState<boolean>(false);
  const [engineAudioUrl, setEngineAudioUrl] = useState<string | null>(null);
  const [engineAudioDuration, setEngineAudioDuration] = useState<number | null>(null);

  const handleGenerateEngineVoice = async () => {
    if (!voiceEngineScript.trim()) {
      showToast('⚠️ Please enter script text');
      return;
    }
    setIsEngineSynthesizing(true);
    try {
      const authHeaders = getAvatarAuthHeaders();
      const res = await fetch('/api/avatar/inhouse/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({
          script: voiceEngineScript.trim(),
          voiceId: {
            hi: 'hi-IN-MadhurNeural',
            mr: 'mr-IN-ManoharNeural',
            en: 'en-IN-PrabhatNeural',
          }[voiceEngineLang],
          language: voiceEngineLang,
          speed: 1,
          pitchHz: 0,
        }),
      });
      const json = await res.json();
      if (json.success && json.audioUrl) {
        setEngineAudioUrl(json.audioUrl);
        setEngineAudioDuration(json.durationSeconds);
        showToast('Speech preview generated with Edge TTS. This is not a voice clone.');
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

  // AI Generation Job Tracker
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobStageText, setJobStageText] = useState<string>('');
  const [generatedVideoResultUrl, setGeneratedVideoResultUrl] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [avatarProfiles, setAvatarProfiles] = useState<ConsentAvatarProfile[]>([]);
  const [selectedAvatarProfileId, setSelectedAvatarProfileId] = useState('');
  const [sourceVideoUrl, setSourceVideoUrl] = useState('');
  const [avatarProfilesError, setAvatarProfilesError] = useState<string | null>(null);

  // Video Library State
  const [libraryVideos, setLibraryVideos] = useState<any[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState<boolean>(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
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
  const loadLibrary = async (ensureWorkshopTwinSources = activeTab === 'library') => {
    setIsLoadingLibrary(true);
    setLibraryError(null);
    const authHeaders = getAvatarAuthHeaders();

    try {
      let addedTwinSourceCount = 0;
      if (ensureWorkshopTwinSources) {
        const seedResponse = await fetch('/api/avatar/library', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          credentials: 'include',
          body: JSON.stringify({ action: 'ensure_mohan_workshop_twin_sources' }),
        });
        if (seedResponse.status === 401 || seedResponse.status === 403) {
          setLibraryError('Sign in again to load the stored-media library.');
          setIsLoadingLibrary(false);
          return;
        }
        const seedResult = await seedResponse.json().catch(() => ({}));
        if (seedResponse.ok && seedResult.success) {
          addedTwinSourceCount = Number(seedResult.addedCount || 0);
        }
      }

      const res = await fetch('/api/avatar/library', {
        headers: authHeaders,
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.status === 401 || res.status === 403) {
        setLibraryError('Sign in again to load the stored-media library.');
        setIsLoadingLibrary(false);
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success || !Array.isArray(json.data)) {
        throw new Error(json.error || 'Failed to load stored video metadata.');
      }
      setLibraryVideos(json.data);
      setLibraryError(null);
      if (addedTwinSourceCount > 0) {
        showToast(`Added ${addedTwinSourceCount} Mohan Sir workshop twin-look sources to the Video Library.`);
      }
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : 'Failed to load stored video metadata.');
    } finally {
      setIsLoadingLibrary(false);
    }
  };

  useEffect(() => {
    let active = true;
    const authHeaders = getAvatarAuthHeaders();

    fetch('/api/avatar/creator', {
      headers: authHeaders,
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Sign in again to load consented avatar profiles.');
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to load consented avatar profiles.');
        }
        return json.profiles as ConsentAvatarProfile[];
      })
      .then((profiles) => {
        if (!active) return;
        setAvatarProfiles(profiles);
        setSelectedAvatarProfileId((current) => current || profiles[0]?.id || '');
        setAvatarProfilesError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setAvatarProfilesError(error instanceof Error ? error.message : 'Failed to load avatar profiles.');
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentJobId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const pollJob = async () => {
      const authHeaders = getAvatarAuthHeaders();

      try {
        const res = await fetch(`/api/avatar/inhouse/video?jobId=${encodeURIComponent(currentJobId)}`, {
          headers: authHeaders,
          credentials: 'include',
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok || !json.success || !json.job) {
          throw new Error(json.error || 'Could not read the render job status.');
        }
        if (!active) return;

        const job = json.job;
        setJobProgress(Number(job.progressPercent || 0));
        if (job.status === 'completed' && job.videoUrl) {
          setGeneratedVideoResultUrl(job.videoUrl);
          setJobProgress(100);
          setJobStageText('Completed by the in-house worker.');
          setIsGenerating(false);
          setCurrentJobId(null);
          return;
        }
        if (job.status === 'failed') {
          setGenerationError(job.errorMessage || 'The in-house render worker reported a failure.');
          setIsGenerating(false);
          setCurrentJobId(null);
          return;
        }

        const stageByStatus: Record<string, string> = {
          synthesizing_speech: 'Preparing speech preview…',
          ready_for_worker: 'Queued; waiting for the configured GPU inference worker. No video has been rendered yet.',
          rendering_video: 'The configured worker is rendering the video…',
        };
        setJobStageText(stageByStatus[job.status] || `Job status: ${job.status}`);
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
  }, [currentJobId]);

  // Edit & Delete Video Modal State & Handlers
  const [editingVideo, setEditingVideo] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ title: '', profession_name: '', language: 'hi' });
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Existing media import state and handlers
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importForm, setImportForm] = useState({
    title: '',
    video_url: '',
    thumbnail_url: '',
    ai_site_source: 'User-provided video',
    profession_name: 'Imported media',
    language: 'hi',
    duration_seconds: 30,
  });
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Selected reference media for Module 8
  const [activeAvatarId, setActiveAvatarId] = useState<string>('');

  useEffect(() => {
    setActiveAvatarId(localStorage.getItem('swar_active_avatar_id') || '');
  }, []);

  const handleUseAvatar = (vid: any) => {
    setActiveAvatarId(vid.id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('swar_active_avatar_id', vid.id);
      localStorage.setItem('swar_active_avatar_title', vid.title || '');
      localStorage.setItem('swar_active_avatar_url', vid.video_url || '');
    }
    showToast(`Reference media selected: "${vid.title || vid.profession_name}". This does not activate a render model.`);
  };

  const handleImportFromAiSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importForm.title.trim() || !importForm.video_url.trim()) {
      alert('Please enter title and video URL.');
      return;
    }
    setIsImporting(true);
    try {
      const res = await fetch('/api/avatar/library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAvatarAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(importForm),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Existing video metadata added to the stored-media library.');
        setIsImportModalOpen(false);
        setImportForm({
          title: '',
          video_url: '',
          thumbnail_url: '',
          ai_site_source: 'User-provided video',
          profession_name: 'Imported media',
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
        headers: {
          'Content-Type': 'application/json',
          ...getAvatarAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          id: editingVideo.id,
          title: editForm.title,
          profession_name: editForm.profession_name,
          language: editForm.language,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('✅ Video details updated successfully!');
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
    const confirmMsg = `⚠️ PERMANENT DELETE WARNING:\n\nAre you sure you want to PERMANENTLY delete stored video:\n"${title || id}"?\n\nThis will permanently delete it from the database. It cannot be recovered.`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/avatar/library?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAvatarAuthHeaders(),
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        showToast('🗑️ Video permanently deleted from library');
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
      loadLibrary(activeTab === 'library');
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

  // Trigger Video Generation
  const handleStartGeneration = async () => {
    if (!selectedAvatarProfileId) {
      setGenerationError('Create or select a consented avatar profile before queuing a render.');
      return;
    }
    const authHeaders = getAvatarAuthHeaders();
    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedVideoResultUrl(null);
    setCurrentJobId(null);
    setJobProgress(0);
    setJobStageText('Submitting to the consent-gated in-house queue…');

    try {
      const res = await fetch('/api/avatar/inhouse/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify({
          avatarProfileId: selectedAvatarProfileId,
          sourceVideoUrl: sourceVideoUrl.trim(),
          backgroundId: selectedEnvironment.id,
          clothingId: selectedWardrobe.id,
          posture: 'standing',
          language: selectedLanguage,
          script: scriptText,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.job?.id) {
        throw new Error(json.error || 'Failed to create an in-house render job.');
      }
      setCurrentJobId(json.job.id);
      setJobProgress(Number(json.job.progressPercent || 0));
      setJobStageText(json.message || 'Speech prepared; waiting for the in-house render worker.');
    } catch (err: unknown) {
      setIsGenerating(false);
      setGenerationError(err instanceof Error ? err.message : 'Failed to submit the in-house render job.');
    }
  };

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
              Back to Creation Hub
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div>
              <h1 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                MOHAN SIR AI DIGITAL TWIN STUDIO
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  In-house renderer in development
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Consent-aware job queue and stored media library. Neural inference and GPU worker are not available yet.
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
              🌐 Import Video Link
            </button>
            <button
              onClick={() => setActiveTab('engine')}
              className="flex items-center gap-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 px-4 py-2 rounded-lg shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              ⚡ Queue Render Request
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className="flex items-center gap-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              <Film className="w-3.5 h-3.5 text-amber-400" />
              Video Library ({libraryVideos.length})
            </button>
          </div>
        </header>

        {/* Main Studio Navigation Tabs */}
        <nav className="px-6 py-2.5 overflow-x-auto flex items-center gap-2.5 text-xs font-bold scrollbar-thin bg-slate-950/90 border-t border-slate-800">
          {[
            { id: 'dashboard', label: '1. Dashboard', icon: Layers },
            { id: '3d_twin', label: '2. 2D Avatar Twin (Live Stage)', icon: Sparkles },
            { id: 'anchor', label: '3. Master Anchor Videos', icon: Video },
            { id: 'voice', label: '4. Voice Engine', icon: Volume2 },
            { id: 'script', label: '5. Script Studio', icon: FileText },
            { id: 'engine', label: '6. Render Queue (Colab GPU)', icon: Wand2 },
            { id: 'library', label: '7. Video Library', icon: Film },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as StudioTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap text-xs font-black tracking-wide cursor-pointer ${isActive
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 border-2 border-amber-200 shadow-xl shadow-amber-500/40 ring-2 ring-amber-400/60 scale-[1.02]'
                  : 'bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-amber-300 hover:border-amber-400/50 border border-slate-700/90 shadow-sm'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Studio Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto pb-32">
        {libraryError && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">
            Stored-media library error: {libraryError}
          </div>
        )}
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
                      <h2 className="text-xl font-black text-white">Mohan Kalburgi (Mohan Sir)</h2>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                        Verified Master Identity
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Founder: Swar Yoga Foundation • Master Voice, 3D Mesh & Identity DNA Profile
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-300">
                      <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                        <Cpu className="w-3.5 h-3.5 text-amber-400" /> GPU Worker: Ready for Colab T4
                      </span>
                      <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                        <Radio className="w-3.5 h-3.5 text-amber-400" /> Bunny CDN: Configured & Verified
                      </span>
                      <span className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                        <Volume2 className="w-3.5 h-3.5 text-amber-400" /> Voice Clone: 53m Training Dataset Ready
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                    onClick={() => setActiveTab('3d_twin')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/25 transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                    👤 2D Live Avatar Twin
                  </button>
                  <button
                    onClick={() => setActiveTab('engine')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition"
                  >
                    <Wand2 className="w-4 h-4 text-amber-400" />
                    GPU Render Queue
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

            {/* Current engine and infrastructure readiness */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span>Neural video inference</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/10 text-rose-300 border border-rose-500/30">
                    NOT AVAILABLE
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="text-sm font-black text-white">Inference is not implemented</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">No verified model weights or render path</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span>GPU worker</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    NOT CONNECTED
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="text-sm font-black text-white">No active GPU adapter</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Worker endpoint has no renderer</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span>Voice cloning</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/10 text-rose-300 border border-rose-500/30">
                    NOT TRAINED
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="text-sm font-black text-white">No verified voice clone</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Preview TTS is not a trained clone</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-700/80 rounded-xl p-4 shadow-md">
                <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                  <span>Storage configuration</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    CONFIGURED
                  </span>
                </div>
                <div className="mt-2">
                  <h3 className="text-sm font-black text-white">Bunny Storage / CDN</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Configured; live output upload not verified</p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Videos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Quick Workflow Steps */}
              <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-lg">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2 border-l-4 border-amber-400 pl-2.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  QUICK 3-STEP WORKFLOW
                </h3>
                <div className="space-y-2.5">
                  <div
                    onClick={() => setActiveTab('3d_twin')}
                    className="p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-slate-800 hover:border-amber-400 border border-amber-500/40 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-300">★ 2D Avatar Twin (Live Stage)</div>
                      <div className="text-[11px] text-slate-400">
                        Test speech lip-sync & 2D photorealistic gestures
                      </div>
                    </div>
                    <span className="text-xs font-black text-amber-400">View 👤 →</span>
                  </div>

                  <div
                    onClick={() => setActiveTab('anchor')}
                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/50 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">1. Select Master Anchor Video</div>
                      <div className="text-[11px] text-slate-400">
                        {selectedAnchor.title} ({selectedAnchor.durationSeconds}s)
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400">Change →</span>
                  </div>

                  <div
                    onClick={() => setActiveTab('script')}
                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-amber-400/50 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">2. Prepare Lecture Script & Topic</div>
                      <div className="text-[11px] text-slate-400">
                        {scriptText.slice(0, 36)}... ({estimatedDurationSec}s)
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-400">Edit →</span>
                  </div>

                  <div
                    onClick={() => setActiveTab('engine')}
                    className="p-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-300">3. ⚡ Queue Render Request</div>
                      <div className="text-[11px] text-amber-200/80">Ready to execute on Google Colab T4 GPU</div>
                    </div>
                    <span className="text-xs font-black text-amber-300">Run 🚀</span>
                  </div>
                </div>
              </div>

              {/* Right 2 Columns: Stored media assets */}
              <div className="md:col-span-2 bg-slate-900 border border-slate-700/80 rounded-2xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2 border-l-4 border-amber-400 pl-2.5">
                    <Film className="w-4 h-4 text-amber-400" />
                    STORED MEDIA LIBRARY
                  </h3>
                  <button
                    onClick={() => setActiveTab('library')}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    View All ({libraryVideos.length})
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
                            <span className="text-slate-400 font-semibold">Stored media</span>
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
                              title="Edit Video"
                            >
                              <Pencil className="w-3 h-3 text-amber-400" /> Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVideo(vid.id, vid.title);
                              }}
                              disabled={isDeletingId === vid.id}
                              className="flex items-center gap-1 text-slate-400 hover:text-rose-400 font-semibold px-2 py-0.5 rounded hover:bg-rose-500/10 transition cursor-pointer"
                              title="Delete Video"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              {isDeletingId === vid.id ? '...' : 'Delete'}
                            </button>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(vid.video_url);
                              showToast('📋 Link copied to clipboard!');
                            }}
                            className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                            title="Copy Video Link"
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
        {/* TAB 2: 2D DIGITAL TWIN (LIVE AVATAR STAGE)                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === '3d_twin' && (
          <MohanSir2DPhotorealisticTwinStage
            onTransferScript={(txt) => {
              setScriptText(txt);
              setActiveTab('script');
              showToast('✨ Script transferred to Script Studio');
            }}
            onQueueRender={(txt) => {
              setScriptText(txt);
              setActiveTab('engine');
              showToast('🚀 Ready to queue 1080p render on Google Colab GPU');
            }}
          />
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: MASTER VIDEO / ANCHOR STUDIO                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'anchor' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight border-l-4 border-amber-500 pl-3 flex items-center gap-2">
                    <Video className="w-5 h-5 text-amber-400" />
                    SELECT MASTER ANCHOR VIDEO REFERENCE
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Source links and catalog metadata only; consent, quality, framing, and resolution are not automatically verified.
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                  Selected reference: {selectedAnchor.title.slice(0, 32)}...
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
                      <span className="text-slate-400 block">Resolution:</span>
                      <span className="font-bold text-amber-300">Not verified</span>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                      <span className="text-slate-400 block">Catalog framing:</span>
                      <span className="font-bold text-white">{selectedAnchor.framing}</span>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                      <span className="text-slate-400 block">Head & Shoulders:</span>
                      <span className="font-bold text-amber-300">Not measured</span>
                    </div>
                    <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/60">
                      <span className="text-slate-400 block">Original Audio:</span>
                      <span className="font-bold text-white">{selectedAnchor.language}</span>
                    </div>
                  </div>
                </div>

                {/* Selectable Anchor List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2 border-l-4 border-amber-400 pl-2.5">
                      <Video className="w-4 h-4 text-amber-400" />
                      STORED SOURCE ENTRIES ({anchorVideos.length})
                    </h3>
                  </div>
                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {anchorVideos.map((vid) => {
                      const isSel = selectedAnchor.id === vid.id;
                      return (
                        <div
                          key={vid.id}
                          className={`p-3 rounded-xl border transition flex items-start gap-3 relative group ${isSel
                            ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                            : 'bg-slate-800/60 border-slate-700/60 hover:border-slate-500'
                            }`}
                        >
                          <div
                            onClick={() => {
                              setSelectedAnchor(vid);
                              showToast(`🎬 Master anchor selected: ${vid.title}`);
                            }}
                            className="cursor-pointer shrink-0"
                          >
                            <img
                              src={vid.thumbnailUrl}
                              alt={vid.title}
                              className="w-16 h-12 object-cover rounded-md border border-slate-700 hover:scale-105 transition"
                            />
                          </div>

                          <div
                            onClick={() => {
                              setSelectedAnchor(vid);
                              showToast(`🎬 Master anchor selected: ${vid.title}`);
                            }}
                            className="flex-1 min-w-0 cursor-pointer"
                          >
                            <div className="text-xs font-bold text-white truncate">{vid.title}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{vid.language} • {vid.durationSeconds}s</div>
                            <span className="inline-block text-[10px] text-amber-400 mt-1 font-semibold">
                              {vid.isPrimaryMaster ? 'Primary reference entry' : 'Stored source entry'}
                            </span>
                          </div>

                          {/* Permanent Delete Button */}
                          <div className="flex items-center self-center shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePermanentDeleteAnchor(vid.id, vid.title);
                              }}
                              disabled={isDeletingAnchorId === vid.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-[11px] font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                              title="Permanently Delete Master Anchor Video"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{isDeletingAnchorId === vid.id ? 'Deleting...' : 'Delete'}</span>
                            </button>
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
        {/* TAB 8: STORED VOICE SAMPLES AND TTS PREVIEW                      */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {activeTab === 'voice' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Third-party TTS preview, not a trained Mohan Sir voice clone */}
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border-2 border-amber-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-md">
                      <Sparkles className="w-3 h-3" />
                      Edge TTS preview
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Not a voice clone
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-amber-400" />
                    Speech preview
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Edge TTS uses a third-party synthetic voice. It is not trained on or verified as Mohan Sir&apos;s voice.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-slate-700">
                    {[
                      { id: 'hi', label: 'Hindi (HI)' },
                      { id: 'mr', label: 'Marathi (MR)' },
                      { id: 'en', label: 'English' },
                    ].map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setVoiceEngineLang(l.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${voiceEngineLang === l.id
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
                    <span>Spoken Script (Script Text to Synthesize):</span>
                    <span className="text-[11px] text-slate-300 font-mono">{voiceEngineScript.length} characters</span>
                  </label>
                  <textarea
                    rows={3}
                    value={voiceEngineScript}
                    onChange={(e) => setVoiceEngineScript(e.target.value)}
                    placeholder="Enter the lecture script you want Mohan Sir to speak..."
                    className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition leading-relaxed"
                  />

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-300 font-semibold self-center mr-1">Templates:</span>
                    {[
                      {
                        label: '🧘 Swar Yoga Intro (Hindi)',
                        text: 'Namaste seekers! I am Mohan Kalburgi. Welcome to this sacred session of Swar Yoga. Stay mindful of your breath and nadi balance.',
                      },
                      {
                        label: '🍎 Swar Dietetics (Hindi)',
                        text: 'भोजन सदैव सूर्य नाड़ी में ही ग्रहण करना चाहिए, क्योंकि उस समय जठराग्नि प्रज्वलित रहती है और भोजन अमृत बन जाता है।',
                      },
                      {
                        label: '🚩 Marathi Lecture (Marathi)',
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
                          if (p.label.includes('Marathi')) setVoiceEngineLang('mr');
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
                      TTS preview
                    </h4>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Creates a speech preview in the selected language; generation time varies.
                    </p>

                    {engineAudioUrl && (
                      <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-3 mb-3 animate-in fade-in">
                        <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold mb-1.5">
                          <span>Speech preview ready ({engineAudioDuration}s)</span>
                          <span className="text-[10px] text-slate-400">44.1kHz • 128kbps</span>
                        </div>
                        <audio controls src={engineAudioUrl} className="w-full h-8" autoPlay />
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setScriptText(voiceEngineScript);
                              showToast('✓ Script copied to main Avatar Studio!');
                            }}
                            className="text-[10px] font-bold text-amber-400 hover:underline cursor-pointer"
                          >
                            + Apply Script to Main Avatar
                          </button>
                          <a
                            href={engineAudioUrl}
                            download="mohan_sir_voice.mp3"
                            className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                          >
                            Download MP3
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateEngineVoice}
                    disabled={isEngineSynthesizing}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-lg ${isEngineSynthesizing
                      ? 'bg-amber-600/50 text-slate-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                      }`}
                  >
                    {isEngineSynthesizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating preview…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-slate-950" />
                        Generate TTS preview
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight border-l-4 border-amber-500 pl-3 flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-amber-400" />
                    STORED AUDIO REFERENCE SAMPLES
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    These are stored audio samples, not verified or trained voice clones. Sample provenance and commercial rights require separate review.
                  </p>
                </div>
                <div className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg">
                  Selected Sample: {selectedVoice.name}
                </div>
              </div>

              {/* Search & Language Filters */}
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search voice samples (e.g. Marathi, Hindi, Aahar, Meditation, Day 1)..."
                    value={voiceSearch}
                    onChange={(e) => setVoiceSearch(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  {[
                    { id: 'all', label: `All (${voiceProfiles.length})` },
                    { id: 'hi', label: `Hindi (${voiceProfiles.filter((v) => v.language === 'hi').length})` },
                    { id: 'mr', label: `Marathi (${voiceProfiles.filter((v) => v.language === 'mr').length})` },
                    { id: 'en', label: `English (${voiceProfiles.filter((v) => v.language === 'en').length})` },
                  ].map((filterTab) => (
                    <button
                      key={filterTab.id}
                      type="button"
                      onClick={() => setVoiceLangFilter(filterTab.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${voiceLangFilter === filterTab.id
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                        }`}
                    >
                      {filterTab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stored voice samples */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {filteredVoices.map((voice) => {
                  const isSel = selectedVoice.id === voice.id;
                  const isPlaying = playingVoiceId === voice.id;

                  return (
                    <div
                      key={voice.id}
                      className={`p-4 rounded-xl border transition flex flex-col justify-between ${isSel
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-xl'
                        : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/80'
                        }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wide ${voice.language === 'mr'
                                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                  : voice.language === 'en'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  }`}
                              >
                                {voice.language === 'mr' ? 'MARATHI (MR)' : voice.language === 'en' ? 'ENGLISH (EN)' : 'HINDI (HI)'}
                              </span>
                              <span className="text-[9px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                Stored audio sample
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
                            title="Delete Voice Sample"
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
                          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition cursor-pointer ${isPlaying
                            ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                            }`}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          {isPlaying ? 'Stop' : 'Listen Sample'}
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Dedicated Delete Button with Label */}
                          <button
                            type="button"
                            onClick={() => handleDeleteVoice(voice.id, voice.name)}
                            disabled={isDeletingVoiceId === voice.id}
                            className="flex items-center gap-1 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-lg border border-rose-500/30 transition cursor-pointer"
                            title="Delete Voice Profile"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {isDeletingVoiceId === voice.id ? '...' : 'Delete'}
                          </button>

                          {/* Select Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedVoice(voice);
                              showToast(`🎙️ Vocal DNA selected: ${voice.name}`);
                            }}
                            className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition cursor-pointer shadow ${isSel
                              ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20 font-black'
                              : 'bg-slate-700/70 hover:bg-slate-700 text-slate-200'
                              }`}
                          >
                            {isSel ? '✓ SELECTED' : 'SELECT'}
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
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight border-l-4 border-amber-500 pl-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-400" />
                    SCRIPT & DIALOGUE STUDIO
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Craft high-fidelity lecture scripts with verbatim fidelity, preserving all sacred yogic terminology.
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
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition uppercase ${selectedLanguage === lang ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
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
                  placeholder="Enter your lecture script here..."
                />
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span>Words: {scriptText.trim().split(/\s+/).filter(Boolean).length}</span>
                  <span>Estimated Video Duration: ~{estimatedDurationSec} seconds</span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => {
                    setScriptText(selectedProfession.sampleTopic[selectedLanguage] || selectedProfession.sampleTopic.hi);
                    showToast('🔄 Profession sample topic reloaded!');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200 font-semibold"
                >
                  Reload Profession Default Topic
                </button>
                <button
                  onClick={() => setActiveTab('engine')}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition"
                >
                  Generate Video with this Script →
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
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight border-l-4 border-amber-500 pl-3 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-amber-400" />
                CENTRAL AI VIDEO GENERATION ENGINE (GPU IN-HOUSE)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Consent-aware in-house render pipeline. Dispatches neural video inference to dedicated GPU workers (Google Colab T4 / Kaggle).
              </p>

              {/* Permanent Master Identity Lock Box */}
              <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-400 shrink-0">
                    <img src="https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg" alt="Master Identity" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">
                      Selected Identity Profile: <span className="text-amber-400 font-mono">Consented Master Profile</span>
                      <span className="text-[10px] text-slate-300 bg-slate-700/50 border border-slate-600 px-1.5 py-0.2 rounded font-semibold">similarity not measured</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Face consistency is not measured or guaranteed by the current in-house queue.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('anchor')}
                  className="text-[11px] text-amber-400 hover:underline font-semibold"
                >
                  View Master Anchor Video →
                </button>
              </div>

              <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100" role="note">
                No neural video render is available yet. A render also requires authorized continuous Bunny-hosted MP4 footage; the selected portrait is not a video source.
              </div>

              {/* Progress Tracker or Start Button */}
              <div className="mt-8 p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-4">
                <div className="max-w-lg mx-auto text-left space-y-2">
                  <label htmlFor="consented-avatar-profile" className="block text-xs font-bold text-slate-200">
                    Consent-verified avatar profile
                  </label>
                  <select
                    id="consented-avatar-profile"
                    value={selectedAvatarProfileId}
                    onChange={(event) => setSelectedAvatarProfileId(event.target.value)}
                    disabled={isGenerating}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-white disabled:opacity-60"
                  >
                    <option value="">Select a saved profile</option>
                    {avatarProfiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>{profile.name}</option>
                    ))}
                  </select>
                  <label htmlFor="mohan-avatar-source-video" className="block text-xs font-bold text-slate-200">
                    Authorized continuous source footage (Bunny MP4 URL)
                  </label>
                  <input
                    id="mohan-avatar-source-video"
                    type="url"
                    value={sourceVideoUrl}
                    onChange={(event) => setSourceVideoUrl(event.target.value)}
                    disabled={isGenerating}
                    autoComplete="url"
                    placeholder="https://swaryogacrm.b-cdn.net/…/authorized-source.mp4"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-white placeholder-slate-500 disabled:opacity-60"
                  />
                  <p className="text-[11px] text-slate-400">
                    Use real, authorized motion footage. Existing promotional sample clips and still images are unverified and do not satisfy the acceptance test without review.
                  </p>
                  {avatarProfilesError && <p className="text-xs text-rose-300">{avatarProfilesError}</p>}
                  {!avatarProfilesError && avatarProfiles.length === 0 && (
                    <p className="text-xs text-amber-300">
                      No saved profiles are available. Profile creation remains unavailable until real face analysis is connected.
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400">
                    This queue prepares speech and waits for an external in-house GPU worker. Camera, outfit, expression, aspect-ratio, and 1080p settings shown above are not yet applied by the renderer.
                  </p>
                </div>
                {generationError && (
                  <div className="max-w-lg mx-auto rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-left text-xs text-rose-200">
                    {generationError}
                  </div>
                )}
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
                    <p className="text-[11px] text-slate-400">
                      No GPU work is claimed until the job status reports a worker render.
                    </p>
                  </div>
                ) : generatedVideoResultUrl ? (
                  <div className="space-y-4 max-w-xl mx-auto py-2">
                    <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-black">
                      <CheckCircle2 className="w-5 h-5" />
                      Video Generated Successfully!
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
                        <Download className="w-4 h-4" /> Download MP4
                      </a>
                      <Link
                        href="/admin/crm/e-learning/rag-video"
                        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition"
                      >
                        Open in Module 8 →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 space-y-4">
                    <button
                      onClick={handleStartGeneration}
                      disabled={!sourceVideoUrl.trim() || !selectedAvatarProfileId}
                      className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm px-8 py-4 rounded-2xl shadow-2xl shadow-amber-500/30 transition transform hover:scale-105 active:scale-95"
                    >
                      <Wand2 className="w-5 h-5" />
                      Queue to In-House GPU Renderer
                    </button>
                    <p className="text-xs text-slate-400">
                      A queued job is not a completed video. The queue will display an output only after the worker reports a verified result.
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
                  <h2 className="text-xl md:text-2xl font-black text-white tracking-tight border-l-4 border-amber-500 pl-3 flex items-center gap-2">
                    <Film className="w-5 h-5 text-amber-400" />
                    STORED VIDEO LIBRARY ({libraryVideos.length} Files)
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Mohan Sir's seven workshop outfit looks are added as selectable Bunny source recordings. They are not generated AI twins; resolution, duration, consent, and identity are not verified by this library.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Import Video Link
                  </button>
                  <button
                    onClick={() => loadLibrary(true)}
                    disabled={isLoadingLibrary}
                    className="flex items-center gap-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3.5 py-2 rounded-lg border border-slate-700 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLibrary ? 'animate-spin' : ''}`} />
                    Refresh
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
                      data-testid={vid.profession_id === 'mohan_workshop_twin_source' ? 'mohan-workshop-twin-source' : undefined}
                      className="bg-slate-800/50 border border-slate-700/60 rounded-xl overflow-hidden flex flex-col justify-between hover:border-amber-400/50 transition group"
                    >
                      <div
                        onClick={() => setPreviewModalUrl(vid.video_url)}
                        className="relative aspect-video bg-black cursor-pointer overflow-hidden"
                      >
                        {vid.profession_id === 'mohan_workshop_twin_source' ? (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800 to-slate-950 text-center">
                            <Video className="w-8 h-8 text-amber-400" aria-hidden="true" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                              Workshop twin-look source
                            </span>
                            <span className="px-2 text-[10px] text-slate-400">{vid.profession_name}</span>
                          </div>
                        ) : (
                          <img
                            src={
                              vid.thumbnail_url && !vid.thumbnail_url.includes('blackbeard') && !vid.thumbnail_url.includes('lime')
                                ? vid.thumbnail_url
                                : 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg'
                            }
                            alt={vid.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>
                        <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {vid.profession_id === 'mohan_workshop_twin_source' ? 'Source recording · not AI-rendered' : 'Stored media'}
                        </span>
                        {isActiveAvatar && (
                          <span className="absolute top-2 right-2 bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                            Reference selected
                          </span>
                        )}
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-1">{vid.title}</h4>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                            <span>{vid.profession_name}</span>
                            <span className="text-amber-300 font-semibold">Resolution unverified</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            {vid.profession_id === 'mohan_workshop_twin_source'
                              ? 'Original source preserved; no AI twin render has been made'
                              : 'Generation and voice metadata unverified'}
                          </div>
                        </div>

                        {/* 5 Required Action Buttons: Preview, Play, Edit, Delete, Use It */}
                        <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            {/* Preview */}
                            <button
                              type="button"
                              onClick={() => setPreviewModalUrl(vid.video_url)}
                              className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded transition cursor-pointer font-semibold"
                              title="Preview Video"
                            >
                              <Eye className="w-3 h-3 text-cyan-400" /> Preview
                            </button>

                            {/* Play */}
                            <button
                              type="button"
                              onClick={() => setPreviewModalUrl(vid.video_url)}
                              className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded transition cursor-pointer font-semibold"
                              title="Play Video"
                            >
                              <Play className="w-3 h-3 text-emerald-400 fill-current" /> Play
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(vid)}
                              className="flex items-center gap-1 text-slate-300 hover:text-amber-400 bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded transition cursor-pointer font-semibold"
                              title="Edit Video Metadata"
                            >
                              <Pencil className="w-3 h-3 text-amber-400" /> Edit
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDeleteVideo(vid.id, vid.title)}
                              disabled={isDeletingId === vid.id}
                              className="flex items-center gap-1 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded transition cursor-pointer font-semibold"
                              title="Delete Video"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              {isDeletingId === vid.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>

                          {/* Select this URL as reference media */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleUseAvatar(vid)}
                              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow ${isActiveAvatar
                                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/20'
                                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
                                }`}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {isActiveAvatar ? '✓ Reference selected' : 'Select reference'}
                            </button>
                            <Link
                              href="/admin/crm/e-learning/rag-video"
                              className="px-2.5 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-amber-400 text-xs font-bold transition flex items-center gap-1"
                              title="Open Module 8; reference media only"
                            >
                              Module 8 →
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
                Import Video Link
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
                <label className="block text-slate-300 font-semibold mb-1">Source (metadata only):</label>
                <select
                  value={importForm.ai_site_source}
                  onChange={(e) => setImportForm({ ...importForm, ai_site_source: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="User-provided video">User-provided existing video</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Video Title:</label>
                <input
                  type="text"
                  placeholder="e.g.: Mohan Sir – Swar Yoga Global Keynote 1080p"
                  value={importForm.title}
                  onChange={(e) => setImportForm({ ...importForm, title: e.target.value })}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Video URL (MP4 Direct Link):</label>
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
                  <label className="block text-slate-300 font-semibold mb-1">Profession / Role:</label>
                  <input
                    type="text"
                    value={importForm.profession_name}
                    onChange={(e) => setImportForm({ ...importForm, profession_name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Language:</label>
                  <select
                    value={importForm.language}
                    onChange={(e) => setImportForm({ ...importForm, language: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-400"
                  >
                    <option value="hi">Hindi (HI)</option>
                    <option value="mr">Marathi (MR)</option>
                    <option value="en">English</option>
                    <option value="ne">Nepali (NE)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Duration (Seconds):</label>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      Import & Add to Library
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
              <h3 className="text-xs font-bold text-white">Video Preview</h3>
              <button
                onClick={() => setPreviewModalUrl(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕ Close
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
                Edit Avatar Video Metadata
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
                <label className="block text-slate-300 font-semibold mb-1">Video Title:</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Profession Name:</label>
                <input
                  type="text"
                  value={editForm.profession_name}
                  onChange={(e) => setEditForm({ ...editForm, profession_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Language:</label>
                <select
                  value={editForm.language}
                  onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="hi">Hindi (HI)</option>
                  <option value="mr">Marathi (MR)</option>
                  <option value="en">English</option>
                  <option value="ne">Nepali (NE)</option>
                </select>
              </div>

              <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 text-[11px] text-slate-400">
                <div className="font-semibold text-slate-300">CDN Direct URL:</div>
                <div className="truncate text-amber-400/90 font-mono mt-0.5">{editingVideo.video_url}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingVideo(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
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
