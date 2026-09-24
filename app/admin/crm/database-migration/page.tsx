'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Database, RefreshCw, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type TaskStatus = 'completed' | 'in-progress' | 'pending' | 'blocked';
type Task = { id: string; title: string; status: TaskStatus };
type Phase = { id: string; title: string; tasks: Task[] };
type Report = {
  generatedAt: string;
  refreshAfterSeconds: number;
  target: string;
  legacyMongoRuntime: string;
  health: { bunnyConfigured: boolean; bunnyReachable: boolean; migrationTablePresent: boolean; bunnyError?: string };
  summary: { total: number; completed: number; active: number; blocked: number; pending: number; percentage: number };
  phases: Phase[];
};

const statusMeta: Record<TaskStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  completed: { label: 'Verified', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  'in-progress': { label: 'In progress', className: 'bg-blue-100 text-blue-700', icon: Activity },
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600', icon: Clock3 },
  blocked: { label: 'Needs reconciliation', className: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
};

export default function DatabaseMigrationPage() {
  const token = useAuth();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/admin/crm/database-migration', { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load migration progress');
      setReport(payload.data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load migration progress');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const interval = setInterval(() => { void load(); }, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const progressColor = useMemo(() => {
    if (!report) return 'bg-slate-300';
    if (report.summary.blocked > 0) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [report]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-lg">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-emerald-300"><Database className="h-5 w-5" /> Database migration control center</div>
              <h1 className="text-2xl font-bold md:text-3xl">MongoDB → Bunny SQL + Bunny Storage</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">Live, read-only progress for the safe cutover. Existing data is preserved while each module is reconciled.</p>
            </div>
            <button onClick={() => { setLoading(true); void load(); }} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh now
            </button>
          </div>
        </header>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {loading && !report && <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">Loading live migration status…</div>}

        {report && <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm md:col-span-2">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-700"><span>Overall verified progress</span><span className="text-2xl text-emerald-600">{report.summary.percentage}%</span></div>
              <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all duration-700 ${progressColor}`} style={{ width: `${report.summary.percentage}%` }} /></div>
              <div className="mt-3 text-xs text-slate-500">{report.summary.completed} verified · {report.summary.active} active · {report.summary.pending} pending · {report.summary.blocked} blocked</div>
            </div>
            <div className={`rounded-2xl p-5 shadow-sm ${report.health.bunnyReachable ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="text-sm font-semibold text-slate-700">Bunny SQL</div>
              <div className={`mt-2 text-lg font-bold ${report.health.bunnyReachable ? 'text-emerald-700' : 'text-red-700'}`}>{report.health.bunnyReachable ? 'Connected' : 'Unavailable'}</div>
              <div className="mt-1 text-xs text-slate-500">{report.health.migrationTablePresent ? 'Migration ledger detected' : 'Migration ledger still required'}</div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-800"><ShieldAlert className="h-4 w-4" /> Safety state</div>
              <div className="mt-2 text-sm font-bold text-amber-700">MongoDB retained temporarily</div>
              <div className="mt-1 text-xs text-amber-800/70">No legacy data is deleted during this phase.</div>
            </div>
          </section>

          <section className="space-y-4">
            {report.phases.map((phase) => {
              const done = phase.tasks.filter((task) => task.status === 'completed').length;
              const phasePercent = Math.round((done / phase.tasks.length) * 100);
              return <article key={phase.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><div><h2 className="font-bold text-slate-800">{phase.title}</h2><p className="text-xs text-slate-500">{done} of {phase.tasks.length} tasks verified</p></div><div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${phasePercent}%` }} /></div></div>
                <div className="mt-4 divide-y divide-slate-100">{phase.tasks.map((task) => { const meta = statusMeta[task.status]; const Icon = meta.icon; return <div key={task.id} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-center gap-3"><Icon className={`h-4 w-4 flex-shrink-0 ${task.status === 'completed' ? 'text-emerald-500' : task.status === 'blocked' ? 'text-amber-500' : 'text-slate-400'}`} /><span className="text-sm text-slate-700">{task.title}</span></div><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>{meta.label}</span></div>; })}</div>
              </article>;
            })}
          </section>
          <p className="text-center text-xs text-slate-400">Last updated {new Date(report.generatedAt).toLocaleString()} · automatically refreshes every {report.refreshAfterSeconds} seconds</p>
        </>}
      </div>
    </main>
  );
}
