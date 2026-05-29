'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox, LoadingSpinner, PageHeader } from '@/components/admin/crm';

type ChatbotFlow = {
  _id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  nodes?: any[];
  triggerKeywords?: string[];
  createdAt: string;
};

const QR_CHATBOT_TYPES = [
  {
    id: 'flow-builder',
    icon: '🔀',
    title: 'Flow Builder',
    description: 'Visual chatbot flow creator — messages sent via QR WhatsApp bridge',
    link: '/admin/crm/qr/chatbot/builder/new',
    color: 'from-green-500 to-emerald-600',
    features: ['Visual Flow Chart', 'Multiple Node Types', 'Button Choices', 'Delay & Timer'],
  },
  {
    id: 'keyword-triggers',
    icon: '🔑',
    title: 'Keyword Triggers',
    description: 'Auto-start a flow when a contact sends a specific word',
    link: '/admin/crm/qr/chatbot/builder/new',
    color: 'from-teal-500 to-cyan-600',
    features: ['Welcome Word', 'FAQ Shortcuts', 'Any Language', 'Exact Match'],
  },
  {
    id: 'qr-inbox',
    icon: '📥',
    title: 'QR Inbox',
    description: 'View and reply to all QR WhatsApp conversations',
    link: '/admin/crm/qr',
    color: 'from-sky-500 to-blue-600',
    features: ['Live Inbox', 'Manual Replies', 'Chat History', 'Lead Context'],
  },
];

export default function QrChatbotPage() {
  const router = useRouter();
  const token = useAuth();

  const crmOptions = useMemo(() => ({ token: token || '' }), [token]);
  const crm = useCRM(crmOptions);
  const crmFetchRef = useRef(crm.fetch);

  useEffect(() => {
    crmFetchRef.current = crm.fetch;
  }, [crm.fetch]);

  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await crmFetchRef.current('/api/admin/crm/qr/chatbot-flows', { params: { limit: 100 } });
      setFlows(Array.isArray(res?.flows) ? res.flows : []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch QR chatbot flows:', err);
      setError('Failed to load flows. Please try again.');
      setFlows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchFlows();
  }, [token, fetchFlows]);

  const duplicateFlow = useCallback(async (flowId: string) => {
    if (duplicating) return;
    setDuplicating(flowId);
    try {
      const res = await crmFetchRef.current(`/api/admin/crm/qr/chatbot-flows/${flowId}/duplicate`, { method: 'POST' });
      if (res?._id) {
        await fetchFlows();
        router.push(`/admin/crm/qr/chatbot/builder/${res._id}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to duplicate flow');
    } finally {
      setDuplicating(null);
    }
  }, [duplicating, fetchFlows, router]);

  const deleteFlow = useCallback(async (flowId: string, flowName: string) => {
    if (deleting) return;
    if (!confirm(`Delete flow "${flowName}"? This cannot be undone.`)) return;
    setDeleting(flowId);
    try {
      await crmFetchRef.current(`/api/admin/crm/qr/chatbot-flows/${flowId}`, { method: 'DELETE' });
      await fetchFlows();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete flow');
    } finally {
      setDeleting(null);
    }
  }, [deleting, fetchFlows]);

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-sm text-gray-500">Verifying authentication...</div>
      </div>
    );
  }

  const activeFlows = flows.filter((f) => f.enabled).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <PageHeader
          title="📱 QR Chatbot"
          subtitle="Automated reply flows sent via QR WhatsApp bridge — completely separate from Meta"
          action={
            <div className="flex gap-3">
              <Link
                href="/admin/crm/qr"
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
              >
                ← QR WhatsApp
              </Link>
              <Link
                href="/admin/crm/qr/chatbot/builder/new"
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                + New Flow
              </Link>
            </div>
          }
        />

        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}

        {/* Info banner */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <p className="font-semibold text-green-800">QR WhatsApp only</p>
            <p className="text-sm text-green-700">
              These flows send via your EC2 Baileys bridge. They have no connection to Meta WhatsApp or Meta chatbots.
              Buttons are sent as WhatsApp list messages (most devices) or numbered text (fallback).
            </p>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-3xl font-bold text-green-600">{flows.length}</div>
              <div className="text-sm text-gray-600">QR Chatbot Flows</div>
              <div className="text-xs text-green-600 mt-1">{activeFlows} active</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-3xl font-bold text-teal-600">
                {flows.reduce((s, f) => s + (f.triggerKeywords?.length || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Keyword Triggers</div>
              <div className="text-xs text-teal-600 mt-1">Across all flows</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="text-3xl font-bold text-sky-600">
                {flows.reduce((s, f) => s + (f.nodes?.length || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Nodes</div>
              <div className="text-xs text-sky-600 mt-1">Messages + actions</div>
            </div>
          </div>
        )}

        {/* Feature Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {QR_CHATBOT_TYPES.map((type) => (
            <Link
              key={type.id}
              href={type.link}
              className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all hover:border-gray-300"
            >
              <div className={`bg-gradient-to-r ${type.color} p-6 text-white`}>
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{type.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold">{type.title}</h3>
                    <p className="text-white/80 text-sm">{type.description}</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {type.features.map((feature, i) => (
                    <span key={i} className="px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                      {feature}
                    </span>
                  ))}
                </div>
                <div className="mt-4 text-right">
                  <span className="text-sm font-semibold text-green-600 group-hover:text-green-800">Open →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* All Flows Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">🔀 Your QR Chatbot Flows</h2>
            <span className="text-sm text-gray-500">{flows.length} flow{flows.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* + New Flow Card */}
              <Link
                href="/admin/crm/qr/chatbot/builder/new"
                className="flex flex-col items-center justify-center gap-3 p-8 bg-white rounded-xl border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 transition-all group min-h-[160px]"
              >
                <div className="w-14 h-14 rounded-full bg-green-100 group-hover:bg-green-200 flex items-center justify-center transition-colors">
                  <span className="text-3xl text-green-600">+</span>
                </div>
                <span className="text-sm font-bold text-green-600 group-hover:text-green-700">Create New Flow</span>
              </Link>

              {flows.map((flow) => (
                <div key={flow._id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all flex flex-col">
                  <Link href={`/admin/crm/qr/chatbot/builder/${flow._id}`} className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 truncate">{flow.name}</h3>
                        {flow.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{flow.description}</p>}
                      </div>
                      <span className={`ml-2 shrink-0 px-2 py-1 rounded text-[10px] font-bold ${
                        flow.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {flow.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <span className="text-green-500">◆</span> {flow.nodes?.length || 0} nodes
                      </span>
                      {flow.triggerKeywords && flow.triggerKeywords.length > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="text-teal-500">🔑</span> {flow.triggerKeywords.slice(0, 2).join(', ')}
                          {flow.triggerKeywords.length > 2 && ` +${flow.triggerKeywords.length - 2}`}
                        </span>
                      )}
                      <span>{new Date(flow.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <Link
                      href={`/admin/crm/qr/chatbot/builder/${flow._id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      onClick={(e) => { e.preventDefault(); duplicateFlow(flow._id); }}
                      disabled={duplicating === flow._id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors disabled:opacity-50"
                    >
                      {duplicating === flow._id ? '...' : '📋 Copy'}
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); deleteFlow(flow._id, flow.name); }}
                      disabled={deleting === flow._id}
                      className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {deleting === flow._id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="bg-gradient-to-r from-green-900 to-emerald-900 rounded-xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">🔄 How QR Chatbot Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-2">📱</div>
              <h3 className="font-bold">1. Message Received</h3>
              <p className="text-white/70 text-sm">Contact sends a message to your QR WhatsApp number</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🔑</div>
              <h3 className="font-bold">2. Keyword Match</h3>
              <p className="text-white/70 text-sm">System checks if the message matches a trigger keyword</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">🔀</div>
              <h3 className="font-bold">3. Run Flow</h3>
              <p className="text-white/70 text-sm">Matched flow executes — messages, buttons, delays</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-2">✅</div>
              <h3 className="font-bold">4. Auto-Reply via Bridge</h3>
              <p className="text-white/70 text-sm">Replies sent through your EC2 Baileys bridge, never Meta</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
