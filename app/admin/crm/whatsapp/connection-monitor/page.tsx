'use client';

import { useState, useEffect } from 'react';
import { getToken } from '@/lib/auth-client';

interface ConnectionStatus {
  status: 'healthy' | 'disconnected' | 'reconnecting';
  uptime: number;
  lastCheck: string;
  recommendations: string[];
}

export default function ConnectionMonitorPage() {
  const [sessionKey, setSessionKey] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-check connection every 30 seconds
  useEffect(() => {
    if (!autoRefresh || !sessionKey) return;

    const interval = setInterval(() => {
      checkConnection();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, sessionKey]);

  async function checkConnection() {
    if (!sessionKey) return;

    try {
      setChecking(true);
      const token = await getToken();
      const response = await fetch(
        `/api/admin/crm/whatsapp/connection-status?sessionKey=${encodeURIComponent(sessionKey)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to check connection');

      const data = await response.json();
      setConnectionStatus(data.status);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error checking connection');
    } finally {
      setChecking(false);
    }
  }

  async function handleManualReconnect() {
    if (!sessionKey) {
      setError('Enter session key first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = await getToken();
      const response = await fetch('/api/admin/crm/whatsapp/connection-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionKey }),
      });

      if (!response.ok) throw new Error('Reconnect failed');

      const data = await response.json();
      if (data.reconnected) {
        alert('✅ Successfully reconnected! Operations will resume.');
        await checkConnection();
      } else {
        alert(`⚠️ Reconnection failed: ${data.message}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error during reconnection');
    } finally {
      setLoading(false);
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'disconnected':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'reconnecting':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'disconnected':
        return '❌';
      case 'reconnecting':
        return '⚡';
      default:
        return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">📡 WhatsApp Connection Monitor</h1>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">Session Key</label>
            <input
              type="text"
              value={sessionKey}
              onChange={(e) => setSessionKey(e.target.value)}
              placeholder="Enter session key to monitor"
              className="w-full px-4 py-2 border border-gray-300 rounded"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={checkConnection}
              disabled={checking || !sessionKey}
              className="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:bg-gray-400"
            >
              {checking ? 'Checking...' : '🔍 Check Status'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8">
          <input
            type="checkbox"
            id="autoRefresh"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            disabled={!sessionKey}
          />
          <label htmlFor="autoRefresh" className="text-sm">
            Auto-refresh every 30 seconds
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 mb-8 text-red-700">
            {error}
          </div>
        )}

        {connectionStatus && (
          <>
            {/* Status Card */}
            <div className={`border-2 rounded-lg p-6 mb-8 ${statusColor(connectionStatus.status)}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-5xl">{statusIcon(connectionStatus.status)}</div>
                <div>
                  <h2 className="text-2xl font-bold capitalize">{connectionStatus.status}</h2>
                  <p className="text-sm opacity-75">
                    Last checked: {new Date(connectionStatus.lastCheck).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {connectionStatus.status === 'healthy' && (
                <p className="text-sm mb-4">
                  ✅ Session is active and ready for operations (broadcasts and group merges)
                </p>
              )}

              {connectionStatus.status === 'disconnected' && (
                <p className="text-sm mb-4">
                  ❌ Session has been disconnected. Click "Reconnect" below to restore connection.
                </p>
              )}

              {connectionStatus.status === 'reconnecting' && (
                <p className="text-sm mb-4">
                  ⚡ System is attempting to reconnect automatically. Please wait...
                </p>
              )}

              {/* Recommendations */}
              {connectionStatus.recommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-current border-opacity-25">
                  <p className="text-sm font-semibold mb-2">Recommended Actions:</p>
                  <ul className="space-y-1">
                    {connectionStatus.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Reconnect Button */}
            {connectionStatus.status !== 'healthy' && (
              <div className="bg-white border border-yellow-200 rounded-lg p-6 mb-8">
                <h3 className="font-bold mb-4">🔌 Manual Reconnection</h3>
                <p className="text-sm text-gray-700 mb-4">
                  If auto-reconnection doesn't work, click the button below. You may need to scan
                  the QR code again if the session has expired.
                </p>
                <button
                  onClick={handleManualReconnect}
                  disabled={loading}
                  className="w-full bg-yellow-600 text-white py-2 rounded font-medium hover:bg-yellow-700 disabled:bg-gray-400"
                >
                  {loading ? 'Reconnecting...' : '⚡ Attempt Reconnection'}
                </button>
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-bold mb-2">ℹ️ How This Works</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>
                  🔄 <strong>Heartbeat Checks:</strong> Every 10 messages/5 operations, system
                  verifies session is still connected
                </li>
                <li>
                  ⏸️ <strong>Auto-Pause:</strong> If disconnection detected, operations pause
                  automatically
                </li>
                <li>
                  🔁 <strong>Auto-Resume:</strong> Once reconnected, operations resume from where
                  they left off
                </li>
                <li>
                  🚫 <strong>Prevents Bans:</strong> By pausing on disconnect, system prevents
                  cascade of failed requests
                </li>
              </ul>
            </div>
          </>
        )}

        {!connectionStatus && !error && (
          <div className="bg-gray-100 border border-gray-300 rounded p-8 text-center text-gray-600">
            Enter a session key and click "Check Status" to monitor connection
          </div>
        )}
      </div>
    </div>
  );
}
