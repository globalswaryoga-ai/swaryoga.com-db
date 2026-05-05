'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PrivateVideo {
  _id: string;
  videoTitle: string;
  videoId: string;
  ownerEmail: string;
  createdAt: string;
}

export default function AdminPrivateVideosPage({ token }: { token: string | null }) {
  const [videos, setVideos] = useState<PrivateVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');

  // Fetch videos
  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/community/private-videos?admin=true', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to load videos');

      const data = await res.json();
      // For admin, we'd need a separate endpoint, but for now show user's videos
      setVideos(data.videos || []);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchVideos();
    }
  }, [token]);

  // Handle form submission
  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/community/private-videos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          videoTitle,
          ownerEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add video');
      }

      setSuccess(`✅ Video added for ${ownerEmail}`);
      setVideoUrl('');
      setVideoTitle('');
      setOwnerEmail('');

      // Refresh list
      await fetchVideos();

      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Manage Private Videos</h1>
          <p className="text-gray-600 mt-2">Add private YouTube videos for community members</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Video Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add Video
              </h2>

              <form onSubmit={handleAddVideo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video Title
                  </label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="e.g., Advanced Yoga Class"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Owner Email
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="swarsakshi9@gmail.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email that owns the private YouTube video
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    YouTube URL
                  </label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Video
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p>
                  <strong>ℹ️ How it works:</strong>
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>✓ Add video with email address</li>
                  <li>✓ Email user must have YouTube access</li>
                  <li>✓ Users login with their email</li>
                  <li>✓ See videos they have access to</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Videos List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Videos ({videos.length})
              </h2>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : videos.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No videos added yet</p>
              ) : (
                <div className="space-y-3">
                  {videos.map((video) => (
                    <div
                      key={video._id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800">{video.videoTitle}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            👤 {video.ownerEmail}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Added: {new Date(video.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Delete this video?')) {
                              // TODO: Implement delete
                            }
                          }}
                          className="text-red-500 hover:text-red-700 ml-4"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
