'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

  // Robustness guards: avoid loops caused by unstable object references.
  const crmOptions = useMemo(() => ({ token }), [token]);
  const crm = useCRM(crmOptions);

  const inFlightRef = useRef(false);
  const lastFetchKeyRef = useRef('');
  const mountCountRef = useRef(0);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    mountCountRef.current += 1;
  }, []);

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
    if (!token || inFlightRef.current) return;
    inFlightRef.current = true;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await crm.fetch('/api/admin/crm/automations', {
        params: { limit: 200, skip: 0, triggerType: 'chatbot', enabled: 'all' },
      });
      setChatbots(Array.isArray(res?.rules) ? res.rules : []);
    } catch (err) {
      console.error('Fetch chatbots error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chatbots');
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [crm.fetch, token]);

  const fetchTemplates = useCallback(async () => {
    if (!token) return;
    try {
      const res = await crm.fetch('/api/admin/crm/templates', { params: { limit: 200, skip: 0 } });
      setTemplates(Array.isArray(res?.templates) ? res.templates : []);
    } catch (err) {
      console.error('Fetch templates error:', err);
      setTemplates([]);
    }
  }, [crm.fetch, token]);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const key = `${token}:chatbot-editor-v2`;
    if (lastFetchKeyRef.current === key) return;
    lastFetchKeyRef.current = key;

    const load = async () => {
      try {
        await fetchChatbots();
        // small delay to prevent overlapping
        await new Promise(r => setTimeout(r, 500));
        await fetchTemplates();
      } catch (e) {
        console.error('Initial data load failed', e);
      }
    };
    load();
  }, [mounted, token, router, fetchChatbots, fetchTemplates]);


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
                        required
                        value={form.actionText}
                        onChange={(e) => setForm({ ...form, actionText: e.target.value })}
                        placeholder="Message to send"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent text-sm"
                      />
                    </label>
                  ) : (
                    <label>
                      <span className="block text-sm font-semibold text-gray-700 mb-2">Select Template</span>
                      <select
                        required
                        value={form.actionTemplateId}
                        onChange={(e) => setForm({ ...form, actionTemplateId: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent text-sm"
                      >
                        <option value="">Choose a template...</option>
                        {templates.map((t) => (
                          <option key={t._id} value={t._id}>
                            {t.templateName}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="flex gap-4 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold shadow-md"
                  >
                    {selectedChatbot ? 'Update Chatbot' : 'Create Chatbot'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // LIST VIEW
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredChatbots.length === 0 ? (
                <div className="col-span-full bg-white rounded-xl p-12 text-center border border-dashed border-gray-300">
                  <p className="text-gray-500">No chatbots found matching your search.</p>
                </div>
              ) : (
                filteredChatbots.map((c) => (
                  <div key={c._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg text-gray-900 truncate pr-2">{c.name}</h3>
                      <button
                        onClick={() => toggleChatbot(c)}
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          c.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {c.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    <div className="flex-1 space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="font-semibold px-2 py-0.5 bg-gray-100 rounded text-[10px] uppercase">
                          {c.actionType}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-3 italic">
                        {c.actionType === 'send_text' ? c.actionText : `Template: ${c.actionTemplateId}`}
                      </p>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-gray-100 mt-auto">
                      <button
                        onClick={() => openEdit(c)}
                        className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteChatbot(c._id)}
                        className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
