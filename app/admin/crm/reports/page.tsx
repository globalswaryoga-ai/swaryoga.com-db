'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Download,
  ArrowUp,
  Target,
  MessageCircle,
  Filter,
  FileDown,
  Printer,
  ChevronDown,
  Lock,
  Crown,
  CheckCircle2,
  Zap,
  Eye,
  Star,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════ */

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

interface OverviewData {
  totalLeads?: number;
  newLeads?: number;
  totalMessages?: number;
  totalBroadcasts?: number;
  leadsByStatus?: { _id: string; count: number }[];
  leadsBySource?: { _id: string; count: number }[];
}

type PlanTier = 'free' | 'basic' | 'starter' | 'growth' | 'professional';

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */

const TIME_RANGES = [
  { id: 'today', name: 'Today' },
  { id: '7d', name: '7 Days' },
  { id: '30d', name: '30 Days' },
  { id: '90d', name: '90 Days' },
  { id: 'year', name: 'Year' },
  { id: 'all', name: 'All Time' },
];

const REPORT_CATEGORIES = [
  { id: 'all', name: 'All Reports', icon: BarChart3, color: 'text-blue-600' },
  { id: 'leads', name: 'Lead Reports', icon: Users, color: 'text-emerald-600' },
  { id: 'sales', name: 'Sales Reports', icon: DollarSign, color: 'text-green-600' },
  { id: 'marketing', name: 'Marketing', icon: Mail, color: 'text-purple-600' },
  { id: 'messaging', name: 'Messaging', icon: MessageCircle, color: 'text-cyan-600' },
  { id: 'team', name: 'Team Reports', icon: Target, color: 'text-orange-600' },
];

const PLAN_REPORT_COUNTS: Record<string, number> = {
  free: 2, basic: 4, starter: 7, growth: 10, professional: 10,
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', basic: 'Basic', starter: 'Starter', growth: 'Growth', professional: 'Professional',
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  basic: 'bg-blue-100 text-blue-700',
  starter: 'bg-purple-100 text-purple-700',
  growth: 'bg-emerald-100 text-emerald-700',
  professional: 'bg-amber-100 text-amber-700',
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */

const formatNumber = (num: number, format?: string): string => {
  if (format === 'currency')
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  if (format === 'percentage') return `${num.toFixed(1)}%`;
  return num.toLocaleString();
};

const downloadCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadJSON = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [plan, setPlan] = useState<string>('free');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [category, setCategory] = useState('all');
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { fetchReports(); fetchOverview(); }, []);

  useEffect(() => {
    if (selectedReport) fetchReportData(selectedReport.id);
  }, [selectedReport, timeRange]);

  const getToken = () => localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
  const getSlug = () => localStorage.getItem('tenantSlug') || '';

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/crm-site/reports?tenant=${getSlug()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) { const data = await res.json(); setReports(data.reports || []); setPlan(data.plan || 'free'); }
    } catch (err) { console.error('Failed to fetch reports:', err); }
  };

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm-site/analytics?tenant=${getSlug()}&period=${timeRange}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) { const data = await res.json(); setOverview(data); }
    } catch (err) { console.error('Failed to fetch overview:', err); }
    finally { setLoading(false); }
  };

  const fetchReportData = async (reportId: string) => {
    setReportLoading(true);
    try {
      const res = await fetch(`/api/crm-site/reports?tenant=${getSlug()}&id=${reportId}&timeRange=${timeRange}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) { const data = await res.json(); setReportData(data.data || null); }
    } catch (err) { console.error('Failed to fetch report:', err); }
    finally { setReportLoading(false); }
  };

  const handleRefresh = () => { fetchReports(); fetchOverview(); if (selectedReport) fetchReportData(selectedReport.id); };

  /* ── EXPORT ── */
  const canExport = plan !== 'free';

  const handleExportCSV = useCallback(() => {
    if (!reportData) return;
    setExporting(true);
    try {
      if (reportData.breakdown) downloadCSV(reportData.breakdown, selectedReport?.name || 'report');
      else if (reportData.trend) downloadCSV(reportData.trend, selectedReport?.name || 'report-trend');
      else if (reportData.metrics) downloadCSV([reportData.metrics], selectedReport?.name || 'report-metrics');
      setExportSuccess('CSV downloaded!'); setTimeout(() => setExportSuccess(''), 2000);
    } finally { setExporting(false); setExportOpen(false); }
  }, [reportData, selectedReport]);

  const handleExportJSON = useCallback(() => {
    if (!reportData) return;
    setExporting(true);
    try {
      downloadJSON(reportData, selectedReport?.name || 'report');
      setExportSuccess('JSON downloaded!'); setTimeout(() => setExportSuccess(''), 2000);
    } finally { setExporting(false); setExportOpen(false); }
  }, [reportData, selectedReport]);

  const handleExportAll = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/admin/crm/export-data', { headers: { Authorization: `Bearer ${getToken()}` } });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `crm-full-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click(); URL.revokeObjectURL(url);
        setExportSuccess('Full export downloaded!'); setTimeout(() => setExportSuccess(''), 3000);
      }
    } catch (err) { console.error('Export all failed:', err); }
    finally { setExporting(false); setExportOpen(false); }
  }, []);

  const handlePrint = () => { window.print(); setExportOpen(false); };

  /* ── CHART ── */
  const renderChart = (report: Report, data: ReportData) => {
    if (!data) return null;

    if (data.breakdown && data.breakdown.length > 0) {
      const max = Math.max(...data.breakdown.map(d => d.value));
      const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500'];
      return (
        <div className="space-y-3">
          {data.breakdown.map((item, idx) => (
            <div key={idx} className="group">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-gray-700 font-medium">{item.name}</span>
                <div className="flex items-center gap-2">
                  {item.count !== undefined && <span className="text-xs text-gray-400">{item.count} deals</span>}
                  <span className="font-semibold text-gray-900">{formatNumber(item.value)}</span>
                </div>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500`}
                  style={{ width: `${max > 0 ? (item.value / max) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (data.trend && data.trend.length > 0) {
      const max = Math.max(...data.trend.map(d => d.value));
      const barCount = data.trend.length;
      return (
        <div>
          <div className="flex items-end gap-1 h-52">
            {data.trend.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                <div className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition mb-1 font-medium">{d.value}</div>
                <div className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-300 hover:from-blue-600 hover:to-blue-500 min-h-[4px]"
                  style={{ height: `${max > 0 ? (d.value / max) * 100 : 2}%` }} />
              </div>
            ))}
          </div>
          {barCount <= 14 ? (
            <div className="flex gap-1 mt-2">
              {data.trend.map((d, i) => <div key={i} className="flex-1 text-center text-[9px] text-gray-400 truncate">{d.date.slice(5)}</div>)}
            </div>
          ) : (
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-400">{data.trend[0].date}</span>
              <span className="text-xs text-gray-400">{data.trend[barCount - 1].date}</span>
            </div>
          )}
        </div>
      );
    }

    if (data.metrics) {
      const entries = Object.entries(data.metrics);
      return (
        <div className={`grid ${entries.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'} gap-4`}>
          {entries.map(([key, value]) => {
            const fmt = key.toLowerCase().includes('rate') ? 'percentage'
              : (key.toLowerCase().includes('revenue') || key.toLowerCase().includes('avg')) ? 'currency' : undefined;
            return (
              <div key={key} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-5 border border-gray-100">
                <p className="text-sm text-gray-500 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                <p className="text-2xl font-bold text-gray-900">{typeof value === 'number' ? formatNumber(value, fmt) : value}</p>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="text-center py-12 text-gray-400">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No data available for this period</p>
      </div>
    );
  };

  const filteredReports = category === 'all' ? reports : reports.filter(r => r.category === category);

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */

  if (loading && !overview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500">Loading reports…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6">

        {/* ═══ HEADER ═══ */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl text-white shadow-lg">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports Center</h1>
              <p className="text-gray-500 text-sm">All your analytics and reports in one place</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${PLAN_COLORS[plan] || PLAN_COLORS.free}`}>
              <Crown className="w-3.5 h-3.5" /> {PLAN_LABELS[plan] || 'Free'} Plan
            </span>

            <div className="flex bg-white border rounded-xl overflow-hidden shadow-sm">
              {TIME_RANGES.map(r => (
                <button key={r.id} onClick={() => { setTimeRange(r.id); fetchOverview(); }}
                  className={`px-3 py-2 text-xs font-medium transition-all ${timeRange === r.id ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {r.name}
                </button>
              ))}
            </div>

            {/* Export dropdown */}
            <div className="relative print:hidden" ref={exportRef}>
              <button onClick={() => setExportOpen(!exportOpen)} disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-white border rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm transition-all">
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export
                <ChevronDown className={`w-3 h-3 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border shadow-xl z-50 py-1">
                  <button onClick={handleExportCSV} disabled={!reportData || !canExport}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    <FileDown className="w-4 h-4 text-emerald-600" />
                    <div className="text-left">
                      <p className="font-medium">Export CSV</p>
                      <p className="text-[10px] text-gray-400">Selected report data</p>
                    </div>
                    {!canExport && <Lock className="w-3 h-3 text-gray-400 ml-auto" />}
                  </button>
                  <button onClick={handleExportJSON} disabled={!reportData || !canExport}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium">Export JSON</p>
                      <p className="text-[10px] text-gray-400">Selected report data</p>
                    </div>
                    {!canExport && <Lock className="w-3 h-3 text-gray-400 ml-auto" />}
                  </button>
                  <div className="border-t my-1" />
                  <button onClick={handleExportAll}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <div className="text-left">
                      <p className="font-medium">Full CRM Export</p>
                      <p className="text-[10px] text-gray-400">All leads, messages, settings</p>
                    </div>
                  </button>
                  <button onClick={handlePrint}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">
                    <Printer className="w-4 h-4 text-gray-600" />
                    <div className="text-left">
                      <p className="font-medium">Print Report</p>
                      <p className="text-[10px] text-gray-400">Browser print dialog</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button onClick={handleRefresh} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white rounded-xl border shadow-sm transition print:hidden">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Export success toast */}
        {exportSuccess && (
          <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 z-50">
            <CheckCircle2 className="w-5 h-5" /> {exportSuccess}
          </div>
        )}

        {/* ═══ KPI CARDS ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-blue-50 rounded-xl"><Users className="w-5 h-5 text-blue-600" /></div>
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                <ArrowUp className="w-3 h-3" /> {overview?.newLeads || 0} new
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{(overview?.totalLeads || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Total Leads</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-emerald-50 rounded-xl"><Target className="w-5 h-5 text-emerald-600" /></div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {overview?.totalLeads && overview.totalLeads > 0
                ? `${((overview?.leadsByStatus?.find(s => s._id === 'converted')?.count || 0) / overview.totalLeads * 100).toFixed(1)}%`
                : '0%'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Conversion Rate</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-purple-50 rounded-xl"><MessageCircle className="w-5 h-5 text-purple-600" /></div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{(overview?.totalMessages || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Messages Sent</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-50 rounded-xl"><TrendingUp className="w-5 h-5 text-amber-600" /></div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{overview?.leadsBySource?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Active Sources</p>
          </div>
        </div>

        {/* ═══ CATEGORY TABS ═══ */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 print:hidden">
          {REPORT_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  category === cat.id ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-gray-600 border hover:bg-gray-50'
                }`}>
                <Icon className="w-4 h-4" /> {cat.name}
              </button>
            );
          })}
        </div>

        {/* ═══ MAIN LAYOUT ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Reports List */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Available Reports</h2>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                    {filteredReports.length} / {PLAN_REPORT_COUNTS[plan] || 2}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {plan === 'free' ? 'Upgrade for more reports' : `${PLAN_LABELS[plan]} plan reports`}
                </p>
              </div>
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {filteredReports.length === 0 ? (
                  <div className="p-8 text-center">
                    <PieChart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No reports in this category</p>
                  </div>
                ) : (
                  filteredReports.map(report => {
                    const catInfo = REPORT_CATEGORIES.find(c => c.id === report.category);
                    const Icon = catInfo?.icon || BarChart3;
                    const active = selectedReport?.id === report.id;
                    return (
                      <button key={report.id} onClick={() => setSelectedReport(report)}
                        className={`w-full p-4 text-left transition-all ${active ? 'bg-blue-50 border-l-[3px] border-l-blue-500' : 'hover:bg-gray-50 border-l-[3px] border-l-transparent'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl flex-shrink-0 ${active ? 'bg-blue-100' : 'bg-gray-100'}`}>
                            <Icon className={`w-4 h-4 ${active ? 'text-blue-600' : 'text-gray-500'}`} />
                          </div>
                          <div className="min-w-0">
                            <p className={`font-medium text-sm ${active ? 'text-blue-900' : 'text-gray-900'}`}>{report.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{report.description}</p>
                            <span className="text-[10px] text-gray-400 capitalize mt-1 inline-block bg-gray-100 px-1.5 py-0.5 rounded">{report.category}</span>
                          </div>
                          {active && <div className="ml-auto flex-shrink-0"><Eye className="w-4 h-4 text-blue-500" /></div>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              {plan === 'free' && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-t">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Unlock all 10 reports</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Upgrade to Starter or above for full analytics, exports & scheduling</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Report Detail */}
          <div className="lg:col-span-8 space-y-6">
            {selectedReport ? (
              <div className="bg-white rounded-2xl border shadow-sm">
                <div className="p-5 border-b flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedReport.name}</h2>
                    <p className="text-sm text-gray-500">{selectedReport.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg capitalize font-medium">{selectedReport.category}</span>
                    {canExport && reportData && (
                      <button onClick={handleExportCSV} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Download CSV">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  {reportLoading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                  ) : reportData ? renderChart(selectedReport, reportData) : (
                    <div className="text-center py-16">
                      <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No data for this period</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border shadow-sm p-12 text-center">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl w-20 h-20 mx-auto mb-5 flex items-center justify-center">
                  <PieChart className="w-10 h-10 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Report</h3>
                <p className="text-gray-500 max-w-sm mx-auto">Choose a report from the list to view detailed analytics, charts, and export data.</p>
              </div>
            )}

            {/* Quick Stats when no report selected */}
            {!selectedReport && overview && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Lead Distribution</h3>
                  </div>
                  {overview.leadsByStatus && overview.leadsByStatus.length > 0 ? (
                    <div className="space-y-3">
                      {overview.leadsByStatus.slice(0, 6).map((item, idx) => {
                        const total = overview.leadsByStatus!.reduce((s, i) => s + i.count, 0);
                        const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700 capitalize font-medium">{item._id || 'Unknown'}</span>
                              <span className="text-gray-600">{item.count} ({total > 0 ? ((item.count / total) * 100).toFixed(0) : 0}%)</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500`}
                                style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="text-gray-400 text-sm text-center py-6">No lead data yet</p>}
                </div>
                <div className="bg-white rounded-2xl border shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900">Top Sources</h3>
                  </div>
                  {overview.leadsBySource && overview.leadsBySource.length > 0 ? (
                    <div className="space-y-3">
                      {overview.leadsBySource.slice(0, 6).map((item, idx) => {
                        const total = overview.leadsBySource!.reduce((s, i) => s + i.count, 0);
                        const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'];
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700 font-medium">{item._id || 'Direct'}</span>
                              <span className="text-gray-600">{item.count}</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${colors[idx % colors.length]} rounded-full transition-all duration-500`}
                                style={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="text-gray-400 text-sm text-center py-6">No source data yet</p>}
                </div>
              </div>
            )}

            {/* Plan Comparison */}
            <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 rounded-2xl border shadow-sm p-6 print:hidden">
              <div className="flex items-center gap-3 mb-5">
                <Star className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-gray-900">Reports by Plan</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(['free', 'basic', 'starter', 'growth', 'professional'] as PlanTier[]).map(tier => {
                  const isCurrentPlan = tier === plan;
                  return (
                    <div key={tier} className={`rounded-xl p-3 text-center border transition-all ${
                      isCurrentPlan ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-105' : 'bg-white border-gray-200'
                    }`}>
                      <p className={`text-xs font-semibold mb-1 ${isCurrentPlan ? 'text-blue-100' : 'text-gray-500'}`}>{PLAN_LABELS[tier]}</p>
                      <p className={`text-xl font-bold ${isCurrentPlan ? 'text-white' : 'text-gray-900'}`}>{PLAN_REPORT_COUNTS[tier]}</p>
                      <p className={`text-[10px] mt-1 ${isCurrentPlan ? 'text-blue-200' : 'text-gray-400'}`}>reports</p>
                      {isCurrentPlan && <div className="mt-2 text-[10px] bg-white/20 rounded-lg py-0.5 font-medium">Current</div>}
                    </div>
                  );
                })}
              </div>
              {plan === 'free' && (
                <p className="text-xs text-gray-500 mt-4 text-center">
                  Upgrade your plan to unlock more reports, CSV/JSON exports, and scheduled reports.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
