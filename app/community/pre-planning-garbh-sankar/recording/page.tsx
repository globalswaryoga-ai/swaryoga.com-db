'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Play, Calendar, Lock, Users, Video, Heart, MessageCircle, Send, X, Maximize, Minimize } from 'lucide-react';

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
  recordedAt?: string;
  createdAt?: string;
  isPublic?: boolean;
  views?: number;
  likes?: string[];
  comments?: RecordingComment[];
}

export default function PrePlanningGarbhSankarRecordingsPage() {
  const router = useRouter();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
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

  const toggleFullscreen = useCallback(() => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (hasAccess) {
      fetchRecordings();
    }
  }, [hasAccess]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      const communityUserStr = localStorage.getItem('community_user');
      let userEmail = '';

      if (communityUserStr) {
        try {
          const communityUser = JSON.parse(communityUserStr);
          setUser(communityUser);
          userEmail = communityUser.email || '';
        } catch {}
      }

      if (token) {
        const profileRes = await fetch('/api/auth/profile', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.data) {
            setUser(profileData.data);
            userEmail = profileData.data.email || userEmail;
          }
        }
      }

      if (userEmail || user?.mobile) {
        const identifier = userEmail ? `email=${encodeURIComponent(userEmail)}` : `mobile=${encodeURIComponent(user?.mobile)}`;
        const memberRes = await fetch(`/api/community/membership/check?${identifier}`);
        const memberData = await memberRes.json();

        if (memberData.success && memberData.memberships.includes('pre-planning-garbh-sankar')) {
          setHasAccess(true);
        } else {
          setError('You do not have access to Pre Planning Garbh Sankar recordings. Please join the community first.');
        }
      } else {
        router.push('/signin');
      }
    } catch (err) {
      console.error('Auth check error:', err);
      setError('Failed to verify access. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/community/recordings');
      const data = await res.json();

      if (data.success) {
        const filteredRecordings = data.recordings?.filter((r: Recording) => r.communityId === 'pre-planning-garbh-sankar') || [];
        setRecordings(filteredRecordings);
      } else {
        setError(data.error || 'Failed to load recordings');
      }
    } catch {
      setError('Failed to load recordings');
    } finally {
      setLoading(false);
    }
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
        setShowCommentModal(false);
      }
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePlayVideo = async (recording: Recording) => {
    setPlayingVideo(recording);
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

  const folders: Record<string, Record<string, Recording[]>> = {};
  recordings.forEach(rec => {
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

  if (!hasAccess && error) {
    return (
      <div className="min-h-screen bg-white">
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
                <h1 className="text-2xl font-bold text-slate-900">Pre Planning Garbh Sankar Recordings</h1>
                <p className="text-slate-500 text-sm">Pre-conception workshops & guidance</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center">
            <Lock className="w-20 h-20 mx-auto text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Link
              href="/community"
              className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Back to Community
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
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
              <h1 className="text-2xl font-bold text-slate-900">Pre Planning Garbh Sankar Recordings</h1>
              <p className="text-slate-500 text-sm">Pre-conception workshops & guidance</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        )}

        {error && !hasAccess && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
            {error}
          </div>
        )}

        {!loading && recordings.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎬</div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Recordings Yet</h2>
            <p className="text-slate-500">
              Pre Planning Garbh Sankar workshop recordings will appear here soon.
            </p>
          </div>
        )}

        {!loading && recordings.length > 0 && (
          <>
            {folderNames.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {folderNames.map(folder => (
                  <button
                    key={folder}
                    onClick={() => { setSelectedFolder(folder); setSelectedPlaylist(null); }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      currentFolder === folder
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {folder}
                  </button>
                ))}
              </div>
            )}

            {playlistNames.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {playlistNames.map(playlist => (
                  <button
                    key={playlist}
                    onClick={() => setSelectedPlaylist(playlist)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedPlaylist === playlist
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    {playlist} ({(playlists[playlist] || []).length})
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(selectedPlaylist
                ? playlists[selectedPlaylist] || []
                : Object.values(playlists).flat()
              ).map(recording => (
                <div
                  key={recording._id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="aspect-video bg-slate-200 relative group cursor-pointer" onClick={() => handlePlayVideo(recording)}>
                    {recording.thumbnailUrl ? (
                      <img
                        src={recording.thumbnailUrl}
                        alt={recording.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-300 to-slate-400">
                        <Video className="w-12 h-12 text-white/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-12 h-12 text-white fill-white" />
                    </div>
                    {recording.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(recording.duration)}
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 line-clamp-2 mb-2">
                      {recording.title?.split(' > ').pop() || recording.title}
                    </h3>

                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                      {recording.recordedAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(recording.recordedAt)}
                        </div>
                      )}
                      {recording.views !== undefined && (
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {recording.views} views
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                      <button
                        onClick={() => handleLike(recording._id)}
                        disabled={likingVideoId === recording._id}
                        className="flex items-center gap-1 text-slate-600 hover:text-emerald-600 transition-colors flex-1"
                      >
                        <Heart
                          className="w-4 h-4"
                          fill={recording.likes?.includes(getUserId()) ? 'currentColor' : 'none'}
                        />
                        <span className="text-xs">{recording.likes?.length || 0}</span>
                      </button>
                      <button
                        onClick={() => { setCommentVideo(recording); setShowCommentModal(true); }}
                        className="flex items-center gap-1 text-slate-600 hover:text-emerald-600 transition-colors flex-1"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">{recording.comments?.length || 0}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

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
                    <iframe
                      src={`/api/community/videos/embed?v=${playingVideo._id}&token=${typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''}`}
                      className={isFullscreen ? 'w-full h-full' : 'absolute inset-0 w-full h-full'}
                      style={{ border: 'none' }}
                      allow="accelerometer; autoplay; encrypted-media; gyroscope; fullscreen"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                      sandbox="allow-scripts allow-same-origin allow-presentation"
                    />
                    <button
                      onClick={toggleFullscreen}
                      className="absolute bottom-[6px] right-[6px] z-20 w-[42px] h-[34px] flex items-center justify-center bg-black/90 hover:bg-white/20 text-white rounded-md transition-colors border border-white/10"
                      title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                      {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                    </button>
                  </div>
                ) : playingVideo.videoUrl ? (
                  <video
                    src={playingVideo.videoUrl}
                    controls
                    autoPlay
                    className="w-full aspect-video"
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                  />
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

        {showCommentModal && commentVideo && (
          <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Add Comment</h3>
                <button
                  onClick={() => setShowCommentModal(false)}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <p className="text-sm text-slate-600 mb-4">
                {commentVideo.title?.split(' > ').pop() || commentVideo.title}
              </p>

              <div className="mb-4">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCommentModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComment}
                  disabled={submittingComment || !commentText.trim()}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submittingComment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
