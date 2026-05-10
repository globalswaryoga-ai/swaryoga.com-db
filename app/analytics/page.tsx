'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  progress: number;
  totalWatchTime: number;
  videosWatched: number;
  totalVideos: number;
  averageWatchTimePerVideo: number;
  completionRate: number;
  daysActive: number;
  lastWatchedDate: string;
  watchTimePerDay: { date: string; minutes: number }[];
  videoWatchStats: { videoTitle: string; watchedSeconds: number; completedWatch: boolean }[];
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<CourseAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseAnalytics | null>(null);
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setError('Please log in to view analytics');
      setLoading(false);
      return;
    }
    setToken(storedToken);
    fetchAnalytics(storedToken);
  }, []);

  async function fetchAnalytics(authToken: string) {
    try {
      setLoading(true);
      const response = await fetch(`/api/user/analytics?timeframe=${timeframe}`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to load analytics');

      const { data } = await response.json();
      setAnalytics(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
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
            <p className="text-xl text-white mb-4">Please log in to view your analytics</p>
            <Link
              href="/signin"
              className="bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-6 py-2 rounded-lg font-semibold border-2 border-green-500 transition-all duration-300"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const totalWatchTime = analytics.reduce((sum, c) => sum + c.totalWatchTime, 0);
  const averageProgress = analytics.length > 0
    ? Math.round(analytics.reduce((sum, c) => sum + c.progress, 0) / analytics.length)
    : 0;
  const totalVideosWatched = analytics.reduce((sum, c) => sum + c.videosWatched, 0);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Navigation />

      {/* Hero */}
      <div className="bg-black border-b-2 border-green-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-2 text-yellow-400">📊 Learning Analytics</h1>
          <p className="text-green-400">Track your progress and learning insights</p>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="bg-red-950 border-2 border-red-500 text-red-200 px-4 py-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {analytics.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">📈</span>
            <p className="text-xl text-white mb-4">No analytics data yet</p>
            <p className="text-green-400 mb-6">Start learning to see your analytics</p>
            <Link
              href="/my-sessions"
              className="bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-6 py-2 rounded-lg font-semibold border-2 border-green-500 transition-all duration-300"
            >
              View My Courses
            </Link>
          </div>
        ) : (
          <div>
            {/* Timeframe Filter */}
            <div className="bg-black border-2 border-green-500 p-4 rounded-lg mb-8">
              <p className="text-yellow-400 font-bold mb-3">Time Period</p>
              <div className="flex gap-3">
                {(['week', 'month', 'all'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => {
                      setTimeframe(period);
                      fetchAnalytics(token);
                    }}
                    className={`px-4 py-2 rounded-lg font-semibold border-2 transition-all duration-300 ${
                      timeframe === period
                        ? 'bg-yellow-400 text-black border-yellow-400'
                        : 'bg-transparent text-green-400 border-green-500 hover:bg-green-900'
                    }`}
                  >
                    {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time'}
                  </button>
                ))}
              </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Total Watch Time</p>
                <p className="text-3xl font-bold text-yellow-400">{Math.floor(totalWatchTime / 3600)}h</p>
                <p className="text-xs text-green-400 mt-2">{(totalWatchTime % 3600) / 60 | 0}m</p>
              </div>
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Average Progress</p>
                <p className="text-3xl font-bold text-yellow-400">{averageProgress}%</p>
              </div>
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Videos Watched</p>
                <p className="text-3xl font-bold text-yellow-400">{totalVideosWatched}</p>
              </div>
              <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                <p className="text-green-400 text-sm">Active Days</p>
                <p className="text-3xl font-bold text-yellow-400">
                  {analytics.reduce((max, c) => Math.max(max, c.daysActive), 0)}
                </p>
              </div>
            </div>

            {/* Course Analytics Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {analytics.map((course) => (
                <div
                  key={course.courseId}
                  className="bg-black border-2 border-green-500 rounded-lg overflow-hidden group hover:border-yellow-400 hover:shadow-xl hover:shadow-green-500/50 transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedCourse(course)}
                >
                  <div className="p-6">
                    <h3 className="font-bold text-yellow-400 mb-4 line-clamp-2">
                      {course.courseTitle}
                    </h3>

                    {/* Progress Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between mb-2">
                        <span className="text-green-400 text-sm">Progress</span>
                        <span className="text-white font-bold">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-green-900 rounded-full h-3 border border-green-500 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-500 to-yellow-400 h-full transition-all"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-green-500">
                      <div>
                        <p className="text-green-400 text-xs">Watch Time</p>
                        <p className="text-white font-bold">
                          {Math.floor(course.totalWatchTime / 60)}m
                        </p>
                      </div>
                      <div>
                        <p className="text-green-400 text-xs">Avg/Video</p>
                        <p className="text-white font-bold">
                          {Math.floor(course.averageWatchTimePerVideo / 60)}m
                        </p>
                      </div>
                      <div>
                        <p className="text-green-400 text-xs">Videos</p>
                        <p className="text-white font-bold">
                          {course.videosWatched}/{course.totalVideos}
                        </p>
                      </div>
                      <div>
                        <p className="text-green-400 text-xs">Days Active</p>
                        <p className="text-white font-bold">{course.daysActive}</p>
                      </div>
                    </div>

                    {/* Completion Rate Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-400">
                        Last watched: {new Date(course.lastWatchedDate).toLocaleDateString()}
                      </span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        course.completionRate >= 100
                          ? 'bg-yellow-400 text-black'
                          : course.completionRate >= 75
                          ? 'bg-green-600 text-white'
                          : 'bg-green-900 text-green-400'
                      }`}>
                        {course.completionRate}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Course Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-black border-2 border-green-500 rounded-lg max-w-2xl w-full my-8">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-yellow-400">{selectedCourse.courseTitle}</h2>
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="text-green-400 hover:text-yellow-400 text-2xl font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Main Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-900/30 border border-green-500 p-4 rounded">
                  <p className="text-green-400 text-sm">Total Watch Time</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {Math.floor(selectedCourse.totalWatchTime / 3600)}h {((selectedCourse.totalWatchTime % 3600) / 60) | 0}m
                  </p>
                </div>
                <div className="bg-green-900/30 border border-green-500 p-4 rounded">
                  <p className="text-green-400 text-sm">Average Per Video</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {Math.floor(selectedCourse.averageWatchTimePerVideo / 60)}m
                  </p>
                </div>
                <div className="bg-green-900/30 border border-green-500 p-4 rounded">
                  <p className="text-green-400 text-sm">Videos Watched</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {selectedCourse.videosWatched}/{selectedCourse.totalVideos}
                  </p>
                </div>
                <div className="bg-green-900/30 border border-green-500 p-4 rounded">
                  <p className="text-green-400 text-sm">Days Active</p>
                  <p className="text-2xl font-bold text-yellow-400">{selectedCourse.daysActive}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="mb-6">
                <p className="text-green-400 text-sm mb-2">Overall Progress</p>
                <div className="w-full bg-green-900 rounded-full h-4 border-2 border-green-500 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-green-500 to-yellow-400 h-full"
                    style={{ width: `${selectedCourse.progress}%` }}
                  ></div>
                </div>
                <p className="text-right text-white font-bold mt-2">{selectedCourse.progress}%</p>
              </div>

              {/* Video Stats */}
              {selectedCourse.videoWatchStats && selectedCourse.videoWatchStats.length > 0 && (
                <div>
                  <h3 className="text-yellow-400 font-bold mb-4">Video Watch Stats</h3>
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {selectedCourse.videoWatchStats.map((video, idx) => (
                      <div key={idx} className="bg-green-900/20 border border-green-500 p-3 rounded flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-white text-sm line-clamp-1">{video.videoTitle}</p>
                          <p className="text-green-400 text-xs">{Math.floor(video.watchedSeconds / 60)}m watched</p>
                        </div>
                        {video.completedWatch && (
                          <span className="bg-yellow-400 text-black px-2 py-1 rounded text-xs font-bold">✓ Done</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setSelectedCourse(null)}
                className="w-full mt-6 bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-2 rounded font-semibold border-2 border-green-500 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
