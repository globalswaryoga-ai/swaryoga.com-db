'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface Workshop {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  thumbnail?: string;
  level: string;
  duration?: string;
  price: number;
  isFree: boolean;
  batchCount: number;
  videoCount: number;
  freeVideoCount: number;
  isEnrolled: boolean;
}

export default function WorkshopRecordingsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const fetchWorkshops = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/workshops', { headers });
      const data = await response.json();

      if (data.success) {
        setWorkshops(data.workshops);
        setIsLoggedIn(data.isLoggedIn);
      }
    } catch (err) {
      console.error('Error fetching workshops:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops]);

  const getLevelBadgeColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 to-orange-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Workshop Recordings</h1>
              <p className="text-xl text-orange-100 max-w-2xl">
                Access recorded workshop sessions and practice yoga at your own pace.
                Daily recordings added for enrolled members.
              </p>
            </div>
            {!isLoggedIn && (
              <Link
                href="/login"
                className="hidden md:inline-flex px-8 py-3 bg-white text-orange-600 font-semibold rounded-lg hover:bg-orange-50 transition-colors"
              >
                Login to Access
              </Link>
            )}
          </div>
        </div>
      </section>

      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
            </div>
          ) : workshops.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow">
              <svg
                className="mx-auto h-16 w-16 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No recordings available yet</h3>
              <p className="mt-2 text-gray-500">
                Workshop recordings will be added soon. Check back later.
              </p>
              <Link
                href="/workshops"
                className="mt-6 inline-flex px-6 py-3 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600"
              >
                Browse Workshops
              </Link>
            </div>
          ) : (
            <>
              {/* Enrolled Workshops Section */}
              {workshops.some(w => w.isEnrolled) && (
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm">
                      ✓
                    </span>
                    My Enrolled Workshops
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {workshops
                      .filter(w => w.isEnrolled)
                      .map((workshop) => (
                        <WorkshopCard key={workshop._id} workshop={workshop} getLevelBadgeColor={getLevelBadgeColor} />
                      ))}
                  </div>
                </section>
              )}

              {/* All Workshops */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {workshops.some(w => w.isEnrolled) ? 'Other Workshops' : 'Available Workshops'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {workshops
                    .filter(w => !w.isEnrolled)
                    .map((workshop) => (
                      <WorkshopCard key={workshop._id} workshop={workshop} getLevelBadgeColor={getLevelBadgeColor} />
                    ))}
                </div>
              </section>
            </>
          )}

          {/* Info Section */}
          <section className="mt-16 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-8 border border-orange-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              📹 How Workshop Recordings Work
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-xl mx-auto mb-3">
                  1
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Enroll in Workshop</h3>
                <p className="text-sm text-gray-600">
                  Register for any workshop from our catalog
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-xl mx-auto mb-3">
                  2
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Get Daily Recordings</h3>
                <p className="text-sm text-gray-600">
                  New recordings are added daily during active batches
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-xl mx-auto mb-3">
                  3
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Watch Anytime</h3>
                <p className="text-sm text-gray-600">
                  Access recordings from up to 3 devices
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center text-xl mx-auto mb-3">
                  4
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Practice & Learn</h3>
                <p className="text-sm text-gray-600">
                  Replay videos as many times as needed
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-white rounded-lg border border-orange-200">
              <h3 className="font-semibold text-gray-900 mb-2">🔒 Security Features</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Videos are secured and cannot be downloaded</li>
                <li>• Maximum 3 devices per account</li>
                <li>• Watermarked for protection</li>
                <li>• Automatic device management</li>
              </ul>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function WorkshopCard({ workshop, getLevelBadgeColor }: { workshop: Workshop; getLevelBadgeColor: (level: string) => string }) {
  return (
    <Link
      href={`/recordings/${workshop.slug}`}
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-gradient-to-br from-orange-400 to-orange-600">
        {workshop.thumbnail ? (
          <img
            src={workshop.thumbnail}
            alt={workshop.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-20 h-20 text-white/40"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Enrolled Badge */}
        {workshop.isEnrolled && (
          <div className="absolute top-3 right-3 px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-full">
            ✓ Enrolled
          </div>
        )}

        {/* Free Badge */}
        {workshop.isFree && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-yellow-400 text-yellow-900 text-sm font-bold rounded-full">
            FREE
          </div>
        )}

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-orange-500 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
            {workshop.name}
          </h3>
          <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ${getLevelBadgeColor(workshop.level)}`}>
            {workshop.level}
          </span>
        </div>

        {workshop.description && (
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">{workshop.description}</p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {workshop.videoCount} videos
            </span>
            {workshop.freeVideoCount > 0 && (
              <span className="text-green-600">{workshop.freeVideoCount} free</span>
            )}
          </div>
          {!workshop.isFree && !workshop.isEnrolled && (
            <span className="font-bold text-orange-600">₹{workshop.price}</span>
          )}
        </div>

        {workshop.duration && (
          <p className="text-xs text-gray-400 mt-2">{workshop.duration}</p>
        )}
      </div>
    </Link>
  );
}
