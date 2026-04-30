'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus, Trash2, Edit, Play, Upload, Loader, ChevronDown, ChevronRight,
  Video, Film, Calendar, Clock, Eye, X, Check, Search, Filter,
  ArrowLeft, ListVideo, Grid, Settings, Copy, Link2, Users,
  Monitor, Camera, Layers, FolderPlus, ExternalLink, RefreshCw,
  CheckSquare, Square, Globe, Lock, Languages
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────

interface SessionPlan {
  day: number;
  topic: string;
}

interface VideoPlaylist {
  _id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  type: 'batch' | 'post';
  videoType: 'gallery' | 'speaker' | 'mixed';
  language?: string;
  batchNumber?: number;
  workshopSlug?: string;
  workshopName?: string;
  zoomMeetingId?: string;
  zoomPassword?: string;
  sessionPlan?: SessionPlan[];
  year?: number;
  month?: number;
  communityId?: string;
  isPublic: boolean;
  membersOnly?: boolean;
  status: string;
  sortOrder: number;
  videoCount: number;
  totalDuration: number;
  totalViews: number;
  createdAt: string;
}

interface PlaylistVideoItem {
  _id: string;
  playlistId: string;
  title: string;
  description: string;
  videoUrl: string;
  s3Key?: string;
  bunnyVideoId?: string;
  bunnyEmbedUrl?: string;
  thumbnailUrl?: string;
  videoType: 'gallery' | 'speaker' | 'screen' | 'other';
  shortCode?: string;
  duration: number;
  quality: string;
  fileSize?: number;
  sessionNumber?: number;
  sessionTitle?: string;
  sortOrder: number;
  views: number;
  status: string;
  tags: string[];
  uploadedAt: string;
}

interface BunnyVideo {
  videoId: string;
  title: string;
  status: string;
  duration: number;
  size: number;
  views: number;
  dateCreated: string;
  thumbnailUrl: string;
  embedUrl: string;
  directPlayUrl: string;
}

interface Stats {
  totalBatchPlaylists: number;
  totalPostPlaylists: number;
  totalVideos: number;
}

// ─── Constants ──────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WORKSHOP_SUGGESTIONS = [
  { slug: 'swar-yoga', name: 'Swar Yoga' },
  { slug: 'aham-bramhasmi', name: 'Aham Bramhasmi' },
  { slug: 'astavakra', name: 'Astavakra' },
  { slug: 'shivoham', name: 'Shivoham' },
  { slug: 'i-am-fit', name: 'I am Fit' },
  { slug: 'yogasana', name: 'Yogasana' },
  { slug: 'amrut-bhoj', name: 'Amrut Bhoj' },
  { slug: 'bandhan-mukti', name: 'Bandhan Mukti' },
];

const LANGUAGES: { val: string; label: string; flag: string }[] = [
  { val: 'hindi', label: 'Hindi', flag: '🇮🇳' },
  { val: 'english', label: 'English', flag: '🇬🇧' },
  { val: 'marathi', label: 'Marathi', flag: '🇮🇳' },
  { val: 'mandarin', label: 'Mandarin', flag: '🇨🇳' },
  { val: 'spanish', label: 'Spanish', flag: '🇪🇸' },
  { val: 'french', label: 'French', flag: '🇫🇷' },
  { val: 'arabic', label: 'Arabic', flag: '🇸🇦' },
  { val: 'german', label: 'German', flag: '🇩🇪' },
  { val: 'portuguese', label: 'Portuguese', flag: '🇧🇷' },
  { val: 'japanese', label: 'Japanese', flag: '🇯🇵' },
  { val: 'korean', label: 'Korean', flag: '🇰🇷' },
  { val: 'russian', label: 'Russian', flag: '🇷🇺' },
  { val: 'italian', label: 'Italian', flag: '🇮🇹' },
  { val: 'turkish', label: 'Turkish', flag: '🇹🇷' },
  { val: 'dutch', label: 'Dutch', flag: '🇳🇱' },
  { val: 'swedish', label: 'Swedish', flag: '🇸🇪' },
  { val: 'thai', label: 'Thai', flag: '🇹🇭' },
  { val: 'indonesian', label: 'Indonesian', flag: '🇮🇩' },
  { val: 'both', label: 'Multi', flag: '🌐' },
];

function getLangDisplay(lang?: string): string {
  const found = LANGUAGES.find(l => l.val === lang);
  return found ? `${found.flag} ${found.label}` : lang || '';
}

const SITE_DOMAIN = 'swaryoga.com';

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Main Page Component ────────────────────────────────────────────

export default function AdminVideosPage() {
  const router = useRouter();
  const token = useAuth();

  const [activeTab, setActiveTab] = useState<'batch' | 'post'>('batch');
  const [playlists, setPlaylists] = useState<VideoPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<VideoPlaylist | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<PlaylistVideoItem[]>([]);
  const [stats, setStats] = useState<Stats>({ totalBatchPlaylists: 0, totalPostPlaylists: 0, totalVideos: 0 });

  const [bunnyVideos, setBunnyVideos] = useState<BunnyVideo[]>([]);
  const [bunnySearch, setBunnySearch] = useState('');
  const [bunnyLoading, setBunnyLoading] = useState(false);
  const [selectedBunnyVideos, setSelectedBunnyVideos] = useState<Set<string>>(new Set());
  // Which video type section the Bunny browser was opened from
  const [bunnyTargetType, setBunnyTargetType] = useState<'gallery' | 'speaker'>('gallery');

  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showBunnyBrowser, setShowBunnyBrowser] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState<string | null>(null);
  const [editingPlaylist, setEditingPlaylist] = useState<VideoPlaylist | null>(null);
  const [editingVideo, setEditingVideo] = useState<PlaylistVideoItem | null>(null);

  const [viewMode, setViewMode] = useState<'table' | 'split'>('table');
  const [thumbnailUploading, setThumbnailUploading] = useState(false);

  // Workshop name suggestions dropdown
  const [showWorkshopSuggestions, setShowWorkshopSuggestions] = useState(false);
  const [showGalleryWorkshopSuggestions, setShowGalleryWorkshopSuggestions] = useState(false);

  const [galleryForm, setGalleryForm] = useState({
    name: '',
    description: '',
    batchNumber: 1,
    workshopName: '',
    workshopSlug: '',
    language: 'hindi' as string,
  });

  const [playlistForm, setPlaylistForm] = useState({
    name: '',
    description: '',
    videoType: 'mixed' as 'gallery' | 'speaker' | 'mixed',
    language: 'hindi' as string,
    source: 'zoom' as 'zoom' | 'upload',
    batchNumber: 1,
    workshopSlug: '',
    workshopName: '',
    zoomMeetingId: '',
    zoomPassword: '',
    sessionPlan: [{ day: 1, topic: '' }] as SessionPlan[],
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    isPublic: false,
    membersOnly: true,
  });

  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    bunnyVideoId: '',
    bunnyEmbedUrl: '',
    thumbnailUrl: '',
    videoType: 'speaker' as 'gallery' | 'speaker' | 'screen' | 'other',
    duration: 0,
    sessionNumber: 1,
    sessionTitle: '',
    tags: '',
  });

  // ─── Zoom Sync State ──────────────────────────────────────────────
  const [zoomSyncing, setZoomSyncing] = useState(false);
  const [zoomSyncStatus, setZoomSyncStatus] = useState<string>('');
  const [zoomSyncProgress, setZoomSyncProgress] = useState<number>(0); // 0-100
  const [zoomRecordingsInfo, setZoomRecordingsInfo] = useState<{ hasRecordings: boolean; topic?: string; recordings?: any[]; days?: any[]; totalDays?: number; totalFiles?: number; totalSizeMB?: number } | null>(null);

  // ─── API Helper ───────────────────────────────────────────────────

  const apiFetch = useCallback(async (url: string, options?: RequestInit) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'API Error');
    return data;
  }, [token]);

  // ─── Data Fetching ────────────────────────────────────────────────

  const fetchPlaylists = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/admin/videos/playlists?type=${activeTab}&status=all`);
      setPlaylists(data.data?.playlists || []);
      setStats(data.data?.stats || { totalBatchPlaylists: 0, totalPostPlaylists: 0, totalVideos: 0 });
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [token, activeTab, apiFetch]);

  const fetchPlaylistVideos = useCallback(async (playlistId: string) => {
    if (!token) return;
    setLoadingVideos(true);
    try {
      const data = await apiFetch(`/api/admin/videos/playlist-videos?playlistId=${playlistId}&status=all`);
      setPlaylistVideos(data.data?.videos || []);
      setSelectedPlaylist(data.data?.playlist || null);
    } catch (e: any) { setError(e.message); }
    setLoadingVideos(false);
  }, [token, apiFetch]);

  const fetchBunnyVideos = useCallback(async () => {
    if (!token) return;
    setBunnyLoading(true);
    try {
      const data = await apiFetch(`/api/admin/videos/bunny?search=${encodeURIComponent(bunnySearch)}&perPage=50`);
      setBunnyVideos(data.data?.videos || []);
    } catch (e: any) { setError(e.message); }
    setBunnyLoading(false);
  }, [token, bunnySearch, apiFetch]);

  useEffect(() => { fetchPlaylists(); }, [fetchPlaylists]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(''), 3000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 5000); return () => clearTimeout(t); }
  }, [error]);

  // ─── Derived: split videos into Gallery & Speaker ─────────────────

  const galleryVideos = playlistVideos.filter(v => v.videoType === 'gallery');
  const speakerVideos = playlistVideos.filter(v => v.videoType === 'speaker');
  const otherVideos = playlistVideos.filter(v => v.videoType !== 'gallery' && v.videoType !== 'speaker');

  // ─── Playlist CRUD ────────────────────────────────────────────────

  const openCreatePlaylist = () => {
    setEditingPlaylist(null);
    setPlaylistForm({
      name: '', description: '', videoType: 'mixed', language: 'hindi', source: 'zoom', batchNumber: 1,
      workshopSlug: '', workshopName: '',
      zoomMeetingId: '', zoomPassword: '',
      sessionPlan: [{ day: 1, topic: '' }],
      year: new Date().getFullYear(), month: new Date().getMonth() + 1,
      isPublic: false, membersOnly: true,
    });
    setGalleryForm({
      name: '', description: '', batchNumber: 1,
      workshopName: '', workshopSlug: '', language: 'hindi',
    });
    setShowPlaylistModal(true);
  };

  const openEditPlaylist = (p: VideoPlaylist) => {
    setEditingPlaylist(p);
    setPlaylistForm({
      name: p.name, description: p.description, videoType: p.videoType || 'mixed',
      language: p.language || 'hindi',
      source: p.zoomMeetingId ? 'zoom' : 'upload',
      batchNumber: p.batchNumber || 1, workshopSlug: p.workshopSlug || '',
      workshopName: p.workshopName || '',
      zoomMeetingId: p.zoomMeetingId || '', zoomPassword: p.zoomPassword || '',
      sessionPlan: p.sessionPlan?.length ? p.sessionPlan : [{ day: 1, topic: '' }],
      year: p.year || new Date().getFullYear(), month: p.month || new Date().getMonth() + 1,
      isPublic: p.isPublic,
      membersOnly: p.membersOnly !== false,
    });
    setShowPlaylistModal(true);
  };

  const savePlaylist = async () => {
    setSaving(true);
    setError('');
    try {
      // Common fields shared by both playlists
      const common: Record<string, unknown> = {
        type: activeTab, isPublic: playlistForm.isPublic, membersOnly: playlistForm.membersOnly,
        zoomMeetingId: playlistForm.zoomMeetingId || undefined,
        zoomPassword: playlistForm.zoomPassword || undefined,
        sessionPlan: playlistForm.sessionPlan.filter(s => s.topic.trim()),
      };
      if (activeTab === 'post') {
        common.year = playlistForm.year;
        common.month = playlistForm.month;
      }

      if (editingPlaylist) {
        // EDIT: update single playlist
        const body: Record<string, unknown> = {
          ...common,
          name: playlistForm.name, description: playlistForm.description,
          videoType: editingPlaylist.videoType || 'mixed', language: playlistForm.language,
        };
        if (activeTab === 'batch') {
          body.batchNumber = playlistForm.batchNumber;
          body.workshopSlug = playlistForm.workshopSlug || slugify(playlistForm.workshopName);
          body.workshopName = playlistForm.workshopName;
        }
        await apiFetch('/api/admin/videos/playlists', {
          method: 'PUT', body: JSON.stringify({ playlistId: editingPlaylist._id, ...body }),
        });
        setSuccess('Playlist updated!');
      } else {
        // CREATE: create Speaker + Gallery playlists together
        const speakerBody: Record<string, unknown> = {
          ...common,
          name: playlistForm.name, description: playlistForm.description,
          videoType: 'speaker', language: playlistForm.language,
        };
        const galleryBody: Record<string, unknown> = {
          ...common,
          name: galleryForm.name, description: galleryForm.description,
          videoType: 'gallery', language: galleryForm.language,
        };
        if (activeTab === 'batch') {
          speakerBody.batchNumber = playlistForm.batchNumber;
          speakerBody.workshopSlug = playlistForm.workshopSlug || slugify(playlistForm.workshopName);
          speakerBody.workshopName = playlistForm.workshopName;
          galleryBody.batchNumber = galleryForm.batchNumber;
          galleryBody.workshopSlug = galleryForm.workshopSlug || slugify(galleryForm.workshopName);
          galleryBody.workshopName = galleryForm.workshopName;
        }
        await apiFetch('/api/admin/videos/playlists', { method: 'POST', body: JSON.stringify(speakerBody) });
        await apiFetch('/api/admin/videos/playlists', { method: 'POST', body: JSON.stringify(galleryBody) });
        setSuccess('Speaker & Gallery playlists created!');
      }
      setShowPlaylistModal(false);
      fetchPlaylists();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const archivePlaylist = async (id: string) => {
    if (!confirm('Archive this playlist?')) return;
    try {
      await apiFetch(`/api/admin/videos/playlists?playlistId=${id}`, { method: 'DELETE' });
      setSuccess('Playlist archived');
      fetchPlaylists();
      if (selectedPlaylist?._id === id) { setSelectedPlaylist(null); setPlaylistVideos([]); }
    } catch (e: any) { setError(e.message); }
  };

  // ─── Video CRUD ───────────────────────────────────────────────────

  const openAddVideo = (forType: 'gallery' | 'speaker' | 'screen' | 'other' = 'speaker') => {
    if (!selectedPlaylist) return;
    setEditingVideo(null);
    const nextNum = playlistVideos.filter(v => v.videoType === forType).length + 1;
    setVideoForm({
      title: '', description: '', videoUrl: '', bunnyVideoId: '', bunnyEmbedUrl: '',
      thumbnailUrl: '', videoType: forType,
      duration: 0, sessionNumber: nextNum, sessionTitle: '', tags: '',
    });
    setShowVideoModal(true);
  };

  const openEditVideo = (v: PlaylistVideoItem) => {
    setEditingVideo(v);
    setVideoForm({
      title: v.title, description: v.description, videoUrl: v.videoUrl,
      bunnyVideoId: v.bunnyVideoId || '', bunnyEmbedUrl: v.bunnyEmbedUrl || '',
      thumbnailUrl: v.thumbnailUrl || '', videoType: v.videoType || 'speaker',
      duration: v.duration, sessionNumber: v.sessionNumber || 1,
      sessionTitle: v.sessionTitle || '', tags: v.tags?.join(', ') || '',
    });
    setShowVideoModal(true);
  };

  const saveVideo = async () => {
    if (!selectedPlaylist) return;
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        title: videoForm.title, description: videoForm.description,
        videoUrl: videoForm.bunnyEmbedUrl || videoForm.videoUrl,
        bunnyVideoId: videoForm.bunnyVideoId || undefined,
        bunnyEmbedUrl: videoForm.bunnyEmbedUrl || undefined,
        thumbnailUrl: videoForm.thumbnailUrl || undefined,
        videoType: videoForm.videoType, duration: videoForm.duration,
        sessionNumber: videoForm.sessionNumber, sessionTitle: videoForm.sessionTitle,
        tags: videoForm.tags ? videoForm.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      };
      if (editingVideo) {
        await apiFetch('/api/admin/videos/playlist-videos', {
          method: 'PUT', body: JSON.stringify({ videoId: editingVideo._id, ...body }),
        });
        setSuccess('Video updated!');
      } else {
        body.playlistId = selectedPlaylist._id;
        await apiFetch('/api/admin/videos/playlist-videos', { method: 'POST', body: JSON.stringify(body) });
        setSuccess('Video added!');
      }
      setShowVideoModal(false);
      fetchPlaylistVideos(selectedPlaylist._id);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Remove this video?')) return;
    try {
      await apiFetch(`/api/admin/videos/playlist-videos?videoId=${videoId}`, { method: 'DELETE' });
      setSuccess('Video removed');
      if (selectedPlaylist) fetchPlaylistVideos(selectedPlaylist._id);
    } catch (e: any) { setError(e.message); }
  };

  // ─── Bunny Browser ────────────────────────────────────────────────

  const openBunnyBrowser = (targetType: 'gallery' | 'speaker' = 'gallery') => {
    setBunnyTargetType(targetType);
    setShowBunnyBrowser(true);
    setSelectedBunnyVideos(new Set());
    fetchBunnyVideos();
  };

  const toggleBunnySelect = (videoId: string) => {
    setSelectedBunnyVideos(prev => {
      const next = new Set(prev);
      next.has(videoId) ? next.delete(videoId) : next.add(videoId);
      return next;
    });
  };

  const addBunnyVideosToPlaylist = async () => {
    if (!selectedPlaylist || selectedBunnyVideos.size === 0) return;
    setSaving(true); setError('');
    let added = 0;
    try {
      for (const bv of bunnyVideos.filter(v => selectedBunnyVideos.has(v.videoId))) {
        await apiFetch('/api/admin/videos/playlist-videos', {
          method: 'POST',
          body: JSON.stringify({
            playlistId: selectedPlaylist._id, title: bv.title,
            videoUrl: bv.embedUrl, bunnyVideoId: bv.videoId,
            bunnyEmbedUrl: bv.embedUrl, thumbnailUrl: bv.thumbnailUrl,
            videoType: bunnyTargetType, duration: bv.duration,
          }),
        });
        added++;
      }
      setSuccess(`${added} video(s) added as ${bunnyTargetType} view!`);
      setShowBunnyBrowser(false);
      fetchPlaylistVideos(selectedPlaylist._id);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  // ─── Zoom Recording Sync ──────────────────────────────────────────

  const checkZoomRecordings = async (meetingId?: string) => {
    const zoomId = meetingId || playlistForm.zoomMeetingId.trim();
    if (!zoomId) { setError('Enter a Zoom Meeting ID first'); return; }
    setZoomSyncing(true);
    setZoomSyncStatus('Checking Zoom recordings...');
    try {
      const data = await apiFetch(`/api/admin/videos/zoom-sync?meetingId=${encodeURIComponent(zoomId)}`);
      setZoomRecordingsInfo(data.data);
      if (data.data?.hasRecordings) {
        const d = data.data;
        setZoomSyncStatus(`Found ${d.totalFiles} recording(s) across ${d.totalDays} day(s) — "${d.topic || 'Meeting'}" (${d.totalSizeMB || 0} MB total)`);
      } else {
        setZoomSyncStatus('No recordings available for this meeting yet.');
      }
    } catch (e: any) { setZoomSyncStatus(`Error: ${e.message}`); }
    setZoomSyncing(false);
  };

  /** Find the sibling speaker/gallery playlist that shares the same batch/workshop */
  const findSiblingPlaylistId = (playlist: VideoPlaylist, targetType: 'speaker' | 'gallery'): string | undefined => {
    return playlists.find(p =>
      p._id !== playlist._id &&
      p.type === playlist.type &&
      p.videoType === targetType &&
      p.batchNumber === playlist.batchNumber &&
      p.workshopSlug === playlist.workshopSlug
    )?._id;
  };

  const syncZoomToBunnyForPlaylist = async (playlist?: VideoPlaylist | null) => {
    const zoomId = playlist?.zoomMeetingId || playlistForm.zoomMeetingId.trim();
    if (!zoomId) { setError('Enter a Zoom Meeting ID first'); return; }
    setZoomSyncing(true);
    setZoomSyncProgress(0);
    setZoomSyncStatus('Connecting to Zoom...');
    try {
      // Auto-detect speaker and gallery playlist IDs
      let speakerPlaylistId: string | undefined;
      let galleryPlaylistId: string | undefined;
      
      const target = playlist || selectedPlaylist;
      if (target) {
        if (target.videoType === 'speaker') {
          speakerPlaylistId = target._id;
          galleryPlaylistId = findSiblingPlaylistId(target, 'gallery');
        } else if (target.videoType === 'gallery') {
          galleryPlaylistId = target._id;
          speakerPlaylistId = findSiblingPlaylistId(target, 'speaker');
        } else {
          speakerPlaylistId = target._id;
        }
      }

      const response = await fetch('/api/admin/videos/zoom-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          meetingId: zoomId,
          speakerPlaylistId,
          galleryPlaylistId,
        }),
      });

      // Check if SSE stream
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        // Read SSE stream for progress
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            // Parse SSE events from buffer
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // keep incomplete line

            let eventType = '';
            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (eventType === 'progress') {
                    setZoomSyncProgress(data.percent || 0);
                    setZoomSyncStatus(data.message || 'Processing...');
                  } else if (eventType === 'done') {
                    setZoomSyncProgress(100);
                    setZoomSyncStatus(`✅ ${data.message}`);
                    setSuccess(data.message);
                    fetchPlaylists();
                    if (selectedPlaylist) fetchPlaylistVideos(selectedPlaylist._id);
                  } else if (eventType === 'error') {
                    setZoomSyncStatus(`❌ ${data.message}`);
                    setError(data.message);
                  }
                } catch { /* skip malformed JSON */ }
                eventType = '';
              }
            }
          }
        }
      } else {
        // Fallback: non-streaming JSON response
        const data = await response.json();
        if (data.success) {
          setZoomSyncProgress(100);
          setZoomSyncStatus(`✅ ${data.message}`);
          setSuccess(data.message);
          fetchPlaylists();
          if (selectedPlaylist) fetchPlaylistVideos(selectedPlaylist._id);
        } else {
          throw new Error(data.error || 'Sync failed');
        }
      }
    } catch (e: any) {
      setZoomSyncStatus(`❌ ${e.message}`);
      setError(e.message);
    }
    setZoomSyncing(false);
  };

  // ─── Session Plan ─────────────────────────────────────────────────

  const addSessionDay = () => {
    setPlaylistForm(prev => ({
      ...prev,
      sessionPlan: [...prev.sessionPlan, { day: prev.sessionPlan.length + 1, topic: '' }],
    }));
  };

  const removeSessionDay = (idx: number) => {
    setPlaylistForm(prev => ({
      ...prev,
      sessionPlan: prev.sessionPlan.filter((_, i) => i !== idx).map((s, i) => ({ ...s, day: i + 1 })),
    }));
  };

  const updateSessionTopic = (idx: number, topic: string) => {
    setPlaylistForm(prev => ({
      ...prev,
      sessionPlan: prev.sessionPlan.map((s, i) => i === idx ? { ...s, topic } : s),
    }));
  };

  const filteredPlaylists = playlists.filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.workshopName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied!');
  };

  const filteredSuggestions = WORKSHOP_SUGGESTIONS.filter(w =>
    w.name.toLowerCase().includes(playlistForm.workshopName.toLowerCase())
  );

  const filteredGallerySuggestions = WORKSHOP_SUGGESTIONS.filter(w =>
    w.name.toLowerCase().includes(galleryForm.workshopName.toLowerCase())
  );

  // ─── Video Section Renderer ───────────────────────────────────────

  const renderVideoSection = (
    sectionTitle: string,
    sectionVideos: PlaylistVideoItem[],
    sectionType: 'gallery' | 'speaker',
    colorClass: string,
    iconColor: string,
    icon: React.ReactNode,
  ) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          {icon}
          {sectionTitle} ({sectionVideos.length})
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={() => openBunnyBrowser(sectionType)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition ${colorClass} hover:opacity-80`}>
            <Film className="w-3 h-3" /> Bunny
          </button>
          <button onClick={() => openAddVideo(sectionType)}
            className="flex items-center gap-1 text-xs bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold px-2.5 py-1.5 rounded-lg transition">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {sectionVideos.length === 0 ? (
        <div className="p-6 text-center">
          <Video className="w-8 h-8 mx-auto text-gray-700 mb-2" />
          <p className="text-gray-600 text-xs">No {sectionType} videos yet</p>
          <button onClick={() => openAddVideo(sectionType)} className="mt-2 text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1 mx-auto">
            <Plus className="w-3 h-3" /> Add First
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-3 py-2 text-left w-10">#</th>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left w-36">Short URL</th>
                <th className="px-3 py-2 text-left w-16">Day</th>
                <th className="px-3 py-2 text-center w-16">Dur.</th>
                <th className="px-3 py-2 text-center w-14">Views</th>
                <th className="px-3 py-2 text-center w-16">Status</th>
                <th className="px-3 py-2 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {sectionVideos.map((v, i) => (
                <tr key={v._id} className="hover:bg-gray-800/40 transition group">
                  <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-9 bg-gray-800 rounded overflow-hidden flex-shrink-0 flex items-center justify-center relative group/thumb cursor-pointer"
                        onClick={() => setShowPreviewModal(v.bunnyEmbedUrl || v.videoUrl)}>
                        {v.thumbnailUrl ? (
                          <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Play className="w-4 h-4 text-gray-600" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center">
                          <Play className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate max-w-[200px] text-xs">{v.title}</p>
                        {v.sessionTitle && <p className="text-[10px] text-gray-500 truncate">{v.sessionTitle}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {v.shortCode ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500 font-mono truncate max-w-[100px]">
                          {SITE_DOMAIN}/{v.shortCode}
                        </span>
                        <button onClick={() => copyLink(`https://${SITE_DOMAIN}/${v.shortCode}`)}
                          className="text-gray-500 hover:text-yellow-400 flex-shrink-0">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {v.sessionNumber ? (
                      <span className="text-yellow-500 font-semibold text-[10px] bg-yellow-500/10 px-1.5 py-0.5 rounded">Day {v.sessionNumber}</span>
                    ) : <span className="text-gray-600 text-xs">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-400 font-mono text-[10px]">{formatDuration(v.duration)}</td>
                  <td className="px-3 py-2.5 text-center text-gray-500 text-[10px]">{v.views}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${v.status === 'active' ? 'bg-green-900/40 text-green-400' : v.status === 'processing' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-red-900/40 text-red-400'}`}>
                      {v.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      {v.bunnyEmbedUrl && (
                        <button onClick={() => setShowPreviewModal(v.bunnyEmbedUrl!)}
                          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-green-400" title="Preview">
                          <Play className="w-3 h-3" />
                        </button>
                      )}
                      {v.shortCode && (
                        <button onClick={() => copyLink(`https://${SITE_DOMAIN}/${v.shortCode}`)}
                          className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-yellow-400" title="Copy Short URL">
                          <Link2 className="w-3 h-3" />
                        </button>
                      )}
                      <button onClick={() => openEditVideo(v)}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-yellow-400" title="Edit">
                        <Edit className="w-3 h-3" />
                      </button>
                      <button onClick={() => deleteVideo(v._id)}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400" title="Remove">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════

  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/admin/crm')}
                className="p-2 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Film className="w-6 h-6 text-yellow-500" />
                  Video &amp; Playlist Manager
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Manage workshop recordings, Bunny Stream playlists &amp; session plans
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <span className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-yellow-400">
                  <ListVideo className="w-3 h-3 inline mr-1" />{stats.totalBatchPlaylists + stats.totalPostPlaylists} Playlists
                </span>
                <span className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-gray-300">
                  <Video className="w-3 h-3 inline mr-1" />{stats.totalVideos} Videos
                </span>
              </div>
              <button onClick={openCreatePlaylist}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm transition shadow-lg shadow-yellow-500/20">
                <Plus className="w-4 h-4" /> New Playlist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-3">
          <div className="bg-red-900/50 border border-red-800 rounded-lg px-4 py-2 text-sm text-red-300 flex items-center justify-between">
            {error}
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}
      {success && (
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-3">
          <div className="bg-green-900/50 border border-green-800 rounded-lg px-4 py-2 text-sm text-green-300 flex items-center gap-2">
            <Check className="w-4 h-4" />{success}
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Helpful Info Box */}
        <div className="mb-6 bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-800/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0">💡</div>
            <div className="flex-1 text-sm">
              <h3 className="font-semibold text-blue-300 mb-1">Quick Tips: Adding Videos to Batches</h3>
              <ul className="text-blue-200/80 space-y-1 text-xs">
                <li>✓ <strong>Add many videos to one batch:</strong> Select an existing batch from the list below, then use the "Add Video" or "Import from Bunny" buttons</li>
                <li>✓ <strong>Same batch, different video types:</strong> Speaker playlists and Gallery playlists are created together for each batch</li>
                <li>✓ <strong>Quick import:</strong> Click "View Videos" next to a batch, then "Import from Bunny" to add multiple videos at once</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Tab Switcher + View Toggle */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
            <button onClick={() => { setActiveTab('batch'); setSelectedPlaylist(null); setPlaylistVideos([]); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'batch'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <Layers className="w-4 h-4" /> Workshop Batches
            </button>
            <button onClick={() => { setActiveTab('post'); setSelectedPlaylist(null); setPlaylistVideos([]); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'post'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
              <Calendar className="w-4 h-4" /> Monthly Posts
            </button>
          </div>
          <div className="flex-1 max-w-sm relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input placeholder="Search playlists..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 focus:border-yellow-500/40 outline-none" />
          </div>
          <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-0.5">
            <button onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${viewMode === 'table' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500 hover:text-white'}`}>
              <Grid className="w-3.5 h-3.5" /> Table
            </button>
            <button onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${viewMode === 'split' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500 hover:text-white'}`}>
              <ListVideo className="w-3.5 h-3.5" /> Split
            </button>
          </div>
          <button onClick={fetchPlaylists} className="text-gray-500 hover:text-yellow-400 transition p-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ═══ TABLE VIEW ═══ */}
        {viewMode === 'table' && (
          <div className="space-y-6">
            {/* Playlists Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <ListVideo className="w-4 h-4 text-yellow-500" />
                  All {activeTab === 'batch' ? 'Workshop' : 'Post'} Playlists ({filteredPlaylists.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />Loading...
                </div>
              ) : filteredPlaylists.length === 0 ? (
                <div className="p-10 text-center text-gray-600">
                  <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No playlists yet</p>
                  <button onClick={openCreatePlaylist} className="mt-3 text-sm text-yellow-500 hover:text-yellow-400 flex items-center gap-1 mx-auto">
                    <Plus className="w-4 h-4" /> Create First
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider">
                        <th className="px-4 py-3 text-left w-10">#</th>
                        <th className="px-4 py-3 text-left">Playlist Name</th>
                        <th className="px-4 py-3 text-left w-24">Type</th>
                        {activeTab === 'batch' && <th className="px-4 py-3 text-left w-32">Workshop</th>}
                        {activeTab === 'batch' && <th className="px-4 py-3 text-center w-16">Batch</th>}
                        <th className="px-4 py-3 text-center w-20">Videos</th>
                        <th className="px-4 py-3 text-center w-20">Duration</th>
                        <th className="px-4 py-3 text-center w-20">Views</th>
                        <th className="px-4 py-3 text-center w-24">Language</th>
                        <th className="px-4 py-3 text-center w-20">Status</th>
                        <th className="px-4 py-3 text-center w-36">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/40">
                      {filteredPlaylists.map((p, i) => (
                        <tr key={p._id}
                          onClick={() => fetchPlaylistVideos(p._id)}
                          className={`cursor-pointer transition group ${selectedPlaylist?._id === p._id ? 'bg-yellow-500/5 border-l-2 border-yellow-500' : 'hover:bg-gray-800/40 border-l-2 border-transparent'}`}>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{i + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-white text-xs truncate max-w-[250px]">{p.name}</p>
                                {p.description && <p className="text-[10px] text-gray-500 truncate max-w-[250px]">{p.description}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              p.videoType === 'speaker' ? 'bg-purple-900/40 text-purple-400 border border-purple-800/50'
                              : p.videoType === 'gallery' ? 'bg-blue-900/40 text-blue-400 border border-blue-800/50'
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
                            }`}>
                              {p.videoType === 'speaker' ? '🎙 Speaker' : p.videoType === 'gallery' ? '🖥 Gallery' : '🔀 Mixed'}
                            </span>
                          </td>
                          {activeTab === 'batch' && (
                            <td className="px-4 py-3 text-xs text-gray-400 truncate max-w-[120px]">{p.workshopName || '-'}</td>
                          )}
                          {activeTab === 'batch' && (
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">#{p.batchNumber || '-'}</span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-center">
                            <span className="flex items-center justify-center gap-1 text-xs text-gray-400">
                              <Video className="w-3 h-3" />{p.videoCount || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-400 font-mono">{formatDuration(p.totalDuration)}</td>
                          <td className="px-4 py-3 text-center text-xs text-gray-500">{p.totalViews || 0}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                              {getLangDisplay(p.language)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              p.status === 'active' ? 'bg-green-900/40 text-green-400'
                              : p.status === 'draft' ? 'bg-gray-800 text-gray-400'
                              : 'bg-red-900/40 text-red-400'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => fetchPlaylistVideos(p._id)}
                                className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-green-400 transition" title="View Videos">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => openEditPlaylist(p)}
                                className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-yellow-400 transition" title="Edit">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => archivePlaylist(p._id)}
                                className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 transition" title="Archive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Selected Playlist Detail (below table) */}
            {selectedPlaylist && (
              <div className="space-y-4">
                {/* Playlist Info Bar */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-lg font-bold text-white">{selectedPlaylist.name}</h2>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          selectedPlaylist.videoType === 'speaker' ? 'bg-purple-900/40 text-purple-400 border border-purple-800/50'
                          : selectedPlaylist.videoType === 'gallery' ? 'bg-blue-900/40 text-blue-400 border border-blue-800/50'
                          : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}>
                          {selectedPlaylist.videoType === 'speaker' ? '🎙 Speaker' : selectedPlaylist.videoType === 'gallery' ? '🖥 Gallery' : '🔀 Mixed'}
                        </span>
                        {selectedPlaylist.language && (
                          <span className="text-sm bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border border-yellow-500/40 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                            <Languages className="w-4 h-4" /> {getLangDisplay(selectedPlaylist.language)}
                          </span>
                        )}
                        {selectedPlaylist.membersOnly !== false && (
                          <span className="text-xs bg-amber-900/30 text-amber-400 border border-amber-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Members Only
                          </span>
                        )}
                      </div>
                      {selectedPlaylist.description && (
                        <p className="text-sm text-gray-400 mt-1">{selectedPlaylist.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" />{selectedPlaylist.videoCount} Videos</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(selectedPlaylist.totalDuration)}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{selectedPlaylist.totalViews} Views</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSelectedPlaylist(null); setPlaylistVideos([]); }}
                        className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition" title="Close">
                        <X className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEditPlaylist(selectedPlaylist)}
                        className="flex items-center gap-1.5 border border-gray-700 hover:border-yellow-500/50 text-gray-400 hover:text-yellow-400 px-3 py-2 rounded-lg text-xs transition">
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                    </div>
                  </div>

                  {/* Zoom Details + Import */}
                  {(selectedPlaylist.zoomMeetingId || selectedPlaylist.zoomPassword) && (
                    <div className="mt-4 space-y-2">
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Video className="w-4 h-4 text-blue-400" />
                            <span className="text-gray-500">Zoom ID:</span>
                            <span className="text-white font-mono">{selectedPlaylist.zoomMeetingId || '-'}</span>
                            {selectedPlaylist.zoomMeetingId && (
                              <button onClick={() => copyLink(selectedPlaylist.zoomMeetingId!)} className="text-gray-500 hover:text-yellow-400">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <span className="text-gray-500">Password:</span>
                            <span className="text-white font-mono">{selectedPlaylist.zoomPassword || '-'}</span>
                          </div>
                        </div>
                        {selectedPlaylist.zoomMeetingId && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => checkZoomRecordings(selectedPlaylist.zoomMeetingId)} disabled={zoomSyncing}
                              className="text-xs px-3 py-1.5 border border-blue-800/50 text-blue-400 hover:bg-blue-900/20 disabled:opacity-50 rounded-lg font-medium transition flex items-center gap-1.5">
                              {zoomSyncing ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Check
                            </button>
                            <button onClick={() => syncZoomToBunnyForPlaylist(selectedPlaylist)} disabled={zoomSyncing}
                              className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg font-semibold transition flex items-center gap-1.5">
                              {zoomSyncing ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Import from Zoom
                            </button>
                          </div>
                        )}
                      </div>
                      {zoomSyncStatus && (
                        <div className={`text-xs px-3 py-2 rounded-lg ${zoomSyncStatus.startsWith('✅') ? 'bg-green-900/20 text-green-400 border border-green-800/30' : zoomSyncStatus.startsWith('❌') || zoomSyncStatus.startsWith('Error') ? 'bg-red-900/20 text-red-400 border border-red-800/30' : 'bg-gray-800/50 text-gray-400 border border-gray-700/30'}`}>
                          <div className="flex items-center gap-2">
                            <span className="flex-1">{zoomSyncStatus}</span>
                            {zoomSyncing && <span className="text-[10px] font-mono text-yellow-400 whitespace-nowrap">{zoomSyncProgress}%</span>}
                          </div>
                          {zoomSyncing && (
                            <div className="mt-2 w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 via-purple-500 to-green-500" style={{ width: `${zoomSyncProgress}%` }} />
                            </div>
                          )}
                        </div>
                      )}
                      {zoomRecordingsInfo?.hasRecordings && (zoomRecordingsInfo.days?.length ?? 0) > 0 && (
                        <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg p-3 space-y-1.5">
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Available: {zoomRecordingsInfo.totalDays} day(s), {zoomRecordingsInfo.totalSizeMB} MB</p>
                          {zoomRecordingsInfo.days!.map((day: any) => (
                            <div key={day.date} className="flex items-center gap-2 text-xs">
                              <span className="text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded text-[10px]">Day {day.dayNumber}</span>
                              <span className="text-gray-500 font-mono text-[10px]">{day.date}</span>
                              {day.recordings.map((r: any, ri: number) => (
                                <span key={ri} className={`text-[10px] px-1.5 py-0.5 rounded ${r.type?.includes('speaker') ? 'bg-purple-900/30 text-purple-400' : r.type?.includes('gallery') ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
                                  {r.type?.includes('speaker') ? '🎙 SP' : r.type?.includes('gallery') ? '🖥 GL' : r.type} {((r.fileSize||0)/1024/1024).toFixed(0)}MB
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Session Plan */}
                  {selectedPlaylist.sessionPlan && selectedPlaylist.sessionPlan.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Session Plan</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {selectedPlaylist.sessionPlan.map((s) => (
                          <div key={s.day} className="bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-2 text-center">
                            <div className="text-yellow-500 font-bold text-xs">Day {s.day}</div>
                            <div className="text-white text-xs mt-0.5 truncate">{s.topic || '-'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Videos Table — All videos for this playlist */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <Video className="w-4 h-4 text-yellow-500" />
                      Videos ({playlistVideos.length})
                    </h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openBunnyBrowser(selectedPlaylist.videoType === 'gallery' ? 'gallery' : 'speaker')}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border bg-orange-900/30 border-orange-800/50 text-orange-400 hover:opacity-80 transition">
                        <Film className="w-3 h-3" /> Browse Bunny
                      </button>
                      <button onClick={() => openAddVideo(selectedPlaylist.videoType === 'gallery' ? 'gallery' : selectedPlaylist.videoType === 'speaker' ? 'speaker' : 'speaker')}
                        className="flex items-center gap-1 text-xs bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold px-2.5 py-1.5 rounded-lg transition">
                        <Plus className="w-3 h-3" /> Add Video
                      </button>
                    </div>
                  </div>

                  {loadingVideos ? (
                    <div className="p-8 text-center text-gray-500">
                      <Loader className="w-5 h-5 animate-spin mx-auto mb-2" />Loading videos...
                    </div>
                  ) : playlistVideos.length === 0 ? (
                    <div className="p-8 text-center">
                      <Video className="w-10 h-10 mx-auto text-gray-700 mb-2" />
                      <p className="text-gray-500 text-sm font-semibold mb-1">Empty Batch - Add Videos Now!</p>
                      <p className="text-gray-600 text-xs mb-4">This batch has no videos yet. You can add videos in two ways:</p>
                      <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-4 mb-4 text-left">
                        <div className="space-y-2 text-xs text-gray-300">
                          <div><strong>Option 1 - Upload from Bunny:</strong> Click "Import from Bunny" and select multiple videos at once</div>
                          <div><strong>Option 2 - Add Manually:</strong> Click "Add Video Manually" to enter video URLs and details one by one</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3 mt-4">
                        <button onClick={() => openAddVideo(selectedPlaylist.videoType === 'gallery' ? 'gallery' : 'speaker')}
                          className="text-xs bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5" /> Add Video Manually
                        </button>
                        <button onClick={() => openBunnyBrowser(selectedPlaylist.videoType === 'gallery' ? 'gallery' : 'speaker')}
                          className="text-xs border border-orange-800/50 text-orange-400 hover:bg-orange-900/20 px-4 py-2 rounded-lg transition flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5" /> Import from Bunny
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider">
                            <th className="px-4 py-2.5 text-left w-10">#</th>
                            <th className="px-4 py-2.5 text-left">Title</th>
                            <th className="px-4 py-2.5 text-left w-20">Type</th>
                            <th className="px-4 py-2.5 text-left w-44">Short URL</th>
                            <th className="px-4 py-2.5 text-center w-16">Day</th>
                            <th className="px-4 py-2.5 text-center w-20">Duration</th>
                            <th className="px-4 py-2.5 text-center w-16">Views</th>
                            <th className="px-4 py-2.5 text-center w-20">Status</th>
                            <th className="px-4 py-2.5 text-center w-32">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/40">
                          {playlistVideos.map((v, i) => (
                            <tr key={v._id} className="hover:bg-gray-800/40 transition group">
                              <td className="px-4 py-3 text-gray-500 font-mono text-xs">{i + 1}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-16 h-10 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center relative group/thumb cursor-pointer"
                                    onClick={() => setShowPreviewModal(v.bunnyEmbedUrl || v.videoUrl)}>
                                    {v.thumbnailUrl ? (
                                      <img src={v.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <Play className="w-4 h-4 text-gray-600" />
                                    )}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 transition flex items-center justify-center">
                                      <Play className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-white truncate max-w-[250px] text-xs">{v.title}</p>
                                    {v.sessionTitle && <p className="text-[10px] text-gray-500 truncate">{v.sessionTitle}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                  v.videoType === 'speaker' ? 'bg-purple-900/40 text-purple-400'
                                  : v.videoType === 'gallery' ? 'bg-blue-900/40 text-blue-400'
                                  : v.videoType === 'screen' ? 'bg-cyan-900/40 text-cyan-400'
                                  : 'bg-gray-800 text-gray-400'
                                }`}>
                                  {v.videoType}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {v.shortCode ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-green-400 font-mono bg-green-900/20 border border-green-800/40 px-2 py-0.5 rounded truncate max-w-[140px]">
                                      {SITE_DOMAIN}/{v.shortCode}
                                    </span>
                                    <button onClick={() => copyLink(`https://${SITE_DOMAIN}/${v.shortCode}`)}
                                      className="text-gray-500 hover:text-yellow-400 flex-shrink-0 transition" title="Copy URL">
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-gray-600 italic">No short URL</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {v.sessionNumber ? (
                                  <span className="text-yellow-500 font-semibold text-[10px] bg-yellow-500/10 px-2 py-0.5 rounded">Day {v.sessionNumber}</span>
                                ) : <span className="text-gray-600 text-xs">-</span>}
                              </td>
                              <td className="px-4 py-3 text-center text-gray-400 font-mono text-[10px]">{formatDuration(v.duration)}</td>
                              <td className="px-4 py-3 text-center text-gray-500 text-[10px]">{v.views}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${v.status === 'active' ? 'bg-green-900/40 text-green-400' : v.status === 'processing' ? 'bg-yellow-900/40 text-yellow-400' : 'bg-red-900/40 text-red-400'}`}>
                                  {v.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {v.bunnyEmbedUrl && (
                                    <button onClick={() => setShowPreviewModal(v.bunnyEmbedUrl!)}
                                      className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-green-400 transition" title="Preview">
                                      <Play className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {v.shortCode && (
                                    <button onClick={() => copyLink(`https://${SITE_DOMAIN}/${v.shortCode}`)}
                                      className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-yellow-400 transition" title="Copy Short URL">
                                      <Link2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button onClick={() => openEditVideo(v)}
                                    className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-yellow-400 transition" title="Edit">
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deleteVideo(v._id)}
                                    className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 transition" title="Remove">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ SPLIT VIEW (original sidebar + detail) ═══ */}
        {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Playlist List */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <ListVideo className="w-4 h-4 text-yellow-500" />
                  {activeTab === 'batch' ? 'Workshop Batches' : 'Monthly Posts'}
                </h2>
                <button onClick={fetchPlaylists} className="text-gray-500 hover:text-yellow-400 transition">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <Loader className="w-6 h-6 animate-spin mx-auto mb-2" />Loading...
                </div>
              ) : filteredPlaylists.length === 0 ? (
                <div className="p-8 text-center text-gray-600">
                  <Film className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No playlists yet</p>
                  <button onClick={openCreatePlaylist}
                    className="mt-3 text-sm text-yellow-500 hover:text-yellow-400 flex items-center gap-1 mx-auto">
                    <Plus className="w-4 h-4" /> Create First
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-800/50 max-h-[70vh] overflow-y-auto">
                  {filteredPlaylists.map(p => (
                    <div key={p._id} onClick={() => fetchPlaylistVideos(p._id)}
                      className={`px-4 py-3 cursor-pointer transition group ${selectedPlaylist?._id === p._id
                        ? 'bg-yellow-500/10 border-l-2 border-yellow-500'
                        : 'hover:bg-gray-800/60 border-l-2 border-transparent'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                            <span className="text-sm font-medium truncate">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            {activeTab === 'batch' && p.workshopName && (
                              <span className="text-gray-400">{p.workshopName}</span>
                            )}
                            <span className="flex items-center gap-1"><Video className="w-3 h-3" />{p.videoCount || 0}</span>
                            {p.totalDuration > 0 && (
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(p.totalDuration)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {p.language && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                                {getLangDisplay(p.language)}
                              </span>
                            )}
                            {p.membersOnly !== false && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-800/50">
                                <Lock className="w-2.5 h-2.5 inline mr-0.5" />Members
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={e => { e.stopPropagation(); openEditPlaylist(p); }}
                            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-yellow-400">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); archivePlaylist(p._id); }}
                            className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {p.status !== 'active' && (
                        <span className={`inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${p.status === 'draft' ? 'bg-gray-800 text-gray-400' : 'bg-red-900/40 text-red-400'}`}>
                          {p.status}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Selected Playlist Detail + Videos */}
          <div className="lg:col-span-8 xl:col-span-9">
            {!selectedPlaylist ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
                <Film className="w-16 h-16 mx-auto text-gray-700 mb-4" />
                <h3 className="text-lg font-medium text-gray-400">Select a playlist</h3>
                <p className="text-sm text-gray-600 mt-1">Choose a playlist from the left to manage its videos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* ═══ TOP INFO BAR: Common Details ═══ */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-lg font-bold text-white">{selectedPlaylist.name}</h2>
                        {selectedPlaylist.language && (
                          <span className="text-sm bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-300 border border-yellow-500/40 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                            <Languages className="w-4 h-4" /> {getLangDisplay(selectedPlaylist.language)}
                          </span>
                        )}
                        {selectedPlaylist.membersOnly !== false && (
                          <span className="text-xs bg-amber-900/30 text-amber-400 border border-amber-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Members Only
                          </span>
                        )}
                        {selectedPlaylist.isPublic && (
                          <span className="text-xs bg-green-900/40 text-green-400 border border-green-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Public
                          </span>
                        )}
                        {!selectedPlaylist.zoomMeetingId && (
                          <span className="text-xs bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Upload className="w-3 h-3" /> Manual Upload
                          </span>
                        )}
                      </div>
                      {selectedPlaylist.description && (
                        <p className="text-sm text-gray-400 mt-1">{selectedPlaylist.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Video className="w-3.5 h-3.5" />{selectedPlaylist.videoCount} Videos</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatDuration(selectedPlaylist.totalDuration)}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{selectedPlaylist.totalViews} Views</span>
                      </div>
                    </div>
                    <button onClick={() => openEditPlaylist(selectedPlaylist)}
                      className="flex items-center gap-1.5 border border-gray-700 hover:border-yellow-500/50 text-gray-400 hover:text-yellow-400 px-3 py-2 rounded-lg text-xs transition">
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>

                  {/* Zoom Details + Import */}
                  {(selectedPlaylist.zoomMeetingId || selectedPlaylist.zoomPassword) && (
                    <div className="mt-4 space-y-2">
                      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Video className="w-4 h-4 text-blue-400" />
                            <span className="text-gray-500">Zoom ID:</span>
                            <span className="text-white font-mono">{selectedPlaylist.zoomMeetingId || '-'}</span>
                            {selectedPlaylist.zoomMeetingId && (
                              <button onClick={() => copyLink(selectedPlaylist.zoomMeetingId!)} className="text-gray-500 hover:text-yellow-400">
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <span className="text-gray-500">Password:</span>
                            <span className="text-white font-mono">{selectedPlaylist.zoomPassword || '-'}</span>
                          </div>
                        </div>
                        {selectedPlaylist.zoomMeetingId && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => checkZoomRecordings(selectedPlaylist.zoomMeetingId)} disabled={zoomSyncing}
                              className="text-xs px-3 py-1.5 border border-blue-800/50 text-blue-400 hover:bg-blue-900/20 disabled:opacity-50 rounded-lg font-medium transition flex items-center gap-1.5">
                              {zoomSyncing ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Check
                            </button>
                            <button onClick={() => syncZoomToBunnyForPlaylist(selectedPlaylist)} disabled={zoomSyncing}
                              className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg font-semibold transition flex items-center gap-1.5">
                              {zoomSyncing ? <Loader className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Import from Zoom
                            </button>
                          </div>
                        )}
                      </div>
                      {zoomSyncStatus && (
                        <div className={`text-xs px-3 py-2 rounded-lg ${zoomSyncStatus.startsWith('✅') ? 'bg-green-900/20 text-green-400 border border-green-800/30' : zoomSyncStatus.startsWith('❌') || zoomSyncStatus.startsWith('Error') ? 'bg-red-900/20 text-red-400 border border-red-800/30' : 'bg-gray-800/50 text-gray-400 border border-gray-700/30'}`}>
                          <div className="flex items-center gap-2">
                            <span className="flex-1">{zoomSyncStatus}</span>
                            {zoomSyncing && <span className="text-[10px] font-mono text-yellow-400 whitespace-nowrap">{zoomSyncProgress}%</span>}
                          </div>
                          {zoomSyncing && (
                            <div className="mt-2 w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 via-purple-500 to-green-500" style={{ width: `${zoomSyncProgress}%` }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Session Plan */}
                  {selectedPlaylist.sessionPlan && selectedPlaylist.sessionPlan.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Session Plan</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {selectedPlaylist.sessionPlan.map((s) => (
                          <div key={s.day} className="bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-2 text-center">
                            <div className="text-yellow-500 font-bold text-xs">Day {s.day}</div>
                            <div className="text-white text-xs mt-0.5 truncate">{s.topic || '-'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ═══ TWO-COLUMN: Speaker (Left) + Gallery (Right) ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* LEFT: Speaker View */}
                  {renderVideoSection(
                    'Speaker View',
                    speakerVideos,
                    'speaker',
                    'bg-purple-900/30 border-purple-800/50 text-purple-400',
                    'text-purple-400',
                    <Camera className="w-4 h-4 text-purple-400" />,
                  )}

                  {/* RIGHT: Gallery View */}
                  {renderVideoSection(
                    'Gallery View',
                    galleryVideos,
                    'gallery',
                    'bg-blue-900/30 border-blue-800/50 text-blue-400',
                    'text-blue-400',
                    <Monitor className="w-4 h-4 text-blue-400" />,
                  )}
                </div>

                {/* Screen Share + Other videos — full width below */}
                {otherVideos.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-gray-400" />
                        Other Videos ({otherVideos.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-800/60 text-gray-400 text-xs uppercase tracking-wider">
                            <th className="px-3 py-2 text-left w-10">#</th>
                            <th className="px-3 py-2 text-left">Title</th>
                            <th className="px-3 py-2 text-left w-20">Type</th>
                            <th className="px-3 py-2 text-left w-36">Short URL</th>
                            <th className="px-3 py-2 text-center w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/40">
                          {otherVideos.map((v, i) => (
                            <tr key={v._id} className="hover:bg-gray-800/40 transition group">
                              <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{i + 1}</td>
                              <td className="px-3 py-2.5 text-xs text-white">{v.title}</td>
                              <td className="px-3 py-2.5">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">{v.videoType}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                {v.shortCode ? (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-500 font-mono">{SITE_DOMAIN}/{v.shortCode}</span>
                                    <button onClick={() => copyLink(`https://${SITE_DOMAIN}/${v.shortCode}`)} className="text-gray-500 hover:text-yellow-400">
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : <span className="text-[10px] text-gray-600">-</span>}
                              </td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                                  <button onClick={() => openEditVideo(v)} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-yellow-400"><Edit className="w-3 h-3" /></button>
                                  <button onClick={() => deleteVideo(v._id)} className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}
      </div>

      {/* ═══════════════ MODALS ═══════════════════════════════════════ */}

      {/* Playlist Create/Edit Modal — 2-column layout */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl my-8">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-yellow-500" />
                {editingPlaylist ? 'Edit Playlist' : 'Create Playlist'}
              </h3>
              <button onClick={() => setShowPlaylistModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 max-h-[75vh] overflow-y-auto space-y-5">

              {!editingPlaylist ? (
                <>
                  {/* ═══ CREATE MODE: Part A (Speaker) + Part B (Gallery) ═══ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                    {/* ── Part A — Speaker Video (Left) ── */}
                    <div className="space-y-3 bg-purple-500/5 border border-purple-800/30 rounded-xl p-4">
                      <div className="pb-2 border-b border-purple-800/30">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5" /> Part A — Speaker Video
                        </h4>
                        <p className="text-[10px] text-purple-400/60 mt-0.5">Add if screen was shared</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Playlist Name *</label>
                        <input value={playlistForm.name} onChange={e => setPlaylistForm(p => ({ ...p, name: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none"
                          placeholder="e.g. Swar Yoga Batch 5 - Speaker" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Description</label>
                        <textarea value={playlistForm.description} onChange={e => setPlaylistForm(p => ({ ...p, description: e.target.value }))}
                          rows={2}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none resize-none"
                          placeholder="Brief description..." />
                      </div>
                      {activeTab === 'batch' && (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Batch Number *</label>
                            <input type="number" min={1} value={playlistForm.batchNumber}
                              onChange={e => setPlaylistForm(p => ({ ...p, batchNumber: parseInt(e.target.value) || 1 }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500/40 outline-none" />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Workshop Name *</label>
                            <input
                              value={playlistForm.workshopName}
                              onChange={e => {
                                const val = e.target.value;
                                setPlaylistForm(p => ({ ...p, workshopName: val, workshopSlug: slugify(val) }));
                                setShowWorkshopSuggestions(true);
                              }}
                              onFocus={() => setShowWorkshopSuggestions(true)}
                              onBlur={() => setTimeout(() => setShowWorkshopSuggestions(false), 200)}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none"
                              placeholder="Type or select workshop..."
                            />
                            {showWorkshopSuggestions && filteredSuggestions.length > 0 && (
                              <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-32 overflow-y-auto">
                                {filteredSuggestions.map(w => (
                                  <button key={w.slug}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => {
                                      setPlaylistForm(p => ({ ...p, workshopName: w.name, workshopSlug: w.slug }));
                                      setShowWorkshopSuggestions(false);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition">
                                    {w.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1.5">
                          <Languages className="w-3.5 h-3.5" /> Language *
                        </label>
                        <select value={playlistForm.language}
                          onChange={e => setPlaylistForm(p => ({ ...p, language: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500/40 outline-none">
                          {LANGUAGES.map(l => (
                            <option key={l.val} value={l.val}>{l.flag} {l.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* ── Part B — Gallery Video (Right) ── */}
                    <div className="space-y-3 bg-blue-500/5 border border-blue-800/30 rounded-xl p-4">
                      <div className="pb-2 border-b border-blue-800/30">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                          <Monitor className="w-3.5 h-3.5" /> Part B — Gallery Video
                        </h4>
                        <p className="text-[10px] text-blue-400/60 mt-0.5">Add if screen was shared</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Playlist Name *</label>
                        <input value={galleryForm.name} onChange={e => setGalleryForm(p => ({ ...p, name: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none"
                          placeholder="e.g. Swar Yoga Batch 5 - Gallery" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Description</label>
                        <textarea value={galleryForm.description} onChange={e => setGalleryForm(p => ({ ...p, description: e.target.value }))}
                          rows={2}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none resize-none"
                          placeholder="Brief description..." />
                      </div>
                      {activeTab === 'batch' && (
                        <>
                          <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Batch Number *</label>
                            <input type="number" min={1} value={galleryForm.batchNumber}
                              onChange={e => setGalleryForm(p => ({ ...p, batchNumber: parseInt(e.target.value) || 1 }))}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500/40 outline-none" />
                          </div>
                          <div className="relative">
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Workshop Name *</label>
                            <input
                              value={galleryForm.workshopName}
                              onChange={e => {
                                const val = e.target.value;
                                setGalleryForm(p => ({ ...p, workshopName: val, workshopSlug: slugify(val) }));
                                setShowGalleryWorkshopSuggestions(true);
                              }}
                              onFocus={() => setShowGalleryWorkshopSuggestions(true)}
                              onBlur={() => setTimeout(() => setShowGalleryWorkshopSuggestions(false), 200)}
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none"
                              placeholder="Type or select workshop..."
                            />
                            {showGalleryWorkshopSuggestions && filteredGallerySuggestions.length > 0 && (
                              <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-32 overflow-y-auto">
                                {filteredGallerySuggestions.map(w => (
                                  <button key={w.slug}
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => {
                                      setGalleryForm(p => ({ ...p, workshopName: w.name, workshopSlug: w.slug }));
                                      setShowGalleryWorkshopSuggestions(false);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition">
                                    {w.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1.5">
                          <Languages className="w-3.5 h-3.5" /> Language *
                        </label>
                        <select value={galleryForm.language}
                          onChange={e => setGalleryForm(p => ({ ...p, language: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500/40 outline-none">
                          {LANGUAGES.map(l => (
                            <option key={l.val} value={l.val}>{l.flag} {l.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* ═══ EDIT MODE: Single column ═══ */
                <div className="space-y-4 bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5 pb-2 border-b border-gray-700/50">
                    <Edit className="w-3.5 h-3.5" /> Editing: {editingPlaylist.videoType === 'gallery' ? 'Gallery' : editingPlaylist.videoType === 'speaker' ? 'Speaker' : 'Mixed'} Playlist
                  </h4>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Playlist Name *</label>
                    <input value={playlistForm.name} onChange={e => setPlaylistForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none"
                      placeholder="Playlist name" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Description</label>
                    <textarea value={playlistForm.description} onChange={e => setPlaylistForm(p => ({ ...p, description: e.target.value }))}
                      rows={2}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none resize-none"
                      placeholder="Brief description..." />
                  </div>
                  {activeTab === 'batch' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Batch Number *</label>
                        <input type="number" min={1} value={playlistForm.batchNumber}
                          onChange={e => setPlaylistForm(p => ({ ...p, batchNumber: parseInt(e.target.value) || 1 }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500/40 outline-none" />
                      </div>
                      <div className="relative">
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Workshop Name *</label>
                        <input
                          value={playlistForm.workshopName}
                          onChange={e => {
                            const val = e.target.value;
                            setPlaylistForm(p => ({ ...p, workshopName: val, workshopSlug: slugify(val) }));
                            setShowWorkshopSuggestions(true);
                          }}
                          onFocus={() => setShowWorkshopSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowWorkshopSuggestions(false), 200)}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none"
                          placeholder="Type or select workshop..."
                        />
                        {showWorkshopSuggestions && filteredSuggestions.length > 0 && (
                          <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden max-h-32 overflow-y-auto">
                            {filteredSuggestions.map(w => (
                              <button key={w.slug}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => {
                                  setPlaylistForm(p => ({ ...p, workshopName: w.name, workshopSlug: w.slug }));
                                  setShowWorkshopSuggestions(false);
                                }}
                                className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition">
                                {w.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1 flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5" /> Language *
                    </label>
                    <select value={playlistForm.language}
                      onChange={e => setPlaylistForm(p => ({ ...p, language: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500/40 outline-none">
                      {LANGUAGES.map(l => (
                        <option key={l.val} value={l.val}>{l.flag} {l.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* ═══ Part C — Common Settings (full width) ═══ */}
              <div className="border-t border-gray-800 pt-5 space-y-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Part C — Common Settings</h4>

                {/* Year/Month for post tab */}
                {activeTab === 'post' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Year *</label>
                      <input type="number" value={playlistForm.year}
                        onChange={e => setPlaylistForm(p => ({ ...p, year: parseInt(e.target.value) || 2026 }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500/40 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Month *</label>
                      <select value={playlistForm.month}
                        onChange={e => setPlaylistForm(p => ({ ...p, month: parseInt(e.target.value) }))}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500/40 outline-none">
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {/* Video Source */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">Video Source</label>
                  <div className="flex gap-2">
                    <button onClick={() => setPlaylistForm(p => ({ ...p, source: 'zoom' }))}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition ${playlistForm.source === 'zoom'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                      <Video className="w-3.5 h-3.5" /> Zoom Recording
                    </button>
                    <button onClick={() => setPlaylistForm(p => ({ ...p, source: 'upload', zoomMeetingId: '', zoomPassword: '' }))}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium border transition ${playlistForm.source === 'upload'
                        ? 'bg-green-500/20 border-green-500/50 text-green-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'}`}>
                      <Upload className="w-3.5 h-3.5" /> Manual Upload
                    </button>
                  </div>
                </div>

                {playlistForm.source === 'zoom' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Zoom Meeting ID</label>
                        <input value={playlistForm.zoomMeetingId}
                          onChange={e => { setPlaylistForm(p => ({ ...p, zoomMeetingId: e.target.value })); setZoomRecordingsInfo(null); setZoomSyncStatus(''); }}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none font-mono"
                          placeholder="123 456 7890" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Zoom Password</label>
                        <input value={playlistForm.zoomPassword}
                          onChange={e => setPlaylistForm(p => ({ ...p, zoomPassword: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none font-mono"
                          placeholder="abc123" />
                      </div>
                    </div>
                    {/* Zoom → Bunny sync controls */}
                    <div className="bg-blue-500/5 border border-blue-800/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-400 font-medium">Zoom → Bunny Stream (auto-import recordings)</span>
                        <button
                          onClick={() => checkZoomRecordings()}
                          disabled={zoomSyncing || !playlistForm.zoomMeetingId.trim()}
                          className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition flex items-center gap-1.5">
                          {zoomSyncing ? <Loader className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Check Recordings
                        </button>
                      </div>
                      {zoomSyncStatus && (
                        <div className={`text-xs ${zoomSyncStatus.startsWith('✅') ? 'text-green-400' : zoomSyncStatus.startsWith('❌') || zoomSyncStatus.startsWith('Error') ? 'text-red-400' : 'text-gray-400'}`}>
                          <div className="flex items-center gap-2">
                            <span className="flex-1">{zoomSyncStatus}</span>
                            {zoomSyncing && <span className="text-[10px] font-mono text-yellow-400 whitespace-nowrap">{zoomSyncProgress}%</span>}
                          </div>
                          {zoomSyncing && (
                            <div className="mt-2 w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 via-purple-500 to-green-500" style={{ width: `${zoomSyncProgress}%` }} />
                            </div>
                          )}
                        </div>
                      )}
                      {zoomRecordingsInfo?.hasRecordings && (
                        <div className="pt-1 space-y-2">
                          {/* Day-grouped recordings */}
                          {(zoomRecordingsInfo.days?.length ?? 0) > 0 ? (
                            <div className="space-y-1.5">
                              {zoomRecordingsInfo.days!.map((day: any) => (
                                <div key={day.date} className="flex items-center gap-2 bg-gray-800/60 rounded-lg px-3 py-2">
                                  <span className="text-yellow-500 font-bold text-xs bg-yellow-500/10 px-2 py-0.5 rounded">Day {day.dayNumber}</span>
                                  <span className="text-gray-400 text-[10px] font-mono">{day.date}</span>
                                  <div className="flex-1 flex items-center gap-1.5 flex-wrap">
                                    {day.recordings.map((r: any, i: number) => (
                                      <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded ${
                                        r.type?.includes('speaker') ? 'bg-purple-900/40 text-purple-400'
                                        : r.type?.includes('gallery') ? 'bg-blue-900/40 text-blue-400'
                                        : 'bg-gray-700 text-gray-400'
                                      }`}>
                                        {r.type?.includes('speaker') ? '🎙' : r.type?.includes('gallery') ? '🖥' : '📹'} {r.fileType} ({((r.fileSize || 0) / 1024 / 1024).toFixed(0)}MB)
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-500 mb-1.5">
                              {zoomRecordingsInfo.recordings?.map((r: any, i: number) => (
                                <span key={i} className="inline-block mr-2 mb-1 px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">
                                  {r.type} ({r.fileType}, {((r.fileSize || 0) / 1024 / 1024).toFixed(0)} MB)
                                </span>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => syncZoomToBunnyForPlaylist()}
                            disabled={zoomSyncing}
                            className="w-full text-xs px-3 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg font-semibold transition flex items-center justify-center gap-1.5">
                            {zoomSyncing ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            Import {zoomRecordingsInfo.totalDays || ''} Day(s) to Bunny Stream
                          </button>
                          <p className="text-[10px] text-gray-600 text-center">
                            Downloads from Zoom → uploads to Bunny CDN → creates video entries with day numbers &amp; short URLs. May take several minutes.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Session Plan */}
                {activeTab === 'batch' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-gray-400">Session Plan (Days &amp; Topics)</label>
                      <button onClick={addSessionDay} className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add Day
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {playlistForm.sessionPlan.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-yellow-500 font-bold w-12 text-center bg-yellow-500/10 rounded py-2 flex-shrink-0">
                            Day {s.day}
                          </span>
                          <input value={s.topic} onChange={e => updateSessionTopic(idx, e.target.value)}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none"
                            placeholder={`Topic for Day ${s.day}`} />
                          {playlistForm.sessionPlan.length > 1 && (
                            <button onClick={() => removeSessionDay(idx)}
                              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Access Controls */}
                <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 space-y-2.5">
                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings className="w-3 h-3" /> Access
                  </h4>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span className="text-xs text-gray-300">Members Only</span>
                    </div>
                    <button onClick={() => setPlaylistForm(p => ({ ...p, membersOnly: !p.membersOnly }))}
                      className={`w-10 h-5 rounded-full relative transition ${playlistForm.membersOnly ? 'bg-amber-500' : 'bg-gray-700'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${playlistForm.membersOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-gray-300">Public</span>
                    </div>
                    <button onClick={() => setPlaylistForm(p => ({ ...p, isPublic: !p.isPublic }))}
                      className={`w-10 h-5 rounded-full relative transition ${playlistForm.isPublic ? 'bg-green-500' : 'bg-gray-700'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${playlistForm.isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
              <button onClick={() => setShowPlaylistModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">Cancel</button>
              <button onClick={savePlaylist} disabled={saving || !playlistForm.name.trim() || (!editingPlaylist && !galleryForm.name.trim())}
                className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition flex items-center gap-2">
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Saving...' : editingPlaylist ? 'Update' : 'Create Both'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Add/Edit Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-yellow-500" />
                {editingVideo ? 'Edit Video' : 'Add Video'}
                <span className={`text-xs px-2 py-0.5 rounded-full ml-1 ${videoForm.videoType === 'gallery' ? 'bg-blue-900/40 text-blue-400' : 'bg-purple-900/40 text-purple-400'}`}>
                  {videoForm.videoType === 'gallery' ? 'Gallery' : videoForm.videoType === 'speaker' ? 'Speaker' : videoForm.videoType}
                </span>
              </h3>
              <button onClick={() => setShowVideoModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Title *</label>
                <input value={videoForm.title} onChange={e => setVideoForm(v => ({ ...v, title: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none"
                  placeholder="e.g. Day 1 - Introduction to Swar Yoga" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Description</label>
                <textarea value={videoForm.description} onChange={e => setVideoForm(v => ({ ...v, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none resize-none"
                  placeholder="What this video covers..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Video Type *</label>
                <div className="flex gap-2">
                  {(['gallery', 'speaker', 'screen', 'other'] as const).map(t => (
                    <button key={t} onClick={() => setVideoForm(v => ({ ...v, videoType: t }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition ${videoForm.videoType === t
                        ? t === 'gallery' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : t === 'speaker' ? 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                          : t === 'screen' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                          : 'bg-gray-700 border-gray-600 text-gray-300'
                        : 'bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-600'}`}>
                      {t === 'gallery' ? 'Gallery' : t === 'speaker' ? 'Speaker' : t === 'screen' ? 'Screen' : 'Other'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Day / Session #</label>
                  <input type="number" min={1} value={videoForm.sessionNumber}
                    onChange={e => setVideoForm(v => ({ ...v, sessionNumber: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:ring-2 focus:ring-yellow-500/40 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Session Title</label>
                  <input value={videoForm.sessionTitle} onChange={e => setVideoForm(v => ({ ...v, sessionTitle: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none"
                    placeholder="Introduction" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Video URL / Embed URL *</label>
                <input value={videoForm.videoUrl} onChange={e => setVideoForm(v => ({ ...v, videoUrl: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none font-mono text-xs"
                  placeholder="https://iframe.mediadelivery.net/embed/..." />
              </div>
              {videoForm.bunnyVideoId && (
                <div className="bg-orange-900/20 border border-orange-800/40 rounded-lg px-3 py-2 text-xs text-orange-300 flex items-center gap-2">
                  <Film className="w-4 h-4" /> Bunny Video: <span className="font-mono">{videoForm.bunnyVideoId}</span>
                </div>
              )}
              {/* Show short URL for existing videos */}
              {editingVideo?.shortCode && (
                <div className="bg-yellow-900/20 border border-yellow-800/40 rounded-lg px-3 py-2 text-xs text-yellow-300 flex items-center gap-2">
                  <Link2 className="w-4 h-4" /> Short URL:
                  <span className="font-mono text-yellow-400">{SITE_DOMAIN}/{editingVideo.shortCode}</span>
                  <button onClick={() => copyLink(`https://${SITE_DOMAIN}/${editingVideo.shortCode}`)} className="text-yellow-500 hover:text-yellow-300">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Thumbnail</label>
                {videoForm.thumbnailUrl ? (
                  <div className="flex items-center gap-3 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2">
                    <img src={videoForm.thumbnailUrl} alt="Thumbnail" className="w-16 h-10 object-cover rounded border border-gray-600" />
                    <span className="text-xs text-green-400 flex-1 truncate">Uploaded</span>
                    <button type="button" onClick={() => setVideoForm(v => ({ ...v, thumbnailUrl: '' }))}
                      className="text-gray-500 hover:text-red-400 transition"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <label className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-lg px-3 py-4 cursor-pointer transition
                    ${thumbnailUploading ? 'border-yellow-500/50 bg-yellow-900/10' : 'border-gray-700 hover:border-yellow-500/40 hover:bg-gray-800/60'}`}>
                    {thumbnailUploading ? (
                      <><Loader className="w-4 h-4 animate-spin text-yellow-400" /><span className="text-xs text-yellow-400">Uploading...</span></>
                    ) : (
                      <><Upload className="w-4 h-4 text-gray-500" /><span className="text-xs text-gray-500">Click to upload thumbnail image</span></>
                    )}
                    <input type="file" accept="image/*" className="hidden" disabled={thumbnailUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) { setError('Thumbnail must be under 2MB'); return; }
                        setThumbnailUploading(true);
                        try {
                          const fd = new FormData();
                          fd.append('file', file);
                          const res = await fetch('/api/admin/upload', {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}` },
                            body: fd,
                          });
                          const data = await res.json();
                          if (!data.success) throw new Error(data.error);
                          setVideoForm(v => ({ ...v, thumbnailUrl: data.data.url }));
                        } catch (err: any) { setError(`Upload failed: ${err.message}`); }
                        setThumbnailUploading(false);
                        e.target.value = ''; // reset input
                      }} />
                  </label>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Tags (comma-separated)</label>
                <input value={videoForm.tags} onChange={e => setVideoForm(v => ({ ...v, tags: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-yellow-500/40 outline-none"
                  placeholder="swar-yoga, breathwork, day-1" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-800 flex justify-end gap-3">
              <button onClick={() => setShowVideoModal(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">Cancel</button>
              <button onClick={saveVideo} disabled={saving || !videoForm.title.trim() || !(videoForm.videoUrl || videoForm.bunnyEmbedUrl)}
                className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-gray-900 font-semibold rounded-lg text-sm transition flex items-center gap-2">
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Saving...' : editingVideo ? 'Update' : 'Add Video'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bunny Stream Browser Modal */}
      {showBunnyBrowser && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-orange-500" />
                Browse Bunny Stream Videos
                <span className={`text-xs px-2 py-0.5 rounded-full ml-1 ${bunnyTargetType === 'gallery' ? 'bg-blue-900/40 text-blue-400 border border-blue-800' : 'bg-purple-900/40 text-purple-400 border border-purple-800'}`}>
                  Adding as {bunnyTargetType === 'gallery' ? 'Gallery' : 'Speaker'} View
                </span>
                {selectedBunnyVideos.size > 0 && (
                  <span className="text-xs bg-orange-900/40 text-orange-400 px-2 py-0.5 rounded-full ml-2">
                    {selectedBunnyVideos.size} selected
                  </span>
                )}
              </h3>
              <button onClick={() => setShowBunnyBrowser(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="px-6 py-3 border-b border-gray-800/50 flex gap-3 flex-shrink-0">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input value={bunnySearch} onChange={e => setBunnySearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchBunnyVideos()}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-orange-500/40 outline-none"
                  placeholder="Search Bunny Stream videos..." />
              </div>
              <button onClick={fetchBunnyVideos}
                className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition">
                <Search className="w-4 h-4" /> Search
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {bunnyLoading ? (
                <div className="p-10 text-center text-gray-500">
                  <Loader className="w-8 h-8 animate-spin mx-auto mb-3" />Loading Bunny Stream videos...
                </div>
              ) : bunnyVideos.length === 0 ? (
                <div className="p-10 text-center text-gray-600">
                  <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No videos found in Bunny Stream library</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {bunnyVideos.map(bv => {
                    const isSelected = selectedBunnyVideos.has(bv.videoId);
                    return (
                      <div key={bv.videoId} onClick={() => toggleBunnySelect(bv.videoId)}
                        className={`bg-gray-800/60 border rounded-xl overflow-hidden cursor-pointer transition group ${isSelected
                          ? 'border-orange-500 ring-2 ring-orange-500/30'
                          : 'border-gray-700/50 hover:border-gray-600'}`}>
                        <div className="aspect-video bg-gray-800 relative flex items-center justify-center">
                          {bv.thumbnailUrl ? (
                            <img src={bv.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Play className="w-8 h-8 text-gray-600" />
                          )}
                          <div className={`absolute top-2 left-2 ${isSelected ? 'text-orange-500' : 'text-white/50 opacity-0 group-hover:opacity-100'} transition`}>
                            {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                          </div>
                          {bv.duration > 0 && (
                            <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                              {formatDuration(bv.duration)}
                            </span>
                          )}
                          {bv.status !== 'ready' && (
                            <span className="absolute top-2 right-2 bg-yellow-500/80 text-gray-900 text-[10px] px-1.5 py-0.5 rounded font-semibold">
                              {bv.status}
                            </span>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-medium truncate text-white">{bv.title}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                            <span>{formatSize(bv.size)}</span>
                            <span>{bv.views} views</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-gray-500">{bunnyVideos.length} videos in library</span>
              <div className="flex gap-3">
                <button onClick={() => setShowBunnyBrowser(false)}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">Cancel</button>
                <button onClick={addBunnyVideosToPlaylist} disabled={saving || selectedBunnyVideos.size === 0}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition flex items-center gap-2">
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add {selectedBunnyVideos.size} as {bunnyTargetType === 'gallery' ? 'Gallery' : 'Speaker'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setShowPreviewModal(null)}>
          <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setShowPreviewModal(null)} className="text-gray-400 hover:text-white p-2"><X className="w-6 h-6" /></button>
            </div>
            <div className="aspect-video bg-black rounded-xl overflow-hidden">
              <iframe
                src={showPreviewModal}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
