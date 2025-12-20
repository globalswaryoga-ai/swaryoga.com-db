'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, Link as LinkIcon, Calendar, Image, Play, X, Plus } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

interface SocialAccount {
  _id: string;
  platform: 'facebook' | 'youtube' | 'x' | 'linkedin' | 'instagram';
  accountName: string;
  accountHandle: string;
  accountEmail?: string;
  isConnected: boolean;
  metadata: {
    followers?: number;
    postsCount?: number;
    lastSyncedAt?: string;
  };
  connectedAt: string;
}

interface SocialPost {
  _id: string;
  content: {
    text: string;
    images?: Array<{ url: string; caption?: string; altText?: string }>;
    videos?: Array<{ url: string; title?: string; thumbnail?: string; duration?: number }>;
  };
  platforms: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledFor?: string;
  publishedAt?: string;
  failureReason?: string;
  createdAt: string;
}

type UploadedMedia = {
  url: string;
  name?: string;
};

const platformConfig = {
  facebook: { color: 'from-blue-600 to-blue-700', icon: '👍' },
  youtube: { color: 'from-red-600 to-red-700', icon: '▶️' },
  x: { color: 'from-black to-gray-800', icon: '𝕏' },
  linkedin: { color: 'from-blue-700 to-blue-800', icon: '💼' },
  instagram: { color: 'from-pink-500 to-purple-600', icon: '📸' },
};

export default function SocialMediaAdmin() {
  const [token, setToken] = useState<string>('');
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'accounts' | 'posts' | 'analytics'>('accounts');
  const [newPostText, setNewPostText] = useState('');
  const [newPostImages, setNewPostImages] = useState<UploadedMedia[]>([]);
  const [newPostVideos, setNewPostVideos] = useState<UploadedMedia[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [uploadingCount, setUploadingCount] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [postLoading, setPostLoading] = useState(false);

  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);

  const [publishLoadingId, setPublishLoadingId] = useState<string | null>(null);
  const [publishMessage, setPublishMessage] = useState<string>('');

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [syncResults, setSyncResults] = useState<
    Array<{ accountMongoId: string; platform: string; accountId: string; ok: boolean; followers?: number; error?: string }>
  >([]);

  const fetchWithTimeout = async (url: string, init: RequestInit = {}, timeoutMs = 15000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('adminToken');

    if (storedToken) {
      setToken(storedToken);
      fetchAccounts(storedToken);
      fetchPosts(storedToken);
      return;
    }

    // No token available; stop loading so we can show a prompt.
    setLoading(false);
  }, []);

  const fetchAccounts = async (authToken: string) => {
    try {
      setLoading(true);
      setLoadError('');
      const response = await fetchWithTimeout('/api/admin/social-media/accounts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        setToken('');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setAccounts(data.data || []);
      } else {
        const err = await response.json().catch(() => ({}));
        setLoadError(err?.error || 'Failed to load social media accounts');
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setLoadError('Network error while loading accounts. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (authToken: string) => {
    try {
      const response = await fetchWithTimeout('/api/admin/social-media/posts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        setToken('');
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setPosts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleSyncAnalytics = async () => {
    setSyncLoading(true);
    setSyncMessage('');
    try {
      const response = await fetch('/api/admin/social-media/analytics/sync', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        setToken('');
        return;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to sync analytics');
      }

      const nextAccounts = payload?.data?.accounts as SocialAccount[] | undefined;
      const nextResults = payload?.data?.results as typeof syncResults | undefined;

      if (Array.isArray(nextAccounts)) setAccounts(nextAccounts);
      if (Array.isArray(nextResults)) setSyncResults(nextResults);

      setSyncMessage('✅ Synced follower counts (where supported).');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setSyncMessage(`❌ ${message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const uploadToBlob = async (file: File): Promise<UploadedMedia> => {
    setUploadError('');
    setUploadingCount((c) => c + 1);
    try {
      const form = new FormData();
      form.append('file', file);

      const response = await fetch('/api/admin/uploads/blob', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Upload failed');
      }

      const url = payload?.data?.url as string | undefined;
      if (!url) {
        throw new Error('Upload failed: missing url');
      }

      return { url, name: file.name };
    } finally {
      setUploadingCount((c) => Math.max(0, c - 1));
    }
  };

  const addImageUrl = () => {
    const url = newImageUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setUploadError('Please enter a valid image URL starting with http(s)://');
      return;
    }
    setNewPostImages((prev) => [...prev, { url }]);
    setNewImageUrl('');
  };

  const addVideoUrl = () => {
    const url = newVideoUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setUploadError('Please enter a valid video URL starting with http(s)://');
      return;
    }
    setNewPostVideos((prev) => [...prev, { url }]);
    setNewVideoUrl('');
  };

  const handleCreatePost = async () => {
    if (!newPostText.trim() || selectedPlatforms.length === 0) {
      alert('Please add text and select at least one platform');
      return;
    }

    setPostLoading(true);
    try {
      const response = await fetch('/api/admin/social-media/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: {
            text: newPostText,
            images: newPostImages.map((img) => ({ url: img.url })),
            videos: newPostVideos.map((vid) => ({ url: vid.url })),
          },
          platforms: selectedPlatforms,
          status: scheduledDate ? 'scheduled' : 'draft',
          scheduledFor: scheduledDate || null,
        }),
      });

      if (response.ok) {
        setNewPostText('');
        setSelectedPlatforms([]);
        setScheduledDate('');
        setNewPostImages([]);
        setNewPostVideos([]);
        setNewImageUrl('');
        setNewVideoUrl('');
        alert('Post created successfully!');
        fetchPosts(token);
      } else {
        alert('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error creating post');
    } finally {
      setPostLoading(false);
    }
  };

  const handlePublishPost = async (postId: string) => {
    if (!postId) return;

    setPublishLoadingId(postId);
    setPublishMessage('');
    try {
      const response = await fetch(`/api/admin/social-media/posts/${postId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        setToken('');
        return;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to publish');
      }

      const results = payload?.data?.results as Array<{ platform: string; ok: boolean; error?: string }> | undefined;
      const failed = Array.isArray(results) ? results.filter((r) => !r.ok) : [];
      if (failed.length > 0) {
        setPublishMessage(`⚠️ Published partially. Some platforms failed: ${failed.map((f) => f.platform).join(', ')}`);
      } else {
        setPublishMessage('✅ Published successfully.');
      }

      await fetchPosts(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Publish failed';
      setPublishMessage(`❌ ${message}`);
    } finally {
      setPublishLoadingId(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;

    try {
      const response = await fetch(`/api/admin/social-media/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert('Account disconnected successfully');
        fetchAccounts(token);
      } else {
        alert('Failed to disconnect account');
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      alert('Error disconnecting account');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-slate-900">
        <AdminSidebar isOpen={true} onClose={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-2xl">Loading...</div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex h-screen bg-slate-900">
        <AdminSidebar isOpen={true} onClose={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <h1 className="text-2xl font-bold text-white mb-2">Admin login required</h1>
            <p className="text-slate-400 mb-6">Please sign in to access Social Media Manager.</p>
            <a
              href="/admin/login"
              className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-lg transition"
            >
              Go to Admin Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900">
      <AdminSidebar isOpen={true} onClose={() => {}} />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Social Media Manager</h1>
            <p className="text-slate-400">Manage your social media accounts and posts from one place</p>
          </div>

          {loadError && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-200">
              {loadError}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-slate-700">
            {(['accounts', 'posts', 'analytics'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-4 font-semibold transition ${
                  activeTab === tab
                    ? 'text-emerald-500 border-b-2 border-emerald-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Accounts Tab */}
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Connected Accounts</h2>
                
                {/* Platform Connection Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {Object.entries(platformConfig).map(([platform, config]) => (
                    <div
                      key={platform}
                      className={`bg-gradient-to-r ${config.color} p-6 rounded-xl text-white cursor-pointer hover:shadow-lg transition transform hover:scale-105`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-3xl">{config.icon}</span>
                        <LinkIcon size={20} />
                      </div>
                      <h3 className="font-bold text-lg capitalize mb-2">{platform}</h3>
                      <p className="text-sm text-white opacity-90 mb-4">
                        {accounts.find(a => a.platform === platform) ? 'Connected' : 'Not connected'}
                      </p>
                      <button
                        onClick={() => {
                          // Use the setup screen to connect/manage credentials.
                          window.location.href = `/admin/social-media-setup?platform=${platform}`;
                        }}
                        className="w-full bg-white text-gray-900 font-bold py-2 rounded-lg hover:bg-gray-100 transition"
                      >
                        {accounts.find(a => a.platform === platform) ? 'Manage' : 'Connect'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Connected Accounts List */}
                {accounts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Your Connected Accounts</h3>
                    {accounts.map(account => (
                      <div
                        key={account._id}
                        className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">{platformConfig[account.platform].icon}</span>
                              <div>
                                <h4 className="text-white font-bold capitalize">{account.platform}</h4>
                                <p className="text-slate-400">@{account.accountHandle}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                              <div className="bg-slate-700 p-3 rounded">
                                <p className="text-slate-400 text-sm">Followers</p>
                                <p className="text-white font-bold text-lg">{account.metadata.followers || 0}</p>
                              </div>
                              <div className="bg-slate-700 p-3 rounded">
                                <p className="text-slate-400 text-sm">Posts</p>
                                <p className="text-white font-bold text-lg">{account.metadata.postsCount || 0}</p>
                              </div>
                              <div className="bg-slate-700 p-3 rounded">
                                <p className="text-slate-400 text-sm">Status</p>
                                <p className="text-emerald-400 font-bold text-lg">
                                  {account.isConnected ? 'Connected' : 'Disconnected'}
                                </p>
                              </div>
                              <div className="bg-slate-700 p-3 rounded">
                                <p className="text-slate-400 text-sm">Connected</p>
                                <p className="text-white font-bold text-sm">
                                  {new Date(account.connectedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDisconnect(account._id)}
                            className="ml-4 p-3 bg-red-600 hover:bg-red-700 rounded-lg text-white transition"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div className="space-y-6">
              {/* Create Post */}
              <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
                <h2 className="text-2xl font-bold text-white mb-6">Create New Post</h2>

                <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-amber-100 text-sm">
                  <p className="font-semibold mb-1">Important:</p>
                  <p className="text-amber-100/90">
                    You can now publish to <span className="font-semibold">Facebook Pages</span> and <span className="font-semibold">Instagram (image posts)</span> using the “Publish now” button after saving.
                    X/LinkedIn/YouTube publishing needs additional official API setup and is not enabled yet.
                  </p>
                </div>

                {/* Text Input */}
                <div className="mb-6">
                  <label className="block text-slate-300 font-semibold mb-3">Post Content</label>
                  <textarea
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full bg-slate-700 text-white p-4 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none resize-none h-32"
                  />
                  <p className="text-slate-400 text-sm mt-2">{newPostText.length} characters</p>
                </div>

                {/* Media */}
                <div className="mb-6">
                  <label className="block text-slate-300 font-semibold mb-3">Media (Optional)</label>

                  {uploadError && (
                    <div className="mb-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-200 text-sm">
                      {uploadError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3 text-white font-semibold">
                        <Image size={18} /> Images
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => imageFileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-lg"
                        >
                          <Plus size={18} /> Add image(s)
                        </button>
                        <span className="text-slate-400 text-xs">PNG/JPG/WebP • multiple allowed</span>
                      </div>

                      <input
                        ref={imageFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length === 0) return;

                          try {
                            for (const file of files) {
                              const uploaded = await uploadToBlob(file);
                              setNewPostImages((prev) => [...prev, uploaded]);
                            }
                          } catch (err) {
                            const message = err instanceof Error ? err.message : 'Upload failed';
                            setUploadError(message);
                          } finally {
                            // allow selecting same file again
                            e.currentTarget.value = '';
                          }
                        }}
                        className="hidden"
                      />

                      <div className="flex gap-2 mt-3">
                        <input
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                          placeholder="Or paste image URL"
                          className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={addImageUrl}
                          className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 rounded-lg"
                        >
                          Add
                        </button>
                      </div>

                      {newPostImages.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                          {newPostImages.map((img, idx) => (
                            <div key={`${img.url}-${idx}`} className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                              <img src={img.url} alt={img.name || 'uploaded image'} className="w-full h-24 object-cover" />
                              <button
                                type="button"
                                onClick={() => setNewPostImages((prev) => prev.filter((_, i) => i !== idx))}
                                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                                title="Remove"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3 text-white font-semibold">
                        <Play size={18} /> Videos
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => videoFileInputRef.current?.click()}
                          className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-lg"
                        >
                          <Plus size={18} /> Add video
                        </button>
                        <span className="text-slate-400 text-xs">MP4/MOV • one at a time</span>
                      </div>

                      <input
                        ref={videoFileInputRef}
                        type="file"
                        accept="video/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          try {
                            const uploaded = await uploadToBlob(file);
                            setNewPostVideos((prev) => [...prev, uploaded]);
                          } catch (err) {
                            const message = err instanceof Error ? err.message : 'Upload failed';
                            setUploadError(message);
                          } finally {
                            e.currentTarget.value = '';
                          }
                        }}
                        className="hidden"
                      />
                      <p className="text-slate-400 text-xs mt-2">
                        Tip: server uploads are limited in size. For larger videos, paste a YouTube/Drive URL below.
                      </p>

                      <div className="flex gap-2 mt-3">
                        <input
                          value={newVideoUrl}
                          onChange={(e) => setNewVideoUrl(e.target.value)}
                          placeholder="Or paste video URL (YouTube, Drive, etc.)"
                          className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={addVideoUrl}
                          className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 rounded-lg"
                        >
                          Add
                        </button>
                      </div>

                      {newPostVideos.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {newPostVideos.map((vid, idx) => (
                            <div key={`${vid.url}-${idx}`} className="relative rounded-lg overflow-hidden border border-slate-700 bg-slate-950 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <a
                                  href={vid.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-300 hover:text-emerald-200 text-sm break-all"
                                >
                                  {vid.name || vid.url}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => setNewPostVideos((prev) => prev.filter((_, i) => i !== idx))}
                                  className="bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                                  title="Remove"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {(uploadingCount > 0 || postLoading) && (
                    <p className="text-slate-400 text-sm mt-3">
                      {uploadingCount > 0 ? `Uploading… (${uploadingCount})` : ''}
                    </p>
                  )}
                </div>

                {/* Platform Selection */}
                <div className="mb-6">
                  <label className="block text-slate-300 font-semibold mb-3">Post to Platforms</label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(platformConfig).map(([platform, config]) => (
                      <label
                        key={platform}
                        className={`cursor-pointer p-3 rounded-lg border-2 transition ${
                          selectedPlatforms.includes(platform)
                            ? 'border-emerald-500 bg-emerald-500 bg-opacity-20'
                            : 'border-slate-600 bg-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlatforms.includes(platform)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPlatforms([...selectedPlatforms, platform]);
                            } else {
                              setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
                            }
                          }}
                          className="hidden"
                        />
                        <div className="text-center">
                          <span className="text-2xl">{config.icon}</span>
                          <p className="text-white text-sm font-semibold capitalize mt-1">{platform}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div className="mb-6">
                  <label className="block text-slate-300 font-semibold mb-3">
                    <Calendar className="inline mr-2" size={18} />
                    Schedule (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-700 text-white p-3 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleCreatePost}
                  disabled={postLoading || uploadingCount > 0}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {postLoading ? 'Saving...' : scheduledDate ? 'Save Scheduled Post' : 'Save Draft Post'}
                </button>
              </div>

              {/* Posts List */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Recent Posts</h2>

                {publishMessage && (
                  <div
                    className={`mb-4 rounded-lg px-4 py-3 text-sm border ${publishMessage.startsWith('✅')
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : publishMessage.startsWith('⚠️')
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        : 'bg-red-500/10 border-red-500/30 text-red-200'
                    }`}
                  >
                    {publishMessage}
                  </div>
                )}

                <div className="space-y-4">
                  {posts.map(post => (
                    <div
                      key={post._id}
                      className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-white mb-3">{post.content.text}</p>

                          {post.content.images && post.content.images.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                              {post.content.images.map((img, idx) => (
                                <div key={`${img.url}-${idx}`} className="rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                                  <img src={img.url} alt={img.altText || 'post image'} className="w-full h-24 object-cover" />
                                </div>
                              ))}
                            </div>
                          )}

                          {post.content.videos && post.content.videos.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {post.content.videos.map((vid, idx) => (
                                <a
                                  key={`${vid.url}-${idx}`}
                                  href={vid.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-2 text-emerald-300 hover:text-emerald-200 text-sm break-all"
                                >
                                  <Play size={16} />
                                  {vid.title || vid.url}
                                </a>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 mb-3">
                            {post.platforms.map(platform => (
                              <span
                                key={platform}
                                className="inline-block bg-slate-700 text-slate-300 px-3 py-1 rounded-full text-sm"
                              >
                                {platformConfig[platform as keyof typeof platformConfig]?.icon} {platform}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            post.status === 'published'
                              ? 'bg-emerald-500 text-white'
                              : post.status === 'scheduled'
                              ? 'bg-blue-500 text-white'
                              : post.status === 'failed'
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-600 text-slate-300'
                          }`}
                        >
                          {post.status}
                        </span>
                      </div>

                      {(post.status === 'draft' || post.status === 'scheduled' || post.status === 'failed') && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-slate-400 text-sm">
                            {post.status === 'scheduled'
                              ? `Scheduled for: ${new Date(post.scheduledFor || '').toLocaleString()}`
                              : post.status === 'published'
                                ? `Published: ${new Date(post.publishedAt || '').toLocaleString()}`
                                : `Created: ${new Date(post.createdAt).toLocaleString()}`}
                          </p>

                          <button
                            type="button"
                            onClick={() => handlePublishPost(post._id)}
                            disabled={publishLoadingId === post._id}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition"
                          >
                            {publishLoadingId === post._id ? 'Publishing…' : 'Publish now'}
                          </button>
                        </div>
                      )}

                      {post.status === 'published' && (
                        <p className="text-slate-400 text-sm">
                          Published: {post.publishedAt ? new Date(post.publishedAt).toLocaleString() : '—'}
                        </p>
                      )}

                      {post.status === 'failed' && post.failureReason && (
                        <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-200 text-xs whitespace-pre-wrap break-words">
                          {post.failureReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Account Analytics</h2>
                  <p className="text-slate-400">
                    Shows follower counts stored in SwarYoga. Use “Sync now” to refresh from supported platform APIs.
                  </p>
                </div>

                <button
                  onClick={handleSyncAnalytics}
                  disabled={syncLoading}
                  className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white font-bold px-5 py-3 rounded-lg transition"
                >
                  {syncLoading ? 'Syncing…' : 'Sync now'}
                </button>
              </div>

              {syncMessage && (
                <div className={`rounded-lg px-4 py-3 text-sm border ${syncMessage.startsWith('✅') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-red-500/10 border-red-500/30 text-red-200'}`}>
                  {syncMessage}
                </div>
              )}

              {syncResults.length > 0 && (
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <h3 className="text-white font-bold mb-3">Last Sync Results</h3>
                  <div className="space-y-2">
                    {syncResults.map((r, idx) => (
                      <div key={`${r.accountMongoId}-${idx}`} className="flex items-start justify-between gap-4 text-sm">
                        <div className="text-slate-200">
                          <span className="font-semibold capitalize">{r.platform}</span>
                          <span className="text-slate-400"> · {r.accountId || 'no accountId'}</span>
                        </div>
                        <div className={r.ok ? 'text-emerald-300' : 'text-amber-200'}>
                          {r.ok ? `OK (followers: ${r.followers ?? 0})` : r.error || 'Not synced'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {accounts.map(account => (
                  <div key={account._id} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{platformConfig[account.platform].icon}</span>
                      <div>
                        <h3 className="text-white font-bold capitalize">{account.platform}</h3>
                        <p className="text-slate-400 text-xs">@{account.accountHandle}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-400 text-sm">Followers</p>
                        <p className="text-white text-2xl font-bold">{account.metadata.followers || 0}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Posts</p>
                        <p className="text-white text-2xl font-bold">{account.metadata.postsCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Last Synced</p>
                        <p className="text-slate-200 text-sm">
                          {account.metadata.lastSyncedAt ? new Date(account.metadata.lastSyncedAt).toLocaleString() : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
