'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Loader2, CheckCircle2, CheckCircle, AlertCircle, BarChart3, Eye, X, Trash2 } from 'lucide-react';

interface MessageRecord {
  _id?: string;
  id?: string;
  phoneNumber?: string;
  recipient?: string;
  message?: string;
  text?: string;
  status?: string;
  createdAt?: string;
  timestamp?: string;
  ticks?: number;
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
  stats?: {
    totalSent: number;
    totalFailed: number;
    totalPending?: number;
    totalBlocked?: number;
  };
  createdAt?: string;
}

interface StatsDashboard {
  today: { sent: number; failed: number; pending: number };
  week: { sent: number; failed: number; pending: number };
  month: { sent: number; failed: number; pending: number };
  year: { sent: number; failed: number; pending: number };
}

interface DetailModalProps {
  broadcast: BroadcastSchedule;
  onClose: () => void;
}

function DetailModal({ broadcast, onClose }: DetailModalProps) {
  const stats = broadcast.stats || { totalSent: 0, totalFailed: 0, totalPending: 0, totalBlocked: 0 };
  const total = stats.totalSent + (stats.totalFailed || 0) + (stats.totalPending || 0) + (stats.totalBlocked || 0);
  const percentSent = total > 0 ? Math.round((stats.totalSent / total) * 100) : 0;
  const percentFailed = total > 0 ? Math.round(((stats.totalFailed || 0) / total) * 100) : 0;
  const percentPending = total > 0 ? Math.round(((stats.totalPending || 0) / total) * 100) : 0;
  const percentBlocked = total > 0 ? Math.round(((stats.totalBlocked || 0) / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">{broadcast.name}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Message Preview */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Message</label>
            <p className="text-sm text-gray-700 p-3 bg-gray-50 rounded-lg max-h-24 overflow-y-auto">
              {broadcast.messageText}
            </p>
          </div>

          {/* Schedule Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Time Window</label>
              <p className="text-sm font-medium text-gray-900">{broadcast.startTime} - {broadcast.endTime}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Frequency</label>
              <p className="text-sm font-medium text-gray-900 capitalize">{broadcast.frequency}</p>
            </div>
          </div>

          {/* Status Breakdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-3">Status Breakdown</label>
            <div className="space-y-3">
              {/* Sent */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Sent
                  </span>
                  <span className="text-sm font-bold text-green-600">{stats.totalSent} ({percentSent}%)</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${percentSent}%` }} />
                </div>
              </div>

              {/* Pending */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    Pending
                  </span>
                  <span className="text-sm font-bold text-blue-600">{stats.totalPending || 0} ({percentPending}%)</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${percentPending}%` }} />
                </div>
              </div>

              {/* Failed */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    Failed
                  </span>
                  <span className="text-sm font-bold text-red-600">{stats.totalFailed || 0} ({percentFailed}%)</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${percentFailed}%` }} />
                </div>
              </div>

              {/* Blocked */}
              {(stats.totalBlocked || 0) > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      Blocked
                    </span>
                    <span className="text-sm font-bold text-orange-600">{stats.totalBlocked} ({percentBlocked}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${percentBlocked}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Total Recipients */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-green-700 uppercase">Total Recipients</p>
            <p className="text-2xl font-bold text-green-700">{broadcast.totalRecipients || total}</p>
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t flex justify-end gap-2 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

interface HistoryTabProps {
  token: string | null;
}

export function HistoryTab({ token }: HistoryTabProps) {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastSchedule[]>([]);
  const [stats, setStats] = useState<StatsDashboard>({
    today: { sent: 0, failed: 0, pending: 0 },
    week: { sent: 0, failed: 0, pending: 0 },
    month: { sent: 0, failed: 0, pending: 0 },
    year: { sent: 0, failed: 0, pending: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Set default dates to last 30 days
  const getDefaultFromDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  };

  const getDefaultToDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [dateFrom, setDateFrom] = useState(getDefaultFromDate());
  const [dateTo, setDateTo] = useState(getDefaultToDate());
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastSchedule | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [deleting, setDeleting] = useState<string | null>(null);

  const deleteSchedule = async (id: string) => {
    if (!token || !confirm('Delete this scheduled broadcast?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/crm/qr-broadcast-schedule/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setBroadcasts(prev => prev.filter(b => b._id !== id));
      }
    } catch (e) { /* ignore */ }
    setDeleting(null);
  };

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch sent messages from the generic API (includes both Meta and QR with provider filter)
      const params = new URLSearchParams();
      params.set('limit', '100');
      params.set('provider', 'all');
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo) params.set('endDate', dateTo);

      const [msgsRes, broadcastsRes] = await Promise.all([
        fetch(`/api/admin/crm/messages?${params}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/crm/qr-broadcast-schedule', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      // Use fresh messages from API (not stale state) for stats calculation
      let freshMessages: MessageRecord[] = [];
      if (msgsRes.ok) {
        const data = await msgsRes.json();
        freshMessages = data?.messages ?? [];
        setMessages(freshMessages);
      }

      if (broadcastsRes.ok) {
        const data = await broadcastsRes.json();
        const schedules = data?.data ?? [];

        // Fetch stats for each broadcast
        const enrichedBroadcasts = await Promise.all(
          schedules.map(async (broadcast: any) => {
            try {
              const statsRes = await fetch(
                `/api/admin/crm/qr-broadcast-schedule/stats?scheduleId=${broadcast._id}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
              );
              if (statsRes.ok) {
                const statsData = await statsRes.json();
                return {
                  ...broadcast,
                  stats: {
                    totalSent: statsData.stats?.totalSent || 0,
                    totalFailed: 0,
                    totalPending: Math.max(0, (broadcast.totalRecipients || 0) - (statsData.stats?.totalSent || 0)),
                    totalBlocked: 0,
                  }
                };
              }
            } catch (e) {
              // Fallback if stats fetch fails
            }

            return {
              ...broadcast,
              stats: {
                totalSent: 0,
                totalFailed: 0,
                totalPending: broadcast.totalRecipients || 0,
                totalBlocked: 0,
              }
            };
          })
        );
        setBroadcasts(enrichedBroadcasts);
      }

      // Calculate statistics
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);
      const yearAgo = new Date(today.getFullYear(), 0, 1);

      // Use freshMessages (not stale state) — fixes all-zero stats bug
      const calculateStats = (msgs: MessageRecord[], startDate: Date, endDate: Date) => {
        return msgs.filter(msg => {
          // Check all possible date fields: sentAt (QR/WhatsApp), createdAt, timestamp
          const rawDate = (msg as any).sentAt || msg.createdAt || msg.timestamp || '';
          const msgDate = new Date(rawDate);
          if (isNaN(msgDate.getTime())) return false;
          return msgDate >= startDate && msgDate <= endDate;
        }).reduce((acc, msg) => {
          const status = msg.status || '';
          if (status === 'sent' || status === 'delivered' || status === 'read' || msg.ticks === 0) acc.sent++;
          else if (status === 'failed') acc.failed++;
          else acc.pending++;
          return acc;
        }, { sent: 0, failed: 0, pending: 0 });
      };

      setStats({
        today: calculateStats(freshMessages, today, now),
        week: calculateStats(freshMessages, weekAgo, now),
        month: calculateStats(freshMessages, monthAgo, now),
        year: calculateStats(freshMessages, yearAgo, now),
      });
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    if (token) fetchData();
  }, [token, filterStatus, dateFrom, dateTo, fetchData]);

  const StatCard = ({ label, sent, failed, pending }: any) => (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase mb-3">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <p className="text-2xl font-bold text-green-600">{sent}</p>
          <p className="text-xs text-gray-500">Sent</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-blue-600">{pending}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-600">{failed}</p>
          <p className="text-xs text-gray-500">Failed</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Dashboard Stats */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Message Statistics</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Today" {...stats.today} />
          <StatCard label="This Week" {...stats.week} />
          <StatCard label="This Month" {...stats.month} />
          <StatCard label="This Year" {...stats.year} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 px-4 pt-4 border-b bg-gray-50">
        <button
          onClick={() => setActiveTab('scheduled')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            activeTab === 'scheduled'
              ? 'bg-white text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Scheduled Messages ({broadcasts.length})
        </button>
        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
            activeTab === 'sent'
              ? 'bg-white text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Sent Messages ({messages.length})
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'sent' && (
        <div className="flex items-center gap-2 p-4 border-b bg-gray-50 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <button
            onClick={() => {
              setFilterStatus('all');
              setDateFrom(getDefaultFromDate());
              setDateTo(getDefaultToDate());
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-700 font-medium"
          >
            Reset to Last 30 Days
          </button>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : activeTab === 'scheduled' ? (
          broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No scheduled messages yet</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Message</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Time</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Recip.</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Sent</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Status</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-medium">Created</th>
                  <th className="px-3 py-2 text-center text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
              {broadcasts.map((broadcast) => {
                const stats = broadcast.stats || { totalSent: 0, totalFailed: 0, totalPending: 0 };
                const progress = broadcast.totalRecipients > 0 ? Math.round((stats.totalSent / broadcast.totalRecipients) * 100) : 0;

                const statusColor: Record<string, string> = {
                  scheduled: 'bg-blue-100 text-blue-700',
                  in_progress: 'bg-yellow-100 text-yellow-700',
                  completed: 'bg-green-100 text-green-700',
                  failed: 'bg-red-100 text-red-700',
                  paused: 'bg-gray-100 text-gray-700',
                  draft: 'bg-purple-100 text-purple-700',
                };
                const createdAt = (broadcast as any).createdAt
                  ? new Date((broadcast as any).createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
                  : '—';

                return (
                  <tr key={broadcast._id} className="hover:bg-gray-50 transition">
                    <td className="px-3 py-2 max-w-[200px]">
                      <p className="text-gray-800 truncate font-medium" title={broadcast.messageText}>{broadcast.messageText}</p>
                      {broadcast.isActive && <span className="text-[10px] text-green-600">● Active</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{broadcast.startTime}–{broadcast.endTime}</td>
                    <td className="px-3 py-2 text-gray-700 font-medium">{broadcast.totalRecipients}</td>
                    <td className="px-3 py-2">
                      <span className="text-green-700 font-semibold">{stats.totalSent}</span>
                      {(stats.totalFailed || 0) > 0 && <span className="text-red-600 ml-1">/ {stats.totalFailed}✕</span>}
                      <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, progress)}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor[broadcast.status] || 'bg-gray-100 text-gray-600'}`}>
                        {broadcast.status?.toUpperCase() || 'DRAFT'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{createdAt}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setSelectedBroadcast(broadcast)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="View details">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSchedule(broadcast._id)}
                          disabled={deleting === broadcast._id}
                          className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-40" title="Delete"
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
          )
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No sent messages yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Direction</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Recipient / Sender</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Message</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Time</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg, idx) => {
                  const direction = (msg as any).direction || 'outbound';
                  const isInbound = direction === 'inbound';
                  const msgTime = (msg as any).sentAt || (msg as any).receivedAt || msg.createdAt || msg.timestamp;
                  return (
                    <tr key={msg._id || msg.id || idx} className="border-b hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                          isInbound ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {isInbound ? '↙ In' : '↗ Out'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 text-sm">
                        {msg.phoneNumber || (msg as any).senderNumber || msg.recipient || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate text-sm">
                        {(msg as any).messageContent || msg.message || msg.text || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {msg.status === 'sent' ? (
                            <CheckCircle className="w-4 h-4 text-gray-400" />
                          ) : msg.status === 'delivered' ? (
                            <CheckCircle2 className="w-4 h-4 text-gray-400" />
                          ) : msg.status === 'read' ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-500" />
                          ) : msg.status === 'received' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-xs text-gray-600 capitalize">
                            {msg.status === 'received' ? 'Received' : msg.status || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">
                        {msgTime
                          ? new Date(msgTime).toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedBroadcast && <DetailModal broadcast={selectedBroadcast} onClose={() => setSelectedBroadcast(null)} />}
    </div>
  );
}
