'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Radio,
  Clock,
  Target,
  BarChart3,
  Loader2,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface AnalyticsData {
  period: string;
  tenant: {
    name: string;
    plan: string;
    leadsUsed: number;
    leadsLimit: number;
  } | null;
  summary: {
    totalLeads: number;
    newLeads: number;
    growthRate: number;
    totalMessages: number;
    recentMessages: number;
    totalBroadcasts: number;
    recentBroadcasts: number;
    conversionRate: number;
    avgResponseTimeMinutes: number | null;
  };
  charts: {
    dailyLeads: { date: string; count: number }[];
    leadsByStatus: { status: string; count: number }[];
    leadsBySource: { source: string; count: number }[];
  };
  topAgents: { agentId: string; leads: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#10b981',
  converted: '#22c55e',
  lost: '#ef4444',
  nurturing: '#8b5cf6',
  Unknown: '#9ca3af',
};

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('30d');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const tenantSlug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch(`/api/crm-site/analytics?tenant=${tenantSlug}&period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError('Failed to load analytics');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600">{error || 'Failed to load analytics'}</p>
        <button onClick={fetchAnalytics} className="mt-4 text-indigo-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const { summary, charts, topAgents } = data;
  const maxDailyCount = Math.max(...charts.dailyLeads.map(d => d.count), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Analytics Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            {data.tenant?.name || 'Your CRM'} • {data.tenant?.plan || 'Free'} Plan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Leads */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${summary.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.growthRate >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(summary.growthRate)}%
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{summary.totalLeads.toLocaleString()}</div>
          <p className="text-sm text-gray-500">Total Leads</p>
          <p className="text-xs text-gray-400 mt-1">+{summary.newLeads} this period</p>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{summary.totalMessages.toLocaleString()}</div>
          <p className="text-sm text-gray-500">Messages Sent</p>
          <p className="text-xs text-gray-400 mt-1">+{summary.recentMessages} this period</p>
        </div>

        {/* Broadcasts */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Radio className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{summary.totalBroadcasts}</div>
          <p className="text-sm text-gray-500">Broadcasts</p>
          <p className="text-xs text-gray-400 mt-1">+{summary.recentBroadcasts} this period</p>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{summary.conversionRate}%</div>
          <p className="text-sm text-gray-500">Conversion Rate</p>
          {summary.avgResponseTimeMinutes && (
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Avg response: {summary.avgResponseTimeMinutes}min
            </p>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Lead Growth Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Lead Growth
          </h3>
          <div className="h-48 flex items-end gap-1">
            {charts.dailyLeads.length === 0 ? (
              <p className="text-gray-400 text-sm w-full text-center">No data available</p>
            ) : (
              charts.dailyLeads.map((day, idx) => (
                <div
                  key={idx}
                  className="flex-1 group relative"
                >
                  <div
                    className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-all"
                    style={{ height: `${(day.count / maxDailyCount) * 100}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {day.date}: {day.count}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{charts.dailyLeads[0]?.date || '-'}</span>
            <span>{charts.dailyLeads[charts.dailyLeads.length - 1]?.date || '-'}</span>
          </div>
        </div>

        {/* Leads by Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Leads by Status</h3>
          <div className="space-y-3">
            {charts.leadsByStatus.length === 0 ? (
              <p className="text-gray-400 text-sm">No data</p>
            ) : (
              charts.leadsByStatus.map((item, idx) => {
                const total = charts.leadsByStatus.reduce((a, b) => a + b.count, 0);
                const percent = total > 0 ? ((item.count / total) * 100).toFixed(0) : '0';
                const color = STATUS_COLORS[item.status] || '#9ca3af';

                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize">{item.status}</span>
                      <span className="text-gray-500">{item.count} ({percent}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${percent}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Source */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Lead Sources</h3>
          <div className="space-y-4">
            {charts.leadsBySource.length === 0 ? (
              <p className="text-gray-400 text-sm">No data available</p>
            ) : (
              charts.leadsBySource.map((source, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{source.source}</p>
                    <p className="text-sm text-gray-500">{source.count} leads</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Agents */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="space-y-4">
            {topAgents.length === 0 ? (
              <p className="text-gray-400 text-sm">No agent data available</p>
            ) : (
              topAgents.map((agent, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    idx === 0 ? 'bg-amber-100 text-amber-600' :
                    idx === 1 ? 'bg-gray-100 text-gray-600' :
                    idx === 2 ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-50 text-gray-500'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{agent.agentId}</p>
                    <p className="text-sm text-gray-500">{agent.leads} leads assigned</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Usage Meter */}
      {data.tenant && (
        <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">Lead Usage</h3>
              <p className="text-indigo-100 text-sm">{data.tenant.plan} Plan</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{data.tenant.leadsUsed.toLocaleString()}</p>
              <p className="text-indigo-100 text-sm">of {data.tenant.leadsLimit.toLocaleString()} leads</p>
            </div>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all"
              style={{ width: `${Math.min(100, (data.tenant.leadsUsed / data.tenant.leadsLimit) * 100)}%` }}
            />
          </div>
          {data.tenant.leadsUsed >= data.tenant.leadsLimit * 0.8 && (
            <p className="mt-3 text-amber-200 text-sm">
              ⚠️ You're approaching your lead limit. Consider upgrading your plan.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
