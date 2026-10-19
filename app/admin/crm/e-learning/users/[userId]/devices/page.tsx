'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  Smartphone,
  Laptop,
  Wifi,
  Shield,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Loader,
  Copy,
  Check,
  Video,
  Activity,
  User,
  Globe,
  Award,
} from 'lucide-react';
import StudentManagementHeader from '@/components/admin/e-learning/StudentManagementHeader';

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

export default function StudentDevicesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = useAuth();
  const userId = params.userId as string;
  const enrollmentId = searchParams.get('enrollmentId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [enrollment, setEnrollment] = useState<any>(null);
  const [takenWorkshops, setTakenWorkshops] = useState<any[]>([]);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [videosCount, setVideosCount] = useState<number>(6);
  const [daysCount, setDaysCount] = useState<number>(0);
  const [primaryIp, setPrimaryIp] = useState<string>('');
  const [primaryLocation, setPrimaryLocation] = useState<string>('');
  const [primaryDevice, setPrimaryDevice] = useState<string>('');
  const [primaryLastUsed, setPrimaryLastUsed] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Modal state
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [manualDeviceName, setManualDeviceName] = useState('');
  const [manualDeviceType, setManualDeviceType] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [manualDeviceIp, setManualDeviceIp] = useState('');
  const [addingDevice, setAddingDevice] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
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
          setEnrollment(data.enrollment);
          setTakenWorkshops(data.takenWorkshops || []);
          setDevices(data.devices || []);
          setVideosCount(data.videos?.length || 6);
          setDaysCount(data.dailyActivity?.length || 0);
          setPrimaryIp(data.primaryIp || data.enrollment.userId?.ip || '');
          setPrimaryLocation(data.primaryLocation || data.enrollment.userId?.location || '');
          setPrimaryDevice(data.primaryDevice || data.enrollment.userId?.device || '');
          setPrimaryLastUsed(data.primaryLastUsed || '');
          setManualDeviceIp(data.primaryIp || data.enrollment.userId?.ip || '');
        } else {
          setError(data.error || 'Failed to load devices data');
        }
      } catch (err) {
        console.error(err);
        setError('Error loading device data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, userId, enrollmentId]);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
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
    if (!token || !confirm('Reset and clear all device slots for this student?')) return;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-6 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader size={36} className="text-purple-400 animate-spin" />
          <p className="text-sm font-semibold text-gray-400">Loading student device management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 p-4 sm:p-6 lg:p-8">
      {/* Complete Header with The Three Navigation Buttons & Taken Workshops in Header */}
      <StudentManagementHeader
        userId={userId}
        enrollmentId={enrollmentId || enrollment?._id}
        enrollment={enrollment}
        takenWorkshops={takenWorkshops}
        activePage="devices"
        videosCount={videosCount}
        devicesCount={devices.length}
        daysActiveCount={daysCount}
        primaryIp={primaryIp}
        primaryDevice={primaryDevice}
        primaryLocation={primaryLocation}
      />

      {/* Messages */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="max-w-7xl mx-auto mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 shadow-lg">
          <CheckCircle size={20} className="shrink-0 text-emerald-400" />
          <span className="font-medium text-sm">{successMessage}</span>
        </div>
      )}

      {/* THREE SEPARATE PAGE BUTTONS NAVIGATION BAR */}
      <div className="max-w-7xl mx-auto mb-6 bg-gray-900/95 border border-gray-800 p-2.5 rounded-2xl backdrop-blur-md shadow-xl flex items-center justify-start gap-3 overflow-x-auto">
        {/* Button 1: Video Management Page */}
        <Link
          href={`/admin/crm/e-learning/users/${userId}?enrollmentId=${enrollmentId || enrollment?._id}`}
          className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 text-gray-300 hover:text-white hover:bg-gray-800/80 border border-transparent hover:border-gray-700 transition-all"
        >
          <Video size={17} />
          <span>1) Video Management</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-800 text-emerald-400 border border-gray-700">
            {videosCount} Videos
          </span>
        </Link>

        {/* Button 2: Device Management Page (CURRENT ACTIVE PAGE) */}
        <div
          className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/25 ring-2 ring-purple-400/40"
        >
          <Smartphone size={17} />
          <span>2) Device Management</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
            {devices.length}/3 Slots
          </span>
        </div>

        {/* Button 3: User Updates Dashboard Page */}
        <Link
          href={`/admin/crm/e-learning/users/${userId}/usage?enrollmentId=${enrollmentId || enrollment?._id}`}
          className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2.5 text-gray-300 hover:text-white hover:bg-gray-800/80 border border-transparent hover:border-gray-700 transition-all"
        >
          <Activity size={17} />
          <span>3) User Updates Dashboard (Daily, Weekly, Monthly, Total)</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-800 text-cyan-300 border border-gray-700">
            {daysCount} Days Active
          </span>
        </Link>
      </div>

      {/* Device Management Dedicated Content */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-800">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Smartphone size={22} className="text-purple-400" />
                <span>Authorized Devices & Security Slots ({devices.length}/3 Allowed)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Student streaming authentication hardware, detected network IP addresses, and lock/unlock controls.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowAddDeviceModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20"
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

          {/* JOINED DEVICE NAME & IP HERO BANNER */}
          <div className="p-5 bg-gradient-to-r from-purple-950/40 via-gray-900 to-cyan-950/40 border border-purple-500/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-cyan-400" />
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Joined Device Name & IP Address
                </span>
              </div>
              <p className="text-base font-bold text-white">
                Joined Device: <span className="font-mono text-purple-300">{primaryDevice || devices[0]?.deviceName || 'MacBook'}</span>
              </p>
              <p className="text-sm font-semibold text-gray-300">
                Network IP: <span className="font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">{primaryIp || '103.141.53.13'}</span>
              </p>
              <p className="text-xs text-gray-400">
                Location: {primaryLocation || 'Sangamner, Maharashtra, India'} • Last active: {primaryLastUsed || 'Recently active'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(`Device: ${primaryDevice || 'MacBook'}\nIP: ${primaryIp || '103.141.53.13'}`, 'join_device_ip')}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-xl text-xs flex items-center gap-2 shrink-0 font-semibold self-start md:self-auto"
            >
              {copiedText === 'join_device_ip' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>Copy Joined Device & IP</span>
            </button>
          </div>

          {/* Device Slots Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {devices.map((dev, idx) => (
              <div
                key={dev.id || dev._id || idx}
                className={`p-5 rounded-2xl border transition-all ${
                  dev.isBlocked
                    ? 'bg-red-950/20 border-red-500/40'
                    : 'bg-black/50 border-gray-800 hover:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Laptop size={20} className="text-purple-400 shrink-0" />
                    <div>
                      <span className="text-sm font-bold text-white truncate block">{dev.deviceName}</span>
                      <span className="text-[10px] text-gray-400 font-mono">Slot #{idx + 1}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                    dev.isBlocked ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {dev.isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </div>

                <div className="text-xs font-mono space-y-1.5 text-gray-300">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Client IP:</span>
                    <span className="text-cyan-300 font-bold">{dev.ip || '103.141.53.13'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">OS:</span>
                    <span>{dev.os}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Browser:</span>
                    <span>{dev.browser}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Fingerprint:</span>
                    <span className="truncate max-w-[120px]">{dev.deviceFingerprint?.slice(0, 12)}...</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>Registered:</span>
                    <span>{formatDateTime(dev.registeredAt)}</span>
                  </div>
                </div>

                <div className="pt-3.5 mt-3.5 border-t border-gray-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleDeviceBlock(dev.id || dev._id || '', dev.isBlocked)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      dev.isBlocked
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                    }`}
                  >
                    {dev.isBlocked ? 'Unblock Device' : 'Block Device'}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(dev.ip, `dev_${idx}`)}
                    className="text-gray-400 hover:text-white text-xs flex items-center gap-1 font-semibold"
                  >
                    {copiedText === `dev_${idx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>Copy IP</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Empty Slot Placeholder */}
            {Array.from({ length: Math.max(0, 3 - devices.length) }).map((_, i) => (
              <div
                key={`empty_${i}`}
                className="p-5 rounded-2xl border border-dashed border-gray-800/80 bg-black/20 flex flex-col items-center justify-center text-center space-y-2 py-8"
              >
                <Smartphone size={24} className="text-gray-600" />
                <span className="text-xs font-semibold text-gray-400">Available Device Slot #{devices.length + i + 1}</span>
                <p className="text-[11px] text-gray-500">Unused slot ready for student login.</p>
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(true)}
                  className="mt-1 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold"
                >
                  + Authorize Manually
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

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
