'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { PageHeader, LoadingSpinner, AlertBox, TemplateSelector, type WhatsAppTemplate } from '@/components/admin/crm';

type FetchScope = 'page' | 'rules' | 'scheduled' | 'broadcast' | 'save' | null;

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
  messageType: 'text' | 'template' | 'media' | 'interactive';
  messageContent?: string;
  nextRunAt?: string;
  lastRunAt?: string;
  runCount?: number;
  maxRuns?: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';
  targetType?: 'leadIds' | 'filter';
  targetLeadIds?: string[];
  targetFilter?: Record<string, unknown>;
  recurrence?: {
    frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    interval?: number;
    weekdays?: number[];
    monthDays?: number[];
  };
  createdAt: string;
  updatedAt?: string;
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
  
  // loadingScope helps avoid the whole page flickering to a spinner for small actions
  const [loadingScope, setLoadingScope] = useState<FetchScope>('page');
  const loading = loadingScope === 'page';

  const [showNewRuleModal, setShowNewRuleModal] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleTrigger, setNewRuleTrigger] = useState('welcome');
  const [newRuleAction, setNewRuleAction] = useState('send_text');
  const [newRuleContent, setNewRuleContent] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleForm, setEditRuleForm] = useState({
    name: '',
    enabled: true,
    triggerType: 'welcome',
    keywords: '',
    actionType: 'send_text',
    actionText: '',
    actionTemplateId: '',
    throttleMinutesPerLead: 5,
  });

  // NOTE: Do not early-return before hook declarations (lint: rules-of-hooks).
  // We keep rendering guarded below, after ALL hooks are declared.

  const fetchRules = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = 'rules';
    try {
      setLoadingScope((s) => (s === 'page' ? 'page' : 'rules'));
      const result = await crm.fetch('/api/admin/crm/automations', {
        params: { limit: 100, skip: 0 },
      });
      setRules(result?.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rules');
    } finally {
      // Always clear loading state after fetch completes
      setLoadingScope(null);
      inFlightRef.current = null;
    }
  }, [crm.fetch]); // Only depend on fetch function identity

  const fetchScheduledMessages = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = 'scheduled';
    try {
      setLoadingScope((s) => (s === 'page' ? 'page' : 'scheduled'));
      const result = await crm.fetch('/api/admin/crm/scheduled-messages', {
        params: { limit: 100, skip: 0 },
      });
      // API returns { data: { jobs } } or { jobs }
      setScheduledMessages(result?.data?.jobs || result?.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch scheduled');
    } finally {
      // Always clear loading state after fetch completes
      setLoadingScope(null);
      inFlightRef.current = null;
    }
  }, [crm.fetch]);

  const fetchBroadcastLists = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = 'broadcast';
    try {
      setLoadingScope((s) => (s === 'page' ? 'page' : 'broadcast'));
      const result = await crm.fetch('/api/admin/crm/broadcast-lists', {
        params: { limit: 100, skip: 0 },
      });
      // API returns { data: { lists } } or { lists }
      setBroadcastLists(result?.data?.lists || result?.lists || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch broadcasts');
    } finally {
      // Always clear loading state after fetch completes
      setLoadingScope(null);
      inFlightRef.current = null;
    }
  }, [crm.fetch]);

  const initialFetchDoneRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      window.location.href = getLoginPath();
      return;
    }

    if (initialFetchDoneRef.current['welcome']) return;
    initialFetchDoneRef.current['welcome'] = true;

    setLoadingScope('page');
    void fetchRules();
  }, [mounted, token, router, fetchRules]);

  // Render guard (after hooks): avoid SSR/hydration issues and show spinner until auth known.
  if (!mounted || !token) {
    return <LoadingSpinner />;
  }

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (!token) return;

    if (initialFetchDoneRef.current[tab]) return;
    initialFetchDoneRef.current[tab] = true;

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
      setLoadingScope('save');
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
    } finally {
      setLoadingScope('page');
    }
  };

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      setError(null);
      setLoadingScope('save');
      await crm.fetch(`/api/admin/crm/automations/${ruleId}`, {
        method: 'PUT',
        body: { enabled: !enabled },
      });
      setSuccess(enabled ? 'Rule disabled' : 'Rule enabled');
      fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    } finally {
      setLoadingScope('page');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      setError(null);
      setLoadingScope('save');
      await crm.fetch(`/api/admin/crm/automations/${ruleId}`, {
        method: 'DELETE',
      });
      setSuccess('Rule deleted successfully');
      fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    } finally {
      setLoadingScope('page');
    }
  };

  const handleEditRule = (ruleId: string) => {
    const r = rules.find((x) => x._id === ruleId);
    if (!r) return;

    setEditingRuleId(ruleId);
    setEditRuleForm({
      name: r.name || '',
      enabled: !!r.enabled,
      triggerType: String(r.triggerType || 'welcome'),
      keywords: Array.isArray(r.keywords) ? r.keywords.join(', ') : '',
      actionType: String(r.actionType || 'send_text'),
      actionText: String(r.actionText || ''),
      actionTemplateId: String(r.actionTemplateId || ''),
      throttleMinutesPerLead: typeof r.throttleMinutesPerLead === 'number' ? r.throttleMinutesPerLead : 5,
    });
    setShowEditModal(true);
  };

  const handleSaveEditRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRuleId) return;

    try {
      setError(null);
      setLoadingScope('save');

      const name = editRuleForm.name.trim();
      if (!name) throw new Error('Rule name is required');

      const triggerType = String(editRuleForm.triggerType || 'welcome');
      const actionType = String(editRuleForm.actionType || 'send_text');

      const body: any = {
        name,
        enabled: !!editRuleForm.enabled,
        triggerType,
        actionType,
        throttleMinutesPerLead: Math.max(0, Number(editRuleForm.throttleMinutesPerLead) || 0),
      };

      if (triggerType === 'keyword') {
        const keywords = editRuleForm.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean);
        body.keywords = keywords;
      }

      if (actionType === 'send_text') {
        const txt = editRuleForm.actionText.trim();
        if (!txt) throw new Error('Action text is required');
        body.actionText = txt;
      }

      if (actionType === 'send_template') {
        if (!editRuleForm.actionTemplateId) throw new Error('Template ID is required');
        body.actionTemplateId = editRuleForm.actionTemplateId;
      }

      await crm.fetch(`/api/admin/crm/automations/${editingRuleId}`, {
        method: 'PUT',
        body,
      });

      setShowEditModal(false);
      setEditingRuleId(null);
      setSuccess('Rule updated');
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    } finally {
      setLoadingScope('page');
    }
  };

  // Scheduled Job Action Handlers
  const handleScheduledJobAction = async (jobId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      setError(null);
      setLoadingScope('save');
      await crm.fetch(`/api/admin/crm/scheduled-messages/${jobId}`, {
        method: 'PUT',
        body: { action },
      });
      setSuccess(`Job ${action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'cancelled'}`);
      fetchScheduledMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} job`);
    } finally {
      setLoadingScope('page');
    }
  };

  const handleDeleteScheduledJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled job?')) return;
    try {
      setError(null);
      setLoadingScope('save');
      await crm.fetch(`/api/admin/crm/scheduled-messages/${jobId}`, {
        method: 'DELETE',
      });
      setSuccess('Scheduled job deleted');
      fetchScheduledMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete job');
    } finally {
      setLoadingScope('page');
    }
  };

  return (
    <div className="dark-theme min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="⚙️ WhatsApp Automation"
          subtitle="Welcome messages, keyword triggers, scheduled messages, and broadcasts"
        />

        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Edit Rule Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-purple-500/30 bg-slate-900 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20">
                <div>
                  <h3 className="text-lg font-extrabold text-white">Edit Automation Rule</h3>
                  <p className="text-xs text-purple-200">Update trigger + action settings</p>
                </div>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingRuleId(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-white text-sm"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleSaveEditRule} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="rule-name" className="block text-sm font-bold text-purple-100 mb-2">Rule Name</label>
                    <input
                      id="rule-name"
                      name="ruleName"
                      value={editRuleForm.name}
                      onChange={(e) => setEditRuleForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-purple-500/20 text-white"
                      placeholder="Rule name"
                    />
                  </div>

                  <div className="flex items-end gap-4">
                    <label htmlFor="edit-enabled" className="flex items-center gap-3">
                      <input
                        id="edit-enabled"
                        name="enabled"
                        type="checkbox"
                        checked={editRuleForm.enabled}
                        onChange={(e) => setEditRuleForm((p) => ({ ...p, enabled: e.target.checked }))}
                        className="w-5 h-5"
                      />
                      <span className="text-sm font-bold text-purple-100">Enabled</span>
                    </label>
                  </div>

                  <div>
                    <label htmlFor="trigger-type" className="block text-sm font-bold text-purple-100 mb-2">Trigger</label>
                    <select
                      id="trigger-type"
                      name="triggerType"
                      value={editRuleForm.triggerType}
                      onChange={(e) => setEditRuleForm((p) => ({ ...p, triggerType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-purple-500/20 text-white"
                    >
                      <option value="welcome">Welcome</option>
                      <option value="keyword">Keyword</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="chatbot">Chatbot</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="throttle-minutes" className="block text-sm font-bold text-purple-100 mb-2">Throttle minutes (per lead)</label>
                    <input
                      id="throttle-minutes"
                      name="throttleMinutes"
                      type="number"
                      min={0}
                      value={String(editRuleForm.throttleMinutesPerLead ?? 0)}
                      onChange={(e) =>
                        setEditRuleForm((p) => ({ ...p, throttleMinutesPerLead: Number(e.target.value) }))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-purple-500/20 text-white"
                    />
                  </div>

                  {editRuleForm.triggerType === 'keyword' && (
                    <div className="md:col-span-2">
                      <label htmlFor="edit-keywords" className="block text-sm font-bold text-purple-100 mb-2">Keywords</label>
                      <input
                        id="edit-keywords"
                        name="keywords"
                        value={editRuleForm.keywords}
                        onChange={(e) => setEditRuleForm((p) => ({ ...p, keywords: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-purple-500/20 text-white"
                        placeholder="comma separated keywords"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="edit-action-type" className="block text-sm font-bold text-purple-100 mb-2">Action Type</label>
                    <select
                      id="edit-action-type"
                      name="actionType"
                      value={editRuleForm.actionType}
                      onChange={(e) => setEditRuleForm((p) => ({ ...p, actionType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-purple-500/20 text-white"
                    >
                      <option value="send_text">Send Text</option>
                      <option value="send_template">Send Template</option>
                    </select>
                  </div>

                  {editRuleForm.actionType === 'send_template' ? (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-purple-100 mb-2">Select Template</label>
                      <TemplateSelector
                        token={token}
                        selectedTemplateId={editRuleForm.actionTemplateId}
                        onSelect={(template: WhatsAppTemplate) => {
                          setEditRuleForm((p) => ({ ...p, actionTemplateId: template._id }));
                        }}
                        showSearch={true}
                        showFilters={false}
                        showPreview={true}
                        mode="inline"
                        maxHeight="300px"
                        className="rounded-lg bg-slate-800/50 border border-purple-500/20"
                        provider="meta"
                      />
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <label htmlFor="edit-action-text" className="block text-sm font-bold text-purple-100 mb-2">Message Text</label>
                      <textarea
                        id="edit-action-text"
                        name="actionText"
                        value={editRuleForm.actionText}
                        onChange={(e) => setEditRuleForm((p) => ({ ...p, actionText: e.target.value }))}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-purple-500/20 text-white"
                        placeholder="Message to send"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingRuleId(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-white font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-extrabold"
                    disabled={loadingScope === 'save'}
                  >
                    {loadingScope === 'save' ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                          className="flex-1 px-3 py-1 bg-indigo-500/20 text-indigo-200 rounded-lg text-sm hover:bg-indigo-500/30 transition-colors cursor-pointer"
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
            <div className="bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">🔑 Keyword Triggers</h3>
                  <p className="text-purple-200 text-sm">
                    Reply automatically when customers use specific keywords
                  </p>
                </div>
                <button
                  onClick={() => setShowNewRuleModal(true)}
                  className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all"
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
                      className="bg-slate-700/50 border border-indigo-500/30 rounded-xl p-6 hover:border-indigo-500/60 transition-colors"
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
                              <span key={kw} className="px-2 py-1 bg-indigo-500/30 text-indigo-200 rounded text-xs">
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
                          className="flex-1 px-3 py-1 bg-indigo-500/20 text-indigo-200 rounded-lg text-sm hover:bg-indigo-500/30 transition-colors cursor-pointer"
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
                <p className="text-sm text-purple-400 mt-2">Schedule one from the WhatsApp inbox (open a lead → Schedule/Delay)</p>
              </div>
            ) : (
              <div className="bg-slate-700/50 border border-purple-500/20 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-purple-500/20 bg-slate-800/50">
                        <th className="px-6 py-3 text-left text-purple-200">Name</th>
                        <th className="px-6 py-3 text-left text-purple-200">Message</th>
                        <th className="px-6 py-3 text-left text-purple-200">Next Run</th>
                        <th className="px-6 py-3 text-left text-purple-200">Recurrence</th>
                        <th className="px-6 py-3 text-left text-purple-200">Status</th>
                        <th className="px-6 py-3 text-left text-purple-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scheduledMessages.map((msg) => (
                        <tr key={msg._id} className="border-b border-purple-500/10 hover:bg-slate-800/30">
                          <td className="px-6 py-3">
                            <div>
                              <p className="text-white font-semibold">{msg.name || 'Untitled Job'}</p>
                              <p className="text-xs text-purple-400">
                                {msg.targetLeadIds?.length || 0} recipients
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-purple-200">
                            {(msg.messageContent || '').substring(0, 50)}
                            {(msg.messageContent?.length || 0) > 50 ? '...' : ''}
                          </td>
                          <td className="px-6 py-3 text-purple-200">
                            {msg.nextRunAt ? new Date(msg.nextRunAt).toLocaleString() : '—'}
                          </td>
                          <td className="px-6 py-3 text-purple-200 text-xs">
                            {msg.recurrence?.frequency === 'none' || !msg.recurrence?.frequency
                              ? 'One-time'
                              : `${msg.recurrence.frequency}${msg.recurrence.interval && msg.recurrence.interval > 1 ? ` (every ${msg.recurrence.interval})` : ''}`}
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                msg.status === 'completed'
                                  ? 'bg-green-500/20 text-green-200'
                                  : msg.status === 'active'
                                  ? 'bg-yellow-500/20 text-yellow-200'
                                  : msg.status === 'paused'
                                  ? 'bg-indigo-500/20 text-indigo-200'
                                  : 'bg-red-500/20 text-red-200'
                              }`}
                            >
                              {msg.status}
                            </span>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {msg.status === 'active' && (
                                <button
                                  type="button"
                                  onClick={() => handleScheduledJobAction(msg._id, 'pause')}
                                  className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-200 rounded hover:bg-yellow-500/30 transition-colors"
                                >
                                  Pause
                                </button>
                              )}
                              {msg.status === 'paused' && (
                                <button
                                  type="button"
                                  onClick={() => handleScheduledJobAction(msg._id, 'resume')}
                                  className="px-2 py-1 text-xs bg-green-500/20 text-green-200 rounded hover:bg-green-500/30 transition-colors"
                                >
                                  Resume
                                </button>
                              )}
                              {(msg.status === 'active' || msg.status === 'paused') && (
                                <button
                                  type="button"
                                  onClick={() => handleScheduledJobAction(msg._id, 'cancel')}
                                  className="px-2 py-1 text-xs bg-orange-500/20 text-orange-200 rounded hover:bg-orange-500/30 transition-colors"
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteScheduledJob(msg._id)}
                                className="px-2 py-1 text-xs bg-red-500/20 text-red-200 rounded hover:bg-red-500/30 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
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
                  href="/admin/crm/broadcast"
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
                        onClick={() => window.location.href = `/admin/crm/broadcast?listId=${list._id}`}
                        className="flex-1 px-3 py-2 bg-indigo-500/20 text-indigo-200 rounded-lg text-sm hover:bg-indigo-500/30 transition-colors cursor-pointer"
                      >
                        Send
                      </button>
                      <button 
                        type="button"
                        onClick={() => window.location.href = `/admin/crm/broadcast?listId=${list._id}&manage=true`}
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
                <label htmlFor="new-rule-name" className="block text-purple-200 text-sm mb-2">Rule Name</label>
                <input
                  id="new-rule-name"
                  name="newRuleName"
                  type="text"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  placeholder="e.g., Welcome New Customers"
                  className="w-full bg-slate-700 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label htmlFor="new-trigger-type" className="block text-purple-200 text-sm mb-2">Trigger Type</label>
                <select
                  id="new-trigger-type"
                  name="newRuleTrigger"
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
                <label htmlFor="new-action-type" className="block text-purple-200 text-sm mb-2">Action Type</label>
                <select
                  id="new-action-type"
                  name="newRuleAction"
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
                <label htmlFor="new-rule-content" className="block text-purple-200 text-sm mb-2">Message / Action</label>
                <textarea
                  id="new-rule-content"
                  name="newRuleContent"
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
