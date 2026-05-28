'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  Plus, RefreshCw, Loader2, AlertCircle, Send, Clock, CheckCircle2,
  XCircle, Play, Pause, Trash2, ChevronDown, ChevronUp, Users,
  MessageSquare, BarChart2, Calendar,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface RunStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  delivered?: number;
  read?: number;
}

interface BroadcastRun {
  _id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'cancelled' | 'failed';
  provider: string;
  mode: string;
  stats: RunStats;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  templateSnapshot?: { templateName?: string };
  lastError?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600',    icon: <Clock className="w-3 h-3" /> },
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700',    icon: <Calendar className="w-3 h-3" /> },
  running:   { label: 'Running',   color: 'bg-yellow-100 text-yellow-700', icon: <Play className="w-3 h-3" /> },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500',    icon: <XCircle className="w-3 h-3" /> },
  failed:    { label: 'Failed',    color: 'bg-red-100 text-red-700',      icon: <XCircle className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ProgressBar({ stats }: { stats: RunStats }) {
  if (!stats?.total) return <div className="text-xs text-gray-400">No recipients</div>;
  const sentPct = Math.round(((stats.sent || 0) / stats.total) * 100);
  const failedPct = Math.round(((stats.failed || 0) / stats.total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex rounded-full overflow-hidden h-2 bg-gray-200">
        <div className="bg-green-500 transition-all" style={{ width: `${sentPct}%` }} />
        <div className="bg-red-400 transition-all" style={{ width: `${failedPct}%` }} />
      </div>
      <div className="flex gap-3 text-xs text-gray-500">
        <span className="text-green-600 font-medium">{stats.sent || 0} sent</span>
        {(stats.failed || 0) > 0 && <span className="text-red-500">{stats.failed} failed</span>}
        <span className="ml-auto">{stats.total} total</span>
      </div>
    </div>
  );
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

// ══════════════════════════════════════════════════════════════════════════════
export default function QRBroadcastSchedulePage() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });
  const router = useRouter();

  const [runs, setRuns] = useState<BroadcastRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedMessages, setExpandedMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ provider: 'qr', limit: '50' });
      if (filterStatus) params.set('status', filterStatus);
      const res = await crmFetch(`/api/admin/crm/broadcast-runs?${params}`);
      setRuns(Array.isArray(res?.data?.runs) ? res.data.runs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  // Auto-refresh every 15s when any run is active
  useEffect(() => {
    const hasActive = runs.some(r => r.status === 'running' || r.status === 'scheduled');
    if (!hasActive) return;
    const t = setInterval(loadRuns, 15000);
    return () => clearInterval(t);
  }, [runs, loadRuns]);

  async function loadMessages(runId: string) {
    setMessagesLoading(true);
    const res = await crmFetch(`/api/admin/crm/broadcast-runs/${runId}?limit=200`).catch(() => null);
    setExpandedMessages(Array.isArray(res?.data?.messages) ? res.data.messages : []);
    setMessagesLoading(false);
  }

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    loadMessages(id);
  }

  async function runAction(runId: string, action: string) {
    setActionLoading(runId + action);
    try {
      if (action === 'start') {
        await crmFetch('/api/admin/crm/broadcast-runs/run', {
          method: 'POST',
          body: JSON.stringify({ runId }),
        });
      } else {
        await crmFetch(`/api/admin/crm/broadcast-runs/${runId}`, {
          method: 'PATCH',
          body: JSON.stringify({ action }),
        });
      }
      await loadRuns();
    } catch {
      /* noop */
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteRun(runId: string) {
    setActionLoading(runId + 'delete');
    try {
      await crmFetch(`/api/admin/crm/broadcast-runs/${runId}`, { method: 'DELETE' });
      setRuns(prev => prev.filter(r => r._id !== runId));
      if (expandedId === runId) setExpandedId(null);
    } catch {
      /* noop */
    } finally {
      setActionLoading(null);
      setDeleteConfirm(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-green-600" />
              QR Broadcast Runs
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage scheduled and active QR WhatsApp broadcasts</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadRuns} disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => router.push('/admin/crm/qr/broadcast')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Broadcast
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {['', 'running', 'scheduled', 'completed', 'failed', 'cancelled'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterStatus === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {loading && runs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : runs.length === 0 ? (
          <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
            <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-gray-500 font-medium">No broadcasts yet</h3>
            <p className="text-gray-400 text-sm mt-1">Create your first QR broadcast to get started.</p>
            <button
              onClick={() => router.push('/admin/crm/qr/broadcast')}
              className="mt-4 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Broadcast
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map(run => {
              const isExpanded = expandedId === run._id;
              const isActing = (id: string) => actionLoading === run._id + id;

              return (
                <div key={run._id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  {/* Run header row */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm truncate max-w-xs">{run.name}</span>
                          <StatusBadge status={run.status} />
                          {run.mode === 'schedule' && run.scheduledAt && (
                            <span className="text-xs text-blue-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {fmtDate(run.scheduledAt)}
                            </span>
                          )}
                        </div>
                        {run.templateSnapshot?.templateName && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                            <MessageSquare className="w-3 h-3" /> {run.templateSnapshot.templateName}
                          </div>
                        )}
                        <ProgressBar stats={run.stats} />
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {run.status === 'draft' && (
                          <button
                            onClick={() => runAction(run._id, 'start')}
                            disabled={!!actionLoading}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition"
                            title="Start Now"
                          >
                            {isActing('start') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          </button>
                        )}
                        {run.status === 'running' && (
                          <button
                            onClick={() => runAction(run._id, 'pause')}
                            disabled={!!actionLoading}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition"
                            title="Pause"
                          >
                            {isActing('pause') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                          </button>
                        )}
                        {(run.status === 'running' || run.status === 'scheduled') && (
                          <button
                            onClick={() => runAction(run._id, 'cancel')}
                            disabled={!!actionLoading}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded transition"
                            title="Cancel"
                          >
                            {isActing('cancel') ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          </button>
                        )}
                        {deleteConfirm === run._id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteRun(run._id)}
                              disabled={!!actionLoading}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              {isActing('delete') ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(run._id)}
                            className="p-1.5 text-red-400 hover:bg-red-50 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => toggleExpand(run._id)}
                          className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition ml-1"
                          title="Show recipients"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {run.lastError && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded">
                        {run.lastError}
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-400">
                      Created {fmtDate(run.createdAt)}
                      {run.completedAt && ` · Completed ${fmtDate(run.completedAt)}`}
                    </div>
                  </div>

                  {/* Expanded: per-recipient status */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                          <Users className="w-4 h-4" /> Recipients
                        </h4>
                        <span className="text-xs text-gray-400">{expandedMessages.length} records</span>
                      </div>
                      {messagesLoading ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      ) : expandedMessages.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">No message records yet.</p>
                      ) : (
                        <div className="max-h-64 overflow-y-auto rounded border bg-white divide-y text-xs">
                          {expandedMessages.map((msg: any) => (
                            <div key={msg._id} className="flex items-center gap-3 px-3 py-2">
                              <span className={`w-16 px-1.5 py-0.5 rounded text-center font-medium ${
                                msg.status === 'sent' || msg.status === 'delivered' || msg.status === 'read'
                                  ? 'bg-green-100 text-green-700'
                                  : msg.status === 'failed' ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {msg.status}
                              </span>
                              <span className="text-gray-500 flex-1 truncate">{msg.phoneNumber}</span>
                              {msg.sentAt && (
                                <span className="text-gray-400 flex-shrink-0">{fmtDate(msg.sentAt)}</span>
                              )}
                              {msg.failureReason && (
                                <span className="text-red-500 truncate max-w-[8rem]" title={msg.failureReason}>
                                  {msg.failureReason}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
