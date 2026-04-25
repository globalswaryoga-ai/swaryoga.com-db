'use client';

import React, { useState, useEffect, useRef, useCallback , Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Play, Calendar, Lock, Users, Video, Heart, MessageCircle, Send, X, Maximize, Minimize } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface RecordingComment {
  userId: string;
  userName?: string;
  text: string;
  createdAt?: string;
}

interface Recording {
  _id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  videoSource?: string;
  youtubeVideoId?: string;
  duration?: number;
  recordingType?: string;
  zoomMeetingId?: string;
  recordedAt?: string;
  createdAt?: string;
  communityId?: string;
  communityName?: string;
  isPublic?: boolean;
  views?: number;
  likes?: string[];
  comments?: RecordingComment[];
}

interface Community {
  _id: string;
  name: string;
  type: string;
  recordingCount?: number;
}

const GRADIENT_COLORS = [
  'from-purple-500 to-pink-500',
  'from-blue-500 to-cyan-500',
  'from-orange-500 to-red-500',
  'from-emerald-500 to-teal-500',
  'from-indigo-500 to-purple-500',
  'from-rose-500 to-orange-500',
];

function RecordingsContent() {
  const searchParams = useSearchParams();
  const communityIdParam = searchParams.get('communityId');

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string>(communityIdParam || 'all');
  const [user, setUser] = useState<any>(null);
  const [playingVideo, setPlayingVideo] = useState<Recording | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentVideo, setCommentVideo] = useState<Recording | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likingVideoId, setLikingVideoId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Toggle fullscreen on the container div so overlays stay visible
  const toggleFullscreen = useCallback(() => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    checkAuth();
    fetchRecordings();
    fetchCommunities();
  }, []);

  const checkAuth = () => {
    const communityUserStr = localStorage.getItem('community_user');
    if (communityUserStr) {
      try {
        setUser(JSON.parse(communityUserStr));
      } catch {}
    }

    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.data) setUser(data.data);
        })
        .catch(() => {});
    }
  };

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/community/recordings');
      const data = await res.json();

      if (data.success) {
        setRecordings(data.recordings || []);
      } else {
        setError(data.error || 'Failed to load recordings');
      }
    } catch {
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunities = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/community/list', { headers });
      const data = await res.json();

      if (data.success) {
        setCommunities(data.communities || []);
      }
    } catch {}
  };

  const getUserId = (): string => {
    if (user?._id) return user._id;
    if (user?.id) return user.id;
    if (user?.mobile) return user.mobile;
    if (user?.email) return user.email;
    return 'anonymous';
  };

  const getUserName = (): string => {
    if (user?.name) return user.name;
    if (user?.firstName) return `${user.firstName} ${user.lastName || ''}`.trim();
    return 'Member';
  };

  const handleLike = async (videoId: string) => {
    if (!user) return;
    setLikingVideoId(videoId);
    try {
      const res = await fetch('/api/community/recordings/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, action: 'like', userId: getUserId() }),
      });
      const data = await res.json();
      if (data.success) {
        setRecordings(prev => prev.map(r =>
          r._id === videoId ? { ...r, likes: data.likes } : r
        ));
      }
    } catch (err) {
      console.error('Like error:', err);
    } finally {
      setLikingVideoId(null);
    }
  };

  const handleComment = async () => {
    if (!user || !commentVideo || !commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch('/api/community/recordings/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: commentVideo._id,
          action: 'comment',
          userId: getUserId(),
          userName: getUserName(),
          text: commentText.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRecordings(prev => prev.map(r =>
          r._id === commentVideo._id ? { ...r, comments: data.comments } : r
        ));
        setCommentVideo(prev => prev ? { ...prev, comments: data.comments } : null);
        setCommentText('');
      }
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePlayVideo = async (recording: Recording) => {
    setPlayingVideo(recording);
    // Increment view count
    try {
      await fetch('/api/community/recordings/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: recording._id, action: 'view' }),
      });
      setRecordings(prev => prev.map(r =>
        r._id === recording._id ? { ...r, views: (r.views || 0) + 1 } : r
      ));
    } catch {}
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredRecordings = selectedCommunity === 'all'
    ? recordings
    : recordings.filter(r => r.communityId === selectedCommunity);

  // Parse recordings into folder > playlist structure (same pattern as CRM)
  const folders: Record<string, Record<string, Recording[]>> = {};
  filteredRecordings.forEach(rec => {
    const parts = rec.title?.split(' > ') || [];
    const folder = parts[0] || 'General';
    const playlist = parts.length > 1 ? parts[1] : 'Default Batch';

    if (!folders[folder]) folders[folder] = {};
    if (!folders[folder][playlist]) folders[folder][playlist] = [];
    folders[folder][playlist].push(rec);
  });

  const folderNames = Object.keys(folders);
  const currentFolder = selectedFolder || folderNames[0] || '';
  const playlists = folders[currentFolder] || {};
  const playlistNames = Object.keys(playlists);
  const totalVideos = Object.values(playlists).flat().length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/community"
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Community Recordings</h1>
              <p className="text-slate-500 text-sm">Workshop sessions & classes</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Community Filter */}
        {communities.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => { setSelectedCommunity('all'); setSelectedFolder(null); setSelectedPlaylist(null); }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCommunity === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Recordings
            </button>
            {communities.filter(c => c.recordingCount && c.recordingCount > 0).map(community => (
              <button
                key={community._id}
                onClick={() => { setSelectedCommunity(community._id); setSelectedFolder(null); setSelectedPlaylist(null); }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCommunity === community._id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {community.name} ({community.recordingCount})
              </button>
            ))}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {/* No Recordings */}
        {!loading && !error && filteredRecordings.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Recordings Yet</h2>
            <p className="text-slate-500">
              Workshop recordings will appear here after your sessions.
            </p>
          </div>
        )}

        {/* Video Player Modal */}
        {playingVideo && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
            <div className="relative w-full max-w-4xl">
              <button
                onClick={() => setPlayingVideo(null)}
                className="absolute -top-12 right-0 text-white hover:text-emerald-400 transition-colors text-lg"
              >
                ✕ Close
              </button>
              <div className="bg-black rounded-xl overflow-hidden" onContextMenu={(e) => e.preventDefault()}>
                {playingVideo.videoSource === 'youtube' && playingVideo._id ? (
                  <div
                    ref={videoContainerRef}
                    className={'relative w-full overflow-hidden bg-black' + (isFullscreen ? ' flex items-center justify-center' : '')}
                    style={isFullscreen ? { width: '100vw', height: '100vh' } : { paddingBottom: '56.25%' }}
                  >
                    {/* Secure video proxy — no YouTube reference reaches the client */}
                    <iframe
                      src={`/api/community/videos/embed?v=${playingVideo._id}&token=${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`}
                      className={isFullscreen ? 'w-full h-full' : 'absolute inset-0 w-full h-full'}
                      style={{ border: 'none' }}
                      allow="accelerometer; autoplay; encrypted-media; gyroscope; fullscreen"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                    />
                    {/* Outer fullscreen button (backup) */}
                    <button
                      onClick={toggleFullscreen}
                      className="absolute bottom-[6px] right-[6px] z-20 w-[42px] h-[34px] flex items-center justify-center bg-black/90 hover:bg-white/20 text-white rounded-md transition-colors border border-white/10"
                      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                      {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                    </button>
                  </div>
                ) : playingVideo.videoUrl ? (
                  <div className="relative w-full aspect-video bg-black group">
                    <video
                      ref={videoRef}
                      src={playingVideo.videoUrl}
                      autoPlay
                      playsInline
                      crossOrigin="anonymous"
                      className="w-full h-full"
                      controls
                      controlsList="nodownload noremoteplayback"
                      disablePictureInPicture
                      onContextMenu={(e) => e.preventDefault()}
                    />

                    {/* Fullscreen Button Overlay */}
                    <button
                      onClick={toggleFullscreen}
                      className="absolute bottom-12 right-4 z-20 bg-black/70 hover:bg-white/20 text-white p-2 rounded transition"
                      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                      {isFullscreen ? '⛔ Exit' : '⛶ Fullscreen'}
                    </button>
                  </div>
                ) : (
                  <div className="w-full aspect-video flex items-center justify-center text-white">
                    <p>Video unavailable</p>
                  </div>
                )}
                <div className="p-4 bg-gray-900">
                  <h3 className="text-white font-semibold">
                    {playingVideo.title?.split(' > ').pop() || playingVideo.title}
                  </h3>
                  {playingVideo.description && (
                    <p className="text-gray-400 text-sm mt-1">{playingVideo.description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Folder / Playlist Content */}
        {!loading && !error && folderNames.length > 0 && (
          <div>
            {/* Folder Tabs (if more than one folder) */}
            {folderNames.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {folderNames.map(folder => (
                  <button
                    key={folder}
                    onClick={() => { setSelectedFolder(folder); setSelectedPlaylist(null); }}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                      currentFolder === folder
                        ? 'bg-slate-900 text-white shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {folder}
                  </button>
                ))}
              </div>
            )}

            {/* Current Folder Header */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 mb-8 border border-emerald-200">
              <div className="flex items-center gap-3 mb-1">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold uppercase tracking-wider">
                  Workshop
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">{currentFolder}</h2>
              <p className="text-slate-500">
                {playlistNames.length} {playlistNames.length === 1 ? 'Batch' : 'Batches'} &bull; {totalVideos} {totalVideos === 1 ? 'Video' : 'Videos'}
              </p>
            </div>

            {/* Batches / Playlists Section */}
            <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-3">
              <span className="w-1 h-5 bg-emerald-500 rounded-full"></span>
              Batches / Playlists
            </h3>

            {!selectedPlaylist ? (
              /* Playlist Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {playlistNames.map((playlistName, index) => {
                  const playlistVideos = playlists[playlistName];
                  const firstVideo = playlistVideos[0];

                  return (
                    <div
                      key={playlistName}
                      className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-emerald-400 transition-all hover:shadow-xl cursor-pointer"
                      onClick={() => setSelectedPlaylist(playlistName)}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-video relative overflow-hidden">
                        {firstVideo?.thumbnailUrl ? (
                          <img
                            src={firstVideo.thumbnailUrl}
                            alt={playlistName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className={`w-full h-full bg-gradient-to-br ${GRADIENT_COLORS[index % GRADIENT_COLORS.length]} flex items-center justify-center`}>
                            <Video className="w-12 h-12 text-white/50" />
                          </div>
                        )}

                        {/* Overlay with play button */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                            <ArrowRight className="w-7 h-7 text-slate-900 ml-0.5" />
                          </div>
                        </div>

                        {/* Video count badge */}
                        <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-lg text-white text-xs font-bold">
                          {playlistVideos.length} videos
                        </div>
                      </div>

                      {/* Card content */}
                      <div className="p-5">
                        <h4 className="font-bold text-slate-900 text-lg mb-2 group-hover:text-emerald-600 transition-colors line-clamp-2">
                          {playlistName}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-slate-400 mb-3">
                          <span>{playlistVideos.reduce((s: number, v: Recording) => s + (v.views || 0), 0)} views</span>
                          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {playlistVideos.reduce((s: number, v: Recording) => s + (Array.isArray(v.likes) ? v.likes.length : 0), 0)}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {playlistVideos.reduce((s: number, v: Recording) => s + (Array.isArray(v.comments) ? v.comments.length : 0), 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-sm">
                            {playlistVideos.length} {playlistVideos.length === 1 ? 'recording' : 'recordings'}
                          </span>
                          <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold group-hover:bg-emerald-600 group-hover:text-white transition-all flex items-center gap-2">
                            Play Now <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Video List View when a playlist/batch is selected */
              <div>
                {/* Back button */}
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className="mb-6 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center gap-2 border border-slate-200"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Batches
                </button>

                {/* Playlist header */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 mb-8 border border-emerald-200">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{selectedPlaylist}</h3>
                  <p className="text-slate-500">
                    {playlists[selectedPlaylist]?.length || 0} videos in this batch
                  </p>
                </div>

                {/* Videos grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(playlists[selectedPlaylist] || [])
                    .sort((a, b) => {
                      const numA = parseInt(a.title?.match(/Video (\d+)/i)?.[1] || '0');
                      const numB = parseInt(b.title?.match(/Video (\d+)/i)?.[1] || '0');
                      return numA - numB;
                    })
                    .map((recording, index) => {
                      const canPlay = recording.isPublic || !!user;
                      return (
                        <div
                          key={recording._id}
                          className="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-emerald-400 transition-all hover:shadow-lg"
                        >
                          {/* Video thumbnail */}
                          <div
                            className="aspect-video relative overflow-hidden cursor-pointer"
                            onClick={() => canPlay ? handlePlayVideo(recording) : null}
                          >
                            {recording.thumbnailUrl ? (
                              <img
                                src={recording.thumbnailUrl}
                                alt={recording.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                <Video className="w-10 h-10 text-slate-400" />
                              </div>
                            )}

                            {/* Play overlay */}
                            {canPlay ? (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform">
                                  <Play className="w-6 h-6 text-white ml-0.5" />
                                </div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                <div className="text-center text-white">
                                  <Lock className="w-8 h-8 mx-auto mb-2" />
                                  <p className="text-sm">Members Only</p>
                                </div>
                              </div>
                            )}

                            {/* Video number badge */}
                            <div className="absolute top-3 left-3 w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg">
                              {index + 1}
                            </div>

                            {/* Duration */}
                            {recording.duration && (
                              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 rounded-lg text-white text-xs font-bold">
                                {formatDuration(recording.duration)}
                              </div>
                            )}
                          </div>

                          {/* Video info */}
                          <div className="p-4">
                            <h4 className="font-bold text-slate-900 mb-1 line-clamp-2">
                              {recording.title?.split(' > ').pop() || `Video ${index + 1}`}
                            </h4>
                            {recording.description && (
                              <p className="text-slate-500 text-sm mb-3 line-clamp-2">{recording.description}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-sm text-slate-400">
                                {recording.recordedAt && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {formatDate(recording.recordedAt)}
                                  </span>
                                )}
                                <span>{recording.views || 0} views</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleLike(recording._id); }}
                                  disabled={!user || likingVideoId === recording._id}
                                  className={`p-2 rounded-lg transition-all flex items-center gap-1 text-sm ${
                                    user && Array.isArray(recording.likes) && recording.likes.includes(getUserId())
                                      ? 'text-red-500'
                                      : 'text-slate-400 hover:text-red-500'
                                  } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  title={user ? 'Like' : 'Login to like'}
                                >
                                  <Heart size={16} className={Array.isArray(recording.likes) && recording.likes.includes(getUserId()) ? 'fill-red-500' : ''} />
                                  <span className="text-xs">{Array.isArray(recording.likes) ? recording.likes.length : 0}</span>
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCommentVideo(recording); setShowCommentModal(true); }}
                                  className="p-2 text-slate-400 hover:text-emerald-500 rounded-lg transition-all flex items-center gap-1 text-sm"
                                  title="Comments"
                                >
                                  <MessageCircle size={16} />
                                  <span className="text-xs">{Array.isArray(recording.comments) ? recording.comments.length : 0}</span>
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
          </div>
        )}

        {/* Join CTA for non-members */}
        {!user && (
          <div className="mt-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-2">Join Our Community</h3>
            <p className="mb-4 opacity-90">Get access to all workshop recordings and exclusive content</p>
            <Link
              href="/community"
              className="inline-block px-6 py-3 bg-white text-emerald-700 font-semibold rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Join Now →
            </Link>
          </div>
        )}
      </main>

      {/* Comment Modal */}
      {showCommentModal && commentVideo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Comments</h3>
                <p className="text-xs text-slate-500">{commentVideo.title?.split(' > ').pop()}</p>
              </div>
              <button
                onClick={() => { setShowCommentModal(false); setCommentVideo(null); setCommentText(''); }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {Array.isArray(commentVideo.comments) && commentVideo.comments.length > 0 ? (
                commentVideo.comments.map((comment, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(comment.userName || comment.userId || 'M').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-slate-800">{comment.userName || 'Member'}</span>
                        <span className="text-[10px] text-slate-400">
                          {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">{comment.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <MessageCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-400">No comments yet. Be the first!</p>
                </div>
              )}
            </div>

            {/* Comment input */}
            {user ? (
              <div className="p-4 border-t border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) handleComment(); }}
                    placeholder="Write a comment..."
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentText.trim() || submittingComment}
                    className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-slate-100 text-center shrink-0">
                <p className="text-sm text-slate-500">
                  <Link href="/community" className="text-emerald-600 font-semibold hover:underline">Join the community</Link> to comment
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


export default function RecordingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div></div>}>
      <RecordingsContent />
    </Suspense>
  );
}
