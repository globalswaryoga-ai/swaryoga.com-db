'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Play, Calendar, Lock, Users, Video } from 'lucide-react';

interface Recording {
  _id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  s3Url?: string;
  duration?: number;
  recordingType?: string;
  zoomMeetingId?: string;
  recordedAt?: string;
  createdAt?: string;
  communityId?: string;
  communityName?: string;
  isPublic?: boolean;
  viewCount?: number;
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

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string>('all');
  const [user, setUser] = useState<any>(null);
  const [playingVideo, setPlayingVideo] = useState<Recording | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);

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
      const res = await fetch('/api/community/list');
      const data = await res.json();

      if (data.success) {
        setCommunities(data.communities || []);
      }
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
                <video
                  src={playingVideo.s3Url}
                  controls
                  autoPlay
                  className="w-full aspect-video"
                  controlsList="nodownload nofullscreen noremoteplayback"
                  disablePictureInPicture
                  onContextMenu={(e) => e.preventDefault()}
                />
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
                            onClick={() => canPlay ? setPlayingVideo(recording) : null}
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
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                              {recording.recordedAt && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {formatDate(recording.recordedAt)}
                                </span>
                              )}
                              {recording.viewCount !== undefined && recording.viewCount > 0 && (
                                <span>{recording.viewCount} views</span>
                              )}
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
    </div>
  );
}
