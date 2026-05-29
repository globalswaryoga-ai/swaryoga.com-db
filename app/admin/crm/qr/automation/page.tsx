'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox, PageHeader } from '@/components/admin/crm';
import Link from 'next/link';

type Rule = {
  _id: string;
  name: string;
  enabled: boolean;
  triggerType: string;
  keywords?: string[];
  actionType: string;
  actionText?: string;
  throttleMinutesPerLead?: number;
};

type Tab = 'welcome' | 'keywords';

const BLANK_FORM = {
  name: '',
  triggerType: 'welcome' as Tab,
  keywords: '',
  actionText: '',
  throttleMinutesPerLead: 5,
  enabled: true,
};

export default function QrAutomationPage() {
  const token = useAuth();
  const crmOptions = useMemo(() => ({ token: token || '' }), [token]);
  const crm = useCRM(crmOptions);
  const crmRef = useRef(crm.fetch);
  useEffect(() => { crmRef.current = crm.fetch; }, [crm.fetch]);

  const [tab, setTab] = useState<Tab>('welcome');
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchRules = useCallback(async (triggerType?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (triggerType) params.triggerType = triggerType;
      const res = await crmRef.current('/api/admin/crm/qr/automations', { params });
      setRules(Array.isArray(res?.rules) ? res.rules : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRules(tab);
  }, [tab, fetchRules]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...BLANK_FORM, triggerType: tab });
    setShowForm(true);
  };

  const openEdit = (rule: Rule) => {
    setEditingId(rule._id);
    setForm({
      name: rule.name,
      triggerType: rule.triggerType as Tab,
      keywords: Array.isArray(rule.keywords) ? rule.keywords.join(', ') : '',
      actionText: rule.actionText || '',
      throttleMinutesPerLead: rule.throttleMinutesPerLead ?? 5,
      enabled: rule.enabled,
    });
    setShowForm(true);
  };

  const saveRule = async () => {
    if (!form.name.trim()) { setError('Rule name is required'); return; }
    if (!form.actionText.trim()) { setError('Reply message is required'); return; }
    if (form.triggerType === 'keywords' && !form.keywords.trim()) { setError('At least one keyword is required'); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        enabled: form.enabled,
        triggerType: form.triggerType === 'keywords' ? 'keyword' : 'welcome',
        keywords: form.triggerType === 'keywords'
          ? form.keywords.split(',').map((k) => k.trim()).filter(Boolean)
          : [],
        actionType: 'send_text',
        actionText: form.actionText.trim(),
        throttleMinutesPerLead: Number(form.throttleMinutesPerLead) || 5,
      };

      if (editingId) {
        await crmRef.current(`/api/admin/crm/qr/automations/${editingId}`, { method: 'PUT', body: payload });
        setSuccess('Rule updated');
      } else {
        await crmRef.current('/api/admin/crm/qr/automations', { method: 'POST', body: payload });
        setSuccess('Rule created');
      }

      setShowForm(false);
      setEditingId(null);
      await fetchRules(tab);
    } catch (err: any) {
      setError(err?.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: Rule) => {
    try {
      await crmRef.current(`/api/admin/crm/qr/automations/${rule._id}`, {
        method: 'PUT',
        body: { enabled: !rule.enabled },
      });
      setRules((prev) => prev.map((r) => r._id === rule._id ? { ...r, enabled: !r.enabled } : r));
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle rule');
    }
  };

  const deleteRule = async (rule: Rule) => {
    if (!confirm(`Delete rule "${rule.name}"?`)) return;
    setDeleting(rule._id);
    try {
      await crmRef.current(`/api/admin/crm/qr/automations/${rule._id}`, { method: 'DELETE' });
      setRules((prev) => prev.filter((r) => r._id !== rule._id));
      setSuccess('Rule deleted');
    } catch (err: any) {
      setError(err?.message || 'Failed to delete rule');
    } finally {
      setDeleting(null);
    }
  };

  if (!token) return <div className="flex items-center justify-center min-h-screen"><div className="text-sm text-gray-500">Verifying...</div></div>;

  const tabRules = rules.filter((r) => {
    if (tab === 'welcome') return r.triggerType === 'welcome' || r.triggerType === 'greeting';
    if (tab === 'keywords') return r.triggerType === 'keyword';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="⚡ QR Automation"
          subtitle="Auto-reply rules for QR WhatsApp — sends via EC2 bridge, not Meta"
          action={
            <div className="flex gap-3">
              <Link href="/admin/crm/qr/chatbot" className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold">
                ← QR Chatbot
              </Link>
              <button
                onClick={openCreate}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                + Add Rule
              </button>
            </div>
          }
        />

        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

        {/* Info banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
          <span className="text-xl">📱</span>
          <div className="text-sm text-emerald-700">
            <strong>QR only:</strong> These rules send via your EC2 Baileys bridge. They run when a contact messages your QR WhatsApp number.
            Chatbot flows take priority — automation only fires if no chatbot flow is active.
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id: 'welcome' as Tab, icon: '👋', label: 'Welcome Messages' },
            { id: 'keywords' as Tab, icon: '🔑', label: 'Keywords' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {tab === 'welcome' && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-800 mb-1">👋 Welcome Messages</h3>
              <p className="text-sm text-gray-500">
                Automatically sent when a new contact messages your QR WhatsApp for the first time.
                Throttle prevents sending the same message twice within the configured window.
              </p>
            </div>
          )}
          {tab === 'keywords' && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-800 mb-1">🔑 Keyword Auto-Replies</h3>
              <p className="text-sm text-gray-500">
                Triggered when a contact sends a specific word or phrase. Use commas to add multiple keywords.
                These are simple text-match rules — for complex flows, use <Link href="/admin/crm/qr/chatbot" className="text-emerald-600 underline">QR Chatbot Flows</Link>.
              </p>
            </div>
          )}

          {/* Rules list */}
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : tabRules.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">{tab === 'welcome' ? '👋' : '🔑'}</div>
              <p className="text-gray-500 text-sm mb-4">No {tab === 'welcome' ? 'welcome' : 'keyword'} rules yet</p>
              <button
                onClick={openCreate}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm"
              >
                + Add {tab === 'welcome' ? 'Welcome Rule' : 'Keyword Rule'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tabRules.map((rule) => (
                <div key={rule._id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{rule.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>{rule.enabled ? '✓ Active' : 'Off'}</span>
                    </div>
                    {rule.triggerType === 'keyword' && Array.isArray(rule.keywords) && rule.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {rule.keywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full">{kw}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-gray-600 line-clamp-2">{rule.actionText}</p>
                    <p className="text-xs text-gray-400 mt-1">Throttle: {rule.throttleMinutesPerLead ?? 5} min per contact</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => toggleRule(rule)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        rule.enabled
                          ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                          : 'bg-green-50 text-green-700 hover:bg-green-100'
                      }`}
                    >
                      {rule.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => openEdit(rule)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteRule(rule)}
                      disabled={deleting === rule._id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {deleting === rule._id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingId ? 'Edit' : 'New'} {form.triggerType === 'keywords' ? 'Keyword' : 'Welcome'} Rule
                </h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Rule Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="e.g. Welcome new contact"
                />
              </label>

              {/* Trigger type selector (only for new rules) */}
              {!editingId && (
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">Trigger Type</span>
                  <select
                    value={form.triggerType}
                    onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value as Tab }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="welcome">👋 Welcome — first message from new contact</option>
                    <option value="keywords">🔑 Keyword — when contact sends specific word</option>
                  </select>
                </label>
              )}

              {(form.triggerType === 'keywords') && (
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700">Keywords (comma-separated)</span>
                  <input
                    value={form.keywords}
                    onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="e.g. hello, hi, namaste"
                  />
                </label>
              )}

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Reply Message</span>
                <p className="text-xs text-gray-400 mb-1">Use {'{'} Hello | Hi | Namaste {'}'} for random text (spintax)</p>
                <textarea
                  value={form.actionText}
                  onChange={(e) => setForm((f) => ({ ...f, actionText: e.target.value }))}
                  rows={4}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
                  placeholder="e.g. {Hello|Hi|Namaste}! Thanks for contacting Swar Yoga. Our team will reply soon."
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-gray-700">Throttle (minutes per contact)</span>
                <input
                  type="number"
                  value={form.throttleMinutesPerLead}
                  onChange={(e) => setForm((f) => ({ ...f, throttleMinutesPerLead: Number(e.target.value) }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  min={0}
                  max={10080}
                />
                <p className="text-xs text-gray-400 mt-1">Don't re-send to the same contact within this many minutes</p>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ruleEnabled"
                  checked={form.enabled}
                  onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="ruleEnabled" className="text-sm text-gray-700">Enabled (active immediately)</label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRule}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
