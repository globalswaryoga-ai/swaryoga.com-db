'use client';

import { useState, useEffect } from 'react';
import { useDeviceControl } from '@/hooks/useDeviceControl';

interface Device {
  _id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  lastActive: string;
  isCurrentlyStreaming: boolean;
  isBlocked: boolean;
  registeredAt: string;
}

export default function MyDevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  
  const { deviceInfo, getDevices, removeDevice } = useDeviceControl();

  const fetchDevices = async () => {
    setLoading(true);
    const deviceList = await getDevices();
    setDevices(deviceList);
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, [getDevices]);

  const handleRemoveDevice = async (deviceId: string) => {
    if (deviceId === deviceInfo?.deviceId) {
      alert("You can't remove the current device");
      return;
    }
    
    if (!confirm('Remove this device? It will need to be re-registered on next login.')) {
      return;
    }
    
    setRemoving(deviceId);
    const success = await removeDevice(deviceId);
    if (success) {
      await fetchDevices();
    }
    setRemoving(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const isCurrentDevice = (device: Device) => {
    return device.deviceId === deviceInfo?.deviceId;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">📱 My Devices</h1>
          <p className="text-gray-500">
            Manage devices registered to your account. You can have up to 3 devices.
          </p>
        </div>

        {/* Info Banner */}
        <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
          <strong>ℹ️ Device Limit:</strong> You can register up to 3 devices. If you need to add
          a new device, remove an old one first.
        </div>

        {/* Devices List */}
        {loading ? (
          <div className="flex h-40 items-center justify-center rounded-lg bg-white shadow">
            <span className="text-gray-500">Loading devices...</span>
          </div>
        ) : devices.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <span className="text-6xl">📱</span>
            <p className="mt-4 text-gray-600">No devices registered yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div
                key={device._id}
                className={`rounded-lg bg-white p-4 shadow ${
                  isCurrentDevice(device) ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Device Icon */}
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                      {device.deviceType === 'mobile' && '📱'}
                      {device.deviceType === 'tablet' && '📲'}
                      {device.deviceType === 'desktop' && '💻'}
                    </div>
                    
                    {/* Device Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{device.deviceName}</h3>
                        {isCurrentDevice(device) && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                            This device
                          </span>
                        )}
                        {device.isCurrentlyStreaming && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                            🎬 Streaming
                          </span>
                        )}
                        {device.isBlocked && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                            🚫 Blocked
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 text-sm text-gray-500">
                        {device.browser} • {device.os}
                      </div>
                      
                      {device.location && (
                        <div className="mt-1 text-sm text-gray-500">
                          📍 {device.location.city}, {device.location.state}
                        </div>
                      )}
                      
                      <div className="mt-1 text-xs text-gray-400">
                        Last active: {formatDate(device.lastActive)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  {!isCurrentDevice(device) && !device.isBlocked && (
                    <button
                      onClick={() => handleRemoveDevice(device.deviceId)}
                      disabled={removing === device.deviceId}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {removing === device.deviceId ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security Notice */}
        <div className="mt-8 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
          <strong>⚠️ Security Notice:</strong>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Remove devices you no longer use or don&apos;t recognize</li>
            <li>If you see suspicious devices, change your password immediately</li>
            <li>Each device can only stream one video at a time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
