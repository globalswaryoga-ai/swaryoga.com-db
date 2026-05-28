'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3, Loader2, CheckCircle2, AlertCircle, Clock, Eye, Trash2,
  RefreshCw, X, ArrowUpRight, ArrowDownLeft, Filter, ChevronDown,
  Send, Ban, Circle, CheckCheck, MessageSquare, CalendarDays,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PeriodStats {
  sent: number;
  pending: number;
  failed: number;
  blocked?: number;
}

interface StatsDashboard {
  today: PeriodStats;
  week: PeriodStats;
  month: PeriodStats;
  year: PeriodStats;
}

interface BroadcastSchedule {
  _id: string;
  name: string;
  messageText: string;
  totalRecipients: number;
  startTime: string;
  endTime: string;
  frequency: string;
  status: string;
  isActive: boolean;
  stats?: { totalSent: number; totalFailed: number; totalPending?: number; totalBlocked?: number };
  createdAt?: string;
  lastError?: string;
}

interface QrMessage {
  _id?: string;
  userId: string;
  chatJid: string;
  direction: 'inbound' | 'outbound';
  fromMe: boolean;
  text: string;
  type: string;
  timestamp: number;
  status: number; // 0=pending, 1=sent, 2=delivered, 3=read, -1=failed
  hasMedia: boolean;
  createdAt?: string;
}

interface HistoryTabProps {
  token: string | null;
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ broadcast, onClose }: { broadcast: BroadcastSchedule; onClose: () => void }) {
  const s = broadcast.stats || { totalSent: 0, totalFailed: 0, totalPending: 0, totalBlocked: 0 };
  const total = Math.max(broadcast.totalRecipients || 0, s.totalSent + (s.totalFailed || 0) + (s.totalPending || 0));

  const bar = (value: number, color: string) => (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`}
        style={{ width: `${total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0}%` }} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">{broadcast.name || 'Broadcast'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 max-h-24 overflow-y-auto leading-relaxed">
            {broadcast.messageText}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Time Window</p>
              <p className="font-medium text-gray-800">{broadcast.startTime}–{broadcast.endTime}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Frequency</p>
              <p className="font-medium text-gray-800 capitalize">{broadcast.frequency}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-500 uppercase font-semibold">Delivery Breakdown</p>
            {[
              { label: 'Sent', value: s.totalSent, color: 'bg-green-500', text: 'text-green-600' },
              { label: 'Pending', value: s.totalPending || 0, color: 'bg-blue-500', text: 'text-blue-600' },
              { label: 'Failed', value: s.totalFailed || 0, color: 'bg-red-500', text: 'text-red-600' },
            ].map(({ label, value, color, text }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{label}</span>
                  <span className={`font-semibold ${text}`}>{value}</span>
                </div>
                {bar(value, color)}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-green-700">Total Recipients</p>
            <p className="text-2xl font-bold text-green-700">{broadcast.totalRecipients || total}</p>
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    paused: 'bg-gray-100 text-gray-600',
    draft: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

// ─── Message Status Icon ──────────────────────────────────────────────────────

function MsgStatus({ status }: { status: number }) {
  if (status === 3) return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
  if (status === 2) return <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
  if (status === 1) return <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />;
  if (status === -1) return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
  return <Circle className="w-3.5 h-3.5 text-gray-300" />;
}

function msgStatusLabel(status: number): string {
  if (status === 3) return 'Read';
  if (status === 2) return 'Delivered';
  if (status === 1) return 'Sent';
  if (status === -1) return 'Failed';
  return 'Pending';
}

function msgStatusColor(status: number): string {
  if (status === 3) return 'text-blue-600';
  if (status === 2) return 'text-gray-500';
  if (status === 1) return 'text-green-600';
  if (status === -1) return 'text-red-600';
  return 'text-gray-400';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HistoryTab({ token }: HistoryTabProps) {
  const [qrMessages, setQrMessages] = useState<QrMessage[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastSchedule[]>([]);
  const [stats, setStats] = useState<StatsDashboard>({
    today: { sent: 0, pending: 0, failed: 0 },
    week:  { sent: 0, pending: 0, failed: 0 },
    month: { sent: 0, pending: 0, failed: 0 },
    year:  { sent: 0, pending: 0, failed: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDirection, setFilterDirection] = useState<string>('outbound');
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastSchedule | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => { return () => { isMounted.current = false; }; }, []);

  // Default date range: last 30 days
  const defaultFrom = () => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; };
  const defaultTo   = () => new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  const fetchData = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      // Build QR messages params
      const qrParams = new URLSearchParams();
      qrParams.set('direction', filterDirection === 'all' ? 'all' : filterDirection);
      qrParams.set('limit', '200');
      if (filterStatus !== 'all') qrParams.set('status', filterStatus);
      if (dateFrom) qrParams.set('startDate', dateFrom);
      if (dateTo) qrParams.set('endDate', dateTo);

      const [qrRes, broadcastsRes] = await Promise.all([
        fetch(`/api/admin/crm/qr-messages?${qrParams}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/crm/qr-broadcast-schedule', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!isMounted.current) return;

      if (qrRes.ok) {
        const data = await qrRes.json();
        setQrMessages(data?.messages ?? []);
        if (data?.stats) {
          setStats(data.stats);
        }
      }

      if (broadcastsRes.ok) {
        const data = await broadcastsRes.json();
        const schedules = (data?.data ?? []).map((b: any) => {
          const s = b.stats || {};
          return {
            ...b,
            stats: {
              totalSent: s.totalSent || 0,
              totalFailed: s.totalFailed || 0,
              totalPending: Math.max(0, (b.totalRecipients || 0) - (s.totalSent || 0) - (s.totalFailed || 0) - (s.totalSkipped || 0)),
              totalBlocked: s.totalBlocked || 0,
            },
          };
        });
        setBroadcasts(schedules);
      }
    } catch (e: any) {
      if (isMounted.current) setError(e.message || 'Failed to load data');
    } finally {
      if (isMounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, [token, filterStatus, filterDirection, dateFrom, dateTo]);

  useEffect(() => { if (token) fetchData(); }, [token, filterStatus, filterDirection, dateFrom, dateTo, fetchData]);

  const deleteSchedule = async (id: string) => {
    if (!token || !confirm('Delete this scheduled broadcast?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/crm/qr-broadcast-schedule/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setBroadcasts(prev => prev.filter(b => b._id !== id));
    } catch {}
    setDeleting(null);
  };

  const retrySchedule = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/crm/qr-broadcast-schedule/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'scheduled', lastError: null, lastRunDate: null }),
      });
      if (res.ok) setBroadcasts(prev => prev.map(b => b._id === id ? { ...b, status: 'scheduled' } : b));
    } catch {}
  };

  // ── Stats Card ──────────────────────────────────────────────────────────────

  const StatCard = ({ label, period }: { label: string; period: PeriodStats }) => (
    <div className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-sm transition">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">{label}</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <CheckCheck className="w-3 h-3 text-green-500" /> Sent
          </span>
          <span className="text-lg font-bold text-green-600">{period.sent}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-blue-400" /> Pending
          </span>
          <span className="text-lg font-bold text-blue-500">{period.pending}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-red-400" /> Failed
          </span>
          <span className="text-lg font-bold text-red-500">{period.failed}</span>
        </div>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Loader2 className="w-7 h-7 animate-spin text-green-500" />
      </div>
    );
  }

  const sentMessages = qrMessages.filter(m => m.direction === 'outbound');
  const inboundMessages = qrMessages.filter(m => m.direction === 'inbound');
  const visibleMessages = filterDirection === 'inbound' ? inboundMessages : filterDirection === 'all' ? qrMessages : sentMessages;

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-auto">

      {/* ── Stats ── */}
      <div className="px-5 py-4 bg-white border-b">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-green-600" />
            <h3 className="text-sm font-semibold text-gray-800">Message Statistics</h3>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard label="Today"      period={stats.today} />
          <StatCard label="This Week"  period={stats.week}  />
          <StatCard label="This Month" period={stats.month} />
          <StatCard label="This Year"  period={stats.year}  />
        </div>
      </div>

      {/* ── Tab nav ── */}
      <div className="flex items-center gap-1 px-5 pt-4 bg-white border-b">
        {([
          { key: 'scheduled', label: 'Scheduled Messages', count: broadcasts.length },
          { key: 'sent',      label: 'Sent Messages',      count: sentMessages.length },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition rounded-t-lg border-b-2 -mb-px ${
              activeTab === key
                ? 'text-green-600 border-green-500 bg-white'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === key ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {/* ── Filters (Sent tab only) ── */}
      {activeTab === 'sent' && (
        <div className="flex items-center gap-2 px-5 py-3 bg-white border-b flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </div>
          <select
            value={filterDirection}
            onChange={e => setFilterDirection(e.target.value)}
            className="text-xs px-2.5 py-1.5 border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-400"
          >
            <option value="outbound">Outbound</option>
            <option value="inbound">Inbound</option>
            <option value="all">All Directions</option>
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-400"
          >
            <option value="all">All Status</option>
            <option value="sent">Sent / Delivered / Read</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="text-xs px-2.5 py-1.5 border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-400" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="text-xs px-2.5 py-1.5 border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-400" />
          <button
            onClick={() => { setFilterStatus('all'); setFilterDirection('outbound'); setDateFrom(defaultFrom()); setDateTo(defaultTo()); }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition"
          >
            Reset
          </button>
        </div>
      )}

      {error && (
        <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">

        {/* Scheduled Messages */}
        {activeTab === 'scheduled' && (
          broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <CalendarDays className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">No scheduled broadcasts yet</p>
              <p className="text-xs mt-1">Create a broadcast from the Broadcast tab</p>
            </div>
          ) : (
            <div className="p-5">
              <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Message</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Time Window</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-500">Recipients</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-500">Sent</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-500">Status</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Created</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {broadcasts.map(b => {
                      const s = b.stats || { totalSent: 0, totalFailed: 0, totalPending: 0 };
                      const progress = b.totalRecipients > 0 ? Math.min(100, Math.round((s.totalSent / b.totalRecipients) * 100)) : 0;
                      const createdStr = b.createdAt
                        ? new Date(b.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                        : '—';

                      return (
                        <tr key={b._id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 max-w-[200px]">
                            <p className="font-medium text-gray-800 truncate" title={b.messageText}>{b.messageText}</p>
                            {b.isActive && <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 mt-0.5"><span className="w-1.5 h-1.5 bg-green-500 rounded-full" />Active</span>}
                            {b.status === 'failed' && b.lastError && (
                              <p className="text-[10px] text-red-500 truncate mt-0.5" title={b.lastError}>⚠ {b.lastError}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {b.startTime}–{b.endTime}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-700">{b.totalRecipients}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1 text-xs">
                                <span className="font-semibold text-green-600">{s.totalSent}</span>
                                {(s.totalFailed || 0) > 0 && <span className="text-red-500">/ {s.totalFailed}✕</span>}
                                {(s.totalPending || 0) > 0 && <span className="text-blue-400">/ {s.totalPending}…</span>}
                              </div>
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={b.status} />
                          </td>
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{createdStr}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setSelectedBroadcast(b)} className="p-1 text-green-600 hover:bg-green-50 rounded-lg transition" title="View details">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {b.status === 'failed' && (
                                <button onClick={() => retrySchedule(b._id)} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg transition text-[10px] font-bold" title="Retry">↺</button>
                              )}
                              <button
                                onClick={() => deleteSchedule(b._id)}
                                disabled={deleting === b._id}
                                className="p-1 text-red-400 hover:bg-red-50 rounded-lg transition disabled:opacity-40"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* Sent / Inbox Messages */}
        {activeTab === 'sent' && (
          visibleMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <MessageSquare className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">No messages found</p>
              <p className="text-xs mt-1">Messages you send from the Inbox appear here</p>
            </div>
          ) : (
            <div className="p-5">
              <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Direction</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Contact</th>
                      <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Message</th>
                      <th className="px-4 py-2.5 text-center font-semibold text-gray-500">Status</th>
                      <th className="px-4 py-2.5 text-right font-semibold text-gray-500">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {visibleMessages.map((msg, idx) => {
                      const phone = msg.chatJid?.split('@')[0] || '—';
                      const sentAt = msg.timestamp
                        ? new Date(msg.timestamp * 1000).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : msg.createdAt
                          ? new Date(msg.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '—';
                      const isOut = msg.direction === 'outbound';

                      return (
                        <tr key={msg._id || idx} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isOut ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {isOut ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownLeft className="w-2.5 h-2.5" />}
                              {isOut ? 'Sent' : 'Received'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">
                            {phone.length >= 10 ? `+${phone}` : phone}
                          </td>
                          <td className="px-4 py-3 text-gray-600 max-w-xs">
                            <span className="truncate block max-w-[220px]" title={msg.text}>
                              {msg.text || (msg.hasMedia ? '📎 Media' : '—')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <MsgStatus status={msg.status} />
                              <span className={`text-[10px] font-medium ${msgStatusColor(msg.status)}`}>
                                {msgStatusLabel(msg.status)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400">{sentAt}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {visibleMessages.length >= 200 && (
                <p className="text-center text-xs text-gray-400 mt-3">
                  Showing latest 200 messages. Use date filters to narrow the range.
                </p>
              )}
            </div>
          )
        )}
      </div>

      {selectedBroadcast && <DetailModal broadcast={selectedBroadcast} onClose={() => setSelectedBroadcast(null)} />}
    </div>
  );
}
