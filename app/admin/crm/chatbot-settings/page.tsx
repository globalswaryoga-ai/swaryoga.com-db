'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox, LoadingSpinner } from '@/components/admin/crm';

type ChatbotSettings = {
  chatbotEnabled?: boolean;
  welcomeRepeatDays?: number;
  aiSystemPrompt?: string;
  aiMaxTokens?: number;
  aiModel?: string;
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
  const [saving, setSaving] = useState(false);

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
    if (!token) return;
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, router]);

  const saveSettings = async () => {
    if (saving) return;
    setSaving(true);
    try {
      setError(null);
      setSuccess(false);
      const saved = await crmFetch('/api/admin/crm/chatbot-settings', {
        method: 'PUT',
        body: settings,
      });
      setSettings(saved);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Custom Header with dark text for light background */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Link 
              href="/admin/crm"
              className="mt-1 p-2 bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-xl transition-all shadow-sm"
              title="Back to CRM Dashboard"
            >
              🏠
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Chatbot Settings</h1>
              <p className="text-gray-600 mt-2">Configure global chatbot behavior and messages</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/crm/chatbots"
              className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
            >
              Flows
            </Link>
            <button
              onClick={saveSettings}
              disabled={saving || !settings}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {error ? <AlertBox type="error" message={error} onClose={() => setError(null)} /> : null}
        {success ? <AlertBox type="success" message="Settings saved!" onClose={() => setSuccess(false)} /> : null}

        {!settings ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-800">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="space-y-6">
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Bunny Meta supports messages, questions, buttons, approved templates, delays and reply waits. Legacy advanced canvas nodes and proactive inactivity/escalation jobs are not active; their settings are preserved for follow-up. Office hours gate normal flows and AI, but recording requests use the workshop eligibility policy.</p>
            <label className="flex items-center gap-3 rounded-xl bg-white border p-6">
              <input type="checkbox" checked={settings.chatbotEnabled === true} onChange={e => setSettings({ ...settings, chatbotEnabled: e.target.checked })} />
              <span>Enable Meta chatbot automation for this account</span>
            </label>
            {/* Welcome Message */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-extrabold text-gray-900 mb-4">Welcome Message</h2>

              <label className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={settings.welcomeEnabled || false}
                  onChange={(e) => setSettings((p) => (p ? { ...p, welcomeEnabled: e.target.checked } : p))}
                  className="w-5 h-5"
                />
                <span className="text-gray-800 font-bold">Enable welcome message</span>
              </label>

              {settings.welcomeEnabled && (
                <>
                <textarea
                  value={settings.welcomeMessage || ''}
                  onChange={(e) => setSettings((p) => (p ? { ...p, welcomeMessage: e.target.value } : p))}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
                  placeholder="Welcome message to send when conversation starts..."
                />
                <label className="block mt-3 text-sm font-bold text-gray-700">
                  Welcome again after days (0 = first conversation only)
                  <input type="number" min={0} max={365} value={settings.welcomeRepeatDays ?? 0}
                    onChange={e => setSettings({ ...settings, welcomeRepeatDays: Number(e.target.value) })}
                    className="block mt-2 rounded border p-2 text-gray-900" />
                </label>
                <p className="mt-2 text-xs text-gray-500">Welcome is sent on an incoming conversation, not as an unsolicited scheduled message. Keywords and button actions take priority.</p>
                </>
              )}
            </div>

            {/* Office Hours */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-extrabold text-gray-900 mb-4">Office Hours</h2>

              <label className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  checked={settings.officeHoursEnabled || false}
                  onChange={(e) => setSettings((p) => (p ? { ...p, officeHoursEnabled: e.target.checked } : p))}
                  className="w-5 h-5"
                />
                <span className="text-gray-800 font-bold">Enable office hours</span>
              </label>

              {settings.officeHoursEnabled && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Office Hours Start</label>
                      <input
                        type="time"
                        value={settings.officeHoursStart || '09:00'}
                        onChange={(e) => setSettings((p) => (p ? { ...p, officeHoursStart: e.target.value } : p))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Office Hours End</label>
                      <input
                        type="time"
                        value={settings.officeHoursEnd || '18:00'}
                        onChange={(e) => setSettings((p) => (p ? { ...p, officeHoursEnd: e.target.value } : p))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Timezone</label>
                    <input
                      type="text"
                      value={settings.officeHoursTimezone || 'Asia/Kolkata'}
                      onChange={(e) => setSettings((p) => (p ? { ...p, officeHoursTimezone: e.target.value } : p))}
                      className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
                      placeholder="e.g. Asia/Kolkata"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">After Hours Message</label>
                    <textarea
                      value={settings.afterHoursMessage || ''}
                      onChange={(e) => setSettings((p) => (p ? { ...p, afterHoursMessage: e.target.value } : p))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
                      placeholder="Message to show outside office hours..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Escalation */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-extrabold text-gray-900 mb-4">Escalation</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Escalate after N messages</label>
                  <input
                    type="number"
                    value={settings.escalateAfterMessages || ''}
                    onChange={(e) => setSettings((p) => (p ? { ...p, escalateAfterMessages: e.target.value ? Number(e.target.value) : undefined } : p))}
                    min="1"
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900"
                    placeholder="Optional"
                  />
                </div>

                {settings.escalateAfterMessages && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Escalation Message</label>
                    <textarea
                      value={settings.escalateMessage || ''}
                      onChange={(e) => setSettings((p) => (p ? { ...p, escalateMessage: e.target.value } : p))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
                      placeholder="Message when escalating to human..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Inactivity */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-extrabold text-gray-900 mb-4">Inactivity</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Inactivity timeout (minutes)</label>
                  <input
                    type="number"
                    value={settings.inactivityMinutes || ''}
                    onChange={(e) => setSettings((p) => (p ? { ...p, inactivityMinutes: e.target.value ? Number(e.target.value) : undefined } : p))}
                    min="1"
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900"
                    placeholder="Optional"
                  />
                </div>

                {settings.inactivityMinutes && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Inactivity Message</label>
                    <textarea
                      value={settings.inactivityMessage || ''}
                      onChange={(e) => setSettings((p) => (p ? { ...p, inactivityMessage: e.target.value } : p))}
                      rows={3}
                      className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
                      placeholder="Message after inactivity timeout..."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Global Settings */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h2 className="font-extrabold text-gray-900 mb-4">Global Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Default Response (for unmatched input)</label>
                  <textarea
                    value={settings.defaultResponse || ''}
                    onChange={(e) => setSettings((p) => (p ? { ...p, defaultResponse: e.target.value } : p))}
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
                    placeholder="Default message when bot doesn't understand..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Global Labels (comma-separated)</label>
                  <input
                    value={(settings.globalLabels || []).join(', ')}
                    onChange={(e) =>
                      setSettings((p) =>
                        p ? { ...p, globalLabels: e.target.value.split(',').map((l) => l.trim()).filter(Boolean) } : p
                      )
                    }
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-500"
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
                  <span className="text-gray-800 font-bold">Enable AI fallback responses</span>
                </label>
                {settings.aiEnabled && <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">AI instructions
                    <textarea rows={4} value={settings.aiSystemPrompt || ''} onChange={e => setSettings({ ...settings, aiSystemPrompt: e.target.value })}
                      className="block w-full mt-2 rounded border p-3 text-gray-900" placeholder="Business facts, language and escalation instructions. Recording eligibility remains controlled by attendance rules, never by AI." />
                  </label>
                  <label className="block text-sm font-bold text-gray-700">Maximum response tokens
                    <input type="number" min={50} max={1000} value={settings.aiMaxTokens ?? 250}
                      onChange={e => setSettings({ ...settings, aiMaxTokens: Number(e.target.value) })} className="block mt-2 rounded border p-2 text-gray-900" />
                  </label>
                  <p className="text-xs text-gray-500">Uses the server-configured AI provider credentials. Do not paste API keys here. Keyword flows and recording policies do not require paid AI.</p>
                </div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
