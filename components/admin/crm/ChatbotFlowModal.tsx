'use client';

import React, { useEffect, useState } from 'react';
import { X, Trash2, Play } from 'lucide-react';

interface ChatbotFlow {
  _id: string;
  name: string;
  description: string;
  nodeCount: number;
  enabled: boolean;
}

interface CurrentFlow {
  flowId: string;
  flowName: string;
  startedAt: string | null;
}

interface ChatbotFlowModalProps {
  leadId: string;
  leadName: string;
  leadPhone: string;
  token: string;
  onClose: () => void;
  onFlowChanged?: () => void;
}

export default function ChatbotFlowModal({
  leadId,
  leadName,
  leadPhone,
  token,
  onClose,
  onFlowChanged,
}: ChatbotFlowModalProps) {
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [currentFlow, setCurrentFlow] = useState<CurrentFlow | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');

  // Fetch flows + current state
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/crm/chatbot/flows?leadId=${leadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) {
          setFlows(json.flows || []);
          setCurrentFlow(json.currentFlow || null);
        } else {
          setError(json.error || 'Failed to load flows');
        }
      } catch (e: any) {
        setError(e.message || 'Network error');
      } finally {
        setLoading(false);
      }
    })();
  }, [leadId, token]);

  // Start a flow
  const handleStart = async (flowId: string) => {
    try {
      setStarting(flowId);
      setError('');
      const res = await fetch('/api/admin/crm/chatbot/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leadId, flowId, phoneNumber: leadPhone }),
      });
      const json = await res.json();
      if (json.success) {
        setCurrentFlow(json.state);
        onFlowChanged?.();
      } else {
        setError(json.error || 'Failed to start flow');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setStarting(null);
    }
  };

  // Remove current flow
  const handleRemove = async () => {
    try {
      setRemoving(true);
      setError('');
      const res = await fetch('/api/admin/crm/chatbot/flows', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ leadId }),
      });
      const json = await res.json();
      if (json.success) {
        setCurrentFlow(null);
        onFlowChanged?.();
      } else {
        setError(json.error || 'Failed to remove flow');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold tracking-widest text-emerald-600 uppercase">Chatbot Flow</p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">{leadName || 'Lead'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-2">
          <h3 className="text-sm font-semibold text-gray-800">Start a chatbot flow for this conversation</h3>
          <p className="text-xs text-gray-400 mt-0.5">First message sends immediately. Next messages follow on user reply.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 px-3 py-2 bg-red-50 text-red-600 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Current flow indicator */}
        {currentFlow && (
          <div className="mx-6 mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 flex items-center justify-between">
            <span>
              <span className="font-semibold">Active:</span> {currentFlow.flowName}
              {currentFlow.startedAt && (
                <span className="text-emerald-500 ml-1">
                  (started {new Date(currentFlow.startedAt).toLocaleDateString()})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Flow list */}
        <div className="px-6 pb-4 space-y-3 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : flows.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              No chatbot flows created yet.
            </div>
          ) : (
            flows.map((flow) => {
              const isActive = currentFlow?.flowId === flow._id;
              return (
                <div
                  key={flow._id}
                  className={`border rounded-xl px-4 py-3 flex items-center justify-between transition ${
                    isActive
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isActive ? 'bg-emerald-500' : 'bg-emerald-400'
                        }`}
                      />
                      <span className="font-semibold text-sm text-gray-900 truncate">{flow.name}</span>
                    </div>
                    {flow.description && (
                      <p className="text-xs text-gray-400 mt-0.5 ml-[18px] truncate">{flow.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 ml-[18px]">
                      <span className="text-[11px] text-gray-400">{flow.nodeCount} nodes</span>
                      <span className="text-[11px] font-medium text-emerald-500">Active</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleStart(flow._id)}
                    disabled={starting === flow._id || isActive}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-400 cursor-default'
                        : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100 border border-cyan-200'
                    }`}
                  >
                    {starting === flow._id ? (
                      <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    {isActive ? 'Running' : 'Start'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          {currentFlow ? (
            <button
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-600 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {removing ? 'Removing...' : 'Remove current flow'}
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
