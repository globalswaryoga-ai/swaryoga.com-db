'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  DollarSign,
  Mail,
  FileText,
  Loader2,
  RefreshCw,
  Calendar,
  Download,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Target,
  MousePointer,
  Eye,
} from 'lucide-react';

interface ReportData {
  metrics?: Record<string, number>;
  breakdown?: { name: string; value: number; count?: number }[];
  trend?: { date: string; value: number }[];
  campaigns?: any[];
  pages?: any[];
}

interface Report {
  id: string;
  name: string;
  description: string;
  category: string;
  chartType: string;
}

const TIME_RANGES = [
  { id: 'today', name: 'Today' },
  { id: '7d', name: 'Last 7 Days' },
  { id: '30d', name: 'Last 30 Days' },
  { id: '90d', name: 'Last 90 Days' },
  { id: 'year', name: 'This Year' },
  { id: 'all', name: 'All Time' },
];

const CATEGORY_ICONS: Record<string, any> = {
  leads: Users,
  sales: DollarSign,
  marketing: Mail,
  team: Target,
};

const formatNumber = (num: number, format?: string): string => {
  if (format === 'currency') {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  }
  if (format === 'percentage') {
    return `${num.toFixed(1)}%`;
  }
  return num.toLocaleString();
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [plan, setPlan] = useState('free');
  const [tenantSlug, setTenantSlug] = useState('');
  const [overview, setOverview] = useState<any>(null);

  useEffect(() => {
    const slug = localStorage.getItem('tenantSlug') || '';
    setTenantSlug(slug);
    fetchReports();
    fetchOverview();
  }, []);

  useEffect(() => {
    if (selectedReport) {
      fetchReportData(selectedReport.id);
    }
  }, [selectedReport, timeRange]);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch(`/api/crm-site/reports?tenant=${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setPlan(data.plan || 'free');
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
  };

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch(`/api/crm-site/analytics?tenant=${slug}&period=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setOverview(data);
      }
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReportData = async (reportId: string) => {
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
      const slug = localStorage.getItem('tenantSlug') || '';

      const res = await fetch(`/api/crm-site/reports?tenant=${slug}&id=${reportId}&timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setReportData(data.data || null);
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    }
  };

  const renderChart = (report: Report, data: ReportData) => {
    if (!data) return null;

    // Simple bar chart for breakdown data
    if (data.breakdown && data.breakdown.length > 0) {
      const max = Math.max(...data.breakdown.map(d => d.value));
      return (
        <div className="space-y-3">
          {data.breakdown.map((item, idx) => (
            <div key={idx}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{item.name}</span>
                <span className="font-medium">{formatNumber(item.value)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(item.value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Line chart for trend data
    if (data.trend && data.trend.length > 0) {
      const max = Math.max(...data.trend.map(d => d.value));
      const points = data.trend.map((d, i) => {
        const x = (i / (data.trend!.length - 1)) * 100;
        const y = 100 - (d.value / max) * 100;
        return `${x},${y}`;
      }).join(' ');

      return (
        <div className="h-48 relative">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
              points={points}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
            <span>{data.trend[0].date}</span>
            <span>{data.trend[data.trend.length - 1].date}</span>
          </div>
        </div>
      );
    }

    // Metrics display
    if (data.metrics) {
      return (
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(data.metrics).map(([key, value]) => (
            <div key={key} className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {typeof value === 'number' ? formatNumber(value, key.includes('rate') || key.includes('Rate') ? 'percentage' : key.includes('revenue') || key.includes('Revenue') ? 'currency' : undefined) : value}
              </p>
            </div>
          ))}
        </div>
      );
    }

    return <p className="text-gray-500">No data available</p>;
  };

  if (loading && !overview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600">Track your CRM performance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value);
                fetchOverview();
              }}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {TIME_RANGES.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <button
              onClick={() => { fetchReports(); fetchOverview(); }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Leads</span>
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold mt-2">{overview.totalLeads?.toLocaleString() || 0}</p>
              <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                <ArrowUp className="w-3 h-3" />
                {overview.newLeads || 0} new
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 border">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Conversion Rate</span>
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold mt-2">
                {overview.leadsByStatus?.find((s: any) => s._id === 'converted')?.count || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">converted leads</p>
            </div>
            <div className="bg-white rounded-xl p-5 border">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Messages</span>
                <Mail className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold mt-2">{overview.totalMessages?.toLocaleString() || 0}</p>
              <p className="text-sm text-gray-500 mt-1">total sent</p>
            </div>
            <div className="bg-white rounded-xl p-5 border">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active Sources</span>
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-3xl font-bold mt-2">{overview.leadsBySource?.length || 0}</p>
              <p className="text-sm text-gray-500 mt-1">lead sources</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">Available Reports</h2>
                <p className="text-sm text-gray-500">{plan} plan</p>
              </div>
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {reports.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    No reports available
                  </div>
                ) : (
                  reports.map((report) => {
                    const Icon = CATEGORY_ICONS[report.category] || BarChart3;
                    return (
                      <button
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className={`w-full p-4 text-left hover:bg-gray-50 transition ${
                          selectedReport?.id === report.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${selectedReport?.id === report.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                            <Icon className={`w-4 h-4 ${selectedReport?.id === report.id ? 'text-blue-600' : 'text-gray-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{report.name}</p>
                            <p className="text-sm text-gray-500">{report.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Report View */}
          <div className="lg:col-span-2">
            {selectedReport ? (
              <div className="bg-white rounded-xl border">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedReport.name}</h2>
                    <p className="text-sm text-gray-500">{selectedReport.description}</p>
                  </div>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded capitalize">
                    {selectedReport.category}
                  </span>
                </div>
                <div className="p-6">
                  {reportData ? (
                    renderChart(selectedReport, reportData)
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border p-12 text-center">
                <PieChart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Report</h3>
                <p className="text-gray-600">Choose a report from the list to view detailed analytics</p>
              </div>
            )}

            {/* Quick Stats Charts */}
            {overview && !selectedReport && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {/* Leads by Status */}
                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Leads by Status</h3>
                  {overview.leadsByStatus && overview.leadsByStatus.length > 0 ? (
                    <div className="space-y-3">
                      {overview.leadsByStatus.slice(0, 5).map((item: any, idx: number) => {
                        const total = overview.leadsByStatus.reduce((s: number, i: any) => s + i.count, 0);
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700 capitalize">{item._id || 'Unknown'}</span>
                              <span className="font-medium">{item.count}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(item.count / total) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No data</p>
                  )}
                </div>

                {/* Leads by Source */}
                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Top Lead Sources</h3>
                  {overview.leadsBySource && overview.leadsBySource.length > 0 ? (
                    <div className="space-y-3">
                      {overview.leadsBySource.slice(0, 5).map((item: any, idx: number) => {
                        const total = overview.leadsBySource.reduce((s: number, i: any) => s + i.count, 0);
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700">{item._id || 'Direct'}</span>
                              <span className="font-medium">{item.count}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${(item.count / total) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No data</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
