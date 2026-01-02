'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { PageHeader, LoadingSpinner, AlertBox } from '@/components/admin/crm';

interface AutomationRule {
  _id: string;
  name: string;
  enabled: boolean;
  triggerType: 'welcome' | 'keyword' | 'chatbot' | 'scheduled' | string;
  keywords?: string[];
  actionType: 'send_text' | 'send_template' | 'update_lead' | string;
  actionText?: string;
  actionTemplateId?: string;
  throttleMinutesPerLead: number;
  createdAt: string;
  updatedAt: string;
}

interface ScheduledMessage {
  _id: string;
  name: string;
  leadPhoneNumber: string;
  leadName?: string;
  messageType: 'text' | 'template';
  messageContent: string;
  scheduledFor: string;
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
}

interface BroadcastList {
  _id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: string;
}

export default function AutomationPage() {
  const router = useRouter();
  const token = useAuth();
  // Ensure we don't recreate the `useCRM` options object every render.
  const crmOptions = useMemo(() => ({ token }), [token]);
  const crm = useCRM(crmOptions);

  // Prevent overlapping requests (can cause loading flicker + request storms).
  const inFlightRef = useRef<null | 'rules' | 'scheduled' | 'broadcast'>(null);

  // Guard against React StrictMode double-invoking effects in dev and any
  // accidental rerender loops. We only allow a fetch if (token, tab) changed.
  const lastFetchKeyRef = useRef<string>('');

  // Avoid redirecting during hydration. Wait for first client paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [activeTab, setActiveTab] = useState<'welcome' | 'keywords' | 'scheduled' | 'broadcast'>('welcome');
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [broadcastLists, setBroadcastLists] = useState<BroadcastList[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState('welcome');
  const [newRuleAction, setNewRuleAction] = useState('send_text');
  const [newRuleContent, setNewRuleContent] = useState('');

  const fetchRules = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = 'rules';
    try {
      setLoading(true);
      const result = await crm.fetch('/api/admin/crm/automations', {
        params: { limit: 50, skip: 0 },
      });
      setRules(result?.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rules');
    } finally {
      setLoading(false);
      inFlightRef.current = null;
    }
  }, [crm]);

  const fetchScheduledMessages = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = 'scheduled';
    try {
      setLoading(true);
      const result = await crm.fetch('/api/admin/crm/scheduled-messages', {
        params: { limit: 50, skip: 0 },
      });
      setScheduledMessages(result?.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scheduled messages');
    } finally {
      setLoading(false);
      inFlightRef.current = null;
    }
  }, [crm]);

  const fetchBroadcastLists = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = 'broadcast';
    try {
      setLoading(true);
      const result = await crm.fetch('/api/admin/crm/broadcast-lists', {
        params: { limit: 50, skip: 0 },
      });
      setBroadcastLists(result?.lists || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch broadcast lists');
    } finally {
      setLoading(false);
      inFlightRef.current = null;
    }
  }, [crm]);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const key = `${token}:welcome`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;
    void fetchRules();
  }, [mounted, token, router, fetchRules]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (!token) return;

    const key = `${token}:${tab}`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;

    if (tab === 'scheduled') void fetchScheduledMessages();
    else if (tab === 'broadcast') void fetchBroadcastLists();
    else void fetchRules();
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) {
      setError('Rule name is required');
      return;
    }

    try {
      await crm.fetch('/api/admin/crm/automations', {
        method: 'POST',
        body: {
          name: newRuleName,
          triggerType: newRuleTrigger,
          actionType: newRuleAction,
          actionText: newRuleContent,
          enabled: true,
        },
      });

      setSuccess('Automation rule created successfully!');
      setShowNewRuleModal(false);
      setNewRuleName('');
      setNewRuleAction('send_text');
      setNewRuleContent('');
      fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule');
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      setError(null);
      await crm.fetch(`/api/admin/crm/automations/${ruleId}`, {
        method: 'PUT',
        body: { enabled: !enabled },
      });
      setSuccess(enabled ? 'Rule disabled' : 'Rule enabled');
      fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      setError(null);
      await crm.fetch(`/api/admin/crm/automations/${ruleId}`, {
        method: 'DELETE',
      });
      setSuccess('Rule deleted successfully');
      fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  };

  const handleEditRule = (ruleId: string) => {
    // TODO: Implement edit rule modal
    setError('Edit rule coming soon');
  };

  if (!token) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="⚙️ WhatsApp Automation"
          subtitle="Welcome messages, keyword triggers, scheduled messages, and broadcasts"
        />

        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-purple-500/30 pb-4">
          {(['welcome', 'keywords', 'scheduled', 'broadcast'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all capitalize ${
                activeTab === tab
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-slate-700/50 text-purple-200 hover:bg-slate-700'
              }`}
            >
              {tab === 'welcome' && '👋'}
              {tab === 'keywords' && '🔑'}
              {tab === 'scheduled' && '📅'}
              {tab === 'broadcast' && '📢'}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Welcome Messages Tab */}
        {activeTab === 'welcome' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">👋 Welcome Messages</h3>
                  <p className="text-purple-200 text-sm">
                    Automatically send a message when a new contact first messages you
                  </p>
                </div>
                <button
                  onClick={() => setShowNewRuleModal(true)}
                  className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all"
                >
                  + Add Welcome Rule
                </button>
              </div>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : rules.filter((r) => r.triggerType === 'welcome').length === 0 ? (
              <div className="text-center py-12 text-purple-300">
                <p className="text-lg">No welcome rules configured yet</p>
                <p className="text-sm text-purple-400 mt-2">Create one to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules
                  .filter((r) => r.triggerType === 'welcome')
                  .map((rule) => (
                    <div
                      key={rule._id}
                      className="bg-slate-700/50 border border-emerald-500/30 rounded-xl p-6 hover:border-emerald-500/60 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-lg font-semibold text-white">{rule.name}</h4>
                        <button
                          onClick={() => handleToggleRule(rule._id, rule.enabled)}
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            rule.enabled
                              ? 'bg-green-500/20 text-green-200'
                              : 'bg-red-500/20 text-red-200'
                          }`}
                        >
                          {rule.enabled ? '✓ Active' : '✗ Inactive'}
                        </button>
                      </div>

                      <div className="space-y-2 text-sm text-purple-200 mb-4">
                        <p>
                          <strong>Action:</strong> {rule.actionType}
                        </p>
                        {rule.actionText && (
                          <p>
                            <strong>Message:</strong> {rule.actionText.substring(0, 100)}
                            {rule.actionText.length > 100 ? '...' : ''}
                          </p>
                        )}
                        <p>
                          <strong>Throttle:</strong> {rule.throttleMinutesPerLead} min per lead
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => handleEditRule(rule._id)}
                          className="flex-1 px-3 py-1 bg-blue-500/20 text-blue-200 rounded-lg text-sm hover:bg-blue-500/30 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteRule(rule._id)}
                          className="flex-1 px-3 py-1 bg-red-500/20 text-red-200 rounded-lg text-sm hover:bg-red-500/30 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Keyword Triggers Tab */}
        {activeTab === 'keywords' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">🔑 Keyword Triggers</h3>
                  <p className="text-purple-200 text-sm">
                    Reply automatically when customers use specific keywords
                  </p>
                </div>
                <button
                  onClick={() => setShowNewRuleModal(true)}
                  className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all"
                >
                  + Add Keyword Rule
                </button>
              </div>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : rules.filter((r) => r.triggerType === 'keyword').length === 0 ? (
              <div className="text-center py-12 text-purple-300">
                <p className="text-lg">No keyword rules configured yet</p>
                <p className="text-sm text-purple-400 mt-2">Create one to respond to customer keywords</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rules
                  .filter((r) => r.triggerType === 'keyword')
                  .map((rule) => (
                    <div
                      key={rule._id}
                      className="bg-slate-700/50 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/60 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-lg font-semibold text-white">{rule.name}</h4>
                        <button
                          onClick={() => handleToggleRule(rule._id, rule.enabled)}
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            rule.enabled
                              ? 'bg-green-500/20 text-green-200'
                              : 'bg-red-500/20 text-red-200'
                          }`}
                        >
                          {rule.enabled ? '✓ Active' : '✗ Inactive'}
                        </button>
                      </div>

                      {rule.keywords && rule.keywords.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-purple-300 mb-2">
                            <strong>Keywords:</strong>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {rule.keywords.map((kw) => (
                              <span key={kw} className="px-2 py-1 bg-blue-500/30 text-blue-200 rounded text-xs">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2 text-sm text-purple-200 mb-4">
                        <p>
                          <strong>Action:</strong> {rule.actionType}
                        </p>
                        {rule.actionText && (
                          <p>
                            <strong>Reply:</strong> {rule.actionText.substring(0, 80)}
                            {rule.actionText.length > 80 ? '...' : ''}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => handleEditRule(rule._id)}
                          className="flex-1 px-3 py-1 bg-blue-500/20 text-blue-200 rounded-lg text-sm hover:bg-blue-500/30 transition-colors cursor-pointer"
                        >
                          Edit
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteRule(rule._id)}
                          className="flex-1 px-3 py-1 bg-red-500/20 text-red-200 rounded-lg text-sm hover:bg-red-500/30 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Scheduled Messages Tab */}
        {activeTab === 'scheduled' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">📅 Scheduled Messages</h3>
                  <p className="text-purple-200 text-sm">
                    Send messages at specific times to individual contacts
                  </p>
                </div>
                <Link
                  href="/admin/crm/whatsapp"
                  className="px-6 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-all text-decoration-none"
                >
                  + Schedule Message
                </Link>
              </div>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : scheduledMessages.length === 0 ? (
              <div className="text-center py-12 text-purple-300">
                <p className="text-lg">No scheduled messages yet</p>
                <p className="text-sm text-purple-400 mt-2">Schedule one from WhatsApp dashboard</p>
              </div>
            ) : (
              <div className="bg-slate-700/50 border border-purple-500/20 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-purple-500/20 bg-slate-800/50">
                        <th className="px-6 py-3 text-left text-purple-200">Recipient</th>
                        <th className="px-6 py-3 text-left text-purple-200">Message</th>
                        <th className="px-6 py-3 text-left text-purple-200">Scheduled For</th>
                        <th className="px-6 py-3 text-left text-purple-200">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledMessages.map((msg) => (
                        <tr key={msg._id} className="border-b border-purple-500/10 hover:bg-slate-800/30">
                          <td className="px-6 py-3">
                            <div>
                              <p className="text-white font-semibold">{msg.leadName || msg.leadPhoneNumber}</p>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-purple-200">{msg.messageContent.substring(0, 50)}...</td>
                          <td className="px-6 py-3 text-purple-200">
                            {new Date(msg.scheduledFor).toLocaleString()}
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                msg.status === 'sent'
                                  ? 'bg-green-500/20 text-green-200'
                                  : msg.status === 'pending'
                                  ? 'bg-yellow-500/20 text-yellow-200'
                                  : 'bg-red-500/20 text-red-200'
                              }`}
                            >
                              {msg.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Broadcast Lists Tab */}
        {activeTab === 'broadcast' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">📢 Broadcast Lists</h3>
                  <p className="text-purple-200 text-sm">
                    Create groups of contacts for sending bulk messages
                  </p>
                </div>
                <Link
                  href="/admin/crm/whatsapp"
                  className="px-6 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-semibold transition-all text-decoration-none"
                >
                  + Create Broadcast
                </Link>
              </div>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : broadcastLists.length === 0 ? (
              <div className="text-center py-12 text-purple-300">
                <p className="text-lg">No broadcast lists yet</p>
                <p className="text-sm text-purple-400 mt-2">Create one to send messages to groups</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {broadcastLists.map((list) => (
                  <div
                    key={list._id}
                    className="bg-slate-700/50 border border-pink-500/30 rounded-xl p-6 hover:border-pink-500/60 transition-colors"
                  >
                    <h4 className="text-lg font-semibold text-white mb-2">{list.name}</h4>
                    {list.description && <p className="text-purple-200 text-sm mb-3">{list.description}</p>}

                    <div className="bg-slate-800/50 rounded-lg px-4 py-2 mb-4 text-center">
                      <p className="text-2xl font-bold text-pink-400">{list.memberCount}</p>
                      <p className="text-xs text-purple-300">Contacts</p>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => router.push(`/admin/crm/broadcast?listId=${list._id}`)}
                        className="flex-1 px-3 py-2 bg-blue-500/20 text-blue-200 rounded-lg text-sm hover:bg-blue-500/30 transition-colors cursor-pointer"
                      >
                        Send
                      </button>
                      <button 
                        type="button"
                        onClick={() => router.push(`/admin/crm/broadcast?listId=${list._id}&manage=true`)}
                        className="flex-1 px-3 py-2 bg-purple-500/20 text-purple-200 rounded-lg text-sm hover:bg-purple-500/30 transition-colors cursor-pointer"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Quick Links */}
        <div className="bg-slate-700/30 border border-purple-500/20 rounded-xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/crm/templates"
            className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-decoration-none"
          >
            <span className="text-2xl">📝</span>
            <div>
              <p className="font-semibold text-white">Message Templates</p>
              <p className="text-xs text-purple-300">Create & manage templates</p>
            </div>
          </Link>

          <Link
            href="/admin/crm/whatsapp"
            className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-decoration-none"
          >
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-semibold text-white">WhatsApp Dashboard</p>
              <p className="text-xs text-purple-300">Send & manage chats</p>
            </div>
          </Link>

          <Link
            href="/admin/crm/leads"
            className="flex items-center gap-3 p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors text-decoration-none"
          >
            <span className="text-2xl">👥</span>
            <div>
              <p className="font-semibold text-white">Manage Contacts</p>
              <p className="text-xs text-purple-300">View & edit contacts</p>
            </div>
          </Link>
        </div>
      </div>

      {/* New Rule Modal */}
      {showNewRuleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-purple-500/50 p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-6">Create Automation Rule</h2>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-purple-200 text-sm mb-2">Rule Name</label>
                <input
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g., Welcome New Customers"
                  className="w-full bg-slate-700 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-2">Trigger Type</label>
                <select
                  value={newRuleTrigger}
                  onChange={(e) => setNewRuleTrigger(e.target.value)}
                  className="w-full bg-slate-700 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="welcome">Welcome</option>
                  <option value="keyword">Keyword</option>
                  <option value="chatbot">Chatbot</option>
                </select>
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-2">Action Type</label>
                <select
                  value={newRuleAction}
                  onChange={(e) => setNewRuleAction(e.target.value)}
                  className="w-full bg-slate-700 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="send_text">Send Text</option>
                  <option value="send_template">Send Template</option>
                  <option value="update_lead">Update Lead</option>
                </select>
              </div>

              <div>
                <label className="block text-purple-200 text-sm mb-2">Message / Action</label>
                <textarea
                  value={newRuleContent}
                  onChange={(e) => setNewRuleContent(e.target.value)}
                  placeholder="Enter message text or action details"
                  className="w-full bg-slate-700 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 h-24 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewRuleModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
