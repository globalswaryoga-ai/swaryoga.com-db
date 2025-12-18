'use client';

import React, { useState } from 'react';
import AnnouncementCreator from '@/components/AnnouncementCreator';
import CommunityFeed from '@/components/CommunityFeed';
import MemberManager from '@/components/MemberManager';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface TabType {
  id: string;
  label: string;
  icon: string;
}

export default function CommunityDashboard() {
  const [activeTab, setActiveTab] = useState<string>('feed');

  const tabs: TabType[] = [
    { id: 'feed', label: 'Community Feed', icon: '💬' },
    { id: 'announcements', label: 'Create Announcement', icon: '📢' },
    { id: 'members', label: 'Member Management', icon: '👥' },
  ];

  const communityStats = {
    totalMembers: 487,
    activeMembers: 312,
    totalPosts: 1243,
    engagementRate: 78,
    communityHealth: 'Excellent',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />

      <div className="flex-1 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Dashboard</h1>
          <p className="text-gray-600">Build connections, share experiences, and grow together</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yoga-600">
            <p className="text-sm text-gray-600">Total Members</p>
            <p className="text-2xl font-bold text-gray-900">{communityStats.totalMembers}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Active Members</p>
            <p className="text-2xl font-bold text-green-600">{communityStats.activeMembers}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total Posts</p>
            <p className="text-2xl font-bold text-blue-600">{communityStats.totalPosts}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-purple-500">
            <p className="text-sm text-gray-600">Engagement Rate</p>
            <p className="text-2xl font-bold text-purple-600">{communityStats.engagementRate}%</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <p className="text-sm text-gray-600">Community Health</p>
            <p className="text-2xl font-bold text-yellow-600">{communityStats.communityHealth}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'text-yoga-600 border-b-2 border-yoga-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm p-6 min-h-[500px]">
          {activeTab === 'feed' && <CommunityFeed />}
          {activeTab === 'announcements' && <AnnouncementCreator />}
          {activeTab === 'members' && <MemberManager />}
        </div>

        {/* Community Features */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
            <h3 className="text-lg font-bold text-blue-900 mb-2">💬 Connect & Share</h3>
            <p className="text-sm text-blue-800 mb-3">Share your yoga journey, ask questions, and get support from the community.</p>
            <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors">
              Start a Discussion
            </button>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-200">
            <h3 className="text-lg font-bold text-green-900 mb-2">📅 Join Events</h3>
            <p className="text-sm text-green-800 mb-3">Participate in group yoga sessions, challenges, and community events.</p>
            <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-colors">
              View Upcoming Events
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border-2 border-purple-200">
            <h3 className="text-lg font-bold text-purple-900 mb-2">🌟 Earn Badges</h3>
            <p className="text-sm text-purple-800 mb-3">Complete milestones and earn community recognition badges.</p>
            <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors">
              View Badges
            </button>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="mt-8 bg-gradient-to-r from-yoga-50 to-yoga-100 p-6 rounded-lg border-2 border-yoga-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 Community Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-gray-900 mb-3">Member Growth</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>This Month</span>
                  <span className="font-bold">+45 members</span>
                </div>
                <div className="w-full h-2 bg-gray-300 rounded-full">
                  <div className="h-full w-3/4 bg-yoga-600 rounded-full" />
                </div>

                <div className="flex justify-between text-sm mt-3">
                  <span>This Year</span>
                  <span className="font-bold">+487 members</span>
                </div>
                <div className="w-full h-2 bg-gray-300 rounded-full">
                  <div className="h-full w-full bg-yoga-600 rounded-full" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-3">Activity Distribution</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">High Engagement (70%+)</span>
                  <span className="text-sm font-bold bg-green-100 px-2 py-1 rounded">156 members</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Medium Engagement (30-70%)</span>
                  <span className="text-sm font-bold bg-yellow-100 px-2 py-1 rounded">248 members</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Low Engagement (&lt;30%)</span>
                  <span className="text-sm font-bold bg-red-100 px-2 py-1 rounded">83 members</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Community Rules */}
        <div className="mt-8 bg-gray-100 p-6 rounded-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Community Guidelines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="font-bold text-gray-900">Be Respectful</p>
                <p className="text-sm text-gray-600">Treat all members with kindness and respect</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">💪</span>
              <div>
                <p className="font-bold text-gray-900">Stay Positive</p>
                <p className="text-sm text-gray-600">Share encouraging words and support others</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🛡️</span>
              <div>
                <p className="font-bold text-gray-900">Protect Privacy</p>
                <p className="text-sm text-gray-600">Don't share personal information publicly</p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🚫</span>
              <div>
                <p className="font-bold text-gray-900">No Spam</p>
                <p className="text-sm text-gray-600">No promotional content or spam messages</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <button className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <p className="text-2xl mb-2">📚</p>
            <p className="font-bold text-gray-900">Learning Resources</p>
          </button>

          <button className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <p className="text-2xl mb-2">🎯</p>
            <p className="font-bold text-gray-900">Member Goals</p>
          </button>

          <button className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <p className="text-2xl mb-2">🏆</p>
            <p className="font-bold text-gray-900">Leaderboard</p>
          </button>

          <button className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <p className="text-2xl mb-2">💬</p>
            <p className="font-bold text-gray-900">Support</p>
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
