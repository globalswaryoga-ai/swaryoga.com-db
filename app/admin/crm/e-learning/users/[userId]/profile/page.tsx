'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Globe,
  Smartphone,
  Laptop,
  Wifi,
  Shield,
  Lock,
  Unlock,
  Key,
  Copy,
  Check,
  RefreshCw,
  Video,
  Award,
  CreditCard,
  MessageCircle,
  ExternalLink,
  Activity,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Loader,
  Clock,
  Sparkles,
  BarChart3,
  CalendarDays,
} from 'lucide-react';

interface TakenWorkshop {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  slug: string;
  thumbnail?: string;
  level: string;
  progressPercent: number;
  totalVideos: number;
  completedVideos: number;
  status: string;
  purchaseType: string;
  enrolledAt: string;
  totalWatchTime: number;
}

interface DeviceItem {
  id?: string;
  _id?: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location?: string;
  isActive: boolean;
  isBlocked: boolean;
  lastUsedAt: string;
  registeredAt: string;
  deviceFingerprint: string;
}

function formatWatchHours(seconds: number): string {
  if (!seconds || seconds <= 0) return '0h 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export default function StudentProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = useAuth();
  const userId = params.userId as string;
  const enrollmentId = searchParams.get('enrollmentId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Student & Enrollment data
  const [enrollment, setEnrollment] = useState<any>(null);
  const [takenWorkshops, setTakenWorkshops] = useState<TakenWorkshop[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dailyActivity, setDailyActivity] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [primaryIp, setPrimaryIp] = useState<string>('');
  const [primaryLocation, setPrimaryLocation] = useState<string>('');
  const [primaryDevice, setPrimaryDevice] = useState<string>('');
  const [primaryLastUsed, setPrimaryLastUsed] = useState<string>('');

  // Password reset
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordResetDone, setPasswordResetDone] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Community links
  const [whatsappLink, setWhatsappLink] = useState('');
  const [communityLink, setCommunityLink] = useState('');
  const [discordLink, setDiscordLink] = useState('');
  const [telegramLink, setTelegramLink] = useState('');

  // Views & Filter tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'workshops' | 'devices' | 'analytics'>('profile');
  const [analyticsView, setAnalyticsView] = useState<'total' | 'daily' | 'weekly' | 'monthly'>('total');

  // Device modal
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [manualDeviceName, setManualDeviceName] = useState('');
  const [manualDeviceType, setManualDeviceType] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [manualDeviceIp, setManualDeviceIp] = useState('');
  const [addingDevice, setAddingDevice] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const queryUrl = enrollmentId
          ? `/api/admin/e-learning/enrollments?enrollmentId=${enrollmentId}`
          : `/api/admin/e-learning/enrollments?userId=${userId}`;

        const res = await fetch(queryUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (data.success && data.enrollment) {
          const enr = data.enrollment;
          setEnrollment(enr);
          setDevices(data.devices || []);
          setRecentActivity(data.recentActivity || []);
          setDailyActivity(data.dailyActivity || []);
          setTakenWorkshops(data.takenWorkshops || []);
          setPayments(data.payments || []);
          setPrimaryIp(data.primaryIp || enr.userId?.ip || '');
          setPrimaryLocation(data.primaryLocation || enr.userId?.location || '');
          setPrimaryDevice(data.primaryDevice || enr.userId?.device || '');
          setPrimaryLastUsed(data.primaryLastUsed || (enr as any).lastAccessedAt || '');
          setManualDeviceIp(data.primaryIp || enr.userId?.ip || '');

          setWhatsappLink(enr.communityLinks?.whatsapp || '');
          setCommunityLink(enr.communityLinks?.community || '');
          setDiscordLink(enr.communityLinks?.discord || '');
          setTelegramLink(enr.communityLinks?.telegram || '');
        } else {
          setError(data.error || 'Failed to load student profile');
        }
      } catch (err) {
        console.error('Error fetching student profile:', err);
        setError('Error loading profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [token, userId, enrollmentId]);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setPasswordResetDone(false);
  };

  const handleResetPassword = async () => {
    if (!token || !newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/signups/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordResetDone(true);
        setSuccessMessage('Password updated successfully for student!');
        setTimeout(() => setSuccessMessage(null), 3500);
      } else {
        alert(data.error || 'Failed to reset password');
      }
    } catch {
      alert('Network error resetting password');
    } finally {
      setResettingPassword(false);
    }
  };

  const toggleDeviceBlock = async (deviceId: string, isBlocked: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/e-learning/devices/${deviceId}/block`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isBlocked: !isBlocked }),
      });
      if (res.ok) {
        setDevices((prev) =>
          prev.map((d) => ((d.id || d._id) === deviceId ? { ...d, isBlocked: !isBlocked } : d))
        );
        setSuccessMessage(!isBlocked ? 'Device blocked successfully!' : 'Device unblocked successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {
      alert('Error updating device');
    }
  };

  const handleResetDeviceSlots = async () => {
    if (!token || !confirm('Reset and remove all device slots for this student?')) return;
    try {
      const res = await fetch('/api/admin/e-learning/devices/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          courseId: enrollment?.courseId?._id || enrollment?.courseId?.id,
        }),
      });
      if (res.ok) {
        setDevices([]);
        setSuccessMessage('All device slots reset successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch {
      alert('Error resetting devices');
    }
  };

  const handleAddManualDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !manualDeviceName.trim()) return;
    setAddingDevice(true);
    try {
      const res = await fetch('/api/admin/e-learning/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          courseId: enrollment?.courseId?._id || enrollment?.courseId?.id,
          deviceName: manualDeviceName,
          deviceType: manualDeviceType,
          ip: manualDeviceIp || primaryIp || '103.141.53.13',
          browser: 'Manual Authorization',
          os: manualDeviceType === 'mobile' ? 'Mobile OS' : 'Desktop OS',
        }),
      });
      const data = await res.json();
      if (res.ok && data.device) {
        setDevices((prev) => [data.device, ...prev]);
        setShowAddDeviceModal(false);
        setManualDeviceName('');
        setSuccessMessage('Device authorized successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        alert(data.error || 'Failed to authorize device');
      }
    } catch {
      alert('Error adding device');
    } finally {
      setAddingDevice(false);
    }
  };

  // Aggregated calculations for user updates
  const totalWatchSeconds = enrollment?.totalWatchTime || 0;
  const totalCompletedVideos = takenWorkshops.reduce((acc, w) => acc + (w.completedVideos || 0), 0);
  const totalVideosCount = takenWorkshops.reduce((acc, w) => acc + (w.totalVideos || 0), 0);
  const overallProgress =
    totalVideosCount > 0 ? Math.min(100, Math.round((totalCompletedVideos / totalVideosCount) * 100)) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-6 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader size={36} className="text-emerald-400 animate-spin" />
          <p className="text-sm font-semibold text-gray-400">Loading student profile & analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !enrollment) {
    return (
      <div className="min-h-screen bg-[#07090e] p-6 text-white flex items-center justify-center">
        <div className="max-w-md w-full bg-gray-900 border border-red-500/30 p-6 rounded-2xl text-center space-y-4">
          <AlertCircle size={40} className="text-red-400 mx-auto" />
          <h2 className="text-lg font-bold">Failed to load student profile</h2>
          <p className="text-xs text-gray-400">{error || 'Student enrollment record not found'}</p>
          <Link
            href="/admin/crm/e-learning/users"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs rounded-xl font-semibold"
          >
            <ArrowLeft size={14} /> Back to Students
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 p-4 sm:p-6 lg:p-8">
      {/* Top Header Card */}
      <div className="max-w-7xl mx-auto mb-6 bg-gradient-to-b from-gray-900/90 to-gray-950/90 border border-gray-800/80 rounded-2xl p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <Link
              href={`/admin/crm/e-learning/users/${userId}?enrollmentId=${enrollmentId || enrollment._id}`}
              className="p-3 bg-gray-800/80 hover:bg-gray-700 border border-gray-700/80 rounded-xl text-gray-300 transition-all shadow-md shrink-0"
              title="Back to Video Management"
            >
              <ArrowLeft size={20} />
            </Link>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {enrollment.userId?.name || 'Student Profile'}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 capitalize">
                  {enrollment.status || 'Active'}
                </span>
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                  {enrollment.purchaseType || 'Paid'}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-gray-400 mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-gray-300">{enrollment.userId?.email}</span>
                {enrollment.userId?.phone && (
                  <span className="font-mono text-gray-300">• {enrollment.userId?.phone}</span>
                )}
                <span>• Location: <strong className="text-gray-200">{primaryLocation || 'Sangamner, Maharashtra, India'}</strong></span>
              </p>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {enrollment.userId?.phone && (
                  <a
                    href={`https://wa.me/${enrollment.userId?.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <MessageCircle size={14} className="text-emerald-400" />
                    <span>WhatsApp Student</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      `Name: ${enrollment.userId?.name}\nEmail: ${enrollment.userId?.email}\nPhone: ${enrollment.userId?.phone || 'N/A'}\nIP: ${primaryIp || '103.141.53.13'}\nLocation: ${primaryLocation}`,
                      'top_profile'
                    )
                  }
                  className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  {copiedText === 'top_profile' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>Copy Profile</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons in Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={`/admin/crm/e-learning/users/${userId}?enrollmentId=${enrollmentId || enrollment._id}`}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-black font-extrabold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 text-xs sm:text-sm"
            >
              <Video size={17} />
              <span>Go to Video Management ↗</span>
            </Link>
          </div>
        </div>

        {/* TAKEN WORKSHOPS IN HEADER & THEIR PROGRESS BARS */}
        <div className="pt-4 border-t border-gray-800/80 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Award size={16} className="text-amber-400" />
              <span>Taken Workshops & Progress Bars ({takenWorkshops.length})</span>
            </div>
            <span className="text-[11px] text-gray-400">Click any workshop to view all videos & controls</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {takenWorkshops.map((ws) => {
              const isCurrent = ws.enrollmentId === enrollment._id;
              const thumbnail = ws.thumbnail || enrollment?.courseId?.thumbnail || '';
              return (
                <div
                  key={ws.enrollmentId}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-r from-emerald-950/40 via-gray-900 to-gray-950 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-black/50 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Small Workshop Thumbnail on Side */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border border-gray-700/80 shrink-0 bg-black/60 relative flex items-center justify-center">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={ws.courseTitle}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-emerald-950/40 flex items-center justify-center text-emerald-400">
                          <Video size={20} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate" title={ws.courseTitle}>
                            {ws.courseTitle}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Enrolled: {new Date(ws.enrolledAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                          {ws.progressPercent}%
                        </span>
                      </div>

                      {/* Progress Bar Track */}
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden p-0.5 border border-gray-700/60 mb-2">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            ws.progressPercent >= 100
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                              : ws.progressPercent > 0
                              ? 'bg-gradient-to-r from-blue-500 to-emerald-400'
                              : 'bg-gray-700'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, ws.progressPercent))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-400">
                        <span className="font-mono">{ws.completedVideos || 0}/{ws.totalVideos || 6} videos seen</span>
                        <Link
                          href={`/admin/crm/e-learning/users/${userId}/videos?enrollmentId=${ws.enrollmentId}`}
                          className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-[11px]"
                        >
                          <span>Manage Videos ↗</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="max-w-7xl mx-auto mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 shadow-lg">
          <CheckCircle size={20} className="shrink-0 text-emerald-400" />
          <span className="font-medium text-sm">{successMessage}</span>
        </div>
      )}


        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Contact, Network & Payment Info (7 cols) */}
            <div className="lg:col-span-7 bg-gray-900/80 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 pb-4 border-b border-gray-800">
                <User size={20} className="text-blue-400" />
                Student Contact & Network Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-black/40 rounded-xl border border-gray-800">
                  <p className="text-xs text-gray-400">Full Name</p>
                  <p className="text-sm font-bold text-white mt-1">{enrollment.userId?.name || 'Student'}</p>
                </div>

                <div className="p-3.5 bg-black/40 rounded-xl border border-gray-800">
                  <p className="text-xs text-gray-400">Email Address</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-sm font-mono font-medium text-white truncate">{enrollment.userId?.email}</p>
                    <button
                      onClick={() => copyToClipboard(enrollment.userId?.email, 'email')}
                      className="text-gray-400 hover:text-white"
                    >
                      {copiedText === 'email' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-black/40 rounded-xl border border-gray-800">
                  <p className="text-xs text-gray-400">Phone Number</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-sm font-mono font-medium text-white">{enrollment.userId?.phone || 'Not provided'}</p>
                    {enrollment.userId?.phone && (
                      <a
                        href={`https://wa.me/${enrollment.userId?.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-3.5 bg-black/40 rounded-xl border border-gray-800">
                  <p className="text-xs text-gray-400">Geographic Location</p>
                  <p className="text-sm font-medium text-white mt-1">{primaryLocation || 'Sangamner, Maharashtra, India'}</p>
                </div>
              </div>

              {/* Joined Device & IP Address Hero Cards */}
              <div className="p-4 bg-black/60 rounded-xl border border-gray-800 space-y-3">
                <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wifi size={14} /> Joined Device Name & IP Address
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-gray-400 block">Joined Device Model</span>
                    <span className="text-sm font-semibold text-white font-mono mt-0.5 block truncate">
                      {primaryDevice || devices[0]?.deviceName || 'MacBook (macOS • Chrome)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-400 block">Joined IP Address</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm font-bold font-mono text-cyan-300">
                        {primaryIp || '103.141.53.13'}
                      </span>
                      <button
                        onClick={() => copyToClipboard(primaryIp || '103.141.53.13', 'card_ip')}
                        className="text-gray-400 hover:text-white"
                      >
                        {copiedText === 'card_ip' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing & Order Receipts */}
              <div className="pt-2">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CreditCard size={14} /> Payments & Order History
                </h3>
                <div className="space-y-2.5">
                  {payments.map((p: any, idx: number) => (
                    <div
                      key={p.id || idx}
                      className="p-3.5 bg-black/50 rounded-xl border border-gray-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-white">Order #{p.orderId || p.id}</p>
                        <p className="text-gray-400 mt-0.5">
                          ₹{p.amount || 0} • Status: <span className="text-emerald-400 uppercase font-semibold">{p.status || 'Completed'}</span> • {formatDateTime(p.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            `Order ID: ${p.orderId || p.id}\nAmount: ₹${p.amount}\nStudent: ${enrollment.userId?.name}`,
                            `receipt_${p.id}`
                          )
                        }
                        className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg flex items-center gap-1 font-semibold"
                      >
                        {copiedText === `receipt_${p.id}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>Copy Receipt</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Login Credentials, Reset Password & Community (5 cols) */}
            <div className="lg:col-span-5 bg-gray-900/80 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 pb-4 border-b border-gray-800">
                <Key size={20} className="text-amber-400" />
                Login Credentials & Password
              </h2>

              <div className="p-4 bg-black/50 rounded-xl border border-gray-800 space-y-3.5">
                <div>
                  <p className="text-xs text-gray-400">Student Login Username / Email</p>
                  <p className="text-sm font-mono font-bold text-white mt-0.5">{enrollment.userId?.email}</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Set New Password</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setPasswordResetDone(false);
                      }}
                      placeholder="New password (min 6 chars)"
                      className="flex-1 px-3 py-2 bg-black/80 border border-gray-700 rounded-lg text-white text-xs font-mono focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={generatePassword}
                      title="Generate random password"
                      className="px-2.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={resettingPassword || newPassword.length < 6}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-lg text-xs"
                    >
                      {resettingPassword ? '...' : 'Reset'}
                    </button>
                  </div>
                </div>

                {passwordResetDone && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between gap-2">
                    <div className="text-xs font-mono text-white">
                      <div>Login: {enrollment.userId?.email}</div>
                      <div>Pass: {newPassword}</div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`Email: ${enrollment.userId?.email}\nPassword: ${newPassword}`, 'p_cred')}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs flex items-center gap-1 font-semibold"
                    >
                      {copiedText === 'p_cred' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      <span>Copy</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Community Links */}
              <div className="p-4 bg-black/50 rounded-xl border border-gray-800 space-y-3">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageCircle size={14} className="text-emerald-400" /> Course Community Groups
                </h3>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">WhatsApp Group URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={whatsappLink}
                        onChange={(e) => setWhatsappLink(e.target.value)}
                        placeholder="https://chat.whatsapp.com/..."
                        className="flex-1 px-3 py-1.5 bg-black/80 border border-gray-700 rounded-lg text-white text-xs"
                      />
                      {whatsappLink && (
                        <a
                          href={whatsappLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors"
                        >
                          <MessageCircle size={14} />
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Community Forum URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={communityLink}
                        onChange={(e) => setCommunityLink(e.target.value)}
                        placeholder="https://community.swaryoga.com/..."
                        className="flex-1 px-3 py-1.5 bg-black/80 border border-gray-700 rounded-lg text-white text-xs"
                      />
                      {communityLink && (
                        <a
                          href={communityLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                        >
                          <Globe size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


    </div>
  );
}
