'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { LoadingSpinner, AlertBox } from '@/components/admin/crm';

type Chatbot = {
  _id: string;
  name: string;
  enabled?: boolean;
  triggerType?: string;
  actionType?: string;
  actionText?: string;
  actionTemplateId?: string;
};

type Template = {
  _id: string;
  templateName: string;
  status?: string;
};

export default function ChatbotEditorPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });

  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChatbot, setSelectedChatbot] = useState<Chatbot | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    enabled: true,
    actionType: 'send_text',
    actionText: '',
    actionTemplateId: '',
  });

  const fetchChatbots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crm.fetch('/api/admin/crm/automations', {
        params: { limit: 200, skip: 0, triggerType: 'chatbot', enabled: 'all' },
      });
      setChatbots(Array.isArray(res?.rules) ? res.rules : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chatbots');
    } finally {
      setLoading(false);
    }
  }, [crm]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await crm.fetch('/api/admin/crm/templates', { params: { limit: 200, skip: 0 } });
      setTemplates(Array.isArray(res?.templates) ? res.templates : []);
    } catch {
      setTemplates([]);
    }
  }, [crm]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchChatbots();
    fetchTemplates();
  }, [token, router, fetchChatbots, fetchTemplates]);

  const saveChatbot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      setError('Chatbot name is required');
      return;
    }

    try {
      const body = {
        name: form.name,
        enabled: !!form.enabled,
        triggerType: 'chatbot',
        actionType: form.actionType,
        actionText: form.actionType === 'send_text' ? form.actionText : undefined,
        actionTemplateId: form.actionType === 'send_template' ? form.actionTemplateId : undefined,
      };

      if (selectedChatbot) {
        await crm.fetch(`/api/admin/crm/automations/${selectedChatbot._id}`, {
          method: 'PUT',
          body,
        });
        setSuccess('Chatbot updated!');
      } else {
        await crm.fetch('/api/admin/crm/automations', {
          method: 'POST',
          body,
        });
        setSuccess('Chatbot created!');
      }
      setShowForm(false);
      setSelectedChatbot(null);
      setForm({ name: '', enabled: true, actionType: 'send_text', actionText: '', actionTemplateId: '' });
      await fetchChatbots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save chatbot');
    }
  };

  const deleteChatbot = async (id: string) => {
    if (!confirm('Delete this chatbot?')) return;
    try {
      await crm.fetch(`/api/admin/crm/automations/${id}`, { method: 'DELETE' });
      setSuccess('Chatbot deleted!');
      await fetchChatbots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chatbot');
    }
  };

  const toggleChatbot = async (chatbot: Chatbot) => {
    try {
      await crm.fetch(`/api/admin/crm/automations/${chatbot._id}`, {
        method: 'PUT',
        body: { enabled: !chatbot.enabled },
      });
      await fetchChatbots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const openEdit = (c: Chatbot) => {
    setSelectedChatbot(c);
    setForm({
      name: c.name || '',
      enabled: typeof c.enabled === 'boolean' ? c.enabled : true,
      actionType: String(c.actionType || 'send_text'),
      actionText: c.actionText || '',
      actionTemplateId: c.actionTemplateId || '',
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setSelectedChatbot(null);
    setForm({ name: '', enabled: true, actionType: 'send_text', actionText: '', actionTemplateId: '' });
    setShowForm(true);
  };

  const filteredChatbots = chatbots.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* LEFT SIDEBAR */}
      <div className="w-64 bg-white border-r border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <Link
            href="/admin/crm/chatbots"
            className="flex items-center gap-2 text-[#1E7F43] hover:text-[#166235] font-semibold mb-4"
          >
            ← Back to Chatbots
          </Link>
          <h2 className="text-2xl font-bold text-gray-900">Chatbot Editor</h2>
          <p className="text-sm text-gray-600 mt-1">Create automation flows</p>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={openCreate}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-[#1E7F43] hover:bg-[#166235] text-white font-semibold"
          >
            <span>+</span> New Chatbot
          </button>

          <button
            onClick={fetchChatbots}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
          >
            <span>↻</span> Refresh
          </button>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-3">Status</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="rounded" defaultChecked />
                <span className="text-gray-700">Active Only</span>
              </label>
            </div>
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-gray-200 bg-white">
          <div className="text-sm text-gray-600">
            <p className="font-semibold text-gray-900">{filteredChatbots.length}</p>
            <p className="text-xs text-gray-500">Chatbots</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-8 py-4 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Chatbot Automation</h1>
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search chatbots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent text-sm"
              />
              <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold">
                🔍
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-auto p-8">
          {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
          {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

          {loading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner />
            </div>
          ) : showForm ? (
            // FORM VIEW
            <div className="max-w-3xl mx-auto">
              <form onSubmit={saveChatbot} className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {selectedChatbot ? 'Edit Chatbot' : 'Create New Chatbot'}
                </h2>

                <div className="space-y-6 mb-6">
                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-2">Chatbot Name *</span>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Welcome Message"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent text-sm"
                    />
                  </label>

                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-2">Status</span>
                    <select
                      value={form.enabled ? 'true' : 'false'}
                      onChange={(e) => setForm({ ...form, enabled: e.target.value === 'true' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent text-sm"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </label>

                  <label>
                    <span className="block text-sm font-semibold text-gray-700 mb-2">Action Type</span>
                    <select
                      value={form.actionType}
                      onChange={(e) =>
                        setForm({ ...form, actionType: e.target.value, actionText: '', actionTemplateId: '' })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent text-sm"
                    >
                      <option value="send_text">Send Text</option>
                      <option value="send_template">Send Template</option>
                    </select>
                  </label>

                  {form.actionType === 'send_text' ? (
                    <label>
                      <span className="block text-sm font-semibold text-gray-700 mb-2">Reply Text</span>
                      <textarea
                        rows={5}
                        value={form.actionText}
                        onChange={(e) => setForm({ ...form, actionText: e.target.value })}
                        placeholder="Enter the message text..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent text-sm"
                      />
                    </label>
                  ) : (
                    <label>
                      <span className="block text-sm font-semibold text-gray-700 mb-2">Select Template</span>
                      <select
                        value={form.actionTemplateId}
                        onChange={(e) => setForm({ ...form, actionTemplateId: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent text-sm"
                      >
                        <option value="">Choose a template...</option>
                        {templates
                          .filter((t) => String(t.status || '').toLowerCase() !== 'disabled')
                          .map((t) => (
                            <option key={t._id} value={t._id}>
                              {t.templateName}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold"
                  >
                    {selectedChatbot ? 'Update' : 'Create'} Chatbot
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // LIST VIEW
            <div>
              {filteredChatbots.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg mb-4">No chatbots yet</p>
                  <button
                    onClick={openCreate}
                    className="px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold"
                  >
                    Create First Chatbot
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredChatbots.map((chatbot) => (
                    <div
                      key={chatbot._id}
                      className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg p-6"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-900">{chatbot.name}</h3>
                          <p className="text-gray-600 text-sm mt-1">
                            {chatbot.actionType === 'send_template'
                              ? `Template: ${chatbot.actionTemplateId || '—'}`
                              : `Text: ${(chatbot.actionText || '').slice(0, 80)}${(chatbot.actionText || '').length > 80 ? '…' : ''}`}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleChatbot(chatbot)}
                            className={`px-4 py-2 rounded-lg font-semibold ${
                              chatbot.enabled
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {chatbot.enabled ? '✓ Active' : 'Inactive'}
                          </button>
                          <button
                            onClick={() => openEdit(chatbot)}
                            className="px-4 py-2 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteChatbot(chatbot._id)}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-semibold"
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
          )}
        </div>
      </div>
    </div>
  );
}
