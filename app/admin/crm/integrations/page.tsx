'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  RefreshCw,
  Shield,
  Zap,
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt?: string;
  usageCount: number;
}

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  secretPrefix: string;
  createdAt: string;
  lastTriggeredAt?: string;
  successCount: number;
  failureCount: number;
}

const PERMISSION_OPTIONS = [
  { value: 'read', label: 'Read', description: 'View leads, messages, analytics' },
  { value: 'write', label: 'Write', description: 'Create and update leads' },
  { value: 'delete', label: 'Delete', description: 'Delete leads and messages' },
  { value: 'broadcast', label: 'Broadcast', description: 'Send broadcast messages' },
];

const WEBHOOK_EVENTS = [
  { value: 'lead.created', label: 'Lead Created' },
  { value: 'lead.updated', label: 'Lead Updated' },
  { value: 'lead.deleted', label: 'Lead Deleted' },
  { value: 'lead.status_changed', label: 'Lead Status Changed' },
  { value: 'message.received', label: 'Message Received' },
  { value: 'message.sent', label: 'Message Sent' },
  { value: 'broadcast.completed', label: 'Broadcast Completed' },
  { value: 'payment.received', label: 'Payment Received' },
];

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [tenantSlug, setTenantSlug] = useState('');

  // Modal states
  const [showNewKey, setShowNewKey] = useState(false);
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [newKeyData, setNewKeyData] = useState({ name: '', permissions: ['read'] });
  const [newWebhookData, setNewWebhookData] = useState({ url: '', events: [] as string[] });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const slug = localStorage.getItem('tenantSlug') || '';
    setTenantSlug(slug);
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';

      const [keysRes, webhooksRes] = await Promise.all([
        fetch(`/api/crm-site/api-keys?tenant=${slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/crm-site/webhooks?tenant=${slug}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (keysRes.ok) {
        const data = await keysRes.json();
        setApiKeys(data.apiKeys || []);
      }
      if (webhooksRes.ok) {
        const data = await webhooksRes.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyData.name.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          name: newKeyData.name,
          permissions: newKeyData.permissions,
        }),
      });

      const data = await res.json();
      if (res.ok && data.apiKey) {
        setCreatedKey(data.apiKey);
        fetchData();
      } else {
        alert(data.error || 'Failed to create API key');
      }
    } catch (err) {
      console.error('Failed to create key:', err);
    } finally {
      setSaving(false);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      await fetch('/api/crm-site/api-keys', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantSlug, keyId }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to revoke:', err);
    }
  };

  const createWebhook = async () => {
    if (!newWebhookData.url.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const res = await fetch('/api/crm-site/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantSlug,
          url: newWebhookData.url,
          events: newWebhookData.events,
        }),
      });

      const data = await res.json();
      if (res.ok && data.secret) {
        setCreatedSecret(data.secret);
        fetchData();
      } else {
        alert(data.error || 'Failed to create webhook');
      }
    } catch (err) {
      console.error('Failed to create webhook:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!confirm('Delete this webhook?')) return;

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      await fetch('/api/crm-site/webhooks', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tenantSlug, webhookId }),
      });
      fetchData();
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-indigo-600" />
            Integrations
          </h1>
          <p className="text-sm text-gray-500">Manage API keys and webhooks</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* API Keys Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Key className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">API Keys</h2>
              <p className="text-sm text-gray-500">Authenticate API requests</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowNewKey(true);
              setCreatedKey(null);
              setNewKeyData({ name: '', permissions: ['read'] });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            New Key
          </button>
        </div>

        {apiKeys.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No API keys yet. Create one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {apiKeys.map(key => (
              <div key={key.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Key className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{key.name}</p>
                    <p className="text-sm text-gray-500 font-mono">{key.keyPrefix}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <p className="text-gray-600">{key.usageCount} requests</p>
                    <p className="text-gray-400">
                      {key.permissions.join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeApiKey(key.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhooks Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Webhook className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Webhooks</h2>
              <p className="text-sm text-gray-500">Receive real-time event notifications</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowNewWebhook(true);
              setCreatedSecret(null);
              setNewWebhookData({ url: '', events: [] });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            New Webhook
          </button>
        </div>

        {webhooks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Webhook className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No webhooks configured. Add one to receive event notifications.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map(webhook => (
              <div key={webhook.id} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${webhook.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <p className="font-medium text-gray-900 font-mono text-sm">{webhook.url}</p>
                  </div>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{webhook.events.length} events</span>
                  <span>•</span>
                  <span className="text-green-600">{webhook.successCount} successful</span>
                  {webhook.failureCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-red-600">{webhook.failureCount} failed</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New API Key Modal */}
      {showNewKey && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {createdKey ? 'API Key Created' : 'Create API Key'}
            </h3>

            {createdKey ? (
              <div>
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl mb-4">
                  <p className="text-sm text-amber-700 flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    Copy this key now. It won't be shown again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white p-2 rounded text-sm font-mono overflow-x-auto">
                      {createdKey}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdKey)}
                      className="p-2 bg-amber-100 rounded-lg hover:bg-amber-200 transition"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewKey(false)}
                  className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
                  <input
                    type="text"
                    value={newKeyData.name}
                    onChange={e => setNewKeyData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Production API"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                  <div className="space-y-2">
                    {PERMISSION_OPTIONS.map(perm => (
                      <label key={perm.value} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                        <input
                          type="checkbox"
                          checked={newKeyData.permissions.includes(perm.value)}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewKeyData(prev => ({ ...prev, permissions: [...prev.permissions, perm.value] }));
                            } else {
                              setNewKeyData(prev => ({ ...prev, permissions: prev.permissions.filter(p => p !== perm.value) }));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{perm.label}</p>
                          <p className="text-xs text-gray-500">{perm.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowNewKey(false)}
                    className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createApiKey}
                    disabled={saving || !newKeyData.name.trim()}
                    className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Key'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Webhook Modal */}
      {showNewWebhook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {createdSecret ? 'Webhook Created' : 'Create Webhook'}
            </h3>

            {createdSecret ? (
              <div>
                <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl mb-4">
                  <p className="text-sm text-purple-700 flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4" />
                    Save this signing secret to verify webhook requests.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white p-2 rounded text-sm font-mono overflow-x-auto">
                      {createdSecret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdSecret)}
                      className="p-2 bg-purple-100 rounded-lg hover:bg-purple-200 transition"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewWebhook(false)}
                  className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                  <input
                    type="url"
                    value={newWebhookData.url}
                    onChange={e => setNewWebhookData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://your-app.com/webhook"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {WEBHOOK_EVENTS.map(event => (
                      <label key={event.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 text-sm">
                        <input
                          type="checkbox"
                          checked={newWebhookData.events.includes(event.value)}
                          onChange={e => {
                            if (e.target.checked) {
                              setNewWebhookData(prev => ({ ...prev, events: [...prev.events, event.value] }));
                            } else {
                              setNewWebhookData(prev => ({ ...prev, events: prev.events.filter(ev => ev !== event.value) }));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        {event.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowNewWebhook(false)}
                    className="flex-1 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={createWebhook}
                    disabled={saving || !newWebhookData.url.trim()}
                    className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Webhook'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
