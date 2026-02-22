'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { LoadingSpinner } from '@/components/admin/crm';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

interface DashboardStats {
  period: string;
  startDate: string;
  endDate: string;
  messages: {
    sent: number;
    received: number;
    total: number;
  };
  delivered: {
    total: number;
    sent: number;
    failed: number;
  };
  messagesDelivered: {
    total: number;
    marketing: number;
    marketingLite: number;
    utility: number;
    authentication: number;
    authenticationIntl: number;
    service: number;
  };
  freeMessages: {
    total: number;
    freeCustomerService: number;
    freeEntryPoint: number;
  };
  paidMessages: {
    total: number;
    marketing: number;
    marketingLite: number;
    utility: number;
    authentication: number;
    authenticationIntl: number;
  };
  charges: {
    total: number;
    marketing: number;
    marketingLite: number;
    utility: number;
    authentication: number;
    authenticationIntl: number;
  };
  chatStatuses: {
    new: number;
    open: number;
    pending: number;
    overdue: number;
    closed: number;
  };
  totalLeads: number;
  users: Array<{
    userId: string;
    totalLeads: number;
    withMessages: number;
  }>;
  trend: Array<{
    date: string;
    sent: number;
    received: number;
    total: number;
  }>;
}

export default function MetaDashboardPage() {
  const router = useRouter();
  const token = useAuth();
  const { fetch: crmFetch, loading, error } = useCRM({ token });

  const [period, setPeriod] = useState<Period>('daily');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bot ON/OFF state
  const [botEnabled, setBotEnabled] = useState<boolean>(false);
  const [botLoading, setBotLoading] = useState<boolean>(true);
  const [botToggling, setBotToggling] = useState<boolean>(false);

  // Get list of admin users
  const [adminUsers, setAdminUsers] = useState<Array<{ userId: string; name: string }>>([]);

  // Fetch bot status
  const fetchBotStatus = useCallback(async () => {
    if (!token) return;
    setBotLoading(true);
    try {
      const res = await crmFetch('/api/admin/crm/chatbot/config');
      if (res?.config) {
        setBotEnabled(!!res.config.enabled);
      }
    } catch (err) {
      console.error('Failed to fetch bot status:', err);
    } finally {
      setBotLoading(false);
    }
  }, [token, crmFetch]);

  // Toggle bot ON/OFF
  const toggleBot = async () => {
    if (botToggling) return;
    setBotToggling(true);
    try {
      const newStatus = !botEnabled;
      await crmFetch('/api/admin/crm/chatbot/config', {
        method: 'POST',
        body: { enabled: newStatus },
      });
      setBotEnabled(newStatus);
    } catch (err) {
      console.error('Failed to toggle bot:', err);
    } finally {
      setBotToggling(false);
    }
  };

  // Initial bot status fetch
  useEffect(() => {
    fetchBotStatus();
  }, [fetchBotStatus]);

  useEffect(() => {
    if (!token) return;
    // Fetch admin users list
    crmFetch('/api/admin/crm/users')
      .then((res) => {
        const users = res?.users || res?.data || res;
        if (Array.isArray(users)) {
          setAdminUsers(
            users.map((u: any) => ({
              userId: u.userId || u._id,
              name: u.name || u.email || u.userId || 'Unknown',
            }))
          );
        }
      })
      .catch(() => {});
  }, [token, crmFetch]);

  // Fetch dashboard stats
  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({ period });
        if (selectedUser) params.append('userId', selectedUser);
        if (period === 'custom' && customStartDate) params.append('startDate', customStartDate);
        if (period === 'custom' && customEndDate) params.append('endDate', customEndDate);

        const res = await crmFetch(`/api/admin/crm/meta-dashboard/stats?${params.toString()}`);
        if (res) {
          setStats(res);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [token, crmFetch, period, selectedUser, customStartDate, customEndDate]);

  const periodOptions: { value: Period; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom' },
  ];

  // Calculate total active chats (not closed)
  const activeChats = useMemo(() => {
    if (!stats) return 0;
    return (
      stats.chatStatuses.new +
      stats.chatStatuses.open +
      stats.chatStatuses.pending +
      stats.chatStatuses.overdue
    );
  }, [stats]);

  // Get user name by userId
  const getUserName = (userId: string) => {
    const user = adminUsers.find((u) => u.userId === userId);
    return user?.name || userId || 'Unassigned';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/crm/meta"
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
              title="Back to Meta Inbox"
            >
              <i className="ph ph-arrow-left text-xl"></i>
            </Link>
            <div>
              <h1 className="text-xl font-[900] tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                Meta Dashboard
              </h1>
              <p className="text-xs font-semibold text-slate-400">WhatsApp Analytics & Statistics</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Bot ON/OFF Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500">Bot</span>
              <button
                onClick={toggleBot}
                disabled={botLoading || botToggling}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                  botLoading || botToggling
                    ? 'bg-slate-200 cursor-wait'
                    : botEnabled
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-slate-300 hover:bg-slate-400'
                }`}
                title={botEnabled ? 'Bot is ON - Click to turn OFF' : 'Bot is OFF - Click to turn ON'}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${
                    botEnabled ? 'left-7' : 'left-1'
                  }`}
                />
                {botToggling && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </span>
                )}
              </button>
              <span className={`text-xs font-bold ${botEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                {botLoading ? '...' : botEnabled ? 'ON' : 'OFF'}
              </span>
            </div>

            <button
              onClick={() => router.push('/admin/crm/broadcast-dashboard')}
              className="px-4 py-2 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-all"
            >
              <i className="ph ph-broadcast mr-2"></i>
              Broadcast
            </button>
            <button
              onClick={() => router.push('/admin/crm/meta')}
              className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-all"
            >
              <i className="ph ph-chat-circle-dots mr-2"></i>
              Open Inbox
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            {/* Period Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-600">Period:</span>
              <div className="flex bg-slate-100 rounded-xl p-1">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPeriod(opt.value)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
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

            {/* Custom Date Range */}
            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Admin User Filter */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-bold text-slate-600">Admin:</span>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[160px]"
              >
                <option value="">All Users</option>
                {adminUsers.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : stats ? (
          <>
            {/* Message Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <i className="ph ph-paper-plane-tilt text-2xl"></i>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">Sent</span>
                </div>
                <div className="text-4xl font-black">{stats.messages.sent.toLocaleString()}</div>
                <div className="text-sm font-medium opacity-80 mt-1">Messages sent</div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <i className="ph ph-envelope text-2xl"></i>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">Received</span>
                </div>
                <div className="text-4xl font-black">{stats.messages.received.toLocaleString()}</div>
                <div className="text-sm font-medium opacity-80 mt-1">Messages received</div>
              </div>

              <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-violet-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <i className="ph ph-chat-circle-dots text-2xl"></i>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider opacity-80">Total</span>
                </div>
                <div className="text-4xl font-black">{stats.messages.total.toLocaleString()}</div>
                <div className="text-sm font-medium opacity-80 mt-1">Total messages</div>
              </div>
            </div>

            {/* ─── Meta-Style Message Pricing Section ─── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
              <div className="flex items-center gap-2 mb-2">
                <i className="ph ph-currency-inr text-blue-600 text-xl"></i>
                <h2 className="text-lg font-[900] text-slate-800">Message Pricing</h2>
              </div>
              <p className="text-xs text-slate-400 mb-6">
                All insights data is approximate and may differ from what&apos;s shown on your invoices due to small variations in data processing.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* All Messages Card */}
                <div className="border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-1 bg-blue-500 rounded-full"></div>
                    <h3 className="text-sm font-[900] text-slate-800">All Messages</h3>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-0.5 border-t-2 border-dashed border-red-400"></div>
                        <span className="text-sm text-slate-600">Messages sent</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{stats.messages.sent}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-0.5 border-t-2 border-dashed border-emerald-400"></div>
                        <span className="text-sm text-slate-600">Messages delivered</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{stats.delivered?.total || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-0.5 border-t-2 border-dashed border-slate-400"></div>
                        <span className="text-sm text-slate-600">Messages received</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{stats.messages.received}</span>
                    </div>
                  </div>
                </div>

                {/* Messages Delivered Card */}
                <div className="border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-emerald-500 rounded-full"></div>
                      <h3 className="text-sm font-[900] text-slate-800">Messages Delivered</h3>
                    </div>
                    <span className="text-lg font-black text-slate-800">{stats.messagesDelivered?.total || 0}</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Marketing', value: stats.messagesDelivered?.marketing || 0, color: 'border-blue-400' },
                      { label: 'Marketing - lite', value: stats.messagesDelivered?.marketingLite || 0, color: 'border-yellow-400' },
                      { label: 'Utility', value: stats.messagesDelivered?.utility || 0, color: 'border-red-400' },
                      { label: 'Authentication', value: stats.messagesDelivered?.authentication || 0, color: 'border-rose-400' },
                      { label: 'Authentication - international', value: stats.messagesDelivered?.authenticationIntl || 0, color: 'border-slate-400' },
                      { label: 'Service', value: stats.messagesDelivered?.service || 0, color: 'border-teal-400' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-0.5 border-t-2 border-dashed ${item.color}`}></div>
                          <span className="text-sm text-slate-600">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Free Messages Delivered Card */}
                <div className="border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-emerald-500 rounded-full"></div>
                      <h3 className="text-sm font-[900] text-slate-800">Free Messages Delivered</h3>
                    </div>
                    <span className="text-lg font-black text-slate-800">{stats.freeMessages?.total || 0}</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-0.5 border-t-2 border-dashed border-teal-400"></div>
                        <span className="text-sm text-slate-600">Free customer service</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{stats.freeMessages?.freeCustomerService || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-0.5 border-t-2 border-dashed border-slate-400"></div>
                        <span className="text-sm text-slate-600">Free entry point</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">{stats.freeMessages?.freeEntryPoint || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom row: Paid Messages + Charges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Paid Messages Delivered Card */}
                <div className="border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-blue-500 rounded-full"></div>
                      <h3 className="text-sm font-[900] text-slate-800">Paid Messages Delivered</h3>
                    </div>
                    <span className="text-lg font-black text-slate-800">{stats.paidMessages?.total || 0}</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Marketing', value: stats.paidMessages?.marketing || 0, color: 'border-blue-400' },
                      { label: 'Marketing - lite', value: stats.paidMessages?.marketingLite || 0, color: 'border-yellow-400' },
                      { label: 'Utility', value: stats.paidMessages?.utility || 0, color: 'border-red-400' },
                      { label: 'Authentication', value: stats.paidMessages?.authentication || 0, color: 'border-rose-400' },
                      { label: 'Authentication - international', value: stats.paidMessages?.authenticationIntl || 0, color: 'border-slate-400' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-0.5 border-t-2 border-dashed ${item.color}`}></div>
                          <span className="text-sm text-slate-600">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Approximate Total Charges Card */}
                <div className="border border-slate-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-blue-500 rounded-full"></div>
                      <h3 className="text-sm font-[900] text-slate-800">Approximate Total Charges</h3>
                    </div>
                    <span className="text-lg font-black text-slate-800">₹ {(stats.charges?.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Marketing', value: stats.charges?.marketing || 0, color: 'border-blue-400' },
                      { label: 'Marketing - lite', value: stats.charges?.marketingLite || 0, color: 'border-yellow-400' },
                      { label: 'Utility', value: stats.charges?.utility || 0, color: 'border-red-400' },
                      { label: 'Authentication', value: stats.charges?.authentication || 0, color: 'border-rose-400' },
                      { label: 'Authentication - international', value: stats.charges?.authenticationIntl || 0, color: 'border-slate-400' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-0.5 border-t-2 border-dashed ${item.color}`}></div>
                          <span className="text-sm text-slate-600">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800">₹ {item.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Status Cards */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
              <h2 className="text-lg font-[900] text-slate-800 mb-6 flex items-center gap-2">
                <i className="ph ph-tag text-blue-600"></i>
                Chat Status Breakdown
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* New */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i className="ph ph-sparkle text-emerald-600 text-xl"></i>
                  </div>
                  <div className="text-3xl font-black text-emerald-700">{stats.chatStatuses.new}</div>
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide mt-1">New</div>
                  <div className="text-[10px] text-emerald-500 mt-0.5">No reply yet</div>
                </div>

                {/* Open */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i className="ph ph-envelope-open text-blue-600 text-xl"></i>
                  </div>
                  <div className="text-3xl font-black text-blue-700">{stats.chatStatuses.open}</div>
                  <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mt-1">Open</div>
                  <div className="text-[10px] text-blue-500 mt-0.5">0-12 hours</div>
                </div>

                {/* Pending */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i className="ph ph-clock text-amber-600 text-xl"></i>
                  </div>
                  <div className="text-3xl font-black text-amber-700">{stats.chatStatuses.pending}</div>
                  <div className="text-xs font-bold text-amber-600 uppercase tracking-wide mt-1">Pending</div>
                  <div className="text-[10px] text-amber-500 mt-0.5">12-23 hours</div>
                </div>

                {/* Overdue */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <i className="ph ph-warning text-red-600 text-xl"></i>
                    </div>
                    <div className="text-3xl font-black text-red-700">{stats.chatStatuses.overdue}</div>
                    <div className="text-xs font-bold text-red-600 uppercase tracking-wide mt-1">Overdue</div>
                    <div className="text-[10px] text-red-500 mt-0.5">23-24 hours</div>
                  </div>
                </div>

                {/* Closed */}
                <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <i className="ph ph-check-circle text-slate-600 text-xl"></i>
                  </div>
                  <div className="text-3xl font-black text-slate-700">{stats.chatStatuses.closed}</div>
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-1">Closed</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Completed</div>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <div className="text-sm font-bold text-slate-500">Active Chats</div>
                    <div className="text-2xl font-black text-slate-800">{activeChats}</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-500">Total Leads</div>
                    <div className="text-2xl font-black text-slate-800">{stats.totalLeads}</div>
                  </div>
                </div>
                <Link
                  href="/admin/crm/meta?chatStatusFilter=overdue"
                  className="px-4 py-2 text-sm font-bold bg-red-50 text-red-700 hover:bg-red-100 rounded-xl border border-red-200 transition-all"
                >
                  <i className="ph ph-warning mr-2"></i>
                  View Overdue ({stats.chatStatuses.overdue})
                </Link>
              </div>
            </div>

            {/* Admin User Stats */}
            {stats.users.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
                <h2 className="text-lg font-[900] text-slate-800 mb-6 flex items-center gap-2">
                  <i className="ph ph-users text-blue-600"></i>
                  Admin User Performance
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Admin User
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Total Leads
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          With Messages
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Response Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.users.map((user, idx) => {
                        const responseRate =
                          user.totalLeads > 0
                            ? Math.round((user.withMessages / user.totalLeads) * 100)
                            : 0;
                        return (
                          <tr
                            key={user.userId || idx}
                            className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                                  {getUserName(user.userId).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800">
                                    {getUserName(user.userId)}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {user.userId || 'No ID'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-lg font-bold text-slate-800">
                                {user.totalLeads}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="text-lg font-bold text-emerald-600">
                                {user.withMessages}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="inline-flex items-center gap-2">
                                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      responseRate >= 80
                                        ? 'bg-emerald-500'
                                        : responseRate >= 50
                                        ? 'bg-amber-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${responseRate}%` }}
                                  />
                                </div>
                                <span
                                  className={`text-sm font-bold ${
                                    responseRate >= 80
                                      ? 'text-emerald-600'
                                      : responseRate >= 50
                                      ? 'text-amber-600'
                                      : 'text-red-600'
                                  }`}
                                >
                                  {responseRate}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Message Trend Chart */}
            {stats.trend.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h2 className="text-lg font-[900] text-slate-800 mb-6 flex items-center gap-2">
                  <i className="ph ph-chart-line text-blue-600"></i>
                  7-Day Message Trend
                </h2>

                <div className="flex items-end gap-2 h-48">
                  {stats.trend.map((day, idx) => {
                    const maxTotal = Math.max(...stats.trend.map((t) => t.total));
                    const heightPercent = maxTotal > 0 ? (day.total / maxTotal) * 100 : 0;
                    const sentPercent = day.total > 0 ? (day.sent / day.total) * 100 : 50;

                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                        <div className="w-full flex flex-col items-center relative group">
                          <div
                            className="w-full rounded-t-lg overflow-hidden transition-all hover:opacity-90"
                            style={{ height: `${heightPercent}%`, minHeight: '8px' }}
                          >
                            <div
                              className="bg-blue-500 w-full"
                              style={{ height: `${sentPercent}%` }}
                            />
                            <div
                              className="bg-emerald-500 w-full"
                              style={{ height: `${100 - sentPercent}%` }}
                            />
                          </div>

                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10">
                            <div className="font-bold">{day.date}</div>
                            <div>Sent: {day.sent}</div>
                            <div>Received: {day.received}</div>
                          </div>
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 truncate w-full text-center">
                          {new Date(day.date).toLocaleDateString([], {
                            weekday: 'short',
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-xs font-bold text-slate-600">Sent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                    <span className="text-xs font-bold text-slate-600">Received</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-slate-500">
            <i className="ph ph-chart-bar text-6xl opacity-30"></i>
            <p className="mt-4 font-semibold">No data available</p>
          </div>
        )}
      </main>
    </div>
  );
}
