'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { PageHeader, StatCard, LoadingSpinner, AlertBox } from '@/components/admin/crm';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface AnalyticsData {
  overview?: {
    totalLeads: number;
    totalSales: number;
    totalMessages: number;
    conversionRate: number;
    broadcast?: {
      byStatus?: Record<string, number>;
      byReason?: Record<string, number>;
    };
  };
  leads?: {
    totalLeads: number;
    byStatus: Record<string, number>;
    conversionRate: number;
  };
  sales?: {
    totalSales: number;
    totalRevenue: number;
    averageSaleAmount: number;
    byPaymentMode: Record<string, { count: number; total: number }>;
  };
  messages?: {
    totalMessages: number;
    byStatus: Record<string, number>;
    inbound: number;
    outbound: number;
  };
  conversion?: {
    funnel: Array<{ stage: string; count: number; percentage: number }>;
    dropOffRate: number;
  };
  trends?: {
    daily: Array<{ date: string; leads: number; sales: number; revenue: number }>;
    weekly: Array<{ week: string; leads: number; sales: number; revenue: number }>;
  };
}

export default function AnalyticsPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });

  const fmtPct = useCallback((value: unknown, digits = 1) => {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return '0.0%';
    return `${n.toFixed(digits)}%`;
  }, []);

  const [analytics, setAnalytics] = useState<AnalyticsData>({});
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'overview' | 'leads' | 'sales' | 'messages' | 'conversion' | 'trends'>('overview');

  const broadcastSummary = useMemo(() => {
    const b = analytics?.overview?.broadcast;
    const byStatus = b?.byStatus || {};
    const byReason = b?.byReason || {};

    const sent = Number(byStatus.sent || 0);
    const failed = Number(byStatus.failed || 0);
    const skipped = Number(byStatus.skipped || 0);
    const pending = Number(byStatus.pending || 0) + Number(byStatus.sending || 0);

    return {
      sent,
      failed,
      skipped,
      pending,
      blocked: Number(byReason.blocked || 0),
      numberNotInUse: Number(byReason.number_not_in_use || 0),
      notDelivered: Number(byReason.not_delivered || 0),
      other: Number(byReason.other || 0),
      total: sent + failed + skipped + pending,
    };
  }, [analytics?.overview?.broadcast]);

  const fetchAnalytics = useCallback(async () => {
    try {
      if (!token) return;

      const response = await fetch(`/api/admin/crm/analytics?view=${view}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [token, view]);

  useEffect(() => {
    if (!token) return;
    fetchAnalytics();
  }, [token, router, fetchAnalytics]);

  const tabMeta = useMemo(
    () =>
      ({
        overview: { label: 'Overview', active: 'bg-indigo-600 text-white', inactive: 'text-slate-700 hover:bg-slate-50' },
        leads: { label: 'Leads', active: 'bg-emerald-600 text-white', inactive: 'text-slate-700 hover:bg-slate-50' },
        sales: { label: 'Sales', active: 'bg-emerald-600 text-white', inactive: 'text-slate-700 hover:bg-slate-50' },
        messages: { label: 'Messages', active: 'bg-indigo-600 text-white', inactive: 'text-slate-700 hover:bg-slate-50' },
        conversion: { label: 'Conversion', active: 'bg-red-600 text-white', inactive: 'text-slate-700 hover:bg-slate-50' },
        trends: { label: 'Trends', active: 'bg-slate-900 text-white', inactive: 'text-slate-700 hover:bg-slate-50' },
      }) as const,
    []
  );

  return (
    <div className="min-h-screen bg-white p-8 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader title="Analytics & Insights" />

        {/* Error Alert */}
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}

        {/* View Tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['overview', 'leads', 'sales', 'messages', 'conversion', 'trends'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-xl font-extrabold text-sm transition-all border ${
                view === v
                  ? `${tabMeta[v].active} border-transparent shadow-sm`
                  : `${tabMeta[v].inactive} bg-white border-slate-200/70`
              }`}
            >
              {tabMeta[v].label}
            </button>
          ))}
        </div>

        {crm.loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Overview */}
            {view === 'overview' && analytics.overview && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Leads" value={analytics.overview.totalLeads.toString()} icon="📊" color="indigo" />
                  <StatCard label="Total Sales" value={analytics.overview.totalSales.toString()} icon="💰" color="teal" />
                  <StatCard label="Messages" value={analytics.overview.totalMessages.toString()} icon="💬" color="purple" />
                  <StatCard label="Conversion" value={fmtPct(analytics.overview.conversionRate, 1)} icon="📈" color="orange" />
                </div>

                <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="text-slate-900 font-extrabold text-sm">Broadcast Delivery Breakdown</div>
                      <div className="text-slate-500 text-xs mt-1">
                        Aggregated from broadcast runs (best-effort based on failure reason text).
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => router.push('/admin/crm/broadcast')}
                        className="px-3 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                      >
                        Open Broadcasts
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push('/admin/crm/broadcast?tab=runs')}
                        className="px-3 py-2 rounded-xl text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-950 shadow-sm"
                      >
                        View Runs
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">Sent</div>
                      <div className="text-2xl font-black text-emerald-700 mt-1">{broadcastSummary.sent}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">Failed</div>
                      <div className="text-2xl font-black text-red-700 mt-1">{broadcastSummary.failed}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">Pending</div>
                      <div className="text-2xl font-black text-indigo-700 mt-1">{broadcastSummary.pending}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">Skipped</div>
                      <div className="text-2xl font-black text-slate-900 mt-1">{broadcastSummary.skipped}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">Blocked / Opt-out</div>
                      <div className="text-xl font-black text-red-700 mt-1">{broadcastSummary.blocked}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">Number not in use</div>
                      <div className="text-xl font-black text-indigo-700 mt-1">{broadcastSummary.numberNotInUse}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">Not delivered</div>
                      <div className="text-xl font-black text-red-700 mt-1">{broadcastSummary.notDelivered}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                      <div className="text-xs text-slate-500 font-bold">Other</div>
                      <div className="text-xl font-black text-slate-900 mt-1">{broadcastSummary.other}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap mt-4">
                    <button
                      type="button"
                      onClick={() => router.push('/admin/crm/broadcast?tab=runs&status=failed')}
                      className="px-3 py-2 rounded-xl text-xs font-extrabold bg-red-50 text-red-700 border border-red-100 hover:bg-red-100"
                    >
                      View Failed
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/admin/crm/broadcast?tab=runs&status=scheduled')}
                      className="px-3 py-2 rounded-xl text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100"
                    >
                      View Scheduled
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/admin/crm/broadcast?tab=runs&status=running')}
                      className="px-3 py-2 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                    >
                      View Running
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Leads Analytics */}
            {view === 'leads' && analytics.leads && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard label="Total Leads" value={analytics.leads.totalLeads.toString()} icon="📊" color="blue" />
                  <StatCard label="Conversion Rate" value={fmtPct(analytics.leads.conversionRate, 1)} icon="📈" color="green" />
                  <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm">
                    <div className="text-slate-900 font-extrabold mb-4 text-sm">By Status</div>
                    <div className="space-y-2">
                      {Object.entries(analytics.leads.byStatus || {}).map(([status, count]) => (
                        <div key={status} className="flex justify-between text-slate-700 text-sm">
                          <span className="capitalize">{status}</span>
                          <span className="font-bold text-slate-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Leads by Status Chart */}
                {analytics.leads.byStatus && Object.keys(analytics.leads.byStatus).length > 0 && (
                  <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-slate-900 font-extrabold mb-4">Leads by Status</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(analytics.leads.byStatus).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                          <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Pie Chart for Leads */}
                {analytics.leads.byStatus && Object.keys(analytics.leads.byStatus).length > 0 && (
                  <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-slate-900 font-extrabold mb-4">Status Distribution</h3>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={Object.entries(analytics.leads.byStatus).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          >
                            {Object.entries(analytics.leads.byStatus).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sales Analytics */}
            {view === 'sales' && analytics.sales && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Sales" value={analytics.sales.totalSales.toString()} icon="💰" color="green" />
                <StatCard label="Total Revenue" value={`₹${analytics.sales.totalRevenue.toLocaleString()}`} icon="💵" color="green" />
                <StatCard label="Avg. Sale" value={`₹${Math.round(analytics.sales.averageSaleAmount).toLocaleString()}`} icon="📊" color="blue" />
                <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm">
                  <div className="text-slate-900 font-extrabold mb-3 text-sm">Payment Methods</div>
                  <div className="space-y-2">
                    {Object.entries(analytics.sales.byPaymentMode || {}).map(([method]) => (
                      <div key={method} className="text-slate-700 text-xs capitalize">{method}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Messages Analytics */}
            {view === 'messages' && analytics.messages && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Total Messages" value={analytics.messages.totalMessages.toString()} icon="💬" color="purple" />
                <StatCard label="Inbound" value={analytics.messages.inbound.toString()} icon="📥" color="blue" />
                <StatCard label="Outbound" value={analytics.messages.outbound.toString()} icon="📤" color="green" />
              </div>
            )}

            {/* Conversion Funnel */}
            {view === 'conversion' && analytics.conversion && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-slate-900 font-extrabold text-lg mb-4">Conversion Funnel</h2>
                  {analytics.conversion.funnel.map((stage, idx) => (
                    <div key={idx} className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-900 text-sm font-bold">{stage.stage}</span>
                        <span className="text-slate-600 text-sm font-semibold">{fmtPct(stage.percentage, 1)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-6 border border-slate-200">
                        <div
                          className="bg-gradient-to-r from-indigo-600 via-emerald-600 to-red-600 h-6 rounded-full"
                          style={{ width: `${stage.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <StatCard label="Drop-off Rate" value={fmtPct(analytics.conversion.dropOffRate, 1)} icon="📉" color="red" />
              </div>
            )}

            {/* Trends */}
            {view === 'trends' && analytics.trends && (
              <div className="space-y-4">
                {/* Trend Charts */}
                {analytics.trends.daily && analytics.trends.daily.length > 0 && (
                  <>
                    {/* Line Chart for Leads & Sales */}
                    <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm">
                      <h2 className="text-slate-900 font-extrabold mb-4">Leads & Sales Trend</h2>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analytics.trends.daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Legend />
                            <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} name="Leads" />
                            <Line type="monotone" dataKey="sales" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981', r: 4 }} name="Sales" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Area Chart for Revenue */}
                    <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm">
                      <h2 className="text-slate-900 font-extrabold mb-4">Revenue Trend</h2>
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.trends.daily}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: '#64748b' }} />
                            <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                            <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="#10B981" fillOpacity={0.2} strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}

                {/* Data Table */}
                <div className="bg-white border border-slate-200/70 rounded-2xl p-6 shadow-sm overflow-x-auto">
                  <h2 className="text-slate-900 font-extrabold mb-4">Daily Trends</h2>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left text-slate-600 py-2 font-extrabold">Date</th>
                        <th className="text-center text-slate-600 py-2 font-extrabold">Leads</th>
                        <th className="text-center text-slate-600 py-2 font-extrabold">Sales</th>
                        <th className="text-right text-slate-600 py-2 font-extrabold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.trends.daily.map((day, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="text-slate-900 py-2 font-semibold">{day.date}</td>
                          <td className="text-center text-indigo-700 font-bold">{day.leads}</td>
                          <td className="text-center text-emerald-700 font-bold">{day.sales}</td>
                          <td className="text-right text-emerald-700 font-black">₹{day.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
