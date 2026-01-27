'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Community {
  id: string;
  name: string;
  description: string;
  type: 'global' | 'old_sadhak' | 'workshop_active';
  workshopId?: string;
  mergedWorkshopCount?: number;
}

interface Recording {
  id: string;
  title: string;
  description: string;
  s3Key: string;
  duration?: number;
  thumbnailUrl?: string;
  workshopId?: string;
  batchId?: string;
  recordingType: string;
  tags: string[];
  createdAt: string;
}

interface CommunitiesData {
  global: Community | null;
  oldSadhak: Community | null;
  activeWorkshops: Community[];
}

export default function MyCommunitiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [communities, setCommunities] = useState<CommunitiesData | null>(null);
  const [recordings, setRecordings] = useState<{
    common: Recording[];
    batchWise: Recording[];
    total: number;
  } | null>(null);
  const [selectedCommunity, setSelectedCommunity] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<string>('');

  const fetchCommunities = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login?redirect=/my/communities');
        return;
      }

      const params = new URLSearchParams({
        recordings: 'true',
      });
      if (selectedBatch) {
        params.append('batchId', selectedBatch);
      }

      const res = await fetch(`/api/my/communities?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login?redirect=/my/communities');
          return;
        }
        throw new Error('Failed to fetch communities');
      }

      const data = await res.json();
      setCommunities(data.communities);
      setRecordings(data.recordings || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load communities');
    } finally {
      setLoading(false);
    }
  }, [router, selectedBatch]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getCommunityIcon = (type: string) => {
    switch (type) {
      case 'global':
        return '🌍';
      case 'old_sadhak':
        return '🧘';
      case 'workshop_active':
        return '📚';
      default:
        return '👥';
    }
  };

  const getCommunityTypeLabel = (type: string) => {
    switch (type) {
      case 'global':
        return 'Public Community';
      case 'old_sadhak':
        return 'Alumni Community';
      case 'workshop_active':
        return 'Active Workshop';
      default:
        return 'Community';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800">Loading your communities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchCommunities}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">🙏 My Swar Yoga Communities</h1>
          <p className="text-amber-100">Connect, learn, and grow with fellow practitioners</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Communities Grid */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-amber-900 mb-4">Your Communities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Global Community */}
            {communities?.global && (
              <div
                className={`bg-white rounded-xl shadow-lg p-6 border-2 transition-all cursor-pointer ${
                  selectedCommunity === 'global'
                    ? 'border-amber-500 ring-2 ring-amber-200'
                    : 'border-transparent hover:border-amber-300'
                }`}
                onClick={() => setSelectedCommunity('global')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{getCommunityIcon('global')}</span>
                  <div>
                    <h3 className="font-semibold text-lg text-amber-900">{communities.global.name}</h3>
                    <span className="text-sm text-amber-600">{getCommunityTypeLabel('global')}</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{communities.global.description}</p>
              </div>
            )}

            {/* Old Sadhak Community */}
            {communities?.oldSadhak && (
              <div
                className={`bg-white rounded-xl shadow-lg p-6 border-2 transition-all cursor-pointer ${
                  selectedCommunity === 'old_sadhak'
                    ? 'border-amber-500 ring-2 ring-amber-200'
                    : 'border-transparent hover:border-amber-300'
                }`}
                onClick={() => setSelectedCommunity('old_sadhak')}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{getCommunityIcon('old_sadhak')}</span>
                  <div>
                    <h3 className="font-semibold text-lg text-amber-900">{communities.oldSadhak.name}</h3>
                    <span className="text-sm text-amber-600">{getCommunityTypeLabel('old_sadhak')}</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{communities.oldSadhak.description}</p>
                {communities.oldSadhak.mergedWorkshopCount && communities.oldSadhak.mergedWorkshopCount > 0 && (
                  <div className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-full px-3 py-1 inline-block">
                    📹 {communities.oldSadhak.mergedWorkshopCount} completed workshops
                  </div>
                )}
              </div>
            )}

            {/* Active Workshop Communities */}
            {communities?.activeWorkshops.map((workshop) => (
              <div
                key={workshop.id}
                className={`bg-white rounded-xl shadow-lg p-6 border-2 transition-all cursor-pointer ${
                  selectedCommunity === workshop.id
                    ? 'border-amber-500 ring-2 ring-amber-200'
                    : 'border-transparent hover:border-amber-300'
                }`}
                onClick={() => setSelectedCommunity(workshop.id)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{getCommunityIcon('workshop_active')}</span>
                  <div>
                    <h3 className="font-semibold text-lg text-amber-900">{workshop.name}</h3>
                    <span className="text-sm text-green-600">🟢 Active Workshop</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{workshop.description}</p>
              </div>
            ))}

            {/* No communities message */}
            {!communities?.global && !communities?.oldSadhak && communities?.activeWorkshops.length === 0 && (
              <div className="col-span-full text-center py-12">
                <span className="text-6xl mb-4 block">🧘</span>
                <h3 className="text-xl font-semibold text-amber-900 mb-2">No Communities Yet</h3>
                <p className="text-gray-600 mb-4">
                  Enroll in a workshop to join the Swar Yoga community!
                </p>
                <a
                  href="/workshops"
                  className="inline-block bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 transition"
                >
                  Browse Workshops
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Recordings Section */}
        {recordings && (recordings.common.length > 0 || recordings.batchWise.length > 0) && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-amber-900">📹 Recordings</h2>
              <div className="flex gap-3">
                <select
                  value={selectedCommunity}
                  onChange={(e) => setSelectedCommunity(e.target.value)}
                  className="border border-amber-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  <option value="all">All Communities</option>
                  {communities?.global && <option value="global">Global</option>}
                  {communities?.oldSadhak && <option value="old_sadhak">Alumni</option>}
                  {communities?.activeWorkshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Common Recordings */}
            {recordings.common.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium text-amber-800 mb-3 flex items-center gap-2">
                  <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-sm">Common</span>
                  Available to all members
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recordings.common.map((recording) => (
                    <div
                      key={recording.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                    >
                      <div className="aspect-video bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                        {recording.thumbnailUrl ? (
                          <img
                            src={recording.thumbnailUrl}
                            alt={recording.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl">🎬</span>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-amber-900 mb-1 line-clamp-1">
                          {recording.title}
                        </h4>
                        {recording.description && (
                          <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                            {recording.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(recording.createdAt)}</span>
                          {recording.duration && <span>{formatDuration(recording.duration)}</span>}
                        </div>
                        {recording.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {recording.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Batch-wise Recordings */}
            {recordings.batchWise.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-amber-800 mb-3 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">Batch</span>
                  Workshop recordings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recordings.batchWise.map((recording) => (
                    <div
                      key={recording.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition"
                    >
                      <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center relative">
                        {recording.thumbnailUrl ? (
                          <img
                            src={recording.thumbnailUrl}
                            alt={recording.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-4xl">📹</span>
                        )}
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          {recording.recordingType.replace('_', ' ')}
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-amber-900 mb-1 line-clamp-1">
                          {recording.title}
                        </h4>
                        {recording.description && (
                          <p className="text-gray-600 text-sm line-clamp-2 mb-2">
                            {recording.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{formatDate(recording.createdAt)}</span>
                          {recording.duration && <span>{formatDuration(recording.duration)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No recordings */}
            {recordings.common.length === 0 && recordings.batchWise.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl shadow">
                <span className="text-6xl mb-4 block">📹</span>
                <h3 className="text-xl font-semibold text-amber-900 mb-2">No Recordings Yet</h3>
                <p className="text-gray-600">
                  Recordings will appear here after your workshop sessions are completed.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
