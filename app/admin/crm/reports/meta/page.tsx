'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type BroadcastRun = {
  _id: string;
  name: string;
  createdAt: string;
  status: string;
  provider: 'meta' | 'qr';
  createdByLabel?: string;
  createdByUserId?: string;
  templateSnapshot?: {
    templateName?: string;
    language?: string;
  };
  stats: {
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    skipped: number;
    blocked: number;
  };
  cost?: {
    totalCost: number;
    currency: string;
  };
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
};

type BroadcastMessage = {
  _id: string;
  phoneNumber: string;
  leadId?: string;
  status: string;
  failureReason?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  lead?: {
    _id?: string;
    name?: string;
  };
};

type RecurringOccurrence = {
  index: number;
  scheduledAt: string;
  runId?: string;
  status: 'pending' | 'created' | 'skipped';
  recipientCount?: number;
  note?: string;
};

type RecurringSchedule = {
  _id: string;
  name: string;
  templateId?: { _id: string; templateName?: string };
  leadIds: string[];
  sendTime: string;
  occurrences: RecurringOccurrence[];
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    sent: 'bg-green-100 text-green-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    read: 'bg-teal-100 text-teal-700',
    failed: 'bg-red-100 text-red-700',
    completed: 'bg-green-100 text-green-700',
    running: 'bg-blue-100 text-blue-700',
  };
  
  const icons: Record<string, string> = {
    pending: '⏳',
    sent: '✅',
    delivered: '📬',
    read: '👁️',
    failed: '❌',
    completed: '✅',
    running: '🔄',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {icons[status] || '•'} {status}
    </span>
  );
}

export default function MetaReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuth();

  const runId = searchParams.get('runId');
  const [view, setView] = useState<'list' | 'detail'>(runId ? 'detail' : 'list');

  const [runs, setRuns] = useState<BroadcastRun[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [allUsers, setAllUsers] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<BroadcastRun | null>(null);
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [messageFilters, setMessageFilters] = useState<Set<string>>(new Set());
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState<{ action: string; label: string } | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  // Repeat broadcasts (recurring schedules)
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [viewSchedule, setViewSchedule] = useState<RecurringSchedule | null>(null);
  const [editSchedule, setEditSchedule] = useState<RecurringSchedule | null>(null);
  const [editName, setEditName] = useState('');
  const [editSendTime, setEditSendTime] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'paused'>('active');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Fetch Meta broadcast runs
  const fetchRuns = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ provider: 'meta', limit: '100', allUsers: 'true' });
      const res = await fetch('/api/admin/crm/broadcast-runs?' + params, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRuns(data?.data?.runs || data?.runs || []);
      setSummary(data?.data?.summary || {});
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchRecurringSchedules = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/broadcast-recurring?provider=meta', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRecurringSchedules(data?.data?.schedules || data?.schedules || []);
    } catch {
      setRecurringSchedules([]);
    }
  }, [token]);

  const openEditSchedule = (s: RecurringSchedule) => {
    setEditSchedule(s);
    setEditName(s.name);
    setEditSendTime(s.sendTime);
    setEditStatus(s.status === 'paused' ? 'paused' : 'active');
  };

  const saveScheduleEdit = async () => {
    if (!token || !editSchedule) return;
    setSavingSchedule(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/admin/crm/broadcast-recurring', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduleId: editSchedule._id,
          name: editName,
          sendTime: editSendTime,
          status: editStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to update schedule');
      setActionResult({ success: true, message: 'Repeat broadcast updated' });
      setEditSchedule(null);
      await fetchRecurringSchedules();
    } catch (err) {
      setActionResult({ success: false, message: err instanceof Error ? err.message : 'Failed to update schedule' });
    } finally {
      setSavingSchedule(false);
    }
  };

  const deleteSchedule = async (s: RecurringSchedule) => {
    if (!token) return;
    if (!confirm(`Delete repeat broadcast "${s.name}"? This cannot be undone.`)) return;
    setActionResult(null);
    try {
      const res = await fetch(`/api/admin/crm/broadcast-recurring?scheduleId=${s._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete schedule');
      setActionResult({ success: true, message: 'Repeat broadcast deleted' });
      await fetchRecurringSchedules();
    } catch (err) {
      setActionResult({ success: false, message: err instanceof Error ? err.message : 'Failed to delete schedule' });
    }
  };

  const fetchRunDetail = useCallback(async (id: string) => {
    if (!token) return;
    setLoading(true);
    setSelectedMessages(new Set());
    try {
      const res = await fetch(`/api/admin/crm/broadcast-runs/${id}?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSelectedRun(data?.data?.run || data?.run || null);
      setMessages(data?.data?.messages || data?.messages || []);
    } catch (err) {
      console.error('Failed to load detail:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Trigger the broadcast run manually
  const triggerRun = async () => {
    if (!token || !runId) return;
    setActionLoading(true);
    setActionResult(null);
    try {
      const res = await fetch('/api/admin/crm/broadcast-runs/run', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ runId }),
      });
      const data = await res.json();
      if (data.success) {
        const stats = data.data?.runResults?.[0] || data.data || {};
        setActionResult({ success: true, message: `Run triggered! Sent: ${stats.sent || 0}, Failed: ${stats.failed || 0}, Skipped: ${stats.skipped || 0}` });
        setTimeout(() => fetchRunDetail(runId), 1500);
      } else {
        setActionResult({ success: false, message: data.error || 'Failed to trigger run' });
      }
    } catch (err: any) {
      setActionResult({ success: false, message: err.message || 'Error triggering run' });
    } finally {
      setActionLoading(false);
    }
  };

  // Perform an action on the broadcast run
  const performAction = async (action: string) => {
    if (!token || !runId) return;
    setShowConfirm(null);
    setActionLoading(true);
    setActionResult(null);
    try {
      if (action === 'delete') {
        const res = await fetch(`/api/admin/crm/broadcast-runs/${runId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setActionResult({ success: true, message: data.data?.message || 'Deleted' });
          setTimeout(() => router.push('/admin/crm/reports/meta'), 1500);
        } else {
          setActionResult({ success: false, message: data.error || 'Failed' });
        }
      } else {
        const res = await fetch(`/api/admin/crm/broadcast-runs/${runId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action }),
        });
        const data = await res.json();
        if (data.success) {
          setActionResult({ success: true, message: data.data?.message || 'Done' });
          setTimeout(() => fetchRunDetail(runId), 1000);
        } else {
          setActionResult({ success: false, message: data.error || 'Failed' });
        }
      }
    } catch (err: any) {
      setActionResult({ success: false, message: err.message || 'Error' });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle message selection
  const toggleMessageSelection = (msgId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(msgId)) {
        newSet.delete(msgId);
      } else {
        newSet.add(msgId);
      }
      return newSet;
    });
  };

  // Select/deselect all visible messages
  const toggleSelectAll = () => {
    if (selectedMessages.size === filteredMessages.length) {
      setSelectedMessages(new Set());
    } else {
      setSelectedMessages(new Set(filteredMessages.map(m => m._id)));
    }
  };

  // Schedule a new broadcast to the selected recipients
  const scheduleSelectedForBroadcast = () => {
    const selected = filteredMessages.filter(m => selectedMessages.has(m._id));
    const contacts = selected.map(m => ({
      phoneNumber: m.phoneNumber,
      name: m.lead?.name || '',
    }));
    sessionStorage.setItem('broadcast_preload_contacts', JSON.stringify(contacts));
    router.push('/admin/crm/broadcast');
  };

  useEffect(() => {
    if (!token) return;
    if (runId) {
      setView('detail');
      fetchRunDetail(runId);
    } else {
      setView('list');
      fetchRuns();
      fetchRecurringSchedules();
    }
  }, [token, runId, fetchRuns, fetchRunDetail, fetchRecurringSchedules]);

  const filteredMessages = useMemo(() => {
    if (messageFilters.size === 0) return messages;
    return messages.filter(m => messageFilters.has(m.status));
  }, [messages, messageFilters]);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleFilter = (status: string) => {
    setMessageFilters(prev => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  // Real totals from broadcast_run_messages (accurate, not stale run snapshots)
  const totals = useMemo(() => {
    const sent    = (summary['sent']      || 0) + (summary['delivered'] || 0) + (summary['read'] || 0);
    const delivered = (summary['delivered'] || 0) + (summary['read']      || 0);
    const read    = summary['read']      || 0;
    const failed  = summary['failed']    || 0;
    const blocked = summary['blocked']   || 0;
    const cancelled = summary['cancelled'] || 0;
    const total   = sent + failed + blocked + cancelled + (summary['pending'] || 0);
    return { total, sent, delivered, read, failed, blocked, cancelled };
  }, [summary]);

  if (token === null) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/crm" className="text-gray-500 hover:text-gray-700">
                ← CRM
              </Link>
              <h1 className="text-xl font-bold text-green-600 flex items-center gap-2">
                🟢 Meta WhatsApp Reports
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/crm/broadcast"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
              >
                📢 Send Broadcast
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {view === 'list' ? (
          <>
            {/* Stats Cards — real counts from broadcast_run_messages */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              {[
                { label: 'Total',     value: totals.total,     color: 'text-gray-800',    bg: 'bg-white' },
                { label: 'Sent',      value: totals.sent,      color: 'text-green-600',   bg: 'bg-white' },
                { label: 'Delivered', value: totals.delivered, color: 'text-emerald-600', bg: 'bg-white' },
                { label: 'Read',      value: totals.read,      color: 'text-teal-600',    bg: 'bg-white' },
                { label: 'Failed',    value: totals.failed,    color: 'text-red-600',     bg: 'bg-white' },
                { label: 'Blocked',   value: totals.blocked,   color: 'text-orange-600',  bg: 'bg-orange-50 border-orange-200' },
                { label: 'Cancelled', value: totals.cancelled, color: 'text-slate-500',   bg: 'bg-gray-50' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-4 border shadow-sm`}>
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
                  {totals.total > 0 && label !== 'Total' && (
                    <div className="text-xs text-gray-400 mt-1">{Math.round((value / totals.total) * 100)}%</div>
                  )}
                </div>
              ))}
            </div>

            {/* Action result for repeat-broadcast edit/delete */}
            {actionResult && (
              <div className={`mb-4 p-3 rounded-lg ${actionResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {actionResult.message}
              </div>
            )}

            {/* ── Repeat broadcasts (recurring schedules) ── */}
            {recurringSchedules.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-blue-700 uppercase mb-3 flex items-center gap-2">
                  🔁 Repeat Broadcasts
                </h3>
                <div className="bg-blue-50 rounded-xl border border-blue-200 overflow-hidden divide-y divide-blue-100">
                  {recurringSchedules.map(s => {
                    const total = s.occurrences?.length || 0;
                    const created = s.occurrences?.filter(o => o.status === 'created').length || 0;
                    const skipped = s.occurrences?.filter(o => o.status === 'skipped').length || 0;
                    const next = s.occurrences?.find(o => o.status === 'pending');
                    const statusColors: Record<string, string> = {
                      active: 'bg-blue-100 text-blue-700',
                      paused: 'bg-yellow-100 text-yellow-700',
                      completed: 'bg-green-100 text-green-700',
                      cancelled: 'bg-gray-200 text-gray-600',
                    };
                    return (
                      <div key={s._id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            🔁 {s.name}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[s.status] || statusColors.active}`}>
                              {s.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {s.templateId?.templateName || 'Template'} · {s.leadIds?.length || 0} recipient(s) · Sends at {s.sendTime} IST
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-blue-700 font-semibold">
                            {created}/{total} occurrence(s) sent
                          </div>
                          {next && (
                            <div className="text-xs text-gray-500">
                              Next: {new Date(next.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                            </div>
                          )}
                          {skipped > 0 && (
                            <div className="text-xs text-yellow-600">{skipped} skipped — no delivered/read recipients</div>
                          )}
                        </div>
                        {created > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {s.occurrences.filter(o => o.runId).map(o => (
                              <button
                                key={o.index}
                                onClick={() => router.push(`/admin/crm/reports/meta?runId=${o.runId}`)}
                                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold"
                              >
                                View #{o.index + 1}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => setViewSchedule(s)}
                            className="px-2 py-1 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold"
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => openEditSchedule(s)}
                            className="px-2 py-1 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => deleteSchedule(s)}
                            className="px-2 py-1 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded text-xs font-semibold"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Users toggle + runs count */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-500">{runs.length} broadcast{runs.length !== 1 ? 's' : ''} — all users</div>
              <button onClick={fetchRuns} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">🔄 Refresh</button>
            </div>

            {/* Runs List */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-800">🟢 Meta Broadcasts — All Users</h2>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : runs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No Meta broadcasts found. Send your first broadcast!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Sent</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Delivered</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Read</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Failed</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-orange-500 uppercase">Blocked</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {runs.map((run) => (
                        <tr key={run._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{run.name || 'Broadcast'}</div>
                            <div className="text-xs text-gray-500">
                              {run.templateSnapshot?.templateName || 'N/A'} • {new Date(run.createdAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-700">{run.createdByLabel || '—'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={run.status} />
                          </td>
                          <td className="px-4 py-3 text-center font-medium">{run.stats?.total || 0}</td>
                          <td className="px-4 py-3 text-center text-green-600 font-medium">{run.stats?.sent || 0}</td>
                          <td className="px-4 py-3 text-center text-emerald-600 font-medium">{run.stats?.delivered || 0}</td>
                          <td className="px-4 py-3 text-center text-teal-600 font-medium">{run.stats?.read || 0}</td>
                          <td className="px-4 py-3 text-center text-red-600 font-medium">{run.stats?.failed || 0}</td>
                          <td className="px-4 py-3 text-center text-orange-600 font-medium">{run.stats?.blocked || 0}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => router.push(`/admin/crm/reports/meta?runId=${run._id}`)}
                              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                            >
                              👁️ View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Detail View */
          <>
            <div className="mb-4">
              <button
                onClick={() => {
                  setView('list');
                  router.push('/admin/crm/reports/meta');
                }}
                className="text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                ← Back to list
              </button>
            </div>

            {selectedRun && (
              <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedRun.name}</h2>
                    <div className="text-sm text-gray-500 space-y-1 mt-1">
                      <div>Status: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedRun.status === 'completed' ? 'bg-green-100 text-green-700' : selectedRun.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{selectedRun.status}</span></div>
                      {selectedRun.createdByLabel && (
                        <div className="text-purple-600 font-medium">
                          👤 Sent by: {selectedRun.createdByLabel}
                        </div>
                      )}
                      {selectedRun.scheduledAt && (
                        <div className="text-yellow-600 font-medium">
                          📅 Scheduled: {new Date(selectedRun.scheduledAt).toLocaleString('en-IN', { 
                            dateStyle: 'medium', 
                            timeStyle: 'short',
                            timeZone: 'Asia/Kolkata'
                          })} IST
                        </div>
                      )}
                      {selectedRun.startedAt && (
                        <div className="text-blue-600">
                          ▶️ Started: {new Date(selectedRun.startedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </div>
                      )}
                      {selectedRun.completedAt && (
                        <div className="text-green-600">
                          ✅ Completed: {new Date(selectedRun.completedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {/* Send Pending */}
                    {(selectedRun.status === 'pending' || selectedRun.status === 'scheduled') && (
                      <button
                        onClick={() => triggerRun()}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading ? '⏳' : '📤'} Send Pending
                      </button>
                    )}
                    
                    {/* Resume (for paused) */}
                    {selectedRun.status === 'paused' && (
                      <button
                        onClick={() => triggerRun()}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionLoading ? '⏳' : '▶️'} Resume
                      </button>
                    )}

                    {/* Cancel (for running) */}
                    {selectedRun.status === 'running' && (
                      <button
                        onClick={() => performAction('cancel')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50"
                      >
                        {actionLoading ? '⏳' : '⏸️'} Cancel
                      </button>
                    )}

                    {/* Retry Failed */}
                    {(selectedRun.stats?.failed || 0) > 0 && (
                      <button
                        onClick={() => performAction('retry-failed')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 disabled:opacity-50"
                      >
                        {actionLoading ? '⏳' : '🔄'} Retry Failed
                      </button>
                    )}

                    {/* Reset All */}
                    <button
                      onClick={() => performAction('reset-all')}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {actionLoading ? '⏳' : '🔁'} Reset All
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setShowConfirm({ action: 'delete', label: 'Delete' })}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading ? '⏳' : '🗑️'} Delete
                    </button>
                  </div>
                </div>

                {/* Action Result */}
                {actionResult && (
                  <div className={`mt-4 p-3 rounded-lg ${actionResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {actionResult.message}
                  </div>
                )}

                {/* Confirm Dialog */}
                {showConfirm && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md mx-4">
                      <h3 className="text-lg font-bold mb-2">⚠️ Confirm {showConfirm.label}</h3>
                      <p className="text-gray-600 mb-4">
                        Are you sure you want to {showConfirm.label.toLowerCase()} this broadcast? This action cannot be undone.
                      </p>
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => setShowConfirm(null)}
                          className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            performAction(showConfirm.action);
                            setShowConfirm(null);
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          {showConfirm.label}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
                  <div>
                    <div className="text-sm text-gray-500">Total</div>
                    <div className="text-xl font-bold">{selectedRun.stats?.total || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Pending</div>
                    <div className="text-xl font-bold text-yellow-600">{selectedRun.stats?.pending || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Sent</div>
                    <div className="text-xl font-bold text-green-600">{selectedRun.stats?.sent || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Delivered</div>
                    <div className="text-xl font-bold text-emerald-600">{selectedRun.stats?.delivered || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Read</div>
                    <div className="text-xl font-bold text-teal-600">{selectedRun.stats?.read || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Failed</div>
                    <div className="text-xl font-bold text-red-600">{selectedRun.stats?.failed || 0}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Table */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b flex items-center justify-between gap-3">
                <h3 className="font-semibold shrink-0">
                  Messages ({filteredMessages.length})
                  {selectedMessages.size > 0 && (
                    <span className="ml-2 text-sm text-blue-600">
                      • {selectedMessages.size} selected
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2 ml-auto">
                  {selectedMessages.size > 0 && (
                    <button
                      onClick={scheduleSelectedForBroadcast}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      📅 Schedule Broadcast ({selectedMessages.size})
                    </button>
                  )}
                  {/* Multi-select status filter */}
                  <div className="relative" ref={filterDropdownRef}>
                    <button
                      onClick={() => setFilterDropdownOpen(o => !o)}
                      className="border rounded-lg px-3 py-1.5 text-sm flex items-center gap-2 bg-white hover:bg-gray-50 min-w-[120px]"
                    >
                      <span className="flex-1 text-left">
                        {messageFilters.size === 0
                          ? 'All'
                          : Array.from(messageFilters).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
                      </span>
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {filterDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-44 bg-white border rounded-xl shadow-lg z-50 py-1">
                        {(['pending','sent','delivered','read','failed'] as const).map(status => (
                          <label key={status} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={messageFilters.has(status)}
                              onChange={() => toggleFilter(status)}
                              className="w-4 h-4 rounded accent-green-600"
                            />
                            <span className="capitalize">{status}</span>
                          </label>
                        ))}
                        {messageFilters.size > 0 && (
                          <button
                            onClick={() => setMessageFilters(new Set())}
                            className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-t mt-1"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedMessages.size === filteredMessages.length && filteredMessages.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Read</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredMessages.map((msg) => (
                        <tr key={msg._id} className={`hover:bg-gray-50 ${selectedMessages.has(msg._id) ? 'bg-blue-50' : ''}`}>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedMessages.has(msg._id)}
                              onChange={() => toggleMessageSelection(msg._id)}
                              className="w-4 h-4 rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-sm">{msg.phoneNumber}</td>
                          <td className="px-4 py-3">{msg.lead?.name || '-'}</td>
                          <td className="px-4 py-3"><StatusBadge status={msg.status} /></td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {msg.deliveredAt ? new Date(msg.deliveredAt).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {msg.readAt ? new Date(msg.readAt).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs text-red-600 max-w-xs">
                            {msg.failureReason ? (
                              <span title={msg.failureReason} className="cursor-help">
                                {msg.failureReason.length > 60 ? msg.failureReason.substring(0, 60) + '…' : msg.failureReason}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* View Repeat Broadcast Modal */}
      {viewSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-1">🔁 {viewSchedule.name}</h2>
            <p className="text-sm text-gray-500 mb-5">
              {viewSchedule.templateId?.templateName || 'Template'} · {viewSchedule.leadIds?.length || 0} recipient(s) · Sends at {viewSchedule.sendTime} IST · Status: {viewSchedule.status}
            </p>
            <div className="space-y-2 mb-6">
              {(viewSchedule.occurrences || []).map(o => {
                const occStatusColors: Record<string, string> = {
                  pending: 'bg-gray-100 text-gray-600',
                  created: 'bg-green-100 text-green-700',
                  skipped: 'bg-yellow-100 text-yellow-700',
                };
                return (
                  <div key={o.index} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Occurrence #{o.index + 1}</div>
                      <div className="text-xs text-gray-500">{new Date(o.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
                      {o.note && <div className="text-xs text-yellow-600 mt-0.5">{o.note}</div>}
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${occStatusColors[o.status] || occStatusColors.pending}`}>
                        {o.status}
                      </span>
                      {typeof o.recipientCount === 'number' && (
                        <div className="text-xs text-gray-500 mt-0.5">{o.recipientCount} recipient(s)</div>
                      )}
                      {o.runId && (
                        <button
                          onClick={() => { setViewSchedule(null); router.push(`/admin/crm/reports/meta?runId=${o.runId}`); }}
                          className="mt-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-semibold"
                        >
                          View Report
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setViewSchedule(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Repeat Broadcast Modal */}
      {editSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-5">✏️ Edit Repeat Broadcast</h2>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Send Time (IST)</label>
              <input
                type="time"
                value={editSendTime}
                onChange={e => setEditSendTime(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Updates the time-of-day for all upcoming (pending) occurrences.</p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <div className="flex gap-2">
                {(['active', 'paused'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setEditStatus(st)}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 ${editStatus === st ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                  >
                    {st === 'active' ? '▶️ Active' : '⏸️ Paused'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditSchedule(null)}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveScheduleEdit}
                disabled={savingSchedule || !editName.trim() || !editSendTime}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm"
              >
                {savingSchedule ? '⏳ Saving...' : '💾 Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
