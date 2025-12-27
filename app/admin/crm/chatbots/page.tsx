'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox, LoadingSpinner, PageHeader } from '@/components/admin/crm';

type ChatbotRule = {
  _id: string;
  name: string;
  enabled?: boolean;
  triggerType?: string;
  actionType?: string;
  actionText?: string;
  actionTemplateId?: string;
  conditions?: any;
};

type TemplateRow = {
  _id: string;
  templateName: string;
  category?: string;
  language?: string;
  status?: string;
  templateContent?: string;
};

export default function ChatbotsPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const [rules, setRules] = useState<ChatbotRule[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    enabled: true,
    actionType: 'send_text',
    actionText: '',
    actionTemplateId: '',
  });

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crmFetch('/api/admin/crm/automations', {
        params: { limit: 200, skip: 0, triggerType: 'chatbot', enabled: 'all' },
      });
      setRules(Array.isArray(res?.rules) ? res.rules : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chatbots');
    } finally {
      setLoading(false);
    }
  }, [crmFetch]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await crmFetch('/api/admin/crm/templates', { params: { limit: 200, skip: 0 } });
      setTemplates(Array.isArray(res?.templates) ? res.templates : []);
    } catch {
      setTemplates([]);
    }
  }, [crmFetch]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchRules();
    fetchTemplates();
  }, [token, router, fetchRules, fetchTemplates]);

  const templateOptions = useMemo(
    () => templates.filter((t) => String(t.status || '').toLowerCase() !== 'disabled'),
    [templates]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', enabled: true, actionType: 'send_text', actionText: '', actionTemplateId: '' });
    setModalOpen(true);
  };

  const openEdit = (r: ChatbotRule) => {
    setEditingId(r._id);
    setForm({
      name: r.name || '',
      enabled: typeof r.enabled === 'boolean' ? r.enabled : true,
      actionType: String(r.actionType || 'send_text'),
      actionText: String(r.actionText || ''),
      actionTemplateId: String(r.actionTemplateId || ''),
    });
    setModalOpen(true);
  };

  const save = async () => {
    try {
      setError(null);
      const name = form.name.trim();
      if (!name) throw new Error('Name is required');

      if (form.actionType === 'send_text' && !form.actionText.trim()) {
        throw new Error('Action text is required');
      }
      if (form.actionType === 'send_template' && !form.actionTemplateId) {
        throw new Error('Select a template');
      }

      if (!editingId) {
        await crmFetch('/api/admin/crm/automations', {
          method: 'POST',
          body: {
            name,
            enabled: !!form.enabled,
            triggerType: 'chatbot',
            actionType: form.actionType,
            actionText: form.actionType === 'send_text' ? form.actionText : undefined,
            actionTemplateId: form.actionType === 'send_template' ? form.actionTemplateId : undefined,
          },
        });
      } else {
        await crmFetch(`/api/admin/crm/automations/${editingId}`, {
          method: 'PUT',
          body: {
            name,
            enabled: !!form.enabled,
            triggerType: 'chatbot',
            actionType: form.actionType,
            actionText: form.actionType === 'send_text' ? form.actionText : undefined,
            actionTemplateId: form.actionType === 'send_template' ? form.actionTemplateId : undefined,
          },
        });
      }

      setModalOpen(false);
      setEditingId(null);
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this chatbot rule?')) return;
    try {
      await crmFetch(`/api/admin/crm/automations/${id}`, { method: 'DELETE' });
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const toggleEnabled = async (r: ChatbotRule) => {
    try {
      await crmFetch(`/api/admin/crm/automations/${r._id}`, {
        method: 'PUT',
        body: { enabled: !r.enabled },
      });
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="Chatbot Rules"
          subtitle="Manage automated chatbot responses for WhatsApp messages"
          action={
            <div className="flex gap-3">
              <Link
                href="/admin/crm/whatsapp"
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
              >
                ← WhatsApp
              </Link>
              <Link
                href="/admin/crm/chatbots/editor"
                className="px-4 py-2 rounded-lg bg-[#1E7F43] hover:bg-[#166235] text-white font-semibold"
              >
                + Create Chatbot
              </Link>
              <Link
                href="/admin/crm/chatbots/builder/new"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                🤖 Build Flow
              </Link>
            </div>
          }
        />

        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}

        <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          ) : rules.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-gray-600 text-lg mb-6">No chatbot rules yet</p>
              <button
                onClick={openCreate}
                className="px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold"
              >
                Create Your First Chatbot
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {rules.map((r) => (
                <div key={r._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{r.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {String(r.actionType || 'send_text') === 'send_template'
                          ? `📋 Send Template: ${r.actionTemplateId || 'Not set'}`
                          : `💬 Send Text: ${(r.actionText || '').slice(0, 80)}${(r.actionText || '').length > 80 ? '...' : ''}`}
                      </p>
                      {r.conditions && (
                        <p className="text-xs text-gray-500 mt-2">
                          ⚙️ Conditions: {JSON.stringify(r.conditions).slice(0, 100)}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleEnabled(r)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                          r.enabled
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {r.enabled ? '✓ Active' : '○ Inactive'}
                      </button>
                      <button
                        onClick={() => openEdit(r)}
                        className="px-4 py-2 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(r._id)}
                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? 'Edit Chatbot' : 'Create Chatbot'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {editingId ? 'Update chatbot settings' : 'Set up a new automated response'}
              </p>
            </div>

            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Chatbot Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Welcome Message"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Status
                </label>
                <select
                  value={form.enabled ? 'true' : 'false'}
                  onChange={(e) => setForm({ ...form, enabled: e.target.value === 'true' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                >
                  <option value="true">Enabled (Active)</option>
                  <option value="false">Disabled (Inactive)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Action Type
                </label>
                <select
                  value={form.actionType}
                  onChange={(e) => setForm({ ...form, actionType: e.target.value, actionText: '', actionTemplateId: '' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                >
                  <option value="send_text">Send Text Message</option>
                  <option value="send_template">Send Template</option>
                </select>
              </div>

              {form.actionType === 'send_text' ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Message Text
                  </label>
                  <textarea
                    placeholder="Enter the message to send..."
                    rows={4}
                    value={form.actionText}
                    onChange={(e) => setForm({ ...form, actionText: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Select Template
                  </label>
                  <select
                    value={form.actionTemplateId}
                    onChange={(e) => setForm({ ...form, actionTemplateId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                  >
                    <option value="">Choose a template...</option>
                    {templateOptions.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.templateName} {t.category ? `• ${t.category}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                className="px-6 py-2 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
