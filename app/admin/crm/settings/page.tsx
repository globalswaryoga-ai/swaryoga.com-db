'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface AutoConfig {
  chatbotEnabled: boolean;
  welcomeEnabled: boolean;
  welcomeMessage: string;
  workingHoursEnabled: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingHoursTimezone: string;
  offHoursMessage: string;
  kbAutoReplyEnabled: boolean;
  kbMinConfidence: number;
  aiAgentEnabled: boolean;
  aiModel: string;
  aiSystemPrompt: string;
  aiMaxTokens: number;
  autoAssignEnabled: boolean;
  autoAssignStrategy: 'round-robin' | 'least-active' | 'manual';
  autoBroadcastEnabled: boolean;
  autoCloseEnabled: boolean;
  autoCloseMinutes: number;
  autoCloseMessage: string;
  notifyOnNewLead: boolean;
  notifyOnOffHoursMessage: boolean;
  notifyEmail: string;
  rateLimitEnabled: boolean;
  rateLimitMaxPerMinute: number;
}

const DEFAULTS: AutoConfig = {
  chatbotEnabled: true,
  welcomeEnabled: true,
  welcomeMessage: 'नमस्ते 🙏 Swar Yoga में आपका स्वागत है!\n\nHow can I help you today?',
  workingHoursEnabled: false,
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  workingHoursTimezone: 'Asia/Kolkata',
  offHoursMessage: 'We are currently offline. Our team will respond during business hours (9 AM - 6 PM IST). 🙏',
  kbAutoReplyEnabled: true,
  kbMinConfidence: 0.6,
  aiAgentEnabled: false,
  aiModel: 'gpt-4o-mini',
  aiSystemPrompt: 'You are a helpful assistant for Swar Yoga. Be friendly, concise, and professional.',
  aiMaxTokens: 250,
  autoAssignEnabled: true,
  autoAssignStrategy: 'round-robin',
  autoBroadcastEnabled: true,
  autoCloseEnabled: false,
  autoCloseMinutes: 1440,
  autoCloseMessage: 'This chat has been closed due to inactivity. Feel free to message us again! 🙏',
  notifyOnNewLead: true,
  notifyOnOffHoursMessage: true,
  notifyEmail: '',
  rateLimitEnabled: false,
  rateLimitMaxPerMinute: 30,
};

type Tab = 'general' | 'hours' | 'replies' | 'ai' | 'leads' | 'notifications' | 'storage';

export default function AutoConfigSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AutoConfig>(DEFAULTS);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('general');
  
  // Storage usage state
  const [storageData, setStorageData] = useState<{
    dataSize: { display: string };
    storageSize: { display: string };
    indexSize: { display: string };
    totalGB: number;
    monthlyCost: number;
    monthlyCostUSD: number;
    collectionCount: number;
    topCollections: Array<{ name: string; size: { display: string }; count: number }>;
    dbName: string;
  } | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(false);
  
  // Read tab from URL query params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['general', 'hours', 'replies', 'ai', 'leads', 'notifications', 'storage'].includes(tab)) {
      setActiveTab(tab as Tab);
    }
  }, [searchParams]);

  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
  };

  // Load config on mount
  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/admin/login'); return; }

    (async () => {
      try {
        const res = await fetch('/api/admin/crm/auto-config', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config) {
            setConfig({ ...DEFAULTS, ...data.config });
          }
        }
      } catch (err) {
        console.error('Failed to load auto-config:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const saveConfig = async () => {
    const token = getToken();
    if (!token) return;

    setSaving(true);
    setToast(null);

    try {
      const res = await fetch('/api/admin/crm/auto-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', text: '✅ Settings saved! Changes are active immediately.' });
      } else {
        setToast({ type: 'error', text: data.error || 'Save failed' });
      }
    } catch {
      setToast({ type: 'error', text: 'Network error — please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof AutoConfig>(key: K, value: AutoConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // ---- Tab definitions ----
  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'hours', label: 'Working Hours', icon: '🕐' },
    { id: 'replies', label: 'Auto Replies', icon: '💬' },
    { id: 'ai', label: 'AI Agent', icon: '🤖' },
    { id: 'leads', label: 'Lead Mgmt', icon: '👥' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'storage', label: 'Storage', icon: '💾' },
  ];

  // Fetch storage data when storage tab is active
  useEffect(() => {
    if (activeTab !== 'storage' || storageData) return;
    const token = getToken();
    if (!token) return;

    setLoadingStorage(true);
    (async () => {
      try {
        const res = await fetch('/api/admin/crm/storage-usage', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setStorageData(data.data);
          }
        }
      } catch (err) {
        console.error('Failed to load storage data:', err);
      } finally {
        setLoadingStorage(false);
      }
    })();
  }, [activeTab, storageData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/crm" className="text-gray-500 hover:text-gray-700">
              ← CRM
            </Link>
            <h1 className="text-xl font-bold text-gray-900">⚙️ Auto Config Settings</h1>
          </div>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`max-w-5xl mx-auto px-4 pt-3`}>
          <div className={`p-3 rounded-lg text-sm font-medium ${
            toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {toast.text}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Tab bar */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          {/* ---- GENERAL ---- */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <SectionHeader title="Master Switch" desc="Enable or disable the entire automation system." />

              <ToggleRow
                label="Chatbot / Auto-Reply Enabled"
                desc="When OFF, no automatic replies are sent. Messages are still saved."
                checked={config.chatbotEnabled}
                onChange={v => update('chatbotEnabled', v)}
              />

              <ToggleRow
                label="Welcome Message"
                desc="Send a welcome message to first-time contacts."
                checked={config.welcomeEnabled}
                onChange={v => update('welcomeEnabled', v)}
              />

              {config.welcomeEnabled && (
                <TextAreaField
                  label="Welcome Message Text"
                  value={config.welcomeMessage}
                  onChange={v => update('welcomeMessage', v)}
                  rows={4}
                />
              )}

              <hr className="border-gray-100" />

              <ToggleRow
                label="Rate Limiting"
                desc="Limit outbound auto-replies per minute to avoid Meta throttling."
                checked={config.rateLimitEnabled}
                onChange={v => update('rateLimitEnabled', v)}
              />

              {config.rateLimitEnabled && (
                <NumberField
                  label="Max Replies Per Minute"
                  value={config.rateLimitMaxPerMinute}
                  onChange={v => update('rateLimitMaxPerMinute', v)}
                  min={1}
                  max={100}
                />
              )}
            </div>
          )}

          {/* ---- WORKING HOURS ---- */}
          {activeTab === 'hours' && (
            <div className="space-y-6">
              <SectionHeader title="Working Hours" desc="Define when you're available. Off-hours messages get an automated reply." />

              <ToggleRow
                label="Enable Working Hours"
                desc="When enabled, auto-reply kicks in outside the hours you set."
                checked={config.workingHoursEnabled}
                onChange={v => update('workingHoursEnabled', v)}
              />

              {config.workingHoursEnabled && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Start Time" type="time" value={config.workingHoursStart} onChange={v => update('workingHoursStart', v)} />
                    <InputField label="End Time" type="time" value={config.workingHoursEnd} onChange={v => update('workingHoursEnd', v)} />
                  </div>

                  <SelectField
                    label="Timezone"
                    value={config.workingHoursTimezone}
                    onChange={v => update('workingHoursTimezone', v)}
                    options={[
                      { value: 'Asia/Kolkata', label: 'IST (Asia/Kolkata)' },
                      { value: 'UTC', label: 'UTC' },
                      { value: 'America/New_York', label: 'EST (New York)' },
                      { value: 'Europe/London', label: 'GMT (London)' },
                      { value: 'Asia/Dubai', label: 'GST (Dubai)' },
                    ]}
                  />

                  <TextAreaField
                    label="Off-Hours Auto-Reply"
                    value={config.offHoursMessage}
                    onChange={v => update('offHoursMessage', v)}
                    rows={3}
                  />
                </>
              )}
            </div>
          )}

          {/* ---- AUTO REPLIES ---- */}
          {activeTab === 'replies' && (
            <div className="space-y-6">
              <SectionHeader title="Knowledge Base Auto-Reply" desc="Automatically answer common questions from your Knowledge Base when you're away." />

              <ToggleRow
                label="KB Auto-Reply"
                desc="Respond from Knowledge Base articles when admin is offline."
                checked={config.kbAutoReplyEnabled}
                onChange={v => update('kbAutoReplyEnabled', v)}
              />

              {config.kbAutoReplyEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Confidence ({Math.round(config.kbMinConfidence * 100)}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(config.kbMinConfidence * 100)}
                    onChange={e => update('kbMinConfidence', Number(e.target.value) / 100)}
                    className="w-full accent-indigo-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Only reply when confidence ≥ {Math.round(config.kbMinConfidence * 100)}%. Higher = fewer but more accurate replies.
                  </p>
                </div>
              )}

              <hr className="border-gray-100" />

              <SectionHeader title="Auto-Close Inactive Chats" desc="Automatically close conversations that have been inactive." />

              <ToggleRow
                label="Auto Close"
                desc="Close chats after a period of inactivity."
                checked={config.autoCloseEnabled}
                onChange={v => update('autoCloseEnabled', v)}
              />

              {config.autoCloseEnabled && (
                <>
                  <NumberField
                    label="Inactivity Minutes"
                    value={config.autoCloseMinutes}
                    onChange={v => update('autoCloseMinutes', v)}
                    min={5}
                    max={10080}
                  />
                  <TextAreaField
                    label="Auto-Close Message"
                    value={config.autoCloseMessage}
                    onChange={v => update('autoCloseMessage', v)}
                    rows={2}
                  />
                </>
              )}
            </div>
          )}

          {/* ---- AI AGENT ---- */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <SectionHeader title="AI Agent" desc="Use OpenAI to answer questions the Knowledge Base can't handle." />

              <ToggleRow
                label="AI Agent Enabled"
                desc="Requires OPENAI_API_KEY in .env.local"
                checked={config.aiAgentEnabled}
                onChange={v => update('aiAgentEnabled', v)}
              />

              {config.aiAgentEnabled && (
                <>
                  <SelectField
                    label="AI Model"
                    value={config.aiModel}
                    onChange={v => update('aiModel', v)}
                    options={[
                      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
                      { value: 'gpt-4o', label: 'GPT-4o (Balanced)' },
                      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Powerful)' },
                    ]}
                  />

                  <TextAreaField
                    label="System Prompt"
                    value={config.aiSystemPrompt}
                    onChange={v => update('aiSystemPrompt', v)}
                    rows={4}
                  />

                  <NumberField
                    label="Max Tokens"
                    value={config.aiMaxTokens}
                    onChange={v => update('aiMaxTokens', v)}
                    min={50}
                    max={2000}
                  />
                </>
              )}
            </div>
          )}

          {/* ---- LEAD MANAGEMENT ---- */}
          {activeTab === 'leads' && (
            <div className="space-y-6">
              <SectionHeader title="Auto Lead Assignment" desc="Automatically assign new leads to admins." />

              <ToggleRow
                label="Auto-Assign New Leads"
                desc="Assign incoming leads to the next available admin."
                checked={config.autoAssignEnabled}
                onChange={v => update('autoAssignEnabled', v)}
              />

              {config.autoAssignEnabled && (
                <SelectField
                  label="Assignment Strategy"
                  value={config.autoAssignStrategy}
                  onChange={v => update('autoAssignStrategy', v as AutoConfig['autoAssignStrategy'])}
                  options={[
                    { value: 'round-robin', label: 'Round Robin' },
                    { value: 'least-active', label: 'Least Active' },
                    { value: 'manual', label: 'Manual Only' },
                  ]}
                />
              )}

              <hr className="border-gray-100" />

              <ToggleRow
                label="Auto-Add to Broadcast List"
                desc="Automatically add new leads to the main broadcast list."
                checked={config.autoBroadcastEnabled}
                onChange={v => update('autoBroadcastEnabled', v)}
              />
            </div>
          )}

          {/* ---- NOTIFICATIONS ---- */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <SectionHeader title="Notifications" desc="Control what you get notified about." />

              <ToggleRow
                label="Notify on New Lead"
                desc="Get alerted when a new lead messages for the first time."
                checked={config.notifyOnNewLead}
                onChange={v => update('notifyOnNewLead', v)}
              />

              <ToggleRow
                label="Notify on Off-Hours Message"
                desc="Get alerted when someone messages outside working hours."
                checked={config.notifyOnOffHoursMessage}
                onChange={v => update('notifyOnOffHoursMessage', v)}
              />

              <InputField
                label="Notification Email"
                type="email"
                value={config.notifyEmail}
                onChange={v => update('notifyEmail', v)}
                placeholder="admin@swaryoga.com"
              />
            </div>
          )}

          {/* ---- STORAGE ---- */}
          {activeTab === 'storage' && (
            <div className="space-y-6">
              <SectionHeader title="Database Storage Usage" desc="Monitor your MongoDB storage usage across collections." />

              {loadingStorage ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
              ) : storageData ? (
                <>
                  {/* Overview Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                      <div className="text-blue-600 text-xs font-medium uppercase tracking-wide">Data Size</div>
                      <div className="text-2xl font-bold text-blue-900 mt-1">{storageData.dataSize.display}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                      <div className="text-purple-600 text-xs font-medium uppercase tracking-wide">Storage Size</div>
                      <div className="text-2xl font-bold text-purple-900 mt-1">{storageData.storageSize.display}</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                      <div className="text-amber-600 text-xs font-medium uppercase tracking-wide">Index Size</div>
                      <div className="text-2xl font-bold text-amber-900 mt-1">{storageData.indexSize.display}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                      <div className="text-green-600 text-xs font-medium uppercase tracking-wide">Collections</div>
                      <div className="text-2xl font-bold text-green-900 mt-1">{storageData.collectionCount}</div>
                    </div>
                  </div>

                  {/* Cost Information */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">Total Usage: {storageData.totalGB.toFixed(3)} GB</h3>
                        <p className="text-sm text-gray-500 mt-1">Database: {storageData.dbName}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Estimated Cost</div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-lg font-bold text-indigo-600">₹{storageData.monthlyCost}/mo</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-lg font-bold text-green-600">${storageData.monthlyCostUSD}/mo</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">₹35/GB • $0.42/GB</p>
                      </div>
                    </div>
                  </div>

                  {/* Top Collections */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">📊 Top Collections by Size</h3>
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Collection</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Size</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Documents</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {storageData.topCollections.map((col, idx) => (
                            <tr key={col.name} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${
                                    idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-yellow-500' : 'bg-gray-300'
                                  }`} />
                                  <span className="font-mono text-sm text-gray-900">{col.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="font-semibold text-gray-900">{col.size.display}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-gray-600">{col.count.toLocaleString()}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
                    <strong>💡 Note:</strong> Storage costs are based on MongoDB Atlas pricing. Admins don&apos;t need to pay directly — this is for monitoring purposes. Large collections use more storage.
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={() => { setStorageData(null); }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    🔄 Refresh Storage Data
                  </button>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Failed to load storage data. <button onClick={() => setStorageData(null)} className="text-indigo-600 underline">Retry</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sticky save bar */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 shadow-lg transition-all"
          >
            {saving ? 'Saving…' : '💾 Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Reusable form components
// ============================================================

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        <p className="text-sm text-gray-500">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform mt-1 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
