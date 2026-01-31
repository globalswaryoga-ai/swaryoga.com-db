'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  scheduledAt?: string;
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
    name?: string;
  };
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

export default function QRReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuth();

  const runId = searchParams.get('runId');
  const [view, setView] = useState<'list' | 'detail'>(runId ? 'detail' : 'list');

  const [runs, setRuns] = useState<BroadcastRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<BroadcastRun | null>(null);
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [messageFilter, setMessageFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  // Fetch QR broadcast runs only
  const fetchRuns = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/broadcast-runs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const allRuns = data?.data?.runs || data?.runs || [];
      // Filter only QR runs
      setRuns(allRuns.filter((r: BroadcastRun) => r.provider === 'qr'));
    } catch (err) {
      console.error('Failed to load runs:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchRunDetail = useCallback(async (id: string) => {
    if (!token) return;
    setLoading(true);
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
    setActionLoading('run');
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
        setActionResult(`✅ Run triggered! Sent: ${stats.sent || 0}, Failed: ${stats.failed || 0}, Skipped: ${stats.skipped || 0}`);
        setTimeout(() => fetchRunDetail(runId), 1500);
      } else {
        setActionResult(`❌ ${data.error || 'Failed to trigger run'}`);
      }
    } catch (err: any) {
      setActionResult(`❌ ${err.message || 'Error triggering run'}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Perform an action on the broadcast run
  const performAction = async (action: string) => {
    if (!token || !runId) return;
    setShowConfirm(null);
    setActionLoading(action);
    setActionResult(null);
    try {
      if (action === 'delete') {
        const res = await fetch(`/api/admin/crm/broadcast-runs/${runId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setActionResult(`✅ ${data.data?.message || 'Deleted'}`);
          setTimeout(() => router.push('/admin/crm/reports/qr'), 1500);
        } else {
          setActionResult(`❌ ${data.error || 'Failed'}`);
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
          setActionResult(`✅ ${data.data?.message || 'Done'}`);
          setTimeout(() => fetchRunDetail(runId), 1000);
        } else {
          setActionResult(`❌ ${data.error || 'Failed'}`);
        }
      }
    } catch (err: any) {
      setActionResult(`❌ ${err.message || 'Error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (runId) {
      setView('detail');
      fetchRunDetail(runId);
    } else {
      setView('list');
      fetchRuns();
    }
  }, [token, runId, fetchRuns, fetchRunDetail]);

  const filteredMessages = useMemo(() => {
    if (messageFilter === 'all') return messages;
    return messages.filter(m => m.status === messageFilter);
  }, [messages, messageFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    return runs.reduce((acc, run) => ({
      total: acc.total + (run.stats?.total || 0),
      sent: acc.sent + (run.stats?.sent || 0),
      delivered: acc.delivered + (run.stats?.delivered || 0),
      read: acc.read + (run.stats?.read || 0),
      failed: acc.failed + (run.stats?.failed || 0),
    }), { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 });
  }, [runs]);

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
                💚 QR WhatsApp Reports
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/crm/reports/meta"
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm"
              >
                🟢 Meta Reports
              </Link>
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
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 border shadow-sm">
                <div className="text-sm text-gray-500">Total Messages</div>
                <div className="text-2xl font-bold text-gray-800">{totals.total}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border shadow-sm">
                <div className="text-sm text-gray-500">Sent</div>
                <div className="text-2xl font-bold text-green-600">{totals.sent}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border shadow-sm">
                <div className="text-sm text-gray-500">Delivered</div>
                <div className="text-2xl font-bold text-emerald-600">{totals.delivered}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border shadow-sm">
                <div className="text-sm text-gray-500">Read</div>
                <div className="text-2xl font-bold text-teal-600">{totals.read}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border shadow-sm">
                <div className="text-sm text-gray-500">Failed</div>
                <div className="text-2xl font-bold text-red-600">{totals.failed}</div>
              </div>
            </div>

            {/* Runs List */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">💚 QR Broadcasts</h2>
                <button
                  onClick={fetchRuns}
                  className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                >
                  🔄 Refresh
                </button>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : runs.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No QR broadcasts found. Send your first broadcast!
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
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Failed</th>
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
                          <td className="px-4 py-3 text-center text-red-600 font-medium">{run.stats?.failed || 0}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => router.push(`/admin/crm/reports/qr?runId=${run._id}`)}
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
                  router.push('/admin/crm/reports/qr');
                }}
                className="text-green-600 hover:text-green-700 flex items-center gap-1"
              >
                ← Back to list
              </button>
            </div>

            {selectedRun && (
              <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{selectedRun.name}</h2>
                    <div className="text-sm text-gray-500 space-y-1">
                      <div>Status: <StatusBadge status={selectedRun.status} /></div>
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
                  <div className="flex gap-2 flex-wrap">
                    {/* Resume/Send Pending - shows when there are pending messages */}
                    {(selectedRun.stats?.pending || 0) > 0 && (
                      <button
                        onClick={triggerRun}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === 'run' ? '⏳ Sending...' : `▶️ Send ${selectedRun.stats?.pending || 0} Pending`}
                      </button>
                    )}
                    {/* Run Now - for scheduled/draft runs with no pending (shouldn't happen but fallback) */}
                    {(selectedRun.stats?.pending || 0) === 0 && ['scheduled', 'draft'].includes(selectedRun.status) && (
                      <button
                        onClick={triggerRun}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {actionLoading === 'run' ? '⏳...' : '▶️ Run Now'}
                      </button>
                    )}
                    {/* Cancel - for running/scheduled runs */}
                    {['scheduled', 'running', 'draft'].includes(selectedRun.status) && (
                      <button
                        onClick={() => setShowConfirm('cancel')}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                      >
                        ⏹️ Cancel
                      </button>
                    )}
                    {/* Retry Failed - reset failed messages to pending then can run again */}
                    {(selectedRun.stats?.failed || 0) > 0 && (
                      <button
                        onClick={() => setShowConfirm('retry-failed')}
                        disabled={!!actionLoading}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionLoading === 'retry-failed' ? '⏳...' : `🔁 Retry ${selectedRun.stats?.failed || 0} Failed`}
                      </button>
                    )}
                    {/* Reset All - reset everything back to pending */}
                    <button
                      onClick={() => setShowConfirm('reset-all')}
                      disabled={!!actionLoading}
                      className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {actionLoading === 'reset-all' ? '⏳...' : '🔄 Reset All'}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => setShowConfirm('delete')}
                      disabled={!!actionLoading}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading === 'delete' ? '⏳...' : '🗑️ Delete'}
                    </button>
                  </div>
                </div>

                {/* Action Result */}
                {actionResult && (
                  <div className={`mb-4 p-3 rounded-lg text-sm ${actionResult.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {actionResult}
                  </div>
                )}

                {/* Confirmation Dialog */}
                {showConfirm && (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-3">
                      Are you sure you want to <strong>{showConfirm}</strong> this broadcast run?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => performAction(showConfirm)}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                      >
                        Yes, {showConfirm}
                      </button>
                      <button
                        onClick={() => setShowConfirm(null)}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Messages ({filteredMessages.length})</h3>
                <select
                  value={messageFilter}
                  onChange={(e) => setMessageFilter(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="all">All</option>
                  <option value="sent">Sent</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredMessages.map((msg) => (
                        <tr key={msg._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-sm">{msg.phoneNumber}</td>
                          <td className="px-4 py-3">{msg.lead?.name || '-'}</td>
                          <td className="px-4 py-3"><StatusBadge status={msg.status} /></td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-red-500">
                            {msg.failureReason || '-'}
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
    </div>
  );
}
