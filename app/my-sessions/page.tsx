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

  useEffect(() => {
    // Get token from localStorage
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-yoga-200 border-t-yoga-600"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-700 mb-4">Please log in to view your sessions</p>
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
          <h1 className="text-4xl font-bold mb-2">📚 My Courses</h1>
          <p className="text-yoga-100">Continue learning or start a new session</p>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-4 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {/* If Viewing Session */}
        {selectedSession && (
          <div className="mb-8">
            <button
              onClick={() => setSelectedSession(null)}
              className="text-yoga-600 hover:text-yoga-700 font-semibold mb-4"
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
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {selectedSession.session.title}
                </h1>
                <p className="text-gray-600 mb-6">{selectedSession.session.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-gray-600 text-sm">Instructor</p>
                    <p className="font-bold">{selectedSession.session.instructor}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-gray-600 text-sm">Duration</p>
                    <p className="font-bold">{selectedSession.session.duration} min</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-gray-600 text-sm">Level</p>
                    <p className="font-bold capitalize">{selectedSession.session.level}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <p className="text-gray-600 text-sm">Category</p>
                    <p className="font-bold capitalize">{selectedSession.session.category}</p>
                  </div>
                </div>
              </div>

              {/* Progress Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4">
                  <h3 className="font-bold text-lg mb-4">Your Progress</h3>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">
                        {selectedSession.progress.percentage_watched}% Watched
                      </span>
                      {selectedSession.progress.is_completed && (
                        <span className="text-green-600 font-bold">✅ Completed</span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-green-500 h-full transition-all duration-300"
                        style={{ width: `${selectedSession.progress.percentage_watched}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-3 mb-6 pb-6 border-b">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Watched</span>
                      <span className="font-bold">
                        {Math.floor(selectedSession.progress.watched_duration / 60)} min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining</span>
                      <span className="font-bold">
                        {Math.floor(
                          (selectedSession.progress.total_duration -
                            selectedSession.progress.watched_duration) /
                            60
                        )}{' '}
                        min
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last watched</span>
                      <span className="font-bold text-sm">
                        {new Date(selectedSession.progress.last_watched).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {selectedSession.progress.is_completed && (
                    <div className="bg-green-50 p-4 rounded-lg mb-6">
                      <p className="font-bold text-green-900 mb-2">🎉 Course Completed!</p>
                      <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold">
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
                <p className="text-xl text-gray-600 mb-4">No courses yet</p>
                <p className="text-gray-500 mb-6">Explore our library and enroll in your first course</p>
                <Link
                  href="/sessions"
                  className="bg-yoga-600 hover:bg-yoga-700 text-white px-6 py-2 rounded-lg font-semibold"
                >
                  Browse Sessions
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-6">You have {purchases.length} course(s)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {purchases.map((purchase) => (
                    <div
                      key={purchase.purchase_id}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                      onClick={() => setSelectedSession(purchase)}
                    >
                      {/* Thumbnail */}
                      <div className="relative h-40 bg-yoga-100">
                        {purchase.session.thumbnail && (
                          <img
                            src={purchase.session.thumbnail}
                            alt={purchase.session.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">
                          {purchase.session.title}
                        </h3>

                        {/* Progress */}
                        <div className="mb-3">
                          <div className="flex justify-between mb-1 text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-bold">{purchase.progress.percentage_watched}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-full rounded-full transition-all ${
                                purchase.progress.is_completed ? 'bg-green-500' : 'bg-yoga-600'
                              }`}
                              style={{ width: `${purchase.progress.percentage_watched}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Completion Status */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            👨‍🏫 {purchase.session.instructor}
                          </span>
                          {purchase.progress.is_completed && (
                            <span className="text-green-600 font-bold text-sm">✅</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
