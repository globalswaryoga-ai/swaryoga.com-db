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
import StudentManagementHeader from '@/components/admin/e-learning/StudentManagementHeader';

interface TakenWorkshop {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  slug: string;
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
      {/* 2nd Row Header with The Three Navigation Buttons & Taken Workshops */}
      <StudentManagementHeader
        userId={userId}
        enrollmentId={enrollmentId || enrollment._id}
        enrollment={enrollment}
        takenWorkshops={takenWorkshops}
        activePage="profile"
        videosCount={6}
        devicesCount={devices.length}
        daysActiveCount={dailyActivity.length}
      />

      {/* Messages */}
      {successMessage && (
        <div className="max-w-7xl mx-auto mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 shadow-lg">
          <CheckCircle size={20} className="shrink-0 text-emerald-400" />
          <span className="font-medium text-sm">{successMessage}</span>
        </div>
      )}

      {/* Main Profile Page Switcher Tabs */}
      <div className="max-w-7xl mx-auto mb-6 bg-gray-900/90 border border-gray-800 p-2 rounded-2xl backdrop-blur-md shadow-xl flex items-center justify-start gap-2.5 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'profile'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/30'
              : 'text-gray-300 hover:text-white hover:bg-gray-800/80 border border-transparent'
          }`}
        >
          <User size={16} />
          <span>Profile & Credentials</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('devices')}
          className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'devices'
              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/25 ring-2 ring-purple-400/30'
              : 'text-gray-300 hover:text-white hover:bg-gray-800/80 border border-transparent'
          }`}
        >
          <Smartphone size={16} />
          <span>Device Management ({devices.length}/3)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'analytics'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/30'
              : 'text-gray-300 hover:text-white hover:bg-gray-800/80 border border-transparent'
          }`}
        >
          <BarChart3 size={16} />
          <span>User Updates Dashboard (Daily, Weekly, Monthly, Total)</span>
        </button>
      </div>

      {/* Tab 1: Profile & Credentials */}
      {activeTab === 'profile' && (
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
      )}

      {/* Tab 2: Device Management */}
      {activeTab === 'devices' && (
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-800">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Smartphone size={22} className="text-purple-400" />
                  <span>Student Device Management ({devices.length}/3 Slots Used)</span>
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Manage hardware models, joined IP addresses, and authorized streaming slots.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20"
                >
                  <Plus size={14} />
                  <span>Authorize Device Slot</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetDeviceSlots}
                  className="px-3.5 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Trash2 size={14} />
                  <span>Reset All Slots</span>
                </button>
              </div>
            </div>

            {/* Joined Device Name & IP Highlight Banner */}
            <div className="p-4 bg-gradient-to-r from-purple-950/40 via-gray-900 to-cyan-950/40 border border-purple-500/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">Joined Device & IP Identity</span>
                <p className="text-sm font-semibold text-white">
                  Device: <span className="font-mono text-purple-300">{primaryDevice || devices[0]?.deviceName || 'MacBook'}</span> • IP: <span className="font-mono text-cyan-300">{primaryIp || '103.141.53.13'}</span>
                </p>
                <p className="text-xs text-gray-400">
                  Location: {primaryLocation || 'Sangamner, Maharashtra, India'} • Last active: {primaryLastUsed || 'Recently'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(`Device: ${primaryDevice}\nIP: ${primaryIp}`, 'join_info')}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs flex items-center gap-1.5 shrink-0 self-start md:self-auto font-semibold"
              >
                {copiedText === 'join_info' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>Copy Joined Device & IP</span>
              </button>
            </div>

            {/* Authorized Devices Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((dev, idx) => (
                <div
                  key={dev.id || dev._id || idx}
                  className={`p-4 rounded-xl border transition-all ${
                    dev.isBlocked
                      ? 'bg-red-950/20 border-red-500/40'
                      : 'bg-black/50 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Laptop size={18} className="text-purple-400 shrink-0" />
                      <span className="text-xs font-bold text-white truncate">{dev.deviceName}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      dev.isBlocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {dev.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                  </div>

                  <div className="text-xs font-mono space-y-1 text-gray-300 mt-2">
                    <p className="text-[11px] text-gray-400">IP: <span className="text-cyan-300 font-bold">{dev.ip || '103.141.53.13'}</span></p>
                    <p className="text-[11px] text-gray-400">OS/Browser: {dev.os} • {dev.browser}</p>
                    <p className="text-[11px] text-gray-500">Fingerprint: {dev.deviceFingerprint?.slice(0, 12)}...</p>
                    <p className="text-[11px] text-gray-500">Registered: {formatDateTime(dev.registeredAt)}</p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-gray-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleDeviceBlock(dev.id || dev._id || '', dev.isBlocked)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                        dev.isBlocked
                          ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      {dev.isBlocked ? 'Unblock Device' : 'Block Device'}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(dev.ip, `dev_${idx}`)}
                      className="text-gray-400 hover:text-white text-xs flex items-center gap-1"
                    >
                      {copiedText === `dev_${idx}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                      <span>Copy IP</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: User Updates Dashboard (Daily, Weekly, Monthly, Total) */}
      {activeTab === 'analytics' && (
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 p-5 rounded-2xl border border-gray-800/80 shadow-lg">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} /> Total Watch Time
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-2">
                {formatWatchHours(totalWatchSeconds)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Recorded video stream watch duration</p>
            </div>

            <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 p-5 rounded-2xl border border-gray-800/80 shadow-lg">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Award size={14} /> Completed Modules
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-2">
                {totalCompletedVideos} / {totalVideosCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Overall completion: {overallProgress}%</p>
            </div>

            <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 p-5 rounded-2xl border border-gray-800/80 shadow-lg">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays size={14} /> Active Learning Days
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-cyan-300 font-mono mt-2">
                {dailyActivity.length} Days
              </p>
              <p className="text-xs text-gray-500 mt-1">Total active playback days tracked</p>
            </div>

            <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 p-5 rounded-2xl border border-gray-800/80 shadow-lg">
              <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone size={14} /> Registered Devices
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-purple-300 font-mono mt-2">
                {devices.length} / 3 Slots
              </p>
              <p className="text-xs text-gray-500 mt-1">Joined device: {primaryDevice || 'MacBook'}</p>
            </div>
          </div>

          {/* User Updates Views Filter Tabs */}
          <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-800">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <Activity size={20} className="text-cyan-400" />
                  <span>User Updates & Activity Log</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Chronological breakdown by daily, weekly, monthly and all total details.
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-xl border border-gray-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setAnalyticsView('total')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    analyticsView === 'total' ? 'bg-cyan-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Total All Details
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsView('daily')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    analyticsView === 'daily' ? 'bg-cyan-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsView('weekly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    analyticsView === 'weekly' ? 'bg-cyan-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setAnalyticsView('monthly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    analyticsView === 'monthly' ? 'bg-cyan-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Daily/Weekly/Monthly/Total Timeline */}
            <div className="space-y-4">
              {dailyActivity.length === 0 ? (
                <div className="text-center py-12 bg-black/40 rounded-xl border border-dashed border-gray-800">
                  <Activity size={32} className="mx-auto text-gray-600 mb-2" />
                  <p className="text-xs font-semibold text-gray-400">No activity sessions recorded yet</p>
                </div>
              ) : (
                dailyActivity.map((dayGroup: any, dIdx: number) => (
                  <div
                    key={dayGroup.dateKey || dIdx}
                    className="p-5 bg-black/50 rounded-xl border border-gray-800/90 space-y-4 hover:border-gray-700 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-800/70">
                      <div className="flex items-center gap-2.5">
                        <Calendar size={16} className="text-cyan-400 shrink-0" />
                        <span className="text-sm font-bold text-white">{dayGroup.formattedDate || dayGroup.dateKey}</span>
                        <span className="px-2 py-0.5 text-[10px] bg-cyan-950 text-cyan-300 rounded font-semibold border border-cyan-800/40">
                          {dayGroup.events?.length || 0} events
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                        <span>Watch: <strong className="text-emerald-400 font-bold">{formatWatchHours(dayGroup.totalWatchSeconds || 0)}</strong></span>
                        <span>• Videos: <strong className="text-gray-200">{dayGroup.videosSeenCount || 0}</strong></span>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {dayGroup.events?.map((ev: any, evIdx: number) => (
                        <div
                          key={ev.id || evIdx}
                          className="p-3 bg-gray-900/60 rounded-lg border border-gray-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white truncate">{ev.title || ev.videoTitle}</span>
                              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded uppercase font-bold">
                                {ev.badge || 'Seen'}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400">
                              Duration: <span className="font-mono text-emerald-400">{formatWatchHours(ev.watchDuration || 0)}</span> • Joined Device: <span className="font-mono text-purple-300">{ev.device || primaryDevice}</span>
                            </p>
                          </div>

                          <div className="flex items-center sm:flex-col sm:items-end gap-1.5 text-[11px] text-gray-400 font-mono shrink-0">
                            <span className="text-cyan-300 font-bold">{ev.ip || primaryIp}</span>
                            <span>{formatDateTime(ev.timestamp)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manual Authorize Device Slot Modal */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Smartphone size={20} className="text-purple-400" />
                Authorize Device Slot
              </h3>
              <button onClick={() => setShowAddDeviceModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddManualDevice} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Device Hardware Name</label>
                <input
                  type="text"
                  value={manualDeviceName}
                  onChange={(e) => setManualDeviceName(e.target.value)}
                  placeholder="e.g. MacBook Pro, iPad Pro, Galaxy S24"
                  className="w-full px-3 py-2 bg-black/80 border border-gray-700 rounded-xl text-white text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Device Type</label>
                <select
                  value={manualDeviceType}
                  onChange={(e: any) => setManualDeviceType(e.target.value)}
                  className="w-full px-3 py-2 bg-black/80 border border-gray-700 rounded-xl text-white text-xs"
                >
                  <option value="desktop">Desktop / Laptop</option>
                  <option value="mobile">Mobile Phone</option>
                  <option value="tablet">Tablet / iPad</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Joined IP Address</label>
                <input
                  type="text"
                  value={manualDeviceIp}
                  onChange={(e) => setManualDeviceIp(e.target.value)}
                  placeholder="e.g. 103.141.53.13"
                  className="w-full px-3 py-2 bg-black/80 border border-gray-700 rounded-xl text-white text-xs font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDevice}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold"
                >
                  {addingDevice ? 'Authorizing...' : 'Authorize Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
