'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SecureVideoPlayer from '@/components/workshops/SecureVideoPlayer';

interface Video {
  _id: string;
  title: string;
  description?: string;
  s3Key?: string;
  thumbnail?: string;
  duration?: number;
  dayNumber: number;
  accessType: 'free' | 'enrolled' | 'purchased';
  recordedDate: string;
  canWatch: boolean;
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
  batchCount: number;
}

interface UserEnrollment {
  batchId: string;
  batchNumber: number;
  batchName: string;
}

export default function WorkshopRecordingsDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [userEnrollment, setUserEnrollment] = useState<UserEnrollment | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const fetchWorkshopData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/workshops?slug=${slug}`, { headers });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load workshop');
      }

      setWorkshop(data.workshop);
      setVideos(data.videos || []);
      setUserEnrollment(data.userEnrollment);
      setIsLoggedIn(data.isLoggedIn);

      // Auto-select first watchable video
      const firstWatchable = (data.videos || []).find((v: Video) => v.canWatch);
      if (firstWatchable) {
        setSelectedVideo(firstWatchable);
        setActiveDay(firstWatchable.dayNumber);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) {
      fetchWorkshopData();
    }
  }, [slug, fetchWorkshopData]);

  const handleVideoSelect = (video: Video) => {
    if (video.canWatch) {
      setSelectedVideo(video);
      setActiveDay(video.dayNumber);
    }
  };

  const getAccessBadge = (accessType: string, canWatch: boolean) => {
    if (canWatch) {
      return accessType === 'free' ? (
        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Free</span>
      ) : null;
    }
    return (
      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        Locked
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !workshop) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Workshop Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'This workshop does not exist or has been removed.'}</p>
            <Link href="/recordings" className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
              Browse Recordings
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Group videos by day
  const videosByDay = videos.reduce((acc: Record<number, Video[]>, video) => {
    if (!acc[video.dayNumber]) {
      acc[video.dayNumber] = [];
    }
    acc[video.dayNumber].push(video);
    return acc;
  }, {});

  const days = Object.keys(videosByDay).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navigation />

      <main className="flex-1">
        {/* Video Player Section */}
        <div className="bg-black">
          <div className="max-w-6xl mx-auto">
            {selectedVideo ? (
              <SecureVideoPlayer
                videoId={selectedVideo._id}
                title={selectedVideo.title}
              />
            ) : (
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center text-white">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-lg">Select a video to start watching</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Video Info & Playlist */}
            <div className="lg:col-span-2">
              {/* Workshop Info */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{workshop.name}</h1>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-sm text-gray-500">{workshop.level}</span>
                      {workshop.duration && (
                        <span className="text-sm text-gray-500">• {workshop.duration}</span>
                      )}
                      <span className="text-sm text-gray-500">• {videos.length} videos</span>
                    </div>
                  </div>
                  {userEnrollment ? (
                    <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm">
                      ✓ Enrolled (Batch {userEnrollment.batchNumber})
                    </div>
                  ) : !isLoggedIn ? (
                    <Link
                      href="/login"
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
                    >
                      Login to Access
                    </Link>
                  ) : (
                    <Link
                      href={`/workshops/${workshop.slug}`}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
                    >
                      Enroll Now - ₹{workshop.price}
                    </Link>
                  )}
                </div>
                {workshop.description && (
                  <p className="text-gray-600">{workshop.description}</p>
                )}
              </div>

              {/* Currently Playing */}
              {selectedVideo && (
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Day {selectedVideo.dayNumber}: {selectedVideo.title}
                  </h2>
                  {selectedVideo.description && (
                    <p className="text-gray-600 text-sm">{selectedVideo.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Recorded on {new Date(selectedVideo.recordedDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>

            {/* Playlist Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow overflow-hidden sticky top-4">
                <div className="p-4 bg-gray-50 border-b">
                  <h3 className="font-semibold text-gray-900">Workshop Videos</h3>
                  <p className="text-sm text-gray-500">{videos.length} total videos</p>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                  {days.map((day) => (
                    <div key={day} className="border-b last:border-b-0">
                      <button
                        onClick={() => setActiveDay(activeDay === day ? null : day)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-900">Day {day}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{videosByDay[day].length} videos</span>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform ${activeDay === day ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {activeDay === day && (
                        <div className="bg-gray-50">
                          {videosByDay[day].map((video) => (
                            <button
                              key={video._id}
                              onClick={() => handleVideoSelect(video)}
                              disabled={!video.canWatch}
                              className={`w-full px-4 py-3 flex items-start gap-3 text-left border-t ${
                                selectedVideo?._id === video._id
                                  ? 'bg-orange-50 border-l-4 border-l-orange-500'
                                  : video.canWatch
                                  ? 'hover:bg-gray-100'
                                  : 'opacity-60 cursor-not-allowed'
                              }`}
                            >
                              {/* Thumbnail */}
                              <div className="w-20 h-12 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center relative">
                                {video.thumbnail ? (
                                  <img src={video.thumbnail} alt="" className="w-full h-full object-cover rounded" />
                                ) : (
                                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                )}
                                {!video.canWatch && (
                                  <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">{video.title}</h4>
                                  {getAccessBadge(video.accessType, video.canWatch)}
                                </div>
                                <p className="text-xs text-gray-500">
                                  {new Date(video.recordedDate).toLocaleDateString()}
                                </p>
                              </div>

                              {/* Playing indicator */}
                              {selectedVideo?._id === video._id && (
                                <div className="flex-shrink-0">
                                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {videos.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <p>No videos available yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
