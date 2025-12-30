'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox, LoadingSpinner, PageHeader } from '@/components/admin/crm';

type ChatbotSettings = {
  _id?: string;
  createdByUserId?: string;
  welcomeEnabled?: boolean;
  welcomeMessage?: string;
  officeHoursEnabled?: boolean;
  officeHoursStart?: string;
  officeHoursEnd?: string;
  officeHoursTimezone?: string;
  afterHoursMessage?: string;
  escalateAfterMessages?: number;
  escalateMessage?: string;
  inactivityMinutes?: number;
  inactivityMessage?: string;
  globalLabels?: string[];
  defaultResponse?: string;
  aiEnabled?: boolean;
};

export default function ChatbotSettingsPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const [settings, setSettings] = useState<ChatbotSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crmFetch('/api/admin/crm/chatbot-settings');
      setSettings(res || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [crmFetch]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchSettings();
  }, [token, router, fetchSettings]);

  const saveSettings = async () => {
    try {
      setError(null);
      setSuccess(false);
      await crmFetch('/api/admin/crm/chatbot-settings', {
        method: 'PUT',
        body: settings,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Chatbot Settings"
          subtitle="Configure global chatbot behavior and messages"
          action={
            <div className="flex gap-2">
              <Link
                href="/admin/crm/chatbot-builder"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Flows
              </Link>
              <button
                onClick={saveSettings}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-semibold"
              >
                Save
              </button>
            </div>
          }
        />

        {error ? <AlertBox type="error" message={error} onClose={() => setError(null)} /> : null}
        {success ? <AlertBox type="success" message="Settings saved!" onClose={() => setSuccess(false)} /> : null}

        {!settings ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-emerald-50">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Welcome Message */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="font-extrabold text-white mb-4">Welcome Message</h2>

              <label className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={settings.welcomeEnabled || false}
                  onChange={(e) => setSettings((p) => (p ? { ...p, welcomeEnabled: e.target.checked } : p))}
                  className="w-5 h-5"
                />
                <span className="text-emerald-50 font-bold">Enable welcome message</span>
              </label>

              {settings.welcomeEnabled && (
                <textarea
                  value={settings.welcomeMessage || ''}
                  onChange={(e) => setSettings((p) => (p ? { ...p, welcomeMessage: e.target.value } : p))}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                  placeholder="Welcome message to send when conversation starts..."
                />
              )}
            </div>

            {/* Office Hours */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="font-extrabold text-white mb-4">Office Hours</h2>

              <label className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={settings.officeHoursEnabled || false}
                  onChange={(e) => setSettings((p) => (p ? { ...p, officeHoursEnabled: e.target.checked } : p))}
                  className="w-5 h-5"
                />
                <span className="text-emerald-50 font-bold">Enable office hours</span>
              </label>

              {settings.officeHoursEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-emerald-50 mb-2">Office Hours Start</label>
                      <input
                        type="time"
                        value={settings.officeHoursStart || '09:00'}
                        onChange={(e) => setSettings((p) => (p ? { ...p, officeHoursStart: e.target.value } : p))}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-emerald-50 mb-2">Office Hours End</label>
                      <input
                        type="time"
                        value={settings.officeHoursEnd || '18:00'}
                        onChange={(e) => setSettings((p) => (p ? { ...p, officeHoursEnd: e.target.value } : p))}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-emerald-50 mb-2">Timezone</label>
                    <input
                      type="text"
                      value={settings.officeHoursTimezone || 'Asia/Kolkata'}
                      onChange={(e) => setSettings((p) => (p ? { ...p, officeHoursTimezone: e.target.value } : p))}
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                      placeholder="e.g. Asia/Kolkata"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-emerald-50 mb-2">After Hours Message</label>
                    <textarea
                      value={settings.afterHoursMessage || ''}
                      onChange={(e) => setSettings((p) => (p ? { ...p, afterHoursMessage: e.target.value } : p))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                      placeholder="Message to show outside office hours..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Escalation */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="font-extrabold text-white mb-4">Escalation</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-emerald-50 mb-2">Escalate after N messages</label>
                  <input
                    type="number"
                    value={settings.escalateAfterMessages || ''}
                    onChange={(e) => setSettings((p) => (p ? { ...p, escalateAfterMessages: e.target.value ? Number(e.target.value) : undefined } : p))}
                    min="1"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                    placeholder="Optional"
                  />
                </div>

                {settings.escalateAfterMessages && (
                  <div>
                    <label className="block text-sm font-bold text-emerald-50 mb-2">Escalation Message</label>
                    <textarea
                      value={settings.escalateMessage || ''}
                      onChange={(e) => setSettings((p) => (p ? { ...p, escalateMessage: e.target.value } : p))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                      placeholder="Message when escalating to human..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Inactivity */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="font-extrabold text-white mb-4">Inactivity</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-emerald-50 mb-2">Inactivity timeout (minutes)</label>
                  <input
                    type="number"
                    value={settings.inactivityMinutes || ''}
                    onChange={(e) => setSettings((p) => (p ? { ...p, inactivityMinutes: e.target.value ? Number(e.target.value) : undefined } : p))}
                    min="1"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                    placeholder="Optional"
                  />
                </div>

                {settings.inactivityMinutes && (
                  <div>
                    <label className="block text-sm font-bold text-emerald-50 mb-2">Inactivity Message</label>
                    <textarea
                      value={settings.inactivityMessage || ''}
                      onChange={(e) => setSettings((p) => (p ? { ...p, inactivityMessage: e.target.value } : p))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                      placeholder="Message after inactivity timeout..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Global Settings */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="font-extrabold text-white mb-4">Global Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-emerald-50 mb-2">Default Response (for unmatched input)</label>
                  <textarea
                    value={settings.defaultResponse || ''}
                    onChange={(e) => setSettings((p) => (p ? { ...p, defaultResponse: e.target.value } : p))}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                    placeholder="Default message when bot doesn't understand..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-emerald-50 mb-2">Global Labels (comma-separated)</label>
                  <input
                    value={(settings.globalLabels || []).join(', ')}
                    onChange={(e) =>
                      setSettings((p) =>
                        p ? { ...p, globalLabels: e.target.value.split(',').map((l) => l.trim()).filter(Boolean) } : p
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                    placeholder="e.g. chatbot, automated"
                  />
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.aiEnabled || false}
                    onChange={(e) => setSettings((p) => (p ? { ...p, aiEnabled: e.target.checked } : p))}
                    className="w-5 h-5"
                  />
                  <span className="text-emerald-50 font-bold">Enable AI fallback responses</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
