'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DeviceSettings {
  maxDevicesPerUser: number;
  maxConcurrentStreams: number;
  locationMismatchWindowMinutes: number;
  enableLocationCheck: boolean;
  enableDeviceLimit: boolean;
  enableConcurrentStreamCheck: boolean;
  autoBlockOnViolations: number;
  warningMessage: string;
}

export default function DeviceSettingsPage() {
  const [settings, setSettings] = useState<DeviceSettings>({
    maxDevicesPerUser: 3,
    maxConcurrentStreams: 1,
    locationMismatchWindowMinutes: 60,
    enableLocationCheck: true,
    enableDeviceLimit: true,
    enableConcurrentStreamCheck: true,
    autoBlockOnViolations: 0,
    warningMessage: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/admin/devices/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data?.settings) {
          setSettings(data.data.settings);
        }
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/admin/devices/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      
      if (res.ok) {
        setMessage('✅ Settings saved successfully!');
      } else {
        setMessage('❌ Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('❌ Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin/crm/devices"
                className="mb-2 inline-block text-sm text-blue-500 hover:underline"
              >
                ← Back to Device Management
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">⚙️ Device Control Settings</h1>
              <p className="text-sm text-gray-500">Configure device limits, location checks, and violation rules</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-6">
          {/* Device Limits */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
              <span>📱</span> Device Limits
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Enable Device Limit</label>
                  <p className="text-sm text-gray-500">Restrict number of devices per user</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableDeviceLimit}
                  onChange={(e) => setSettings({ ...settings, enableDeviceLimit: e.target.checked })}
                  className="h-5 w-5 rounded"
                />
              </div>
              
              <div>
                <label className="mb-1 block font-medium">Max Devices Per User</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.maxDevicesPerUser}
                  onChange={(e) => setSettings({ ...settings, maxDevicesPerUser: parseInt(e.target.value) || 3 })}
                  className="w-32 rounded-lg border px-3 py-2"
                  disabled={!settings.enableDeviceLimit}
                />
                <p className="mt-1 text-sm text-gray-500">Recommended: 3 devices</p>
              </div>
            </div>
          </div>

          {/* Stream Control */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
              <span>🎬</span> Stream Control
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Enable Concurrent Stream Check</label>
                  <p className="text-sm text-gray-500">Limit simultaneous video streaming</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableConcurrentStreamCheck}
                  onChange={(e) => setSettings({ ...settings, enableConcurrentStreamCheck: e.target.checked })}
                  className="h-5 w-5 rounded"
                />
              </div>
              
              <div>
                <label className="mb-1 block font-medium">Max Concurrent Streams</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={settings.maxConcurrentStreams}
                  onChange={(e) => setSettings({ ...settings, maxConcurrentStreams: parseInt(e.target.value) || 1 })}
                  className="w-32 rounded-lg border px-3 py-2"
                  disabled={!settings.enableConcurrentStreamCheck}
                />
                <p className="mt-1 text-sm text-gray-500">Recommended: 1 stream (prevents sharing)</p>
              </div>
            </div>
          </div>

          {/* Location Check */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
              <span>📍</span> Location Verification
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium">Enable Location Check</label>
                  <p className="text-sm text-gray-500">Detect logins from different states</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableLocationCheck}
                  onChange={(e) => setSettings({ ...settings, enableLocationCheck: e.target.checked })}
                  className="h-5 w-5 rounded"
                />
              </div>
              
              <div>
                <label className="mb-1 block font-medium">Time Window (minutes)</label>
                <input
                  type="number"
                  min={15}
                  max={1440}
                  value={settings.locationMismatchWindowMinutes}
                  onChange={(e) => setSettings({ ...settings, locationMismatchWindowMinutes: parseInt(e.target.value) || 60 })}
                  className="w-32 rounded-lg border px-3 py-2"
                  disabled={!settings.enableLocationCheck}
                />
                <p className="mt-1 text-sm text-gray-500">
                  If user logs in from different state within this window → Violation
                </p>
              </div>
            </div>
          </div>

          {/* Auto Block */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
              <span>🚫</span> Auto Block Settings
            </h2>
            
            <div>
              <label className="mb-1 block font-medium">Auto Block After N Violations</label>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.autoBlockOnViolations}
                onChange={(e) => setSettings({ ...settings, autoBlockOnViolations: parseInt(e.target.value) || 0 })}
                className="w-32 rounded-lg border px-3 py-2"
              />
              <p className="mt-1 text-sm text-gray-500">
                Set to 0 to disable auto-blocking (only show warnings)
              </p>
            </div>
          </div>

          {/* Warning Message */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-medium">
              <span>⚠️</span> Warning Message
            </h2>
            
            <div>
              <label className="mb-1 block font-medium">Custom Warning Message</label>
              <textarea
                value={settings.warningMessage}
                onChange={(e) => setSettings({ ...settings, warningMessage: e.target.value })}
                className="w-full rounded-lg border p-3"
                rows={4}
                placeholder="We detected suspicious activity on your account..."
              />
              <p className="mt-1 text-sm text-gray-500">
                This message will be shown to users when a violation is detected
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-500 px-6 py-2.5 font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Saving...' : '💾 Save Settings'}
            </button>
            {message && (
              <span className={message.includes('✅') ? 'text-green-600' : 'text-red-600'}>
                {message}
              </span>
            )}
          </div>

          {/* Preview */}
          <div className="rounded-lg border-2 border-dashed border-gray-200 p-6">
            <h3 className="mb-4 font-medium text-gray-700">📋 Current Configuration Summary</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                ✓ Max {settings.maxDevicesPerUser} devices per user
                {!settings.enableDeviceLimit && ' (disabled)'}
              </li>
              <li>
                ✓ Max {settings.maxConcurrentStreams} concurrent stream(s)
                {!settings.enableConcurrentStreamCheck && ' (disabled)'}
              </li>
              <li>
                ✓ Location check: {settings.enableLocationCheck ? `within ${settings.locationMismatchWindowMinutes} minutes` : 'disabled'}
              </li>
              <li>
                ✓ Auto-block: {settings.autoBlockOnViolations > 0 ? `after ${settings.autoBlockOnViolations} violations` : 'disabled (warnings only)'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
