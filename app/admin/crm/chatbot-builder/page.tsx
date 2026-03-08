'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { AlertBox, LoadingSpinner, PageHeader } from '@/components/admin/crm';

type ChatbotFlow = {
  _id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  startNodeId?: string;
  nodes?: Array<{
    nodeId: string;
    type: string;
    messageText?: string;
    questionText?: string;
    options?: Array<{ label: string; value: string; nextNodeId?: string }>;
    nextNodeId?: string;
    delaySeconds?: number;
    assignLabels?: string[];
  }>;
  createdAt?: string;
  updatedAt?: string;
};

export default function ChatbotBuilderPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDesc, setNewFlowDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await crmFetch('/api/admin/crm/chatbot-flows', { params: { limit: 100, skip: 0 } });
      setFlows(Array.isArray(res?.flows) ? res.flows : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flows');
    } finally {
      setLoading(false);
    }
  }, [crmFetch]);

  useEffect(() => {
    if (!token) {
      router.push(getLoginPath());
      return;
    }
    fetchFlows();
  }, [token, router, fetchFlows]);

  const createFlow = async () => {
    const name = newFlowName.trim();
    if (!name) {
      setError('Flow name is required');
      return;
    }
    try {
      setCreating(true);
      setError(null);
      const created = await crmFetch('/api/admin/crm/chatbot-flows', {
        method: 'POST',
        body: { name, description: newFlowDesc, enabled: true, nodes: [] },
      });
      // Redirect to visual builder
      router.push(`/admin/crm/chatbots/builder/${created._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create flow');
      setCreating(false);
    }
  };

  const toggleFlowEnabled = async (flow: ChatbotFlow) => {
    try {
      await crmFetch(`/api/admin/crm/chatbot-flows/${flow._id}`, {
        method: 'PUT',
        body: { enabled: !flow.enabled },
      });
      setFlows(prev => prev.map(f => f._id === flow._id ? { ...f, enabled: !f.enabled } : f));
    } catch (err) {
      setError('Failed to update flow');
    }
  };

  const deleteFlow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this flow?')) return;
    try {
      await crmFetch(`/api/admin/crm/chatbot-flows/${id}`, { method: 'DELETE' });
      setFlows(prev => prev.filter(f => f._id !== id));
    } catch (err) {
      setError('Failed to delete flow');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader 
        title="Chatbot Flow Builder" 
        subtitle={`${flows.length} flows`}
      />

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6">
            <AlertBox type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/crm/chatbots"
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ← Back to Chatbots
            </Link>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center gap-2"
          >
            <span>➕</span> Create New Flow
          </button>
        </div>

        {/* Flows Grid */}
        {flows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Chatbot Flows Yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first automated conversation flow with our visual builder
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
            >
              Create First Flow
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {flows.map((flow) => (
              <div
                key={flow._id}
                className="bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{flow.name}</h3>
                      {flow.description && (
                        <p className="text-sm text-gray-500 line-clamp-2">{flow.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleFlowEnabled(flow)}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        flow.enabled 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {flow.enabled ? '✅ Active' : '❌ Inactive'}
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                    <span>📊 {flow.nodes?.length || 0} nodes</span>
                    {flow.updatedAt && (
                      <span>🕐 {new Date(flow.updatedAt).toLocaleDateString()}</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/admin/crm/chatbots/builder/${flow._id}`}
                      className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold text-center"
                    >
                      ✏️ Edit Flow
                    </Link>
                    <button
                      onClick={() => deleteFlow(flow._id)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold border border-red-200"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Flow</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Flow Name *
                  </label>
                  <input
                    value={newFlowName}
                    onChange={(e) => setNewFlowName(e.target.value)}
                    placeholder="e.g. Welcome Flow"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newFlowDesc}
                    onChange={(e) => setNewFlowDesc(e.target.value)}
                    placeholder="What does this flow do?"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewFlowName('');
                    setNewFlowDesc('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createFlow}
                  disabled={creating || !newFlowName.trim()}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create & Open Builder'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
