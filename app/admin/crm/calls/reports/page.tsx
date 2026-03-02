'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronLeft, Home, FileText, RefreshCw, Search,
  Phone, CheckCircle, XCircle, Clock, Loader2,
  BarChart3, DollarSign, Timer, Users, Megaphone,
  TrendingUp,
  X, PhoneOutgoing, PhoneIncoming,
  Globe, User, Tag, Smile, Frown, Meh,
  AlertTriangle, MessageCircle,
  HelpCircle, CheckCheck, Eye, ChevronDown, ChevronRight,
  PhoneCall,
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
  noAnswer: number; busy: number;
  totalDuration: number; avgDuration: number; totalCost: number; avgCost: number;
  outbound: number; inbound: number;
  withQueries: number; answerCallsDone: number;
}

interface DailyChart { date: string; total: number; completed: number; failed: number; cost: number; }
interface ByLanguage { language: string; count: number; completed: number; successRate: number; cost: number; }
interface ByAdmin { admin: string; count: number; completed: number; failed: number; successRate: number; cost: number; }
interface ByPurpose { purpose: string; count: number; completed: number; successRate: number; cost: number; }
interface BySentiment { sentiment: string; count: number; }
interface ByHour { hour: number; label: string; count: number; }

interface CallRow {
  _id: string; leadId: string; leadName: string; leadPhone: string; leadStage: string;
  phoneNumber: string; status: string;
  duration: number; cost: number; sentiment: string; summary: string;
  purpose: string; language: string; direction: string; initiatedBy: string;
  batchName: string; createdAt: string; callEndedReason: string; recordingUrl: string;
  collectedData: Record<string, any>; questionsAsked: string; interested: string;
  transcript: string;
}

interface ActionableData {
  inbound: { count: number; calls: CallRow[] };
  outbound: { count: number; calls: CallRow[] };
  completed: { count: number; calls: CallRow[] };
  noAnswer: { count: number; calls: CallRow[] };
  failed: { count: number; calls: CallRow[] };
  newQueries: { count: number; calls: CallRow[] };
  answersDone: { count: number; calls: CallRow[] };
  pendingAnswers: { count: number; calls: CallRow[] };
  overdue: { count: number; calls: CallRow[] };
}

/* ── Status Badge ── */
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    completed: { color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
    failed: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    no_answer: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    busy: { color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
    canceled: { color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
    ringing: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    in_progress: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    queued: { color: '#06B6D4', bg: 'rgba(6,182,212,0.1)' },
  };
  const c = config[status] || config.canceled;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>
      {status.replace('_', ' ')}
    </span>
  );
}

/* ── Sentiment Badge ── */
function SentimentBadge({ sentiment }: { sentiment: string }) {
  if (!sentiment) return null;
  const config: Record<string, { icon: string; color: string; bg: string }> = {
    positive: { icon: '😊', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
    neutral: { icon: '😐', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    negative: { icon: '😞', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  };
  const c = config[sentiment] || config.neutral;
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: c.bg, color: c.color }}>
      {c.icon} {sentiment}
    </span>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type PhoneMissedIcon = typeof Phone;

const REPORT_CATEGORIES: Array<{
  key: string; label: string; icon: PhoneMissedIcon; color: typeof COLORS.indigo; desc: string;
}> = [
  { key: 'inbound', label: 'Inbound Calls', icon: PhoneIncoming, color: COLORS.emerald, desc: 'Calls received from leads' },
  { key: 'outbound', label: 'Outbound Calls', icon: PhoneOutgoing, color: COLORS.blue, desc: 'Calls made to leads' },
  { key: 'completed', label: 'Call Done', icon: CheckCircle, color: COLORS.emerald, desc: 'Successfully completed calls' },
  { key: 'noAnswer', label: 'Ringed Not Taken', icon: Phone, color: COLORS.amber, desc: 'Rang but no answer / ringing' },
  { key: 'failed', label: 'Failed Calls', icon: XCircle, color: COLORS.red, desc: 'Failed, busy, or canceled' },
  { key: 'newQueries', label: 'New Queries', icon: HelpCircle, color: COLORS.violet, desc: 'Questions asked by leads' },
  { key: 'answersDone', label: 'Answers Done', icon: CheckCheck, color: COLORS.cyan, desc: 'Answer-back calls completed' },
  { key: 'pendingAnswers', label: 'Pending Answers', icon: MessageCircle, color: COLORS.orange, desc: 'Queries not yet answered' },
  { key: 'overdue', label: 'Overdue Follow-up', icon: AlertTriangle, color: COLORS.red, desc: 'Failed/no-answer > 24h, no retry' },
];

type CategoryKey = string;

export default function CallReportsPage() {
  const router = useRouter();
  const token = useAuth();

  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);
  const [mainView, setMainView] = useState<'dashboard' | 'analytics'>('dashboard');

  // Analytics data
  const [overview, setOverview] = useState<Overview | null>(null);
  const [chartDaily, setChartDaily] = useState<DailyChart[]>([]);
  const [byLanguage, setByLanguage] = useState<ByLanguage[]>([]);
  const [byAdmin, setByAdmin] = useState<ByAdmin[]>([]);
  const [byPurpose, setByPurpose] = useState<ByPurpose[]>([]);
  const [bySentiment, setBySentiment] = useState<BySentiment[]>([]);
  const [byHour, setByHour] = useState<ByHour[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [chartTab, setChartTab] = useState<'daily' | 'hourly' | 'language' | 'admin' | 'purpose' | 'sentiment'>('daily');

  // Actionable data
  const [actionable, setActionable] = useState<ActionableData | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // ── Fetch based on view ──
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (language) params.set('language', language);
      if (adminFilter) params.set('initiatedBy', adminFilter);

      if (mainView === 'dashboard') {
        params.set('view', 'actionable');
        const res = await fetch(`/api/admin/crm/calls/reports?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setOverview(json.data.overview);
          setActionable(json.data.actionable);
        }
      } else {
        params.set('view', 'analytics');
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
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, period, language, adminFilter, mainView]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Action handlers ──
  const handleAction = async (action: string, callId: string, notes?: string) => {
    if (!token) return;
    setActionLoading(callId);
    try {
      const res = await fetch('/api/admin/crm/calls/reports', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, callId, notes }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) { console.error(e); }
    setActionLoading(null);
  };

  const handleCallBack = (phoneNumber: string, leadId: string) => {
    router.push(`/admin/crm/calls?action=call&phone=${encodeURIComponent(phoneNumber)}&leadId=${leadId}`);
  };

  const handleViewLead = (leadId: string) => {
    router.push(`/admin/crm?leadId=${leadId}`);
  };

  // ── Helpers ──
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

  const timeAgo = (d: string) => {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hrs > 48) return `${Math.floor(hrs / 24)}d ago`;
    if (hrs > 0) return `${hrs}h ${mins}m ago`;
    return `${mins}m ago`;
  };

  // Analytics search/sort for calls table
  const filteredCalls = useMemo(() => {
    if (!searchQuery) return calls;
    const q = searchQuery.toLowerCase();
    return calls.filter((c: any) =>
      c.phoneNumber?.includes(q) || c.purpose?.toLowerCase().includes(q) ||
      c.summary?.toLowerCase().includes(q) || c.status?.toLowerCase().includes(q)
    );
  }, [calls, searchQuery]);

  const sortedCalls = useMemo(() => {
    return [...filteredCalls].sort((a: any, b: any) => {
      const aVal = a[sortField]; const bVal = b[sortField];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      return sortDir === 'asc' ? String(aVal || '').localeCompare(String(bVal || '')) : String(bVal || '').localeCompare(String(aVal || ''));
    });
  }, [filteredCalls, sortField, sortDir]);

  const toggleSort = (f: string) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('desc'); }
  };

  const maxDailyVal = useMemo(() => Math.max(1, ...chartDaily.map(d => d.total)), [chartDaily]);
  const maxHourlyVal = useMemo(() => Math.max(1, ...byHour.map(h => h.count)), [byHour]);
  const adminOptions = useMemo(() => byAdmin.map(a => a.admin).filter(Boolean), [byAdmin]);
  const langOptions = useMemo(() => byLanguage.map(l => l.language).filter(Boolean), [byLanguage]);

  const clearFilters = () => { setLanguage(''); setAdminFilter(''); setSearchQuery(''); };
  const hasFilters = language || adminFilter || searchQuery;

  /* ── Loading ── */
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

  /* ── Render ── */
  return (
    <div className="min-h-screen" style={{ background: COLORS.pageBg }}>
      {/* Header */}
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
            <Link href="/admin/crm/calls" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"><Phone className="h-4 w-4" /> Calls</Link>
            <Link href="/admin/crm/calls/broadcasts" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md transition" style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}><Megaphone className="h-4 w-4" /> Broadcasts</Link>
            <Link href="/admin/crm/calls/templates" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md transition" style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}><FileText className="h-4 w-4" /> Templates</Link>
            <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-violet-50 text-violet-600 hover:bg-violet-100 transition"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
        </div>

        {/* View Toggle + Period Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-gray-100 rounded-xl p-0.5">
            <button
              onClick={() => setMainView('dashboard')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${mainView === 'dashboard' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >Dashboard</button>
            <button
              onClick={() => setMainView('analytics')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition ${mainView === 'analytics' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >Analytics</button>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          <div className="flex items-center gap-1">
            {PERIOD_TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setPeriod(t.key)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition ${period === t.key ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                style={period === t.key ? { background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' } : undefined}
              >{t.label}</button>
            ))}
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 transition"><X className="h-3.5 w-3.5" /> Clear</button>
          )}
        </div>
      </div>

      {/* Overview Stats Cards */}
      {overview && (
        <div className="px-4 sm:px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-3">
            {[
              { label: 'Total', value: overview.totalCalls, icon: Phone, color: COLORS.indigo },
              { label: 'Outbound', value: overview.outbound, icon: PhoneOutgoing, color: COLORS.blue },
              { label: 'Inbound', value: overview.inbound, icon: PhoneIncoming, color: COLORS.emerald },
              { label: 'Completed', value: overview.completed, icon: CheckCircle, color: COLORS.emerald },
              { label: 'Not Taken', value: overview.noAnswer || 0, icon: Phone, color: COLORS.amber },
              { label: 'Failed', value: overview.failed, icon: XCircle, color: COLORS.red },
              { label: 'Queries', value: overview.withQueries || 0, icon: HelpCircle, color: COLORS.violet },
              { label: 'Answered', value: overview.answerCallsDone || 0, icon: CheckCheck, color: COLORS.cyan },
              { label: 'Cost', value: `$${overview.totalCost.toFixed(2)}`, icon: DollarSign, color: COLORS.pink },
              { label: 'Avg Time', value: fmtDuration(overview.avgDuration), icon: Timer, color: COLORS.orange },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 px-3 py-2.5 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: c.color.bg }}>
                    <c.icon className="h-3.5 w-3.5" style={{ color: c.color.main }} />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">{c.label}</span>
                </div>
                <div className="text-lg font-bold text-gray-900">{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DASHBOARD VIEW */}
      {mainView === 'dashboard' && actionable && (
        <div className="px-4 sm:px-6 pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {REPORT_CATEGORIES.map(cat => {
              const data = actionable[cat.key as keyof ActionableData];
              if (!data) return null;
              const isExpanded = expandedCategory === cat.key;
              const isUrgent = cat.key === 'overdue' || cat.key === 'pendingAnswers';

              return (
                <div key={cat.key} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${isExpanded ? 'col-span-1 sm:col-span-2 lg:col-span-3 border-violet-200 shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'}`}>
                  {/* Category Header */}
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.key)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isUrgent && data.count > 0 ? 'animate-pulse' : ''}`} style={{ background: cat.color.bg }}>
                        <cat.icon className="h-5 w-5" style={{ color: cat.color.main }} />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-gray-900">{cat.label}</div>
                        <div className="text-[10px] text-gray-400">{cat.desc}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${data.count > 0 ? '' : 'text-gray-300'}`} style={{ color: data.count > 0 ? cat.color.main : undefined }}>{data.count}</span>
                      {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded Call List */}
                  {isExpanded && data.calls.length > 0 && (
                    <div className="border-t border-gray-100">
                      <div className="max-h-[600px] overflow-y-auto">
                        {data.calls.map(call => {
                          const isCallExpanded = expandedCallId === call._id;
                          const questions = call.questionsAsked ? call.questionsAsked.split(/[;\n]/).map((q: string) => q.trim()).filter(Boolean) : [];

                          return (
                            <div key={call._id} className={`border-b border-gray-50 last:border-b-0 ${isCallExpanded ? 'bg-violet-50/30' : 'hover:bg-gray-50/50'} transition`}>
                              {/* Call Row */}
                              <div className="flex items-center gap-3 px-5 py-3">
                                {/* Direction Icon */}
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: call.direction === 'inbound' ? COLORS.emerald.bg : COLORS.blue.bg }}>
                                  {call.direction === 'inbound'
                                    ? <PhoneIncoming className="h-4 w-4" style={{ color: COLORS.emerald.main }} />
                                    : <PhoneOutgoing className="h-4 w-4" style={{ color: COLORS.blue.main }} />
                                  }
                                </div>

                                {/* Main Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900">
                                      {call.leadName || call.phoneNumber}
                                    </span>
                                    {call.leadName && (
                                      <span className="text-[10px] font-mono text-gray-400">{call.phoneNumber}</span>
                                    )}
                                    {call.leadStage && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">{call.leadStage}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <StatusBadge status={call.status} />
                                    <span className="text-[10px] text-gray-400">{fmtDuration(call.duration)}</span>
                                    <span className="text-[10px] text-gray-400">{timeAgo(call.createdAt)}</span>
                                    {call.purpose && <span className="text-[10px] text-gray-400">• {call.purpose}</span>}
                                    {call.sentiment && <SentimentBadge sentiment={call.sentiment} />}
                                    {questions.length > 0 && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">{questions.length} Q</span>
                                    )}
                                    {call.interested && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${call.interested === 'Yes' ? 'bg-green-50 text-green-600' : call.interested === 'No' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {call.interested === 'Yes' ? 'Interested' : call.interested === 'No' ? 'Not Interested' : 'Maybe'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setExpandedCallId(isCallExpanded ? null : call._id); }}
                                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition" title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>

                                  {['noAnswer', 'failed', 'overdue', 'pendingAnswers'].includes(cat.key) && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleCallBack(call.phoneNumber, call.leadId); }}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition shadow-sm hover:shadow-md"
                                      style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}
                                    >
                                      <PhoneCall className="h-3.5 w-3.5" /> Call Back
                                    </button>
                                  )}

                                  {cat.key === 'pendingAnswers' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleAction('mark_answered', call._id); }}
                                      disabled={actionLoading === call._id}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition shadow-sm hover:shadow-md disabled:opacity-50"
                                      style={{ background: 'linear-gradient(135deg, #6366F1, #818CF8)' }}
                                    >
                                      {actionLoading === call._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />} Mark Done
                                    </button>
                                  )}

                                  {cat.key === 'overdue' && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleAction('mark_resolved', call._id); }}
                                      disabled={actionLoading === call._id}
                                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition disabled:opacity-50"
                                    >
                                      {actionLoading === call._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} Resolve
                                    </button>
                                  )}

                                  {call.leadId && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleViewLead(call.leadId); }}
                                      className="p-2 rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition" title="View Lead in CRM"
                                    >
                                      <User className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Expanded Details */}
                              {isCallExpanded && (
                                <div className="px-5 pb-4 pt-1 space-y-3">
                                  {call.summary && (
                                    <div className="bg-white rounded-xl p-3 border border-gray-100">
                                      <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Summary</div>
                                      <p className="text-sm text-gray-700">{call.summary}</p>
                                    </div>
                                  )}

                                  {questions.length > 0 && (
                                    <div className="bg-violet-50/50 rounded-xl p-3 border border-violet-100">
                                      <div className="text-[10px] font-semibold text-violet-500 uppercase mb-1.5">Questions Asked ({questions.length})</div>
                                      <ul className="space-y-1">
                                        {questions.map((q: string, i: number) => (
                                          <li key={i} className="flex items-start gap-2 text-sm text-violet-800">
                                            <HelpCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-violet-400" />
                                            {q}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                      { label: 'Date', value: fmtDate(call.createdAt) },
                                      { label: 'Direction', value: call.direction },
                                      { label: 'Duration', value: fmtDuration(call.duration) },
                                      { label: 'Cost', value: `$${call.cost.toFixed(2)}` },
                                      { label: 'Language', value: call.language || '—' },
                                      { label: 'Purpose', value: call.purpose || '—' },
                                      { label: 'End Reason', value: call.callEndedReason || '—' },
                                      { label: 'Admin', value: call.initiatedBy || '—' },
                                    ].map(d => (
                                      <div key={d.label} className="bg-white rounded-lg p-2 border border-gray-100">
                                        <div className="text-[9px] text-gray-400 font-medium">{d.label}</div>
                                        <div className="text-xs text-gray-700 font-medium truncate">{d.value}</div>
                                      </div>
                                    ))}
                                  </div>

                                  {call.transcript && (
                                    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                      <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Transcript</div>
                                      <pre className="text-xs text-gray-600 max-h-[200px] overflow-y-auto whitespace-pre-wrap font-sans">{call.transcript.slice(0, 1000)}{call.transcript.length > 1000 ? '...' : ''}</pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {data.count > data.calls.length && (
                        <div className="px-5 py-2 border-t border-gray-100 text-xs text-gray-400 text-center">
                          Showing {data.calls.length} of {data.count} calls
                        </div>
                      )}
                    </div>
                  )}

                  {isExpanded && data.calls.length === 0 && (
                    <div className="border-t border-gray-100 px-5 py-8 text-center text-sm text-gray-400">
                      No calls in this category for the selected period.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ANALYTICS VIEW */}
      {mainView === 'analytics' && (
        <>
          {/* Charts */}
          <div className="px-4 sm:px-6 pb-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-1 px-5 pt-4 pb-2 border-b border-gray-50 overflow-x-auto">
                {([
                  { key: 'daily' as const, label: 'Daily Volume', icon: TrendingUp },
                  { key: 'hourly' as const, label: 'By Hour', icon: Clock },
                  { key: 'language' as const, label: 'By Language', icon: Globe },
                  { key: 'admin' as const, label: 'By Admin', icon: User },
                  { key: 'purpose' as const, label: 'By Purpose', icon: Tag },
                  { key: 'sentiment' as const, label: 'Sentiment', icon: Smile },
                ]).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setChartTab(t.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition whitespace-nowrap ${chartTab === t.key ? 'bg-violet-100 text-violet-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                  ><t.icon className="h-3.5 w-3.5" /> {t.label}</button>
                ))}
              </div>

              <div className="px-5 py-4 min-h-[220px]">
                {/* Daily Volume */}
                {chartTab === 'daily' && (
                  <div>
                    {chartDaily.length === 0 ? (
                      <div className="text-center py-12 text-sm text-gray-400">No call data for this period.</div>
                    ) : (
                      <div className="flex items-end gap-1 h-[180px] overflow-x-auto pb-6 relative">
                        <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[9px] text-gray-400 w-8">
                          <span>{maxDailyVal}</span><span>{Math.round(maxDailyVal / 2)}</span><span>0</span>
                        </div>
                        <div className="flex items-end gap-1 ml-9 flex-1">
                          {chartDaily.map((d) => {
                            const h = (d.total / maxDailyVal) * 160;
                            const completedH = d.total > 0 ? (d.completed / d.total) * h : 0;
                            const failedH = d.total > 0 ? (d.failed / d.total) * h : 0;
                            const otherH = h - completedH - failedH;
                            return (
                              <div key={d.date} className="flex flex-col items-center flex-1 min-w-[20px] max-w-[40px] group relative">
                                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-[10px] px-2 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-lg">
                                  <div className="font-semibold">{d.date}</div>
                                  <div>Total: {d.total} | OK: {d.completed} | Fail: {d.failed}</div>
                                  <div>Cost: ${d.cost.toFixed(2)}</div>
                                </div>
                                <div className="w-full flex flex-col rounded-t-sm overflow-hidden" style={{ height: `${Math.max(h, 1)}px` }}>
                                  {otherH > 0 && <div style={{ height: `${otherH}px`, background: '#93C5FD' }} />}
                                  {failedH > 0 && <div style={{ height: `${failedH}px`, background: '#FCA5A5' }} />}
                                  {completedH > 0 && <div style={{ height: `${completedH}px`, background: '#6EE7B7' }} />}
                                </div>
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
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#93C5FD' }} /> Active</span>
                    </div>
                  </div>
                )}

                {/* Hourly */}
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

                {/* By Language */}
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
                              <span>{l.successRate}% success</span><span>${l.cost.toFixed(2)} cost</span><span>{Math.round(pct)}% of total</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* By Admin */}
                {chartTab === 'admin' && (
                  <div className="space-y-2">
                    {byAdmin.length === 0 ? (
                      <div className="text-center py-8 text-sm text-gray-400">No admin data.</div>
                    ) : byAdmin.map((a, i) => {
                      const maxCount = byAdmin[0]?.count || 1;
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
                              <span>{a.successRate}% success</span><span>${a.cost.toFixed(2)} spent</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* By Purpose */}
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
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${p.successRate}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">${p.cost.toFixed(2)} cost</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sentiment */}
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

          {/* Calls Table */}
          <div className="px-4 sm:px-6 pb-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900">Call Records</h3>
                  <span className="text-xs text-gray-400">({filteredCalls.length} of {calls.length})</span>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search calls..." className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs w-44 focus:ring-2 focus:ring-violet-200 outline-none" />
                </div>
              </div>

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
                        <th key={col.key} onClick={() => toggleSort(col.key)} className="text-left py-2.5 px-3 cursor-pointer hover:text-gray-600 transition select-none whitespace-nowrap">
                          {col.label}{sortField === col.key && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCalls.length === 0 && (
                      <tr><td colSpan={11} className="text-center py-12 text-sm text-gray-400">No calls found.</td></tr>
                    )}
                    {sortedCalls.slice(0, 100).map((call: any) => {
                      const statusColor = call.status === 'completed' ? '#10B981'
                        : ['failed', 'no_answer', 'busy', 'canceled'].includes(call.status) ? '#EF4444'
                        : ['queued', 'ringing', 'in_progress'].includes(call.status) ? '#3B82F6'
                        : '#6B7280';
                      return (
                        <tr key={call._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition text-xs">
                          <td className="py-2.5 px-3 text-gray-600 whitespace-nowrap">{fmtDate(call.createdAt)}</td>
                          <td className="py-2.5 px-3 font-mono text-gray-700">{call.phoneNumber}</td>
                          <td className="py-2.5 px-3">
                            {call.direction === 'outbound' ? <PhoneOutgoing className="h-3.5 w-3.5 text-blue-500" /> : <PhoneIncoming className="h-3.5 w-3.5 text-green-500" />}
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
        </>
      )}
    </div>
  );
}
