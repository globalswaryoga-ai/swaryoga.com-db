'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  Save,
  Loader,
  Mail,
  Phone,
  Calendar,
  MessageCircle,
  Globe,
  Smartphone,
  Edit2,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Key,
  Copy,
  Check,
  RefreshCw,
  Play,
  Lock,
  Unlock,
  Shield,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Laptop,
  Monitor,
  Tablet,
  Gift,
  Search,
  RotateCcw,
  Award,
  Video,
  CheckSquare,
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Activity,
  Wifi,
  LogIn,
} from 'lucide-react';

interface CourseData {
  _id: string;
  slug: string;
  content: { en: { title: string } };
  level: string;
  title?: string;
}

interface EnrollmentData {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    country?: string;
    state?: string;
    profession?: string;
    image?: string;
    ip?: string;
    lastUsedAt?: string;
    lastActiveAt?: string;
  };
  courseId: CourseData;
  status: 'active' | 'expired' | 'suspended' | 'completed';
  progress: number;
  progressPercent?: number;
  purchaseType: 'paid' | 'free' | 'gift';
  amountPaid?: number;
  giftHoursRemaining: number;
  totalWatchTime: number;
  enrolledAt: string;
  expiresAt?: string;
  communityLinks?: {
    whatsapp?: string;
    community?: string;
    discord?: string;
    telegram?: string;
    lastSharedAt?: string;
  };
  disabledVideoIds?: string[];
  videoGiftTimes?: Record<string, number>;
  completedVideoIds?: string[];
}

interface VideoItem {
  _id: string;
  id: string;
  title: string;
  description?: string;
  duration: number; // in seconds
  thumbnail?: string;
  level?: string;
  displayOrder?: number;
  sectionId?: string;
  isFree: boolean;
  isActive: boolean;
  isEnabled: boolean; // Keep ON or OFF for watching
  canWatch: boolean;
  isCompleted: boolean;
  watchSeconds: number; // seen time
  progressPercent: number;
  giftMinutes: number; // gift time for this video
}

interface WatchLog {
  _id: string;
  videoId?: string;
  videoTitle?: string;
  watchStarted: string;
  watchDuration: number;
  isCompleted?: boolean;
}

interface DeviceItem {
  _id: string;
  id: string;
  deviceName?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  os?: string;
  ip?: string;
  location?: string;
  deviceFingerprint?: string;
  fingerprint?: string;
  lastUsedAt: string;
  lastActiveAt?: string;
  registeredAt?: string;
  createdAt?: string;
  isActive: boolean;
  isBlocked: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins < 10 ? '0' : ''}${remMins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

interface ActivityEvent {
  id: string;
  type: 'signin' | 'watch' | 'device' | 'submission';
  title: string;
  subtitle?: string;
  ip?: string;
  timestamp: string;
}

function formatWatchHours(seconds: any): string {
  const num = typeof seconds === 'number' ? seconds : Number(seconds);
  if (!num || isNaN(num) || !isFinite(num) || num <= 0) return '0h 0m';
  const hrs = Math.floor(num / 3600);
  const mins = Math.floor((num % 3600) / 60);
  return `${hrs}h ${mins}m`;
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'Not available';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Not available';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Not available';
  }
}

function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 0) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

export default function UserDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = useAuth();
  const userId = params.userId as string;
  const enrollmentId = searchParams.get('enrollmentId');

  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [watchLogs, setWatchLogs] = useState<WatchLog[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityEvent[]>([]);
  const [primaryIp, setPrimaryIp] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Video filtering & search
  const [videoSearch, setVideoSearch] = useState('');
  const [videoFilter, setVideoFilter] = useState<'all' | 'enabled' | 'disabled' | 'completed'>('all');
  const [videoViewMode, setVideoViewMode] = useState<'scroll' | 'dropdown' | 'all'>('scroll');
  const [isDropdownExpanded, setIsDropdownExpanded] = useState(false);
  const [selectedJumpVideoId, setSelectedJumpVideoId] = useState('');

  // Form state
  const [whatsappLink, setWhatsappLink] = useState('');
  const [communityLink, setCommunityLink] = useState('');
  const [discordLink, setDiscordLink] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<'active' | 'expired' | 'suspended' | 'completed'>('active');
  const [expiresAt, setExpiresAt] = useState('');
  const [giftHours, setGiftHours] = useState(0);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResetDone, setPasswordResetDone] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Manual device addition modal
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [manualDeviceName, setManualDeviceName] = useState('');
  const [manualDeviceType, setManualDeviceType] = useState<'desktop' | 'mobile' | 'tablet'>('mobile');
  const [manualDeviceIp, setManualDeviceIp] = useState('');

  // Custom seen time edit modal
  const [editingSeenVideoId, setEditingSeenVideoId] = useState<string | null>(null);
  const [customSeenMinutes, setCustomSeenMinutes] = useState(0);

  // Submissions & Tasks Tab state
  const [activeSectionTab, setActiveSectionTab] = useState<'videos' | 'submissions'>('videos');
  const [studentSubmissions, setStudentSubmissions] = useState<any[]>([]);
  const [courseAssignments, setCourseAssignments] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState<Record<string, string>>({});
  const [reviewScore, setReviewScore] = useState<Record<string, string>>({});
  const [reviewStatus, setReviewStatus] = useState<Record<string, string>>({});
  const [savingSubId, setSavingSubId] = useState<string | null>(null);

  const fetchStudentSubmissions = async (uId?: string, cId?: string) => {
    const targetUserId = uId || (params?.userId as string) || enrollment?.userId?._id;
    if (!token || !targetUserId) return;
    try {
      setLoadingSubmissions(true);
      const targetCourseId = cId || enrollment?.courseId?._id;
      const [subRes, assignRes] = await Promise.all([
        fetch(`/api/admin/e-learning/assignment-submissions?userId=${targetUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        targetCourseId
          ? fetch(`/api/admin/e-learning/assignments?courseId=${targetCourseId}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          : Promise.resolve(null),
      ]);

      const subData = await subRes.json();
      if (subData.success) {
        setStudentSubmissions(subData.submissions || []);
      }
      if (assignRes) {
        const assignData = await assignRes.json();
        if (assignData.success) {
          setCourseAssignments(assignData.assignments || []);
        }
      }
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSaveStudentReview = async (sub: any) => {
    if (!token) return;
    setSavingSubId(sub.id);
    try {
      const fb = reviewFeedback[sub.id] !== undefined ? reviewFeedback[sub.id] : sub.feedback;
      const sc = reviewScore[sub.id] !== undefined ? Number(reviewScore[sub.id]) : sub.score;
      const st = reviewStatus[sub.id] || sub.status;

      const res = await fetch('/api/admin/e-learning/assignment-submissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          submissionId: sub.id,
          status: st,
          score: sc,
          feedback: fb,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update review');
      }

      setStudentSubmissions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, status: st, score: sc, feedback: fb } : s))
      );
      setSuccessMessage('Student review updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      alert('Error updating review: ' + err.message);
    } finally {
      setSavingSubId(null);
    }
  };

  useEffect(() => {
    if (!token || !enrollmentId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/e-learning/enrollments?enrollmentId=${enrollmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();

        if (data.success && data.enrollment) {
          const enr = data.enrollment;
          setEnrollment(enr);
          setVideos(data.videos || []);
          setWhatsappLink(enr.communityLinks?.whatsapp || '');
          setCommunityLink(enr.communityLinks?.community || '');
          setDiscordLink(enr.communityLinks?.discord || '');
          setTelegramLink(enr.communityLinks?.telegram || '');
          setEnrollmentStatus(enr.status);
          setExpiresAt(enr.expiresAt?.split('T')[0] || '');
          setGiftHours(enr.giftHoursRemaining || 0);
          setWatchLogs(data.watchLogs || []);
          setDevices(data.devices || []);
          setRecentActivity(data.recentActivity || []);
          const detectedIp = data.primaryIp || enr.userId?.ip || '';
          setPrimaryIp(detectedIp);
          setManualDeviceIp(detectedIp);

          // Also fetch student submissions
          fetchStudentSubmissions(enr.userId?._id || (params?.userId as string), enr.courseId?._id);
        } else {
          setError(data.error || 'Failed to load enrollment data');
        }
      } catch (err) {
        setError('Error loading data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, enrollmentId]);

  // Video Management Controls
  const toggleVideoAccess = (videoId: string) => {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId || v._id === videoId) {
          const nextEnabled = !v.isEnabled;
          return { ...v, isEnabled: nextEnabled, canWatch: nextEnabled };
        }
        return v;
      })
    );
  };

  const toggleVideoCompleted = (videoId: string) => {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId || v._id === videoId) {
          const nextCompleted = !v.isCompleted;
          const nextWatch = nextCompleted ? v.duration : 0;
          return {
            ...v,
            isCompleted: nextCompleted,
            watchSeconds: nextWatch,
            progressPercent: nextCompleted ? 100 : 0,
          };
        }
        return v;
      })
    );
  };

  const setVideoGiftTime = (videoId: string, minutes: number) => {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId || v._id === videoId) {
          return { ...v, giftMinutes: Math.max(0, minutes) };
        }
        return v;
      })
    );
  };

  const addVideoGiftMinutes = (videoId: string, deltaMinutes: number) => {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === videoId || v._id === videoId) {
          return { ...v, giftMinutes: Math.max(0, (v.giftMinutes || 0) + deltaMinutes) };
        }
        return v;
      })
    );
  };

  const applyCustomSeenTime = () => {
    if (!editingSeenVideoId) return;
    const seconds = customSeenMinutes * 60;
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id === editingSeenVideoId || v._id === editingSeenVideoId) {
          const dur = v.duration || 1;
          const pct = Math.min(100, Math.round((seconds / dur) * 100));
          return {
            ...v,
            watchSeconds: seconds,
            progressPercent: pct,
            isCompleted: pct >= 95,
          };
        }
        return v;
      })
    );
    setEditingSeenVideoId(null);
  };

  const enableAllVideos = () => {
    setVideos((prev) => prev.map((v) => ({ ...v, isEnabled: true, canWatch: true })));
    setSuccessMessage('Enabled watching for all videos');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const disableAllVideos = () => {
    setVideos((prev) => prev.map((v) => ({ ...v, isEnabled: false, canWatch: false })));
    setSuccessMessage('Disabled watching for all videos');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const markAllVideosComplete = () => {
    setVideos((prev) =>
      prev.map((v) => ({
        ...v,
        isCompleted: true,
        watchSeconds: v.duration,
        progressPercent: 100,
      }))
    );
    setSuccessMessage('Marked all videos as completed');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const resetAllVideoProgress = () => {
    if (!confirm('Reset watch progress for all videos back to 0%?')) return;
    setVideos((prev) =>
      prev.map((v) => ({
        ...v,
        isCompleted: false,
        watchSeconds: 0,
        progressPercent: 0,
      }))
    );
    setSuccessMessage('Watch progress reset for all videos');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // Filtered video list
  const filteredVideos = videos.filter((v) => {
    const matchesSearch =
      v.title.toLowerCase().includes(videoSearch.toLowerCase()) ||
      (v.description || '').toLowerCase().includes(videoSearch.toLowerCase()) ||
      (v.level || '').toLowerCase().includes(videoSearch.toLowerCase());

    if (!matchesSearch) return false;
    if (videoFilter === 'enabled') return v.isEnabled;
    if (videoFilter === 'disabled') return !v.isEnabled;
    if (videoFilter === 'completed') return v.isCompleted;
    return true;
  });

  // Calculate overall course progress
  const computedProgress =
    videos.length > 0
      ? Math.round(
          videos.reduce((acc, v) => acc + (v.isCompleted ? 100 : v.progressPercent || 0), 0) /
            videos.length
        )
      : Math.round(enrollment?.progress || enrollment?.progressPercent || 0);

  // Total watched time summed from all videos safely
  const computedTotalWatchedSeconds = videos.reduce((acc, v) => {
    const s = Number(v.watchSeconds || 0);
    return acc + (isNaN(s) || !isFinite(s) || s < 0 ? 0 : s);
  }, 0);

  const handleSave = async () => {
    if (!token || !enrollmentId || !enrollment) return;

    setSaving(true);
    setError(null);
    try {
      const disabledVideoIds = videos.filter((v) => !v.isEnabled).map((v) => v.id);
      const completedVideoIds = videos.filter((v) => v.isCompleted).map((v) => v.id);
      const videoGiftTimes = Object.fromEntries(
        videos.filter((v) => v.giftMinutes > 0).map((v) => [v.id, v.giftMinutes])
      );
      const videoWatchTimes = Object.fromEntries(
        videos.map((v) => [v.id, v.watchSeconds])
      );

      const res = await fetch('/api/admin/e-learning/enrollments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enrollmentId,
          communityLinks: {
            whatsapp: whatsappLink || undefined,
            community: communityLink || undefined,
            discord: discordLink || undefined,
            telegram: telegramLink || undefined,
            lastSharedAt: new Date().toISOString(),
          },
          status: enrollmentStatus,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
          giftHoursRemaining: giftHours,
          progress: computedProgress,
          progressPercent: computedProgress,
          disabledVideoIds,
          completedVideoIds,
          videoGiftTimes,
          videoWatchTimes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEnrollment((prev) =>
          prev
            ? {
                ...prev,
                status: enrollmentStatus,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : prev.expiresAt,
                giftHoursRemaining: giftHours,
                progress: computedProgress,
                progressPercent: computedProgress,
                totalWatchTime: Math.max(prev.totalWatchTime, computedTotalWatchedSeconds),
                disabledVideoIds,
                completedVideoIds,
                videoGiftTimes,
              }
            : null
        );
        setSuccessMessage('All student settings and video controls saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to save changes');
      }
    } catch (err) {
      setError('Error saving changes');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Device Controls
  const toggleDeviceBlock = async (deviceId: string, isBlocked: boolean) => {
    if (!token) return;

    try {
      const res = await fetch('/api/admin/e-learning/devices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deviceId,
          isBlocked: !isBlocked,
        }),
      });

      if (res.ok) {
        setDevices((prev) =>
          prev.map((d) =>
            d._id === deviceId || d.id === deviceId
              ? { ...d, isBlocked: !isBlocked, isActive: isBlocked }
              : d
          )
        );
        setSuccessMessage(`Device ${!isBlocked ? 'blocked' : 'unblocked'} successfully`);
        setTimeout(() => setSuccessMessage(null), 2500);
      }
    } catch (err) {
      setError('Error updating device status');
    }
  };

  const deleteDevice = async (deviceId: string) => {
    if (!token || !confirm('Remove this device from student registration?')) return;

    try {
      const res = await fetch(`/api/admin/e-learning/devices?id=${deviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setDevices((prev) => prev.filter((d) => d._id !== deviceId && d.id !== deviceId));
        setSuccessMessage('Device removed successfully');
        setTimeout(() => setSuccessMessage(null), 2500);
      }
    } catch (err) {
      setError('Error removing device');
    }
  };

  const resetAllDevices = async () => {
    if (!token || !enrollment) return;
    if (!confirm('Reset and clear ALL device slots for this student? This allows them to register new devices from scratch.')) return;

    try {
      const res = await fetch(
        `/api/admin/e-learning/devices?clearAll=true&userId=${enrollment.userId._id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        setDevices([]);
        setSuccessMessage('All device slots reset successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Failed to reset devices');
      }
    } catch (err) {
      setError('Error resetting devices');
    }
  };

  const handleAddManualDevice = async () => {
    if (!token || !enrollment || !manualDeviceName.trim()) return;

    try {
      const res = await fetch('/api/admin/e-learning/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: enrollment.userId._id,
          courseId: enrollment.courseId._id,
          deviceName: manualDeviceName.trim(),
          deviceType: manualDeviceType,
          browser: manualDeviceType === 'mobile' ? 'Mobile Safari / Chrome' : 'Chrome / Edge',
          os: manualDeviceType === 'mobile' ? 'Mobile OS' : 'Desktop OS',
          ip: manualDeviceIp.trim() || primaryIp || 'Authorized by Admin',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.device) {
          setDevices((prev) => [data.device, ...prev]);
        }
        setShowAddDeviceModal(false);
        setManualDeviceName('');
        setSuccessMessage('Device slot authorized successfully');
        setTimeout(() => setSuccessMessage(null), 2500);
      } else {
        setError('Failed to authorize device');
      }
    } catch (err) {
      setError('Error adding device');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setNewPassword(pwd);
    setPasswordResetDone(false);
  };

  const handleResetPassword = async () => {
    if (!token || !enrollment) return;
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setResettingPassword(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/signups/${enrollment.userId._id}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        setPasswordResetDone(true);
        setSuccessMessage('Password reset successfully — share credentials below with the student');
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Error resetting password');
    } finally {
      setResettingPassword(false);
    }
  };

  if (!token || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-10 h-10 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading student details & video management...</p>
        </div>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="min-h-screen bg-black p-6">
        <Link
          href="/admin/crm/e-learning/users"
          className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Students
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl">
          Enrollment not found or was removed.
        </div>
      </div>
    );
  }

  const courseTitle =
    enrollment.courseId.title ||
    enrollment.courseId.content?.en?.title ||
    enrollment.courseId.slug ||
    'Recorded Course';

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 p-4 sm:p-6 lg:p-8">
      {/* Top Bar Header */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-900/60 backdrop-blur-md p-5 rounded-2xl border border-gray-800">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/crm/e-learning/users"
            className="p-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 transition-colors"
            title="Back to Students"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {enrollment.userId.name || 'Student Management'}
              </h1>
              <span
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${
                  enrollmentStatus === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : enrollmentStatus === 'completed'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : enrollmentStatus === 'suspended'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {enrollmentStatus}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                {enrollment.purchaseType || 'paid'}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>{enrollment.userId.email}</span>
              {enrollment.userId.phone && <span>• {enrollment.userId.phone}</span>}
              <span>• Course: <span className="text-green-400 font-medium">{courseTitle}</span></span>
            </p>
          </div>
        </div>

        {/* Complete Workshop Progress Bar in Header */}
        <div className="flex-1 max-w-md bg-black/50 border border-gray-800/90 hover:border-gray-700/80 p-3 rounded-xl backdrop-blur-sm transition-all shadow-md">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-white">
              <Award size={15} className="text-emerald-400 shrink-0" />
              <span>Workshop Progress</span>
              {computedProgress >= 100 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded font-bold">
                  Completed
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-mono">
                {videos.filter((v) => v.isCompleted).length}/{videos.length} videos
              </span>
              <span className="text-emerald-400 font-bold font-mono text-sm">
                {computedProgress}%
              </span>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden p-0.5 border border-gray-700/60">
            <div
              className={`h-full rounded-full transition-all duration-500 shadow-sm ${
                computedProgress >= 100
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-green-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                  : computedProgress > 0
                  ? 'bg-gradient-to-r from-blue-500 via-teal-500 to-emerald-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'bg-gray-700'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, computedProgress))}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5">
            <span>
              Watch time: <strong className="text-gray-200 font-mono">{formatWatchHours(Math.max(Number(enrollment.totalWatchTime || 0), computedTotalWatchedSeconds))}</strong>
            </span>
            <span className="text-gray-400">
              {videos.length > 0 ? Math.round((videos.filter((v) => v.isCompleted).length / videos.length) * 100) : 0}% modules done
            </span>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-black font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader size={18} className="animate-spin" />
                <span>Saving All...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="max-w-7xl mx-auto mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 shadow-lg shadow-emerald-500/5">
          <CheckCircle size={20} className="shrink-0 text-emerald-400" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: All Video Controls & Progress (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Top Switcher Tabs: Videos vs Assignments & Tasks */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-900/80 p-2 rounded-2xl border border-gray-800 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSectionTab('videos')}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeSectionTab === 'videos'
                    ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Video size={16} />
                <span>Course Videos & Watching Controls</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeSectionTab === 'videos' ? 'bg-black/30 text-black' : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {videos.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveSectionTab('submissions');
                  fetchStudentSubmissions();
                }}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
                  activeSectionTab === 'submissions'
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Award size={16} />
                <span>Assignments, Tasks & Questions</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                    activeSectionTab === 'submissions' ? 'bg-black/30 text-black' : 'bg-gray-800 text-amber-400'
                  }`}
                >
                  {studentSubmissions.length}
                </span>
              </button>
            </div>

            <Link
              href={`/admin/crm/e-learning/results?search=${encodeURIComponent(enrollment?.userId?.name || '')}`}
              className="text-xs text-amber-400 hover:underline px-3 py-1 flex items-center gap-1 shrink-0 font-medium"
            >
              <span>View In Bulk Hub</span>
              <ExternalLink size={12} />
            </Link>
          </div>

          {activeSectionTab === 'videos' ? (
            <>
              {/* Video List & Watching Controls Section */}
              <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <Video className="text-emerald-400" size={22} />
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Course Videos & Watching Controls
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {videos.length} Videos
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Keep watching ON or OFF per video, track seen time vs total time slot, and grant bonus gift time.
                </p>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={enableAllVideos}
                  className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/30 transition-colors flex items-center gap-1.5"
                  title="Turn ON watching for all videos"
                >
                  <Eye size={14} /> Turn All ON
                </button>
                <button
                  onClick={disableAllVideos}
                  className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-semibold rounded-lg border border-red-500/30 transition-colors flex items-center gap-1.5"
                  title="Turn OFF watching for all videos"
                >
                  <EyeOff size={14} /> Turn All OFF
                </button>
                <button
                  onClick={markAllVideosComplete}
                  className="px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 text-xs font-semibold rounded-lg border border-blue-500/30 transition-colors flex items-center gap-1.5"
                  title="Mark all videos complete"
                >
                  <CheckCircle size={14} /> Complete All
                </button>
                <button
                  onClick={resetAllVideoProgress}
                  className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded-lg transition-colors"
                  title="Reset all video progress"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={videoSearch}
                  onChange={(e) => setVideoSearch(e.target.value)}
                  placeholder="Search course videos..."
                  className="w-full pl-9 pr-4 py-2 bg-black/60 border border-gray-700/80 rounded-xl text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-gray-800">
                {(['all', 'enabled', 'disabled', 'completed'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setVideoFilter(mode)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                      videoFilter === mode
                        ? 'bg-emerald-500 text-black shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* View Mode & Quick Selector Bar (3 Videos Default) */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-gray-800/80">
              {/* Quick Jump Dropdown */}
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-xs text-gray-400 whitespace-nowrap">Jump to:</span>
                <select
                  value={selectedJumpVideoId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedJumpVideoId(id);
                    if (id) {
                      const el = document.getElementById(`video-card-${id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                    }
                  }}
                  className="px-2.5 py-1.5 bg-black/60 border border-gray-700/80 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none flex-1 max-w-xs truncate"
                >
                  <option value="">Select video from list ({filteredVideos.length})...</option>
                  {filteredVideos.map((v, i) => (
                    <option key={v.id || v._id} value={v.id || v._id}>
                      #{i + 1} - {v.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3-Video View Mode Toggle */}
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-gray-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setVideoViewMode('scroll')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    videoViewMode === 'scroll'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="3 videos visible at a time with smooth scrollbar"
                >
                  <span>↕️ Scroll Mode (3 Visible)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoViewMode('dropdown')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    videoViewMode === 'dropdown'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="3 videos visible + remaining in dropdown accordion"
                >
                  <span>📂 Dropdown Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoViewMode('all')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                    videoViewMode === 'all'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Show all videos"
                >
                  <span>👁️ All ({filteredVideos.length})</span>
                </button>
              </div>
            </div>

            {/* Video List (3 Videos Visible With Scroll or Dropdown Mode) */}
            <div className="mt-4">
              {filteredVideos.length === 0 ? (
                <div className="py-12 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
                  <Video size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No videos found matching your filters</p>
                </div>
              ) : videoViewMode === 'scroll' ? (
                /* Mode 1: Scrolling Container Sized Exactly for 3 Videos */
                <div>
                  {filteredVideos.length > 3 && (
                    <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2 px-1">
                      <span>Showing 3 videos at a time ({filteredVideos.length} total)</span>
                      <span className="text-purple-400 font-medium flex items-center gap-1">
                        Scroll inside box to see more ({filteredVideos.length - 3} remaining) ↓
                      </span>
                    </div>
                  )}
                  <div className="space-y-3 max-h-[385px] overflow-y-auto pr-1.5 scrollbar-thin">
                    {filteredVideos.map((video, idx) => (
                      <div
                        id={`video-card-${video.id || video._id}`}
                        key={video.id || video._id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          !video.isEnabled
                            ? 'bg-red-950/10 border-red-500/25 opacity-85'
                            : video.isCompleted
                            ? 'bg-emerald-950/15 border-emerald-500/30'
                            : 'bg-black/50 border-gray-800/90 hover:border-gray-700'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          {/* Video Info */}
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs ${
                                video.isCompleted
                                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                                  : !video.isEnabled
                                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                  : 'bg-gray-800 text-gray-300'
                              }`}
                            >
                              {video.isCompleted ? <Check size={15} /> : idx + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-semibold text-white truncate max-w-md">
                                  {video.title}
                                </h3>
                                {video.isFree && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    FREE
                                  </span>
                                )}
                                {video.giftMinutes > 0 && (
                                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <Gift size={11} /> +{video.giftMinutes}m Gift
                                  </span>
                                )}
                              </div>

                              {/* Time Slots: Seen Time / Total Time */}
                              <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                                <span>
                                  Seen:{' '}
                                  <span className="text-white font-mono font-medium">
                                    {formatDuration(video.watchSeconds)}
                                  </span>
                                </span>
                                <span>•</span>
                                <span>
                                  Duration:{' '}
                                  <span className="text-gray-300 font-mono font-medium">
                                    {formatDuration(video.duration)}
                                  </span>
                                </span>
                                <span>•</span>
                                <span
                                  className={`font-semibold ${
                                    Math.round(video.progressPercent || 0) >= 100
                                      ? 'text-emerald-400'
                                      : (video.progressPercent || 0) > 0
                                      ? 'text-blue-400'
                                      : 'text-gray-500'
                                  }`}
                                >
                                  {Math.min(100, Math.round(video.progressPercent || 0))}% Watched
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Video Controls: ON/OFF Toggle, Gift Time, Complete */}
                          <div className="flex items-center gap-2 flex-wrap self-end lg:self-center shrink-0">
                            {/* Watch Access Toggle Switch (ON / OFF) */}
                            <button
                              type="button"
                              onClick={() => toggleVideoAccess(video.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                                video.isEnabled
                                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                              }`}
                              title={
                                video.isEnabled
                                  ? 'Click to turn OFF watching (Lock video for student)'
                                  : 'Click to turn ON watching (Unlock video for student)'
                              }
                            >
                              {video.isEnabled ? (
                                <>
                                  <Play size={13} className="fill-emerald-400 text-emerald-400" />
                                  <span>Watching ON</span>
                                </>
                              ) : (
                                <>
                                  <Lock size={13} className="text-red-400" />
                                  <span>Watching OFF</span>
                                </>
                              )}
                            </button>

                            {/* Quick Seen Time Adjuster */}
                            <button
                              onClick={() => {
                                setEditingSeenVideoId(video.id);
                                setCustomSeenMinutes(Math.round(video.watchSeconds / 60));
                              }}
                              className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors font-mono"
                              title="Edit watched time"
                            >
                              {formatDuration(video.watchSeconds)}
                            </button>

                            {/* Gift Time for Video */}
                            <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-lg border border-gray-800">
                              <Gift size={13} className="text-amber-400 shrink-0" />
                              <input
                                type="number"
                                min="0"
                                value={video.giftMinutes || 0}
                                onChange={(e) =>
                                  setVideoGiftTime(video.id, parseInt(e.target.value) || 0)
                                }
                                className="w-10 bg-transparent text-center font-mono text-xs text-amber-300 font-bold focus:outline-none"
                                title="Gift minutes for this video"
                              />
                              <span className="text-[10px] text-gray-500">m</span>
                              <button
                                onClick={() => addVideoGiftMinutes(video.id, 15)}
                                className="px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold rounded transition-colors"
                                title="Add +15m Gift Time"
                              >
                                +15m
                              </button>
                            </div>

                            {/* Completed Toggle */}
                            <button
                              onClick={() => toggleVideoCompleted(video.id)}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                video.isCompleted
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                              }`}
                              title={video.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                            >
                              <CheckCircle size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Video Progress Bar */}
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                video.isCompleted
                                  ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                                  : !video.isEnabled
                                  ? 'bg-gray-600'
                                  : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.round(video.progressPercent || 0))}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-gray-400 w-10 text-right">
                            {Math.min(100, Math.round(video.progressPercent || 0))}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : videoViewMode === 'dropdown' ? (
                /* Mode 2: 3 Videos Visible + Collapsible Dropdown for Remaining */
                <div className="space-y-3">
                  {/* First 3 Videos Always Displayed */}
                  {filteredVideos.slice(0, 3).map((video, idx) => (
                    <div
                      id={`video-card-${video.id || video._id}`}
                      key={video.id || video._id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        !video.isEnabled
                          ? 'bg-red-950/10 border-red-500/25 opacity-85'
                          : video.isCompleted
                          ? 'bg-emerald-950/15 border-emerald-500/30'
                          : 'bg-black/50 border-gray-800/90 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        {/* Video Info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs ${
                              video.isCompleted
                                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                                : !video.isEnabled
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-gray-800 text-gray-300'
                            }`}
                          >
                            {video.isCompleted ? <Check size={15} /> : idx + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-white truncate max-w-md">
                                {video.title}
                              </h3>
                              {video.isFree && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  FREE
                                </span>
                              )}
                              {video.giftMinutes > 0 && (
                                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                  <Gift size={11} /> +{video.giftMinutes}m Gift
                                </span>
                              )}
                            </div>

                            {/* Time Slots */}
                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                              <span>
                                Seen:{' '}
                                <span className="text-white font-mono font-medium">
                                  {formatDuration(video.watchSeconds)}
                                </span>
                              </span>
                              <span>•</span>
                              <span>
                                Duration:{' '}
                                <span className="text-gray-300 font-mono font-medium">
                                  {formatDuration(video.duration)}
                                </span>
                              </span>
                              <span>•</span>
                              <span
                                className={`font-semibold ${
                                  Math.round(video.progressPercent || 0) >= 100
                                    ? 'text-emerald-400'
                                    : (video.progressPercent || 0) > 0
                                    ? 'text-blue-400'
                                    : 'text-gray-500'
                                }`}
                              >
                                {Math.min(100, Math.round(video.progressPercent || 0))}% Watched
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Video Controls */}
                        <div className="flex items-center gap-2 flex-wrap self-end lg:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleVideoAccess(video.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                              video.isEnabled
                                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                            }`}
                          >
                            {video.isEnabled ? (
                              <>
                                <Play size={13} className="fill-emerald-400 text-emerald-400" />
                                <span>Watching ON</span>
                              </>
                            ) : (
                              <>
                                <Lock size={13} className="text-red-400" />
                                <span>Watching OFF</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setEditingSeenVideoId(video.id);
                              setCustomSeenMinutes(Math.round(video.watchSeconds / 60));
                            }}
                            className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors font-mono"
                          >
                            {formatDuration(video.watchSeconds)}
                          </button>

                          <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-lg border border-gray-800">
                            <Gift size={13} className="text-amber-400 shrink-0" />
                            <input
                              type="number"
                              min="0"
                              value={video.giftMinutes || 0}
                              onChange={(e) =>
                                setVideoGiftTime(video.id, parseInt(e.target.value) || 0)
                              }
                              className="w-10 bg-transparent text-center font-mono text-xs text-amber-300 font-bold focus:outline-none"
                            />
                            <span className="text-[10px] text-gray-500">m</span>
                            <button
                              onClick={() => addVideoGiftMinutes(video.id, 15)}
                              className="px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold rounded transition-colors"
                            >
                              +15m
                            </button>
                          </div>

                          <button
                            onClick={() => toggleVideoCompleted(video.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              video.isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                            }`}
                          >
                            <CheckCircle size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Video Progress Bar */}
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              video.isCompleted
                                ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                                : !video.isEnabled
                                ? 'bg-gray-600'
                                : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.round(video.progressPercent || 0))}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 w-10 text-right">
                          {Math.min(100, Math.round(video.progressPercent || 0))}%
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Dropdown Accordion Toggle Button for Remaining Videos */}
                  {filteredVideos.length > 3 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsDropdownExpanded(!isDropdownExpanded)}
                        className="w-full p-3.5 bg-gradient-to-r from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 border border-gray-800 hover:border-purple-500/50 rounded-xl text-white font-semibold text-xs flex items-center justify-between transition-all shadow-md group mt-1"
                      >
                        <span className="flex items-center gap-2">
                          <ChevronDown
                            size={16}
                            className={`text-purple-400 transition-transform duration-300 ${
                              isDropdownExpanded ? 'rotate-180' : ''
                            }`}
                          />
                          <span>
                            {isDropdownExpanded
                              ? `▲ Collapse Dropdown (Hide ${filteredVideos.length - 3} Videos)`
                              : `▼ View Remaining ${filteredVideos.length - 3} Videos in Dropdown`}
                          </span>
                        </span>
                        <span className="text-[11px] font-mono text-gray-400 group-hover:text-purple-300 bg-gray-800 px-2 py-0.5 rounded-full">
                          {isDropdownExpanded ? 'Showing 3 + all' : `+${filteredVideos.length - 3} more`}
                        </span>
                      </button>

                      {/* Dropdown Expanded List */}
                      {isDropdownExpanded && (
                        <div className="mt-3 space-y-3 pl-3 border-l-2 border-purple-500/40 max-h-[420px] overflow-y-auto pr-1">
                          {filteredVideos.slice(3).map((video, idx) => (
                            <div
                              id={`video-card-${video.id || video._id}`}
                              key={video.id || video._id}
                              className={`p-3.5 rounded-xl border transition-all ${
                                !video.isEnabled
                                  ? 'bg-red-950/10 border-red-500/25 opacity-85'
                                  : video.isCompleted
                                  ? 'bg-emerald-950/15 border-emerald-500/30'
                                  : 'bg-black/50 border-gray-800/90 hover:border-gray-700'
                              }`}
                            >
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  <div
                                    className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs ${
                                      video.isCompleted
                                        ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                                        : !video.isEnabled
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        : 'bg-gray-800 text-gray-300'
                                    }`}
                                  >
                                    {video.isCompleted ? <Check size={15} /> : idx + 4}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className="text-sm font-semibold text-white truncate max-w-md">
                                        {video.title}
                                      </h3>
                                      {video.isFree && (
                                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                          FREE
                                        </span>
                                      )}
                                      {video.giftMinutes > 0 && (
                                        <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                          <Gift size={11} /> +{video.giftMinutes}m Gift
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                                      <span>
                                        Seen:{' '}
                                        <span className="text-white font-mono font-medium">
                                          {formatDuration(video.watchSeconds)}
                                        </span>
                                      </span>
                                      <span>•</span>
                                      <span>
                                        Duration:{' '}
                                        <span className="text-gray-300 font-mono font-medium">
                                          {formatDuration(video.duration)}
                                        </span>
                                      </span>
                                      <span>•</span>
                                      <span
                                        className={`font-semibold ${
                                          Math.round(video.progressPercent || 0) >= 100
                                            ? 'text-emerald-400'
                                            : (video.progressPercent || 0) > 0
                                            ? 'text-blue-400'
                                            : 'text-gray-500'
                                        }`}
                                      >
                                        {Math.min(100, Math.round(video.progressPercent || 0))}% Watched
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap self-end lg:self-center shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleVideoAccess(video.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                                      video.isEnabled
                                        ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                                    }`}
                                  >
                                    {video.isEnabled ? (
                                      <>
                                        <Play size={13} className="fill-emerald-400 text-emerald-400" />
                                        <span>Watching ON</span>
                                      </>
                                    ) : (
                                      <>
                                        <Lock size={13} className="text-red-400" />
                                        <span>Watching OFF</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    onClick={() => {
                                      setEditingSeenVideoId(video.id);
                                      setCustomSeenMinutes(Math.round(video.watchSeconds / 60));
                                    }}
                                    className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors font-mono"
                                  >
                                    {formatDuration(video.watchSeconds)}
                                  </button>

                                  <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-lg border border-gray-800">
                                    <Gift size={13} className="text-amber-400 shrink-0" />
                                    <input
                                      type="number"
                                      min="0"
                                      value={video.giftMinutes || 0}
                                      onChange={(e) =>
                                        setVideoGiftTime(video.id, parseInt(e.target.value) || 0)
                                      }
                                      className="w-10 bg-transparent text-center font-mono text-xs text-amber-300 font-bold focus:outline-none"
                                    />
                                    <span className="text-[10px] text-gray-500">m</span>
                                    <button
                                      onClick={() => addVideoGiftMinutes(video.id, 15)}
                                      className="px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold rounded transition-colors"
                                    >
                                      +15m
                                    </button>
                                  </div>

                                  <button
                                    onClick={() => toggleVideoCompleted(video.id)}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                      video.isCompleted
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                                    }`}
                                  >
                                    <CheckCircle size={15} />
                                  </button>
                                </div>
                              </div>

                              <div className="mt-2.5 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      video.isCompleted
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                                        : !video.isEnabled
                                        ? 'bg-gray-600'
                                        : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.round(video.progressPercent || 0))}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-gray-400 w-10 text-right">
                                  {Math.min(100, Math.round(video.progressPercent || 0))}%
                                </span>
                              </div>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => setIsDropdownExpanded(false)}
                            className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-xl font-medium transition-colors"
                          >
                            ▲ Collapse Dropdown to 3 Videos
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Mode 3: Show All Videos */
                <div className="space-y-3">
                  {filteredVideos.map((video, idx) => (
                    <div
                      id={`video-card-${video.id || video._id}`}
                      key={video.id || video._id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        !video.isEnabled
                          ? 'bg-red-950/10 border-red-500/25 opacity-85'
                          : video.isCompleted
                          ? 'bg-emerald-950/15 border-emerald-500/30'
                          : 'bg-black/50 border-gray-800/90 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs ${
                              video.isCompleted
                                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                                : !video.isEnabled
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-gray-800 text-gray-300'
                            }`}
                          >
                            {video.isCompleted ? <Check size={15} /> : idx + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-white truncate max-w-md">
                                {video.title}
                              </h3>
                              {video.isFree && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  FREE
                                </span>
                              )}
                              {video.giftMinutes > 0 && (
                                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                  <Gift size={11} /> +{video.giftMinutes}m Gift
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                              <span>
                                Seen:{' '}
                                <span className="text-white font-mono font-medium">
                                  {formatDuration(video.watchSeconds)}
                                </span>
                              </span>
                              <span>•</span>
                              <span>
                                Duration:{' '}
                                <span className="text-gray-300 font-mono font-medium">
                                  {formatDuration(video.duration)}
                                </span>
                              </span>
                              <span>•</span>
                              <span
                                className={`font-semibold ${
                                  Math.round(video.progressPercent || 0) >= 100
                                    ? 'text-emerald-400'
                                    : (video.progressPercent || 0) > 0
                                    ? 'text-blue-400'
                                    : 'text-gray-500'
                                }`}
                              >
                                {Math.min(100, Math.round(video.progressPercent || 0))}% Watched
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap self-end lg:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleVideoAccess(video.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                              video.isEnabled
                                ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                                : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40'
                            }`}
                          >
                            {video.isEnabled ? (
                              <>
                                <Play size={13} className="fill-emerald-400 text-emerald-400" />
                                <span>Watching ON</span>
                              </>
                            ) : (
                              <>
                                <Lock size={13} className="text-red-400" />
                                <span>Watching OFF</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setEditingSeenVideoId(video.id);
                              setCustomSeenMinutes(Math.round(video.watchSeconds / 60));
                            }}
                            className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors font-mono"
                          >
                            {formatDuration(video.watchSeconds)}
                          </button>

                          <div className="flex items-center gap-1 bg-black/60 px-2 py-1 rounded-lg border border-gray-800">
                            <Gift size={13} className="text-amber-400 shrink-0" />
                            <input
                              type="number"
                              min="0"
                              value={video.giftMinutes || 0}
                              onChange={(e) =>
                                setVideoGiftTime(video.id, parseInt(e.target.value) || 0)
                              }
                              className="w-10 bg-transparent text-center font-mono text-xs text-amber-300 font-bold focus:outline-none"
                            />
                            <span className="text-[10px] text-gray-500">m</span>
                            <button
                              onClick={() => addVideoGiftMinutes(video.id, 15)}
                              className="px-1.5 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold rounded transition-colors"
                            >
                              +15m
                            </button>
                          </div>

                          <button
                            onClick={() => toggleVideoCompleted(video.id)}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              video.isCompleted
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                            }`}
                          >
                            <CheckCircle size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              video.isCompleted
                                ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                                : !video.isEnabled
                                ? 'bg-gray-600'
                                : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.round(video.progressPercent || 0))}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-gray-400 w-10 text-right">
                          {Math.min(100, Math.round(video.progressPercent || 0))}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Access Control & Expiration */}
          <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Shield size={20} className="text-emerald-400" />
              Course Enrollment & Overall Access Control
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Enrollment Status
                </label>
                <select
                  value={enrollmentStatus}
                  onChange={(e) => setEnrollmentStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-gray-700 rounded-xl text-white text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="active">Active (Full Access)</option>
                  <option value="suspended">Suspended (Temporarily Paused)</option>
                  <option value="expired">Expired</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Access Expiration Date
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/60 border border-gray-700 rounded-xl text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Gift size={14} className="text-amber-400" />
                  Course Gift Hours Remaining
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={giftHours}
                    onChange={(e) => setGiftHours(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-gray-700 rounded-xl text-white text-sm focus:border-emerald-500 focus:outline-none font-mono"
                  />
                  <button
                    onClick={() => setGiftHours((prev) => prev + 5)}
                    className="px-3 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl transition-colors shrink-0"
                    title="Add 5 hours"
                  >
                    +5h
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Community & Group Links Section */}
          <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MessageCircle size={20} className="text-emerald-400" />
              Community & Group Links
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-emerald-400 mb-1.5">
                  WhatsApp Group Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={whatsappLink}
                    onChange={(e) => setWhatsappLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="flex-1 px-3.5 py-2.5 bg-black/60 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
                  />
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl transition-colors"
                      title="Open WhatsApp Link"
                    >
                      <MessageCircle size={18} />
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-blue-400 mb-1.5">
                  Community Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={communityLink}
                    onChange={(e) => setCommunityLink(e.target.value)}
                    placeholder="https://community.example.com/..."
                    className="flex-1 px-3.5 py-2.5 bg-black/60 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                  />
                  {communityLink && (
                    <a
                      href={communityLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl transition-colors"
                      title="Open Community Link"
                    >
                      <Globe size={18} />
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-400 mb-1.5">
                  Discord Link (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discordLink}
                    onChange={(e) => setDiscordLink(e.target.value)}
                    placeholder="https://discord.gg/..."
                    className="flex-1 px-3.5 py-2.5 bg-black/60 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-400 mb-1.5">
                  Telegram Link (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={telegramLink}
                    onChange={(e) => setTelegramLink(e.target.value)}
                    placeholder="https://t.me/..."
                    className="flex-1 px-3.5 py-2.5 bg-black/60 border border-gray-700 rounded-xl text-white text-sm placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Submissions, Tasks & Questions Section */
        <div className="space-y-6">
          {/* Summary Stats Card */}
          <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="text-amber-400" size={22} />
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Assignments, Tasks & Questions Results
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {studentSubmissions.length} Submissions
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Detailed answers, quiz scores, todo checklist completions, and teacher grading for this student.
                </p>
              </div>

              <button
                onClick={() => fetchStudentSubmissions()}
                disabled={loadingSubmissions}
                className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl border border-gray-700 transition-colors flex items-center gap-2 self-start sm:self-auto"
              >
                <RefreshCw size={14} className={loadingSubmissions ? 'animate-spin text-amber-400' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {/* 4 Mini Stat Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3">
                <span className="text-[11px] text-gray-400 block font-medium">Total Submissions</span>
                <span className="text-xl font-black text-white mt-0.5 block">{studentSubmissions.length}</span>
              </div>
              <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3">
                <span className="text-[11px] text-amber-400 block font-medium">Quizzes Passed</span>
                <span className="text-xl font-black text-amber-400 mt-0.5 block">
                  {studentSubmissions.filter((s) => s.passed || (s.score !== null && s.score >= (s.passingPoints || 60))).length}
                </span>
              </div>
              <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3">
                <span className="text-[11px] text-emerald-400 block font-medium">Tasks Completed</span>
                <span className="text-xl font-black text-emerald-400 mt-0.5 block">
                  {studentSubmissions.filter((s) => s.subType === 'task' || s.status === 'completed').length}
                </span>
              </div>
              <div className="bg-black/40 border border-gray-800/80 rounded-xl p-3">
                <span className="text-[11px] text-blue-400 block font-medium">Questions Answered</span>
                <span className="text-xl font-black text-blue-400 mt-0.5 block">
                  {studentSubmissions.filter((s) => s.subType === 'question').length}
                </span>
              </div>
            </div>
          </div>

          {/* Submissions List */}
          <div className="space-y-4">
            {loadingSubmissions ? (
              <div className="py-16 text-center bg-gray-900/40 rounded-2xl border border-gray-800">
                <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-gray-400">Loading student results...</p>
              </div>
            ) : studentSubmissions.length === 0 ? (
              <div className="py-12 text-center bg-gray-900/40 rounded-2xl border border-dashed border-gray-800 p-6">
                <Award size={36} className="mx-auto mb-2 text-gray-600" />
                <h3 className="text-sm font-bold text-gray-300">No submissions from this student yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  As the student answers questions, completes daily tasks, or submits quizzes in the learning portal, they will appear here with full answers and grading tools.
                </p>
              </div>
            ) : (
              studentSubmissions.map((sub, idx) => {
                const isExp = expandedSubId === sub.id;
                const hasAns = sub.answers && Object.keys(sub.answers).length > 0;
                const hasChk = Array.isArray(sub.checklist) && sub.checklist.length > 0;

                return (
                  <div
                    key={sub.id || idx}
                    className={`bg-gray-900/60 rounded-2xl border transition-all overflow-hidden ${
                      isExp ? 'border-amber-500/40 shadow-xl' : 'border-gray-800/90 hover:border-gray-700'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
                          sub.subType === 'task'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : sub.subType === 'question'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {sub.subType === 'task' ? <CheckSquare size={16} /> : sub.subType === 'question' ? <HelpCircle size={16} /> : <Award size={16} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-sm text-white">{sub.title}</h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
                              {sub.subType === 'task' ? 'Daily Task' : sub.subType === 'question' ? 'Questions' : 'Quiz / Exam'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span>{sub.courseTitle}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {new Date(sub.submittedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap justify-between sm:justify-end">
                        {/* Score or Status Pill */}
                        {sub.score !== null ? (
                          <div className={`px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1 ${
                            sub.passed || sub.score >= (sub.passingPoints || 60)
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-950/40 text-red-400 border-red-500/30'
                          }`}>
                            {sub.passed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            <span>{sub.score} / {sub.total} pts</span>
                          </div>
                        ) : (
                          <div className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-950/40 text-blue-400 border border-blue-500/30 capitalize">
                            {sub.status.replace('_', ' ')}
                          </div>
                        )}

                        <button
                          onClick={() => setExpandedSubId(isExp ? null : sub.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 ${
                            isExp
                              ? 'bg-amber-500 text-black border-amber-400 font-bold'
                              : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700'
                          }`}
                        >
                          <span>{isExp ? 'Hide Details' : 'View Answers & Grade'}</span>
                          {isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Drawer */}
                    {isExp && (
                      <div className="border-t border-gray-800 bg-black/40 p-5 space-y-5 animate-fadeIn">
                        {/* Answers or Checklist */}
                        {sub.subType === 'task' || hasChk ? (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                              <CheckSquare size={13} /> Checklist Progress
                            </h4>
                            <div className="space-y-1.5 bg-gray-900/60 p-3.5 rounded-xl border border-gray-800">
                              {sub.checklist?.map((item: any, cIdx: number) => (
                                <div
                                  key={item.id || cIdx}
                                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs ${
                                    item.checked
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                      : 'bg-gray-800/40 border-gray-800 text-gray-400'
                                  }`}
                                >
                                  <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                    item.checked ? 'bg-emerald-500 text-black' : 'border border-gray-600'
                                  }`}>
                                    {item.checked ? '✓' : ''}
                                  </span>
                                  <span className={item.checked ? 'line-through opacity-80' : ''}>{item.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1.5">
                              <MessageSquare size={13} /> Student Answers
                            </h4>
                            <div className="space-y-2.5">
                              {hasAns ? (
                                Object.entries(sub.answers).map(([qKey, aVal], aIdx) => {
                                  const qDef = sub.assignmentDetails?.content?.questions?.find((q: any) => q.id === qKey);
                                  return (
                                    <div key={qKey} className="bg-gray-900/70 p-3 rounded-xl border border-gray-800 space-y-1.5">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-gray-200">
                                          {qDef?.prompt || `Question ${aIdx + 1}`}
                                        </span>
                                        {qDef?.points && (
                                          <span className="text-[10px] text-amber-400 bg-gray-800 px-1.5 py-0.5 rounded">
                                            {qDef.points} pts
                                          </span>
                                        )}
                                      </div>
                                      <div className="p-2 bg-black/60 rounded-lg text-xs text-emerald-300 font-medium">
                                        {Array.isArray(aVal) ? aVal.join(', ') : String(aVal || 'No answer')}
                                      </div>
                                      {qDef?.correctAnswer && (
                                        <p className="text-[11px] text-gray-400">
                                          Correct Key: <span className="text-amber-400 font-semibold">{String(qDef.correctAnswer)}</span>
                                        </p>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-xs text-gray-500 italic">No answers recorded.</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Inline Grading Form */}
                        <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                            <Award size={13} /> Update Review & Teacher Feedback
                          </h4>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                                Score Points ({sub.total} Max)
                              </label>
                              <input
                                type="number"
                                value={
                                  reviewScore[sub.id] !== undefined
                                    ? reviewScore[sub.id]
                                    : sub.score !== null
                                    ? sub.score
                                    : ''
                                }
                                onChange={(e) =>
                                  setReviewScore((prev) => ({ ...prev, [sub.id]: e.target.value }))
                                }
                                placeholder="e.g. 85"
                                className="w-full px-3 py-1.5 bg-black/60 border border-gray-700 rounded-lg text-xs text-white focus:border-amber-500 focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                                Status
                              </label>
                              <select
                                value={reviewStatus[sub.id] || sub.status}
                                onChange={(e) =>
                                  setReviewStatus((prev) => ({ ...prev, [sub.id]: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 bg-black/60 border border-gray-700 rounded-lg text-xs text-white focus:border-amber-500 focus:outline-none"
                              >
                                <option value="passed">Passed</option>
                                <option value="completed">Completed</option>
                                <option value="submitted">Submitted</option>
                                <option value="graded">Graded</option>
                                <option value="needs_revision">Needs Revision</option>
                                <option value="failed">Failed</option>
                              </select>
                            </div>

                            <div className="flex items-end">
                              <button
                                onClick={() => handleSaveStudentReview(sub)}
                                disabled={savingSubId === sub.id}
                                className="w-full px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                              >
                                <Save size={13} />
                                <span>{savingSubId === sub.id ? 'Saving...' : 'Save Review'}</span>
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                              Feedback Note for Student
                            </label>
                            <textarea
                              rows={2}
                              value={
                                reviewFeedback[sub.id] !== undefined
                                  ? reviewFeedback[sub.id]
                                  : sub.feedback || ''
                              }
                              onChange={(e) =>
                                setReviewFeedback((prev) => ({ ...prev, [sub.id]: e.target.value }))
                              }
                              placeholder="Write notes or comments for student..."
                              className="w-full px-3 py-1.5 bg-black/60 border border-gray-700 rounded-lg text-xs text-white focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Course Pending Items Section */}
            {courseAssignments.length > 0 && (
              <div className="mt-8 bg-gray-900/40 rounded-2xl border border-gray-800 p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Course Workshop Tasks & Quizzes
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Overview of all curriculum items for this enrolled course and student completion status.
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    {studentSubmissions.length} of {courseAssignments.length} Submitted
                  </span>
                </div>

                <div className="space-y-2">
                  {courseAssignments.map((ca: any) => {
                    const hasSubmitted = studentSubmissions.some(
                      (s) => s.assignmentId === (ca.id || ca._id)
                    );
                    return (
                      <div
                        key={ca.id || ca._id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                          hasSubmitted
                            ? 'bg-emerald-950/15 border-emerald-500/20 text-gray-300'
                            : 'bg-black/40 border-gray-800 text-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full ${hasSubmitted ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <span className="font-semibold text-white truncate">{ca.title}</span>
                          <span className="text-[10px] text-gray-500">
                            ({ca.content?.level || 'Level 1'} • {ca.content?.totalPoints || 100} pts)
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            hasSubmitted
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {hasSubmitted ? 'Submitted' : 'Pending Student Action'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

        {/* Right Column / Sidebar: Student Profile, Watch Stats, Devices (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* User Information Card */}
          <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4">Student Information</h2>
            <div className="space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-emerald-400 shrink-0">
                  <Mail size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400">Email Address</p>
                  <p className="text-sm text-white font-medium break-all">
                    {enrollment.userId.email || 'No email provided'}
                  </p>
                </div>
              </div>

              {enrollment.userId.phone && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-blue-400 shrink-0">
                    <Phone size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-400">Phone Number</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white font-medium">{enrollment.userId.phone}</p>
                      <a
                        href={`https://wa.me/${enrollment.userId.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {(enrollment.userId.country || enrollment.userId.state) && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-purple-400 shrink-0">
                    <Globe size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Location</p>
                    <p className="text-sm text-white">
                      {[enrollment.userId.state, enrollment.userId.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {enrollment.userId.profession && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-amber-400 shrink-0">
                    <Award size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Profession</p>
                    <p className="text-sm text-white">{enrollment.userId.profession}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400 shrink-0">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Enrolled Date</p>
                  <p className="text-sm text-white">
                    {new Date(enrollment.enrolledAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* User IP Address */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-cyan-400 shrink-0">
                  <Wifi size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400">User IP Address</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm font-mono text-cyan-300 font-semibold truncate">
                      {primaryIp || enrollment.userId.ip || 'Not recorded yet'}
                    </span>
                    {(primaryIp || enrollment.userId.ip) && (
                      <button
                        onClick={() =>
                          copyToClipboard(primaryIp || enrollment.userId.ip || '', 'user-ip')
                        }
                        className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition-colors"
                        title="Copy IP Address"
                      >
                        {copiedText === 'user-ip' ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Last Used / Active Date & Time */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-indigo-400 shrink-0">
                  <Clock size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400">Last Active / Used</p>
                  <p className="text-sm text-white font-medium">
                    {formatDateTime(
                      enrollment.userId.lastUsedAt ||
                        enrollment.userId.lastActiveAt ||
                        recentActivity[0]?.timestamp ||
                        enrollment.enrolledAt
                    )}
                  </p>
                  {(enrollment.userId.lastUsedAt || recentActivity[0]?.timestamp) && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {formatTimeAgo(
                        enrollment.userId.lastUsedAt || recentActivity[0]?.timestamp
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Login Credentials & Password Reset */}
            <div className="mt-5 pt-5 border-t border-gray-800">
              <h3 className="text-xs font-bold text-gray-300 mb-2 flex items-center gap-2">
                <Key size={14} className="text-amber-400" />
                Login Credentials
              </h3>
              <p className="text-xs text-gray-400 mb-2.5">
                Student logs in with: <span className="text-white font-medium">{enrollment.userId.email}</span>
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordResetDone(false);
                  }}
                  placeholder="New password (min 6 chars)"
                  className="flex-1 px-3 py-2 bg-black/60 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none text-xs"
                />
                <button
                  onClick={generatePassword}
                  title="Generate random password"
                  className="px-2.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={handleResetPassword}
                  disabled={resettingPassword || newPassword.length < 6}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-bold rounded-lg text-xs transition-colors whitespace-nowrap"
                >
                  {resettingPassword ? '...' : 'Reset'}
                </button>
              </div>

              {passwordResetDone && (
                <div className="mt-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-white font-mono">
                      <div>Login: {enrollment.userId.email}</div>
                      <div>Pass: {newPassword}</div>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `Email: ${enrollment.userId.email}\nPassword: ${newPassword}`,
                          'creds'
                        )
                      }
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs flex items-center gap-1"
                    >
                      {copiedText === 'creds' ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Watch Stats Card */}
          <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Clock size={20} className="text-blue-400" />
              Watch Stats
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400">Total Watch Time</p>
                <p className="text-2xl font-bold text-white tracking-tight mt-0.5">
                  {formatWatchHours(
                    Math.max(Number(enrollment.totalWatchTime || 0), computedTotalWatchedSeconds)
                  )}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">Overall Course Progress</span>
                  <span className="text-emerald-400 font-bold font-mono">{computedProgress}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-300"
                    style={{ width: `${computedProgress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
                  <p className="text-[11px] text-gray-400">Purchase Type</p>
                  <p className="text-sm font-bold text-white capitalize mt-0.5">
                    {enrollment.purchaseType || 'paid'}
                  </p>
                </div>
                <div className="bg-black/40 p-3 rounded-xl border border-gray-800">
                  <p className="text-[11px] text-gray-400">Gift Hours</p>
                  <p className="text-sm font-bold text-amber-300 font-mono mt-0.5">
                    {giftHours} hrs
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity size={20} className="text-emerald-400" />
                Recent Activity
              </h2>
              {recentActivity.length > 0 && (
                <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full font-mono">
                  {recentActivity.length} events
                </span>
              )}
            </div>

            {recentActivity.length === 0 ? (
              <div className="py-6 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl px-4">
                <Activity size={24} className="mx-auto mb-2 opacity-30 text-emerald-400" />
                <p className="text-xs font-semibold text-gray-400">No recent activity</p>
                <p className="text-[11px] text-gray-600 mt-1">
                  Logins, video watches, and assignment submissions will automatically appear here with student IP address and timestamp.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {recentActivity.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-black/50 hover:bg-black/70 rounded-xl border border-gray-800/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gray-800/90 flex items-center justify-center shrink-0 mt-0.5 text-xs">
                          {act.type === 'signin' ? (
                            <LogIn size={14} className="text-blue-400" />
                          ) : act.type === 'watch' ? (
                            <Play size={14} className="text-emerald-400" />
                          ) : act.type === 'submission' ? (
                            <CheckSquare size={14} className="text-purple-400" />
                          ) : (
                            <Smartphone size={14} className="text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white truncate">
                            {act.title}
                          </p>
                          {act.subtitle && (
                            <p className="text-[11px] text-gray-400 truncate">
                              {act.subtitle}
                            </p>
                          )}
                          {act.ip && (
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 mt-1">
                              <Wifi size={11} className="text-cyan-400 shrink-0" />
                              <span>IP: {act.ip}</span>
                              <button
                                onClick={() => copyToClipboard(act.ip || '', act.id)}
                                className="text-gray-500 hover:text-white"
                                title="Copy IP"
                              >
                                {copiedText === act.id ? (
                                  <Check size={10} className="text-emerald-400" />
                                ) : (
                                  <Copy size={10} />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-400">
                          {formatDateTime(act.timestamp)}
                        </p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {formatTimeAgo(act.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Devices Card (Device Fingerprint, Browser, OS, IP, Controls) */}
          <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Smartphone size={20} className="text-purple-400" />
                Devices ({devices.length}/3)
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowAddDeviceModal(true)}
                  className="p-1.5 bg-gray-800 hover:bg-gray-700 text-purple-300 rounded-lg transition-colors"
                  title="Authorize new device manually"
                >
                  <Plus size={15} />
                </button>
                {devices.length > 0 && (
                  <button
                    onClick={resetAllDevices}
                    className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs rounded-lg border border-red-500/30 transition-colors"
                    title="Reset all device slots"
                  >
                    Reset Slots
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {devices.length === 0 ? (
                <div className="py-6 text-center text-gray-500 border border-dashed border-gray-800 rounded-xl px-4">
                  <Smartphone size={28} className="mx-auto mb-2 opacity-40 text-purple-400" />
                  <p className="text-xs font-semibold text-gray-300">No devices registered</p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Device model & browser are automatically captured when the student logs in or plays video.
                  </p>
                  {(primaryIp || enrollment.userId.ip) && (
                    <div className="mt-3 p-2.5 bg-black/60 rounded-xl border border-gray-800 text-left text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400 flex items-center gap-1">
                          <Wifi size={11} className="text-cyan-400" />
                          Last detected IP:
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-cyan-300 font-semibold">
                            {primaryIp || enrollment.userId.ip}
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(primaryIp || enrollment.userId.ip || '', 'last-ip')
                            }
                            className="text-gray-500 hover:text-white p-0.5"
                            title="Copy IP"
                          >
                            {copiedText === 'last-ip' ? (
                              <Check size={10} className="text-emerald-400" />
                            ) : (
                              <Copy size={10} />
                            )}
                          </button>
                        </div>
                      </div>
                      {(enrollment.userId.lastUsedAt || recentActivity[0]?.timestamp) && (
                        <div className="flex items-center justify-between text-gray-500 text-[10px] mt-1.5 pt-1.5 border-t border-gray-800/60">
                          <span>Used:</span>
                          <span>
                            {formatDateTime(
                              enrollment.userId.lastUsedAt || recentActivity[0]?.timestamp
                            )}{' '}
                            ({formatTimeAgo(
                              enrollment.userId.lastUsedAt || recentActivity[0]?.timestamp
                            )})
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => setShowAddDeviceModal(true)}
                    className="mt-3 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs rounded-lg font-medium transition-colors"
                  >
                    + Authorize Device Slot
                  </button>
                </div>
              ) : (
                devices.map((device) => {
                  const devFingerprint =
                    device.deviceFingerprint || device.fingerprint || device._id;
                  const isBlocked = device.isBlocked || !device.isActive;

                  return (
                    <div
                      key={device._id || device.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isBlocked
                          ? 'bg-red-950/20 border-red-500/30'
                          : 'bg-black/50 border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-purple-300 shrink-0 mt-0.5">
                            {device.deviceType === 'mobile' ? (
                              <Smartphone size={16} />
                            ) : device.deviceType === 'tablet' ? (
                              <Tablet size={16} />
                            ) : (
                              <Laptop size={16} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white truncate">
                              {device.deviceName || 'Registered Device'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {[device.browser, device.os].filter(Boolean).join(' • ') || 'Web Client'}
                            </p>

                            {/* Device IP Address */}
                            {(device.ip || primaryIp) && (
                              <p className="text-[11px] text-cyan-400 font-mono mt-1 flex items-center gap-1.5">
                                <Wifi size={11} className="text-cyan-400 shrink-0" />
                                <span>IP: {device.ip || primaryIp}</span>
                                <button
                                  onClick={() =>
                                    copyToClipboard(
                                      device.ip || primaryIp || '',
                                      device._id || device.id
                                    )
                                  }
                                  className="text-gray-400 hover:text-white"
                                  title="Copy IP"
                                >
                                  {copiedText === (device._id || device.id) ? (
                                    <Check size={10} className="text-emerald-400" />
                                  ) : (
                                    <Copy size={10} />
                                  )}
                                </button>
                              </p>
                            )}

                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                              Hash: {devFingerprint.slice(0, 14)}...
                            </p>

                            {/* Device Used Date & Time */}
                            <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                              <Clock size={10} className="text-gray-500 shrink-0" />
                              <span>
                                Last used:{' '}
                                {formatDateTime(
                                  device.lastUsedAt || device.lastActiveAt || device.createdAt
                                )}{' '}
                                ({formatTimeAgo(
                                  device.lastUsedAt || device.lastActiveAt || device.createdAt
                                )})
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              isBlocked
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {isBlocked ? 'Blocked' : 'Active'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                toggleDeviceBlock(device._id || device.id, !isBlocked)
                              }
                              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                                isBlocked
                                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                                  : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                              }`}
                              title={isBlocked ? 'Unblock device' : 'Block device'}
                            >
                              {isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <button
                              onClick={() => deleteDevice(device._id || device.id)}
                              className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                              title="Delete device"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {devices.length >= 3 && (
              <p className="text-amber-500 text-xs mt-3 flex items-center gap-1">
                <AlertCircle size={12} /> Maximum 3 devices registered for this user.
              </p>
            )}
          </div>

          {/* Recent Watch Activity */}
          <div className="bg-gray-900/60 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white mb-4">Recent Watch Logs</h2>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {watchLogs.length === 0 ? (
                <p className="text-gray-500 text-xs py-4 text-center">No recent watch events recorded.</p>
              ) : (
                watchLogs.map((log) => (
                  <div
                    key={log._id}
                    className="p-2.5 bg-black/40 rounded-xl border border-gray-800/80 text-xs"
                  >
                    <div className="flex items-center justify-between text-gray-300 font-medium">
                      <span className="truncate max-w-[180px]">{log.videoTitle || 'Video'}</span>
                      <span className="text-emerald-400 font-mono">
                        {formatDuration(log.watchDuration)}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {formatDateTime(log.watchStarted)} ({formatTimeAgo(log.watchStarted)})
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Device Modal */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Smartphone size={20} className="text-purple-400" />
                Authorize Device Slot
              </h3>
              <button
                onClick={() => setShowAddDeviceModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Manually authorize a device slot for this student (e.g. personal laptop, work computer, or iPad).
            </p>
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Device Name / Model</label>
                <input
                  type="text"
                  value={manualDeviceName}
                  onChange={(e) => setManualDeviceName(e.target.value)}
                  placeholder="e.g. Mukul iPhone 14 Pro, Home PC"
                  className="w-full px-3.5 py-2.5 bg-black border border-gray-700 rounded-xl text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Device Type</label>
                <select
                  value={manualDeviceType}
                  onChange={(e) => setManualDeviceType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-black border border-gray-700 rounded-xl text-white text-sm focus:border-purple-500 focus:outline-none"
                >
                  <option value="mobile">Mobile Phone (iPhone / Android)</option>
                  <option value="desktop">Desktop / Laptop PC (Mac / Windows)</option>
                  <option value="tablet">Tablet (iPad / Galaxy Tab)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Device IP Address (optional)
                </label>
                <input
                  type="text"
                  value={manualDeviceIp}
                  onChange={(e) => setManualDeviceIp(e.target.value)}
                  placeholder="e.g. 103.24.88.12 (auto-detected if blank)"
                  className="w-full px-3.5 py-2.5 bg-black border border-gray-700 rounded-xl text-white text-sm font-mono focus:border-purple-500 focus:outline-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Pre-filled with student's last detected IP address.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => setShowAddDeviceModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManualDevice}
                disabled={!manualDeviceName.trim()}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl"
              >
                Authorize Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Seen Time Modal */}
      {editingSeenVideoId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Clock size={18} className="text-emerald-400" />
              Adjust Seen Time
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Enter how many minutes of this video the student has watched.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={customSeenMinutes}
                onChange={(e) => setCustomSeenMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-xl text-white font-mono text-center text-lg focus:border-emerald-500 focus:outline-none font-bold"
              />
              <span className="text-gray-400 text-sm font-semibold">minutes</span>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditingSeenVideoId(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={applyCustomSeenTime}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold rounded-xl"
              >
                Apply Seen Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
