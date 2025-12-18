'use client';

import React, { useState, useEffect } from 'react';
import PostCreator from '@/components/PostCreator';
import SocialAccountsManager from '@/components/SocialAccountsManager';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface Analytics {
  total_posts: number;
  total_platforms: number;
  by_platform: Record<
    string,
    {
      posts: number;
      views: number;
      likes: number;
      comments: number;
      shares: number;
      clicks: number;
      avg_engagement_rate: number;
    }
  >;
  totals: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    engagement_rate: number;
  };
}

export default function SocialMediaDashboard() {
  const [tab, setTab] = useState<'create' | 'accounts' | 'analytics'>('create');
  const [token, setToken] = useState('');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setError('Please log in');
      return;
    }
    setToken(storedToken);
    if (tab === 'analytics') {
      fetchAnalytics(storedToken);
    }
  }, [tab]);

  async function fetchAnalytics(authToken: string) {
    try {
      setLoadingAnalytics(true);
      const response = await fetch('/api/social/analytics/summary', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-700 mb-4">Please log in to access social media tools</p>
            <Link
              href="/signin"
              className="bg-yoga-600 hover:bg-yoga-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />

      {/* Hero */}
      <div className="bg-gradient-to-r from-yoga-600 to-yoga-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">📱 Social Media Auto-Poster</h1>
          <p className="text-yoga-100">Post to all platforms with one click</p>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white rounded-lg shadow p-1">
          {(['create', 'accounts', 'analytics'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors capitalize ${
                tab === t
                  ? 'bg-yoga-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {t === 'create' && '✍️ Create'}
              {t === 'accounts' && '🔗 Accounts'}
              {t === 'analytics' && '📊 Analytics'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'create' && token && <PostCreator token={token} />}

        {tab === 'accounts' && token && <SocialAccountsManager token={token} />}

        {tab === 'analytics' && (
          <div>
            {loadingAnalytics ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-yoga-200 border-t-yoga-600"></div>
              </div>
            ) : analytics?.total_posts === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <span className="text-6xl mb-4 block">📊</span>
                <p className="text-xl text-gray-600 mb-2">No posts yet</p>
                <p className="text-gray-500 mb-6">Start creating and posting to see analytics</p>
                <button
                  onClick={() => setTab('create')}
                  className="bg-yoga-600 hover:bg-yoga-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  Create Your First Post
                </button>
              </div>
            ) : analytics ? (
              <div>
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm mb-2">Total Posts</p>
                    <p className="text-3xl font-bold text-yoga-600">{analytics.total_posts}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm mb-2">Total Views</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {(analytics.totals.views / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm mb-2">Total Likes</p>
                    <p className="text-3xl font-bold text-red-600">
                      {(analytics.totals.likes / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm mb-2">Total Engagement</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {analytics.totals.engagement_rate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-gray-600 text-sm mb-2">Active Platforms</p>
                    <p className="text-3xl font-bold text-green-600">{analytics.total_platforms}</p>
                  </div>
                </div>

                {/* Platform Breakdown */}
                {Object.keys(analytics.by_platform).length > 0 && (
                  <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
                    <h3 className="text-xl font-bold mb-6">📈 By Platform</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Object.entries(analytics.by_platform).map(([platform, stats]) => (
                        <div key={platform} className="border border-gray-200 rounded-lg p-4">
                          <p className="font-bold text-lg capitalize mb-4">{platform}</p>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Posts</span>
                              <span className="font-semibold">{stats.posts}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Views</span>
                              <span className="font-semibold">{stats.views.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Likes</span>
                              <span className="font-semibold">{stats.likes.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Comments</span>
                              <span className="font-semibold">{stats.comments.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Shares</span>
                              <span className="font-semibold">{stats.shares.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-gray-600 font-semibold">Engagement</span>
                              <span className="font-bold text-yoga-600">
                                {stats.avg_engagement_rate.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
