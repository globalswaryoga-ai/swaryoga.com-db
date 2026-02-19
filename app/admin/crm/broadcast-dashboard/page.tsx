'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { LoadingSpinner } from '@/components/admin/crm';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
type MessageStatus = 'all' | 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'wrong_number';

interface Message {
  _id: string;
  phoneNumber: string;
  messageContent: string;
  status: string;
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  failureReason?: string;
  waMessageId?: string;
  lead?: {
    _id: string;
    name: string;
    leadNumber: string;
    assignedToUserId?: string;
  };
}

interface Stats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function BroadcastDashboardPage() {
  const router = useRouter();
  const token = useAuth();
  const { fetch: crmFetch, loading } = useCRM({ token });

  // Filters
  const [period, setPeriod] = useState<Period>('daily');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [statusFilter, setStatusFilter] = useState<MessageStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<Array<{ userId: string; name: string }>>([]);

  // Selection
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Modals
  const [viewMessage, setViewMessage] = useState<Message | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Auto-refresh
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch admin users
  useEffect(() => {
    if (!token) return;
    crmFetch('/api/admin/crm/users')
      .then((res) => {
        if (res?.data) {
          setAdminUsers(
            res.data.map((u: any) => ({
              userId: u.userId || u._id,
              name: u.name || u.email || u.userId || 'Unknown',
            }))
          );
        }
      })
      .catch(() => {});
  }, [token, crmFetch]);

  // Fetch messages
  const fetchMessages = useCallback(async (page = 1, silent = false) => {
    if (!token) return;

    if (!silent) setIsLoading(true);
    try {
      const params = new URLSearchParams({
        period,
        page: String(page),
        limit: String(pagination.limit),
      });

      if (period === 'custom' && customStartDate) params.append('startDate', customStartDate);
      if (period === 'custom' && customEndDate) params.append('endDate', customEndDate);
      if (selectedUser) params.append('userId', selectedUser);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const res = await crmFetch(`/api/admin/crm/broadcast-messages?${params.toString()}`);
      if (res?.data) {
        setMessages(res.data.messages || []);
        setStats(res.data.stats || null);
        setPagination(res.data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [token, crmFetch, period, customStartDate, customEndDate, selectedUser, statusFilter, searchQuery, pagination.limit]);

  // Initial load
  useEffect(() => {
    fetchMessages(1);
  }, [period, customStartDate, customEndDate, selectedUser, statusFilter, searchQuery]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMessages(pagination.page, true); // Silent refresh
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, pagination.page, fetchMessages]);

  // Handle select all
  useEffect(() => {
    if (selectAll) {
      setSelectedMessages(new Set(messages.map((m) => m._id)));
    } else {
      setSelectedMessages(new Set());
    }
  }, [selectAll, messages]);

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedMessages);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedMessages(newSet);
    setSelectAll(newSet.size === messages.length);
  };

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Show toast with auto-dismiss
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Resend selected messages
  const handleResend = async () => {
    if (selectedMessages.size === 0) return;

    setActionLoading(true);
    try {
      const res = await crmFetch('/api/admin/crm/broadcast-messages', {
        method: 'POST',
        body: {
          action: 'resend',
          messageIds: Array.from(selectedMessages),
        },
      });
      
      // Show result toast
      if (res?.resent > 0 || res?.failed > 0) {
        const msg = `Resend: ${res.resent || 0} sent, ${res.failed || 0} failed`;
        showToast(msg, res.failed > 0 ? 'error' : 'success');
      } else {
        showToast(res?.message || 'Resend completed', 'info');
      }
      
      setSelectedMessages(new Set());
      setSelectAll(false);
      fetchMessages(pagination.page);
    } catch (err) {
      console.error('Resend failed:', err);
      showToast('Resend failed. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete selected messages
  const handleDelete = async () => {
    if (selectedMessages.size === 0) return;

    if (!confirm(`Delete ${selectedMessages.size} messages? This cannot be undone.`)) return;

    setActionLoading(true);
    try {
      await crmFetch('/api/admin/crm/broadcast-messages', {
        method: 'DELETE',
        body: { messageIds: Array.from(selectedMessages) },
      });
      setSelectedMessages(new Set());
      setSelectAll(false);
      fetchMessages(pagination.page);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Export
  const handleExport = () => {
    const params = new URLSearchParams({ period });
    if (period === 'custom' && customStartDate) params.append('startDate', customStartDate);
    if (period === 'custom' && customEndDate) params.append('endDate', customEndDate);
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (searchQuery) params.append('search', searchQuery);

    window.open(`/api/admin/crm/broadcast-messages/export?${params.toString()}&token=${token}`, '_blank');
  };

  const periodOptions: { value: Period; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom' },
  ];

  const statusOptions: { value: MessageStatus; label: string; color: string }[] = [
    { value: 'all', label: 'All', color: 'bg-slate-500' },
    { value: 'pending', label: 'Pending', color: 'bg-amber-500' },
    { value: 'sent', label: 'Sent', color: 'bg-blue-500' },
    { value: 'delivered', label: 'Delivered', color: 'bg-emerald-500' },
    { value: 'read', label: 'Read', color: 'bg-green-600' },
    { value: 'failed', label: 'Failed', color: 'bg-red-500' },
    { value: 'wrong_number', label: 'Wrong Number', color: 'bg-orange-500' },
  ];

  const getStatusBadge = (status: string) => {
    const statusClasses: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      queued: 'bg-amber-100 text-amber-700 border-amber-200',
      sending: 'bg-blue-100 text-blue-700 border-blue-200',
      sent: 'bg-blue-100 text-blue-700 border-blue-200',
      delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      read: 'bg-green-100 text-green-700 border-green-200',
      failed: 'bg-red-100 text-red-700 border-red-200',
    };
    return statusClasses[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getUserName = (userId: string) => {
    const user = adminUsers.find((u) => u.userId === userId);
    return user?.name || userId || 'Unassigned';
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 5) return 'Just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/crm/meta-dashboard"
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
              title="Back to Dashboard"
            >
              <i className="ph ph-arrow-left text-xl"></i>
            </Link>
            <div>
              <h1 className="text-xl font-[900] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                Broadcast Messages
              </h1>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-400">Sent Messages & Delivery Status</span>
                {lastUpdated && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className={`font-medium ${autoRefresh ? 'text-green-600' : 'text-slate-400'}`}>
                      Updated: {formatLastUpdated(lastUpdated)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 text-sm font-bold rounded-xl border transition-all flex items-center gap-2 ${
                autoRefresh
                  ? 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100'
                  : 'text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-100'
              }`}
              title={autoRefresh ? 'Auto-refresh ON (30s)' : 'Auto-refresh OFF'}
            >
              <i className={`ph ${autoRefresh ? 'ph-arrows-clockwise' : 'ph-pause'}`}></i>
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
            {/* Manual refresh */}
            <button
              onClick={() => fetchMessages(pagination.page)}
              disabled={isLoading}
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all disabled:opacity-50"
              title="Refresh now"
            >
              <i className={`ph ph-arrows-clockwise text-lg ${isLoading ? 'animate-spin' : ''}`}></i>
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-all flex items-center gap-2"
            >
              <i className="ph ph-export"></i>
              Export CSV
            </button>
            <button
              onClick={() => router.push('/admin/crm/broadcast')}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all flex items-center gap-2"
            >
              <i className="ph ph-plus"></i>
              New Broadcast
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <div className="text-3xl font-black text-slate-800">{stats.total.toLocaleString()}</div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-1">Total</div>
            </div>
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
              <div className="text-3xl font-black text-amber-700">{stats.pending.toLocaleString()}</div>
              <div className="text-xs font-bold text-amber-600 uppercase mt-1">Pending</div>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
              <div className="text-3xl font-black text-blue-700">{stats.sent.toLocaleString()}</div>
              <div className="text-xs font-bold text-blue-600 uppercase mt-1">Sent</div>
            </div>
            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
              <div className="text-3xl font-black text-emerald-700">{stats.delivered.toLocaleString()}</div>
              <div className="text-xs font-bold text-emerald-600 uppercase mt-1">Delivered</div>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
              <div className="text-3xl font-black text-green-700">{stats.read.toLocaleString()}</div>
              <div className="text-xs font-bold text-green-600 uppercase mt-1">Read</div>
            </div>
            <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
              <div className="text-3xl font-black text-red-700">{stats.failed.toLocaleString()}</div>
              <div className="text-xs font-bold text-red-600 uppercase mt-1">Failed</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-600">Period:</span>
              <div className="flex bg-slate-100 rounded-xl p-1">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPeriod(opt.value)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      period === opt.value
                        ? 'bg-white text-blue-700 shadow-md'
                        : 'text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date */}
            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-600">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as MessageStatus)}
                className="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Admin User Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-600">Admin:</span>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
              >
                <option value="">All Users</option>
                {adminUsers.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <i className="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                  type="text"
                  placeholder="Search phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedMessages.size > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-blue-700">
                {selectedMessages.size} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleResend}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl border border-amber-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <i className="ph ph-arrow-clockwise"></i>
                Resend
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 text-sm font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-xl border border-red-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <i className="ph ph-trash"></i>
                Delete
              </button>
              <button
                onClick={() => {
                  setSelectedMessages(new Set());
                  setSelectAll(false);
                }}
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Messages Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <i className="ph ph-paper-plane-tilt text-6xl opacity-30"></i>
              <p className="mt-4 font-semibold">No messages found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-left">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={(e) => setSelectAll(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase">Phone / Lead</th>
                      <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase">Message</th>
                      <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase">Sent At</th>
                      <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {messages.map((msg) => (
                      <tr key={msg._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedMessages.has(msg._id)}
                            onChange={() => toggleSelect(msg._id)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <i className="ph ph-whatsapp-logo text-green-600"></i>
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{msg.phoneNumber}</div>
                              {msg.lead && (
                                <div className="text-xs text-slate-500">
                                  {msg.lead.name} {msg.lead.leadNumber && `• #${msg.lead.leadNumber}`}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="max-w-xs truncate text-sm text-slate-700">
                            {msg.messageContent || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusBadge(msg.status)}`}>
                            {msg.status === 'read' && <i className="ph ph-checks text-green-600"></i>}
                            {msg.status === 'delivered' && <i className="ph ph-check"></i>}
                            {msg.status === 'failed' && <i className="ph ph-x"></i>}
                            {msg.status === 'pending' && <i className="ph ph-clock"></i>}
                            {msg.status}
                          </span>
                          {msg.failureReason && (
                            <div className="text-[10px] text-red-500 mt-1 max-w-[120px] truncate" title={msg.failureReason}>
                              {msg.failureReason}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-slate-700">
                            {msg.sentAt ? new Date(msg.sentAt).toLocaleDateString() : '—'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {msg.sentAt ? new Date(msg.sentAt).toLocaleTimeString() : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setViewMessage(msg)}
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="View"
                            >
                              <i className="ph ph-eye"></i>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMessages(new Set([msg._id]));
                                handleResend();
                              }}
                              disabled={msg.status !== 'failed' && msg.status !== 'pending'}
                              className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Resend"
                            >
                              <i className="ph ph-arrow-clockwise"></i>
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Delete this message?')) {
                                  setSelectedMessages(new Set([msg._id]));
                                  handleDelete();
                                }
                              }}
                              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete"
                            >
                              <i className="ph ph-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchMessages(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <i className="ph ph-caret-left"></i>
                  </button>
                  <span className="text-sm font-bold text-slate-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => fetchMessages(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <i className="ph ph-caret-right"></i>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* View Message Modal */}
      {viewMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Message Details</h3>
              <button
                onClick={() => setViewMessage(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
              >
                <i className="ph ph-x text-lg"></i>
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone Number</label>
                  <div className="text-lg font-bold text-slate-800 flex items-center gap-2 mt-1">
                    <i className="ph ph-whatsapp-logo text-green-600"></i>
                    {viewMessage.phoneNumber}
                  </div>
                </div>

                {viewMessage.lead && (
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Lead</label>
                    <div className="mt-1">
                      <div className="font-bold text-slate-800">{viewMessage.lead.name}</div>
                      <div className="text-sm text-slate-500">ID: #{viewMessage.lead.leadNumber}</div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold border ${getStatusBadge(viewMessage.status)}`}>
                      {viewMessage.status}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Message</label>
                  <div className="mt-1 p-4 bg-slate-50 rounded-xl text-sm text-slate-700 whitespace-pre-wrap">
                    {viewMessage.messageContent || '—'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Sent At</label>
                    <div className="text-sm text-slate-700 mt-1">
                      {viewMessage.sentAt ? new Date(viewMessage.sentAt).toLocaleString() : '—'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Delivered At</label>
                    <div className="text-sm text-slate-700 mt-1">
                      {viewMessage.deliveredAt ? new Date(viewMessage.deliveredAt).toLocaleString() : '—'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Read At</label>
                    <div className="text-sm text-slate-700 mt-1">
                      {viewMessage.readAt ? new Date(viewMessage.readAt).toLocaleString() : '—'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Message ID</label>
                    <div className="text-sm text-slate-700 mt-1 font-mono truncate">
                      {viewMessage.waMessageId || '—'}
                    </div>
                  </div>
                </div>

                {viewMessage.failureReason && (
                  <div>
                    <label className="text-xs font-bold text-red-500 uppercase">Failure Reason</label>
                    <div className="mt-1 p-3 bg-red-50 rounded-xl text-sm text-red-700 border border-red-200">
                      {viewMessage.failureReason}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              {(viewMessage.status === 'failed' || viewMessage.status === 'pending') && (
                <button
                  onClick={() => {
                    setSelectedMessages(new Set([viewMessage._id]));
                    handleResend();
                    setViewMessage(null);
                  }}
                  className="px-4 py-2 text-sm font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl border border-amber-200 transition-all"
                >
                  <i className="ph ph-arrow-clockwise mr-2"></i>
                  Resend
                </button>
              )}
              <button
                onClick={() => setViewMessage(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-green-500 text-white' :
            toast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            <i className={`ph ${
              toast.type === 'success' ? 'ph-check-circle' :
              toast.type === 'error' ? 'ph-x-circle' :
              'ph-info'
            } text-xl`}></i>
            <span className="font-semibold text-sm">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 p-1 hover:bg-white/20 rounded-lg transition-all"
            >
              <i className="ph ph-x"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
