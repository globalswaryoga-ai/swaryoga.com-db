'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SocialAccount {
  _id: string;
  platform: string;
  account_name: string;
  account_handle: string;
}

interface PostCreatorProps {
  token: string;
  onSuccess?: () => void;
}

export default function PostCreator({ token, onSuccess }: PostCreatorProps) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduling, setScheduling] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');

  const platformOptions = [
    { id: 'facebook', name: 'Facebook', icon: '👍' },
    { id: 'instagram', name: 'Instagram', icon: '📷' },
    { id: 'twitter', name: 'Twitter/X', icon: '𝕏' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
    { id: 'youtube', name: 'YouTube', icon: '📹' },
    { id: 'whatsapp', name: 'WhatsApp', icon: '💬' },
    { id: 'community', name: 'Community', icon: '👥' },
  ];

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch('/api/social/accounts', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const { data } = await response.json();
        setAccounts(data);
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  function togglePlatform(platformId: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  }

  async function handlePublish() {
    try {
      setLoading(true);
      setError('');

      if (!content.trim()) {
        setError('Please enter post content');
        return;
      }

      if (selectedPlatforms.length === 0) {
        setError('Select at least one platform');
        return;
      }

      // Create post
      const createResponse = await fetch('/api/social/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          platforms: selectedPlatforms,
          hashtags: hashtags.split(' ').filter((h) => h),
          media: [],
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || 'Failed to create post');
      }

      const postData = await createResponse.json();
      const postId = postData.data._id;

      // Publish immediately
      const publishResponse = await fetch(`/api/social/posts/${postId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!publishResponse.ok) {
        throw new Error('Failed to publish post');
      }

      // Reset form
      setContent('');
      setHashtags('');
      setSelectedPlatforms([]);
      setScheduling(false);
      setScheduledTime('');

      alert('✅ Post published to all platforms!');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const connectedPlatformIds = accounts.map((a) => a.platform);
  const unconnectedPlatforms = platformOptions.filter((p) => !connectedPlatformIds.includes(p.id));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">✍️ Create & Post</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          ❌ {error}
        </div>
      )}

      {/* Connected Accounts Info */}
      {accounts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <p className="text-sm text-blue-900">
            <strong>Connected:</strong> {accounts.map((a) => a.account_name).join(', ')}
          </p>
        </div>
      )}

      {/* Unconnected Platforms Warning */}
      {unconnectedPlatforms.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <p className="text-sm text-yellow-900 mb-2">
            <strong>Not Connected:</strong> {unconnectedPlatforms.map((p) => p.name).join(', ')}
          </p>
          <button
            onClick={() => router.push('/social-accounts')}
            className="text-sm text-yellow-700 hover:text-yellow-900 underline font-semibold"
          >
            Connect more accounts →
          </button>
        </div>
      )}

      {/* Content Input */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Post Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind? Share with your community..."
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">{content.length} characters</p>
      </div>

      {/* Hashtags */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Hashtags (space-separated)</label>
        <input
          type="text"
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="#yoga #wellness #mindfulness"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
        />
      </div>

      {/* Platform Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Select Platforms</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {platformOptions.map((platform) => {
            const isConnected = connectedPlatformIds.includes(platform.id);
            return (
              <button
                key={platform.id}
                onClick={() => isConnected && togglePlatform(platform.id)}
                disabled={!isConnected}
                className={`p-3 rounded-lg font-semibold transition-all ${
                  isConnected
                    ? selectedPlatforms.includes(platform.id)
                      ? 'bg-yoga-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="text-2xl mb-1">{platform.icon}</div>
                <div className="text-xs">{platform.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scheduling */}
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={scheduling}
            onChange={() => setScheduling(!scheduling)}
            className="w-4 h-4"
          />
          <span className="font-semibold text-gray-700">Schedule for later</span>
        </label>

        {scheduling && (
          <input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handlePublish}
          disabled={loading || selectedPlatforms.length === 0 || !content.trim()}
          className="flex-1 bg-yoga-600 hover:bg-yoga-700 text-white px-6 py-3 rounded-lg font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Publishing...
            </>
          ) : (
            <>
              🚀 Publish Now
            </>
          )}
        </button>

        <button
          onClick={() => {
            setContent('');
            setHashtags('');
            setSelectedPlatforms([]);
          }}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Success Tip */}
      {selectedPlatforms.length > 0 && content && (
        <div className="mt-6 bg-green-50 border border-green-200 p-4 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ Ready to post to <strong>{selectedPlatforms.length}</strong> platform{selectedPlatforms.length !== 1 ? 's' : ''}!
          </p>
        </div>
      )}
    </div>
  );
}
