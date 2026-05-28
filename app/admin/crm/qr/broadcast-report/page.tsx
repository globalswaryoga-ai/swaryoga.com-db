'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AlertBox, LoadingSpinner } from '@/components/admin/crm';

type BroadcastRun = {
  _id: string;
  name: string;
  createdAt: string;
  status: string;
  provider: 'meta' | 'qr';
  templateSnapshot?: { templateName?: string };
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
  startedAt?: string;
  completedAt?: string;
};

type BroadcastMessage = {
  _id: string;
  phoneNumber: string;
  status: string;
  failureReason?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  lead?: {
    _id: string;
    name?: string;
    phoneNumber?: string;
    status?: string;
    workshopName?: string;
  };
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending:   'bg-gray-100 text-gray-700',
    sending:   'bg-emerald-100 text-emerald-700',
    sent:      'bg-green-100 text-green-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    read:      'bg-teal-100 text-teal-700',
    failed:    'bg-red-100 text-red-700',
    skipped:   'bg-yellow-100 text-yellow-700',
    blocked:   'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
    running:   'bg-emerald-100 text-emerald-700',
    scheduled: 'bg-blue-100 text-blue-700',
    draft:     'bg-gray-100 text-gray-700',
  };
  const icons: Record<string, string> = {
    pending: '⏳', sending: '📤', sent: '✅', delivered: '📬', read: '👁️',
    failed: '❌', skipped: '⏭️', blocked: '🚫', completed: '✅', running: '🔄',
    scheduled: '📅', draft: '📝',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {icons[status] || '•'} {status}
    </span>
  );
}

function ProgressBar({ value, max, color = 'green' }: { value: number; max: number; color?: string }) {
  const percent = max > 0 ? Math.round((value / max) * 100) : 0;
  const colorClasses: Record<string, string> = {
    green: 'bg-green-500', teal: 'bg-teal-500', red: 'bg-red-500', yellow: 'bg-yellow-500',
  };
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${colorClasses[color] || 'bg-green-500'}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export default function QRBroadcastReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuth();
  const fetchingRef = useRef(false);

  const runId = searchParams.get('runId');
  const [view, setView] = useState<'list' | 'detail'>(runId ? 'detail' : 'list');

  const [runs, setRuns] = useState<BroadcastRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);

  const [selectedRun, setSelectedRun] = useState<BroadcastRun | null>(null);
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [messageFilter, setMessageFilter] = useState<string>('all');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [runningNow, setRunningNow] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');

  const fetchRuns = useCallback(async () => {
    if (!token) return;
    setLoadingRuns(true);
    try {
      const res = await fetch('/api/admin/crm/broadcast-runs?provider=qr', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRuns(data?.data?.runs || data?.runs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load broadcasts');
    } finally {
      setLoadingRuns(false);
    }
  }, [token]);

  const fetchRunDetail = useCallback(async (id: string) => {
    if (!token) return;
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/crm/broadcast-runs/${id}?limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const data = json?.data || json;
      setSelectedRun(data?.run || null);
      setMessages(data?.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load broadcast details');
    } finally {
      setLoadingDetail(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (runId) {
      setView('detail');
      fetchRunDetail(runId).finally(() => { fetchingRef.current = false; });
    } else {
      setView('list');
      fetchRuns().finally(() => { fetchingRef.current = false; });
    }
  }, [token, runId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredMessages = useMemo(() => {
    if (messageFilter === 'all') return messages;
    return messages.filter(m => m.status === messageFilter);
  }, [messages, messageFilter]);

  const messageStats = useMemo(() => {
    const stats = { total: messages.length, sent: 0, delivered: 0, read: 0, failed: 0, blocked: 0, pending: 0 };
    messages.forEach(m => {
      if (['sent', 'delivered', 'read'].includes(m.status)) stats.sent++;
      if (['delivered', 'read'].includes(m.status)) stats.delivered++;
      if (m.status === 'read') stats.read++;
      if (m.status === 'failed') stats.failed++;
      if (m.status === 'blocked') stats.blocked++;
      if (['pending', 'sending'].includes(m.status)) stats.pending++;
    });
    return stats;
  }, [messages]);

  const successRatio = useMemo(() => {
    const attempted = messageStats.total - messageStats.pending;
    return attempted === 0 ? 0 : Math.round((messageStats.sent / attempted) * 100);
  }, [messageStats]);

  const toggleMessage = (id: string) => {
    setSelectedMessages(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const runNow = async () => {
    if (!token || !selectedRun) return;
    setRunningNow(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/crm/broadcast-runs/run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: selectedRun._id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to start broadcast');
      setSuccess('Broadcast started! Refresh in a minute to see progress.');
      setTimeout(() => fetchRunDetail(selectedRun._id), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start broadcast');
    } finally {
      setRunningNow(false);
    }
  };

  const patchAction = async (action: string, extra?: Record<string, unknown>) => {
    if (!token || !selectedRun) return;
    setActioning(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/crm/broadcast-runs/${selectedRun._id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Action failed');
      setSuccess(json?.data?.message || 'Done');
      setTimeout(() => fetchRunDetail(selectedRun._id), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActioning(false);
    }
  };

  const cancelBroadcast = () => patchAction('cancel');

  const restartBroadcast = async () => {
    if (!token || !selectedRun) return;
    setActioning(true);
    setError(null);
    try {
      // Reset all messages to pending
      const patchRes = await fetch(`/api/admin/crm/broadcast-runs/${selectedRun._id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset-all' }),
      });
      const patchJson = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchJson?.error || 'Reset failed');

      // Immediately trigger processing
      const runRes = await fetch('/api/admin/crm/broadcast-runs/run', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: selectedRun._id }),
      });
      const runJson = await runRes.json();
      if (!runRes.ok) throw new Error(runJson?.error || 'Failed to start');

      setSuccess('Broadcast restarted! Messages will send shortly.');
      setTimeout(() => fetchRunDetail(selectedRun._id), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restart failed');
    } finally {
      setActioning(false);
    }
  };

  const rescheduleBroadcast = async () => {
    if (!rescheduleDate) { setError('Please pick a date and time'); return; }
    await patchAction('reschedule', { scheduledAt: new Date(rescheduleDate).toISOString() });
    setShowRescheduleModal(false);
    setRescheduleDate('');
  };

  const exportCSV = () => {
    if (!selectedRun || messages.length === 0) return;
    const headers = ['Phone Number', 'Name', 'Status', 'Sent At', 'Delivered At', 'Read At', 'Failure Reason'];
    const rows = messages.map(m => [
      m.phoneNumber,
      m.lead?.name || '',
      m.status,
      m.sentAt ? new Date(m.sentAt).toLocaleString() : '',
      m.deliveredAt ? new Date(m.deliveredAt).toLocaleString() : '',
      m.readAt ? new Date(m.readAt).toLocaleString() : '',
      m.failureReason || '',
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-broadcast-${selectedRun._id}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Report exported!');
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {view === 'detail' ? (
                <button onClick={() => { setView('list'); router.push('/admin/crm/qr/broadcast-report'); }} className="text-gray-500 hover:text-gray-700 text-sm">
                  ← All Broadcasts
                </button>
              ) : (
                <Link href="/admin/crm/qr-broadcast" className="text-gray-500 hover:text-gray-700 text-sm">
                  ← QR Broadcast
                </Link>
              )}
              <h1 className="text-2xl font-bold text-gray-900">📊 QR Broadcast Reports</h1>
            </div>
            <div className="flex items-center gap-2">
              {view === 'detail' && selectedRun && (
                <>
                  {/* Send Now — for scheduled/draft/running with pending messages */}
                  {['scheduled', 'draft', 'running'].includes(selectedRun.status) && messageStats.pending > 0 && (
                    <button
                      onClick={runNow}
                      disabled={runningNow || actioning}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
                    >
                      {runningNow ? '⏳ Starting...' : '▶ Send Now'}
                    </button>
                  )}
                  {/* Cancel — for active broadcasts */}
                  {['scheduled', 'draft', 'running'].includes(selectedRun.status) && (
                    <button
                      onClick={cancelBroadcast}
                      disabled={actioning}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
                    >
                      {actioning ? '⏳' : '✕'} Cancel
                    </button>
                  )}
                  {/* Restart — reset all & send immediately */}
                  <button
                    onClick={restartBroadcast}
                    disabled={actioning || runningNow}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
                  >
                    {actioning ? '⏳' : '🔄'} Restart
                  </button>
                  {/* Reschedule — pick new time */}
                  <button
                    onClick={() => setShowRescheduleModal(true)}
                    disabled={actioning}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
                  >
                    📅 Reschedule
                  </button>
                  <button onClick={() => fetchRunDetail(selectedRun._id)} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold">
                    ↻ Refresh
                  </button>
                  <button onClick={exportCSV} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">
                    📥 Export CSV
                  </button>
                </>
              )}
              <Link href="/admin/crm/qr-broadcast" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm">
                + New Broadcast
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

        {view === 'list' ? (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-6">All QR Broadcasts</h2>

            {loadingRuns ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : runs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No QR broadcasts yet</h3>
                <p className="text-gray-500 mb-6">Create your first QR broadcast to start messaging contacts</p>
                <Link href="/admin/crm/qr-broadcast" className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold">
                  Create Broadcast
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Broadcast</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Total</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Sent</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Delivered</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Read</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Failed</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {runs.map(run => (
                      <tr key={run._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-900">{run.name}</div>
                          <div className="text-xs text-gray-500">{run.templateSnapshot?.templateName || 'Unknown template'}</div>
                          <div className="text-xs text-gray-400">{new Date(run.createdAt).toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-4"><StatusBadge status={run.status} /></td>
                        <td className="px-4 py-4 text-center font-semibold">{run.stats?.total || 0}</td>
                        <td className="px-4 py-4 text-center text-green-600 font-semibold">{run.stats?.sent || 0}</td>
                        <td className="px-4 py-4 text-center text-emerald-600 font-semibold">{run.stats?.delivered || 0}</td>
                        <td className="px-4 py-4 text-center text-teal-600 font-semibold">{run.stats?.read || 0}</td>
                        <td className="px-4 py-4 text-center text-red-600 font-semibold">
                          {(run.stats?.failed || 0) + (run.stats?.blocked || 0)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => router.push(`/admin/crm/qr/broadcast-report?runId=${run._id}`)}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold"
                          >
                            View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {loadingDetail ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : !selectedRun ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">Broadcast not found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {[
                    { label: 'Total',     value: messageStats.total,     icon: '📊' },
                    { label: 'Sent',      value: messageStats.sent,      icon: '✅' },
                    { label: 'Delivered', value: messageStats.delivered, icon: '📬' },
                    { label: 'Read',      value: messageStats.read,      icon: '👁️' },
                    { label: 'Pending',   value: messageStats.pending,   icon: '⏳' },
                    { label: 'Failed',    value: messageStats.failed,    icon: '❌' },
                    { label: 'Success',   value: `${successRatio}%`,     icon: '📈' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-2xl mb-1">{stat.icon}</div>
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500 font-semibold uppercase">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Run info */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedRun.name}</h2>
                      <p className="text-gray-500 text-sm">Template: {selectedRun.templateSnapshot?.templateName || 'Unknown'}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <StatusBadge status={selectedRun.status} />
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          📲 QR Bridge (Free)
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Cost</div>
                      <div className="text-3xl font-bold text-green-600">Free</div>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Delivery Rate</span>
                        <span className="font-semibold">
                          {messageStats.total > 0 ? Math.round((messageStats.delivered / messageStats.total) * 100) : 0}%
                        </span>
                      </div>
                      <ProgressBar value={messageStats.delivered} max={messageStats.total} color="green" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Read Rate</span>
                        <span className="font-semibold">
                          {messageStats.delivered > 0 ? Math.round((messageStats.read / messageStats.delivered) * 100) : 0}%
                        </span>
                      </div>
                      <ProgressBar value={messageStats.read} max={messageStats.delivered} color="teal" />
                    </div>
                  </div>
                </div>

                {/* Filter + selection bar */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      value={messageFilter}
                      onChange={e => setMessageFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold"
                    >
                      <option value="all">All Messages ({messages.length})</option>
                      <option value="sent">Sent ({messages.filter(m => m.status === 'sent').length})</option>
                      <option value="delivered">Delivered ({messages.filter(m => m.status === 'delivered').length})</option>
                      <option value="read">Read ({messages.filter(m => m.status === 'read').length})</option>
                      <option value="failed">Failed ({messages.filter(m => m.status === 'failed').length})</option>
                      <option value="pending">Pending ({messages.filter(m => m.status === 'pending').length})</option>
                    </select>
                    <div className="border-l border-gray-200 h-6" />
                    <button
                      onClick={() => setSelectedMessages(new Set(messages.filter(m => ['sent','delivered','read'].includes(m.status)).map(m => m._id)))}
                      className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-semibold"
                    >
                      ✅ Select Successful
                    </button>
                    <button
                      onClick={() => setSelectedMessages(new Set(messages.filter(m => m.status === 'failed').map(m => m._id)))}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-semibold"
                    >
                      ❌ Select Failed
                    </button>
                    <button
                      onClick={() => setSelectedMessages(new Set())}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
                    >
                      Clear
                    </button>
                    {selectedMessages.size > 0 && (
                      <span className="text-sm font-semibold text-gray-600">{selectedMessages.size} selected</span>
                    )}
                  </div>
                </div>

                {/* Messages table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="w-10 px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedMessages.size === filteredMessages.length && filteredMessages.length > 0}
                              onChange={() => {
                                if (selectedMessages.size === filteredMessages.length) {
                                  setSelectedMessages(new Set());
                                } else {
                                  setSelectedMessages(new Set(filteredMessages.map(m => m._id)));
                                }
                              }}
                              className="rounded"
                            />
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Contact</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Status</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Sent</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Delivered</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Read</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Details</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredMessages.map(msg => (
                          <tr key={msg._id} className={`hover:bg-gray-50 ${selectedMessages.has(msg._id) ? 'bg-green-50' : ''}`}>
                            <td className="px-4 py-3">
                              <input type="checkbox" checked={selectedMessages.has(msg._id)} onChange={() => toggleMessage(msg._id)} className="rounded" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">{msg.lead?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{msg.phoneNumber}</div>
                              {msg.lead?.workshopName && <div className="text-xs text-gray-400">{msg.lead.workshopName}</div>}
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={msg.status} /></td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {msg.deliveredAt ? new Date(msg.deliveredAt).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {msg.readAt ? new Date(msg.readAt).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {msg.failureReason && (
                                <div className="text-xs text-red-600 max-w-[200px] truncate" title={msg.failureReason}>
                                  {msg.failureReason}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Link
                                  href={`/admin/crm/leads?search=${encodeURIComponent(msg.phoneNumber)}`}
                                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-semibold"
                                >
                                  View Lead
                                </Link>
                                <Link
                                  href={`/admin/crm/qr?phone=${encodeURIComponent(msg.phoneNumber)}`}
                                  className="px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-semibold"
                                >
                                  Chat
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredMessages.length === 0 && (
                    <div className="text-center py-12 text-gray-500">No messages match the selected filter</div>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => { setView('list'); router.push('/admin/crm/qr/broadcast-report'); }}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold"
                  >
                    ← Back to All Reports
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">📅 Reschedule Broadcast</h2>
            <p className="text-sm text-gray-500 mb-6">Failed messages will be reset to pending and sent at the new time.</p>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Date & Time (IST)</label>
              <input
                type="datetime-local"
                value={rescheduleDate}
                onChange={e => setRescheduleDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowRescheduleModal(false); setRescheduleDate(''); }}
                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={rescheduleBroadcast}
                disabled={actioning || !rescheduleDate}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl font-semibold text-sm"
              >
                {actioning ? '⏳ Saving...' : '📅 Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
