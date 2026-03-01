'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronLeft, Home, FileText, RefreshCw, Search,
  Phone, CheckCircle, XCircle, Clock, Loader2,
  BarChart3, DollarSign, Timer, Users, Megaphone,
  TrendingUp, ArrowUpRight, ArrowDownRight,
  Filter, X, Download, PhoneOutgoing, PhoneIncoming,
  Globe, User, Tag, Smile, Frown, Meh,
} from 'lucide-react';

/* ── Colors ── */
const COLORS = {
  indigo:  { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)' },
  emerald: { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)' },
  red:     { main: '#EF4444', light: '#F87171', bg: 'rgba(239,68,68,0.08)' },
  amber:   { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)' },
  blue:    { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)' },
  violet:  { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)' },
  pink:    { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)' },
  cyan:    { main: '#06B6D4', light: '#22D3EE', bg: 'rgba(6,182,212,0.08)' },
  orange:  { main: '#F97316', light: '#FB923C', bg: 'rgba(249,115,22,0.08)' },
  pageBg:  '#F8FAFC',
};

const PERIOD_TABS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
  { key: 'all',   label: 'All Time' },
];

const CHART_COLORS = ['#6366F1', '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#F97316', '#EF4444'];

interface Overview {
  totalCalls: number; completed: number; failed: number; active: number;
  totalDuration: number; avgDuration: number; totalCost: number; avgCost: number;
  outbound: number; inbound: number;
}

interface DailyChart { date: string; total: number; completed: number; failed: number; cost: number; }
interface ByLanguage { language: string; count: number; completed: number; successRate: number; cost: number; }
interface ByAdmin { admin: string; count: number; completed: number; failed: number; successRate: number; cost: number; }
interface ByPurpose { purpose: string; count: number; completed: number; successRate: number; cost: number; }
interface BySentiment { sentiment: string; count: number; }
interface ByHour { hour: number; label: string; count: number; }

interface CallRow {
  _id: string; leadId: string; phoneNumber: string; status: string;
  duration: number; cost: number; sentiment: string; summary: string;
  purpose: string; language: string; direction: string; initiatedBy: string;
  batchName: string; createdAt: string; callEndedReason: string; recordingUrl: string;
}

export default function CallReportsPage() {
  const router = useRouter();
  const token = useAuth();

  const [period, setPeriod] = useState('month');
  const [language, setLanguage] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [minCost, setMinCost] = useState('');
  const [maxCost, setMaxCost] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Data
  const [overview, setOverview] = useState<Overview | null>(null);
  const [chartDaily, setChartDaily] = useState<DailyChart[]>([]);
  const [byLanguage, setByLanguage] = useState<ByLanguage[]>([]);
  const [byAdmin, setByAdmin] = useState<ByAdmin[]>([]);
  const [byPurpose, setByPurpose] = useState<ByPurpose[]>([]);
  const [bySentiment, setBySentiment] = useState<BySentiment[]>([]);
  const [byHour, setByHour] = useState<ByHour[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);

  // Table sorting
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Active chart tab
  const [chartTab, setChartTab] = useState<'daily' | 'hourly' | 'language' | 'admin' | 'purpose' | 'sentiment'>('daily');

  const fetchReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (language) params.set('language', language);
      if (adminFilter) params.set('initiatedBy', adminFilter);
      if (minCost) params.set('minCost', minCost);
      if (maxCost) params.set('maxCost', maxCost);

      const res = await fetch(`/api/admin/crm/calls/reports?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const d = json.data;
        setOverview(d.overview);
        setChartDaily(d.chartDaily || []);
        setByLanguage(d.byLanguage || []);
        setByAdmin(d.byAdmin || []);
        setByPurpose(d.byPurpose || []);
        setBySentiment(d.bySentiment || []);
        setByHour(d.byHour || []);
        setCalls(d.calls || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, period, language, adminFilter, minCost, maxCost]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const fmtDuration = (sec: number) => {
    if (!sec) return '0s';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const fmtDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Filtered calls for search
  const filteredCalls = useMemo(() => {
    if (!searchQuery) return calls;
    const q = searchQuery.toLowerCase();
    return calls.filter(c =>
      c.phoneNumber?.includes(q) ||
      c.purpose?.toLowerCase().includes(q) ||
      c.summary?.toLowerCase().includes(q) ||
      c.initiatedBy?.toLowerCase().includes(q) ||
      c.batchName?.toLowerCase().includes(q) ||
      c.status?.toLowerCase().includes(q)
    );
  }, [calls, searchQuery]);

  // Sorted calls
  const sortedCalls = useMemo(() => {
    return [...filteredCalls].sort((a: any, b: any) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filteredCalls, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // Chart rendering helpers
  const maxDailyVal = useMemo(() => Math.max(1, ...chartDaily.map(d => d.total)), [chartDaily]);
  const maxHourlyVal = useMemo(() => Math.max(1, ...byHour.map(h => h.count)), [byHour]);

  // Extract unique admin users and languages for filter dropdowns
  const adminOptions = useMemo(() => byAdmin.map(a => a.admin).filter(Boolean), [byAdmin]);
  const langOptions = useMemo(() => byLanguage.map(l => l.language).filter(Boolean), [byLanguage]);

  const clearFilters = () => {
    setLanguage(''); setAdminFilter(''); setMinCost(''); setMaxCost(''); setSearchQuery('');
  };
  const hasFilters = language || adminFilter || minCost || maxCost || searchQuery;

  /* ── Render ── */
  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-violet-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">Loading Call Reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: COLORS.pageBg }}>
      {/* ═══ Header ═══ */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition text-gray-500"><ChevronLeft className="h-5 w-5" /></button>
            <Link href="/admin/crm" className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition text-gray-500" title="CRM Dashboard"><Home className="h-4.5 w-4.5" /></Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-violet-500" /> Call Reports & Analytics</h1>
              <p className="text-xs text-gray-400">Comprehensive AI call performance insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/crm/calls" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"><Phone className="h-4 w-4" /> Call Manager</Link>
            <Link href="/admin/crm/calls/broadcasts" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md transition" style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}><Megaphone className="h-4 w-4" /> Broadcasts</Link>
            <Link href="/admin/crm/calls/templates" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md transition" style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}><FileText className="h-4 w-4" /> Templates</Link>
            <button onClick={fetchReports} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-violet-50 text-violet-600 hover:bg-violet-100 transition"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
        </div>

        {/* Period Tabs + Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period */}
          <div className="flex items-center gap-1">
            {PERIOD_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setPeriod(t.key)}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium transition ${period === t.key ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                style={period === t.key ? { background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' } : undefined}
              >{t.label}</button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          {/* Language */}
          <select value={language} onChange={e => setLanguage(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none">
            <option value="">All Languages</option>
            {langOptions.map(l => <option key={l} value={l}>{l.includes('hi') ? 'Hindi' : l.includes('en') ? 'English' : l}</option>)}
          </select>

          {/* Admin */}
          <select value={adminFilter} onChange={e => setAdminFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none">
            <option value="">All Admins</option>
            {adminOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Cost range */}
          <div className="flex items-center gap-1 text-sm">
            <DollarSign className="h-3.5 w-3.5 text-gray-400" />
            <input type="number" value={minCost} onChange={e => setMinCost(e.target.value)} placeholder="Min" className="w-16 px-2 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-violet-200 outline-none" step="0.01" min="0" />
            <span className="text-gray-400">–</span>
            <input type="number" value={maxCost} onChange={e => setMaxCost(e.target.value)} placeholder="Max" className="w-16 px-2 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-violet-200 outline-none" step="0.01" min="0" />
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 transition"><X className="h-3.5 w-3.5" /> Clear</button>
          )}
        </div>
      </div>

      {/* ═══ Overview Cards ═══ */}
      {overview && (
        <div className="px-4 sm:px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {[
              { label: 'Total Calls', value: overview.totalCalls, icon: Phone, color: COLORS.indigo, sub: `${overview.outbound} out / ${overview.inbound} in` },
              { label: 'Completed', value: overview.completed, icon: CheckCircle, color: COLORS.emerald, sub: overview.totalCalls > 0 ? `${Math.round((overview.completed / overview.totalCalls) * 100)}% success` : '0%' },
              { label: 'Failed', value: overview.failed, icon: XCircle, color: COLORS.red, sub: overview.totalCalls > 0 ? `${Math.round((overview.failed / overview.totalCalls) * 100)}% fail rate` : '0%' },
              { label: 'Total Cost', value: `$${overview.totalCost.toFixed(2)}`, icon: DollarSign, color: COLORS.pink, sub: `Avg $${overview.avgCost.toFixed(2)}/call` },
              { label: 'Avg Duration', value: fmtDuration(overview.avgDuration), icon: Timer, color: COLORS.violet, sub: `Total: ${fmtDuration(overview.totalDuration)}` },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: c.color.bg }}>
                    <c.icon className="h-4 w-4" style={{ color: c.color.main }} />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{c.label}</span>
                </div>
                <div className="text-xl font-bold text-gray-900">{c.value}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{c.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Charts Section ═══ */}
      <div className="px-4 sm:px-6 pb-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Chart tabs */}
          <div className="flex items-center gap-1 px-5 pt-4 pb-2 border-b border-gray-50 overflow-x-auto">
            {[
              { key: 'daily', label: 'Daily Volume', icon: TrendingUp },
              { key: 'hourly', label: 'By Hour', icon: Clock },
              { key: 'language', label: 'By Language', icon: Globe },
              { key: 'admin', label: 'By Admin', icon: User },
              { key: 'purpose', label: 'By Purpose', icon: Tag },
              { key: 'sentiment', label: 'Sentiment', icon: Smile },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setChartTab(t.key as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap ${chartTab === t.key ? 'bg-violet-100 text-violet-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>

          {/* Chart area */}
          <div className="px-5 py-4 min-h-[220px]">
            {/* ── Daily Volume Bar Chart ── */}
            {chartTab === 'daily' && (
              <div>
                {chartDaily.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-400">No call data for this period.</div>
                ) : (
                  <div className="flex items-end gap-1 h-[180px] overflow-x-auto pb-6 relative">
                    {/* Y axis labels */}
                    <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] text-gray-400 w-8">
                      <span>{maxDailyVal}</span>
                      <span>{Math.round(maxDailyVal / 2)}</span>
                      <span>0</span>
                    </div>
                    <div className="flex items-end gap-1 ml-9 flex-1">
                      {chartDaily.map((d, i) => {
                        const h = (d.total / maxDailyVal) * 160;
                        const completedH = d.total > 0 ? (d.completed / d.total) * h : 0;
                        const failedH = d.total > 0 ? (d.failed / d.total) * h : 0;
                        const otherH = h - completedH - failedH;
                        return (
                          <div key={d.date} className="flex flex-col items-center flex-1 min-w-[20px] max-w-[40px] group relative">
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-lg">
                              <div className="font-semibold">{d.date}</div>
                              <div>Total: {d.total} | OK: {d.completed} | Fail: {d.failed}</div>
                              <div>Cost: ${d.cost.toFixed(2)}</div>
                            </div>
                            {/* Stacked bars */}
                            <div className="w-full flex flex-col rounded-t-sm overflow-hidden" style={{ height: `${Math.max(h, 1)}px` }}>
                              {otherH > 0 && <div style={{ height: `${otherH}px`, background: '#93C5FD' }} />}
                              {failedH > 0 && <div style={{ height: `${failedH}px`, background: '#FCA5A5' }} />}
                              {completedH > 0 && <div style={{ height: `${completedH}px`, background: '#6EE7B7' }} />}
                            </div>
                            {/* Label */}
                            <span className="text-[8px] text-gray-400 mt-1 rotate-[-45deg] origin-top-left whitespace-nowrap">{d.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#6EE7B7' }} /> Completed</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#FCA5A5' }} /> Failed</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#93C5FD' }} /> Active/Queued</span>
                </div>
              </div>
            )}

            {/* ── Hourly Distribution ── */}
            {chartTab === 'hourly' && (
              <div>
                <div className="flex items-end gap-0.5 h-[180px]">
                  {byHour.map(h => {
                    const barH = maxHourlyVal > 0 ? (h.count / maxHourlyVal) * 160 : 0;
                    return (
                      <div key={h.hour} className="flex flex-col items-center flex-1 group relative">
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1 rounded-lg z-10">{h.label}: {h.count} calls</div>
                        <div className="w-full rounded-t-sm transition-all" style={{ height: `${Math.max(barH, 1)}px`, background: `linear-gradient(to top, ${COLORS.violet.main}, ${COLORS.violet.light})`, opacity: h.count > 0 ? 1 : 0.15 }} />
                        <span className="text-[8px] text-gray-400 mt-1">{h.hour % 3 === 0 ? h.label.slice(0, 2) : ''}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center text-[10px] text-gray-400 mt-2">Hour of day (IST)</div>
              </div>
            )}

            {/* ── By Language ── */}
            {chartTab === 'language' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {byLanguage.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-sm text-gray-400">No language data.</div>
                ) : byLanguage.map((l, i) => {
                  const total = byLanguage.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? (l.count / total) * 100 : 0;
                  return (
                    <div key={l.language} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-violet-200 transition">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${CHART_COLORS[i % CHART_COLORS.length]}15` }}>
                        <Globe className="h-5 w-5" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-800">{l.language.includes('hi') ? 'Hindi' : l.language.includes('en') ? 'English' : l.language}</span>
                          <span className="text-sm font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{l.count}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                          <span>{l.successRate}% success</span>
                          <span>${l.cost.toFixed(2)} cost</span>
                          <span>{Math.round(pct)}% of total</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── By Admin ── */}
            {chartTab === 'admin' && (
              <div className="space-y-2">
                {byAdmin.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400">No admin data.</div>
                ) : byAdmin.map((a, i) => {
                  const maxCount = byAdmin[0]?.count || 1;
                  const pct = (a.count / maxCount) * 100;
                  return (
                    <div key={a.admin} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-violet-200 transition">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${CHART_COLORS[i % CHART_COLORS.length]}15` }}>
                        <User className="h-4 w-4" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-800 truncate">{a.admin}</span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-green-600 font-medium">{a.completed} ok</span>
                            <span className="text-red-500 font-medium">{a.failed} fail</span>
                            <span className="font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{a.count} total</span>
                          </div>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full flex">
                            <div style={{ width: `${a.count > 0 ? (a.completed / maxCount) * 100 : 0}%`, background: '#10B981' }} />
                            <div style={{ width: `${a.count > 0 ? (a.failed / maxCount) * 100 : 0}%`, background: '#EF4444' }} />
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                          <span>{a.successRate}% success</span>
                          <span>${a.cost.toFixed(2)} spent</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── By Purpose ── */}
            {chartTab === 'purpose' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {byPurpose.length === 0 ? (
                  <div className="col-span-3 text-center py-8 text-sm text-gray-400">No purpose data.</div>
                ) : byPurpose.map((p, i) => (
                  <div key={p.purpose} className="p-3 rounded-xl border border-gray-100 hover:border-violet-200 transition">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${CHART_COLORS[i % CHART_COLORS.length]}15` }}>
                        <Tag className="h-4 w-4" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{p.purpose}</div>
                        <div className="text-[10px] text-gray-400">{p.count} calls</div>
                      </div>
                      <span className="text-lg font-bold" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>{p.successRate}%</span>
                    </div>
                    {/* Mini donut (success rate bar) */}
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.successRate}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">${p.cost.toFixed(2)} cost</div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Sentiment ── */}
            {chartTab === 'sentiment' && (
              <div className="flex items-center justify-center gap-6 py-4">
                {bySentiment.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400">No sentiment data yet.</div>
                ) : bySentiment.map((s) => {
                  const Icon = s.sentiment === 'positive' ? Smile : s.sentiment === 'negative' ? Frown : Meh;
                  const color = s.sentiment === 'positive' ? '#10B981' : s.sentiment === 'negative' ? '#EF4444' : '#F59E0B';
                  const total = bySentiment.reduce((sum, x) => sum + x.count, 0);
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  return (
                    <div key={s.sentiment} className="text-center">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: `${color}15` }}>
                        <Icon className="h-8 w-8" style={{ color }} />
                      </div>
                      <div className="text-2xl font-bold" style={{ color }}>{s.count}</div>
                      <div className="text-xs text-gray-500 mt-0.5 capitalize">{s.sentiment}</div>
                      <div className="text-[10px] text-gray-400">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Calls Table ═══ */}
      <div className="px-4 sm:px-6 pb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Call Records</h3>
              <span className="text-xs text-gray-400">({filteredCalls.length} of {calls.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search calls..." className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs w-44 focus:ring-2 focus:ring-violet-200 outline-none" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50/50">
                  {[
                    { key: 'createdAt', label: 'Date' },
                    { key: 'phoneNumber', label: 'Phone' },
                    { key: 'direction', label: 'Dir' },
                    { key: 'status', label: 'Status' },
                    { key: 'duration', label: 'Duration' },
                    { key: 'cost', label: 'Cost' },
                    { key: 'sentiment', label: 'Sentiment' },
                    { key: 'purpose', label: 'Purpose' },
                    { key: 'language', label: 'Lang' },
                    { key: 'initiatedBy', label: 'Admin' },
                    { key: 'summary', label: 'Summary' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="text-left py-2.5 px-3 cursor-pointer hover:text-gray-600 transition select-none whitespace-nowrap"
                    >
                      {col.label}
                      {sortField === col.key && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCalls.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-12 text-sm text-gray-400">No calls found.</td></tr>
                )}
                {sortedCalls.slice(0, 100).map((call) => {
                  const statusColor = call.status === 'completed' ? '#10B981'
                    : ['failed', 'no_answer', 'busy', 'canceled'].includes(call.status) ? '#EF4444'
                    : ['queued', 'ringing', 'in_progress'].includes(call.status) ? '#3B82F6'
                    : '#6B7280';
                  return (
                    <tr key={call._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition text-xs">
                      <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">{fmtDate(call.createdAt)}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-700">{call.phoneNumber}</td>
                      <td className="py-2.5 px-3">
                        {call.direction === 'outbound'
                          ? <PhoneOutgoing className="h-3.5 w-3.5 text-blue-500" />
                          : <PhoneIncoming className="h-3.5 w-3.5 text-green-500" />
                        }
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${statusColor}15`, color: statusColor }}>{call.status}</span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-600">{fmtDuration(call.duration)}</td>
                      <td className="py-2.5 px-3 font-medium text-pink-600">${call.cost.toFixed(2)}</td>
                      <td className="py-2.5 px-3">
                        {call.sentiment ? (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${call.sentiment === 'positive' ? 'bg-green-50 text-green-600' : call.sentiment === 'negative' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>{call.sentiment}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 truncate max-w-[100px]">{call.purpose || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">{call.language?.includes('hi') ? 'HI' : 'EN'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-gray-500 truncate max-w-[100px]">{call.initiatedBy || '—'}</td>
                      <td className="py-2.5 px-3 text-gray-500 truncate max-w-[180px]">{call.summary || call.callEndedReason || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedCalls.length > 100 && (
            <div className="px-5 py-2 border-t border-gray-100 text-xs text-gray-400 text-center">Showing first 100 of {sortedCalls.length} results</div>
          )}
        </div>
      </div>
    </div>
  );
}
