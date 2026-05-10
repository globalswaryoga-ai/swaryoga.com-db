'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  studentName: string;
  totalWatchTime: number;
  coursesCompleted: number;
  totalPoints: number;
  badges: string[];
  isCurrentUser?: boolean;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedDate?: string;
  points: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userBadges, setUserBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [tab, setTab] = useState<'leaderboard' | 'badges'>('leaderboard');
  const [courseFilter, setCourseFilter] = useState('all');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setError('Please log in');
      setLoading(false);
      return;
    }
    setToken(storedToken);
    fetchLeaderboard(storedToken);
    fetchBadges(storedToken);
  }, []);

  async function fetchLeaderboard(authToken: string) {
    try {
      const response = await fetch(`/api/leaderboard?course=${courseFilter}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to load leaderboard');

      const { data } = await response.json();
      setLeaderboard(data);
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function fetchBadges(authToken: string) {
    try {
      const response = await fetch('/api/user/badges', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to load badges');

      const { data } = await response.json();
      setUserBadges(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-yellow-400"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-white mb-4">Please log in to view leaderboard</p>
            <Link href="/signin" className="bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-6 py-2 rounded-lg font-semibold border-2 border-green-500 transition-all">
              Go to Sign In
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const earnedBadges = userBadges.filter((b) => b.earned);
  const totalBadgePoints = earnedBadges.reduce((sum, b) => sum + b.points, 0);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navigation />

      {/* Hero */}
      <div className="bg-black border-b-2 border-green-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-2 text-yellow-400">🏆 Leaderboard & Badges</h1>
          <p className="text-green-400">Compete and unlock achievements</p>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="bg-red-950 border-2 border-red-500 text-red-200 px-4 py-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b-2 border-green-500">
          <button
            onClick={() => setTab('leaderboard')}
            className={`px-6 py-3 font-bold border-b-2 transition-all ${
              tab === 'leaderboard'
                ? 'text-yellow-400 border-yellow-400'
                : 'text-green-400 border-transparent hover:border-green-500'
            }`}
          >
            🏅 Leaderboard
          </button>
          <button
            onClick={() => setTab('badges')}
            className={`px-6 py-3 font-bold border-b-2 transition-all ${
              tab === 'badges'
                ? 'text-yellow-400 border-yellow-400'
                : 'text-green-400 border-transparent hover:border-green-500'
            }`}
          >
            🎖️ Badges ({earnedBadges.length})
          </button>
        </div>

        {/* Leaderboard Tab */}
        {tab === 'leaderboard' && (
          <div>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Your Rank</p>
                <p className="text-3xl font-bold text-yellow-400">
                  #{leaderboard.find((e) => e.isCurrentUser)?.rank || '-'}
                </p>
              </div>
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Your Points</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {leaderboard.find((e) => e.isCurrentUser)?.totalPoints || 0}
                </p>
              </div>
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Courses Completed</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {leaderboard.find((e) => e.isCurrentUser)?.coursesCompleted || 0}
                </p>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-black border-2 border-green-500 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-green-900 border-b-2 border-green-500">
                      <th className="px-4 py-3 text-left text-yellow-400">Rank</th>
                      <th className="px-4 py-3 text-left text-yellow-400">Student</th>
                      <th className="px-4 py-3 text-left text-yellow-400">Watch Time</th>
                      <th className="px-4 py-3 text-left text-yellow-400">Courses</th>
                      <th className="px-4 py-3 text-left text-yellow-400">Points</th>
                      <th className="px-4 py-3 text-left text-yellow-400">Badges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, idx) => (
                      <tr
                        key={entry.userId}
                        className={`border-b border-green-500 hover:bg-green-900/30 transition-all ${
                          entry.isCurrentUser ? 'bg-yellow-400/10 font-bold' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-yellow-400 font-bold">
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '#'}
                            {entry.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white">
                          {entry.studentName}
                          {entry.isCurrentUser && <span className="text-green-400 ml-2">(You)</span>}
                        </td>
                        <td className="px-4 py-3 text-green-400">
                          {Math.floor(entry.totalWatchTime / 3600)}h
                        </td>
                        <td className="px-4 py-3 text-green-400">{entry.coursesCompleted}</td>
                        <td className="px-4 py-3 text-yellow-400 font-bold">{entry.totalPoints}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {entry.badges.slice(0, 3).map((badge, idx) => (
                              <span key={idx} className="text-lg">{badge}</span>
                            ))}
                            {entry.badges.length > 3 && (
                              <span className="text-green-400 text-sm">+{entry.badges.length - 3}</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Badges Tab */}
        {tab === 'badges' && (
          <div>
            {/* Badge Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Badges Earned</p>
                <p className="text-3xl font-bold text-yellow-400">{earnedBadges.length}</p>
              </div>
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Total Badge Points</p>
                <p className="text-3xl font-bold text-yellow-400">{totalBadgePoints}</p>
              </div>
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Available</p>
                <p className="text-3xl font-bold text-yellow-400">{userBadges.length}</p>
              </div>
            </div>

            {/* Badges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {userBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`border-2 rounded-lg p-4 text-center transition-all ${
                    badge.earned
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-green-500 bg-black opacity-60'
                  }`}
                >
                  <div className="text-5xl mb-2 opacity-75">{badge.icon}</div>
                  <h3 className={`font-bold mb-1 ${badge.earned ? 'text-yellow-400' : 'text-green-400'}`}>
                    {badge.name}
                  </h3>
                  <p className="text-xs text-green-400 mb-2">{badge.description}</p>
                  <p className="text-sm font-bold text-yellow-400 mb-2">+{badge.points} pts</p>
                  {badge.earned ? (
                    <p className="text-xs text-green-400">
                      ✓ Earned {badge.earnedDate ? new Date(badge.earnedDate).toLocaleDateString() : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500">Locked</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
