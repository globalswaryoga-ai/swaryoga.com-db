'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { PageHeader, StatCard, LoadingSpinner, AlertBox } from '@/components/admin/crm';

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
  const token = useAuth();
  const crm = useCRM({ token });

  const [analytics, setAnalytics] = useState<AnalyticsData>({});
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'overview' | 'leads' | 'sales' | 'messages' | 'conversion' | 'trends'>('overview');

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
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchAnalytics();
  }, [token, router, fetchAnalytics]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
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

        {crm.loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Overview */}
            {view === 'overview' && analytics.overview && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Leads" value={analytics.overview.totalLeads.toString()} icon="📊" color="blue" />
                <StatCard label="Total Sales" value={analytics.overview.totalSales.toString()} icon="💰" color="green" />
                <StatCard label="Messages" value={analytics.overview.totalMessages.toString()} icon="💬" color="purple" />
                <StatCard label="Conversion" value={`${analytics.overview.conversionRate.toFixed(1)}%`} icon="📈" color="yellow" />
              </div>
            )}

            {/* Leads Analytics */}
            {view === 'leads' && analytics.leads && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard label="Total Leads" value={analytics.leads.totalLeads.toString()} icon="📊" color="blue" />
                  <StatCard label="Conversion Rate" value={`${analytics.leads.conversionRate.toFixed(1)}%`} icon="📈" color="green" />
                  <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6">
                    <div className="text-white font-semibold mb-4 text-sm">By Status</div>
                    <div className="space-y-2">
                      {Object.entries(analytics.leads.byStatus).map(([status, count]) => (
                        <div key={status} className="flex justify-between text-purple-200 text-sm">
                          <span className="capitalize">{status}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sales Analytics */}
            {view === 'sales' && analytics.sales && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Sales" value={analytics.sales.totalSales.toString()} icon="💰" color="green" />
                <StatCard label="Total Revenue" value={`₹${analytics.sales.totalRevenue.toLocaleString()}`} icon="💵" color="green" />
                <StatCard label="Avg. Sale" value={`₹${Math.round(analytics.sales.averageSaleAmount).toLocaleString()}`} icon="📊" color="blue" />
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6">
                  <div className="text-white font-semibold mb-3 text-sm">Payment Methods</div>
                  <div className="space-y-2">
                    {Object.entries(analytics.sales.byPaymentMode).map(([method]) => (
                      <div key={method} className="text-purple-200 text-xs capitalize">{method}</div>
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
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6">
                  <h2 className="text-white font-semibold text-lg mb-4">Conversion Funnel</h2>
                  {analytics.conversion.funnel.map((stage, idx) => (
                    <div key={idx} className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-white text-sm">{stage.stage}</span>
                        <span className="text-purple-200 text-sm">{stage.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-6">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-6 rounded-full" style={{width: `${stage.percentage}%`}} />
                      </div>
                    </div>
                  ))}
                </div>
                <StatCard label="Drop-off Rate" value={`${analytics.conversion.dropOffRate.toFixed(1)}%`} icon="📉" color="red" />
              </div>
            )}

            {/* Trends */}
            {view === 'trends' && analytics.trends && (
              <div className="space-y-4">
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6 overflow-x-auto">
                  <h2 className="text-white font-semibold mb-4">Daily Trends</h2>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-purple-500/20">
                        <th className="text-left text-purple-200 py-2">Date</th>
                        <th className="text-center text-purple-200 py-2">Leads</th>
                        <th className="text-center text-purple-200 py-2">Sales</th>
                        <th className="text-right text-purple-200 py-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.trends.daily.map((day, idx) => (
                        <tr key={idx} className="border-b border-purple-500/10 hover:bg-purple-500/5">
                          <td className="text-white py-2">{day.date}</td>
                          <td className="text-center text-purple-200">{day.leads}</td>
                          <td className="text-center text-green-200">{day.sales}</td>
                          <td className="text-right text-green-300">₹{day.revenue.toLocaleString()}</td>
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
