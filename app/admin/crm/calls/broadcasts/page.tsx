'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronLeft, Home, FileText, RefreshCw, Search,
  Megaphone, Phone, CheckCircle, XCircle, Clock,
  Loader2, ChevronDown, ChevronRight, X, Play,
  Eye, BarChart3, DollarSign, Timer, Users,
  AlertTriangle, Ban, CalendarClock, RotateCcw, Pencil, Trash2, Calendar,
} from 'lucide-react';
import ScheduleBroadcastModal from '@/components/admin/crm/ScheduleBroadcastModal';

/* ── Colors ── */
const COLORS = {
  indigo:  { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)' },
  emerald: { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)' },
  red:     { main: '#EF4444', light: '#F87171', bg: 'rgba(239,68,68,0.08)' },
  amber:   { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)' },
  blue:    { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)' },
  violet:  { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)' },
  pink:    { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)' },
  pageBg:  '#F8FAFC',
};

const STATUS_THEME: Record<string, { color: string; bg: string; label: string; Icon: any }> = {
  in_progress: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', label: 'In Progress', Icon: Loader2 },
  completed:   { color: '#10B981', bg: 'rgba(16,185,129,0.1)', label: 'Completed',   Icon: CheckCircle },
  partial:     { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'Partial',     Icon: AlertTriangle },
  failed:      { color: '#EF4444', bg: 'rgba(239,68,68,0.1)',  label: 'Failed',      Icon: XCircle },
};

const PERIOD_TABS = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
  { key: 'all',   label: 'All Time' },
];

interface Broadcast {
  batchName: string; totalCalls: number; completed: number; failed: number;
  active: number; totalDuration: number; totalCost: number; purpose: string;
  language: string; initiatedBy: string; retellBatchId: string;
  templateKey: string; scheduledAt: string | null; createdAt: string;
  lastCallAt: string; overallStatus: string;
}

interface Summary {
  totalBroadcasts: number; totalCalls: number; totalCompleted: number;
  totalFailed: number; totalActive: number; totalDuration: number; totalCost: number;
}

interface CallDetail {
  _id: string; leadId: string; phoneNumber: string; status: string;
  duration: number; sentiment: string; summary: string; transcript: string;
  recordingUrl: string; callEndedReason: string; purpose: string;
  language: string; startedAt: string; endedAt: string; createdAt: string;
  scheduledAt: string; cost: number;
}

interface DrillDown {
  batchName: string;
  calls: CallDetail[];
  summary: { total: number; completed: number; failed: number; active: number; totalDuration: number; totalCost: number };
}

export default function BroadcastsPage() {
  const router = useRouter();
  const token = useAuth();

  const [period, setPeriod] = useState('today');
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Drill-down
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);

  // Cancel
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Retry queued
  const [retrying, setRetrying] = useState<string | null>(null);

  // Edit / manage modal
  const [managingBroadcast, setManagingBroadcast] = useState<Broadcast | null>(null);
  const [newScheduleDate, setNewScheduleDate] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Schedule modal
  const [showSchedule, setShowSchedule] = useState(false);

  const fetchBroadcasts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/calls/broadcasts?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setBroadcasts(json.data?.broadcasts || []);
        setSummary(json.data?.summary || null);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [token, period]);

  useEffect(() => { fetchBroadcasts(); }, [token, period]);

  // Auto-refresh for in-progress
  useEffect(() => {
    const hasActive = broadcasts.some(b => b.overallStatus === 'in_progress');
    if (!hasActive) return;
    const interval = setInterval(fetchBroadcasts, 10000);
    return () => clearInterval(interval);
  }, [broadcasts, fetchBroadcasts]);

  const openDrillDown = async (batchName: string) => {
    if (!token) return;
    setDrillLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/calls/broadcasts/detail?batchName=${encodeURIComponent(batchName)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setDrillDown(json.data);
      }
    } catch (e) { console.error(e); }
    setDrillLoading(false);
  };

  const cancelBroadcast = async (batchName: string) => {
    if (!token) return;
    setCancelling(batchName);
    try {
      await fetch('/api/admin/crm/calls/broadcasts', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchName, action: 'cancel' }),
      });
      fetchBroadcasts();
      if (drillDown?.batchName === batchName) openDrillDown(batchName);
    } catch (e) { console.error(e); }
    setCancelling(null);
  };

  const retryBroadcast = async (batchName: string) => {
    if (!token) return;
    setRetrying(batchName);
    try {
      const res = await fetch(`/api/admin/crm/calls/scheduled-broadcasts/run?batchName=${encodeURIComponent(batchName)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      console.log('[retry]', json);
      setTimeout(() => {
        fetchBroadcasts();
        if (drillDown?.batchName === batchName) openDrillDown(batchName);
      }, 2000);
    } catch (e) { console.error(e); }
    setRetrying(null);
  };

  const rescheduleBroadcast = async (batchName: string, newScheduledAt: string) => {
    if (!token) return;
    setRescheduling(true);
    try {
      await fetch('/api/admin/crm/calls/broadcasts', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchName, action: 'reschedule', scheduledAt: newScheduledAt }),
      });
      setManagingBroadcast(null);
      fetchBroadcasts();
    } catch (e) { console.error(e); }
    setRescheduling(false);
  };

  const deleteBroadcast = async (batchName: string) => {
    if (!token) return;
    setDeleting(true);
    try {
      await fetch('/api/admin/crm/calls/broadcasts', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchName, action: 'delete' }),
      });
      setManagingBroadcast(null);
      fetchBroadcasts();
    } catch (e) { console.error(e); }
    setDeleting(false);
  };

  const filtered = broadcasts.filter(b =>
    !searchQuery || b.batchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.purpose?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.templateKey?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fmtDuration = (sec: number) => {
    if (!sec) return '0s';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  /* ── Render ── */
  if (loading && broadcasts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">Loading Broadcasts...</p>
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
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Megaphone className="h-5 w-5 text-indigo-500" /> Bulk Calling Broadcasts</h1>
              <p className="text-xs text-gray-400">Monitor and manage batch AI calls</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/crm/calls" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition"><Phone className="h-4 w-4" /> Call Manager</Link>
            <button
              onClick={() => setShowSchedule(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md transition"
              style={{ background: 'linear-gradient(135deg, #6366F1, #10B981)' }}
            >
              <CalendarClock className="h-4 w-4" /> Schedule
            </button>
            <Link href="/admin/crm/calls/templates" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md transition" style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}><FileText className="h-4 w-4" /> Templates</Link>
            <Link href="/admin/crm/calls/reports" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white shadow-sm hover:shadow-md transition" style={{ background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' }}><BarChart3 className="h-4 w-4" /> Reports</Link>
            <button onClick={fetchBroadcasts} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="flex items-center gap-1">
          {PERIOD_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${period === t.key ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
              style={period === t.key ? { background: 'linear-gradient(135deg, #6366F1, #818CF8)' } : undefined}
            >{t.label}</button>
          ))}
          <div className="ml-auto relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search broadcasts..." className="pl-8 pr-3 py-2 rounded-xl border border-gray-200 text-sm w-52 focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none" />
          </div>
        </div>
      </div>

      {/* ═══ Summary Cards ═══ */}
      {summary && (
        <div className="px-4 sm:px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Broadcasts', value: summary.totalBroadcasts, icon: Megaphone, color: COLORS.indigo },
              { label: 'Total Calls', value: summary.totalCalls, icon: Phone, color: COLORS.blue },
              { label: 'Completed', value: summary.totalCompleted, icon: CheckCircle, color: COLORS.emerald },
              { label: 'Failed', value: summary.totalFailed, icon: XCircle, color: COLORS.red },
              { label: 'Active', value: summary.totalActive, icon: Loader2, color: COLORS.amber },
              { label: 'Duration', value: fmtDuration(summary.totalDuration), icon: Timer, color: COLORS.violet },
              { label: 'Total Cost', value: `$${summary.totalCost.toFixed(2)}`, icon: DollarSign, color: COLORS.pink },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-100 px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: c.color.bg }}>
                    <c.icon className="h-4 w-4" style={{ color: c.color.main }} />
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{c.label}</span>
                </div>
                <div className="text-xl font-bold text-gray-900">{c.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Broadcast List ═══ */}
      <div className="px-4 sm:px-6 pb-6">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
            <Megaphone className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No broadcasts found for this period.</p>
            <p className="text-xs mt-1">Start a bulk call from the Call Manager page.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(b => {
              const theme = STATUS_THEME[b.overallStatus] || STATUS_THEME.completed;
              const completedPct = b.totalCalls > 0 ? (b.completed / b.totalCalls) * 100 : 0;
              const failedPct = b.totalCalls > 0 ? (b.failed / b.totalCalls) * 100 : 0;
              const activePct = b.totalCalls > 0 ? (b.active / b.totalCalls) * 100 : 0;
              const isActive = b.overallStatus === 'in_progress';

              return (
                <div
                  key={b.batchName}
                  className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all ${isActive ? 'border-indigo-200' : 'border-gray-100'}`}
                  style={isActive ? { background: 'linear-gradient(90deg, rgba(59,130,246,0.03), white)' } : undefined}
                >
                  {/* Top row */}
                  <div className="px-5 py-4 flex items-start gap-4">
                    {/* Status icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: theme.bg }}>
                      <theme.Icon className={`h-5 w-5 ${isActive ? 'animate-spin' : ''}`} style={{ color: theme.color }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-bold text-gray-900 truncate max-w-[350px]">{b.batchName}</h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: theme.bg, color: theme.color }}>{theme.label}</span>
                        {b.language && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-600">{b.language === 'hi-IN' || b.language === 'hi' ? 'Hindi' : 'English'}</span>}
                        {b.purpose && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">{b.purpose}</span>}
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {b.totalCalls} calls</span>
                        <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" /> {b.completed}</span>
                        <span className="flex items-center gap-1 text-red-500"><XCircle className="h-3 w-3" /> {b.failed}</span>
                        {b.active > 0 && <span className="flex items-center gap-1 text-indigo-500"><Clock className="h-3 w-3" /> {b.active} active</span>}
                        <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {fmtDuration(b.totalDuration)}</span>
                        <span className="flex items-center gap-1 text-pink-600"><DollarSign className="h-3 w-3" /> ${b.totalCost.toFixed(2)}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                        {completedPct > 0 && (
                          <div className="h-full transition-all duration-500" style={{ width: `${completedPct}%`, background: 'linear-gradient(90deg, #10B981, #34D399)' }} />
                        )}
                        {failedPct > 0 && (
                          <div className="h-full transition-all duration-500" style={{ width: `${failedPct}%`, background: 'linear-gradient(90deg, #EF4444, #F87171)' }} />
                        )}
                        {activePct > 0 && (
                          <div className="h-full transition-all duration-500 animate-pulse" style={{ width: `${activePct}%`, background: 'linear-gradient(90deg, #3B82F6, #60A5FA)' }} />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Completed {Math.round(completedPct)}%</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Failed {Math.round(failedPct)}%</span>
                        {activePct > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500" /> Active {Math.round(activePct)}%</span>}
                        <span className="ml-auto">{fmtDate(b.createdAt)}</span>
                        {b.initiatedBy && <span>by {b.initiatedBy}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => openDrillDown(b.batchName)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition">
                        <Eye className="h-3.5 w-3.5" /> Details
                      </button>
                      {isActive && (
                        <>
                          <button
                            onClick={() => { setManagingBroadcast(b); setNewScheduleDate(''); setNewScheduleTime(''); }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-violet-50 text-violet-600 hover:bg-violet-100 transition"
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            onClick={() => retryBroadcast(b.batchName)}
                            disabled={retrying === b.batchName}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-600 hover:bg-amber-100 transition disabled:opacity-50"
                          >
                            {retrying === b.batchName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Retry
                          </button>
                          <button
                            onClick={() => cancelBroadcast(b.batchName)}
                            disabled={cancelling === b.batchName}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                          >
                            {cancelling === b.batchName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ Manage Broadcast Modal ═══ */}
      {managingBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2"><Pencil className="h-4 w-4" /> Manage Broadcast</h2>
                <p className="text-xs text-white/70 truncate max-w-[260px] mt-0.5">{managingBroadcast.batchName}</p>
              </div>
              <button onClick={() => setManagingBroadcast(null)} className="p-1.5 rounded-lg hover:bg-white/20 transition"><X className="h-5 w-5 text-white" /></button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Current scheduled time */}
              {managingBroadcast.scheduledAt && (
                <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100 text-xs">
                  <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                  <span className="text-indigo-700 font-medium">Scheduled: {new Date(managingBroadcast.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}

              {/* Reschedule */}
              <div className="rounded-xl border border-gray-100 p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" /> Reschedule</p>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={newScheduleDate} onChange={e => setNewScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none" />
                  <input type="time" value={newScheduleTime} onChange={e => setNewScheduleTime(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none" />
                </div>
                <button
                  onClick={() => newScheduleDate && newScheduleTime && rescheduleBroadcast(managingBroadcast.batchName, new Date(`${newScheduleDate}T${newScheduleTime}`).toISOString())}
                  disabled={rescheduling || !newScheduleDate || !newScheduleTime}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #6366F1)' }}
                >
                  {rescheduling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
                  {rescheduling ? 'Saving...' : 'Save New Schedule'}
                </button>
              </div>

              {/* Fire now */}
              <button
                onClick={() => { retryBroadcast(managingBroadcast.batchName); setManagingBroadcast(null); }}
                disabled={retrying === managingBroadcast.batchName}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Fire Calls Now
              </button>

              {/* Cancel pending */}
              <button
                onClick={() => { cancelBroadcast(managingBroadcast.batchName); setManagingBroadcast(null); }}
                disabled={cancelling === managingBroadcast.batchName}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-700 border-2 border-amber-200 hover:bg-amber-50 transition disabled:opacity-50"
              >
                <Ban className="h-3.5 w-3.5" /> Cancel Pending Calls
              </button>

              {/* Delete broadcast */}
              <button
                onClick={() => deleteBroadcast(managingBroadcast.batchName)}
                disabled={deleting}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 border-2 border-red-100 hover:bg-red-50 transition disabled:opacity-50"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {deleting ? 'Deleting...' : 'Delete Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Schedule Broadcast Modal ═══ */}
      {showSchedule && token && (
        <ScheduleBroadcastModal
          token={token}
          onClose={() => setShowSchedule(false)}
          onComplete={fetchBroadcasts}
        />
      )}

      {/* ═══ Drill-Down Modal ═══ */}
      {(drillDown || drillLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Broadcast Details</h2>
                <p className="text-sm text-gray-500 truncate max-w-[500px]">{drillDown?.batchName || 'Loading...'}</p>
              </div>
              <button onClick={() => setDrillDown(null)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            {drillLoading ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : drillDown ? (
              <>
                {/* Summary stats */}
                <div className="px-6 py-3 border-b border-gray-50 grid grid-cols-6 gap-3">
                  {[
                    { label: 'Total', value: drillDown.summary.total, color: '#6366F1' },
                    { label: 'Completed', value: drillDown.summary.completed, color: '#10B981' },
                    { label: 'Failed', value: drillDown.summary.failed, color: '#EF4444' },
                    { label: 'Active', value: drillDown.summary.active, color: '#3B82F6' },
                    { label: 'Duration', value: fmtDuration(drillDown.summary.totalDuration), color: '#8B5CF6' },
                    { label: 'Cost', value: `$${drillDown.summary.totalCost.toFixed(2)}`, color: '#EC4899' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[10px] text-gray-400 font-medium uppercase">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                {drillDown.summary.total > 0 && (
                  <div className="px-6 py-2">
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="h-full" style={{ width: `${(drillDown.summary.completed / drillDown.summary.total) * 100}%`, background: '#10B981' }} />
                      <div className="h-full" style={{ width: `${(drillDown.summary.failed / drillDown.summary.total) * 100}%`, background: '#EF4444' }} />
                      <div className="h-full animate-pulse" style={{ width: `${(drillDown.summary.active / drillDown.summary.total) * 100}%`, background: '#3B82F6' }} />
                    </div>
                  </div>
                )}

                {/* Calls table */}
                <div className="flex-1 overflow-auto px-6 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="text-left py-2 pr-3">#</th>
                        <th className="text-left py-2 pr-3">Phone</th>
                        <th className="text-left py-2 pr-3">Status</th>
                        <th className="text-left py-2 pr-3">Duration</th>
                        <th className="text-left py-2 pr-3">Sentiment</th>
                        <th className="text-left py-2 pr-3">Cost</th>
                        <th className="text-left py-2">Summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drillDown.calls.map((call, idx) => {
                        const statusColor = call.status === 'completed' ? '#10B981'
                          : ['failed', 'no_answer', 'busy', 'canceled'].includes(call.status) ? '#EF4444'
                          : ['queued', 'ringing', 'in_progress'].includes(call.status) ? '#3B82F6'
                          : '#6B7280';
                        return (
                          <tr key={call._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                            <td className="py-2.5 pr-3 text-gray-400 text-xs">{idx + 1}</td>
                            <td className="py-2.5 pr-3 font-mono text-xs text-gray-700">{call.phoneNumber}</td>
                            <td className="py-2.5 pr-3">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${statusColor}15`, color: statusColor }}>{call.status}</span>
                            </td>
                            <td className="py-2.5 pr-3 text-xs text-gray-600">{fmtDuration(call.duration)}</td>
                            <td className="py-2.5 pr-3">
                              {call.sentiment ? (
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${call.sentiment === 'positive' ? 'bg-green-50 text-green-600' : call.sentiment === 'negative' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'}`}>{call.sentiment}</span>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="py-2.5 pr-3 text-xs font-medium text-pink-600">${call.cost.toFixed(2)}</td>
                            <td className="py-2.5 text-xs text-gray-500 truncate max-w-[200px]">{call.summary || call.callEndedReason || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {drillDown.calls.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-400">No call records found for this broadcast.</div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
