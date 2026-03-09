'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import {
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  PieChart,
  Globe,
  Calendar,
  RefreshCw,
  Download,
  UserPlus,
  LogIn,
  CreditCard,
  ArrowUpRight,
  Shield,
} from 'lucide-react';

interface ReportStats {
  users: { total: number; signupsToday: number; signupsWeek: number; signupsMonth: number };
  orders: { total: number; completed: number; pending: number; failed: number; revenue: number; currencyBreakdown: Record<string, { total: number; count: number }> };
  signins: { total: number; today: number };
  contacts: { total: number };
  breakdowns: {
    plans: { plan: string; count: number }[];
    gender: { gender: string; count: number }[];
    country: { country: string; count: number }[];
  };
  trends: {
    signups: { _id: string; count: number }[];
    payments: { _id: string; count: number; revenue: number }[];
  };
}

export default function SuperAdminReportsPage() {
  const router = useRouter();
  const token = useAuth();
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'revenue' | 'geography'>('overview');

  useEffect(() => {
    if (!checkIsSuperAdmin()) router.replace('/admin/crm');
  }, [router]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/crm/super-admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push(getLoginPath()); return; }
      if (!res.ok) throw new Error('Failed to load reports');
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => { if (token) fetchStats(); }, [token, fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center max-w-md">
          <p className="text-red-500 mb-4">{error || 'No data'}</p>
          <button onClick={fetchStats} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Retry</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: PieChart },
    { key: 'users', label: 'User Analytics', icon: Users },
    { key: 'revenue', label: 'Revenue', icon: DollarSign },
    { key: 'geography', label: 'Geography', icon: Globe },
  ] as const;

  const freeUsers = stats.breakdowns.plans.find(p => !p.plan || p.plan === 'user' || p.plan === 'null')?.count || 0;
  const paidUsers = stats.users.total - freeUsers;
  const conversionRate = stats.users.total > 0 ? ((stats.orders.completed / stats.users.total) * 100) : 0;

  const exportReport = () => {
    const lines = [
      'SUPER ADMIN REPORT',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'USER METRICS',
      `Total Users: ${stats.users.total}`,
      `Signups Today: ${stats.users.signupsToday}`,
      `Signups This Week: ${stats.users.signupsWeek}`,
      `Signups This Month: ${stats.users.signupsMonth}`,
      `Free Users: ${freeUsers}`,
      `Paid Users: ${paidUsers}`,
      '',
      'REVENUE METRICS',
      `Total Revenue: ₹${stats.orders.revenue.toLocaleString('en-IN')}`,
      `Total Orders: ${stats.orders.total}`,
      `Completed: ${stats.orders.completed}`,
      `Pending: ${stats.orders.pending}`,
      `Failed: ${stats.orders.failed}`,
      `Conversion Rate: ${conversionRate.toFixed(1)}%`,
      '',
      'SIGNIN ACTIVITY',
      `Total Signins: ${stats.signins.total}`,
      `Today: ${stats.signins.today}`,
      '',
      'ROLES BREAKDOWN',
      ...stats.breakdowns.plans.map(p => `  ${p.plan || 'user'}: ${p.count}`),
      '',
      'TOP COUNTRIES',
      ...stats.breakdowns.country.map((c, i) => `  ${i + 1}. ${c.country}: ${c.count}`),
      '',
      'GENDER DISTRIBUTION',
      ...stats.breakdowns.gender.map(g => `  ${g.gender}: ${g.count}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `report-${new Date().toISOString().slice(0, 10)}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-green-600" />
              Reports & Analytics
            </h1>
            <p className="text-sm text-gray-500 mt-1">Comprehensive platform analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportReport} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 text-gray-700">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={fetchStats} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 text-gray-700">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-white rounded-xl shadow-sm border p-1 mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                  activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Total Users', value: stats.users.total, icon: Users, color: 'text-blue-600' },
                { label: 'Today Signups', value: stats.users.signupsToday, icon: UserPlus, color: 'text-green-600' },
                { label: 'Revenue', value: `₹${(stats.orders.revenue / 1000).toFixed(0)}K`, icon: DollarSign, color: 'text-purple-600' },
                { label: 'Orders', value: stats.orders.completed, icon: CreditCard, color: 'text-pink-600' },
                { label: 'Signins Today', value: stats.signins.today, icon: LogIn, color: 'text-orange-600' },
                { label: 'Conversion', value: `${conversionRate.toFixed(1)}%`, icon: TrendingUp, color: 'text-teal-600' },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="bg-white rounded-xl shadow-sm border p-4 text-center">
                    <Icon className={`w-5 h-5 mx-auto mb-1.5 ${m.color}`} />
                    <p className="text-lg font-bold text-gray-900">{typeof m.value === 'number' ? m.value.toLocaleString() : m.value}</p>
                    <p className="text-[11px] text-gray-500">{m.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Signup Trend (30d)</h3>
                <div className="flex items-end gap-1 h-28">
                  {(() => {
                    const d = stats.trends.signups;
                    const mx = Math.max(...d.map(x => x.count), 1);
                    return d.slice(-30).map((x, i) => (
                      <div key={x._id || i} className="flex-1 bg-blue-400 hover:bg-blue-600 rounded-t transition min-w-[3px] group relative" style={{ height: `${(x.count / mx) * 100}%`, minHeight: '2px' }} title={`${x._id}: ${x.count}`}>
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">{x._id?.slice(5)}: {x.count}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue Trend (30d)</h3>
                <div className="flex items-end gap-1 h-28">
                  {(() => {
                    const d = stats.trends.payments;
                    const mx = Math.max(...d.map(x => x.revenue), 1);
                    return d.slice(-30).map((x, i) => (
                      <div key={x._id || i} className="flex-1 bg-green-400 hover:bg-green-600 rounded-t transition min-w-[3px] group relative" style={{ height: `${(x.revenue / mx) * 100}%`, minHeight: '2px' }} title={`${x._id}: ₹${x.revenue}`}>
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">{x._id?.slice(5)}: ₹{x.revenue}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'View All Users', href: '/admin/crm/super-admin/users', color: 'text-blue-600 bg-blue-50' },
                { label: 'View Payments', href: '/admin/crm/super-admin/payments', color: 'text-purple-600 bg-purple-50' },
                { label: 'Signin Logs', href: '/admin/crm/super-admin/signins', color: 'text-orange-600 bg-orange-50' },
                { label: 'Dashboard', href: '/admin/crm/super-admin', color: 'text-indigo-600 bg-indigo-50' },
              ].map((l) => (
                <Link key={l.href} href={l.href} className={`flex items-center justify-between px-4 py-3 rounded-xl border hover:shadow-sm transition ${l.color}`}>
                  <span className="text-sm font-medium">{l.label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ─── USERS TAB ─── */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.users.total.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500">Free Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{freeUsers.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">{stats.users.total > 0 ? ((freeUsers / stats.users.total) * 100).toFixed(1) : 0}%</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500">Paid / Active Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{paidUsers.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">{stats.users.total > 0 ? ((paidUsers / stats.users.total) * 100).toFixed(1) : 0}%</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500">Month Signups</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.users.signupsMonth.toLocaleString()}</p>
              </div>
            </div>

            {/* Roles */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">User Roles Distribution</h3>
              <div className="space-y-3">
                {stats.breakdowns.plans.map((p) => {
                  const pct = stats.users.total > 0 ? (p.count / stats.users.total * 100) : 0;
                  return (
                    <div key={p.plan}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 capitalize font-medium">{p.plan || 'user'}</span>
                        <span className="text-gray-500">{p.count.toLocaleString()} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gender */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Gender Distribution</h3>
              <div className="flex flex-wrap gap-3">
                {stats.breakdowns.gender.map((g) => {
                  const pct = stats.users.total > 0 ? (g.count / stats.users.total * 100) : 0;
                  const color = g.gender === 'Male' ? 'bg-blue-100 text-blue-700' :
                    g.gender === 'Female' ? 'bg-pink-100 text-pink-700' :
                    'bg-gray-100 text-gray-700';
                  return (
                    <div key={g.gender} className={`px-4 py-3 rounded-lg ${color}`}>
                      <p className="font-semibold">{g.count.toLocaleString()}</p>
                      <p className="text-xs capitalize">{g.gender || 'Not Specified'} ({pct.toFixed(1)}%)</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ─── REVENUE TAB ─── */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">₹{stats.orders.revenue.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500">Completed Orders</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.orders.completed}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500">Pending Orders</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.orders.pending}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <p className="text-sm text-gray-500">Failed Orders</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.orders.failed}</p>
              </div>
            </div>

            {/* Revenue by Currency */}
            {Object.keys(stats.orders.currencyBreakdown).length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Revenue by Currency</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(stats.orders.currencyBreakdown).map(([currency, data]) => (
                    <div key={currency} className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900">
                        {currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'NPR' ? 'NPR ' : ''}{data.total.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{currency} — {data.count} orders</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Revenue Trend */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Revenue (30d)</h3>
              <div className="flex items-end gap-1 h-32">
                {(() => {
                  const d = stats.trends.payments;
                  const mx = Math.max(...d.map(x => x.revenue), 1);
                  return d.slice(-30).map((x, i) => (
                    <div key={x._id || i} className="flex-1 bg-green-400 hover:bg-green-600 rounded-t transition min-w-[4px] group relative" style={{ height: `${(x.revenue / mx) * 100}%`, minHeight: '2px' }} title={`${x._id}: ₹${x.revenue}`}>
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">{x._id?.slice(5)}: ₹{x.revenue.toLocaleString()}</div>
                    </div>
                  ));
                })()}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                <span>{stats.trends.payments[0]?._id?.slice(5) || ''}</span>
                <span>Last 30 days</span>
                <span>{stats.trends.payments[stats.trends.payments.length - 1]?._id?.slice(5) || ''}</span>
              </div>
            </div>

            {/* Conversion funnel */}
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Conversion Funnel</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Users', value: stats.users.total, pct: 100, color: 'bg-blue-500' },
                  { label: 'Total Orders', value: stats.orders.total, pct: stats.users.total > 0 ? (stats.orders.total / stats.users.total * 100) : 0, color: 'bg-purple-500' },
                  { label: 'Completed Payments', value: stats.orders.completed, pct: stats.users.total > 0 ? (stats.orders.completed / stats.users.total * 100) : 0, color: 'bg-green-500' },
                ].map((step) => (
                  <div key={step.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{step.label}</span>
                      <span className="text-gray-500">{step.value.toLocaleString()} ({step.pct.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className={`${step.color} h-3 rounded-full transition-all`} style={{ width: `${Math.min(step.pct, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── GEOGRAPHY TAB ─── */}
        {activeTab === 'geography' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-500" />
                Users by Country
              </h3>
              {stats.breakdowns.country.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No country data available</p>
              ) : (
                <div className="space-y-3">
                  {stats.breakdowns.country.map((c, i) => {
                    const pct = stats.users.total > 0 ? (c.count / stats.users.total * 100) : 0;
                    return (
                      <div key={c.country}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700 font-medium flex items-center gap-2">
                            <span className="w-5 h-5 bg-gray-100 rounded-full text-center text-[11px] leading-5 text-gray-500">{i + 1}</span>
                            {c.country}
                          </span>
                          <span className="text-gray-500">{c.count.toLocaleString()} ({pct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="bg-teal-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
