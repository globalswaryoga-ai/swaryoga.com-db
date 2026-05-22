'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

// ── Types ────────────────────────────────────────────────────────────────────

type QRBroadcast = {
  _id: string;
  name: string;
  messageText: string;
  createdAt: string;
  lastRunDate?: string;
  status: string;
  isActive: boolean;
  frequency: string;
  startTime: string;
  endTime: string;
  totalRecipients: number;
  recipientType?: string;
  mediaUrls?: string[];
  userId: string;
  stats?: {
    totalSent?: number;
    totalFailed?: number;
    totalSkipped?: number;
    totalAttempted?: number;
    averageDeliveryTimeMs?: number;
  };
};

type QRMessage = {
  _id: string;
  phoneNumber: string;
  direction: string;
  messageContent?: string;
  messageType?: string;
  status: string;
  sentAt?: string;
  createdAt?: string;
  sentByUserId?: string;
  recipientType?: string;
  media?: { kind: string; url?: string };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; label: string }> = {
    completed:   { bg: 'bg-green-100 text-green-700',  label: '✅ completed' },
    scheduled:   { bg: 'bg-blue-100 text-blue-700',    label: '📅 scheduled' },
    'in-progress': { bg: 'bg-yellow-100 text-yellow-700', label: '🔄 in-progress' },
    paused:      { bg: 'bg-gray-100 text-gray-700',    label: '⏸ paused' },
    failed:      { bg: 'bg-red-100 text-red-700',      label: '❌ failed' },
    draft:       { bg: 'bg-purple-100 text-purple-700', label: '📝 draft' },
  };
  const s = map[status] || { bg: 'bg-gray-100 text-gray-700', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg}`}>
      {s.label}
    </span>
  );
}

function fmt(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function QRReportsPage() {
  const router = useRouter();
  const token = useAuth();

  const [broadcasts, setBroadcasts] = useState<QRBroadcast[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Detail view
  const [selected, setSelected] = useState<QRBroadcast | null>(null);
  const [messages, setMessages] = useState<QRMessage[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [msgFilter, setMsgFilter] = useState('all');

  // ── Fetch all scheduled broadcasts ─────────────────────────────────────────
  const fetchBroadcasts = useCallback(async () => {
    if (!token) return;
    setLoadingList(true);
    try {
      const res = await fetch('/api/admin/crm/qr-broadcast-schedule', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBroadcasts(data?.data || []);
    } catch (err) {
      console.error('[QR Reports] fetch broadcasts:', err);
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  // ── Fetch messages for detail view ─────────────────────────────────────────
  const fetchMessages = useCallback(async (broadcast: QRBroadcast) => {
    if (!token) return;
    setLoadingDetail(true);
    setSelected(broadcast);
    setMessages([]);
    try {
      // Fetch messages sent by this user around the broadcast's last run
      const params = new URLSearchParams({
        limit: '500',
        provider: 'all',
        sentByUserId: broadcast.userId,
      });
      if (broadcast.lastRunDate) {
        // Show messages within ±2 hours of the broadcast run
        const runTime = new Date(broadcast.lastRunDate).getTime();
        const from = new Date(runTime - 2 * 60 * 60 * 1000).toISOString().split('T')[0];
        const to = new Date(runTime + 2 * 60 * 60 * 1000).toISOString().split('T')[0];
        params.set('startDate', from);
        params.set('endDate', to);
      }
      const res = await fetch(`/api/admin/crm/messages?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data?.messages || []);
    } catch (err) {
      console.error('[QR Reports] fetch messages:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchBroadcasts();
  }, [token, fetchBroadcasts]);

  // ── Computed totals ────────────────────────────────────────────────────────
  const totals = useMemo(() => broadcasts.reduce((acc, b) => ({
    total:    acc.total    + (b.stats?.totalAttempted || b.totalRecipients || 0),
    sent:     acc.sent     + (b.stats?.totalSent      || 0),
    skipped:  acc.skipped  + (b.stats?.totalSkipped   || 0),
    failed:   acc.failed   + (b.stats?.totalFailed    || 0),
    groups:   acc.groups   + (b.recipientType === 'groups' ? 1 : 0),
  }), { total: 0, sent: 0, skipped: 0, failed: 0, groups: 0 }), [broadcasts]);

  const filteredMsgs = useMemo(() =>
    msgFilter === 'all' ? messages : messages.filter(m => m.status === msgFilter),
    [messages, msgFilter]
  );

  if (token === null) {
    return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>;
  }

  // ── Detail View ────────────────────────────────────────────────────────────
  if (selected) {
    const s = selected.stats || {};
    const sent    = s.totalSent     || 0;
    const failed  = s.totalFailed   || 0;
    const skipped = s.totalSkipped  || 0;
    const total   = s.totalAttempted || selected.totalRecipients || 0;

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-700">
                ← Back
              </button>
              <h1 className="text-xl font-bold text-green-600 flex items-center gap-2">
                📱 QR WhatsApp Reports
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto p-6">
          {/* Broadcast Info Card */}
          <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selected.name}</h2>
                <p className="text-sm text-gray-500 mt-1 max-w-2xl line-clamp-2">{selected.messageText}</p>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                  <span>📅 Created: {fmt(selected.createdAt)}</span>
                  {selected.lastRunDate && <span>▶️ Last run: {fmt(selected.lastRunDate)}</span>}
                  <span>⏰ Window: {selected.startTime} – {selected.endTime}</span>
                  <span>🔁 {selected.frequency}</span>
                  <span>{selected.recipientType === 'groups' ? '👥 Groups' : '👤 People'}</span>
                  {selected.mediaUrls && selected.mediaUrls.length > 0 && <span>🖼️ Has image</span>}
                </div>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
              {[
                { label: 'Total',    val: total,   color: 'text-gray-800' },
                { label: 'Sent',     val: sent,    color: 'text-green-600' },
                { label: 'Pending',  val: Math.max(0, (selected.totalRecipients || 0) - sent - failed), color: 'text-blue-600' },
                { label: 'Skipped',  val: skipped, color: 'text-yellow-600' },
                { label: 'Failed',   val: failed,  color: 'text-red-600' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className={`text-2xl font-bold ${color}`}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Messages Table */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">
                Sent Messages ({filteredMsgs.length})
              </h3>
              <select
                value={msgFilter}
                onChange={e => setMsgFilter(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="all">All</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="read">Read</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {loadingDetail ? (
              <div className="p-8 text-center text-gray-500">Loading messages…</div>
            ) : filteredMsgs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No messages found for this broadcast run.
                <p className="text-xs mt-1 text-gray-400">Messages appear here after the cron processes the schedule.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone / Group</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredMsgs.map(msg => (
                      <tr key={msg._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-mono text-sm text-gray-800">{msg.phoneNumber || '—'}</div>
                          {msg.recipientType === 'group' && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Group</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-sm text-gray-700 truncate">{msg.messageContent || '—'}</p>
                          {msg.media?.url && (
                            <a href={msg.media.url} target="_blank" rel="noopener noreferrer"
                               className="text-[10px] text-blue-600 hover:underline">🖼️ Image</a>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-500 capitalize">{msg.messageType || 'text'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={msg.status} />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {fmt(msg.sentAt || msg.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── List View ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/crm" className="text-gray-500 hover:text-gray-700">← CRM</Link>
            <h1 className="text-xl font-bold text-green-600 flex items-center gap-2">
              📱 QR WhatsApp Reports
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/crm/qr"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
            >
              📢 Send Broadcast
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total Messages', val: totals.total,   color: 'text-gray-800' },
            { label: 'Sent',           val: totals.sent,    color: 'text-green-600' },
            { label: 'Skipped',        val: totals.skipped, color: 'text-yellow-600' },
            { label: 'Failed',         val: totals.failed,  color: 'text-red-600' },
            { label: 'Group Broadcasts', val: totals.groups, color: 'text-purple-600' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="text-sm text-gray-500">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{val}</div>
            </div>
          ))}
        </div>

        {/* Broadcasts Table */}
        <div className="bg-white rounded-xl border shadow-sm">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              📱 QR WhatsApp Broadcasts
            </h2>
            <button
              onClick={fetchBroadcasts}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              🔄 Refresh
            </button>
          </div>

          {loadingList ? (
            <div className="p-8 text-center text-gray-500">Loading…</div>
          ) : broadcasts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No QR broadcasts found. Schedule your first broadcast from the QR WhatsApp page.
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
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Skipped</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Failed</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {broadcasts.map(b => {
                    const sent    = b.stats?.totalSent    || 0;
                    const failed  = b.stats?.totalFailed  || 0;
                    const skipped = b.stats?.totalSkipped || 0;
                    const total   = b.stats?.totalAttempted || b.totalRecipients || 0;
                    return (
                      <tr key={b._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 max-w-xs truncate" title={b.name}>{b.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate" title={b.messageText}>
                            {b.messageText}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {b.lastRunDate ? `Last run: ${fmt(b.lastRunDate)}` : fmt(b.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700">{b.userId || '—'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={b.status} />
                          {b.isActive && (
                            <span className="ml-1 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">Active</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-gray-800">{total}</td>
                        <td className="px-4 py-3 text-center font-medium text-green-600">{sent}</td>
                        <td className="px-4 py-3 text-center font-medium text-yellow-600">{skipped}</td>
                        <td className="px-4 py-3 text-center font-medium text-red-600">{failed}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            b.recipientType === 'groups'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {b.recipientType === 'groups' ? '👥 Groups' : '👤 People'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => fetchMessages(b)}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            👁️ View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
