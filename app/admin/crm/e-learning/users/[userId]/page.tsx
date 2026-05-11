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
  Link as LinkIcon,
  Globe,
  Smartphone,
  Edit2,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface CourseData {
  _id: string;
  slug: string;
  content: { en: { title: string } };
  level: string;
}

interface EnrollmentData {
  _id: string;
  userId: { _id: string; name: string; email: string; phone?: string; image?: string };
  courseId: CourseData;
  status: 'active' | 'expired' | 'suspended' | 'completed';
  progress: number;
  purchaseType: 'paid' | 'free' | 'gift';
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
}

interface WatchLog {
  _id: string;
  deviceInfo?: string;
  watchStarted: string;
  watchDuration: number;
}

interface Device {
  _id: string;
  fingerprint: string;
  deviceName?: string;
  deviceInfo?: string;
  lastUsedAt: string;
  isActive: boolean;
}

export default function UserDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = useAuth();
  const userId = params.userId as string;
  const enrollmentId = searchParams.get('enrollmentId');

  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [watchLogs, setWatchLogs] = useState<WatchLog[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [whatsappLink, setWhatsappLink] = useState('');
  const [communityLink, setCommunityLink] = useState('');
  const [discordLink, setDiscordLink] = useState('');
  const [telegramLink, setTelegramLink] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<'active' | 'expired' | 'suspended' | 'completed'>('active');
  const [expiresAt, setExpiresAt] = useState('');
  const [giftHours, setGiftHours] = useState(0);

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
          setWhatsappLink(enr.communityLinks?.whatsapp || '');
          setCommunityLink(enr.communityLinks?.community || '');
          setDiscordLink(enr.communityLinks?.discord || '');
          setTelegramLink(enr.communityLinks?.telegram || '');
          setEnrollmentStatus(enr.status);
          setExpiresAt(enr.expiresAt?.split('T')[0] || '');
          setGiftHours(enr.giftHoursRemaining || 0);
          setWatchLogs(data.watchLogs || []);
          setDevices(data.devices || []);
        } else {
          setError('Failed to load enrollment data');
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

  const handleSave = async () => {
    if (!token || !enrollmentId || !enrollment) return;

    setSaving(true);
    try {
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
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEnrollment(data.enrollment);
        setSuccessMessage('Changes saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError('Failed to save changes');
      }
    } catch (err) {
      setError('Error saving changes');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

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
          prev.map((d: any) =>
            d._id === deviceId ? { ...d, isBlocked: !d.isBlocked } : d
          )
        );
        setSuccessMessage(`Device ${!isBlocked ? 'blocked' : 'unblocked'}`);
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    } catch (err) {
      setError('Error updating device');
    }
  };

  const deleteDevice = async (deviceId: string) => {
    if (!token || !confirm('Remove this device?')) return;

    try {
      const res = await fetch(`/api/admin/e-learning/devices?id=${deviceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setDevices((prev) => prev.filter((d: any) => d._id !== deviceId));
        setSuccessMessage('Device removed');
        setTimeout(() => setSuccessMessage(null), 2000);
      }
    } catch (err) {
      setError('Error removing device');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="min-h-screen bg-black p-6">
        <Link href="/admin/crm/e-learning/users" className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-4">
          <ArrowLeft size={20} />
          Back to Users
        </Link>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg">
          Enrollment not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/crm/e-learning/users"
          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-gray-400">{enrollment.userId.name}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-lg mb-6 flex items-center gap-2">
          <CheckCircle size={20} />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Info Card */}
          <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-bold text-white mb-6">User Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-300">
                <Mail size={20} />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white">{enrollment.userId.email}</p>
                </div>
              </div>
              {enrollment.userId.phone && (
                <div className="flex items-center gap-3 text-gray-300">
                  <Phone size={20} />
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <p className="text-white">{enrollment.userId.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-gray-300">
                <Calendar size={20} />
                <div>
                  <p className="text-sm text-gray-400">Enrolled</p>
                  <p className="text-white">{new Date(enrollment.enrolledAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Course Info Card */}
          <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-bold text-white mb-6">Course Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Course</p>
                <p className="text-white font-medium">{enrollment.courseId.content.en.title}</p>
                <p className="text-sm text-gray-500">{enrollment.courseId.slug}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Level</p>
                  <p className="text-white capitalize">{enrollment.courseId.level}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-1">Progress</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${enrollment.progress}%` }} />
                    </div>
                    <span className="text-white">{enrollment.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Community Links Section */}
          <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <MessageCircle size={20} className="text-green-400" />
              Community & Group Links
            </h2>
            <div className="space-y-4">
              {/* WhatsApp Link */}
              <div>
                <label className="block text-sm font-medium text-green-400 mb-2">WhatsApp Group Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={whatsappLink}
                    onChange={(e) => setWhatsappLink(e.target.value)}
                    placeholder="https://chat.whatsapp.com/..."
                    className="flex-1 px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                  />
                  {whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors"
                      title="Open WhatsApp"
                    >
                      <MessageCircle size={18} />
                    </a>
                  )}
                </div>
              </div>

              {/* Community Link */}
              <div>
                <label className="block text-sm font-medium text-green-400 mb-2">Community Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={communityLink}
                    onChange={(e) => setCommunityLink(e.target.value)}
                    placeholder="https://community.example.com/..."
                    className="flex-1 px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                  />
                  {communityLink && (
                    <a
                      href={communityLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                      title="Open Community"
                    >
                      <Globe size={18} />
                    </a>
                  )}
                </div>
              </div>

              {/* Discord Link */}
              <div>
                <label className="block text-sm font-medium text-green-400 mb-2">Discord Link (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discordLink}
                    onChange={(e) => setDiscordLink(e.target.value)}
                    placeholder="https://discord.gg/..."
                    className="flex-1 px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                  />
                  {discordLink && (
                    <a
                      href={discordLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg transition-colors"
                      title="Open Discord"
                    >
                      <Globe size={18} />
                    </a>
                  )}
                </div>
              </div>

              {/* Telegram Link */}
              <div>
                <label className="block text-sm font-medium text-green-400 mb-2">Telegram Link (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={telegramLink}
                    onChange={(e) => setTelegramLink(e.target.value)}
                    placeholder="https://t.me/..."
                    className="flex-1 px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                  />
                  {telegramLink && (
                    <a
                      href={telegramLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-3 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg transition-colors"
                      title="Open Telegram"
                    >
                      <Globe size={18} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Access Control Section */}
          <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <AlertCircle size={20} className="text-yellow-400" />
              Access Control
            </h2>
            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-green-400 mb-2">Enrollment Status</label>
                <select
                  value={enrollmentStatus}
                  onChange={(e) => setEnrollmentStatus(e.target.value as any)}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block text-sm font-medium text-green-400 mb-2">Expiration Date</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>

              {/* Gift Hours */}
              <div>
                <label className="block text-sm font-medium text-green-400 mb-2">Gift Hours Remaining</label>
                <input
                  type="number"
                  value={giftHours}
                  onChange={(e) => setGiftHours(parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors"
          >
            {saving ? (
              <>
                <Loader size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save All Changes
              </>
            )}
          </button>
        </div>

        {/* Right Column - Stats */}
        <div className="space-y-6">
          {/* Watch Stats */}
          <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Clock size={20} className="text-blue-400" />
              Watch Stats
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Total Watch Time</p>
                <p className="text-2xl font-bold text-white">
                  {Math.floor(enrollment.totalWatchTime / 3600)}h {Math.floor((enrollment.totalWatchTime % 3600) / 60)}m
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Purchase Type</p>
                <p className="text-white capitalize font-medium">{enrollment.purchaseType}</p>
              </div>
              {enrollment.purchaseType === 'gift' && (
                <div>
                  <p className="text-sm text-gray-400">Gift Hours Remaining</p>
                  <p className="text-white font-medium">{giftHours} hours</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-bold text-white mb-6">Recent Activity</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {watchLogs.length === 0 ? (
                <p className="text-gray-400 text-sm">No recent activity</p>
              ) : (
                watchLogs.map((log) => (
                  <div key={log._id} className="text-sm border-l-2 border-gray-700 pl-3 py-1">
                    <p className="text-gray-400">
                      {new Date(log.watchStarted).toLocaleDateString()} {new Date(log.watchStarted).toLocaleTimeString()}
                    </p>
                    <p className="text-gray-300">{Math.floor(log.watchDuration / 60)}m watched</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Devices */}
          <div className="bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Smartphone size={20} className="text-purple-400" />
              Devices ({devices.length}/3)
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {devices.length === 0 ? (
                <p className="text-gray-400 text-sm">No devices registered</p>
              ) : (
                devices.map((device: any) => (
                  <div key={device._id} className="bg-black/50 rounded-lg p-3 text-sm">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="flex-1">
                        <p className="text-white font-medium">{device.deviceName || 'Unknown Device'}</p>
                        <p className="text-gray-500 text-xs mt-1">{device.fingerprint.slice(0, 12)}...</p>
                        {device.lastUsedAt && (
                          <p className="text-gray-600 text-xs mt-1">
                            Last used: {new Date(device.lastUsedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          device.isBlocked
                            ? 'bg-red-500/20 text-red-400'
                            : device.isActive
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-700/50 text-gray-400'
                        }`}>
                          {device.isBlocked ? 'Blocked' : device.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => toggleDeviceBlock(device._id, device.isBlocked)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            device.isBlocked
                              ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                              : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                          }`}
                          title={device.isBlocked ? 'Unblock' : 'Block'}
                        >
                          {device.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                        <button
                          onClick={() => deleteDevice(device._id)}
                          className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                          title="Delete device"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {devices.length >= 3 && (
              <p className="text-yellow-600 text-xs mt-3">⚠️ Device limit reached (3 max)</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
