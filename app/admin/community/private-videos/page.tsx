'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, AlertCircle, CheckCircle2, Play } from 'lucide-react';

interface PrivateVideo {
  _id: string;
  videoTitle: string;
  videoId: string;
  videoType: string;
  requiredRole: string;
  description?: string;
  createdAt: string;
  views?: number;
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
  const [description, setDescription] = useState('');
  const [requiredRole, setRequiredRole] = useState('member');
  const [videoType, setVideoType] = useState('class');

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
          description,
          requiredRole,
          videoType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add video');
      }

      setSuccess(`✅ Video added! (Owner: swarsakshi9@gmail.com)`);
      setVideoUrl('');
      setVideoTitle('');
      setDescription('');
      setRequiredRole('member');
      setVideoType('class');

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
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <p className="font-medium">📺 Video Owner: swarsakshi9@gmail.com</p>
                  <p className="text-xs mt-1">All videos added here are owned by this account</p>
                </div>

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
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this video about?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-20"
                  />
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video Type
                    </label>
                    <select
                      value={videoType}
                      onChange={(e) => setVideoType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="class">Class</option>
                      <option value="workshop">Workshop</option>
                      <option value="tutorial">Tutorial</option>
                      <option value="special">Special</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Role
                    </label>
                    <select
                      value={requiredRole}
                      onChange={(e) => setRequiredRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="member">Member</option>
                      <option value="participant">Participant</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin Only</option>
                    </select>
                  </div>
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

              <div className="mt-6 space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <p className="font-medium">💡 How it works:</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>✅ All videos owned by swarsakshi9@gmail.com</li>
                    <li>✅ YouTube handles private video security</li>
                    <li>✅ Your platform controls access via roles</li>
                    <li>✅ Users see videos they have permission for</li>
                    <li>✅ YouTube monetization enabled automatically</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  <p className="font-medium">🚀 Benefits:</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>💰 Free (no Bunny CDN costs)</li>
                    <li>🔒 Private (YouTube + role-based access)</li>
                    <li>💵 Monetizable (YouTube ads, channel membership)</li>
                    <li>📊 Analytics (YouTube Studio dashboard)</li>
                  </ul>
                </div>
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
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Play className="w-4 h-4 text-indigo-600" />
                            {video.videoTitle}
                          </h3>
                          {video.description && (
                            <p className="text-sm text-gray-600 mt-1">{video.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {video.videoType}
                            </span>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              {video.requiredRole}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            Added: {new Date(video.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Delete this video?')) {
                              // TODO: Implement delete
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-2"
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
