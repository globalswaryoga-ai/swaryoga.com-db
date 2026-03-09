'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import {
  Users,
  UserPlus,
  DollarSign,
  TrendingUp,
  LogIn,
  MessageSquare,
  CreditCard,
  ArrowUpRight,
  BarChart3,
  Shield,
  Globe,
  RefreshCw,
  Calendar,
  Eye,
} from 'lucide-react';

interface DashboardStats {
  users: { total: number; signupsToday: number; signupsWeek: number; signupsMonth: number };
  orders: {
    total: number; completed: number; pending: number; failed: number;
    revenue: number; currencyBreakdown: Record<string, { total: number; count: number }>;
  };
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
  recent: {
    signups: any[];
    orders: any[];
  };
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const token = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!checkIsSuperAdmin()) {
      router.replace('/admin/crm');
    }
  }, [router]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/crm/super-admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        router.push(getLoginPath());
        return;
      }
      if (!res.ok) throw new Error('Failed to load stats');
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (token) fetchStats();
  }, [token, fetchStats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center max-w-md">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button onClick={fetchStats} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: 'Total Users', value: stats.users.total, icon: Users, color: 'bg-blue-500', change: `+${stats.users.signupsToday} today` },
    { label: 'Signups This Week', value: stats.users.signupsWeek, icon: UserPlus, color: 'bg-green-500', change: `${stats.users.signupsMonth} this month` },
    { label: 'Total Revenue', value: `₹${stats.orders.revenue.toLocaleString('en-IN')}`, icon: DollarSign, color: 'bg-purple-500', change: `${stats.orders.completed} orders` },
    { label: 'Total Signins', value: stats.signins.total, icon: LogIn, color: 'bg-orange-500', change: `${stats.signins.today} today` },
    { label: 'Total Orders', value: stats.orders.total, icon: CreditCard, color: 'bg-pink-500', change: `${stats.orders.pending} pending` },
    { label: 'Contact Messages', value: stats.contacts.total, icon: MessageSquare, color: 'bg-teal-500', change: 'All time' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-7 h-7 text-indigo-600" />
              Super Admin Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Complete overview of all users, payments, and platform activity
            </p>
          </div>
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 text-sm text-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
                    <p className="text-xs text-green-600 mt-1">{card.change}</p>
                  </div>
                  <div className={`${card.color} p-2.5 rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'All Users', href: '/admin/crm/super-admin/users', icon: Users, color: 'text-blue-600 bg-blue-50' },
            { label: 'Payments', href: '/admin/crm/super-admin/payments', icon: CreditCard, color: 'text-purple-600 bg-purple-50' },
            { label: 'Signin Logs', href: '/admin/crm/super-admin/signins', icon: LogIn, color: 'text-orange-600 bg-orange-50' },
            { label: 'Reports', href: '/admin/crm/super-admin/reports', icon: BarChart3, color: 'text-green-600 bg-green-50' },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl border hover:shadow-sm transition ${link.color}`}>
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{link.label}</span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-auto opacity-60" />
              </Link>
            );
          })}
        </div>

        {/* Two columns: Signup Trend + Plan Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Signup Trend (simplified bar chart) */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Signup Trend (30 Days)
            </h3>
            <div className="flex items-end gap-1 h-32">
              {(() => {
                const data = stats.trends.signups;
                const maxCount = Math.max(...data.map(d => d.count), 1);
                return data.slice(-30).map((d, i) => (
                  <div
                    key={d._id || i}
                    className="flex-1 bg-indigo-400 hover:bg-indigo-600 rounded-t transition-all min-w-[4px] group relative"
                    style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: '2px' }}
                    title={`${d._id}: ${d.count} signups`}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                      {d._id?.slice(5)}: {d.count}
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-2">
              <span>{stats.trends.signups[0]?._id?.slice(5) || ''}</span>
              <span>Last 30 days</span>
              <span>{stats.trends.signups[stats.trends.signups.length - 1]?._id?.slice(5) || ''}</span>
            </div>
          </div>

          {/* Plan / Role Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              User Roles
            </h3>
            <div className="space-y-3">
              {stats.breakdowns.plans.map((p) => {
                const pct = stats.users.total > 0 ? (p.count / stats.users.total * 100) : 0;
                return (
                  <div key={p.plan}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 capitalize font-medium">{p.plan}</span>
                      <span className="text-gray-500">{p.count} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Two columns: Countries + Orders breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Countries */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-500" />
              Top Countries
            </h3>
            <div className="space-y-2">
              {stats.breakdowns.country.length === 0 && (
                <p className="text-sm text-gray-400">No country data available</p>
              )}
              {stats.breakdowns.country.slice(0, 8).map((c, i) => (
                <div key={c.country} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 flex items-center gap-2">
                    <span className="w-5 text-center text-xs text-gray-400">{i + 1}</span>
                    {c.country}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 text-xs font-medium">{c.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Status Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-pink-500" />
              Payment Status
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Completed', value: stats.orders.completed, color: 'text-green-700 bg-green-50 border-green-200' },
                { label: 'Pending', value: stats.orders.pending, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
                { label: 'Failed', value: stats.orders.failed, color: 'text-red-700 bg-red-50 border-red-200' },
                { label: 'Total', value: stats.orders.total, color: 'text-gray-700 bg-gray-50 border-gray-200' },
              ].map((s) => (
                <div key={s.label} className={`rounded-lg border px-3 py-2.5 ${s.color}`}>
                  <p className="text-xs font-medium opacity-70">{s.label}</p>
                  <p className="text-lg font-bold">{s.value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Currency breakdown */}
            {Object.keys(stats.orders.currencyBreakdown).length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs font-medium text-gray-500 mb-2">Revenue by Currency</p>
                <div className="space-y-1.5">
                  {Object.entries(stats.orders.currencyBreakdown).map(([currency, data]) => (
                    <div key={currency} className="flex justify-between text-sm">
                      <span className="text-gray-600">{currency}</span>
                      <span className="font-medium text-gray-800">{currency === 'INR' ? '₹' : currency === 'USD' ? '$' : ''}{data.total.toLocaleString()} <span className="text-xs text-gray-400">({data.count})</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Signups & Recent Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Signups */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-500" />
                Recent Signups
              </h3>
              <Link href="/admin/crm/super-admin/users" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recent.signups.map((u: any, i: number) => (
                <div key={u._id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                      {(u.name || u.userId || '?')[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{u.name || u.userId || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{u.email || 'No email'}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-xs text-gray-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}</p>
                    {u.country && <p className="text-[10px] text-gray-400">{u.country}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-500" />
                Recent Orders
              </h3>
              <Link href="/admin/crm/super-admin/payments" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {stats.recent.orders.map((o: any, i: number) => (
                <div key={o._id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{o.userId || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {o.items?.[0]?.name || 'Order'} {o.items?.length > 1 ? `+${o.items.length - 1} more` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {o.items?.[0]?.currency === 'USD' ? '$' : '₹'}{o.total?.toLocaleString() || '0'}
                    </p>
                    <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      o.paymentStatus === 'completed' ? 'bg-green-100 text-green-700' :
                      o.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      o.paymentStatus === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {o.paymentStatus || 'unknown'}
                    </span>
                  </div>
                </div>
              ))}
              {stats.recent.orders.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No orders yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Gender Breakdown */}
        {stats.breakdowns.gender.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Gender Distribution</h3>
            <div className="flex items-center gap-4 flex-wrap">
              {stats.breakdowns.gender.map((g) => (
                <div key={g.gender} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 capitalize font-medium">{g.gender}</span>
                  <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">{g.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
