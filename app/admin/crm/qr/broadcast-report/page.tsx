'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart3, Radio, Send, CheckCircle2, XCircle,
  Clock, Calendar, TrendingUp, Users, ArrowLeft,
  Download, Loader2, AlertTriangle, PieChart,
  ChevronDown, ChevronUp, Filter,
} from 'lucide-react';

// ── Types (matches broadcast page) ──
type BroadcastStatus = 'draft' | 'queued' | 'sending' | 'paused' | 'completed' | 'failed' | 'scheduled';

type BroadcastRun = {
  id: string;
  message: string;
  templateId?: string;
  templateName?: string;
  recipients: string[];
  recipientNames: Record<string, string>;
  status: BroadcastStatus;
  sent: number;
  failed: number;
  total: number;
  createdAt: number;
  scheduledAt?: number;
  batchesSent: number;
  lastBatchAt?: number;
  dailySentCount: number;
  errors: string[];
  log: Array<{ chatId: string; status: 'sent' | 'failed' | 'pending'; time: number; error?: string }>;
};

type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'all';

const STORAGE_KEY = 'qr_broadcast_runs';

function loadRuns(): BroadcastRun[] {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getStartOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getStartOfMonth(date: Date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getStartOfYear(date: Date) {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function BroadcastReportPage() {
  useAuth();

  const [allRuns, setAllRuns] = useState<BroadcastRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>('all');
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  useEffect(() => {
    setAllRuns(loadRuns());
    setLoading(false);
  }, []);

  // Filter runs by period
  const filteredRuns = useMemo(() => {
    if (period === 'all') return allRuns;
    const now = new Date();
    let start: number;
    switch (period) {
      case 'today': start = getStartOfDay(now); break;
      case 'week': start = getStartOfWeek(now); break;
      case 'month': start = getStartOfMonth(now); break;
      case 'year': start = getStartOfYear(now); break;
      default: return allRuns;
    }
    return allRuns.filter(r => r.createdAt >= start);
  }, [allRuns, period]);

  // Compute stats from filtered runs
  const stats = useMemo(() => {
    const totalBroadcasts = filteredRuns.length;
    const totalSent = filteredRuns.reduce((s, r) => s + r.sent, 0);
    const totalFailed = filteredRuns.reduce((s, r) => s + r.failed, 0);
    const totalRecipients = filteredRuns.reduce((s, r) => s + r.total, 0);
    const completed = filteredRuns.filter(r => r.status === 'completed').length;
    const inProgress = filteredRuns.filter(r => r.status === 'sending' || r.status === 'queued').length;
    const paused = filteredRuns.filter(r => r.status === 'paused').length;
    const scheduled = filteredRuns.filter(r => r.status === 'scheduled').length;
    const failed = filteredRuns.filter(r => r.status === 'failed').length;
    const successRate = totalSent + totalFailed > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(1) : '0';
    const completionRate = totalBroadcasts > 0 ? ((completed / totalBroadcasts) * 100).toFixed(0) : '0';

    // Unique recipients
    const uniqueRecipients = new Set<string>();
    filteredRuns.forEach(r => r.recipients.forEach(id => uniqueRecipients.add(id)));

    // Template usage
    const templateUsage: Record<string, number> = {};
    filteredRuns.forEach(r => {
      const name = r.templateName || 'Custom Message';
      templateUsage[name] = (templateUsage[name] || 0) + 1;
    });
    const topTemplates = Object.entries(templateUsage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Daily breakdown (for charts)
    const dailyMap: Record<string, { sent: number; failed: number; broadcasts: number }> = {};
    filteredRuns.forEach(r => {
      const day = new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      if (!dailyMap[day]) dailyMap[day] = { sent: 0, failed: 0, broadcasts: 0 };
      dailyMap[day].sent += r.sent;
      dailyMap[day].failed += r.failed;
      dailyMap[day].broadcasts++;
    });
    const dailyBreakdown = Object.entries(dailyMap).map(([day, data]) => ({ day, ...data }));

    return {
      totalBroadcasts,
      totalSent,
      totalFailed,
      totalRecipients,
      completed,
      inProgress,
      paused,
      scheduled,
      failed,
      successRate,
      completionRate,
      uniqueRecipients: uniqueRecipients.size,
      topTemplates,
      dailyBreakdown,
    };
  }, [filteredRuns]);

  // Export CSV
  const exportCSV = () => {
    const headers = ['Broadcast ID', 'Status', 'Template', 'Message', 'Recipients', 'Sent', 'Failed', 'Total', 'Created At', 'Batches'];
    const rows = filteredRuns.map(r => [
      r.id,
      r.status,
      r.templateName || 'Custom',
      `"${r.message.replace(/"/g, '""').slice(0, 100)}"`,
      r.total,
      r.sent,
      r.failed,
      r.total,
      formatDateTime(r.createdAt),
      r.batchesSent,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `broadcast-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    queued: 'bg-yellow-100 text-yellow-700',
    sending: 'bg-blue-100 text-blue-700',
    paused: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    scheduled: 'bg-purple-100 text-purple-700',
  };

  const periodLabels: Record<TimePeriod, string> = {
    today: 'Today',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    all: 'All Time',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/crm/qr/broadcast" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Broadcast Report</h1>
              <p className="text-sm text-gray-500 mt-0.5">QR WhatsApp broadcast analytics & history</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Period Filter */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
              {(['today', 'week', 'month', 'year', 'all'] as TimePeriod[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    period === p ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
            <button onClick={exportCSV} disabled={filteredRuns.length === 0} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5 transition">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-indigo-50"><Radio className="w-4 h-4 text-indigo-600" /></div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalBroadcasts}</div>
            <div className="text-xs text-gray-500">Total Broadcasts</div>
          </div>

          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-green-50"><Send className="w-4 h-4 text-green-600" /></div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalSent}</div>
            <div className="text-xs text-gray-500">Messages Sent</div>
          </div>

          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-red-50"><XCircle className="w-4 h-4 text-red-600" /></div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalFailed}</div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>

          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-emerald-50"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.successRate}%</div>
            <div className="text-xs text-gray-500">Success Rate</div>
          </div>

          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-50"><Users className="w-4 h-4 text-blue-600" /></div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.uniqueRecipients}</div>
            <div className="text-xs text-gray-500">Unique Recipients</div>
          </div>

          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-purple-50"><TrendingUp className="w-4 h-4 text-purple-600" /></div>
            </div>
            <div className="text-2xl font-bold text-gray-900">{stats.completionRate}%</div>
            <div className="text-xs text-gray-500">Completion Rate</div>
          </div>
        </div>

        {/* ── Status Breakdown + Template Usage ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Breakdown */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-gray-500" /> Status Breakdown
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Completed', value: stats.completed, color: 'bg-green-500', bg: 'bg-green-50' },
                { label: 'In Progress', value: stats.inProgress, color: 'bg-blue-500', bg: 'bg-blue-50' },
                { label: 'Paused', value: stats.paused, color: 'bg-amber-500', bg: 'bg-amber-50' },
                { label: 'Scheduled', value: stats.scheduled, color: 'bg-purple-500', bg: 'bg-purple-50' },
                { label: 'Failed', value: stats.failed, color: 'bg-red-500', bg: 'bg-red-50' },
              ].map(item => {
                const pct = stats.totalBroadcasts > 0 ? (item.value / stats.totalBroadcasts) * 100 : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-gray-600 font-medium">{item.label}</div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-12 text-right text-xs font-bold text-gray-800">{item.value}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Template Usage */}
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-gray-500" /> Top Templates Used
            </h3>
            {stats.topTemplates.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No broadcasts yet</p>
            ) : (
              <div className="space-y-3">
                {stats.topTemplates.map(([name, count], idx) => {
                  const maxCount = stats.topTemplates[0]?.[1] || 1;
                  const pct = (count / maxCount) * 100;
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <span className="w-5 text-xs font-bold text-gray-400">#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-800 font-medium truncate">{name}</div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-800">{count}x</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Daily Activity Chart (simple bar) ── */}
        {stats.dailyBreakdown.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" /> Daily Activity
            </h3>
            <div className="flex items-end gap-1.5 h-32">
              {stats.dailyBreakdown.slice(-14).map((day, idx) => {
                const maxVal = Math.max(...stats.dailyBreakdown.map(d => d.sent + d.failed), 1);
                const sentH = (day.sent / maxVal) * 100;
                const failedH = (day.failed / maxVal) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div className="w-full flex flex-col justify-end h-24">
                      {day.failed > 0 && (
                        <div className="w-full bg-red-400 rounded-t-sm transition-all" style={{ height: `${failedH}%`, minHeight: day.failed > 0 ? '2px' : 0 }} />
                      )}
                      <div className="w-full bg-green-500 rounded-t-sm transition-all" style={{ height: `${sentH}%`, minHeight: day.sent > 0 ? '4px' : 0 }} />
                    </div>
                    <span className="text-[9px] text-gray-400 whitespace-nowrap">{day.day}</span>
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-10">
                      {day.day}: {day.sent} sent, {day.failed} failed, {day.broadcasts} broadcast{day.broadcasts !== 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> Sent</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Failed</span>
            </div>
          </div>
        )}

        {/* ── Detailed Broadcast History ── */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" /> Broadcast History
            </h3>
            <span className="text-xs text-gray-500">{filteredRuns.length} broadcast{filteredRuns.length !== 1 ? 's' : ''} in {periodLabels[period].toLowerCase()}</span>
          </div>

          {filteredRuns.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Radio className="w-10 h-10 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-1">No broadcasts found for {periodLabels[period].toLowerCase()}</p>
              <p className="text-xs text-gray-400">Send a broadcast from the <Link href="/admin/crm/qr/broadcast" className="text-green-600 hover:underline">Broadcast page</Link></p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Table Header */}
              <div className="grid grid-cols-12 px-5 py-2 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-1">Status</div>
                <div className="col-span-3">Message</div>
                <div className="col-span-2">Template</div>
                <div className="col-span-1 text-center">Sent</div>
                <div className="col-span-1 text-center">Failed</div>
                <div className="col-span-1 text-center">Total</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-1 text-center">Details</div>
              </div>

              {filteredRuns.map(run => {
                const isExpanded = expandedRun === run.id;
                const progress = run.total > 0 ? ((run.sent + run.failed) / run.total) * 100 : 0;
                return (
                  <React.Fragment key={run.id}>
                    <div className="grid grid-cols-12 px-5 py-3 items-center hover:bg-gray-50 transition text-sm">
                      <div className="col-span-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[run.status] || 'bg-gray-100 text-gray-600'}`}>
                          {run.status === 'completed' ? '✓' : run.status === 'failed' ? '✗' : run.status === 'sending' ? '⟳' : '●'} {run.status.slice(0, 4).toUpperCase()}
                        </span>
                      </div>
                      <div className="col-span-3 text-gray-700 truncate pr-2">{run.message.slice(0, 60)}</div>
                      <div className="col-span-2 text-xs text-gray-500 truncate">{run.templateName || <span className="italic text-gray-400">Custom</span>}</div>
                      <div className="col-span-1 text-center font-semibold text-green-600">{run.sent}</div>
                      <div className="col-span-1 text-center font-semibold text-red-500">{run.failed}</div>
                      <div className="col-span-1 text-center text-gray-600">{run.total}</div>
                      <div className="col-span-2 text-xs text-gray-500">{formatDateTime(run.createdAt)}</div>
                      <div className="col-span-1 text-center">
                        <button onClick={() => setExpandedRun(isExpanded ? null : run.id)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded row */}
                    {isExpanded && (
                      <div className="bg-gray-50 px-5 py-4 border-t border-gray-100">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Message Preview */}
                          <div>
                            <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Full Message</p>
                            <div className="bg-white rounded-lg border p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">{run.message}</div>
                          </div>

                          {/* Stats */}
                          <div className="space-y-3">
                            <div>
                              <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Progress</p>
                              <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: run.failed > 0 ? `linear-gradient(90deg, #22c55e ${((run.sent / (run.sent + run.failed)) * 100)}%, #ef4444 0%)` : '#22c55e' }} />
                              </div>
                              <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                                <span>{run.sent} sent</span>
                                {run.failed > 0 && <span>{run.failed} failed</span>}
                                <span>{run.total - run.sent - run.failed} pending</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Batches: <strong className="text-gray-700">{run.batchesSent}</strong></span>
                              {run.lastBatchAt && <span>Last: <strong className="text-gray-700">{formatDateTime(run.lastBatchAt)}</strong></span>}
                            </div>
                          </div>
                        </div>

                        {/* Recipient Log */}
                        <div className="mt-4">
                          <p className="text-[11px] font-semibold text-gray-500 uppercase mb-2">Recipient Log ({run.total})</p>
                          <div className="bg-white rounded-lg border max-h-48 overflow-y-auto divide-y">
                            {run.log.map((entry, idx) => (
                              <div key={idx} className="flex items-center gap-3 px-3 py-1.5">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.status === 'sent' ? 'bg-green-500' : entry.status === 'failed' ? 'bg-red-500' : 'bg-gray-300'}`} />
                                <span className="text-sm text-gray-700 flex-1 truncate">{run.recipientNames[entry.chatId] || entry.chatId}</span>
                                <span className={`text-[10px] font-medium ${entry.status === 'sent' ? 'text-green-600' : entry.status === 'failed' ? 'text-red-600' : 'text-gray-400'}`}>
                                  {entry.status === 'sent' ? `Sent ${entry.time ? formatDateTime(entry.time) : ''}` : entry.status === 'failed' ? `Failed${entry.error ? `: ${entry.error.slice(0, 30)}` : ''}` : 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Errors */}
                        {run.errors.length > 0 && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-[11px] font-semibold text-red-700 uppercase mb-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Errors ({run.errors.length})
                            </p>
                            <div className="space-y-0.5 max-h-24 overflow-y-auto">
                              {run.errors.map((err, i) => (
                                <p key={i} className="text-[11px] text-red-600">{err}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary Footer */}
        <div className="text-center text-xs text-gray-400 pb-6">
          Showing data for <strong>{periodLabels[period].toLowerCase()}</strong> · {filteredRuns.length} broadcast{filteredRuns.length !== 1 ? 's' : ''} · {stats.totalSent} messages sent
        </div>
      </div>
    </div>
  );
}
