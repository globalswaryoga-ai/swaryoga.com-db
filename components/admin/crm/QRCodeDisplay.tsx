/**
 * Enhanced QR Code Component with Auto-Refresh & Health Monitoring
 */

'use client';

import React, { useState, useEffect } from 'react';

interface QRStatus {
  bridgeStatus: 'online' | 'offline';
  bridgeUrl: string;
  qrEndpoint: string;
  lastCheck: string;
  instructions: string;
}

export default function QRCodeDisplay() {
  const [qrData, setQrData] = useState<string | null>(null);
  const [status, setStatus] = useState<QRStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [healthChecks, setHealthChecks] = useState({ success: 0, failed: 0 });

  // Check bridge health
  const checkBridgeHealth = async () => {
    try {
      const response = await fetch('/api/admin/crm/whatsapp/bridge-health?action=status');
      const data = await response.json();
      setStatus(data);
      return data.bridgeStatus === 'online';
    } catch (err) {
      console.error('Health check error:', err);
      return false;
    }
  };

  // Fetch QR code
  const fetchQRCode = async () => {
    try {
      setLoading(true);
      setError(null);

      // First check health
      const isHealthy = await checkBridgeHealth();

      if (!isHealthy) {
        setError('Bridge is offline. Attempting to fetch cached QR...');
        setHealthChecks((prev) => ({ ...prev, failed: prev.failed + 1 }));
        return;
      }

      // Try to get QR from bridge
      const response = await fetch('/api/admin/crm/whatsapp/qr-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get',
          path: '/qr',
        }),
      });

      if (!response.ok) {
        throw new Error(`QR fetch failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.data && typeof data.data === 'string') {
        setQrData(data.data);
        setLastRefresh(new Date().toLocaleTimeString());
        setError(null);
        setHealthChecks((prev) => ({ ...prev, success: prev.success + 1 }));
      } else {
        throw new Error('Invalid QR data received');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch QR code';
      setError(message);
      setHealthChecks((prev) => ({ ...prev, failed: prev.failed + 1 }));
      console.error('QR Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchQRCode();
  }, []);

  // Auto-refresh QR code every 2 minutes if enabled
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchQRCode();
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [autoRefreshEnabled]);

  // Health check every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkBridgeHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp QR Code</h2>
        <p className="text-sm text-gray-600">
          Scan this code to connect WhatsApp to Swar Yoga CRM
        </p>
      </div>

      {/* Status Indicator */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Bridge Status</span>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
              status?.bridgeStatus === 'online'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {status?.bridgeStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-gray-500">Health Checks</p>
            <p className="font-bold text-green-600">{healthChecks.success} ✓</p>
          </div>
          <div>
            <p className="text-gray-500">Failed</p>
            <p className="font-bold text-red-600">{healthChecks.failed} ✗</p>
          </div>
        </div>
      </div>

      {/* QR Code Display */}
      {loading ? (
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-6">
          <div className="text-center">
            <div className="animate-spin mb-3">
              <span className="text-4xl">📱</span>
            </div>
            <p className="text-gray-600 text-sm">Loading QR Code...</p>
          </div>
        </div>
      ) : error ? (
        <div className="aspect-square bg-red-50 rounded-lg flex items-center justify-center mb-6 border-2 border-red-200">
          <div className="text-center p-4">
            <p className="text-red-800 text-sm font-semibold mb-2">⚠️ Error Loading QR</p>
            <p className="text-red-600 text-xs mb-3">{error}</p>
            <button
              onClick={fetchQRCode}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : qrData ? (
        <div className="mb-6">
          <img
            src={qrData}
            alt="WhatsApp QR Code"
            className="w-full aspect-square object-contain bg-white border-2 border-gray-200 rounded-lg p-2"
          />
        </div>
      ) : (
        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-6">
          <p className="text-gray-600 text-sm">QR code not available</p>
        </div>
      )}

      {/* Last Refresh Info */}
      {lastRefresh && (
        <div className="text-center mb-6 text-xs text-gray-500">
          Last refreshed: {lastRefresh}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3">
        <button
          onClick={fetchQRCode}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
        >
          {loading ? 'Refreshing...' : '🔄 Refresh QR Code'}
        </button>

        <label className="flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={autoRefreshEnabled}
            onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
            className="w-4 h-4 mr-2"
          />
          <span className="text-sm font-medium text-gray-700">Auto-refresh every 2 min</span>
        </label>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-900 font-semibold mb-2">📱 How to scan:</p>
        <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
          <li>Open WhatsApp on your phone</li>
          <li>Go to Settings → Linked Devices</li>
          <li>Click "Link a Device"</li>
          <li>Scan this QR code</li>
        </ol>
      </div>

      {/* Debug Info */}
      {status && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600 font-mono">
          <p>Bridge: {status.bridgeUrl}</p>
          <p>Last Check: {new Date(status.lastCheck).toLocaleTimeString()}</p>
        </div>
      )}
    </div>
  );
}
