'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  BarChart2, RefreshCw, Loader2, Send, CheckCircle2, XCircle,
  TrendingUp, MessageSquare, Users, Clock, Plus,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Overview {
  totalRuns: number;
  completedRuns: number;
  runningRuns: number;
  failedRuns: number;
  totalMessages: number;
  totalSent: number;
  totalFailed: number;
  successRate: number;
}

interface DayData { date: string; sent: number }
interface TemplateUsage { name: string; runs: number; sent: number }
interface RecentRun {
  _id: string;
  name: string;
  status: string;
  stats: { total: number; sent: number; failed: number };
  createdAt: string;
  completedAt?: string;
}

// ── SVG Bar Chart ──────────────────────────────────────────────────────────────
function BarChart({ data, label }: { data: DayData[]; label: string }) {
  const max = Math.max(...data.map(d => d.sent), 1);
  const W = 600;
  const H = 120;
  const pad = { top: 10, bottom: 28, left: 4, right: 4 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const barW = Math.floor(innerW / data.length) - 2;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 300 }}>
        {/* Gridlines */}
        {[0, 0.5, 1].map(f => (
          <line
            key={f}
            x1={pad.left} y1={pad.top + innerH * (1 - f)}
            x2={W - pad.right} y2={pad.top + innerH * (1 - f)}
            stroke="#e5e7eb" strokeWidth="1"
          />
        ))}
        {/* Bars */}
        {data.map((d, i) => {
          const x = pad.left + i * (innerW / data.length) + 1;
          const barH = Math.max(2, (d.sent / max) * innerH);
          const y = pad.top + innerH - barH;
          const showLabel = data.length <= 14 || i % Math.ceil(data.length / 14) === 0;
          const day = d.date.slice(5); // MM-DD
          return (
            <g key={d.date}>
              <rect
                x={x} y={y} width={barW} height={barH}
                fill={d.sent > 0 ? '#22c55e' : '#e5e7eb'}
                rx="2"
              />
              {d.sent > 0 && barH > 16 && (
                <text
                  x={x + barW / 2} y={y + barH / 2 + 4}
                  textAnchor="middle" fontSize="8" fill="white" fontWeight="600"
                >
                  {d.sent}
                </text>
              )}
              {showLabel && (
                <text
                  x={x + barW / 2} y={H - 4}
                  textAnchor="middle" fontSize="8" fill="#9ca3af"
                >
                  {day}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="text-xs text-gray-400 text-center mt-1">{label}</div>
    </div>
  );
}

// ── Success Rate Gauge (semi-circle SVG) ──────────────────────────────────────
function GaugeChart({ rate }: { rate: number }) {
  const r = 50;
  const cx = 70;
  const cy = 70;
  const circumference = Math.PI * r; // semi-circle
  const arc = (rate / 100) * circumference;
  const color = rate >= 80 ? '#22c55e' : rate >= 60 ? '#eab308' : '#ef4444';

  return (
    <svg viewBox="0 0 140 80" className="w-full max-w-[160px] mx-auto">
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round"
      />
      <path
        d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
        fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${arc} ${circumference}`}
      />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>
        {rate}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#6b7280">
        Success Rate
      </text>
    </svg>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    running:   'bg-yellow-100 text-yellow-700',
    failed:    'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
    scheduled: 'bg-blue-100 text-blue-700',
    draft:     'bg-gray-100 text-gray-500',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
}

// ══════════════════════════════════════════════════════════════════════════════
export default function QRBroadcastReportPage() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DayData[]>([]);
  const [templateUsage, setTemplateUsage] = useState<TemplateUsage[]>([]);
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [days, setDays] = useState(30);

  const loadStats = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await crmFetch(`/api/admin/crm/qr-broadcast-stats?days=${days}`);
      if (res?.success) {
        setOverview(res.data.overview);
        setDailyActivity(res.data.dailyActivity || []);
        setTemplateUsage(res.data.templateUsage || []);
        setRecentRuns(res.data.recentRuns || []);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [token, days]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-green-600" />
              QR Broadcast Reports
            </h1>
            <p className="text-sm text-gray-500 mt-1">Analytics for QR WhatsApp broadcasts</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              className="px-3 py-1.5 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button onClick={loadStats} disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={() => router.push('/admin/crm/qr/broadcast')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Broadcast
            </button>
          </div>
        </div>

        {loading && !overview ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Send className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-gray-500 font-medium">Total Runs</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{overview?.totalRuns ?? 0}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {overview?.completedRuns ?? 0} completed · {overview?.runningRuns ?? 0} active
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-500 font-medium">Total Messages</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{(overview?.totalMessages ?? 0).toLocaleString()}</div>
                <div className="text-xs text-gray-400 mt-1">across all QR broadcasts</div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-500 font-medium">Messages Sent</span>
                </div>
                <div className="text-2xl font-bold text-green-600">{(overview?.totalSent ?? 0).toLocaleString()}</div>
                <div className="text-xs text-red-400 mt-1">
                  {(overview?.totalFailed ?? 0).toLocaleString()} failed
                </div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-gray-500 font-medium">Success Rate</span>
                </div>
                <div className={`text-2xl font-bold ${
                  (overview?.successRate ?? 0) >= 80 ? 'text-green-600'
                  : (overview?.successRate ?? 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {overview?.successRate ?? 0}%
                </div>
                <div className="text-xs text-gray-400 mt-1">sent / (sent + failed)</div>
              </div>
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

              {/* Daily activity bar chart */}
              <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-green-500" />
                  Messages Sent Per Day
                </h3>
                {dailyActivity.length > 0 ? (
                  <BarChart
                    data={dailyActivity}
                    label={`Last ${days} days`}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">No message data yet.</div>
                )}
              </div>

              {/* Success rate gauge */}
              <div className="bg-white rounded-xl border shadow-sm p-5 flex flex-col">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  Delivery Rate
                </h3>
                <div className="flex-1 flex items-center justify-center">
                  <GaugeChart rate={overview?.successRate ?? 0} />
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                      Sent
                    </span>
                    <span className="font-semibold text-green-600">{overview?.totalSent ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
                      Failed
                    </span>
                    <span className="font-semibold text-red-500">{overview?.totalFailed ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" />
                      Pending
                    </span>
                    <span className="font-semibold text-gray-500">
                      {Math.max(0, (overview?.totalMessages ?? 0) - (overview?.totalSent ?? 0) - (overview?.totalFailed ?? 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Template usage + Recent runs ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Template usage */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Template Usage
                </h3>
                {templateUsage.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">No template data yet.</div>
                ) : (
                  <div className="space-y-3">
                    {templateUsage.map((t, i) => {
                      const maxSent = Math.max(...templateUsage.map(x => x.sent), 1);
                      const pct = Math.round((t.sent / maxSent) * 100);
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-700 truncate max-w-[60%]">{t.name}</span>
                            <span className="text-gray-500">{t.sent} sent · {t.runs} run{t.runs !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recent runs */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Recent Broadcasts
                </h3>
                {recentRuns.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No broadcasts yet.
                    <button
                      onClick={() => router.push('/admin/crm/qr/broadcast')}
                      className="block mx-auto mt-2 text-green-600 hover:underline"
                    >
                      Create your first →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentRuns.map(run => (
                      <div
                        key={run._id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                        onClick={() => router.push('/admin/crm/qr/broadcast-schedule')}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">{run.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{fmtDate(run.createdAt)}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <StatusBadge status={run.status} />
                          {run.stats && (
                            <div className="text-xs text-gray-400 mt-1">
                              {run.stats.sent}/{run.stats.total}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => router.push('/admin/crm/qr/broadcast-schedule')}
                      className="w-full text-center text-xs text-blue-600 hover:underline py-1"
                    >
                      View all broadcasts →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
