'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import HLSVideoPlayer from '@/components/HLSVideoPlayer';

// Global video control hiding - only for direct HTML5 videos, not iframes
if (typeof document !== 'undefined') {
  const styleId = 'elearning-video-no-controls';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Only hide controls for direct HTML5 video elements */
      div.video-player-direct video {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
      }
      div.video-player-direct video::-webkit-media-controls { display: none !important; visibility: hidden !important; }
      div.video-player-direct video::-moz-media-controls { display: none !important; visibility: hidden !important; }
    `;
    document.head.appendChild(style);
  }
}

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
  videosWatched?: Array<string | { _id?: string }>;
  lastWatchedVideoId?: string;
  lastVideoId?: string;
}

interface VideoStreamData {
  video: {
    _id: string;
    title: string;
    description?: string;
    duration: number;
    ragEnabled?: boolean;
    hasRagContent?: boolean;
  };
  streaming: {
    directUrl?: string;
    hlsUrl?: string;
    dashUrl?: string;
    playerUrl?: string;
    [key: string]: any;
  };
  courseSettings: {
    allowDownload: boolean;
    allowPlaybackSpeedChange: boolean;
  };
  watchLogId?: string;
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [videoQuestion, setVideoQuestion] = useState('');
  const [videoAskLoading, setVideoAskLoading] = useState(false);
  const [videoAskError, setVideoAskError] = useState('');
  const [videoAskMessages, setVideoAskMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastVideoTimeRef = useRef<number | undefined>(undefined);

  const t = translations[language];

  const getLearningDevice = useCallback(() => {
    const storageKey = 'swaryoga_elearning_device_id';
    let fingerprint = localStorage.getItem(storageKey);

    if (!fingerprint) {
      const randomId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      fingerprint = randomId;
      localStorage.setItem(storageKey, fingerprint);
    }

    const ua = navigator.userAgent;
    const deviceName = /iPhone/i.test(ua)
      ? 'iPhone'
      : /iPad/i.test(ua)
      ? 'iPad'
      : /Android/i.test(ua)
      ? 'Android Device'
      : /Windows/i.test(ua)
      ? 'Windows PC'
      : /Mac/i.test(ua)
      ? 'Mac'
      : /Linux/i.test(ua)
      ? 'Linux PC'
      : 'Browser Device';

    const deviceInfo = [
      ua,
      navigator.language,
      `${window.screen.width}x${window.screen.height}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ].filter(Boolean).join(' | ');

    return { fingerprint, deviceName, deviceInfo };
  }, []);

  // Get language from localStorage
  useEffect(() => {
    const savedLang = localStorage.getItem('preferred_language') as Language;
    if (savedLang && ['en', 'hi', 'ne'].includes(savedLang)) {
      setLanguage(savedLang);
    }
  }, []);

  // Initialize sidebar state based on window width (desktop=open, mobile=closed)
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCourse = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const headers: any = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`/api/recorded-courses?slug=${slug}&lang=${language}`, {
        headers,
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
        } else if (data.enrollment?.lastWatchedVideoId || data.enrollment?.lastVideoId) {
          const lastVideoId = String(data.enrollment.lastWatchedVideoId || data.enrollment.lastVideoId);
          const lastVideo = data.videos?.find((v: Video) => v._id === lastVideoId);
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
          // No free videos and not enrolled - redirect to login
          if (!token) {
            router.push(`/login?redirect=/e-learning/${slug}/learn`);
          } else {
            // Logged in but no paid content - redirect to course page
            router.push(`/e-learning/${slug}`);
          }
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
        const device = getLearningDevice();
        const query = new URLSearchParams({
          fingerprint: device.fingerprint,
          deviceName: device.deviceName,
        });
        const response = await fetch(`/api/recorded-courses/video/${currentVideo._id}?${query.toString()}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-device-fingerprint': device.fingerprint,
            'x-device-name': device.deviceName,
            'x-device-info': device.deviceInfo,
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
  }, [currentVideo, getLearningDevice, t]);

  useEffect(() => {
    setVideoQuestion('');
    setVideoAskError('');
    setVideoAskMessages([]);
  }, [currentVideo?._id]);

  const askVideoAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVideo || !videoQuestion.trim() || videoAskLoading) return;

    const question = videoQuestion.trim();
    const history = videoAskMessages.slice(-6);
    setVideoAskMessages((prev) => [...prev, { role: 'user', content: question }]);
    setVideoQuestion('');
    setVideoAskLoading(true);
    setVideoAskError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/recorded-courses/video/${currentVideo._id}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ question, history, lang: language }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Video assistant failed');
      }

      setVideoAskMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'No response.' }]);
    } catch (err: any) {
      setVideoAskError(err.message || 'Video assistant failed');
    } finally {
      setVideoAskLoading(false);
    }
  };

  // Keep stable refs to avoid re-attaching listeners on every render
  const handleVideoEndedRef = useRef(handleVideoEnded);
  const updateProgressRef = useRef(updateProgress);
  handleVideoEndedRef.current = handleVideoEnded;
  updateProgressRef.current = updateProgress;

  // Attach event listeners to video ref for progress tracking
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onEnded = () => handleVideoEndedRef.current();
    const onPause = () => updateProgressRef.current(false);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', handleTimeUpdate as any);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate as any);
      video.removeEventListener('pause', onPause);
    };
  }, [currentVideo, autoplay]);

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
      const device = getLearningDevice();
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
          watchLogId: videoStream?.watchLogId,
          deviceFingerprint: device.fingerprint,
          deviceInfo: device.deviceInfo,
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
          videosWatched: [
            ...(enrollment.videosWatched || []),
            currentVideo._id,
          ],
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
    const watched = enrollment?.videosWatched?.some((watchedVideo) => {
      const watchedId = typeof watchedVideo === 'string' ? watchedVideo : watchedVideo?._id;
      return String(watchedId) === videoId;
    });
    const completed = enrollment?.completedVideos?.some((cv) => cv.videoId === videoId);
    return watched || completed || false;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completedCount = enrollment?.videosWatched?.length || enrollment?.completedVideos?.length || 0;

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

  // Only show "Not Enrolled" if there are NO free videos to watch
  const hasFreeVideos = videos.some((v: Video) => v.canWatch);
  if (!canAccessPaidContent && !enrollment && !hasFreeVideos) {
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
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 overflow-hidden`}
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
        <div className="h-14 sm:h-16 bg-gray-800 border-b border-gray-700 flex items-center px-2 sm:px-4 gap-2 sm:gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -m-2 text-gray-400 hover:text-white transition-colors flex-shrink-0 hidden sm:block"
            title="Toggle sidebar"
          >
            <svg className="w-5 w-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Play/Pause Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.pause();
                }
              }}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Pause"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.play();
                }
              }}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Play"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>

          <div className="flex-1 min-w-0">
            {currentVideo && (
              <h1 className="text-xs sm:text-sm md:text-base text-white font-medium truncate">{currentVideo.title}</h1>
            )}
          </div>

          {/* Mobile Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -m-2 text-gray-400 hover:text-white transition-colors flex-shrink-0 sm:hidden"
            title="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Video Player Area */}
        <div className="flex-1 flex flex-col bg-black">
          {currentVideo && !currentVideo.canWatch && currentVideo.isLocked ? (
            // Locked Video Screen
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
              <div className="text-center">
                <svg className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-gray-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{t.locked}</h2>
                <p className="text-gray-400 mb-6 text-sm sm:text-base">This video is only available for enrolled students.</p>
                <Link
                  href={`/e-learning/${slug}`}
                  className="inline-block px-6 sm:px-8 py-2.5 sm:py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors text-sm sm:text-base"
                >
                  {t.enrollNow}
                </Link>
              </div>
            </div>
          ) : currentVideo && videoStream ? (
            <>
              {/* Video */}
              <div className="flex-1 flex items-center justify-center">
                {videoLoading ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : videoStream.streaming.playerUrl ? (
                  // Bunny mediadelivery player (iframe) - avoids CORS issues
                  <div
                    style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#000' }}
                    onContextMenu={(e) => { e.preventDefault(); return false; }}
                  >
                    <iframe
                      src={videoStream.streaming.playerUrl}
                      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                      loading="eager"
                      title="Video player"
                    />
                  </div>
                ) : videoStream.streaming.hlsUrl ? (
                  // HLS Video Player (fallback if available)
                  <HLSVideoPlayer
                    src={videoStream.streaming.hlsUrl}
                    autoPlay={autoplay}
                    muted={currentVideo.isFree}
                    className="w-full h-full"
                    videoRef={videoRef as any}
                    onPlay={startProgressTracking}
                    onError={(err) => console.error('Video error:', err)}
                  />
                ) : videoStream.streaming.directUrl?.includes('youtube.com') || videoStream.streaming.directUrl?.includes('youtu.be') ? (
                  // YouTube Video
                  <iframe
                    className="w-full h-full rounded-lg"
                    src={videoStream.streaming.directUrl.replace('youtu.be/', 'youtube.com/embed/').replace('watch?v=', 'embed/')}
                    title={videoStream.video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : videoStream.streaming.directUrl ? (
                  // Direct Video (protected)
                  <div
                    className="video-player-direct relative w-full h-full bg-black"
                    onContextMenu={(e) => { e.preventDefault(); return false; }}
                  >
                    <video
                      ref={videoRef}
                      src={videoStream.streaming.directUrl}
                      autoPlay={autoplay}
                      muted={currentVideo.isFree}
                      playsInline
                      controls
                      onPlay={startProgressTracking}
                      onEnded={handleVideoEnded}
                      onPause={() => updateProgress(false)}
                      onTimeUpdate={handleTimeUpdate}
                      className="w-full h-full"
                      style={{ display: 'block' }}
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    Unable to load video
                  </div>
                )}
              </div>

              {/* Bottom Controls */}
              <div className="h-16 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-3 sm:px-6">
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
                  <span className="hidden sm:inline">{t.previousVideo}</span>
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
                  <span className="hidden sm:inline">{t.nextVideo}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {videoStream.video.ragEnabled && videoStream.video.hasRagContent && (
                <div className="bg-gray-900 border-t border-gray-700 p-3 sm:p-4">
                  <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h2 className="text-sm font-semibold text-white">Ask This Video</h2>
                      {videoAskLoading && <span className="text-xs text-orange-300">Thinking...</span>}
                    </div>

                    {videoAskMessages.length > 0 && (
                      <div className="max-h-44 overflow-y-auto space-y-2 mb-3 pr-1">
                        {videoAskMessages.map((msg, index) => (
                          <div
                            key={`${msg.role}-${index}`}
                            className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                              msg.role === 'user'
                                ? 'bg-orange-500/15 text-orange-100 ml-8'
                                : 'bg-gray-800 text-gray-100 mr-8'
                            }`}
                          >
                            {msg.content}
                          </div>
                        ))}
                      </div>
                    )}

                    {videoAskError && (
                      <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                        {videoAskError}
                      </div>
                    )}

                    <form onSubmit={askVideoAssistant} className="flex gap-2">
                      <input
                        value={videoQuestion}
                        onChange={(e) => setVideoQuestion(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-700 bg-black px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
                        placeholder="Ask a question from this video..."
                      />
                      <button
                        type="submit"
                        disabled={videoAskLoading || !videoQuestion.trim()}
                        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Ask
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center px-4 py-8">
              <p className="text-gray-500 text-base sm:text-lg text-center">{t.selectVideo}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
