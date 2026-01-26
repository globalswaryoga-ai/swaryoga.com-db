'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Batch {
  _id: string;
  batchNumber: number;
  name: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  videoCount: number;
  enrolledUsers: any[];
}

interface Video {
  _id: string;
  title: string;
  description?: string;
  s3Key: string;
  thumbnail?: string;
  duration?: number;
  dayNumber: number;
  accessType: 'free' | 'enrolled' | 'purchased';
  recordedDate: string;
  isActive: boolean;
  viewCount: number;
  uniqueViewers: number;
}

interface Workshop {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  level: string;
  duration?: string;
  price: number;
  isFree: boolean;
  isActive: boolean;
}

export default function WorkshopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workshopId = params.workshopId as string;

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [batchForm, setBatchForm] = useState({
    batchNumber: 1,
    name: '',
    startDate: '',
    endDate: '',
  });
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    s3Key: '',
    dayNumber: 1,
    accessType: 'enrolled',
    recordedDate: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'batches' | 'videos' | 'free'>('batches');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const fetchWorkshop = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/workshops', {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        const ws = data.workshops.find((w: Workshop) => w._id === workshopId);
        if (ws) {
          setWorkshop(ws);
        } else {
          setError('Workshop not found');
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [workshopId, getAuthHeaders]);

  const fetchBatches = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/workshops/batches?workshopId=${workshopId}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setBatches(data.batches);
        // Set default batch number for new batch
        const maxBatch = Math.max(0, ...data.batches.map((b: Batch) => b.batchNumber));
        setBatchForm((prev) => ({ ...prev, batchNumber: maxBatch + 1 }));
      }
    } catch (err: any) {
      console.error('Error fetching batches:', err);
    }
  }, [workshopId, getAuthHeaders]);

  const fetchVideos = useCallback(async () => {
    try {
      let url = `/api/admin/workshops/videos?workshopId=${workshopId}`;
      if (selectedBatch) {
        url += `&batchId=${selectedBatch}`;
      }
      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setVideos(data.videos);
      }
    } catch (err: any) {
      console.error('Error fetching videos:', err);
    }
  }, [workshopId, selectedBatch, getAuthHeaders]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchWorkshop(), fetchBatches()]);
      setLoading(false);
    };
    loadData();
  }, [fetchWorkshop, fetchBatches]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/workshops/batches', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          workshopId,
          ...batchForm,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowBatchModal(false);
        setBatchForm({ batchNumber: batchForm.batchNumber + 1, name: '', startDate: '', endDate: '' });
        fetchBatches();
      } else {
        alert(data.error || 'Failed to create batch');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoForm.title || !videoForm.s3Key) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/workshops/videos', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          workshopId,
          batchId: selectedBatch,
          ...videoForm,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setShowVideoModal(false);
        setVideoForm({
          title: '',
          description: '',
          s3Key: '',
          dayNumber: videoForm.dayNumber + 1,
          accessType: 'enrolled',
          recordedDate: new Date().toISOString().split('T')[0],
        });
        fetchVideos();
      } else {
        alert(data.error || 'Failed to add video');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBatchStatus = async (batchId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/workshops/batches', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ batchId, isActive: !currentStatus }),
      });
      if ((await response.json()).success) {
        fetchBatches();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleVideoStatus = async (videoId: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/workshops/videos', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ videoId, isActive: !currentStatus }),
      });
      if ((await response.json()).success) {
        fetchVideos();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getAccessTypeBadge = (type: string) => {
    switch (type) {
      case 'free':
        return 'bg-green-100 text-green-800';
      case 'enrolled':
        return 'bg-blue-100 text-blue-800';
      case 'purchased':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Workshop not found</h2>
          <Link href="/admin/workshops" className="text-orange-600 hover:underline mt-2 inline-block">
            ← Back to Workshops
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/admin/workshops" className="text-gray-600 hover:text-gray-900">
              ← Back
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{workshop.name}</h1>
              <p className="text-gray-600">
                {workshop.level} • {workshop.isFree ? 'Free' : `₹${workshop.price}`}
                {workshop.duration && ` • ${workshop.duration}`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBatchModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                + Add Batch
              </button>
              <button
                onClick={() => setShowVideoModal(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              >
                + Add Video
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setActiveTab('batches');
              setSelectedBatch(null);
            }}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'batches'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Batches ({batches.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('videos');
              setSelectedBatch(null);
            }}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'videos'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Videos ({videos.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('free');
              setSelectedBatch(null);
            }}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'free'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Free Videos
          </button>
        </div>

        {/* Batches Tab */}
        {activeTab === 'batches' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((batch) => (
              <div
                key={batch._id}
                className={`bg-white rounded-lg shadow p-4 ${!batch.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Batch {batch.batchNumber}: {batch.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {batch.videoCount} videos • {batch.enrolledUsers?.length || 0} enrolled
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      batch.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {batch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {(batch.startDate || batch.endDate) && (
                  <p className="text-sm text-gray-600 mb-3">
                    {batch.startDate && new Date(batch.startDate).toLocaleDateString()}
                    {batch.startDate && batch.endDate && ' - '}
                    {batch.endDate && new Date(batch.endDate).toLocaleDateString()}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedBatch(batch._id);
                      setActiveTab('videos');
                    }}
                    className="flex-1 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 text-sm font-medium"
                  >
                    View Videos
                  </button>
                  <button
                    onClick={() => toggleBatchStatus(batch._id, batch.isActive)}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      batch.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {batch.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}

            {batches.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-lg">
                <p className="text-gray-500">No batches yet. Create your first batch.</p>
              </div>
            )}
          </div>
        )}

        {/* Videos Tab */}
        {(activeTab === 'videos' || activeTab === 'free') && (
          <div>
            {selectedBatch && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-gray-600">
                  Showing videos for Batch {batches.find((b) => b._id === selectedBatch)?.batchNumber}
                </span>
                <button
                  onClick={() => setSelectedBatch(null)}
                  className="text-orange-600 hover:underline text-sm"
                >
                  Show All
                </button>
              </div>
            )}

            <div className="space-y-4">
              {videos
                .filter((v) => (activeTab === 'free' ? v.accessType === 'free' : true))
                .map((video) => (
                  <div
                    key={video._id}
                    className={`bg-white rounded-lg shadow p-4 flex items-center gap-4 ${
                      !video.isActive ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-32 h-20 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <svg
                          className="w-8 h-8 text-gray-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-orange-600">Day {video.dayNumber}</span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${getAccessTypeBadge(
                            video.accessType
                          )}`}
                        >
                          {video.accessType}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-gray-600 line-clamp-1">{video.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>{video.viewCount} views</span>
                        <span>{video.uniqueViewers} unique viewers</span>
                        <span>{new Date(video.recordedDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleVideoStatus(video._id, video.isActive)}
                        className={`px-3 py-2 rounded-lg text-sm ${
                          video.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {video.isActive ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                ))}

              {videos.filter((v) => (activeTab === 'free' ? v.accessType === 'free' : true))
                .length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg">
                  <p className="text-gray-500">
                    {activeTab === 'free'
                      ? 'No free videos yet.'
                      : 'No videos yet. Add your first video.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Create Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Batch</h2>
            <form onSubmit={handleCreateBatch}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch Number *
                    </label>
                    <input
                      type="number"
                      value={batchForm.batchNumber}
                      onChange={(e) =>
                        setBatchForm({ ...batchForm, batchNumber: parseInt(e.target.value) || 1 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                    <input
                      type="text"
                      value={batchForm.name}
                      onChange={(e) => setBatchForm({ ...batchForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      placeholder="e.g., January 2025"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={batchForm.startDate}
                      onChange={(e) => setBatchForm({ ...batchForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={batchForm.endDate}
                      onChange={(e) => setBatchForm({ ...batchForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Video Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Video</h2>
            <form onSubmit={handleCreateVideo}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    value={videoForm.title}
                    onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g., Day 1 - Introduction"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={videoForm.description}
                    onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">S3 Key *</label>
                  <input
                    type="text"
                    value={videoForm.s3Key}
                    onChange={(e) => setVideoForm({ ...videoForm, s3Key: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="workshops/pranayama/batch1/day1.mp4"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the S3 key path for the video file
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Day Number</label>
                    <input
                      type="number"
                      value={videoForm.dayNumber}
                      onChange={(e) =>
                        setVideoForm({ ...videoForm, dayNumber: parseInt(e.target.value) || 1 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Access Type</label>
                    <select
                      value={videoForm.accessType}
                      onChange={(e) => setVideoForm({ ...videoForm, accessType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="free">Free (Public)</option>
                      <option value="enrolled">Enrolled Only</option>
                      <option value="purchased">Purchased Only</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recorded Date</label>
                  <input
                    type="date"
                    value={videoForm.recordedDate}
                    onChange={(e) => setVideoForm({ ...videoForm, recordedDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {selectedBatch && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Video will be added to Batch{' '}
                      {batches.find((b) => b._id === selectedBatch)?.batchNumber}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowVideoModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !videoForm.title || !videoForm.s3Key}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Video'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
