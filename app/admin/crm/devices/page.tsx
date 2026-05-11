'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

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

  const fetchDevices = useCallback(async (userId?: string) => {
    if (!token) return;
    const url = userId 
      ? `/api/admin/devices?userId=${userId}` 
      : '/api/admin/devices';
    
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDevices(data.data?.devices || []);
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  }, []);

  const fetchViolations = useCallback(async (unreviewed = false) => {
    const url = `/api/admin/devices/violations?unreviewed=${unreviewed}`;
    
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setViolations(data.data?.violations || []);
    } catch (error) {
      console.error('Failed to fetch violations:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    
    try {
      const res = await fetch('/api/admin/devices?action=stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStats(data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDevices(), fetchViolations(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchDevices, fetchViolations, fetchStats]);

  const handleBlockDevice = async (device: Device) => {
    if (!blockReason.trim()) {
      alert('Please enter a reason for blocking');
      return;
    }
    
    try {
      await fetch('/api/admin/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
    } catch (error) {
      console.error('Failed to block device:', error);
    }
  };

  const handleUnblockDevice = async (device: Device) => {
    try {
      await fetch('/api/admin/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'unblock',
          deviceId: device.deviceId,
        }),
      });
      fetchDevices();
    } catch (error) {
      console.error('Failed to unblock device:', error);
    }
  };

  const handleRemoveAllDevices = async (userId: string) => {
    if (!confirm(`Remove ALL devices for user ${userId}?`)) return;
    
    try {
      await fetch('/api/admin/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
      await fetch('/api/admin/devices/violations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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

  const getViolationColor = (type: string) => {
    switch (type) {
      case 'location_mismatch': return 'bg-yellow-100 text-yellow-800';
      case 'device_limit_exceeded': return 'bg-orange-100 text-orange-800';
      case 'concurrent_stream': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">📱 Device Management</h1>
              <p className="text-sm text-gray-500">Control user devices and monitor violations</p>
            </div>
            <Link
              href="/admin/crm/devices/settings"
              className="rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
            >
              ⚙️ Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-5">
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-2xl font-bold text-indigo-600">{stats.totalDevices}</p>
              <p className="text-sm text-gray-500">Total Devices</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-2xl font-bold text-green-600">{stats.activeStreams}</p>
              <p className="text-sm text-gray-500">Active Streams</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-2xl font-bold text-red-600">{stats.blockedDevices}</p>
              <p className="text-sm text-gray-500">Blocked Devices</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-2xl font-bold text-yellow-600">{stats.totalViolations}</p>
              <p className="text-sm text-gray-500">Total Violations</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <p className="text-2xl font-bold text-orange-600">{stats.unreviewedViolations}</p>
              <p className="text-sm text-gray-500">Unreviewed</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex gap-4 border-b">
          {['devices', 'violations', 'stats'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`px-4 py-2 capitalize ${
                activeTab === tab
                  ? 'border-b-2 border-indigo-500 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'devices' && '💻 '}
              {tab === 'violations' && '⚠️ '}
              {tab === 'stats' && '📊 '}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : (
          <>
            {/* Devices Tab */}
            {activeTab === 'devices' && (
              <div>
                {/* Search */}
                <div className="mb-4 flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by User ID..."
                    value={searchUserId}
                    onChange={(e) => setSearchUserId(e.target.value)}
                    className="flex-1 rounded-lg border px-4 py-2"
                  />
                  <button
                    onClick={() => fetchDevices(searchUserId || undefined)}
                    className="rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
                  >
                    Search
                  </button>
                  <button
                    onClick={() => {
                      setSearchUserId('');
                      fetchDevices();
                    }}
                    className="rounded-lg border px-4 py-2 hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>

                {/* Devices List */}
                <div className="overflow-x-auto rounded-lg bg-white shadow">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Device</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User ID</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Location</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Last Active</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {devices.map((device) => (
                        <tr key={device._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium">{device.deviceName}</div>
                            <div className="text-xs text-gray-500">{device.deviceType}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">{device.userId.slice(0, 12)}...</div>
                            <button
                              onClick={() => handleRemoveAllDevices(device.userId)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Remove all
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm">
                              📍 {device.location?.city}, {device.location?.state}
                            </div>
                            <div className="text-xs text-gray-500">{device.ipAddress}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {formatDate(device.lastActive)}
                          </td>
                          <td className="px-4 py-3">
                            {device.isBlocked ? (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                                Blocked
                              </span>
                            ) : device.isCurrentlyStreaming ? (
                              <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                                Streaming
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {device.isBlocked ? (
                              <button
                                onClick={() => handleUnblockDevice(device)}
                                className="text-sm text-green-600 hover:underline"
                              >
                                Unblock
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedDevice(device)}
                                className="text-sm text-red-600 hover:underline"
                              >
                                Block
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {devices.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No devices found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Violations Tab */}
            {activeTab === 'violations' && (
              <div>
                {/* Filter */}
                <div className="mb-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showUnreviewedOnly}
                      onChange={(e) => {
                        setShowUnreviewedOnly(e.target.checked);
                        fetchViolations(e.target.checked);
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">Show unreviewed only</span>
                  </label>
                </div>

                {/* Violations List */}
                <div className="space-y-4">
                  {violations.map((violation) => (
                    <div
                      key={violation._id}
                      className={`rounded-lg bg-white p-4 shadow ${
                        violation.isReviewed ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-sm ${getViolationColor(
                              violation.violationType
                            )}`}
                          >
                            {violation.violationType.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(violation.createdAt)}
                          </span>
                          {violation.isAcknowledged && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                              User acknowledged
                            </span>
                          )}
                        </div>
                        {!violation.isReviewed && (
                          <button
                            onClick={() => handleMarkReviewed(violation._id)}
                            className="rounded bg-green-500 px-3 py-1 text-sm text-white hover:bg-green-600"
                          >
                            ✓ Mark Reviewed
                          </button>
                        )}
                      </div>
                      
                      <div className="mt-3 text-sm text-gray-600">
                        <strong>User:</strong> {violation.userId.slice(0, 16)}...
                      </div>
                      
                      <div className="mt-2 grid gap-2 md:grid-cols-2">
                        <div className="rounded bg-gray-50 p-2">
                          <div className="text-xs text-gray-500">Device 1</div>
                          <div className="font-medium">{violation.device1?.deviceName}</div>
                          <div className="text-sm text-gray-600">📍 {violation.device1?.location}</div>
                        </div>
                        <div className="rounded bg-red-50 p-2">
                          <div className="text-xs text-red-500">Device 2 (suspicious)</div>
                          <div className="font-medium">{violation.device2?.deviceName}</div>
                          <div className="text-sm text-red-600">📍 {violation.device2?.location}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {violations.length === 0 && (
                    <div className="rounded-lg bg-white p-8 text-center text-gray-500 shadow">
                      No violations found
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && stats && (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Users with most devices */}
                <div className="rounded-lg bg-white p-6 shadow">
                  <h3 className="mb-4 font-medium">👥 Users with Most Devices</h3>
                  <div className="space-y-2">
                    {stats.usersWithMostDevices.map((user, i) => (
                      <div key={user._id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {i + 1}. {user._id.slice(0, 16)}...
                        </span>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-sm text-indigo-700">
                          {user.deviceCount} devices
                        </span>
                      </div>
                    ))}
                    {stats.usersWithMostDevices.length === 0 && (
                      <p className="text-sm text-gray-500">No data</p>
                    )}
                  </div>
                </div>

                {/* Violations by type */}
                <div className="rounded-lg bg-white p-6 shadow">
                  <h3 className="mb-4 font-medium">⚠️ Violations by Type</h3>
                  <div className="space-y-2">
                    {stats.violationsByType.map((v) => (
                      <div key={v._id} className="flex items-center justify-between">
                        <span className={`rounded-full px-2 py-0.5 text-sm ${getViolationColor(v._id)}`}>
                          {v._id.replace('_', ' ')}
                        </span>
                        <span className="font-medium">{v.count}</span>
                      </div>
                    ))}
                    {stats.violationsByType.length === 0 && (
                      <p className="text-sm text-gray-500">No violations</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Block Device Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-medium">🚫 Block Device</h3>
            <p className="mb-2 text-sm text-gray-600">
              Device: <strong>{selectedDevice.deviceName}</strong>
            </p>
            <p className="mb-4 text-sm text-gray-600">
              User: {selectedDevice.userId.slice(0, 20)}...
            </p>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Reason for blocking..."
              className="mb-4 w-full rounded-lg border p-2"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleBlockDevice(selectedDevice)}
                className="flex-1 rounded-lg bg-red-500 py-2 text-white hover:bg-red-600"
              >
                Block Device
              </button>
              <button
                onClick={() => {
                  setSelectedDevice(null);
                  setBlockReason('');
                }}
                className="flex-1 rounded-lg border py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
