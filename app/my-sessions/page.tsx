'use client';

import React, { useState, useEffect } from 'react';
import SessionPlayer from '@/components/SessionPlayer';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';

interface Purchase {
  purchase_id: string;
  session: {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    duration: number;
    category: string;
    level: string;
    instructor: string;
  };
  purchase_date: string;
  progress: {
    watched_duration: number;
    total_duration: number;
    is_completed: boolean;
    last_watched: string;
    last_position: number;
    percentage_watched: number;
  };
}

export default function MySessionsPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState<Purchase | null>(null);
  const [token, setToken] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'progress' | 'date' | 'title'>('progress');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      setError('Please log in to view your sessions');
      setLoading(false);
      return;
    }
    setToken(storedToken);
    fetchPurchases(storedToken);
  }, []);

  async function fetchPurchases(authToken: string) {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions/user/purchased', {
        headers: { 'Authorization': `Bearer ${authToken}` },
      });

      if (!response.ok) throw new Error('Failed to load sessions');

      const { data } = await response.json();
      setPurchases(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadCertificate(purchaseId: string) {
    try {
      const response = await fetch(`/api/recorded-courses/certificate/${purchaseId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.message || 'Failed to download certificate');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${new Date().getTime()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download certificate');
    }
  }

  const getFilteredAndSortedCourses = () => {
    let filtered = purchases;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((p) =>
        p.session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.session.instructor.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter((p) => p.session.category === filterCategory);
    }

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === 'progress') {
        return b.progress.percentage_watched - a.progress.percentage_watched;
      } else if (sortBy === 'date') {
        return new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime();
      } else {
        return a.session.title.localeCompare(b.session.title);
      }
    });
  };

  const categories = ['all', ...new Set(purchases.map((p) => p.session.category))];
  const completedCourses = purchases.filter((p) => p.progress.is_completed).length;
  const filteredCourses = getFilteredAndSortedCourses();

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
            <p className="text-xl text-white mb-4">Please log in to view your sessions</p>
            <Link
              href="/signin"
              className="bg-green-600 hover:bg-green-700 text-black px-6 py-2 rounded-lg font-semibold border-2 border-green-500 transition-all duration-300"
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
    <div className="min-h-screen bg-black flex flex-col">
      <Navigation />

      {/* Hero */}
      <div className="bg-black border-b-2 border-green-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-5xl font-bold mb-2 text-yellow-400">📚 My Learning Dashboard</h1>
          <p className="text-green-400">Continue your learning journey</p>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="bg-red-950 border-2 border-red-500 text-red-200 px-4 py-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {/* If Viewing Session */}
        {selectedSession && (
          <div className="mb-8">
            <button
              onClick={() => setSelectedSession(null)}
              className="text-green-400 hover:text-yellow-400 font-semibold mb-4 transition-colors duration-300"
            >
              ← Back to My Courses
            </button>

            {/* Video Player */}
            <div className="mb-8">
              <SessionPlayer
                sessionId={selectedSession.session.id}
                videoUrl={`/api/sessions/${selectedSession.session.id}/video`}
                title={selectedSession.session.title}
                duration={selectedSession.session.duration}
                token={token}
              />
            </div>

            {/* Session Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <h1 className="text-3xl font-bold text-yellow-400 mb-4">
                  {selectedSession.session.title}
                </h1>
                <p className="text-white mb-6">{selectedSession.session.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-black border-2 border-green-500 p-4 rounded-lg">
                    <p className="text-green-400 text-sm">Instructor</p>
                    <p className="font-bold text-white">{selectedSession.session.instructor}</p>
                  </div>
                  <div className="bg-black border-2 border-green-500 p-4 rounded-lg">
                    <p className="text-green-400 text-sm">Duration</p>
                    <p className="font-bold text-white">{selectedSession.session.duration} min</p>
                  </div>
                  <div className="bg-black border-2 border-green-500 p-4 rounded-lg">
                    <p className="text-green-400 text-sm">Level</p>
                    <p className="font-bold text-white capitalize">{selectedSession.session.level}</p>
                  </div>
                  <div className="bg-black border-2 border-green-500 p-4 rounded-lg">
                    <p className="text-green-400 text-sm">Category</p>
                    <p className="font-bold text-white capitalize">{selectedSession.session.category}</p>
                  </div>
                </div>
              </div>

              {/* Progress Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-black border-2 border-green-500 rounded-lg p-6 sticky top-4">
                  <h3 className="font-bold text-lg text-yellow-400 mb-4">Your Progress</h3>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold text-white">
                        {selectedSession.progress.percentage_watched}% Watched
                      </span>
                      {selectedSession.progress.is_completed && (
                        <span className="text-green-400 font-bold">✅ Completed</span>
                      )}
                    </div>
                    <div className="w-full bg-green-900 rounded-full h-3 overflow-hidden border border-green-500">
                      <div
                        className="bg-green-500 h-full transition-all duration-300"
                        style={{ width: `${selectedSession.progress.percentage_watched}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3 mb-6 pb-6 border-b border-green-500">
                    <div className="flex justify-between">
                      <span className="text-green-400">Watched</span>
                      <span className="font-bold text-white">
                        {Math.floor(selectedSession.progress.watched_duration / 60)} min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-400">Remaining</span>
                      <span className="font-bold text-white">
                        {Math.floor(
                          (selectedSession.progress.total_duration -
                            selectedSession.progress.watched_duration) /
                            60
                        )}{' '}
                        min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-400">Last watched</span>
                      <span className="font-bold text-white text-sm">
                        {new Date(selectedSession.progress.last_watched).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {selectedSession.progress.is_completed && (
                    <div className="bg-black border-2 border-yellow-400 p-4 rounded-lg mb-6">
                      <p className="font-bold text-yellow-400 mb-3">🎉 Course Completed!</p>
                      <button
                        onClick={() => downloadCertificate(selectedSession.purchase_id)}
                        className="w-full bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-4 py-2 rounded font-semibold border-2 border-green-500 transition-all duration-300"
                      >
                        📜 Download Certificate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* If Not Viewing Session */}
        {!selectedSession && (
          <>
            {purchases.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🛍️</span>
                <p className="text-xl text-white mb-4">No courses yet</p>
                <p className="text-green-400 mb-6">Explore our library and enroll in your first course</p>
                <Link
                  href="/sessions"
                  className="bg-green-600 hover:bg-yellow-400 hover:text-black text-white px-6 py-2 rounded-lg font-semibold border-2 border-green-500 transition-all duration-300"
                >
                  Browse Sessions
                </Link>
              </div>
            ) : (
              <div>
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                    <p className="text-green-400 text-sm">Total Courses</p>
                    <p className="text-3xl font-bold text-yellow-400">{purchases.length}</p>
                  </div>
                  <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                    <p className="text-green-400 text-sm">Completed</p>
                    <p className="text-3xl font-bold text-yellow-400">{completedCourses}</p>
                  </div>
                  <div className="bg-black border-2 border-green-500 p-6 rounded-lg">
                    <p className="text-green-400 text-sm">In Progress</p>
                    <p className="text-3xl font-bold text-yellow-400">{purchases.length - completedCourses}</p>
                  </div>
                </div>

                {/* Search & Filters */}
                <div className="bg-black border-2 border-green-500 p-6 rounded-lg mb-8">
                  <h2 className="text-yellow-400 font-bold text-lg mb-4">Search & Filter</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <input
                      type="text"
                      placeholder="Search courses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-black border-2 border-green-500 text-white placeholder-green-600 px-4 py-2 rounded-lg focus:outline-none focus:border-yellow-400 transition-colors duration-300"
                    />

                    {/* Sort */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-black border-2 border-green-500 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-yellow-400 transition-colors duration-300"
                    >
                      <option value="progress">Sort by Progress</option>
                      <option value="date">Sort by Date</option>
                      <option value="title">Sort by Title</option>
                    </select>

                    {/* Category Filter */}
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="bg-black border-2 border-green-500 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-yellow-400 transition-colors duration-300"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Course Grid */}
                <p className="text-white mb-6">
                  Showing <span className="text-yellow-400 font-bold">{filteredCourses.length}</span> course(s)
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCourses.map((purchase) => (
                    <div
                      key={purchase.purchase_id}
                      className="bg-black border-2 border-green-500 rounded-lg overflow-hidden cursor-pointer group hover:border-yellow-400 hover:shadow-xl hover:shadow-green-500/50 transition-all duration-300"
                      onClick={() => setSelectedSession(purchase)}
                    >
                      {/* Thumbnail */}
                      <div className="relative h-40 bg-green-900 overflow-hidden">
                        {purchase.session.thumbnail && (
                          <img
                            src={purchase.session.thumbnail}
                            alt={purchase.session.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        )}
                        {!purchase.session.thumbnail && (
                          <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-bold text-yellow-400 mb-2 line-clamp-2 group-hover:text-white transition-colors duration-300">
                          {purchase.session.title}
                        </h3>

                        {/* Progress */}
                        <div className="mb-3">
                          <div className="flex justify-between mb-1 text-sm">
                            <span className="text-green-400">Progress</span>
                            <span className="font-bold text-white">{purchase.progress.percentage_watched}%</span>
                          </div>
                          <div className="w-full bg-green-900 rounded-full h-2 border border-green-500">
                            <div
                              className={`h-full rounded-full transition-all ${
                                purchase.progress.is_completed ? 'bg-yellow-400' : 'bg-green-500'
                              }`}
                              style={{ width: `${purchase.progress.percentage_watched}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Meta Info */}
                        <div className="space-y-2 text-sm mb-3 pb-3 border-b border-green-500">
                          <div className="flex items-center justify-between">
                            <span className="text-green-400">👨‍🏫 {purchase.session.instructor}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-green-400">⏱️ {purchase.session.duration} min</span>
                            <span className="text-green-400">📂 {purchase.session.category}</span>
                          </div>
                        </div>

                        {/* Completion Badge */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-green-400">
                            Last watched: {new Date(purchase.progress.last_watched).toLocaleDateString()}
                          </span>
                          {purchase.progress.is_completed && (
                            <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold">✅ Done</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredCourses.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-white mb-2">No courses found</p>
                    <p className="text-green-400">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
