'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import HLS from 'hls.js';

// Multi-language translations
const translations = {
  en: {
    courseContent: 'Course Content',
    loading: 'Loading...',
    videos: 'videos',
    completed: 'completed',
    markComplete: 'Mark as Complete',
    completed_badge: 'Completed',
    nextVideo: 'Next Video',
    previousVideo: 'Previous',
    backToCourse: 'Back to Course',
    giftHoursRemaining: 'Gift hours remaining',
    minutes: 'min',
    hours: 'hours',
    progress: 'Progress',
    materials: 'Course Materials',
    download: 'Download',
    notEnrolled: 'Not Enrolled',
    enrollNow: 'Enroll Now',
    accessExpired: 'Access Expired',
    giftHoursExhausted: 'Gift hours exhausted',
    upgradeToContinue: 'Upgrade to continue learning',
    videoNotFound: 'Video not found',
    selectVideo: 'Select a video to start learning',
    free: 'Free',
    preview: 'Preview',
    locked: 'Locked',
    autoplay: 'Autoplay',
    playbackSpeed: 'Speed',
    continueWatching: 'Continue from where you left',
    startFromBeginning: 'Start from beginning',
  },
  hi: {
    courseContent: 'कोर्स सामग्री',
    loading: 'लोड हो रहा है...',
    videos: 'वीडियो',
    completed: 'पूरा हुआ',
    markComplete: 'पूर्ण के रूप में चिह्नित करें',
    completed_badge: 'पूर्ण',
    nextVideo: 'अगला वीडियो',
    previousVideo: 'पिछला',
    backToCourse: 'कोर्स पर वापस',
    giftHoursRemaining: 'शेष उपहार घंटे',
    minutes: 'मिनट',
    hours: 'घंटे',
    progress: 'प्रगति',
    materials: 'कोर्स सामग्री',
    download: 'डाउनलोड',
    notEnrolled: 'नामांकित नहीं',
    enrollNow: 'अभी नामांकन करें',
    accessExpired: 'पहुंच समाप्त',
    giftHoursExhausted: 'उपहार घंटे समाप्त',
    upgradeToContinue: 'सीखना जारी रखने के लिए अपग्रेड करें',
    videoNotFound: 'वीडियो नहीं मिला',
    selectVideo: 'सीखना शुरू करने के लिए एक वीडियो चुनें',
    free: 'मुफ्त',
    preview: 'पूर्वावलोकन',
    locked: 'लॉक',
    autoplay: 'ऑटोप्ले',
    playbackSpeed: 'गति',
    continueWatching: 'जहां से छोड़ा था वहां से जारी रखें',
    startFromBeginning: 'शुरू से शुरू करें',
  },
  ne: {
    courseContent: 'कोर्स सामग्री',
    loading: 'लोड हुँदैछ...',
    videos: 'भिडियो',
    completed: 'पूरा भयो',
    markComplete: 'पूरा भएको चिन्ह लगाउनुहोस्',
    completed_badge: 'पूरा',
    nextVideo: 'अर्को भिडियो',
    previousVideo: 'अघिल्लो',
    backToCourse: 'कोर्समा फर्कनुहोस्',
    giftHoursRemaining: 'बाँकी उपहार घण्टा',
    minutes: 'मिनेट',
    hours: 'घण्टा',
    progress: 'प्रगति',
    materials: 'कोर्स सामग्री',
    download: 'डाउनलोड',
    notEnrolled: 'भर्ना भएको छैन',
    enrollNow: 'अहिले भर्ना हुनुहोस्',
    accessExpired: 'पहुँच समाप्त',
    giftHoursExhausted: 'उपहार घण्टा सकियो',
    upgradeToContinue: 'सिक्न जारी राख्न अपग्रेड गर्नुहोस्',
    videoNotFound: 'भिडियो भेटिएन',
    selectVideo: 'सिक्न सुरु गर्न भिडियो छान्नुहोस्',
    free: 'नि:शुल्क',
    preview: 'पूर्वावलोकन',
    locked: 'लक गरिएको',
    autoplay: 'अटोप्ले',
    playbackSpeed: 'गति',
    continueWatching: 'जहाँ छाडेको थियो त्यहाँबाट जारी राख्नुहोस्',
    startFromBeginning: 'सुरुदेखि सुरु गर्नुहोस्',
  },
};

type Language = 'en' | 'hi' | 'ne';

interface Section {
  _id: string;
  title: string;
  order: number;
}

interface Video {
  _id: string;
  title: string;
  description?: string;
  duration: number;
  isFree: boolean;
  sectionId?: string;
  order: number;
  canWatch: boolean;
  isLocked: boolean;
}

interface Material {
  _id: string;
  title: string;
  type: string;
  fileUrl?: string;
}

interface Course {
  _id: string;
  slug: string;
  title: string;
  totalVideos: number;
  accessSettings?: {
    allowDownload: boolean;
    allowPlaybackSpeedChange: boolean;
  };
}

interface Enrollment {
  _id: string;
  progress: number;
  giftHours?: {
    enabled: boolean;
    totalMinutes: number;
    usedMinutes: number;
    expiresAt?: string;
  };
  completedVideos?: { videoId: string; completedAt: string }[];
  lastVideoId?: string;
}

interface VideoStreamData {
  video: {
    _id: string;
    title: string;
    duration: number;
  };
  streaming: {
    directUrl?: string;
    hlsUrl?: string;
    dashUrl?: string;
  };
  courseSettings: {
    allowDownload: boolean;
    allowPlaybackSpeedChange: boolean;
  };
}

export default function CourseLearnPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoIdParam = searchParams.get('video');
  const [slug, setSlug] = useState<string>(params.slug);
  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [canAccessPaidContent, setCanAccessPaidContent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [videoStream, setVideoStream] = useState<VideoStreamData | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [language, setLanguage] = useState<Language>('en');
  const [autoplay, setAutoplay] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVideoTimeRef = useRef<number>();

  const t = translations[language];

  // Get language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_language') as Language;
    if (savedLang && ['en', 'hi', 'ne'].includes(savedLang)) {
      setLanguage(savedLang);
    }
  }, []);

  const fetchCourse = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push(`/login?redirect=/e-learning/${slug}/learn`);
        return;
      }

      const response = await fetch(`/api/recorded-courses?slug=${slug}&lang=${language}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setCourse(data.course);
        setSections(data.sections || []);
        setVideos(data.videos || []);
        setMaterials(data.materials || []);
        setEnrollment(data.enrollment);
        setCanAccessPaidContent(data.canAccessPaidContent);

        // Expand all sections
        if (data.sections?.length > 0) {
          setExpandedSections(new Set(data.sections.map((s: Section) => s._id)));
        }

        // Auto-select video from URL param, last watched, or first watchable
        if (videoIdParam) {
          // URL parameter takes priority
          const selectedVideo = data.videos?.find((v: Video) => v._id === videoIdParam);
          if (selectedVideo && selectedVideo.canWatch) {
            setCurrentVideo(selectedVideo);
          }
        } else if (data.enrollment?.lastVideoId) {
          const lastVideo = data.videos?.find((v: Video) => v._id === data.enrollment.lastVideoId);
          if (lastVideo) {
            setCurrentVideo(lastVideo);
          }
        } else if (data.videos?.length > 0) {
          // Find first watchable video (free videos are always watchable)
          const firstWatchable = data.videos.find((v: Video) => v.canWatch);
          if (firstWatchable) {
            setCurrentVideo(firstWatchable);
          }
        }
      } else if (!data.enrollment && !data.canAccessPaidContent) {
        // Check if there are free videos - if yes, allow access
        const hasFreeVideos = data.videos?.some((v: Video) => v.canWatch);
        if (!hasFreeVideos) {
          // No free videos and not enrolled - redirect
          router.push(`/e-learning/${slug}`);
        }
      }
    } catch (err) {
      console.error('Error fetching course:', err);
    } finally {
      setLoading(false);
    }
  }, [slug, language, router, videoIdParam]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  // Load video stream when current video changes
  useEffect(() => {
    const loadVideoStream = async () => {
      if (!currentVideo || !currentVideo.canWatch) return;

      setVideoLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/recorded-courses/video/${currentVideo._id}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (data.success) {
          setVideoStream(data);
        } else {
          console.error('Video stream error:', data.error);
          // Handle specific errors
          if (data.giftHoursExpired || data.giftHoursExhausted) {
            alert(t.giftHoursExhausted + '. ' + t.upgradeToContinue);
          }
        }
      } catch (err) {
        console.error('Error loading video:', err);
      } finally {
        setVideoLoading(false);
      }
    };

    loadVideoStream();
  }, [currentVideo, t]);

  // Initialize HLS.js for streaming
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoStream?.streaming.hlsUrl) return;

    let hls: HLS | null = null;

    const initializeHLS = () => {
      // Check if HLS.js is supported
      if (HLS.isSupported()) {
        hls = new HLS({
          debug: false,
          enableWorker: true,
        });
        hls.loadSource(videoStream.streaming.hlsUrl!);
        hls.attachMedia(video);
        hls.on(HLS.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {
            // Auto-play prevented, user interaction required
          });
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        video.src = videoStream.streaming.hlsUrl;
      }
    };

    initializeHLS();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoStream]);

  // Update progress periodically
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const startProgressTracking = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    progressIntervalRef.current = setInterval(() => {
      if (videoRef.current && currentVideo) {
        updateProgress(false);
      }
    }, 30000); // Update every 30 seconds
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video && lastVideoTimeRef.current !== undefined && video.currentTime > lastVideoTimeRef.current + 5) {
      video.currentTime = lastVideoTimeRef.current;
    }
    lastVideoTimeRef.current = video.currentTime;
  };

  const updateProgress = async (completed: boolean) => {
    if (!currentVideo || !videoRef.current) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/recorded-courses/video/${currentVideo._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          watchedSeconds: Math.floor(videoRef.current.currentTime),
          totalSeconds: Math.floor(videoRef.current.duration),
          completed,
        }),
      });

      const data = await response.json();
      if (data.success && enrollment) {
        setEnrollment((prev: Enrollment | null) => prev ? { ...prev, progress: data.progress } : null);
      }
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const handleVideoEnded = async () => {
    await updateProgress(true);

    // Auto-play next video
    if (autoplay) {
      const currentIndex = videos.findIndex((v) => v._id === currentVideo?._id);
      const nextVideo = videos.find((v, i) => i > currentIndex && v.canWatch);
      if (nextVideo) {
        setCurrentVideo(nextVideo);
      }
    }
  };

  const handleMarkComplete = async () => {
    await updateProgress(true);
    // Update local state
    if (currentVideo && enrollment) {
      const alreadyCompleted = enrollment.completedVideos?.some(
        (cv) => cv.videoId === currentVideo._id
      );
      if (!alreadyCompleted) {
        setEnrollment({
          ...enrollment,
          completedVideos: [
            ...(enrollment.completedVideos || []),
            { videoId: currentVideo._id, completedAt: new Date().toISOString() },
          ],
        });
      }
    }
  };

  const getVideosBySection = (sectionId: string) => {
    return videos.filter((v) => v.sectionId === sectionId);
  };

  const uncategorizedVideos = videos.filter((v) => !v.sectionId);

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const isVideoCompleted = (videoId: string) => {
    return enrollment?.completedVideos?.some((cv) => cv.videoId === videoId) || false;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completedCount = enrollment?.completedVideos?.length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!canAccessPaidContent && !enrollment) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">{t.notEnrolled}</h1>
          <Link href={`/e-learning/${slug}`} className="text-orange-500 hover:text-orange-400">
            {t.enrollNow}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Course Header */}
        <div className="p-4 border-b border-gray-700">
          <Link
            href={`/e-learning/${slug}`}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-2 mb-3"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.backToCourse}
          </Link>
          <h2 className="text-white font-semibold line-clamp-2">{course?.title}</h2>
          
          {/* Progress */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
              <span>{t.progress}</span>
              <span>{enrollment?.progress || 0}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all"
                style={{ width: `${enrollment?.progress || 0}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {completedCount}/{videos.length} {t.videos} {t.completed}
            </p>
          </div>

          {/* Gift Hours Warning */}
          {enrollment?.giftHours?.enabled && (
            <div className="mt-3 p-2 bg-purple-900/30 rounded text-purple-300 text-sm">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {Math.max(0, Math.floor((enrollment.giftHours.totalMinutes - enrollment.giftHours.usedMinutes)))} {t.minutes} {t.giftHoursRemaining}
              </span>
            </div>
          )}
        </div>

        {/* Video List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {sections.map((section) => (
              <div key={section._id} className="mb-2">
                <button
                  onClick={() => toggleSection(section._id)}
                  className="w-full flex items-center justify-between p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-left"
                >
                  <span className="text-white text-sm font-medium line-clamp-1">{section.title}</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.has(section._id) ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedSections.has(section._id) && (
                  <div className="mt-1 space-y-1">
                    {getVideosBySection(section._id).map((video) => (
                      <button
                        key={video._id}
                        onClick={() => video.canWatch && setCurrentVideo(video)}
                        disabled={!video.canWatch}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          currentVideo?._id === video._id
                            ? 'bg-orange-500/20 border border-orange-500/50'
                            : video.canWatch
                            ? 'hover:bg-gray-700/50'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {isVideoCompleted(video._id) ? (
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : video.isLocked ? (
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm line-clamp-2 ${currentVideo?._id === video._id ? 'text-orange-400' : 'text-gray-300'}`}>
                            {video.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatDuration(video.duration)}</p>
                        </div>
                        {video.isFree && (
                          <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded">
                            {t.free}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Uncategorized Videos */}
            {uncategorizedVideos.length > 0 && (
              <div className="space-y-1">
                {uncategorizedVideos.map((video) => (
                  <button
                    key={video._id}
                    onClick={() => video.canWatch && setCurrentVideo(video)}
                    disabled={!video.canWatch}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      currentVideo?._id === video._id
                        ? 'bg-orange-500/20 border border-orange-500/50'
                        : video.canWatch
                        ? 'hover:bg-gray-700/50'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isVideoCompleted(video._id) ? (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : video.isLocked ? (
                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm line-clamp-2 ${currentVideo?._id === video._id ? 'text-orange-400' : 'text-gray-300'}`}>
                        {video.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDuration(video.duration)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex-1">
            {currentVideo && (
              <h1 className="text-white font-medium truncate">{currentVideo.title}</h1>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Autoplay Toggle */}
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoplay}
                onChange={(e) => setAutoplay(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
              />
              {t.autoplay}
            </label>

            {/* Playback Speed */}
            {videoStream?.courseSettings.allowPlaybackSpeedChange && (
              <select
                value={playbackSpeed}
                onChange={(e) => {
                  const speed = parseFloat(e.target.value);
                  setPlaybackSpeed(speed);
                  if (videoRef.current) {
                    videoRef.current.playbackRate = speed;
                  }
                }}
                className="bg-gray-700 text-gray-300 text-sm rounded px-2 py-1 border-gray-600 focus:ring-orange-500"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            )}
          </div>
        </div>

        {/* Video Player Area */}
        <div className="flex-1 flex flex-col bg-black">
          {currentVideo && videoStream ? (
            <>
              {/* Video */}
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-6xl aspect-video">
                  {videoLoading ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : videoStream.streaming.directUrl?.includes('youtube.com') || videoStream.streaming.directUrl?.includes('youtu.be') ? (
                    // YouTube Video
                    <iframe
                      className="w-full h-full rounded-lg"
                      src={videoStream.streaming.directUrl.replace('youtu.be/', 'youtube.com/embed/').replace('watch?v=', 'embed/')}
                      title={videoStream.video.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    // HTML5 Video
                    <video
                      ref={videoRef}
                      src={videoStream.streaming.directUrl}
                      controls
                      autoPlay
                      muted={currentVideo.isFree}
                      playsInline
                      onPlay={startProgressTracking}
                      onEnded={handleVideoEnded}
                      onPause={() => updateProgress(false)}
                      onTimeUpdate={handleTimeUpdate}
                      className="w-full h-full"
                      controlsList={videoStream.courseSettings.allowDownload ? '' : 'nodownload'}
                    />
                  )}
                </div>
              </div>

              {/* Bottom Controls */}
              <div className="h-16 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-6">
                <button
                  onClick={() => {
                    const currentIndex = videos.findIndex((v) => v._id === currentVideo._id);
                    const prevVideo = videos.slice(0, currentIndex).reverse().find((v) => v.canWatch);
                    if (prevVideo) setCurrentVideo(prevVideo);
                  }}
                  disabled={!videos.slice(0, videos.findIndex((v) => v._id === currentVideo._id)).some((v) => v.canWatch)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t.previousVideo}
                </button>

                <button
                  onClick={handleMarkComplete}
                  disabled={isVideoCompleted(currentVideo._id)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isVideoCompleted(currentVideo._id)
                      ? 'bg-green-600 text-white cursor-default'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {isVideoCompleted(currentVideo._id) ? t.completed_badge : t.markComplete}
                </button>

                <button
                  onClick={() => {
                    const currentIndex = videos.findIndex((v) => v._id === currentVideo._id);
                    const nextVideo = videos.find((v, i) => i > currentIndex && v.canWatch);
                    if (nextVideo) setCurrentVideo(nextVideo);
                  }}
                  disabled={!videos.slice(videos.findIndex((v) => v._id === currentVideo._id) + 1).some((v) => v.canWatch)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t.nextVideo}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-500 text-lg">{t.selectVideo}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
