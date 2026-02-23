'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Clock, Calendar, Lock, Users } from 'lucide-react';

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

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string>('all');
  const [user, setUser] = useState<any>(null);
  const [playingVideo, setPlayingVideo] = useState<Recording | null>(null);

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
    } catch (err) {
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

  // Group by community for playlist view
  const groupedRecordings = filteredRecordings.reduce((acc, rec) => {
    const communityName = rec.communityName || 'General';
    if (!acc[communityName]) acc[communityName] = [];
    acc[communityName].push(rec);
    return acc;
  }, {} as Record<string, Recording[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/community" 
              className="p-2 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-amber-700" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-amber-900">🎬 Community Recordings</h1>
              <p className="text-amber-600 text-sm">Workshop sessions & classes</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Community Filter */}
        {communities.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCommunity('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCommunity === 'all'
                  ? 'bg-amber-500 text-white'
                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              All Recordings
            </button>
            {communities.filter(c => c.recordingCount && c.recordingCount > 0).map(community => (
              <button
                key={community._id}
                onClick={() => setSelectedCommunity(community._id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCommunity === community._id
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
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
            <h2 className="text-xl font-semibold text-amber-900 mb-2">No Recordings Yet</h2>
            <p className="text-amber-600">
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
                className="absolute -top-12 right-0 text-white hover:text-amber-400 transition-colors"
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
                  <h3 className="text-white font-semibold">{playingVideo.title}</h3>
                  {playingVideo.description && (
                    <p className="text-gray-400 text-sm mt-1">{playingVideo.description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recordings Grid */}
        {!loading && !error && Object.keys(groupedRecordings).length > 0 && (
          <div className="space-y-8">
            {Object.entries(groupedRecordings).map(([communityName, recs]) => (
              <div key={communityName}>
                {selectedCommunity === 'all' && (
                  <h2 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {communityName}
                  </h2>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recs.map((recording) => (
                    <div
                      key={recording._id}
                      className="bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden hover:shadow-md transition-shadow group"
                    >
                      {/* Thumbnail */}
                      <div 
                        className="relative aspect-video bg-gradient-to-br from-amber-100 to-orange-100 cursor-pointer"
                        onClick={() => recording.isPublic || user ? setPlayingVideo(recording) : null}
                      >
                        {recording.thumbnailUrl ? (
                          <img 
                            src={recording.thumbnailUrl} 
                            alt={recording.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-16 h-16 text-amber-300" />
                          </div>
                        )}
                        
                        {/* Play Overlay */}
                        {(recording.isPublic || user) ? (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                              <Play className="w-8 h-8 text-amber-600 ml-1" />
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
                        
                        {/* Duration Badge */}
                        {recording.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                            {formatDuration(recording.duration)}
                          </div>
                        )}
                        
                        {/* Recording Type Badge */}
                        {recording.recordingType && (
                          <div className="absolute top-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded capitalize">
                            {recording.recordingType.replace('_', ' ')}
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                          {recording.title}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {recording.recordedAt && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(recording.recordedAt)}
                            </span>
                          )}
                          {recording.viewCount !== undefined && (
                            <span>{recording.viewCount} views</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Join CTA for non-members */}
        {!user && (
          <div className="mt-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-bold mb-2">Join Our Community</h3>
            <p className="mb-4 opacity-90">Get access to all workshop recordings and exclusive content</p>
            <Link
              href="/community"
              className="inline-block px-6 py-3 bg-white text-amber-600 font-semibold rounded-lg hover:bg-amber-50 transition-colors"
            >
              Join Now →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
