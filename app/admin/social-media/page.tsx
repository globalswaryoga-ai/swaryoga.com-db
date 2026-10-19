'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Trash2,
  Link as LinkIcon,
  Calendar,
  Image as ImageIcon,
  Play,
  X,
  Plus,
  Share2,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  BarChart2,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { MediaPreview, InlineMediaPreview } from '@/components/admin/crm';

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
  facebook: { color: 'from-blue-600 to-indigo-700', badge: 'bg-blue-100 text-blue-700 border-blue-200', icon: '👍', name: 'Facebook' },
  youtube: { color: 'from-red-600 to-rose-700', badge: 'bg-red-100 text-red-700 border-red-200', icon: '▶️', name: 'YouTube' },
  x: { color: 'from-slate-800 to-slate-900', badge: 'bg-slate-100 text-slate-800 border-slate-200', icon: '𝕏', name: 'X / Twitter' },
  linkedin: { color: 'from-blue-700 to-cyan-800', badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', icon: '💼', name: 'LinkedIn' },
  instagram: { color: 'from-pink-500 via-rose-500 to-purple-600', badge: 'bg-pink-100 text-pink-700 border-pink-200', icon: '📸', name: 'Instagram' },
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
  const [postType, setPostType] = useState<'feed' | 'story' | 'reel'>('feed');
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

  const fetchWithTimeout = useCallback(async (url: string, init: RequestInit = {}, timeoutMs = 15000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  }, []);

  const fetchAccounts = useCallback(async (authToken: string) => {
    try {
      setLoading(true);
      setLoadError('');
      const response = await fetchWithTimeout('/api/admin/social-media/accounts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.status === 401) {
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
  }, [fetchWithTimeout]);

  const fetchPosts = useCallback(async (authToken: string) => {
    try {
      const response = await fetchWithTimeout('/api/admin/social-media/posts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.status === 401) {
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
  }, [fetchWithTimeout]);

  useEffect(() => {
    const storedToken =
      localStorage.getItem('crm_token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('admin_token') ||
      '';

    if (storedToken) {
      setToken(storedToken);
      fetchAccounts(storedToken);
      fetchPosts(storedToken);
      return;
    }

    setLoading(false);
  }, [fetchAccounts, fetchPosts]);

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

      setSyncMessage('✅ Synced follower counts successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setSyncMessage(`❌ ${message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  const uploadToS3 = async (file: File): Promise<UploadedMedia> => {
    setUploadError('');
    setUploadingCount((c) => c + 1);
    try {
      const presignedRes = await fetch('/api/admin/crm/upload/s3/presigned', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document',
          contentType: file.type,
        }),
      });

      if (!presignedRes.ok) {
        const errData = await presignedRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to get upload URL');
      }

      const presignedData = await presignedRes.json();
      const { uploadUrl, publicUrl } = presignedData.data;

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload to S3 failed: ${uploadRes.statusText}`);
      }

      return { url: publicUrl, name: file.name };
    } catch (err: any) {
      console.error('S3 Upload Error:', err);
      throw err;
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

  const handleDisconnect = async (accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;

    try {
      const response = await fetch(`/api/admin/social-media/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchAccounts(token);
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim() && newPostImages.length === 0 && newPostVideos.length === 0) {
      alert('Please add text or media to your post');
      return;
    }

    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    setPostLoading(true);
    try {
      const payload: any = {
        content: {
          text: newPostText,
          images: newPostImages.map((img) => ({ url: img.url, caption: img.name })),
          videos: newPostVideos.map((vid) => ({ url: vid.url, title: vid.name })),
        },
        platforms: selectedPlatforms,
        postType,
      };

      if (scheduledDate) {
        payload.scheduledFor = new Date(scheduledDate).toISOString();
      }

      const response = await fetch('/api/admin/social-media/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setNewPostText('');
        setNewPostImages([]);
        setNewPostVideos([]);
        setSelectedPlatforms([]);
        setScheduledDate('');
        fetchPosts(token);
        alert(scheduledDate ? 'Post scheduled successfully!' : 'Post created successfully!');
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err?.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error creating post');
    } finally {
      setPostLoading(false);
    }
  };

  const handlePublishPost = async (postId: string) => {
    setPublishLoadingId(postId);
    setPublishMessage('');
    try {
      const response = await fetch(`/api/admin/social-media/posts/${postId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to publish post');
      }

      setPublishMessage('✅ Publish complete. Check status below.');
      await fetchPosts(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Publish failed';
      setPublishMessage(`❌ ${message}`);
      await fetchPosts(token);
    } finally {
      setPublishLoadingId(null);
    }
  };

  const totalFollowers = accounts.reduce((acc, a) => acc + (a.metadata?.followers || 0), 0);
  const scheduledCount = posts.filter((p) => p.status === 'scheduled').length;
  const publishedCount = posts.filter((p) => p.status === 'published').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading Social Media Hub...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Admin Login Required</h1>
          <p className="text-slate-600 text-sm mb-6">Please sign in to access Social Media Manager.</p>
          <a
            href="/admin/login"
            className="inline-flex items-center justify-center w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-3 px-4 rounded-xl transition shadow-xs"
          >
            Go to Admin Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Vibrant Gradient Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/admin/crm/social-hub"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Social Hub
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-medium text-pink-600">Publishing Manager</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Social Media Manager
              </h1>
              <span className="bg-pink-100 text-pink-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-pink-200">
                Multi-Platform
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Create, schedule, publish and analyze posts across Facebook, Instagram, YouTube, X and LinkedIn.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/social-media-setup"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-semibold rounded-xl shadow-2xs transition"
            >
              <LinkIcon className="w-4 h-4 text-pink-600" /> Connect Channels
            </Link>
            <button
              onClick={() => setActiveTab('posts')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Create New Post
            </button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Connected Accounts</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{accounts.length}</h3>
              <p className="text-xs text-pink-600 font-semibold mt-0.5">Active Integrations</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
              <Share2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scheduled Posts</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{scheduledCount}</h3>
              <p className="text-xs text-amber-600 font-semibold mt-0.5">In Publishing Queue</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Published Posts</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{publishedCount}</h3>
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">Total Live Feed</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Followers</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{totalFollowers.toLocaleString()}</h3>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">Synced Platform Audience</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {loadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {publishMessage && (
          <div
            className={`rounded-xl px-4 py-3 text-sm border flex items-center gap-2 ${
              publishMessage.startsWith('✅')
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            <span>{publishMessage}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-xs flex items-center gap-2">
          {(['accounts', 'posts', 'analytics'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const labels = {
              accounts: `Connected Channels (${accounts.length})`,
              posts: `Posts & Schedule (${posts.length})`,
              analytics: 'Audience Analytics',
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Supported Publishing Channels</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(platformConfig).map(([platform, config]) => {
                  const connected = accounts.find((a) => a.platform === platform);
                  return (
                    <div
                      key={platform}
                      className="rounded-xl border border-slate-200 p-5 hover:shadow-md transition bg-slate-50/50 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl">{config.icon}</span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                              connected
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {connected ? '● Connected' : 'Not Connected'}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900">{config.name}</h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {connected ? `@${connected.accountHandle || 'connected'}` : 'Configure API token to publish'}
                        </p>
                      </div>

                      <div className="mt-4 pt-4 border-t border-slate-200/60">
                        <Link
                          href={`/admin/social-media-setup?platform=${platform}`}
                          className={`w-full inline-flex items-center justify-center py-2 px-3 rounded-lg text-xs font-bold transition ${
                            connected
                              ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                              : 'bg-pink-600 hover:bg-pink-700 text-white'
                          }`}
                        >
                          {connected ? 'Manage Channel Settings' : 'Connect Account'}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connected Accounts List */}
            {accounts.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Your Connected Accounts</h3>
                <div className="divide-y divide-slate-100">
                  {accounts.map((account) => (
                    <div key={account._id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">
                          {platformConfig[account.platform as keyof typeof platformConfig]?.icon ?? '📱'}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 capitalize">{account.platform}</h4>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                              @{account.accountHandle}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                            <span>Followers: <strong className="text-slate-800">{account.metadata?.followers ?? 0}</strong></span>
                            <span>•</span>
                            <span>Posts: <strong className="text-slate-800">{account.metadata?.postsCount ?? 0}</strong></span>
                            <span>•</span>
                            <span>Connected: {new Date(account.connectedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDisconnect(account._id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Disconnect account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {/* Create Post Form */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Create New Post</h2>
              <p className="text-xs text-slate-500 mb-6">Compose your message and select which channels to broadcast to.</p>

              <form onSubmit={handleCreatePost} className="space-y-5">
                {/* Platform Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Target Platforms
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(platformConfig).map(([pKey, pConf]) => {
                      const isSelected = selectedPlatforms.includes(pKey);
                      return (
                        <button
                          key={pKey}
                          type="button"
                          onClick={() => {
                            setSelectedPlatforms((prev) =>
                              prev.includes(pKey) ? prev.filter((p) => p !== pKey) : [...prev, pKey]
                            );
                          }}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                            isSelected
                              ? 'bg-pink-50 border-pink-500 text-pink-700 font-bold shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <span>{pConf.icon}</span>
                          <span>{pConf.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Text Content */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Post Message
                  </label>
                  <textarea
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    rows={4}
                    placeholder="Write your post message or caption here..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition"
                  />
                  <div className="flex justify-between items-center text-xs text-slate-400 mt-1">
                    <span>Formatting: Supports emojis and hashtags</span>
                    <span>{newPostText.length} characters</span>
                  </div>
                </div>

                {/* Media Uploads */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Images */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-pink-600" /> Images
                      </span>
                      <span className="text-xs text-slate-500">{newPostImages.length} attached</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => imageFileInputRef.current?.click()}
                        disabled={uploadingCount > 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-lg text-xs font-bold transition"
                      >
                        <Plus className="w-3.5 h-3.5" /> Upload File
                      </button>
                      <input
                        ref={imageFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          for (const f of files) {
                            try {
                              const uploaded = await uploadToS3(f);
                              setNewPostImages((prev) => [...prev, uploaded]);
                            } catch (err: any) {
                              setUploadError(err?.message || 'Upload failed');
                            }
                          }
                        }}
                      />
                    </div>

                    {newPostImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {newPostImages.map((img, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 group">
                            <img src={img.url} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setNewPostImages((prev) => prev.filter((_, i) => i !== idx))}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Videos */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                        <Play className="w-4 h-4 text-indigo-600" /> Video URL / S3
                      </span>
                      <span className="text-xs text-slate-500">{newPostVideos.length} attached</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        placeholder="https://... mp4 or Bunny URL"
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-pink-500"
                      />
                      <button
                        type="button"
                        onClick={addVideoUrl}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition"
                      >
                        Add
                      </button>
                    </div>

                    {newPostVideos.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {newPostVideos.map((vid, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200">
                            <span className="truncate max-w-[200px] text-slate-700 font-mono">{vid.url}</span>
                            <button
                              type="button"
                              onClick={() => setNewPostVideos((prev) => prev.filter((_, i) => i !== idx))}
                              className="text-red-600 hover:text-red-700 ml-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {uploadError && (
                  <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                    {uploadError}
                  </div>
                )}

                {/* Scheduling & Submit */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600">Schedule (Optional):</span>
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={postLoading}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {postLoading ? 'Saving...' : scheduledDate ? 'Schedule Post' : 'Publish / Save Draft'}
                  </button>
                </div>
              </form>
            </div>

            {/* Posts Feed & History */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Post History & Outbox</h3>
              {posts.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No posts yet. Create your first post above!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {posts.map((post) => (
                    <div key={post._id} className="py-4 first:pt-0 last:pb-0 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                post.status === 'published'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : post.status === 'scheduled'
                                  ? 'bg-amber-100 text-amber-800'
                                  : post.status === 'failed'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {post.status}
                            </span>
                            <span className="text-xs text-slate-400">
                              Created: {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-800 font-medium whitespace-pre-wrap">{post.content.text}</p>
                        </div>

                        {post.status !== 'published' && (
                          <button
                            onClick={() => handlePublishPost(post._id)}
                            disabled={publishLoadingId === post._id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition disabled:opacity-50"
                          >
                            {publishLoadingId === post._id ? 'Publishing...' : 'Publish Now'}
                          </button>
                        )}
                      </div>

                      {post.platforms && post.platforms.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {post.platforms.map((p) => (
                            <span
                              key={p}
                              className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-semibold border border-slate-200"
                            >
                              {platformConfig[p as keyof typeof platformConfig]?.icon} {p}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Audience Growth & Sync</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live follower counts pulled directly from platform developer APIs.
                </p>
              </div>
              <button
                onClick={handleSyncAnalytics}
                disabled={syncLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                {syncLoading ? 'Syncing...' : 'Sync Follower Counts'}
              </button>
            </div>

            {syncMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-medium border ${
                  syncMessage.startsWith('✅')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {syncMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {accounts.map((acc) => (
                <div key={acc._id} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">
                      {platformConfig[acc.platform as keyof typeof platformConfig]?.icon ?? '📱'}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 capitalize text-sm">{acc.platform}</h4>
                      <p className="text-xs text-slate-400">@{acc.accountHandle}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Followers:</span>
                    <span className="text-base font-bold text-pink-600">
                      {(acc.metadata?.followers ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
