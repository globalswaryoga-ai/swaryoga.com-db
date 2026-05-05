'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Lock, AlertCircle } from 'lucide-react';

interface PrivateVideo {
  _id: string;
  videoTitle: string;
  videoId: string;
  videoUrl: string;
  ownerEmail: string;
  createdAt: string;
}

export default function PrivateVideosPage({ token }: { token: string | null }) {
  const [videos, setVideos] = useState<PrivateVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Get user email from token
  useEffect(() => {
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
        setUserEmail(decoded.email || null);
      } catch (e) {
        console.error('Failed to decode token');
      }
    }
  }, [token]);

  // Fetch accessible videos
  useEffect(() => {
    if (!token) {
      setError('Login required to view videos');
      setLoading(false);
      return;
    }

    fetchVideos();
  }, [token]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/community/private-videos', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load videos');
      }

      const data = await res.json();
      setVideos(data.videos || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Lock className="w-12 h-12 text-amber-500" />
        <h2 className="text-xl font-bold text-gray-700">Login Required</h2>
        <p className="text-sm text-gray-500">You must be logged in to view private videos</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Community Videos</h1>
          <p className="text-gray-600">Private videos for approved community members</p>
          {userEmail && (
            <p className="text-sm text-gray-500 mt-2">
              📧 Logged in as: <strong>{userEmail}</strong>
            </p>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">{error}</p>
              <p className="text-sm text-red-600 mt-1">Contact an admin if you should have access</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        )}

        {/* Videos Grid */}
        {!loading && videos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(video => (
              <div key={video._id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
                {/* Video Thumbnail */}
                <div className="relative bg-black w-full h-48">
                  <img
                    src={`https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`}
                    alt={video.videoTitle}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 hover:bg-black/40 transition flex items-center justify-center">
                    <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2">
                    {video.videoTitle}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    🔒 Private for: <strong>{video.ownerEmail}</strong>
                  </p>
                  <a
                    href={`/sadhana/community/private-videos/${video.videoId}`}
                    className="inline-block w-full text-center bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
                  >
                    Watch Video
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && videos.length === 0 && !error && (
          <div className="text-center py-20">
            <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600">No private videos available</p>
            <p className="text-sm text-gray-500 mt-2">Ask an admin to share videos with you</p>
          </div>
        )}
      </div>
    </div>
  );
}
