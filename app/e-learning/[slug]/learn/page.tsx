'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import HLSVideoPlayer from '@/components/HLSVideoPlayer';
import CourseLeadUnlockModal from '@/components/CourseLeadUnlockModal';
import { CheckSquare, Clock, Bell, ListTodo, CheckCircle2, RotateCcw, Sparkles, HelpCircle } from 'lucide-react';

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
  thumbnail?: string;
}

interface Material {
  _id: string;
  title: string;
  type: string;
  fileUrl?: string;
  description?: string;
  meetingDate?: string;
  meetingTime?: string;
  meetingUrl?: string;
  meetingId?: string;
  meetingPassword?: string;
  slots?: Array<{ date: string; time: string; joinUrl?: string; meetingId?: string; password?: string }>;
}

interface Course {
  _id: string;
  id?: string;
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

interface AssignmentQuestion {
  id: string;
  type: 'short_text' | 'paragraph' | 'single_choice' | 'multiple_choice' | 'dropdown';
  prompt: string;
  options: string[];
  correctAnswer: string | string[];
  points: number;
}

interface TaskChecklistItem {
  id: string;
  text: string;
  hint?: string;
  required?: boolean;
}

interface Assignment {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  instructions?: string;
  level?: string;
  totalPoints: number;
  passingPoints: number;
  questions?: AssignmentQuestion[];
  subType?: 'assignment' | 'task' | 'question' | string;
  taskType?: string;
  checklist?: TaskChecklistItem[];
  countdownHours?: number | null;
  reminderType?: string | null;
  reminderNote?: string;
  isRecurring?: boolean;
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
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeTab, setActiveTab] = useState<'videos' | 'zoom' | 'assignments'>('videos');
  const [selectedZoomMeeting, setSelectedZoomMeeting] = useState<Material | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizResult, setQuizResult] = useState<{ score: number; total: number; passed: boolean } | null>(null);
  const [taskChecklistState, setTaskChecklistState] = useState<Record<string, boolean>>({});
  const [taskCompleted, setTaskCompleted] = useState<boolean>(false);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, any>>({});
  const [questionSubmitted, setQuestionSubmitted] = useState<boolean>(false);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [canAccessPaidContent, setCanAccessPaidContent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [pendingTargetVideo, setPendingTargetVideo] = useState<Video | null>(null);
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
  // Populated further down, once handleVideoEnded/updateProgress are declared
  // (see the comment there for why the assignment can't happen here).
  const handleVideoEndedRef = useRef<() => void>(() => {});
  const updateProgressRef = useRef<(completed: boolean) => void>(() => {});

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

      const response = await fetch(`/api/recorded-courses?slug=${slug}&lang=${language}&_t=${Date.now()}`, {
        headers,
        cache: 'no-store',
      });
      const data = await response.json();

      if (data.success) {
        setCourse(data.course);
        setSections(data.sections || []);
        setVideos(data.videos || []);
        setMaterials(data.materials || []);
        setAssignments(data.assignments || []);
        setEnrollment(data.enrollment);
        setCanAccessPaidContent(data.canAccessPaidContent);

        // Expand all sections
        if (data.sections?.length > 0) {
          setExpandedSections(new Set(data.sections.map((s: Section) => s._id)));
        }

        // Check whether user has unlocked this course
        const userIsUnlocked =
          typeof window !== 'undefined' &&
          (localStorage.getItem(`swar_course_unlocked_${slug}`) === 'true' ||
            localStorage.getItem('swar_course_unlocked_all') === 'true' ||
            Boolean(token));
        setIsUnlocked(userIsUnlocked);

        // Auto-select video from URL param, last watched, or first video
        if (videoIdParam) {
          const selectedIndex = data.videos?.findIndex((v: Video) => v._id === videoIdParam);
          const selectedVideo = selectedIndex >= 0 ? data.videos[selectedIndex] : null;
          if (selectedVideo) {
            if (selectedIndex === 0 || userIsUnlocked) {
              setCurrentVideo(selectedVideo);
            } else {
              // Video 2+ selected without filling form: load video 1 and show unlock modal
              setCurrentVideo(data.videos[0] || selectedVideo);
              setPendingTargetVideo(selectedVideo);
              setShowUnlockModal(true);
            }
          }
        } else if (data.enrollment?.lastWatchedVideoId || data.enrollment?.lastVideoId) {
          const lastVideoId = String(data.enrollment.lastWatchedVideoId || data.enrollment.lastVideoId);
          const lastVideo = data.videos?.find((v: Video) => v._id === lastVideoId);
          if (lastVideo) {
            setCurrentVideo(lastVideo);
          }
        } else if (data.videos?.length > 0) {
          // Always default to Video 1 (which is 100% free for everyone)
          const firstWatchable = data.videos[0] || data.videos.find((v: Video) => v.canWatch);
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

    const currentIndex = videos.findIndex((v) => v._id === currentVideo?._id);
    const userIsUnlocked =
      isUnlocked ||
      (typeof window !== 'undefined' &&
        (localStorage.getItem(`swar_course_unlocked_${slug}`) === 'true' ||
          localStorage.getItem('swar_course_unlocked_all') === 'true' ||
          Boolean(localStorage.getItem('token'))));

    if (currentIndex === 0 && !userIsUnlocked) {
      // User just finished Video 1! Open the unlock modal so they can continue to Video 2-6
      const nextVid = videos[1];
      if (nextVid) {
        setPendingTargetVideo(nextVid);
        setShowUnlockModal(true);
      }
      return;
    }

    // Auto-play next video
    if (autoplay) {
      const nextVideo = videos.find((v, i) => i > currentIndex && v.canWatch);
      if (nextVideo) {
        const nextIndex = videos.findIndex((v) => v._id === nextVideo._id);
        if (nextIndex > 0 && !userIsUnlocked) {
          setPendingTargetVideo(nextVideo);
          setShowUnlockModal(true);
        } else {
          setCurrentVideo(nextVideo);
        }
      }
    }
  };

  // Keep stable refs to avoid re-attaching listeners on every render.
  // Must come after handleVideoEnded/updateProgress are declared above —
  // referencing them earlier (even just as useRef's initial value) throws
  // "Cannot access before initialization" once the build minifies these
  // const names, since both are declared further down in this same
  // component body and the reference is evaluated eagerly, not lazily.
  handleVideoEndedRef.current = handleVideoEnded;
  updateProgressRef.current = updateProgress;

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

  const handleSelectVideo = useCallback(
    (video: Video) => {
      const vIndex = videos.findIndex((v) => v._id === video._id);
      const isFirstVideo = vIndex === 0;
      const userIsUnlocked =
        isFirstVideo ||
        isUnlocked ||
        (typeof window !== 'undefined' &&
          (localStorage.getItem(`swar_course_unlocked_${slug}`) === 'true' ||
            localStorage.getItem('swar_course_unlocked_all') === 'true' ||
            Boolean(localStorage.getItem('token'))));

      if (userIsUnlocked) {
        setCurrentVideo(video);
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
          setSidebarOpen(false);
        }
      } else {
        setPendingTargetVideo(video);
        setShowUnlockModal(true);
      }
    },
    [videos, isUnlocked, slug]
  );

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

  // Real-time ticking live countdown
  const [zoomCountdown, setZoomCountdown] = useState({ days: 0, hours: 2, minutes: 45, seconds: 12 });
  useEffect(() => {
    const timer = setInterval(() => {
      setZoomCountdown((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAnswerChange = (questionId: string, value: any) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleToggleMultipleChoice = (questionId: string, option: string) => {
    setUserAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const updated = current.includes(option)
        ? current.filter((x: string) => x !== option)
        : [...current, option];
      return { ...prev, [questionId]: updated };
    });
  };

  const handleSubmitQuiz = () => {
    if (!selectedAssignment) return;
    const questions = selectedAssignment.questions || [];
    let calculatedScore = 0;
    let maxPoints = 0;

    questions.forEach((q) => {
      const qPts = Number(q.points) || 10;
      maxPoints += qPts;
      const userAns = userAnswers[q.id];

      if (q.type === 'single_choice' || q.type === 'dropdown') {
        if (
          userAns &&
          q.correctAnswer &&
          String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
        ) {
          calculatedScore += qPts;
        }
      } else if (q.type === 'multiple_choice') {
        const correctArray = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
        const userArray = Array.isArray(userAns) ? userAns : [userAns];
        const isMatch =
          correctArray.length > 0 &&
          correctArray.every((a) => userArray.includes(a)) &&
          userArray.every((a) => correctArray.includes(a));
        if (isMatch) calculatedScore += qPts;
      } else if (q.type === 'short_text') {
        if (
          userAns &&
          q.correctAnswer &&
          String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase()
        ) {
          calculatedScore += qPts;
        } else if (userAns && String(userAns).trim().length > 0) {
          calculatedScore += qPts;
        }
      } else if (q.type === 'paragraph') {
        if (userAns && String(userAns).trim().length > 10) {
          calculatedScore += qPts;
        }
      }
    });

    if (maxPoints === 0) maxPoints = selectedAssignment.totalPoints || 100;
    const passingRequired = selectedAssignment.passingPoints || 60;
    const isPassed = calculatedScore >= passingRequired;

    setQuizResult({
      score: calculatedScore,
      total: maxPoints,
      passed: isPassed,
    });
    setQuizSubmitted(true);

    // Save to database
    try {
      const token = localStorage.getItem('token');
      if (token && selectedAssignment) {
        fetch('/api/user/assignments/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            assignmentId: selectedAssignment._id || selectedAssignment.id,
            courseId: course?._id || course?.id || '',
            subType: selectedAssignment.subType || 'assignment',
            title: selectedAssignment.title,
            answers: userAnswers,
            score: calculatedScore,
            total: maxPoints,
            passed: isPassed,
            status: isPassed ? 'passed' : 'submitted',
          }),
        }).catch((err) => console.error('Quiz sync error:', err));
      }
    } catch {}
  };

  const handleResetQuiz = () => {
    setUserAnswers({});
    setQuizSubmitted(false);
    setQuizResult(null);
  };

  useEffect(() => {
    if (selectedAssignment?._id || selectedAssignment?.id) {
      const keyId = selectedAssignment._id || selectedAssignment.id;
      try {
        const saved = localStorage.getItem(`swar_task_${keyId}`);
        if (saved) {
          setTaskChecklistState(JSON.parse(saved));
        } else {
          setTaskChecklistState({});
        }
        const done = localStorage.getItem(`swar_task_${keyId}_done`);
        setTaskCompleted(done === 'true');
      } catch {
        // ignore
      }

      // Try fetching saved submission from database
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`/api/user/assignments/submit?assignmentId=${keyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((resData) => {
            if (resData.success && resData.submissions?.length > 0) {
              const sub = resData.submissions[0];
              if (sub.subType === 'task' || sub.checklist?.length > 0) {
                if (sub.status === 'completed') setTaskCompleted(true);
                if (Array.isArray(sub.checklist)) {
                  const restoredState: Record<string, boolean> = {};
                  sub.checklist.forEach((item: any) => {
                    if (item.id) restoredState[item.id] = Boolean(item.checked);
                  });
                  if (Object.keys(restoredState).length > 0) {
                    setTaskChecklistState((prev) => ({ ...restoredState, ...prev }));
                  }
                }
              } else if (sub.subType === 'question' && sub.answers) {
                setQuestionAnswers((prev) => ({ ...sub.answers, ...prev }));
                if (sub.status === 'submitted') setQuestionSubmitted(true);
              } else if (sub.answers) {
                setUserAnswers((prev) => ({ ...sub.answers, ...prev }));
                if (sub.score !== undefined && sub.score !== null) {
                  setQuizResult({
                    score: sub.score,
                    total: sub.total || 100,
                    passed: Boolean(sub.passed),
                  });
                  setQuizSubmitted(true);
                }
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [selectedAssignment?._id, selectedAssignment?.id, course?._id, course?.id]);

  const handleToggleChecklistItem = (itemId: string) => {
    const keyId = selectedAssignment?._id || selectedAssignment?.id;
    if (!keyId) return;
    const updated = { ...taskChecklistState, [itemId]: !taskChecklistState[itemId] };
    setTaskChecklistState(updated);
    try {
      localStorage.setItem(`swar_task_${keyId}`, JSON.stringify(updated));
    } catch {}

    // Background sync checklist update
    try {
      const token = localStorage.getItem('token');
      if (token && selectedAssignment) {
        const checklistItems = (selectedAssignment.checklist || []).map((item, idx) => {
          const chkId = item.id || `item_${idx}`;
          return {
            id: chkId,
            text: item.text,
            checked: Boolean(updated[chkId]),
          };
        });
        const allChecked = checklistItems.length > 0 && checklistItems.every((c) => c.checked);
        fetch('/api/user/assignments/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            assignmentId: keyId,
            courseId: course?._id || course?.id || '',
            subType: 'task',
            title: selectedAssignment.title,
            checklist: checklistItems,
            status: allChecked ? 'completed' : 'in_progress',
          }),
        }).catch(() => {});
      }
    } catch {}
  };

  const handleCompleteTask = () => {
    const keyId = selectedAssignment?._id || selectedAssignment?.id;
    if (!keyId) return;
    setTaskCompleted(true);
    try {
      localStorage.setItem(`swar_task_${keyId}_done`, 'true');
    } catch {}

    // Sync to database
    try {
      const token = localStorage.getItem('token');
      if (token && selectedAssignment) {
        const checklistItems = (selectedAssignment.checklist || []).map((item, idx) => {
          const chkId = item.id || `item_${idx}`;
          return {
            id: chkId,
            text: item.text,
            checked: true, // mark all complete
          };
        });
        // also set state
        const allState: Record<string, boolean> = {};
        checklistItems.forEach((c) => (allState[c.id] = true));
        setTaskChecklistState(allState);

        fetch('/api/user/assignments/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            assignmentId: keyId,
            courseId: course?._id || course?.id || '',
            subType: 'task',
            title: selectedAssignment.title,
            checklist: checklistItems,
            status: 'completed',
          }),
        }).catch(() => {});
      }
    } catch {}
  };

  const handleResetTask = () => {
    const keyId = selectedAssignment?._id || selectedAssignment?.id;
    if (!keyId) return;
    setTaskCompleted(false);
    setTaskChecklistState({});
    try {
      localStorage.removeItem(`swar_task_${keyId}`);
      localStorage.removeItem(`swar_task_${keyId}_done`);
    } catch {}
  };

  useEffect(() => {
    if (selectedAssignment?._id || selectedAssignment?.id) {
      const keyId = selectedAssignment._id || selectedAssignment.id;
      try {
        const savedQ = localStorage.getItem(`swar_q_answers_${keyId}`);
        if (savedQ) {
          setQuestionAnswers(JSON.parse(savedQ));
        } else {
          setQuestionAnswers({});
        }
        const doneQ = localStorage.getItem(`swar_q_submitted_${keyId}`);
        setQuestionSubmitted(doneQ === 'true');
      } catch {}
    }
  }, [selectedAssignment?._id, selectedAssignment?.id]);

  const handleAnswerQuestion = (qId: string, val: any) => {
    const keyId = selectedAssignment?._id || selectedAssignment?.id;
    if (!keyId) return;
    const updated = { ...questionAnswers, [qId]: val };
    setQuestionAnswers(updated);
    try {
      localStorage.setItem(`swar_q_answers_${keyId}`, JSON.stringify(updated));
    } catch {}
  };

  const handleSubmitQuestion = () => {
    const keyId = selectedAssignment?._id || selectedAssignment?.id;
    if (!keyId) return;
    setQuestionSubmitted(true);
    try {
      localStorage.setItem(`swar_q_submitted_${keyId}`, 'true');
    } catch {}

    // Sync to database
    try {
      const token = localStorage.getItem('token');
      if (token && selectedAssignment) {
        fetch('/api/user/assignments/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            assignmentId: keyId,
            courseId: course?._id || course?.id || '',
            subType: 'question',
            title: selectedAssignment.title,
            answers: questionAnswers,
            status: 'submitted',
          }),
        }).catch(() => {});
      }
    } catch {}
  };

  const handleResetQuestion = () => {
    const keyId = selectedAssignment?._id || selectedAssignment?.id;
    if (!keyId) return;
    setQuestionSubmitted(false);
    try {
      localStorage.removeItem(`swar_q_submitted_${keyId}`);
    } catch {}
  };

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
          sidebarOpen ? 'w-[88vw] max-w-sm lg:w-96 shadow-2xl' : 'w-0'
        } fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Course Header */}
        <div className="p-3.5 sm:p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <Link
              href={`/e-learning/${slug}`}
              className="text-gray-400 hover:text-white text-xs sm:text-sm flex items-center gap-1.5 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t.backToCourse}</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 -mr-1 text-gray-400 hover:text-white hover:bg-gray-700/80 rounded-lg transition-colors"
              title="Close drawer"
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <h2 className="text-white font-semibold text-sm sm:text-base line-clamp-2">{course?.title}</h2>
          
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
          {/* Tabs: Recorded Videos vs Live Zoom vs Quizzes */}
          <div className="grid grid-cols-3 gap-1 mt-4 p-1 bg-gray-900/90 rounded-xl border border-gray-700/80">
            <button
              onClick={() => { setActiveTab('videos'); setSelectedZoomMeeting(null); setSelectedAssignment(null); }}
              className={`py-2 px-1 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                activeTab === 'videos'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Videos ({videos.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('zoom');
                setSelectedAssignment(null);
                const firstZoom = materials.find(m => m.type === 'zoom' || (m as any).materialType === 'zoom' || m.fileUrl?.includes('zoom.us'));
                if (firstZoom) setSelectedZoomMeeting(firstZoom);
              }}
              className={`py-2 px-1 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                activeTab === 'zoom'
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-purple-300" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.5 4.5A2.25 2.25 0 002.25 6.75v10.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25v-10.5A2.25 2.25 0 0015 4.5H4.5zm12 3.879l4.5-2.25v11.742l-4.5-2.25V8.379z" />
                </svg>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <span>Live Zoom ({materials.filter(m => m.type === 'zoom' || m.fileUrl?.includes('zoom.us')).length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('assignments');
                setSelectedZoomMeeting(null);
                if (assignments.length > 0 && !selectedAssignment) {
                  setSelectedAssignment(assignments[0]);
                }
              }}
              className={`py-2 px-1 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                activeTab === 'assignments'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <svg className="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Tasks & Quizzes ({assignments.length})</span>
            </button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'assignments' ? (
            <div className="p-3 space-y-2">
              {assignments.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No tasks or quizzes published yet.
                </div>
              ) : (
                assignments.map((assignment) => {
                  const isSelected = selectedAssignment?._id === assignment._id || selectedAssignment?.id === assignment.id;
                  const isTask = assignment.subType === 'task' || (assignment.checklist && assignment.checklist.length > 0);
                  const isQuestion = assignment.subType === 'question';
                  const lvl = assignment.level || 'Level 1: Beginner';
                  const qCount = assignment.questions?.length || 0;
                  const chkCount = assignment.checklist?.length || 0;

                  return (
                    <button
                      key={assignment._id || assignment.id}
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        handleResetQuiz();
                      }}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? isTask
                            ? 'bg-gradient-to-r from-amber-950/60 to-yellow-950/60 border-amber-500 ring-2 ring-amber-500/30 text-white shadow-lg'
                            : isQuestion
                            ? 'bg-gradient-to-r from-teal-950/60 to-cyan-950/60 border-teal-500 ring-2 ring-teal-500/30 text-white shadow-lg'
                            : 'bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border-emerald-500 ring-2 ring-emerald-500/30 text-white shadow-lg'
                          : isTask
                            ? 'bg-gray-800/60 border-amber-500/30 text-gray-300 hover:border-amber-500/60 hover:bg-gray-800'
                            : isQuestion
                            ? 'bg-gray-800/60 border-teal-500/30 text-gray-300 hover:border-teal-500/60 hover:bg-gray-800'
                            : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:border-emerald-500/50 hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                          isTask
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : isQuestion
                            ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {isTask ? '📋 Practice Task' : isQuestion ? '❓ Question(s)' : lvl}
                        </span>
                        {isTask ? (
                          assignment.countdownHours ? (
                            <span className="text-[10px] font-semibold text-amber-400">
                              ⏱️ {assignment.countdownHours}h Countdown
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-gray-400">
                              To-Do Checklist
                            </span>
                          )
                        ) : isQuestion ? (
                          <span className="text-[10px] font-semibold text-teal-400">
                            💬 {qCount} Question(s)
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-amber-400">
                            🎯 Passing: {assignment.passingPoints} pts
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-sm line-clamp-1 text-white">{assignment.title}</p>
                      {assignment.description && (
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{assignment.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400 font-medium">
                        {isTask ? (
                          <>
                            <span>✅ {chkCount} Action Items</span>
                            {assignment.reminderType && (
                              <>
                                <span>•</span>
                                <span>🔔 {assignment.reminderType === 'sunrise' ? 'Sunrise' : assignment.reminderType === 'morning' ? 'Morning' : assignment.reminderType === 'bedtime' ? 'Night' : 'Daily'}</span>
                              </>
                            )}
                          </>
                        ) : isQuestion ? (
                          <span>📝 Student Q&A / Reflection</span>
                        ) : (
                          <>
                            <span>📝 {qCount} Questions</span>
                            <span>•</span>
                            <span>⭐ {assignment.totalPoints || 100} Total Marks</span>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : activeTab === 'zoom' ? (
            <div className="p-3 space-y-2">
              {materials.filter(m => m.type === 'zoom' || m.fileUrl?.includes('zoom.us')).length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs">
                  No live Zoom sessions scheduled for this course yet.
                </div>
              ) : (
                materials.filter(m => m.type === 'zoom' || m.fileUrl?.includes('zoom.us')).map((meeting) => (
                  <button
                    key={meeting._id}
                    onClick={() => setSelectedZoomMeeting(meeting)}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      selectedZoomMeeting?._id === meeting._id
                        ? 'bg-indigo-500/20 border-indigo-500 text-white'
                        : 'bg-gray-800/60 border-gray-700/60 text-gray-300 hover:border-indigo-500/50 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Live Zoom Session</span>
                    </div>
                    <p className="font-semibold text-sm line-clamp-1 text-white">{meeting.title}</p>
                    {meeting.meetingDate && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        📅 {meeting.meetingDate} {meeting.meetingTime ? `at ${meeting.meetingTime}` : ''}
                      </p>
                    )}
                    {meeting.slots && meeting.slots.length > 0 && (
                      <span className="inline-block mt-2 text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                        {meeting.slots.length} Slots Available
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
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
                    {getVideosBySection(section._id).map((video) => {
                      const vIndex = videos.findIndex((v) => v._id === video._id);
                      const isFirst = vIndex === 0;
                      const userUnlocked = isFirst || isUnlocked || Boolean(typeof window !== 'undefined' && localStorage.getItem('token'));

                      return (
                        <button
                          key={video._id}
                          onClick={() => handleSelectVideo(video)}
                          className={`w-full group flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                            currentVideo?._id === video._id
                              ? 'bg-orange-500/15 border border-orange-500/50 shadow-sm'
                              : userUnlocked
                              ? 'hover:bg-gray-700/60'
                              : 'hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30'
                          }`}
                        >
                          {/* Video Thumbnail */}
                          <div className="relative w-24 h-14 sm:w-28 sm:h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0 border border-gray-700/80 shadow-md group-hover:border-gray-500 transition-colors">
                            {video.thumbnail ? (
                              <img
                                src={video.thumbnail}
                                alt={video.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  if (course?.thumbnail && target.src !== course.thumbnail) {
                                    target.src = course.thumbnail;
                                  } else {
                                    target.style.display = 'none';
                                  }
                                }}
                              />
                            ) : null}

                            {/* Fallback gradient if no thumbnail or loading */}
                            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
                              <svg className="w-6 h-6 text-orange-500/60" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>

                            {/* Duration Badge */}
                            <span className="absolute bottom-1 right-1 bg-black/85 backdrop-blur-xs text-[10px] font-mono text-white/95 px-1 py-0.5 rounded leading-none shadow-sm">
                              {formatDuration(video.duration)}
                            </span>

                            {/* Status Overlay */}
                            {isVideoCompleted(video._id) ? (
                              <div className="absolute top-1 left-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow">
                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : currentVideo?._id === video._id ? (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg ring-2 ring-orange-400 animate-pulse">
                                  <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </div>
                            ) : !userUnlocked ? (
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500/90 text-white rounded text-[9px] font-bold flex items-center gap-1 shadow">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span>Unlock</span>
                              </div>
                            ) : null}
                          </div>

                          {/* Title, Topic Description, Badges */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <p
                              className={`text-xs sm:text-sm font-medium line-clamp-2 leading-snug ${
                                currentVideo?._id === video._id ? 'text-orange-400 font-semibold' : 'text-gray-200 group-hover:text-white'
                              }`}
                            >
                              {video.title}
                            </p>
                            {video.description ? (
                              <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                                {video.description}
                              </p>
                            ) : null}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {isFirst ? (
                                <span className="text-[10px] font-medium bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                  Free
                                </span>
                              ) : userUnlocked ? (
                                <span className="text-[10px] font-medium bg-green-500/20 text-green-300 px-1.5 py-0.2 rounded border border-green-500/30">
                                  Unlocked
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium bg-amber-500/25 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40">
                                  Free Unlock
                                </span>
                              )}
                              {currentVideo?._id === video._id && (
                                <span className="text-[10px] font-semibold text-orange-400 flex items-center gap-1 bg-orange-500/10 px-1.5 py-0.2 rounded border border-orange-500/20">
                                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                                  Playing
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Uncategorized Videos */}
            {uncategorizedVideos.length > 0 && (
              <div className="space-y-1">
                {uncategorizedVideos.map((video) => {
                  const vIndex = videos.findIndex((v) => v._id === video._id);
                  const isFirst = vIndex === 0;
                  const userUnlocked = isFirst || isUnlocked || Boolean(typeof window !== 'undefined' && localStorage.getItem('token'));

                  return (
                    <button
                      key={video._id}
                      onClick={() => handleSelectVideo(video)}
                      className={`w-full group flex items-start gap-3 p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                        currentVideo?._id === video._id
                          ? 'bg-orange-500/15 border border-orange-500/50 shadow-sm'
                          : userUnlocked
                          ? 'hover:bg-gray-700/60'
                          : 'hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30'
                      }`}
                    >
                      {/* Video Thumbnail */}
                      <div className="relative w-24 h-14 sm:w-28 sm:h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0 border border-gray-700/80 shadow-md group-hover:border-gray-500 transition-colors">
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.currentTarget as HTMLImageElement;
                              if (course?.thumbnail && target.src !== course.thumbnail) {
                                target.src = course.thumbnail;
                              } else {
                                target.style.display = 'none';
                              }
                            }}
                          />
                        ) : null}

                        {/* Fallback gradient if no thumbnail or loading */}
                        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
                          <svg className="w-6 h-6 text-orange-500/60" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>

                        {/* Duration Badge */}
                        <span className="absolute bottom-1 right-1 bg-black/85 backdrop-blur-xs text-[10px] font-mono text-white/95 px-1 py-0.5 rounded leading-none shadow-sm">
                          {formatDuration(video.duration)}
                        </span>

                        {/* Status Overlay */}
                        {isVideoCompleted(video._id) ? (
                          <div className="absolute top-1 left-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : currentVideo?._id === video._id ? (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-lg ring-2 ring-orange-400 animate-pulse">
                              <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        ) : !userUnlocked ? (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500/90 text-white rounded text-[9px] font-bold flex items-center gap-1 shadow">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span>Unlock</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Title, Topic Description, Badges */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <p
                          className={`text-xs sm:text-sm font-medium line-clamp-2 leading-snug ${
                            currentVideo?._id === video._id ? 'text-orange-400 font-semibold' : 'text-gray-200 group-hover:text-white'
                          }`}
                        >
                          {video.title}
                        </p>
                        {video.description ? (
                          <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                            {video.description}
                          </p>
                        ) : null}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {isFirst ? (
                            <span className="text-[10px] font-medium bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/30">
                              Free
                            </span>
                          ) : userUnlocked ? (
                            <span className="text-[10px] font-medium bg-green-500/20 text-green-300 px-1.5 py-0.2 rounded border border-green-500/30">
                              Unlocked
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium bg-amber-500/25 text-amber-300 px-1.5 py-0.2 rounded border border-amber-500/40">
                              Free Unlock
                            </span>
                          )}
                          {currentVideo?._id === video._id && (
                            <span className="text-[10px] font-semibold text-orange-400 flex items-center gap-1 bg-orange-500/10 px-1.5 py-0.2 rounded border border-orange-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                              Playing
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 sm:h-16 bg-gray-800 border-b border-gray-700 flex items-center px-2.5 sm:px-4 gap-2 sm:gap-4 justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 sm:p-2 text-gray-300 hover:text-white hover:bg-gray-700/70 rounded-lg transition-colors flex-shrink-0 flex items-center gap-1.5 bg-gray-700/40 border border-gray-600/40"
              title="Toggle topics sidebar"
              aria-label="Toggle topics sidebar"
            >
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="hidden sm:inline text-xs font-semibold text-gray-200">Topics</span>
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

            <div className="flex-1 min-w-0 ml-1">
              {activeTab === 'assignments' ? (
                <h1 className="text-xs sm:text-sm md:text-base text-white font-medium truncate flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-400 font-bold hidden sm:inline">Quiz:</span>
                  <span className="text-gray-200 truncate">{selectedAssignment?.title || 'Select a quiz from topics'}</span>
                </h1>
              ) : activeTab === 'zoom' ? (
                <h1 className="text-xs sm:text-sm md:text-base text-white font-medium truncate flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />
                  <span className="text-indigo-400 font-bold hidden sm:inline">Live Zoom:</span>
                  <span className="text-gray-200 truncate">{selectedZoomMeeting?.title || 'Interactive Session'}</span>
                </h1>
              ) : currentVideo ? (
                <h1 className="text-xs sm:text-sm md:text-base text-white font-medium truncate">{currentVideo.title}</h1>
              ) : null}
            </div>
          </div>

          {/* Quick Counter / Badge */}
          {currentVideo && videos.length > 0 && (
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className="text-[11px] font-mono font-medium text-gray-400 bg-gray-900/90 px-2 py-1 rounded-md border border-gray-700/80">
                {videos.findIndex((v) => v._id === currentVideo._id) + 1} / {videos.length}
              </span>
            </div>
          )}
        </div>

        {/* Video Player, Live Zoom, or Assignment Area */}
        <div className="flex-1 flex flex-col bg-black overflow-y-auto">
          {activeTab === 'assignments' ? (
            <div className="flex-1 p-4 sm:p-8 max-w-4xl mx-auto w-full">
              {!selectedAssignment ? (
                <div className="text-center py-16 bg-gray-900/60 rounded-2xl border border-gray-800 p-8 my-auto">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Select a Quiz or Level</h2>
                  <p className="text-gray-400 text-sm max-w-md mx-auto mb-4">
                    Choose an assignment from the sidebar to test your understanding and unlock your next level!
                  </p>
                  {assignments.length > 0 && (
                    <button
                      onClick={() => { setSelectedAssignment(assignments[0]); handleResetQuiz(); }}
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/30"
                    >
                      Start First Quiz: {assignments[0].title}
                    </button>
                  )}
                </div>
              ) : (selectedAssignment.subType === 'task' || (selectedAssignment.checklist && selectedAssignment.checklist.length > 0)) ? (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Task Hero Card */}
                  <div className="bg-gradient-to-br from-amber-950/70 via-gray-900 to-yellow-950/60 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-black uppercase tracking-wider shadow">
                        {selectedAssignment.level || 'Level 1: Beginner'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                        <ListTodo size={13} />
                        <span>Actionable Practice Task</span>
                      </span>
                      {selectedAssignment.countdownHours ? (
                        <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-gray-800 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Clock size={13} />
                          <span>{selectedAssignment.countdownHours}h Countdown Timer</span>
                        </span>
                      ) : null}
                      {selectedAssignment.isRecurring && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-300">
                          🔄 Daily Practice Habit
                        </span>
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                      {selectedAssignment.title}
                    </h1>

                    {selectedAssignment.description && (
                      <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4 max-w-3xl">
                        {selectedAssignment.description}
                      </p>
                    )}

                    {/* Reminder & Recommended Timing Banner */}
                    {(selectedAssignment.reminderType || selectedAssignment.reminderNote) && (
                      <div className="p-3.5 bg-black/60 rounded-2xl border border-amber-500/30 text-xs sm:text-sm text-gray-300 flex items-start gap-2.5 shadow-sm">
                        <Bell size={18} className="text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="font-bold text-amber-300">
                            Recommended Timing:{' '}
                            {selectedAssignment.reminderType === 'sunrise'
                              ? '🌅 Brahma Muhurta / Sunrise (5:00 - 6:30 AM)'
                              : selectedAssignment.reminderType === 'morning'
                              ? '☀️ Morning Practice (6:30 - 9:00 AM)'
                              : selectedAssignment.reminderType === 'afternoon'
                              ? '🥗 Mid-Day / Digestion (12:00 - 2:00 PM)'
                              : selectedAssignment.reminderType === 'sunset'
                              ? '🌇 Sunset / Sandhya (5:30 - 7:00 PM)'
                              : selectedAssignment.reminderType === 'bedtime'
                              ? '🌙 Night / Pre-Sleep (9:00 - 10:30 PM)'
                              : selectedAssignment.reminderType === 'twice_daily'
                              ? '🔄 Twice Daily (Morning & Sunset)'
                              : '⏰ Flexible / Anytime Practice'}
                          </div>
                          {selectedAssignment.reminderNote && (
                            <div className="text-gray-400 text-xs">{selectedAssignment.reminderNote}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Completed Celebration Banner */}
                  {taskCompleted && (
                    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-950 via-gray-900 to-emerald-950 border border-amber-500 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-300">
                      <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3 shadow-lg bg-amber-500/20 border border-amber-500/40">
                        🎉
                      </div>
                      <h2 className="text-2xl font-black text-white mb-1">
                        Task Completed! Sadhana Logged ✨
                      </h2>
                      <p className="text-sm text-gray-300 max-w-md mx-auto mb-5">
                        Great dedication! You have successfully completed all action items for this practice task. Keep building your daily Swar Yoga streak!
                      </p>
                      <button
                        type="button"
                        onClick={handleResetTask}
                        className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2"
                      >
                        <RotateCcw size={14} />
                        <span>Reset & Practice Again Today</span>
                      </button>
                    </div>
                  )}

                  {/* To-Do Checklist Card */}
                  <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
                    {/* Progress Header */}
                    {(() => {
                      const chkList = selectedAssignment.checklist || [];
                      const completedCount = chkList.filter(c => taskChecklistState[c.id]).length;
                      const totalCount = chkList.length;
                      const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                      const requiredCount = chkList.filter(c => c.required !== false).length;
                      const completedRequiredCount = chkList.filter(c => c.required !== false && taskChecklistState[c.id]).length;
                      const canComplete = requiredCount === 0 ? completedCount > 0 : completedRequiredCount >= requiredCount;

                      return (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs sm:text-sm">
                              <span className="font-bold text-white flex items-center gap-2">
                                <CheckSquare size={16} className="text-amber-400" />
                                <span>Practice Checklist ({completedCount}/{totalCount} Completed)</span>
                              </span>
                              <span className="font-mono font-bold text-amber-400">
                                {percent}% Complete
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-gray-800">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-300"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>

                          {/* Checklist Items */}
                          {chkList.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                              No checklist items configured for this task.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {chkList.map((item) => {
                                const isChecked = Boolean(taskChecklistState[item.id]);
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => handleToggleChecklistItem(item.id)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                                      isChecked
                                        ? 'bg-amber-950/20 border-amber-500/40 text-gray-300 hover:border-amber-500/60'
                                        : 'bg-black/50 border-gray-800 hover:border-gray-700 text-white hover:bg-black/70'
                                    }`}
                                  >
                                    <div className="pt-0.5 shrink-0">
                                      <div
                                        className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                                          isChecked
                                            ? 'bg-amber-500 border-amber-500 text-black shadow-md shadow-amber-500/30'
                                            : 'border-gray-600 bg-gray-900 text-transparent hover:border-amber-400'
                                        }`}
                                      >
                                        <svg className="w-4 h-4 font-black" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    </div>

                                    <div className="flex-1 space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm sm:text-base font-semibold transition-all ${isChecked ? 'line-through text-gray-400' : 'text-white'}`}>
                                          {item.text}
                                        </span>
                                        {item.required !== false && (
                                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-800 text-amber-400 border border-amber-500/20">
                                            Required
                                          </span>
                                        )}
                                      </div>
                                      {item.hint && (
                                        <p className="text-xs text-gray-400 leading-relaxed">
                                          💡 {item.hint}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Submit Task Action Bar */}
                          {!taskCompleted && (
                            <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                              <span className="text-xs text-gray-400 text-center sm:text-left">
                                {canComplete
                                  ? '✨ All required tasks completed! You can now mark your task completed.'
                                  : `Check off the remaining required items (${completedRequiredCount}/${requiredCount}) to complete.`}
                              </span>

                              <button
                                type="button"
                                onClick={handleCompleteTask}
                                disabled={!canComplete}
                                className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                                  canComplete
                                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-amber-500/30'
                                    : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed opacity-60'
                                }`}
                              >
                                <Sparkles size={16} />
                                <span>Mark Task Completed & Log Sadhana ✨</span>
                              </button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : (selectedAssignment.subType === 'question') ? (
                <div className="space-y-6 animate-in fade-in duration-200">
                  {/* Question Hero Card */}
                  <div className="bg-gradient-to-br from-teal-950/70 via-gray-900 to-cyan-950/60 border border-teal-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 flex items-center gap-1.5">
                        <HelpCircle size={14} />
                        <span>Student Questions & Reflection</span>
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-300">
                        📝 {selectedAssignment.questions?.length || 1} Question(s)
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                      {selectedAssignment.title}
                    </h1>

                    {selectedAssignment.description && (
                      <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-3xl">
                        {selectedAssignment.description}
                      </p>
                    )}
                  </div>

                  {/* Submitted Confirmation Card */}
                  {questionSubmitted && (
                    <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-950 via-gray-900 to-emerald-950 border border-teal-500 shadow-2xl text-center animate-in fade-in zoom-in-95 duration-300">
                      <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl mb-3 shadow-lg bg-teal-500/20 border border-teal-500/40">
                        ✨
                      </div>
                      <h2 className="text-2xl font-black text-white mb-1">
                        Answer Submitted!
                      </h2>
                      <p className="text-sm text-gray-300 max-w-md mx-auto mb-5">
                        Thank you for sharing your answer and reflection. Your response has been recorded.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetQuestion}
                        className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-600 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2"
                      >
                        <RotateCcw size={14} />
                        <span>Edit My Answers</span>
                      </button>
                    </div>
                  )}

                  {/* Questions Form Card */}
                  <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
                    {(!selectedAssignment.questions || selectedAssignment.questions.length === 0) ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No questions configured yet.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {selectedAssignment.questions.map((q, idx) => {
                          const userAns = questionAnswers[q.id];
                          const isSingleChoice = q.type === 'single_choice' || (Array.isArray(q.options) && q.options.length > 0 && q.type !== 'short_text' && q.type !== 'paragraph');
                          const isParagraph = q.type === 'paragraph';

                          return (
                            <div
                              key={q.id || idx}
                              className="p-5 sm:p-6 rounded-2xl bg-black/50 border border-gray-800 space-y-4"
                            >
                              <div className="flex items-start gap-3">
                                <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                  {idx + 1}
                                </span>
                                <h3 className="text-base sm:text-lg font-bold text-white leading-snug">
                                  {q.prompt}
                                </h3>
                              </div>

                              {/* Select One (Radio) */}
                              {isSingleChoice && (
                                <div className="space-y-2.5 pt-1 pl-10">
                                  {q.options.map((opt, optIdx) => {
                                    const isSelected = userAns === opt;
                                    return (
                                      <button
                                        key={optIdx}
                                        type="button"
                                        disabled={questionSubmitted}
                                        onClick={() => handleAnswerQuestion(q.id, opt)}
                                        className={`w-full p-3.5 rounded-xl border text-left text-sm font-medium transition-all flex items-center gap-3 ${
                                          isSelected
                                            ? 'bg-teal-950/60 border-teal-500 text-teal-200 ring-2 ring-teal-500/30 shadow'
                                            : 'bg-black/60 border-gray-800 text-gray-300 hover:border-gray-700 hover:text-white'
                                        } ${questionSubmitted ? 'opacity-80 cursor-default' : ''}`}
                                      >
                                        <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                          isSelected ? 'border-teal-400 bg-teal-500' : 'border-gray-600'
                                        }`}>
                                          {isSelected && <span className="w-2 h-2 rounded-full bg-black" />}
                                        </span>
                                        <span className="flex-1">{opt}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Short Answer */}
                              {!isSingleChoice && !isParagraph && (
                                <div className="pl-10">
                                  <input
                                    type="text"
                                    disabled={questionSubmitted}
                                    value={userAns || ''}
                                    onChange={(e) => handleAnswerQuestion(q.id, e.target.value)}
                                    placeholder="Type your answer here..."
                                    className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl text-white text-sm focus:border-teal-500 focus:outline-none placeholder-gray-500 disabled:opacity-70"
                                  />
                                </div>
                              )}

                              {/* Paragraph Answer */}
                              {isParagraph && (
                                <div className="pl-10">
                                  <textarea
                                    disabled={questionSubmitted}
                                    value={userAns || ''}
                                    onChange={(e) => handleAnswerQuestion(q.id, e.target.value)}
                                    rows={4}
                                    placeholder="Write your answer or reflection here..."
                                    className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl text-white text-sm focus:border-teal-500 focus:outline-none placeholder-gray-500 resize-none disabled:opacity-70"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Submit Bar */}
                    {!questionSubmitted && selectedAssignment.questions && selectedAssignment.questions.length > 0 && (
                      <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <span className="text-xs text-gray-400">
                          {Object.keys(questionAnswers).length > 0
                            ? `Answered ${Object.keys(questionAnswers).length} of ${selectedAssignment.questions.length} questions`
                            : 'Please answer the question(s) above'}
                        </span>

                        <button
                          type="button"
                          onClick={handleSubmitQuestion}
                          disabled={Object.keys(questionAnswers).length === 0}
                          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
                        >
                          <Sparkles size={16} />
                          <span>Submit Answers ✨</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Hero Card */}
                  <div className="bg-gradient-to-br from-emerald-950/70 via-gray-900 to-teal-950/70 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-black uppercase tracking-wider shadow">
                        {selectedAssignment.level || 'Level 1: Beginner'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        🎯 Passing: {selectedAssignment.passingPoints} Marks
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-300">
                        ⭐ Total: {selectedAssignment.totalPoints || 100} Points
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-300">
                        📝 {selectedAssignment.questions?.length || 0} Questions
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-2">
                      {selectedAssignment.title}
                    </h1>

                    {selectedAssignment.description && (
                      <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4 max-w-3xl">
                        {selectedAssignment.description}
                      </p>
                    )}

                    {selectedAssignment.instructions && (
                      <div className="p-3 bg-black/40 rounded-xl border border-gray-800 text-xs text-gray-400 flex items-center gap-2">
                        <span>ℹ️</span>
                        <span>{selectedAssignment.instructions}</span>
                      </div>
                    )}
                  </div>

                  {/* Result Card if Submitted */}
                  {quizSubmitted && quizResult && (
                    <div
                      className={`p-6 sm:p-8 rounded-3xl border shadow-2xl text-center transition-all animate-in fade-in zoom-in-95 duration-300 ${
                        quizResult.passed
                          ? 'bg-gradient-to-br from-emerald-950 via-gray-900 to-teal-950 border-emerald-500 shadow-emerald-500/20'
                          : 'bg-gradient-to-br from-amber-950 via-gray-900 to-rose-950 border-amber-500 shadow-amber-500/20'
                      }`}
                    >
                      <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-3xl mb-4 shadow-lg border border-white/10 bg-white/5">
                        {quizResult.passed ? '🎉' : '💪'}
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
                        {quizResult.passed ? 'Level Cleared! Congratulations! 🎉' : 'Keep Practicing! Almost There!'}
                      </h2>

                      <p className="text-sm sm:text-base text-gray-300 max-w-md mx-auto mb-4">
                        {quizResult.passed
                          ? `You scored ${quizResult.score} out of ${quizResult.total} points! You have satisfied the passing requirement (${selectedAssignment.passingPoints} marks).`
                          : `You scored ${quizResult.score} out of ${quizResult.total} points. Minimum passing requirement is ${selectedAssignment.passingPoints} marks.`}
                      </p>

                      <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-black/50 border border-gray-800 mb-6">
                        <span className="text-sm text-gray-400 font-semibold">Your Score:</span>
                        <span className={`text-xl font-black ${quizResult.passed ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {quizResult.score} / {quizResult.total} Pts
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                          quizResult.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {quizResult.passed ? 'PASSED' : 'NEEDS PRACTICE'}
                        </span>
                      </div>

                      <div className="flex flex-wrap justify-center gap-3">
                        <button
                          onClick={handleResetQuiz}
                          className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl text-sm transition-all"
                        >
                          Retake Quiz 🔄
                        </button>
                        {quizResult.passed && (
                          <button
                            onClick={() => { setActiveTab('videos'); }}
                            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/30 transition-all"
                          >
                            Continue to Next Lesson ➡️
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Questions List */}
                  {selectedAssignment.questions && selectedAssignment.questions.length > 0 ? (
                    <div className="space-y-4">
                      {selectedAssignment.questions.map((q, qIdx) => {
                        const userAns = userAnswers[q.id];
                        return (
                          <div
                            key={q.id || qIdx}
                            className="bg-gray-900/80 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 sm:p-6 transition-all shadow-lg"
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 text-white text-xs font-black flex items-center justify-center shadow">
                                  #{qIdx + 1}
                                </span>
                                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                                  {q.type === 'single_choice' && '🔘 Select One'}
                                  {q.type === 'multiple_choice' && '☑️ Multiple Choice'}
                                  {q.type === 'short_text' && '📝 Short Note'}
                                  {q.type === 'paragraph' && '📄 Paragraph'}
                                  {q.type === 'dropdown' && '🔽 Dropdown'}
                                </span>
                              </div>
                              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                                +{q.points || 10} Points
                              </span>
                            </div>

                            <p className="text-base font-bold text-white mb-4 leading-relaxed">
                              {q.prompt || `Question ${qIdx + 1}`}
                            </p>

                            {/* Single Choice (Radio) */}
                            {q.type === 'single_choice' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {q.options.map((opt, optIdx) => {
                                  const isSelected = userAns === opt;
                                  return (
                                    <button
                                      key={optIdx}
                                      type="button"
                                      onClick={() => handleAnswerChange(q.id, opt)}
                                      className={`p-3.5 rounded-xl border text-left font-medium text-sm flex items-center gap-3 transition-all ${
                                        isSelected
                                          ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-emerald-500 ring-2 ring-emerald-500/40 text-white shadow'
                                          : 'bg-black/50 border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-gray-800/40'
                                      }`}
                                    >
                                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold transition-all ${
                                        isSelected
                                          ? 'bg-emerald-500 border-emerald-500 text-black'
                                          : 'border-gray-600 text-gray-500'
                                      }`}>
                                        {isSelected ? '✓' : String.fromCharCode(65 + optIdx)}
                                      </span>
                                      <span className="flex-1">{opt}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Multiple Choice (Checkboxes) */}
                            {q.type === 'multiple_choice' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {q.options.map((opt, optIdx) => {
                                  const isChecked = Array.isArray(userAns) && userAns.includes(opt);
                                  return (
                                    <button
                                      key={optIdx}
                                      type="button"
                                      onClick={() => handleToggleMultipleChoice(q.id, opt)}
                                      className={`p-3.5 rounded-xl border text-left font-medium text-sm flex items-center gap-3 transition-all ${
                                        isChecked
                                          ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border-purple-500 ring-2 ring-purple-500/40 text-white shadow'
                                          : 'bg-black/50 border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-gray-800/40'
                                      }`}
                                    >
                                      <span className={`w-5 h-5 rounded-md border flex items-center justify-center text-xs font-bold transition-all ${
                                        isChecked
                                          ? 'bg-purple-500 border-purple-500 text-white'
                                          : 'border-gray-600 text-transparent'
                                      }`}>
                                        ✓
                                      </span>
                                      <span className="flex-1">{opt}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Dropdown */}
                            {q.type === 'dropdown' && (
                              <div>
                                <select
                                  value={userAns || ''}
                                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                >
                                  <option value="">-- Choose your answer --</option>
                                  {q.options.map((opt, optIdx) => (
                                    <option key={optIdx} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Short Text */}
                            {q.type === 'short_text' && (
                              <input
                                type="text"
                                value={userAns || ''}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                placeholder="Write your short answer here..."
                                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl text-white text-sm placeholder-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              />
                            )}

                            {/* Paragraph */}
                            {q.type === 'paragraph' && (
                              <textarea
                                value={userAns || ''}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                rows={3}
                                placeholder="Explain your answer in detail..."
                                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-xl text-white text-sm placeholder-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none resize-none"
                              />
                            )}
                          </div>
                        );
                      })}

                      {/* Sticky Submit Bar */}
                      <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 shadow-2xl backdrop-blur-xl">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Answered:</span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300">
                            {Object.keys(userAnswers).length} of {selectedAssignment.questions.length} Questions
                          </span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={handleResetQuiz}
                            className="px-4 py-2.5 border border-gray-700 text-gray-400 hover:text-white rounded-xl text-sm transition-all"
                          >
                            Reset Answers
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmitQuiz}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black rounded-xl text-sm shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                          >
                            <span>Submit Assignment & Check Score ✨</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-900/40 rounded-2xl border border-gray-800 text-gray-400 text-sm">
                      This assignment does not have interactive questions configured yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === 'zoom' && selectedZoomMeeting ? (
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
              <div className="max-w-xl w-full bg-gradient-to-br from-indigo-950/80 via-gray-900 to-purple-950/80 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.5 4.5A2.25 2.25 0 002.25 6.75v10.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25v-10.5A2.25 2.25 0 0015 4.5H4.5zm12 3.879l4.5-2.25v11.742l-4.5-2.25V8.379z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-black text-indigo-300 uppercase tracking-wider">Live Zoom Session</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mt-0.5">{selectedZoomMeeting.title}</h2>
                  </div>
                </div>

                {selectedZoomMeeting.description && (
                  <p className="text-gray-300 text-sm mb-6 bg-black/50 p-3.5 rounded-xl border border-gray-800">
                    {selectedZoomMeeting.description}
                  </p>
                )}

                {/* Slots Selector */}
                {selectedZoomMeeting.slots && selectedZoomMeeting.slots.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                      Select Your Date & Time Slot:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedZoomMeeting.slots.map((slot, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedSlotIndex(idx)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            selectedSlotIndex === idx
                              ? 'bg-gradient-to-r from-indigo-600/40 to-purple-600/40 border-indigo-400 ring-2 ring-indigo-500/50 text-white shadow'
                              : 'bg-black/50 border-gray-800 text-gray-400 hover:border-gray-700'
                          }`}
                        >
                          <div className="font-bold text-sm text-white">📅 {slot.date || 'Any Date'}</div>
                          <div className="text-xs text-indigo-300 font-semibold mt-0.5">⏰ {slot.time || '07:00 AM'}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colorful Neon Countdown Component */}
                <div className="bg-black/70 border border-indigo-500/30 rounded-2xl p-5 mb-6 text-center">
                  <p className="text-[11px] text-gray-400 uppercase tracking-widest font-bold mb-3">
                    Starts In / Scheduled Time:
                  </p>
                  
                  {/* Neon Countdown Tiles */}
                  <div className="grid grid-cols-4 gap-2 mb-3 max-w-xs mx-auto">
                    <div className="p-2.5 rounded-xl bg-gradient-to-b from-emerald-500/20 to-emerald-950/40 border border-emerald-500/30">
                      <div className="text-xl font-black text-emerald-300 font-mono">{zoomCountdown.days}</div>
                      <div className="text-[9px] uppercase font-bold text-gray-400 mt-0.5">Days</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gradient-to-b from-blue-500/20 to-blue-950/40 border border-blue-500/30">
                      <div className="text-xl font-black text-blue-300 font-mono">{zoomCountdown.hours}</div>
                      <div className="text-[9px] uppercase font-bold text-gray-400 mt-0.5">Hours</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gradient-to-b from-amber-500/20 to-amber-950/40 border border-amber-500/30">
                      <div className="text-xl font-black text-amber-300 font-mono">{zoomCountdown.minutes}</div>
                      <div className="text-[9px] uppercase font-bold text-gray-400 mt-0.5">Mins</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gradient-to-b from-rose-500/20 to-rose-950/40 border border-rose-500/30">
                      <div className="text-xl font-black text-rose-300 font-mono">{zoomCountdown.seconds}</div>
                      <div className="text-[9px] uppercase font-bold text-gray-400 mt-0.5">Secs</div>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-indigo-300">
                    {selectedZoomMeeting.slots?.[selectedSlotIndex]?.date || selectedZoomMeeting.meetingDate || 'Upcoming Session'}
                    {' at '}
                    {selectedZoomMeeting.slots?.[selectedSlotIndex]?.time || selectedZoomMeeting.meetingTime || '07:00 AM IST'}
                  </p>
                </div>

                {/* Credentials */}
                {(selectedZoomMeeting.meetingId || selectedZoomMeeting.meetingPassword) && (
                  <div className="flex items-center justify-between bg-black/60 border border-gray-800 p-3.5 rounded-xl mb-6 text-xs text-gray-300 font-mono">
                    {selectedZoomMeeting.meetingId && (
                      <div>
                        <span className="text-gray-500 font-sans">Meeting ID: </span>
                        <span className="text-indigo-300 font-bold tracking-wider">{selectedZoomMeeting.meetingId}</span>
                      </div>
                    )}
                    {selectedZoomMeeting.meetingPassword && (
                      <div>
                        <span className="text-gray-500 font-sans">Passcode: </span>
                        <span className="text-emerald-300 font-bold tracking-wider">{selectedZoomMeeting.meetingPassword}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <a
                    href={selectedZoomMeeting.slots?.[selectedSlotIndex]?.joinUrl || selectedZoomMeeting.meetingUrl || selectedZoomMeeting.fileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-3.5 px-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black rounded-xl text-center shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.5 4.5A2.25 2.25 0 002.25 6.75v10.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25v-10.5A2.25 2.25 0 0015 4.5H4.5zm12 3.879l4.5-2.25v11.742l-4.5-2.25V8.379z" />
                    </svg>
                    Join Zoom Meeting Now
                  </a>
                  <button
                    onClick={() => { setActiveTab('videos'); setSelectedZoomMeeting(null); }}
                    className="py-3.5 px-4 border border-gray-700 text-gray-400 hover:text-white rounded-xl text-sm transition-all"
                  >
                    Back to Videos
                  </button>
                </div>
              </div>
            </div>
          ) : currentVideo && !currentVideo.canWatch && currentVideo.isLocked ? (
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
                    className="relative w-full aspect-video max-h-[82vh] overflow-hidden bg-black mx-auto flex items-center justify-center shadow-2xl"
                    onContextMenu={(e) => { e.preventDefault(); return false; }}
                  >
                    <iframe
                      src={videoStream.streaming.playerUrl}
                      className="w-full h-full border-0 block"
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
              <div className="h-16 bg-gray-800 border-t border-gray-700 flex items-center justify-between px-2 sm:px-6 gap-2">
                <button
                  onClick={() => {
                    const currentIndex = videos.findIndex((v) => v._id === currentVideo._id);
                    const prevVideo = videos.slice(0, currentIndex).reverse().find((v) => v.canWatch);
                    if (prevVideo) setCurrentVideo(prevVideo);
                  }}
                  disabled={!videos.slice(0, videos.findIndex((v) => v._id === currentVideo._id)).some((v) => v.canWatch)}
                  className="flex items-center gap-1 sm:gap-2 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm p-1.5 sm:p-2 rounded-lg hover:bg-gray-700/50"
                  title="Previous video"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:inline">{t.previousVideo}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/80 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition-colors border border-gray-600/50"
                    title="Open topics playlist"
                  >
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span>Topics</span>
                  </button>

                  <button
                    onClick={handleMarkComplete}
                    disabled={isVideoCompleted(currentVideo._id)}
                    className={`px-3 sm:px-6 py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all shadow-sm ${
                      isVideoCompleted(currentVideo._id)
                        ? 'bg-green-600 text-white cursor-default'
                        : 'bg-orange-500 hover:bg-orange-600 text-white active:scale-95'
                    }`}
                  >
                    {isVideoCompleted(currentVideo._id) ? t.completed_badge : t.markComplete}
                  </button>
                </div>

                <button
                  onClick={() => {
                    const currentIndex = videos.findIndex((v) => v._id === currentVideo._id);
                    const nextVideo = videos[currentIndex + 1];
                    if (nextVideo) {
                      handleSelectVideo(nextVideo);
                    }
                  }}
                  disabled={videos.findIndex((v) => v._id === currentVideo._id) >= videos.length - 1}
                  className="flex items-center gap-1 sm:gap-2 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs sm:text-sm p-1.5 sm:p-2 rounded-lg hover:bg-gray-700/50"
                  title="Next video"
                >
                  <span className="hidden sm:inline">{t.nextVideo}</span>
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Lead Unlock Modal for Gated Videos (Video 2-6) */}
      <CourseLeadUnlockModal
        isOpen={showUnlockModal}
        onClose={() => {
          setShowUnlockModal(false);
          setPendingTargetVideo(null);
        }}
        onSuccess={() => {
          setShowUnlockModal(false);
          setIsUnlocked(true);
          const target = pendingTargetVideo;
          setPendingTargetVideo(null);
          if (target) {
            setCurrentVideo(target);
            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              setSidebarOpen(false);
            }
          }
        }}
        courseTitle={course?.title}
        courseId={course?._id || course?.id}
        courseSlug={slug}
        targetVideoTitle={pendingTargetVideo?.title}
      />
    </div>
  );
}
