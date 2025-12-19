'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Link as LinkIcon, Mail, TrendingUp, Calendar, FileText, Image, Play, Tag } from 'lucide-react';
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
    images?: Array<{ url: string }>;
    videos?: Array<{ url: string }>;
  };
  platforms: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledFor?: string;
  publishedAt?: string;
  createdAt: string;
}

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
  const [activeTab, setActiveTab] = useState<'accounts' | 'posts' | 'analytics'>('accounts');
  const [newPostText, setNewPostText] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [postLoading, setPostLoading] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    if (storedToken) {
      setToken(storedToken);
      fetchAccounts(storedToken);
      fetchPosts(storedToken);
    }
  }, []);

  const fetchAccounts = async (authToken: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/social-media/accounts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async (authToken: string) => {
    try {
      const response = await fetch('/api/admin/social-media/posts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPosts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
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
          content: { text: newPostText },
          platforms: selectedPlatforms,
          status: scheduledDate ? 'scheduled' : 'draft',
          scheduledFor: scheduledDate || null,
        }),
      });

      if (response.ok) {
        setNewPostText('');
        setSelectedPlatforms([]);
        setScheduledDate('');
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
        <AdminSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-white text-2xl">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900">
      <AdminSidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Social Media Manager</h1>
            <p className="text-slate-400">Manage your social media accounts and posts from one place</p>
          </div>

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
                          // This will be replaced with OAuth integration
                          alert(`Redirect to ${platform} OAuth flow`);
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

                {/* Text Input */}
                <div className="mb-6">
                  <label className="block text-slate-300 font-semibold mb-3">Post Content</label>
                  <textarea
                    value={newPostText}
                    onChange={(e) => setNewPostText(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full bg-slate-700 text-white p-4 rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none resize-none h-32"
                  />
                  <p className="text-slate-400 text-sm mt-2">{newPostText.length}/500 characters</p>
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
                  disabled={postLoading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {postLoading ? 'Creating...' : 'Create & Post'}
                </button>
              </div>

              {/* Posts List */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Recent Posts</h2>
                <div className="space-y-4">
                  {posts.map(post => (
                    <div
                      key={post._id}
                      className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-slate-600 transition"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-white mb-3">{post.content.text}</p>
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
                      <p className="text-slate-400 text-sm">
                        {post.status === 'scheduled'
                          ? `Scheduled for: ${new Date(post.scheduledFor || '').toLocaleString()}`
                          : `Created: ${new Date(post.createdAt).toLocaleString()}`}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Analytics Coming Soon</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {accounts.map(account => (
                  <div
                    key={account._id}
                    className="bg-slate-800 rounded-lg p-6 border border-slate-700"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{platformConfig[account.platform].icon}</span>
                      <h3 className="text-white font-bold capitalize">{account.platform}</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-slate-400 text-sm">Total Followers</p>
                        <p className="text-white text-2xl font-bold">{account.metadata.followers || 0}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-sm">Total Posts</p>
                        <p className="text-white text-2xl font-bold">{account.metadata.postsCount || 0}</p>
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
