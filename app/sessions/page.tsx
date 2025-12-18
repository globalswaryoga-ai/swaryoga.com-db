'use client';

import React, { useState, useEffect } from 'react';
import SessionCard from '@/components/SessionCard';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface Session {
  _id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  instructor: string;
  duration: number;
  thumbnail: string;
  price: number;
  average_rating: number;
  views: number;
  tags: string[];
  is_featured: boolean;
}

export default function SessionLibrary() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 12;

  useEffect(() => {
    fetchSessions();
  }, [category, level, search, page]);

  async function fetchSessions() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (category) params.append('category', category);
      if (level) params.append('level', level);
      if (search) params.append('search', search);

      const response = await fetch(`/api/sessions?${params.toString()}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!response.ok) throw new Error('Failed to fetch sessions');

      const { data, pagination } = await response.json();
      setSessions(data);
      setTotal(pagination.total);
      setError('');
    } catch (err: any) {
      setError(err.message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  function handlePurchase(sessionId: string) {
    // Will redirect to purchase flow - implemented next
    console.log('Purchase session:', sessionId);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-yoga-600 to-yoga-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">🎥 Recorded Sessions Library</h1>
          <p className="text-yoga-100 text-lg">
            Learn from expert instructors at your own pace. Access hundreds of recorded sessions anytime, anywhere.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <input
                type="text"
                placeholder="Search sessions..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="yoga">Yoga</option>
                <option value="pranayama">Pranayama</option>
                <option value="meditation">Meditation</option>
                <option value="workshop">Workshop</option>
                <option value="health">Health</option>
                <option value="lifestyle">Lifestyle</option>
              </select>
            </div>

            {/* Level Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Level</label>
              <select
                value={level}
                onChange={(e) => {
                  setLevel(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="all-levels">All Levels</option>
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setCategory('');
                  setLevel('');
                  setSearch('');
                  setPage(1);
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing <span className="font-bold">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-bold">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-bold">{total}</span> sessions
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg mb-6">
            ❌ Error: {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-yoga-200 border-t-yoga-600"></div>
          </div>
        )}

        {/* Sessions Grid */}
        {!loading && sessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {sessions.map((session) => (
              <SessionCard key={session._id} session={session} onPurchase={handlePurchase} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && sessions.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🔍</span>
            <p className="text-xl text-gray-600">No sessions found</p>
            <p className="text-gray-500 mt-2">Try adjusting your filters</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && sessions.length > 0 && (
          <div className="flex justify-center items-center gap-2 py-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-yoga-600 text-yoga-600 rounded-lg hover:bg-yoga-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <div className="flex gap-1">
              {[...Array(Math.ceil(total / limit))].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-2 rounded-lg font-semibold transition-colors ${
                    page === i + 1
                      ? 'bg-yoga-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => setPage(Math.min(Math.ceil(total / limit), page + 1))}
              disabled={page >= Math.ceil(total / limit)}
              className="px-4 py-2 border border-yoga-600 text-yoga-600 rounded-lg hover:bg-yoga-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
