'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

interface BroadcastSettings {
  delayBetweenMessages: number;
  gapAfterMessages: number;
  gapPauseDuration: number;
  allowedStartHour: number;
  allowedEndHour: number;
  enabled: boolean;
}

interface BroadcastStats {
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  blocked: number;
}

interface MessageRecord {
  id: string;
  phone: string;
  broadcastId: string;
  status: string;
  blocked?: boolean;
  error?: string;
  timestamp: number;
  deliveredAt?: number;
  readAt?: number;
}

interface ScheduledBroadcast {
  id: string;
  recipients: string[];
  message: string;
  scheduleTime: number;
  status: string;
  createdAt: number;
}

export default function QRBroadcastSettingsPage() {
  const token = useAuth();
  const [settings, setSettings] = useState<BroadcastSettings | null>(null);
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [blockedNumbers, setBlockedNumbers] = useState<string[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledBroadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'report' | 'blocked' | 'scheduled'>('settings');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [formSettings, setFormSettings] = useState<BroadcastSettings>({
    delayBetweenMessages: 5000,
    gapAfterMessages: 10,
    gapPauseDuration: 30000,
    allowedStartHour: 7,
    allowedEndHour: 21,
    enabled: true
  });

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/whatsapp/qr/broadcast-settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
        setFormSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  }, [token]);

  const fetchReport = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/whatsapp/qr/broadcast-report', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setMessages(data.messages || []);
        setBlockedNumbers(data.blockedNumbers || []);
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    }
  }, [token]);

  const fetchScheduled = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/whatsapp/qr/broadcast', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setScheduled(data.scheduled || []);
      }
    } catch (err) {
      console.error('Failed to fetch scheduled:', err);
    }
  }, [token]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSettings(), fetchReport(), fetchScheduled()]);
    setLoading(false);
  }, [fetchSettings, fetchReport, fetchScheduled]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const saveSettings = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/crm/whatsapp/qr/broadcast-settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(formSettings)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const removeBlocked = async (phone: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/whatsapp/qr/broadcast-blocked', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (data.success) {
        setBlockedNumbers(prev => prev.filter(p => p !== phone));
        setMessage({ type: 'success', text: 'Number removed from blocked list' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const cancelScheduled = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/whatsapp/qr/broadcast', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        setScheduled(prev => prev.filter(s => s.id !== id));
        setMessage({ type: 'success', text: 'Scheduled broadcast cancelled' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/admin/crm" className="hover:text-blue-600">CRM</Link>
          <span>/</span>
          <Link href="/admin/crm/qr" className="hover:text-blue-600">QR Bridge</Link>
          <span>/</span>
          <span>Broadcast Settings</span>
        </div>
        <h1 className="text-2xl font-bold">QR Broadcast Settings & Reports</h1>
        <p className="text-gray-600 mt-1">Configure delay, schedule, and view broadcast reports</p>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {(['settings', 'report', 'blocked', 'scheduled'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === tab 
                ? 'bg-white text-blue-600 shadow' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'settings' && '⚙️ Settings'}
            {tab === 'report' && '📊 Report'}
            {tab === 'blocked' && '🚫 Blocked'}
            {tab === 'scheduled' && '📅 Scheduled'}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Broadcast Settings</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Delay Between Messages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delay Between Messages (seconds)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={formSettings.delayBetweenMessages / 1000}
                onChange={(e) => setFormSettings(prev => ({ 
                  ...prev, 
                  delayBetweenMessages: Math.max(1000, parseInt(e.target.value) * 1000) 
                }))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Wait time between each message (min: 1s)</p>
            </div>

            {/* Gap After N Messages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pause After Every N Messages
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formSettings.gapAfterMessages}
                onChange={(e) => setFormSettings(prev => ({ 
                  ...prev, 
                  gapAfterMessages: Math.max(1, parseInt(e.target.value)) 
                }))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Take a break after this many messages</p>
            </div>

            {/* Gap Pause Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pause Duration (seconds)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={formSettings.gapPauseDuration / 1000}
                onChange={(e) => setFormSettings(prev => ({ 
                  ...prev, 
                  gapPauseDuration: Math.max(5000, parseInt(e.target.value) * 1000) 
                }))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">How long to pause (min: 5s)</p>
            </div>

            {/* Enabled Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Broadcasting Enabled
              </label>
              <button
                onClick={() => setFormSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`px-4 py-2 rounded-lg font-medium ${
                  formSettings.enabled 
                    ? 'bg-green-100 text-green-700 border border-green-300' 
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}
              >
                {formSettings.enabled ? '✅ Enabled' : '❌ Disabled'}
              </button>
            </div>

            {/* Allowed Start Hour */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Start Hour (24h format)
              </label>
              <input
                type="number"
                min="0"
                max="23"
                value={formSettings.allowedStartHour}
                onChange={(e) => setFormSettings(prev => ({ 
                  ...prev, 
                  allowedStartHour: Math.max(0, Math.min(23, parseInt(e.target.value))) 
                }))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Broadcasting allowed from this hour</p>
            </div>

            {/* Allowed End Hour */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed End Hour (24h format)
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={formSettings.allowedEndHour}
                onChange={(e) => setFormSettings(prev => ({ 
                  ...prev, 
                  allowedEndHour: Math.max(1, Math.min(24, parseInt(e.target.value))) 
                }))}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Broadcasting stops at this hour</p>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2">📋 Current Settings Summary</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Wait <strong>{formSettings.delayBetweenMessages / 1000}s</strong> between each message</li>
              <li>• Pause for <strong>{formSettings.gapPauseDuration / 1000}s</strong> after every <strong>{formSettings.gapAfterMessages}</strong> messages</li>
              <li>• Only send between <strong>{formSettings.allowedStartHour}:00</strong> and <strong>{formSettings.allowedEndHour}:00</strong></li>
              <li>• Status: {formSettings.enabled ? '✅ Active' : '❌ Paused'}</li>
            </ul>
          </div>

          {/* Save Button */}
          <div className="mt-6">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : '💾 Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">Total</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
                <div className="text-sm text-gray-500">Sent</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
                <div className="text-sm text-gray-500">Delivered</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="text-2xl font-bold text-purple-600">{stats.read}</div>
                <div className="text-sm text-gray-500">Read</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.blocked}</div>
                <div className="text-sm text-gray-500">Blocked</div>
              </div>
            </div>
          )}

          {/* Messages Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Message History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Read</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {messages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No messages yet
                      </td>
                    </tr>
                  ) : (
                    messages.slice(0, 100).map((msg, idx) => (
                      <tr key={msg.id || idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">{msg.phone}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            msg.status === 'read' ? 'bg-purple-100 text-purple-700' :
                            msg.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            msg.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            msg.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {msg.blocked && '🚫 '}{msg.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(msg.timestamp).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {msg.deliveredAt ? new Date(msg.deliveredAt).toLocaleTimeString('en-IN') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {msg.readAt ? new Date(msg.readAt).toLocaleTimeString('en-IN') : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-red-600 max-w-xs truncate">
                          {msg.error || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Blocked Tab */}
      {activeTab === 'blocked' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold">🚫 Blocked Numbers ({blockedNumbers.length})</h2>
            <p className="text-sm text-gray-500 mt-1">Numbers that have blocked you or are not on WhatsApp</p>
          </div>
          {blockedNumbers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No blocked numbers yet
            </div>
          ) : (
            <div className="divide-y">
              {blockedNumbers.map(phone => (
                <div key={phone} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <span className="font-mono">{phone}</span>
                  <button
                    onClick={() => removeBlocked(phone)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scheduled Tab */}
      {activeTab === 'scheduled' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold">📅 Scheduled Broadcasts ({scheduled.length})</h2>
          </div>
          {scheduled.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No scheduled broadcasts
            </div>
          ) : (
            <div className="divide-y">
              {scheduled.map(item => (
                <div key={item.id} className="px-4 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{item.id}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        Recipients: {item.recipients.length} | Scheduled: {new Date(item.scheduleTime).toLocaleString('en-IN')}
                      </div>
                      <div className="text-sm text-gray-600 mt-1 max-w-md truncate">
                        {item.message}
                      </div>
                    </div>
                    <button
                      onClick={() => cancelScheduled(item.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
