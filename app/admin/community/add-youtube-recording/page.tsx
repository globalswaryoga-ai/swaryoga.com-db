'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Loader2, AlertCircle, CheckCircle2, Video } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Community {
  _id: string;
  name: string;
}

export default function AddYouTubeRecordingPage() {
  const token = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [selectedCommunity, setSelectedCommunity] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const [emailVerified, setEmailVerified] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const YOUTUBE_EMAIL = 'swarsakshi9@gmail.com';

  // Check email verification status
  useEffect(() => {
    const checkEmailVerification = async () => {
      setCheckingEmail(true);
      try {
        const res = await fetch(
          `/api/admin/community/verify-youtube-email?email=${YOUTUBE_EMAIL}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await res.json();
        setEmailVerified(data.isVerified || false);
      } catch (e) {
        setEmailVerified(false);
      } finally {
        setCheckingEmail(false);
      }
    };

    if (token) checkEmailVerification();
  }, [token]);

  // Fetch communities
  useEffect(() => {
    const fetchCommunities = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/community/list', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) throw new Error('Failed to load communities');

        const data = await res.json();
        setCommunities(data.communities || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchCommunities();
  }, [token]);

  // Handle form submission
  const handleAddRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!selectedCommunity) {
        throw new Error('Please select a community');
      }

      // Extract YouTube video ID
      let videoId = '';
      const urlObj = new URL(youtubeUrl);
      if (urlObj.hostname.includes('youtube.com')) {
        videoId = urlObj.searchParams.get('v') || '';
      } else if (urlObj.hostname.includes('youtu.be')) {
        videoId = urlObj.pathname.replace('/', '');
      }

      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Add to community recordings
      const res = await fetch(`/api/community/${selectedCommunity}/add-recording`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: videoTitle,
          description: videoDescription,
          videoSource: 'youtube',
          youtubeVideoId: videoId,
          videoUrl: youtubeUrl,
          thumbnailUrl: thumbnailUrl || undefined,
          isPublic,
          recordingType: 'private_youtube', // Mark as private YouTube
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add recording');
      }

      setSuccess(`✅ YouTube recording added to ${communities.find(c => c._id === selectedCommunity)?.name}`);

      // Reset form
      setVideoTitle('');
      setVideoDescription('');
      setYoutubeUrl('');
      setThumbnailUrl('');
      setIsPublic(false);
      setSelectedCommunity('');

      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 flex items-center gap-3">
            <Video className="w-10 h-10 text-red-600" />
            Add YouTube Recording to Community
          </h1>
          <p className="text-gray-600 mt-2">
            Share YouTube unlisted videos with community members
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleAddRecording} className="space-y-6">
            {/* Community Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Community *
              </label>
              {loading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading communities...
                </div>
              ) : (
                <select
                  value={selectedCommunity}
                  onChange={(e) => setSelectedCommunity(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Choose a community --</option>
                  {communities.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Video Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recording Title *
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g., Advanced Yoga Class - Session 5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="Add details about this recording..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24"
              />
            </div>

            {/* YouTube URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                YouTube URL *
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                ✅ Owned by: {YOUTUBE_EMAIL}
              </p>
            </div>

            {/* Thumbnail URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thumbnail URL (Optional)
              </label>
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://... (leave empty for auto-generated YouTube thumbnail)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 Leave empty to use YouTube's default thumbnail
              </p>
            </div>

            {/* Public/Private Toggle */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded"
              />
              <label htmlFor="isPublic" className="text-sm text-gray-700">
                <strong>Make searchable/featured?</strong> (Still requires login to watch)
              </label>
            </div>

            {/* Email Verification Status */}
            {!emailVerified && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <p className="font-medium">⚠️ Email Verification Required</p>
                <p className="mt-2">
                  {YOUTUBE_EMAIL} must be verified before adding videos
                </p>
                <a
                  href="/admin/community/verify-youtube-email"
                  className="inline-block mt-3 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition text-xs font-medium"
                >
                  Verify Email
                </a>
              </div>
            )}

            {emailVerified && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                <p className="font-medium">✅ Email Verified</p>
                <p className="mt-1">{YOUTUBE_EMAIL} is verified and ready to use</p>
              </div>
            )}

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
              <p className="font-medium">✅ Security & Features:</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>🔒 Unlisted YouTube video (shared with community members only)</li>
                <li>💵 Monetized (YouTube ads, channel membership)</li>
                <li>📊 Full YouTube analytics</li>
                <li>👤 Requires community login</li>
                <li>📱 Works on all devices</li>
                <li>✔️ Email verified & owner confirmed</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || loading || !emailVerified || checkingEmail}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
              title={!emailVerified ? `Verify ${YOUTUBE_EMAIL} first` : ''}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Adding to community...
                </>
              ) : checkingEmail ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking verification...
                </>
              ) : !emailVerified ? (
                <>
                  <AlertCircle className="w-5 h-5" />
                  Verify Email First
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Add to Community Recordings
                </>
              )}
            </button>
          </form>
        </div>

        {/* Help Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-800 mb-3">📺 How to Share Video with Community</h3>
            <ol className="text-sm text-gray-600 space-y-2">
              <li>1. Upload video to YouTube (swarsakshi9@gmail.com account)</li>
              <li>2. Set visibility to "Unlisted" (hidden from search, visible via link)</li>
              <li>3. Copy the video URL</li>
              <li>4. Paste here to add to community — we'll verify it's accessible</li>
            </ol>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold text-gray-800 mb-3">🔒 Security & Access</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✅ YouTube handles access control</li>
              <li>✅ Only swarsakshi9@gmail.com can upload</li>
              <li>✅ Community members see in recordings</li>
              <li>✅ Login required to watch</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
