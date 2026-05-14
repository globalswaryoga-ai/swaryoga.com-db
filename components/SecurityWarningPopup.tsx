'use client';

import { useState } from 'react';

interface ViolationData {
  violationId?: string;
  violationType: string;
  message: string;
  device1?: {
    deviceName: string;
    location: string;
    timestamp: Date | string;
  };
  device2?: {
    deviceName: string;
    location: string;
    timestamp: Date | string;
  };
}

interface SecurityWarningPopupProps {
  violation: ViolationData;
  onAcknowledge: () => void;
  onChangePassword: () => void;
  onClose: () => void;
}

export default function SecurityWarningPopup({
  violation,
  onAcknowledge,
  onChangePassword,
  onClose,
}: SecurityWarningPopupProps) {
  const [loading, setLoading] = useState(false);

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      if (violation.violationId) {
        const token = localStorage.getItem('token');
        await fetch('/api/devices/acknowledge', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ violationId: violation.violationId }),
        });
      }
      onAcknowledge();
    } catch (error) {
      console.error('Failed to acknowledge:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 rounded-t-2xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <span className="text-2xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Security Alert!</h2>
            <p className="text-sm text-white/80">Suspicious activity detected</p>
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="mb-4 text-gray-700">{violation.message}</p>

          {/* Device Details */}
          {violation.device1 && violation.device2 && (
            <div className="mb-4 space-y-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-lg">💻</span>
                  <span className="font-medium text-gray-800">Device 1</span>
                </div>
                <p className="text-sm text-gray-600">
                  {violation.device1.deviceName}
                </p>
                <p className="text-sm text-gray-500">
                  📍 {violation.device1.location}
                </p>
                <p className="text-xs text-gray-400">
                  {formatTime(violation.device1.timestamp)}
                </p>
              </div>

              <div className="rounded-lg bg-red-50 p-3 ring-1 ring-red-200">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  <span className="font-medium text-red-800">Device 2 (just now)</span>
                </div>
                <p className="text-sm text-red-700">
                  {violation.device2.deviceName}
                </p>
                <p className="text-sm text-red-600">
                  📍 {violation.device2.location}
                </p>
                <p className="text-xs text-red-400">
                  {formatTime(violation.device2.timestamp)}
                </p>
              </div>
            </div>
          )}

          {/* Warning Text */}
          <div className="mb-6 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
            <strong>⚠️ Warning:</strong> If this wasn&apos;t you, your account may be
            compromised. Continued violations may result in account suspension.
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onChangePassword}
              className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 font-medium text-white transition hover:bg-red-600"
            >
              🔒 Change Password
            </button>
            <button
              onClick={handleAcknowledge}
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? '...' : "✓ It's Me, Ignore"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
