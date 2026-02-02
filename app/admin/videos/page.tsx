'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  Plus, Trash2, Edit, Play, Pause, Upload, Loader, ChevronDown, ChevronRight,
  Video, Film, Calendar, Clock, Eye, FolderOpen, X, Check, Search, Filter,
  MoreVertical, ArrowLeft, ListVideo, Grid, PlayCircle, Settings
} from 'lucide-react';

// Types
interface VideoPlaylist {
  _id: string;
  name: string;
  description: string;
  thumbnailUrl?: string;
  type: 'batch' | 'post';
  batchNumber?: number;
  workshopSlug?: string;
  workshopName?: string;
  year?: number;
  month?: number;
  communityId?: string;
  isPublic: boolean;
  status: string;
  sortOrder: number;
  videoCount: number;
  totalDuration: number;
  totalViews: number;
  createdAt: string;
}

interface PlaylistVideo {
  _id: string;
  playlistId: string;
  title: string;
  description: string;
  videoUrl: string;
  s3Key?: string;
  thumbnailUrl?: string;
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

interface Stats {
  totalBatchPlaylists: number;
  totalPostPlaylists: number;
  totalVideos: number;
}

// Months for dropdown
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Workshop options
const WORKSHOPS = [
  { slug: 'swar-yoga', name: 'Swar Yoga' },
  { slug: 'aham-bramhasmi', name: 'Aham Bramhasmi' },
  { slug: 'astavakra', name: 'Astavakra' },
  { slug: 'shivoham', name: 'Shivoham' },
  { slug: 'i-am-fit', name: 'I am Fit' },
  { slug: 'yogasana', name: 'Yogasana' },
  { slug: 'amrut-bhoj', name: 'Amrut Bhoj' },
];

// Format duration
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

// Format file size
function formatFileSize(bytes?: number): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function AdminVideosPage() {
  const router = useRouter();
  const token = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<'batch' | 'post'>('batch');

  // Data state
  const [playlists, setPlaylists] = useState<VideoPlaylist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<VideoPlaylist | null>(null);
  const [playlistVideos, setPlaylistVideos] = useState<PlaylistVideo[]>([]);
  const [stats, setStats] = useState<Stats>({ totalBatchPlaylists: 0, totalPostPlaylists: 0, totalVideos: 0 });

  // UI state
  const [loading, setLoading] = useState(true);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);

  // Modal state
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<VideoPlaylist | null>(null);
  const [editingVideo, setEditingVideo] = useState<PlaylistVideo | null>(null);

  // Form state for playlist
  const [playlistForm, setPlaylistForm] = useState({
    name: '',
    description: '',
    batchNumber: 1,
    workshopSlug: 'swar-yoga',
    workshopName: 'Swar Yoga',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    isPublic: false,
  });

  // Form state for video
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    duration: 0,
    sessionNumber: 1,
    sessionTitle: '',
    tags: '',
  });

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Saving state
  const [saving, setSaving] = useState(false);

  // Fetch playlists
  const fetchPlaylists = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/videos/playlists?type=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPlaylists(data.data.playlists || []);
        setStats(data.data.stats || { totalBatchPlaylists: 0, totalPostPlaylists: 0, totalVideos: 0 });
      }
    } catch (err) {
      console.error('Error fetching playlists:', err);
    } finally {
      setLoading(false);
    }
  }, [token, activeTab]);

  // Fetch videos for a playlist
  const fetchPlaylistVideos = useCallback(async (playlistId: string) => {
    if (!token) return;
    setLoadingVideos(true);
    try {
      const res = await fetch(`/api/admin/videos/playlist-videos?playlistId=${playlistId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPlaylistVideos(data.data.videos || []);
        setSelectedPlaylist(data.data.playlist || null);
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
    } finally {
      setLoadingVideos(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists]);

  // Toggle playlist expansion
  const togglePlaylist = async (playlist: VideoPlaylist) => {
    if (expandedPlaylist === playlist._id) {
      setExpandedPlaylist(null);
      setPlaylistVideos([]);
      setSelectedPlaylist(null);
    } else {
      setExpandedPlaylist(playlist._id);
      await fetchPlaylistVideos(playlist._id);
    }
  };

  // Open create playlist modal
  const openCreatePlaylistModal = () => {
    setEditingPlaylist(null);
    setPlaylistForm({
      name: activeTab === 'batch' ? `Batch ${playlists.length + 1}` : `${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()} Updates`,
      description: '',
      batchNumber: playlists.length + 1,
      workshopSlug: 'swar-yoga',
      workshopName: 'Swar Yoga',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      isPublic: false,
    });
    setShowPlaylistModal(true);
  };

  // Open edit playlist modal
  const openEditPlaylistModal = (playlist: VideoPlaylist) => {
    setEditingPlaylist(playlist);
    setPlaylistForm({
      name: playlist.name,
      description: playlist.description || '',
      batchNumber: playlist.batchNumber || 1,
      workshopSlug: playlist.workshopSlug || 'swar-yoga',
      workshopName: playlist.workshopName || 'Swar Yoga',
      year: playlist.year || new Date().getFullYear(),
      month: playlist.month || new Date().getMonth() + 1,
      isPublic: playlist.isPublic,
    });
    setShowPlaylistModal(true);
  };

  // Save playlist
  const savePlaylist = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const method = editingPlaylist ? 'PUT' : 'POST';
      const body = editingPlaylist
        ? { playlistId: editingPlaylist._id, ...playlistForm }
        : {
            ...playlistForm,
            type: activeTab,
          };

      const res = await fetch('/api/admin/videos/playlists', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setShowPlaylistModal(false);
        fetchPlaylists();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error saving playlist: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete playlist
  const deletePlaylist = async (playlistId: string) => {
    if (!confirm('Are you sure you want to delete this playlist? All videos will be archived.')) return;
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/videos/playlists?playlistId=${playlistId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        fetchPlaylists();
        if (expandedPlaylist === playlistId) {
          setExpandedPlaylist(null);
          setPlaylistVideos([]);
        }
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error deleting playlist: ' + err.message);
    }
  };

  // Open add video modal
  const openAddVideoModal = (playlist: VideoPlaylist) => {
    setSelectedPlaylist(playlist);
    setEditingVideo(null);
    setVideoForm({
      title: '',
      description: '',
      videoUrl: '',
      thumbnailUrl: '',
      duration: 0,
      sessionNumber: playlistVideos.length + 1,
      sessionTitle: activeTab === 'batch' ? `Day ${playlistVideos.length + 1}` : '',
      tags: '',
    });
    setSelectedFile(null);
    setUploadProgress(0);
    setShowVideoModal(true);
  };

  // Open edit video modal
  const openEditVideoModal = (video: PlaylistVideo) => {
    setEditingVideo(video);
    setVideoForm({
      title: video.title,
      description: video.description || '',
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl || '',
      duration: video.duration || 0,
      sessionNumber: video.sessionNumber || 1,
      sessionTitle: video.sessionTitle || '',
      tags: video.tags?.join(', ') || '',
    });
    setSelectedFile(null);
    setShowVideoModal(true);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid video format. Allowed: MP4, WebM, MOV, AVI');
        return;
      }
      if (file.size > 2 * 1024 * 1024 * 1024) {
        alert('File too large. Maximum size is 2GB');
        return;
      }
      setSelectedFile(file);
      // Auto-fill title from filename
      if (!videoForm.title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setVideoForm(prev => ({ ...prev, title: nameWithoutExt }));
      }
    }
  };

  // Upload video to S3
  const uploadVideoToS3 = async (): Promise<{ videoUrl: string; s3Key: string } | null> => {
    if (!selectedFile || !selectedPlaylist || !token) return null;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Get presigned URL
      const presignRes = await fetch('/api/admin/videos/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          playlistId: selectedPlaylist._id,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignData.success) {
        throw new Error(presignData.error || 'Failed to get upload URL');
      }

      const { presignedUrl, s3Key, videoUrl } = presignData.data;

      // Upload to S3 with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', selectedFile.type);
        xhr.send(selectedFile);
      });

      return { videoUrl, s3Key };
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Upload failed: ' + err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Save video
  const saveVideo = async () => {
    if (!token || !selectedPlaylist) return;
    setSaving(true);

    try {
      let finalVideoUrl = videoForm.videoUrl;
      let finalS3Key = '';

      // Upload file if selected
      if (selectedFile) {
        const uploadResult = await uploadVideoToS3();
        if (!uploadResult) {
          setSaving(false);
          return;
        }
        finalVideoUrl = uploadResult.videoUrl;
        finalS3Key = uploadResult.s3Key;
      }

      if (!finalVideoUrl) {
        alert('Please provide a video URL or upload a file');
        setSaving(false);
        return;
      }

      const method = editingVideo ? 'PUT' : 'POST';
      const body = editingVideo
        ? {
            videoId: editingVideo._id,
            title: videoForm.title,
            description: videoForm.description,
            thumbnailUrl: videoForm.thumbnailUrl,
            duration: videoForm.duration,
            sessionNumber: videoForm.sessionNumber,
            sessionTitle: videoForm.sessionTitle,
            tags: videoForm.tags.split(',').map(t => t.trim()).filter(Boolean),
          }
        : {
            playlistId: selectedPlaylist._id,
            title: videoForm.title,
            description: videoForm.description,
            videoUrl: finalVideoUrl,
            s3Key: finalS3Key || undefined,
            thumbnailUrl: videoForm.thumbnailUrl,
            duration: videoForm.duration,
            sessionNumber: videoForm.sessionNumber,
            sessionTitle: videoForm.sessionTitle,
            tags: videoForm.tags.split(',').map(t => t.trim()).filter(Boolean),
          };

      const res = await fetch('/api/admin/videos/playlist-videos', {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        setShowVideoModal(false);
        if (expandedPlaylist) {
          await fetchPlaylistVideos(expandedPlaylist);
        }
        fetchPlaylists(); // Refresh stats
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error saving video: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete video
  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to remove this video?')) return;
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/videos/playlist-videos?videoId=${videoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        if (expandedPlaylist) {
          await fetchPlaylistVideos(expandedPlaylist);
        }
        fetchPlaylists();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err: any) {
      alert('Error deleting video: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg transition-all">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">🎬 Video Library</h1>
                <p className="text-sm text-slate-500">Manage batch videos and post videos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-500">
                <span className="font-semibold text-indigo-600">{stats.totalBatchPlaylists}</span> Batches •{' '}
                <span className="font-semibold text-emerald-600">{stats.totalPostPlaylists}</span> Post Playlists •{' '}
                <span className="font-semibold text-amber-600">{stats.totalVideos}</span> Videos
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => { setActiveTab('batch'); setExpandedPlaylist(null); setPlaylistVideos([]); }}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'batch'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ListVideo size={16} className="inline mr-2" />
              Batch Videos (Playlists)
            </button>
            <button
              onClick={() => { setActiveTab('post'); setExpandedPlaylist(null); setPlaylistVideos([]); }}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'post'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar size={16} className="inline mr-2" />
              Post Videos (Month-wise)
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-800">
            {activeTab === 'batch' ? '📚 Batch Playlists' : '📅 Monthly Post Videos'}
          </h2>
          <button
            onClick={openCreatePlaylistModal}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus size={18} />
            {activeTab === 'batch' ? 'New Batch' : 'New Month Playlist'}
          </button>
        </div>

        {/* Playlists List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : playlists.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <FolderOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">No Playlists Yet</h3>
            <p className="text-slate-400 mb-6">
              {activeTab === 'batch'
                ? 'Create batch playlists to organize workshop videos by batch number'
                : 'Create monthly playlists to organize post/update videos'}
            </p>
            <button
              onClick={openCreatePlaylistModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm"
            >
              Create First Playlist
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {playlists.map((playlist) => (
              <div key={playlist._id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Playlist Header */}
                <div
                  onClick={() => togglePlaylist(playlist)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold ${
                      activeTab === 'batch' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {activeTab === 'batch' ? playlist.batchNumber : playlist.month}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{playlist.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Video size={14} /> {playlist.videoCount} videos
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> {formatDuration(playlist.totalDuration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye size={14} /> {playlist.totalViews} views
                        </span>
                        {activeTab === 'batch' && playlist.workshopName && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                            {playlist.workshopName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); openAddVideoModal(playlist); }}
                      className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all"
                      title="Add Video"
                    >
                      <Upload size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditPlaylistModal(playlist); }}
                      className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-all"
                      title="Edit Playlist"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deletePlaylist(playlist._id); }}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                      title="Delete Playlist"
                    >
                      <Trash2 size={18} />
                    </button>
                    {expandedPlaylist === playlist._id ? (
                      <ChevronDown size={20} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={20} className="text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Videos List */}
                {expandedPlaylist === playlist._id && (
                  <div className="border-t border-slate-100 bg-slate-50/50">
                    {loadingVideos ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader className="animate-spin text-indigo-600" size={24} />
                      </div>
                    ) : playlistVideos.length === 0 ? (
                      <div className="p-8 text-center">
                        <Video size={32} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 mb-4">No videos in this playlist yet</p>
                        <button
                          onClick={() => openAddVideoModal(playlist)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm"
                        >
                          Add First Video
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {playlistVideos.map((video, index) => (
                          <div key={video._id} className="p-4 flex items-center gap-4 hover:bg-white transition-all">
                            {/* Thumbnail */}
                            <div className="relative w-32 h-20 bg-slate-200 rounded-lg overflow-hidden shrink-0">
                              {video.thumbnailUrl ? (
                                <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <PlayCircle size={24} className="text-slate-400" />
                                </div>
                              )}
                              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                                {formatDuration(video.duration)}
                              </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-800 truncate">{video.title}</h4>
                              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                                {video.sessionTitle && (
                                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                    {video.sessionTitle}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Eye size={12} /> {video.views}
                                </span>
                                {video.fileSize && (
                                  <span>{formatFileSize(video.fileSize)}</span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <a
                                href={video.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all"
                                title="Play Video"
                              >
                                <Play size={16} />
                              </a>
                              <button
                                onClick={() => openEditVideoModal(video)}
                                className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg transition-all"
                                title="Edit Video"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => deleteVideo(video._id)}
                                className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-all"
                                title="Delete Video"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Playlist Modal */}
      {showPlaylistModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingPlaylist ? 'Edit Playlist' : activeTab === 'batch' ? 'Create Batch Playlist' : 'Create Monthly Playlist'}
              </h2>
              <button onClick={() => setShowPlaylistModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Playlist Name</label>
                <input
                  type="text"
                  value={playlistForm.name}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Enter playlist name..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description (Optional)</label>
                <textarea
                  value={playlistForm.description}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>

              {activeTab === 'batch' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Batch Number</label>
                      <input
                        type="number"
                        value={playlistForm.batchNumber}
                        onChange={(e) => setPlaylistForm(prev => ({ ...prev, batchNumber: parseInt(e.target.value) || 1 }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Workshop</label>
                      <select
                        value={playlistForm.workshopSlug}
                        onChange={(e) => {
                          const workshop = WORKSHOPS.find(w => w.slug === e.target.value);
                          setPlaylistForm(prev => ({
                            ...prev,
                            workshopSlug: e.target.value,
                            workshopName: workshop?.name || '',
                          }));
                        }}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white"
                      >
                        {WORKSHOPS.map(w => (
                          <option key={w.slug} value={w.slug}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Month</label>
                    <select
                      value={playlistForm.month}
                      onChange={(e) => setPlaylistForm(prev => ({ ...prev, month: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-white"
                    >
                      {MONTHS.map((month, idx) => (
                        <option key={idx} value={idx + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Year</label>
                    <input
                      type="number"
                      value={playlistForm.year}
                      onChange={(e) => setPlaylistForm(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                      min={2020}
                      max={2030}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={playlistForm.isPublic}
                  onChange={(e) => setPlaylistForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isPublic" className="text-sm text-slate-700">Make this playlist public</label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowPlaylistModal(false)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={savePlaylist}
                disabled={saving || !playlistForm.name}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
              >
                {saving && <Loader size={16} className="animate-spin" />}
                {editingPlaylist ? 'Save Changes' : 'Create Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {showVideoModal && selectedPlaylist && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingVideo ? 'Edit Video' : 'Add Video'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">to "{selectedPlaylist.name}"</p>
              </div>
              <button onClick={() => setShowVideoModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* File Upload */}
              {!editingVideo && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Upload Video</label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-indigo-400 transition-all">
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <Video size={24} className="text-indigo-600" />
                        <div className="text-left">
                          <p className="font-medium text-slate-800">{selectedFile.name}</p>
                          <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="p-1 hover:bg-red-50 text-red-500 rounded"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-slate-600 font-medium">Click to upload video</p>
                        <p className="text-sm text-slate-400">MP4, WebM, MOV, AVI (max 2GB)</p>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="mt-3">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-500 mt-1 text-center">{uploadProgress}% uploaded</p>
                    </div>
                  )}
                </div>
              )}

              {/* Or Video URL */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  {editingVideo ? 'Video URL' : 'Or paste Video URL'}
                </label>
                <input
                  type="text"
                  value={videoForm.videoUrl}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="https://..."
                  disabled={!!selectedFile || editingVideo !== null}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Video Title *</label>
                <input
                  type="text"
                  value={videoForm.title}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="Enter video title..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea
                  value={videoForm.description}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                  rows={2}
                  placeholder="Optional description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {activeTab === 'batch' && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Session/Day Number</label>
                      <input
                        type="number"
                        value={videoForm.sessionNumber}
                        onChange={(e) => setVideoForm(prev => ({ ...prev, sessionNumber: parseInt(e.target.value) || 1 }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        min={1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Session Title</label>
                      <input
                        type="text"
                        value={videoForm.sessionTitle}
                        onChange={(e) => setVideoForm(prev => ({ ...prev, sessionTitle: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        placeholder="Day 1 - Introduction"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Duration (seconds)</label>
                  <input
                    type="number"
                    value={videoForm.duration}
                    onChange={(e) => setVideoForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    min={0}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Thumbnail URL</label>
                  <input
                    type="text"
                    value={videoForm.thumbnailUrl}
                    onChange={(e) => setVideoForm(prev => ({ ...prev, thumbnailUrl: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={videoForm.tags}
                  onChange={(e) => setVideoForm(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  placeholder="breathwork, meditation, yoga"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowVideoModal(false)}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveVideo}
                disabled={saving || uploading || !videoForm.title || (!videoForm.videoUrl && !selectedFile && !editingVideo)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"
              >
                {(saving || uploading) && <Loader size={16} className="animate-spin" />}
                {uploading ? 'Uploading...' : editingVideo ? 'Save Changes' : 'Add Video'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
