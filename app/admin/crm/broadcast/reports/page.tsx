'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCRM } from '@/hooks/useCRM';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import { AlertBox, LoadingSpinner } from '@/components/admin/crm';

// Meta WhatsApp pricing (approximate INR rates as of 2024)
const META_PRICING = {
  marketing: 0.80, // INR per message (India)
  utility: 0.35,
  authentication: 0.30,
  service: 0, // Free within 24h window
};

type BroadcastRun = {
  _id: string;
  name: string;
  createdAt: string;
  status: string;
  provider: 'meta' | 'qr';
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
  startedAt?: string;
  completedAt?: string;
};

type BroadcastMessage = {
  _id: string;
  phoneNumber: string;
  status: string;
  failureReason?: string;
  failureCode?: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  provider: string;
  cost?: {
    amount: number;
    currency: string;
  };
  lead?: {
    _id: string;
    name?: string;
    phoneNumber?: string;
    status?: string;
    workshopName?: string;
    labels?: string[];
  };
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    sending: 'bg-indigo-100 text-indigo-700',
    sent: 'bg-green-100 text-green-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    read: 'bg-teal-100 text-teal-700',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-yellow-100 text-yellow-700',
    blocked: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
    running: 'bg-indigo-100 text-indigo-700',
    scheduled: 'bg-purple-100 text-purple-700',
    draft: 'bg-gray-100 text-gray-700',
  };
  
  const icons: Record<string, string> = {
    pending: '⏳',
    sending: '📤',
    sent: '✅',
    delivered: '📬',
    read: '👁️',
    failed: '❌',
    skipped: '⏭️',
    blocked: '🚫',
    completed: '✅',
    running: '🔄',
    scheduled: '📅',
    draft: '📝',
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
    green: 'bg-green-500',
    blue: 'bg-indigo-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    teal: 'bg-teal-500',
  };
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full transition-all ${colorClasses[color] || 'bg-green-500'}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default function BroadcastReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAuth();
  const crm = useCRM({ token });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check superAdmin access — read localStorage directly so we don't
  // redirect before useAuth() has set the token state (it starts null).
  useEffect(() => {
    const checkAccess = () => {
      const storedToken = typeof window !== 'undefined'
        ? (localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token'))
        : null;
      if (!storedToken) {
        router.replace('/admin/login');
        return;
      }
      const isAdmin = checkIsSuperAdmin();
      if (!isAdmin) {
        router.replace('/admin/crm');
        return;
      }
      setIsSuperAdmin(true);
      setIsChecking(false);
    };
    checkAccess();
  }, [token, router]);

  const runId = searchParams.get('runId');
  const [view, setView] = useState<'list' | 'detail'>(runId ? 'detail' : 'list');

  // List view state
  const [runs, setRuns] = useState<BroadcastRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);

  // Detail view state
  const [selectedRun, setSelectedRun] = useState<BroadcastRun | null>(null);
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [messageFilter, setMessageFilter] = useState<string>('all');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch all broadcast runs
  const fetchRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const res = await crm.fetch('/api/admin/crm/broadcast-runs', { method: 'GET' });
      const runsData = res?.data?.runs || res?.runs || [];
      setRuns(runsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load broadcasts');
    } finally {
      setLoadingRuns(false);
    }
  }, [crm]);

  // Fetch single run detail with messages
  const fetchRunDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await crm.fetch(`/api/admin/crm/broadcast-runs/${id}?limit=500`, { method: 'GET' });
      const data = res?.data || res;
      setSelectedRun(data?.run || null);
      setMessages(data?.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load broadcast details');
    } finally {
      setLoadingDetail(false);
    }
  }, [crm]);

  useEffect(() => {
    if (!token) return; // useAuth handles redirect if truly logged out
    
    if (runId) {
      setView('detail');
      fetchRunDetail(runId);
    } else {
      setView('list');
      fetchRuns();
    }
  }, [token, runId, router, fetchRuns, fetchRunDetail]);

  // Filter messages
  const filteredMessages = useMemo(() => {
    if (messageFilter === 'all') return messages;
    return messages.filter(m => m.status === messageFilter);
  }, [messages, messageFilter]);

  // Calculate stats from messages
  const messageStats = useMemo(() => {
    const stats = {
      total: messages.length,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      blocked: 0,
      pending: 0,
    };
    messages.forEach(m => {
      if (m.status === 'sent' || m.status === 'delivered' || m.status === 'read') stats.sent++;
      if (m.status === 'delivered' || m.status === 'read') stats.delivered++;
      if (m.status === 'read') stats.read++;
      if (m.status === 'failed') stats.failed++;
      if (m.status === 'blocked') stats.blocked++;
      if (m.status === 'pending' || m.status === 'sending') stats.pending++;
    });
    return stats;
  }, [messages]);

  // Calculate success ratio
  const successRatio = useMemo(() => {
    const attempted = messageStats.total - messageStats.pending;
    if (attempted === 0) return 0;
    return Math.round((messageStats.sent / attempted) * 100);
  }, [messageStats]);

  // Calculate cost
  const estimatedCost = useMemo(() => {
    if (!selectedRun) return 0;
    if (selectedRun.provider === 'qr') return 0; // QR is free
    
    // Use saved cost or estimate based on marketing rate
    if (selectedRun.cost?.totalCost) return selectedRun.cost.totalCost;
    
    return messageStats.sent * META_PRICING.marketing;
  }, [selectedRun, messageStats.sent]);

  // Toggle message selection
  const toggleMessageSelection = (id: string) => {
    setSelectedMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all successful
  const selectSuccessful = () => {
    const successful = messages.filter(m => 
      m.status === 'sent' || m.status === 'delivered' || m.status === 'read'
    );
    setSelectedMessages(new Set(successful.map(m => m._id)));
  };

  // Select all failed
  const selectFailed = () => {
    const failed = messages.filter(m => 
      m.status === 'failed' || m.status === 'blocked'
    );
    setSelectedMessages(new Set(failed.map(m => m._id)));
  };

  // Clear selection
  const clearSelection = () => setSelectedMessages(new Set());

  // Resend to selected
  const resendToSelected = async () => {
    if (selectedMessages.size === 0) return;
    const selectedMsgs = messages.filter(m => selectedMessages.has(m._id));
    const phoneNumbers = selectedMsgs.map(m => m.phoneNumber);
    
    // Navigate to broadcast page with pre-selected numbers
    // This is a simple approach - could also create a new broadcast run directly
    const leadIds = selectedMsgs.map(m => m.lead?._id).filter(Boolean);
    router.push(`/admin/crm/broadcast?leadIds=${leadIds.join(',')}`);
  };

  // Export report as CSV
  const exportCSV = () => {
    if (!selectedRun || messages.length === 0) return;
    
    const headers = ['Phone Number', 'Name', 'Status', 'Sent At', 'Delivered At', 'Read At', 'Failure Reason', 'Provider', 'Cost'];
    const rows = messages.map(m => [
      m.phoneNumber,
      m.lead?.name || '',
      m.status,
      m.sentAt ? new Date(m.sentAt).toLocaleString() : '',
      m.deliveredAt ? new Date(m.deliveredAt).toLocaleString() : '',
      m.readAt ? new Date(m.readAt).toLocaleString() : '',
      m.failureReason || '',
      m.provider || selectedRun.provider,
      m.cost?.amount?.toString() || '0',
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `broadcast-report-${selectedRun._id}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Report exported!');
    setTimeout(() => setSuccess(null), 3000);
  };

  // Check authorization before showing anything
  if (isChecking || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          {isChecking && <div className="animate-spin text-4xl">⏳</div>}
          {!isChecking && !isSuperAdmin && (
            <div className="text-red-600">
              <div className="text-4xl mb-4">🔒</div>
              <p className="font-medium">This feature is for super admins only</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/crm/broadcast" className="text-gray-500 hover:text-gray-700">
                ← Back to Broadcast
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                📊 Broadcast Reports
              </h1>
            </div>
            
            {view === 'detail' && selectedRun && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchRunDetail(selectedRun._id)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold"
                >
                  ↻ Refresh
                </button>
                <button
                  onClick={exportCSV}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold"
                >
                  📥 Export CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

        {view === 'list' ? (
          // Broadcast Runs List
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">All Broadcasts</h2>
              <Link
                href="/admin/crm/broadcast"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm"
              >
                + New Broadcast
              </Link>
            </div>

            {loadingRuns ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : runs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="text-5xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No broadcasts yet</h3>
                <p className="text-gray-500 mb-6">Create your first broadcast to start messaging leads</p>
                <Link
                  href="/admin/crm/broadcast"
                  className="inline-block px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                >
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
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Provider</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Total</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Sent</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Delivered</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Read</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Failed</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Cost</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {runs.map(run => (
                      <tr key={run._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-gray-900">{run.name}</div>
                          <div className="text-xs text-gray-500">
                            {run.templateSnapshot?.templateName || 'Unknown template'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(run.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={run.status} />
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                            run.provider === 'meta' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {run.provider === 'meta' ? '🟢 Meta' : '📲 QR'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center font-semibold">{run.stats?.total || 0}</td>
                        <td className="px-4 py-4 text-center text-green-600 font-semibold">{run.stats?.sent || 0}</td>
                        <td className="px-4 py-4 text-center text-emerald-600 font-semibold">{run.stats?.delivered || 0}</td>
                        <td className="px-4 py-4 text-center text-teal-600 font-semibold">{run.stats?.read || 0}</td>
                        <td className="px-4 py-4 text-center text-red-600 font-semibold">
                          {(run.stats?.failed || 0) + (run.stats?.blocked || 0)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {run.provider === 'qr' ? (
                            <span className="text-green-600 font-semibold">Free</span>
                          ) : (
                            <span className="font-semibold">
                              ₹{((run.cost?.totalCost || 0) || ((run.stats?.sent || 0) * META_PRICING.marketing)).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => {
                              router.push(`/admin/crm/broadcast/reports?runId=${run._id}`);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
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
          // Detail View
          <div>
            {loadingDetail ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : !selectedRun ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-gray-500">Broadcast not found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {[
                    { label: 'Total', value: messageStats.total, color: 'gray', icon: '📊' },
                    { label: 'Sent', value: messageStats.sent, color: 'green', icon: '✅' },
                    { label: 'Delivered', value: messageStats.delivered, color: 'emerald', icon: '📬' },
                    { label: 'Read', value: messageStats.read, color: 'teal', icon: '👁️' },
                    { label: 'Pending', value: messageStats.pending, color: 'yellow', icon: '⏳' },
                    { label: 'Failed', value: messageStats.failed, color: 'red', icon: '❌' },
                    { label: 'Blocked', value: messageStats.blocked, color: 'orange', icon: '🚫' },
                    { label: 'Success', value: `${successRatio}%`, color: 'blue', icon: '📈' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="text-2xl mb-1">{stat.icon}</div>
                      <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                      <div className="text-xs text-gray-500 font-semibold uppercase">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Run Info Card */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedRun.name}</h2>
                      <p className="text-gray-500 text-sm">
                        Template: {selectedRun.templateSnapshot?.templateName || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <StatusBadge status={selectedRun.status} />
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          selectedRun.provider === 'meta' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {selectedRun.provider === 'meta' ? '🟢 Meta Cloud API' : '📲 QR Bridge (Free)'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Estimated Cost</div>
                      <div className="text-3xl font-bold text-gray-900">
                        {selectedRun.provider === 'qr' ? (
                          <span className="text-green-600">Free</span>
                        ) : (
                          <span>₹{estimatedCost.toFixed(2)}</span>
                        )}
                      </div>
                      {selectedRun.provider === 'meta' && (
                        <div className="text-xs text-gray-400">
                          @₹{META_PRICING.marketing}/msg (Marketing)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bars */}
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

                {/* Message Actions Bar */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Filter */}
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
                      <option value="blocked">Blocked ({messages.filter(m => m.status === 'blocked').length})</option>
                      <option value="pending">Pending ({messages.filter(m => m.status === 'pending').length})</option>
                    </select>

                    <div className="border-l border-gray-200 h-6" />

                    {/* Selection actions */}
                    <button
                      onClick={selectSuccessful}
                      className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-semibold"
                    >
                      ✅ Select Successful
                    </button>
                    <button
                      onClick={selectFailed}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-semibold"
                    >
                      ❌ Select Failed
                    </button>
                    <button
                      onClick={clearSelection}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
                    >
                      Clear
                    </button>

                    {selectedMessages.size > 0 && (
                      <>
                        <div className="border-l border-gray-200 h-6" />
                        <span className="text-sm font-semibold text-gray-600">
                          {selectedMessages.size} selected
                        </span>
                        <button
                          onClick={resendToSelected}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
                        >
                          📤 Resend to Selected
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Messages Table */}
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
                                  clearSelection();
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
                          <tr key={msg._id} className={`hover:bg-gray-50 ${selectedMessages.has(msg._id) ? 'bg-indigo-50' : ''}`}>
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedMessages.has(msg._id)}
                                onChange={() => toggleMessageSelection(msg._id)}
                                className="rounded"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">{msg.lead?.name || 'Unknown'}</div>
                              <div className="text-sm text-gray-500">{msg.phoneNumber}</div>
                              {msg.lead?.workshopName && (
                                <div className="text-xs text-gray-400">{msg.lead.workshopName}</div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={msg.status} />
                            </td>
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
                                <div className="text-xs text-red-600" title={msg.failureReason}>
                                  {msg.failureCode || 'Error'}: {msg.failureReason.slice(0, 30)}...
                                </div>
                              )}
                              {msg.cost?.amount ? (
                                <div className="text-xs text-gray-500">₹{msg.cost.amount}</div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Link
                                  href={`/admin/crm/leads?search=${encodeURIComponent(msg.phoneNumber)}`}
                                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-semibold"
                                >
                                  View Lead
                                </Link>
                                {selectedRun.provider === 'qr' && (
                                  <Link
                                    href={`/admin/crm/qr?phone=${encodeURIComponent(msg.phoneNumber)}`}
                                    className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-xs font-semibold"
                                  >
                                    Chat
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {filteredMessages.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      No messages match the selected filter
                    </div>
                  )}
                </div>

                {/* Back button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => router.push('/admin/crm/broadcast/reports')}
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
    </div>
  );
}
