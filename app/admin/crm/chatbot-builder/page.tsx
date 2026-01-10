'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  startNodeId?: string;
  nodes?: Array<{
    nodeId: string;
    type: 'message' | 'question' | 'buttons' | 'template' | 'condition' | 'delay' | 'end' | 'label';
    messageText?: string;
    questionText?: string;
    questionType?: string;
    options?: Array<{ label: string; value: string; nextNodeId?: string }>;
    nextNodeId?: string;
    delaySeconds?: number;
    assignLabels?: string[];
    timerMinutes?: number;
    timerAction?: string;
    templateName?: string;
    conditionField?: string;
    conditionOp?: string;
    conditionValue?: string;
  }>;
};

export default function ChatbotBuilderPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFlow, setSelectedFlow] = useState<ChatbotFlow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  const [flowName, setFlowName] = useState('');
  const [flowDesc, setFlowDesc] = useState('');

  const [nodeType, setNodeType] = useState<
    'message' | 'question' | 'buttons' | 'template' | 'condition' | 'label' | 'delay' | 'end'
  >('message');
  const [nodeText, setNodeText] = useState('');
  const [nodeDelay, setNodeDelay] = useState('0');
  const [nodeTimer, setNodeTimer] = useState('');
  const [nodeLabels, setNodeLabels] = useState('');
  const [nodeOptions, setNodeOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [nodeTemplateName, setNodeTemplateName] = useState('');
  const [nodeConditionField, setNodeConditionField] = useState('text');
  const [nodeConditionOp, setNodeConditionOp] = useState('contains');
  const [nodeConditionValue, setNodeConditionValue] = useState('');

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
      router.push('/admin/login');
      return;
    }
    fetchFlows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, router]);

  const createFlow = async () => {
    const name = flowName.trim();
    if (!name) {
      setError('Flow name is required');
      return;
    }
    try {
      setError(null);
      const created = await crmFetch('/api/admin/crm/chatbot-flows', {
        method: 'POST',
        body: { name, description: flowDesc, enabled: true, nodes: [] },
      });
      setFlows((prev) => [created, ...prev]);
      setSelectedFlow(created);
      setFlowName('');
      setFlowDesc('');
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create flow');
    }
  };

  const addNode = async () => {
    if (!selectedFlow) return;
    const text = nodeText.trim();

    const needsText = nodeType === 'message' || nodeType === 'question' || nodeType === 'buttons';
    if (needsText && !text) {
      setError('Node text is required');
      return;
    }

    if (nodeType === 'template' && !nodeTemplateName.trim()) {
      setError('Template name is required');
      return;
    }

    if (nodeType === 'condition' && !nodeConditionValue.trim()) {
      setError('Condition value is required');
      return;
    }

    try {
      setError(null);
      const nodeId = String(Date.now());
      const newNode: any = {
        nodeId,
        type: nodeType,
        delaySeconds: Number(nodeDelay || 0),
      };

      if (nodeType === 'message') {
        newNode.messageText = text;
      } else if (nodeType === 'question') {
        newNode.questionText = text;
        newNode.options = nodeOptions;
      } else if (nodeType === 'buttons') {
        newNode.messageText = text;
        newNode.options = nodeOptions;
      } else if (nodeType === 'template') {
        newNode.templateName = nodeTemplateName.trim();
        newNode.messageText = text || undefined;
      } else if (nodeType === 'delay') {
        // purely time-based node (delaySeconds)
        newNode.messageText = text || undefined;
      } else if (nodeType === 'condition') {
        newNode.conditionField = nodeConditionField;
        newNode.conditionOp = nodeConditionOp;
        newNode.conditionValue = nodeConditionValue.trim();
      } else if (nodeType === 'label') {
        if (!nodeLabels.trim()) {
          setError('Labels are required for label node');
          return;
        }
        newNode.assignLabels = nodeLabels.split(',').map((l) => l.trim()).filter(Boolean);
      } else if (nodeType === 'end') {
        newNode.messageText = text || undefined;
      }

      if (nodeTimer) newNode.timerMinutes = Number(nodeTimer);
      if (nodeLabels) newNode.assignLabels = nodeLabels.split(',').map((l) => l.trim());

      const updated = await crmFetch(`/api/admin/crm/chatbot-flows/${selectedFlow._id}`, {
        method: 'PUT',
        body: {
          nodes: [...(selectedFlow.nodes || []), newNode],
          startNodeId: selectedFlow.startNodeId || nodeId,
        },
      });

      setSelectedFlow(updated);
      setNodeText('');
      setNodeDelay('0');
      setNodeTimer('');
      setNodeLabels('');
      setNodeOptions([]);
      setNodeTemplateName('');
      setNodeConditionField('text');
      setNodeConditionOp('contains');
      setNodeConditionValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add node');
    }
  };

  const deleteNode = async (nodeId: string) => {
    if (!selectedFlow) return;
    try {
      setError(null);
      const updated = await crmFetch(`/api/admin/crm/chatbot-flows/${selectedFlow._id}`, {
        method: 'PUT',
        body: {
          nodes: (selectedFlow.nodes || []).filter((n) => n.nodeId !== nodeId),
        },
      });
      setSelectedFlow(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete node');
    }
  };

  const deleteFlow = async (id: string) => {
    if (!confirm('Delete this flow?')) return;
    try {
      setError(null);
      await crmFetch(`/api/admin/crm/chatbot-flows/${id}`, { method: 'DELETE' });
      setFlows((prev) => prev.filter((f) => f._id !== id));
      setSelectedFlow(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete flow');
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Chatbot Builder"
          subtitle="Create and manage chatbot conversation flows"
          action={
            <div className="flex gap-2">
              <Link
                href="/admin/crm/chatbot-settings"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Settings
              </Link>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-semibold"
              >
                {isEditing ? 'Cancel' : '+ New Flow'}
              </button>
            </div>
          }
        />

        {error ? <AlertBox type="error" message={error} onClose={() => setError(null)} /> : null}

        <div className="grid gap-6 grid-cols-3">
          {/* LEFT: Flows list */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-emerald-50">
            <h2 className="font-extrabold text-white mb-4">Flows</h2>

            {isEditing ? (
              <div className="space-y-3 mb-6 pb-6 border-b border-white/20">
                <input
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  placeholder="Flow name"
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <textarea
                  value={flowDesc}
                  onChange={(e) => setFlowDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                />
                <button
                  onClick={createFlow}
                  className="w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Create
                </button>
              </div>
            ) : null}

            {loading ? (
              <LoadingSpinner />
            ) : flows.length === 0 ? (
              <div className="text-emerald-50/80">No flows yet.</div>
            ) : (
              <div className="space-y-2">
                {flows.map((f) => (
                  <div
                    key={f._id}
                    className={`w-full text-left px-3 py-2 rounded-lg border ${
                      selectedFlow?._id === f._id
                        ? 'bg-emerald-600/40 border-emerald-400'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedFlow(f)}
                        className="flex-1 text-left"
                      >
                        <div className="font-bold text-white">{f.name}</div>
                        <div className="text-sm text-emerald-50/80">{(f.nodes || []).length} nodes</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteFlow(f._id)}
                        className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-100 hover:bg-red-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CENTER: Node editor */}
          <div className="col-span-2 space-y-6">
            {!selectedFlow ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center text-emerald-50/80">
                <p>Select a flow or create a new one to get started</p>
              </div>
            ) : (
              <>
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h2 className="font-extrabold text-white mb-4">Flow: {selectedFlow.name}</h2>
                  <p className="text-emerald-50/80 mb-4">{selectedFlow.description || 'No description'}</p>

                  <div className="space-y-4 border-t border-white/20 pt-4 mt-4">
                    <div>
                      <label className="block text-sm font-bold text-emerald-50 mb-2">Node Type</label>
                      <select
                        value={nodeType}
                        onChange={(e) => setNodeType(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white font-bold"
                      >
                        <option value="message">Message</option>
                        <option value="question">Question</option>
                        <option value="buttons">Buttons</option>
                        <option value="template">Send Template</option>
                        <option value="condition">Condition</option>
                        <option value="label">Assign Labels</option>
                        <option value="delay">Delay Only</option>
                        <option value="end">End</option>
                      </select>
                    </div>

                    {(nodeType === 'message' || nodeType === 'question' || nodeType === 'buttons' || nodeType === 'template' || nodeType === 'end' || nodeType === 'delay') && (
                      <div>
                        <label className="block text-sm font-bold text-emerald-50 mb-2">
                          {nodeType === 'question' ? 'Question Text' : 'Message Text'}
                        </label>
                        <textarea
                          value={nodeText}
                          onChange={(e) => setNodeText(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                          placeholder={
                            nodeType === 'template'
                              ? 'Optional message before/after template'
                              : nodeType === 'delay'
                                ? 'Optional message (sent before delay)'
                                : nodeType === 'end'
                                  ? 'Optional goodbye message'
                                  : 'Enter message or question...'
                          }
                        />
                      </div>
                    )}

                    {nodeType === 'template' && (
                      <div>
                        <label className="block text-sm font-bold text-emerald-50 mb-2">Template Name</label>
                        <input
                          value={nodeTemplateName}
                          onChange={(e) => setNodeTemplateName(e.target.value)}
                          placeholder="e.g. welcome_new_lead"
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                        />
                        <div className="text-xs text-emerald-50/70 mt-1">
                          Tip: use the exact WhatsApp template name (not the DB id).
                        </div>
                      </div>
                    )}

                    {nodeType === 'condition' && (
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-emerald-50">Condition</label>
                        <div className="grid grid-cols-3 gap-2">
                          <select
                            value={nodeConditionField}
                            onChange={(e) => setNodeConditionField(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white font-bold"
                          >
                            <option value="text">Incoming text</option>
                            <option value="label">Lead label</option>
                            <option value="phone">Phone</option>
                          </select>
                          <select
                            value={nodeConditionOp}
                            onChange={(e) => setNodeConditionOp(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white font-bold"
                          >
                            <option value="contains">contains</option>
                            <option value="equals">equals</option>
                            <option value="startsWith">startsWith</option>
                          </select>
                          <input
                            value={nodeConditionValue}
                            onChange={(e) => setNodeConditionValue(e.target.value)}
                            placeholder="value"
                            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                          />
                        </div>
                        <div className="text-xs text-emerald-50/70">
                          This node stores the condition now; we’ll wire execution rules next.
                        </div>
                      </div>
                    )}

                    {(nodeType === 'question' || nodeType === 'buttons') && (
                      <div>
                        <label className="block text-sm font-bold text-emerald-50 mb-2">Options</label>
                        <div className="space-y-2">
                          {nodeOptions.map((opt, idx) => (
                            <div key={idx} className="flex gap-2">
                              <input
                                value={opt.label}
                                readOnly
                                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-white text-sm"
                              />
                              <button
                                onClick={() => setNodeOptions((p) => p.filter((_, i) => i !== idx))}
                                className="px-3 py-2 rounded-lg bg-red-500/20 text-red-100 hover:bg-red-500/30 text-sm font-bold"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <input
                            value={newOptionLabel}
                            onChange={(e) => setNewOptionLabel(e.target.value)}
                            placeholder="e.g. Yes"
                            className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 text-sm"
                          />
                          <button
                            onClick={() => {
                              if (newOptionLabel.trim()) {
                                setNodeOptions((p) => [...p, { label: newOptionLabel, value: newOptionLabel }]);
                                setNewOptionLabel('');
                              }
                            }}
                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-bold text-emerald-50 mb-2">Delay (seconds)</label>
                        <input
                          type="number"
                          value={nodeDelay}
                          onChange={(e) => setNodeDelay(e.target.value)}
                          min="0"
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-emerald-50 mb-2">Timer (minutes)</label>
                        <input
                          type="number"
                          value={nodeTimer}
                          onChange={(e) => setNodeTimer(e.target.value)}
                          min="0"
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
                          placeholder="Optional"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-emerald-50 mb-2">Labels (comma-separated)</label>
                      <input
                        value={nodeLabels}
                        onChange={(e) => setNodeLabels(e.target.value)}
                        placeholder="e.g. inquiry, urgent"
                        className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400"
                      />
                      {nodeType === 'label' ? (
                        <div className="text-xs text-emerald-50/70 mt-1">
                          This node will assign labels to the lead.
                        </div>
                      ) : null}
                    </div>

                    <button
                      onClick={addNode}
                      className="w-full px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-black font-bold"
                    >
                      Add Node
                    </button>
                  </div>
                </div>

                {/* Node list */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                  <h3 className="font-extrabold text-white mb-4">Nodes ({(selectedFlow.nodes || []).length})</h3>
                  {(selectedFlow.nodes || []).length === 0 ? (
                    <div className="text-emerald-50/80">No nodes yet. Add one above.</div>
                  ) : (
                    <div className="space-y-3">
                      {(selectedFlow.nodes || []).map((node) => (
                        <div key={node.nodeId} className="rounded-xl border border-white/10 bg-black/10 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-bold text-white">{node.type}</div>
                              <div className="text-sm text-emerald-50/80">
                                {node.messageText || node.questionText || 'No content'}
                              </div>
                              {node.delaySeconds ? (
                                <div className="text-xs text-emerald-50/60 mt-1">Delay: {node.delaySeconds}s</div>
                              ) : null}
                            </div>
                            <button
                              onClick={() => deleteNode(node.nodeId)}
                              className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-100 font-bold text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
