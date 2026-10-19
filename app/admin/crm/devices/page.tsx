'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  Smartphone,
  Laptop,
  Tablet,
  Shield,
  ShieldAlert,
  Activity,
  User,
  MapPin,
  Clock,
  Search,
  RefreshCw,
  ArrowLeft,
  Settings,
  Ban,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Globe,
  Radio,
  X,
  Trash2,
} from 'lucide-react';

interface Device {
  _id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  lastActive: string;
  isCurrentlyStreaming: boolean;
  isBlocked: boolean;
  blockedReason?: string;
  registeredAt: string;
}

interface Violation {
  _id: string;
  userId: string;
  violationType: string;
  severity: string;
  device1: {
    deviceName: string;
    location: string;
    timestamp: string;
  };
  device2: {
    deviceName: string;
    location: string;
    timestamp: string;
  };
  message: string;
  isAcknowledged: boolean;
  isReviewed: boolean;
  createdAt: string;
}

interface Stats {
  totalDevices: number;
  blockedDevices: number;
  activeStreams: number;
  totalViolations: number;
  unreviewedViolations: number;
  usersWithMostDevices: { _id: string; deviceCount: number }[];
  violationsByType: { _id: string; count: number }[];
}

export default function AdminDevicesPage() {
  const token = useAuth();
  const [activeTab, setActiveTab] = useState<'devices' | 'violations' | 'stats'>('devices');
  const [devices, setDevices] = useState<Device[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchUserId, setSearchUserId] = useState('');
  const [showUnreviewedOnly, setShowUnreviewedOnly] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const getActiveToken = () => {
    if (token) return token;
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('crm_token') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('admin_token') ||
        ''
      );
    }
    return '';
  };

  const fetchDevices = useCallback(async (userId?: string) => {
    const activeToken = getActiveToken();
    if (!activeToken) return;
    const url = userId ? `/api/admin/devices?userId=${userId}` : '/api/admin/devices';

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      setDevices(data.data?.devices || []);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  }, [token]);

  const fetchViolations = useCallback(async (unreviewed = false) => {
    const activeToken = getActiveToken();
    if (!activeToken) return;
    const url = `/api/admin/devices/violations?unreviewed=${unreviewed}`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      setViolations(data.data?.violations || []);
    } catch (error) {
      console.error('Failed to fetch violations:', error);
    }
  }, [token]);

  const fetchStats = useCallback(async () => {
    const activeToken = getActiveToken();
    if (!activeToken) return;
    try {
      const res = await fetch('/api/admin/devices?action=stats', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      const data = await res.json();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    const userIdFromQuery =
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('userId') || ''
        : '';
    setSearchUserId(userIdFromQuery);
    await Promise.all([fetchDevices(userIdFromQuery || undefined), fetchViolations(), fetchStats()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [fetchDevices, fetchViolations, fetchStats]);

  const handleBlockDevice = async (device: Device) => {
    if (!blockReason.trim()) {
      alert('Please enter a reason for blocking');
      return;
    }

    try {
      const activeToken = getActiveToken();
      await fetch('/api/admin/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          action: 'block',
          deviceId: device.deviceId,
          reason: blockReason,
        }),
      });
      setBlockReason('');
      setSelectedDevice(null);
      fetchDevices();
      fetchStats();
    } catch (error) {
      console.error('Failed to block device:', error);
    }
  };

  const handleUnblockDevice = async (device: Device) => {
    try {
      const activeToken = getActiveToken();
      await fetch('/api/admin/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          action: 'unblock',
          deviceId: device.deviceId,
        }),
      });
      fetchDevices();
      fetchStats();
    } catch (error) {
      console.error('Failed to unblock device:', error);
    }
  };

  const handleRemoveAllDevices = async (userId: string) => {
    if (!confirm(`Remove ALL devices for user ${userId}?`)) return;

    try {
      const activeToken = getActiveToken();
      await fetch('/api/admin/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          action: 'removeAll',
          userId,
        }),
      });
      fetchDevices();
      fetchStats();
    } catch (error) {
      console.error('Failed to remove devices:', error);
    }
  };

  const handleMarkReviewed = async (violationId: string) => {
    try {
      const activeToken = getActiveToken();
      await fetch('/api/admin/devices/violations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ violationId }),
      });
      fetchViolations(showUnreviewedOnly);
      fetchStats();
    } catch (error) {
      console.error('Failed to mark reviewed:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const getDeviceIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('mobile') || t.includes('phone')) return Smartphone;
    if (t.includes('tablet') || t.includes('ipad')) return Tablet;
    return Laptop;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Colorful Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-600 to-violet-600" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/admin/crm/web-admin"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Web Admin
              </Link>
              <span className="text-slate-300">/</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <Smartphone className="w-3 h-3 text-blue-600" />
                Hardware & Security
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Smartphone className="w-7 h-7 text-indigo-600" />
              Connected Devices & Session Control
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Monitor active logins, enforce concurrency limits, and prevent multi-location stream abuse.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/crm/devices/settings"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all shadow-xs"
            >
              <Settings className="w-4 h-4 text-slate-500" /> Device Limits
            </Link>

            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-xs disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* 5 Metric Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                <Laptop className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Devices</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{stats?.totalDevices ?? devices.length}</p>
              <p className="text-xs text-indigo-600 font-medium mt-1">Registered hardware</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                <Radio className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Streams</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{stats?.activeStreams ?? 0}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Live participants</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
                <Ban className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Blocked Devices</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{stats?.blockedDevices ?? 0}</p>
              <p className="text-xs text-rose-600 font-medium mt-1">Revoked sessions</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Violations</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{stats?.totalViolations ?? violations.length}</p>
              <p className="text-xs text-amber-600 font-medium mt-1">Concurrency / Location</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-3">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Unreviewed</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{stats?.unreviewedViolations ?? 0}</p>
              <p className="text-xs text-purple-600 font-medium mt-1">Pending review</p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
          {[
            { id: 'devices', label: 'Authorized Devices', icon: Laptop, count: devices.length },
            { id: 'violations', label: 'Security Violations', icon: ShieldAlert, count: violations.length },
            { id: 'stats', label: 'Device Analytics', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                      active ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Devices */}
        {activeTab === 'devices' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
              <div className="flex-1 flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by User ID..."
                    value={searchUserId}
                    onChange={(e) => setSearchUserId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchDevices(searchUserId || undefined)}
                    className="w-full pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={() => fetchDevices(searchUserId || undefined)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors shadow-xs"
                >
                  Search
                </button>
                {searchUserId && (
                  <button
                    onClick={() => {
                      setSearchUserId('');
                      fetchDevices();
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Device & Hardware</th>
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">IP & Location</th>
                    <th className="px-5 py-3.5">Last Active</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                        Loading connected devices…
                      </td>
                    </tr>
                  ) : devices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                        No active or registered devices found.
                      </td>
                    </tr>
                  ) : (
                    devices.map((device) => {
                      const DeviceIcon = getDeviceIcon(device.deviceType);

                      return (
                        <tr key={device._id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Device & Hardware */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <DeviceIcon className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 leading-snug">
                                  {device.deviceName || 'Unknown Device'}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {device.browser} • {device.os}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* User ID */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded">
                              {device.userId}
                            </span>
                          </td>

                          {/* IP & Location */}
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                            <div className="flex items-center gap-1.5 font-mono text-slate-500">
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              {device.ipAddress || '—'}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              {[device.location?.city, device.location?.country].filter(Boolean).join(', ') || 'Unknown'}
                            </div>
                          </td>

                          {/* Last Active */}
                          <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {device.lastActive ? formatDate(device.lastActive) : '—'}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {device.isBlocked ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <Ban className="w-3 h-3 text-rose-600" /> Blocked
                              </span>
                            ) : device.isCurrentlyStreaming ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                Streaming
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Authorized
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {device.isBlocked ? (
                                <button
                                  onClick={() => handleUnblockDevice(device)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                                >
                                  Unblock
                                </button>
                              ) : (
                                <button
                                  onClick={() => setSelectedDevice(device)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
                                >
                                  <Ban className="w-3.5 h-3.5" /> Block
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveAllDevices(device.userId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                                title="Revoke all devices for this user"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Violations */}
        {activeTab === 'violations' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Security & Concurrency Violations</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Flags multiple simultaneous logins or geographically impossible location hops.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUnreviewedOnly}
                  onChange={(e) => {
                    setShowUnreviewedOnly(e.target.checked);
                    fetchViolations(e.target.checked);
                  }}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                Unreviewed Only
              </label>
            </div>

            <div className="divide-y divide-slate-100">
              {violations.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  No violations recorded. All sessions are compliant!
                </div>
              ) : (
                violations.map((violation) => (
                  <div key={violation._id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {violation.violationType.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          User: {violation.userId}
                        </span>
                        <span className="text-xs text-slate-400">• {formatDate(violation.createdAt)}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{violation.message}</p>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-4 pt-1">
                        {violation.device1 && (
                          <span>
                            Device 1: <strong>{violation.device1.deviceName}</strong> ({violation.device1.location})
                          </span>
                        )}
                        {violation.device2 && (
                          <span>
                            Device 2: <strong>{violation.device2.deviceName}</strong> ({violation.device2.location})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!violation.isReviewed ? (
                        <button
                          onClick={() => handleMarkReviewed(violation._id)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition-colors"
                        >
                          Mark Reviewed
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Analytics */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Laptop className="w-5 h-5 text-indigo-600" /> Users With Most Devices
              </h3>
              <div className="space-y-3">
                {stats.usersWithMostDevices.map((user, i) => (
                  <div key={user._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <span className="text-sm font-mono text-slate-700">
                      {i + 1}. {user._id}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                      {user.deviceCount} devices
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" /> Violations By Category
              </h3>
              <div className="space-y-3">
                {stats.violationsByType.map((v) => (
                  <div key={v._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <span className="text-sm font-semibold capitalize text-slate-800">
                      {v._id.replace('_', ' ')}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      {v.count} incidents
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Block Modal */}
        {selectedDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 text-rose-600">
                  <Ban className="w-5 h-5" /> Block Device
                </h3>
                <button onClick={() => setSelectedDevice(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-slate-600 mb-1">
                Device: <strong>{selectedDevice.deviceName}</strong>
              </p>
              <p className="text-xs text-slate-400 font-mono mb-4">
                User: {selectedDevice.userId}
              </p>

              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Specify reason for revocation (e.g. suspicious activity, credential sharing)..."
                className="w-full p-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4"
                rows={3}
              />

              <div className="flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBlockDevice(selectedDevice)}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-xs"
                >
                  Confirm Block
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
