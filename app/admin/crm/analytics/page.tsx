'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AnalyticsData {
  overview?: {
    totalLeads: number;
    totalSales: number;
    totalMessages: number;
    conversionRate: number;
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
  const [analytics, setAnalytics] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'overview' | 'leads' | 'sales' | 'messages' | 'conversion' | 'trends'>('overview');

  const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchAnalytics();
  }, [view, token, router]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, color, subtitle }: any) => (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-6 text-white`}>
      <div className="text-4xl font-bold mb-2">{value}</div>
      <div className="text-opacity-90 font-medium">{title}</div>
      {subtitle && <div className="text-xs mt-2 opacity-75">{subtitle}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="bg-slate-800/50 backdrop-blur border-b border-purple-500/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/admin/crm" className="text-purple-400 hover:text-purple-300">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-white">Analytics & Insights</h1>
          <button
            onClick={fetchAnalytics}
            className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 px-4 py-2 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {/* View Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['overview', 'leads', 'sales', 'messages', 'conversion', 'trends'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === v
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                  : 'bg-slate-800/50 text-purple-200 border border-purple-500/20 hover:border-purple-500/50'
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-purple-300 py-12">Loading analytics...</div>
        ) : error ? (
          <div className="bg-red-900/50 border border-red-500/50 rounded-xl p-6 text-red-200">
            Error: {error}
          </div>
        ) : (
          <>
            {/* Overview */}
            {view === 'overview' && analytics.overview && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                  title="Total Leads"
                  value={analytics.overview.totalLeads}
                  color="from-blue-500 to-blue-600"
                />
                <StatCard
                  title="Total Sales"
                  value={analytics.overview.totalSales}
                  color="from-green-500 to-green-600"
                />
                <StatCard
                  title="Messages Sent"
                  value={analytics.overview.totalMessages}
                  color="from-purple-500 to-purple-600"
                />
                <StatCard
                  title="Conversion Rate"
                  value={`${analytics.overview.conversionRate.toFixed(2)}%`}
                  color="from-orange-500 to-orange-600"
                />
              </div>
            )}

            {/* Leads Analytics */}
            {view === 'leads' && analytics.leads && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard
                    title="Total Leads"
                    value={analytics.leads.totalLeads}
                    color="from-blue-500 to-blue-600"
                  />
                  <StatCard
                    title="Conversion Rate"
                    value={`${analytics.leads.conversionRate.toFixed(2)}%`}
                    color="from-green-500 to-green-600"
                  />
                  <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6">
                    <div className="text-white font-semibold mb-4">Leads by Status</div>
                    <div className="space-y-2">
                      {Object.entries(analytics.leads.byStatus).map(([status, count]) => (
                        <div key={status} className="flex justify-between text-purple-200">
                          <span className="capitalize">{status}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sales Analytics */}
            {view === 'sales' && analytics.sales && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <StatCard
                  title="Total Sales"
                  value={analytics.sales.totalSales}
                  color="from-green-500 to-green-600"
                />
                <StatCard
                  title="Total Revenue"
                  value={`₹${analytics.sales.totalRevenue.toLocaleString()}`}
                  color="from-emerald-500 to-emerald-600"
                />
                <StatCard
                  title="Avg. Sale Amount"
                  value={`₹${Math.round(analytics.sales.averageSaleAmount).toLocaleString()}`}
                  color="from-cyan-500 to-cyan-600"
                />
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6">
                  <div className="text-white font-semibold mb-4">Payment Methods</div>
                  <div className="space-y-2">
                    {Object.entries(analytics.sales.byPaymentMode).map(([method, data]) => (
                      <div key={method} className="text-purple-200 text-sm">
                        <div className="flex justify-between mb-1">
                          <span className="capitalize">{method}</span>
                          <span>{data.count} sales</span>
                        </div>
                        <div className="text-xs text-purple-300">₹{data.total.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Messages Analytics */}
            {view === 'messages' && analytics.messages && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <StatCard
                  title="Total Messages"
                  value={analytics.messages.totalMessages}
                  color="from-purple-500 to-purple-600"
                />
                <StatCard
                  title="Inbound"
                  value={analytics.messages.inbound}
                  color="from-blue-500 to-blue-600"
                  subtitle="Received messages"
                />
                <StatCard
                  title="Outbound"
                  value={analytics.messages.outbound}
                  color="from-green-500 to-green-600"
                  subtitle="Sent messages"
                />
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6 md:col-span-3">
                  <div className="text-white font-semibold mb-4">Messages by Status</div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(analytics.messages.byStatus).map(([status, count]) => (
                      <div key={status} className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-200">{count}</div>
                        <div className="text-xs text-purple-300 capitalize mt-1">{status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Conversion Funnel */}
            {view === 'conversion' && analytics.conversion && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-8">
                  <h2 className="text-white font-semibold text-lg mb-6">Conversion Funnel</h2>
                  <div className="space-y-4">
                    {analytics.conversion.funnel.map((stage, index) => (
                      <div key={index}>
                        <div className="flex justify-between mb-2">
                          <span className="text-white font-medium">{stage.stage}</span>
                          <div className="text-right">
                            <span className="text-purple-200 font-semibold">{stage.count}</span>
                            <span className="text-purple-300 text-sm ml-2">({stage.percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-8 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-full flex items-center justify-end pr-3"
                            style={{ width: `${stage.percentage}%` }}
                          >
                            {stage.percentage > 10 && (
                              <span className="text-white text-xs font-semibold">{stage.percentage.toFixed(0)}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <StatCard
                  title="Drop-off Rate"
                  value={`${analytics.conversion.dropOffRate.toFixed(2)}%`}
                  color="from-red-500 to-red-600"
                  subtitle="Leads not converted"
                />
              </div>
            )}

            {/* Trends */}
            {view === 'trends' && analytics.trends && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6 overflow-x-auto">
                  <h2 className="text-white font-semibold text-lg mb-6">Daily Trends</h2>
                  <table className="w-full min-w-max">
                    <thead>
                      <tr className="border-b border-purple-500/20">
                        <th className="px-4 py-3 text-left text-purple-200 font-semibold">Date</th>
                        <th className="px-4 py-3 text-center text-purple-200 font-semibold">Leads</th>
                        <th className="px-4 py-3 text-center text-purple-200 font-semibold">Sales</th>
                        <th className="px-4 py-3 text-right text-purple-200 font-semibold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.trends.daily.map((day, idx) => (
                        <tr key={idx} className="border-b border-purple-500/10 hover:bg-purple-500/5">
                          <td className="px-4 py-3 text-white">{day.date}</td>
                          <td className="px-4 py-3 text-center text-purple-200">{day.leads}</td>
                          <td className="px-4 py-3 text-center text-green-200">{day.sales}</td>
                          <td className="px-4 py-3 text-right text-green-300 font-semibold">₹{day.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6 overflow-x-auto">
                  <h2 className="text-white font-semibold text-lg mb-6">Weekly Trends</h2>
                  <table className="w-full min-w-max">
                    <thead>
                      <tr className="border-b border-purple-500/20">
                        <th className="px-4 py-3 text-left text-purple-200 font-semibold">Week</th>
                        <th className="px-4 py-3 text-center text-purple-200 font-semibold">Leads</th>
                        <th className="px-4 py-3 text-center text-purple-200 font-semibold">Sales</th>
                        <th className="px-4 py-3 text-right text-purple-200 font-semibold">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.trends.weekly.map((week, idx) => (
                        <tr key={idx} className="border-b border-purple-500/10 hover:bg-purple-500/5">
                          <td className="px-4 py-3 text-white">{week.week}</td>
                          <td className="px-4 py-3 text-center text-purple-200">{week.leads}</td>
                          <td className="px-4 py-3 text-center text-green-200">{week.sales}</td>
                          <td className="px-4 py-3 text-right text-green-300 font-semibold">₹{week.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
