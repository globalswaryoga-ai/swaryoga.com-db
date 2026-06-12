'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Play, Lock, Video, Heart, MessageCircle, Send, X, Edit2, Check, X as XIcon } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';

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
  bunnyLibraryId?: string;
  bunnyVideoId?: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCommunity] = useState<string>(communityIdParam || 'all');
  const [user, setUser] = useState<any>(null);
  const [playingVideo, setPlayingVideo] = useState<Recording | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentVideo, setCommentVideo] = useState<Recording | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likingVideoId, setLikingVideoId] = useState<string | null>(null);
  const [showAccessPopup, setShowAccessPopup] = useState(false);
  const [editingBatch, setEditingBatch] = useState<string | null>(null);
  const [editingBatchValue, setEditingBatchValue] = useState('');
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuth();
    fetchRecordings();
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
      const url = communityIdParam
        ? `/api/community/recordings?communityId=${encodeURIComponent(communityIdParam)}`
        : '/api/community/recordings';
      const res = await fetch(url);
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

  // Show ONLY recordings for this community (never cross-community)
  const filteredRecordings = communityIdParam
    ? recordings.filter(r =>
        r.communityId === communityIdParam ||
        r.communityId === selectedCommunity
      )
    : selectedCommunity === 'all'
      ? recordings
      : recordings.filter(r => r.communityId === selectedCommunity);

  // Helper to parse date from batch name (e.g., "10 May 2026 Batch" or "10th May 2026 Batch")
  const parseDate = (batchName: string): Date => {
    try {
      // Match date patterns like "10 May 2026" or "10th May 2026"
      const match = batchName.match(/(\d+)(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/);
      if (match) {
        const [, day, month, year] = match;
        return new Date(`${day} ${month} ${year}`);
      }
    } catch {}
    return new Date(0); // Invalid dates go to top
  };

  // Helper to normalize batch name (removes ordinal suffixes so same dates are grouped)
  const normalizeBatchName = (batchName: string): string => {
    try {
      // Match and normalize: "10 May 2026 Batch" and "10th May 2026 Batch" both become "10 May 2026 Batch"
      const match = batchName.match(/(\d+)(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/);
      if (match) {
        const [, day, month, year] = match;
        return `${day} ${month} ${year} Batch`;
      }
    } catch {}
    return batchName; // Return original if no date found
  };

  // Group by batch/playlist with normalized names (same dates = same group)
  const batchGroups: Record<string, Recording[]> = {};
  filteredRecordings.forEach(rec => {
    const parts = rec.title?.split(' > ') || [];
    let batch = parts.length > 1 ? parts[1] : 'General';
    batch = normalizeBatchName(batch); // Normalize to combine "10 May" and "10th May"
    if (!batchGroups[batch]) batchGroups[batch] = [];
    batchGroups[batch].push(rec);
  });

  // Sort batch groups by date (oldest first, newest at bottom)
  const sortedBatchEntries = Object.entries(batchGroups).sort((a, b) => {
    return parseDate(a[0]).getTime() - parseDate(b[0]).getTime();
  });

  // For hero: use thumbnail from first video
  const heroThumb = filteredRecordings[0]?.thumbnailUrl || null;
  const workshopName = communityIdParam
    ? (filteredRecordings[0]?.title?.split(' > ')[0] || communityIdParam)
    : 'Community Recordings';

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

        {/* Loading */}
        {loading && <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" /></div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">{error}</div>}

        {!loading && !error && (
          <>
            {/* Hero banner */}
            {heroThumb && (
              <div className="relative rounded-2xl overflow-hidden mb-8 min-h-[220px] flex items-end">
                <img src={heroThumb} alt={workshopName} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative z-10 p-8 w-full">
                  <span className="inline-block px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider mb-3">Workshop</span>
                  <h2 className="text-3xl font-black text-white mb-1">{workshopName}</h2>
                  <p className="text-white/70 text-sm">{filteredRecordings.length} {filteredRecordings.length === 1 ? 'Video' : 'Videos'} &bull; {sortedBatchEntries.length} {sortedBatchEntries.length === 1 ? 'Batch' : 'Batches'}</p>
                </div>
              </div>
            )}

            {filteredRecordings.length === 0 && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎬</div>
                <h2 className="text-xl font-semibold text-slate-900 mb-2">No Recordings Yet</h2>
                <p className="text-slate-500">Workshop recordings will appear here after your sessions.</p>
              </div>
            )}

            {/* Batch sections */}
            {sortedBatchEntries.map(([batchName, batchVideos]) => (
              <div key={batchName} className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-1 h-6 bg-emerald-500 rounded-full" />
                  {editingBatch === batchName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingBatchValue}
                        onChange={(e) => setEditingBatchValue(e.target.value)}
                        className="text-lg font-bold text-slate-900 border-b-2 border-emerald-500 px-2 py-1 outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setEditingBatch(null);
                          setEditingBatchValue('');
                          // TODO: Save batch name to database
                        }}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition"
                        title="Save"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingBatch(null);
                          setEditingBatchValue('');
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                        title="Cancel"
                      >
                        <XIcon size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-bold text-slate-900">{batchName}</h3>
                      <button
                        onClick={() => {
                          setEditingBatch(batchName);
                          setEditingBatchValue(batchName);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition"
                        title="Edit batch name"
                      >
                        <Edit2 size={16} />
                      </button>
                    </>
                  )}
                  <span className="text-sm text-slate-400">{batchVideos.length} videos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[...batchVideos]
                    .sort((a, b) => {
                      const na = parseInt(a.title?.match(/Video\s+(\d+)/i)?.[1] || '0');
                      const nb = parseInt(b.title?.match(/Video\s+(\d+)/i)?.[1] || '0');
                      return na - nb;
                    })
                    .map((recording, idx) => {
                      const canPlay = recording.isPublic || !!user;
                      return (
                        <div key={recording._id} className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl transition-all duration-300">
                          {/* YouTube-style 16:9 thumbnail */}
                          <div
                            className="aspect-video relative overflow-hidden cursor-pointer bg-slate-900"
                            onClick={() => canPlay ? handlePlayVideo(recording) : setShowAccessPopup(true)}
                          >
                            {recording.thumbnailUrl && !failedThumbnails.has(recording._id) ? (
                              <img src={recording.thumbnailUrl} alt={recording.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={() => {
                                  setFailedThumbnails(prev => new Set([...prev, recording._id]));
                                }}
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${GRADIENT_COLORS[idx % GRADIENT_COLORS.length]} flex items-center justify-center`}>
                                <Video className="w-12 h-12 text-white/40" />
                              </div>
                            )}
                            {/* Play overlay */}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                              {canPlay ? (
                                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-2xl">
                                  <Play className="w-6 h-6 text-slate-900 ml-1" />
                                </div>
                              ) : (
                                <div className="w-14 h-14 rounded-full bg-black/70 flex items-center justify-center">
                                  <Lock className="w-6 h-6 text-white" />
                                </div>
                              )}
                            </div>
                            {/* Number badge */}
                            <div className="absolute top-2 left-2 w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow">
                              {idx + 1}
                            </div>
                            {/* Duration */}
                            {recording.duration && (
                              <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 rounded text-white text-xs font-bold">
                                {formatDuration(recording.duration)}
                              </div>
                            )}
                          </div>

                          {/* Info below thumbnail — YouTube style */}
                          <div className="p-4">
                            <h4 className="font-bold text-slate-900 text-sm mb-1 line-clamp-2 leading-snug">
                              {recording.title?.split(' > ').pop() || `Video ${idx + 1}`}
                            </h4>
                            {recording.description && (
                              <p className="text-slate-400 text-xs mb-3 line-clamp-2">{recording.description}</p>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Play className="w-3 h-3" /> {recording.views || 0} views
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); user ? handleLike(recording._id) : setShowAccessPopup(true); }}
                                  disabled={likingVideoId === recording._id}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                                    user && Array.isArray(recording.likes) && recording.likes.includes(getUserId())
                                      ? 'text-red-500 bg-red-50'
                                      : 'text-slate-400 hover:text-red-400 hover:bg-red-50'
                                  }`}
                                >
                                  <Heart size={12} className={user && Array.isArray(recording.likes) && recording.likes.includes(getUserId()) ? 'fill-red-500' : ''} />
                                  {Array.isArray(recording.likes) ? recording.likes.length : 0}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCommentVideo(recording); setShowCommentModal(true); }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                                >
                                  <MessageCircle size={12} />
                                  {Array.isArray(recording.comments) ? recording.comments.length : 0}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </>
        )}
      </main>

      {/* Video Player Modal */}
      {playingVideo && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <button onClick={() => setPlayingVideo(null)}
              className="absolute -top-12 right-0 text-white hover:text-emerald-400 transition-colors text-lg font-bold">
              ✕ Close
            </button>
            <div className="bg-black rounded-2xl overflow-hidden" onContextMenu={e => e.preventDefault()}>
              <VideoPlayer
                videoUrl={playingVideo.videoUrl || ''}
                videoId={playingVideo._id}
                videoSource={playingVideo.videoSource}
                youtubeVideoId={playingVideo.youtubeVideoId}
                bunnyLibraryId={playingVideo.bunnyLibraryId}
                bunnyVideoId={playingVideo.bunnyVideoId}
                communityId={communityIdParam || playingVideo.communityId}
              />
              <div className="p-5 bg-gray-900">
                <h3 className="text-white font-bold text-lg">{playingVideo.title?.split(' > ').pop()}</h3>
                {playingVideo.description && <p className="text-gray-400 text-sm mt-1">{playingVideo.description}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Popup for non-approved users */}
      {showAccessPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAccessPopup(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Approved Sadhaks Only</h3>
            <p className="text-slate-500 text-sm mb-6">This recording is available only for approved community members.</p>
            <a
              href="https://wa.me/919309986820?text=Hello%20Swar%20Yoga!%20I%20would%20like%20to%20access%20the%20community%20recordings."
              target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all mb-3"
            >
              WhatsApp: 9309986820
            </a>
            <button onClick={() => setShowAccessPopup(false)} className="text-sm text-slate-400 hover:text-slate-600">Close</button>
          </div>
        </div>
      )}

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
