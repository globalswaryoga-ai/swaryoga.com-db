'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';

type DeletedLead = {
  _id: string;
  leadId: string;
  leadNumber?: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  workshopName?: string;
  assignedToUserId?: string;
  deletedByUserId?: string;
  deletedAt?: string;
  deletedReason?: string;
};

type AdminUserOption = {
  userId: string;
  email?: string;
};

const REASON_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  meta_blocked:    { label: 'Meta Blocked',    color: 'text-red-300',    bg: 'bg-red-500/15 border border-red-500/30',    dot: 'bg-red-400' },
  delivery_failed: { label: 'Delivery Failed', color: 'text-orange-300', bg: 'bg-orange-500/15 border border-orange-500/30', dot: 'bg-orange-400' },
  bulk:            { label: 'Bulk Delete',     color: 'text-amber-300',  bg: 'bg-amber-500/15 border border-amber-500/30',  dot: 'bg-amber-400' },
  manual:          { label: 'Manual',          color: 'text-slate-400',  bg: 'bg-slate-500/15 border border-slate-500/30',  dot: 'bg-slate-400' },
};

function ReasonBadge({ reason }: { reason?: string }) {
  const key = reason || 'manual';
  const cfg = REASON_CONFIG[key] || { label: key, color: 'text-slate-400', bg: 'bg-slate-500/15 border border-slate-500/30', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function formatIST(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function DeletedLeadsPage() {
  const router = useRouter();
  const token = useAuth();

  const [rows, setRows] = useState<DeletedLead[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userFilter, setUserFilter] = useState('');
  const [userOptions, setUserOptions] = useState<AdminUserOption[]>([]);
  const [q, setQ] = useState('');
  const [reasonFilter, setReasonFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setIsSuperAdmin(checkIsSuperAdmin());
  }, []);

  useEffect(() => {
    if (!token || !isSuperAdmin) return;
    fetch('/api/admin/auth/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setUserOptions((Array.isArray(data?.data) ? data.data : []).map((x: any) => ({
          userId: String(x?.userId || '').trim(),
          email: x?.email || undefined,
        })).filter((u: AdminUserOption) => u.userId));
      }).catch(() => {});
  }, [token, isSuperAdmin]);

  const fetchDeleted = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = { limit, skip };
      if (q.trim()) params.q = q.trim();
      if (reasonFilter) params.reason = reasonFilter;
      if (isSuperAdmin && userFilter) params.userId = userFilter;

      const res = await fetch('/api/admin/crm/leads/deleted?' + new URLSearchParams(params), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      setRows(Array.isArray(data?.data?.deletedLeads) ? data.data.deletedLeads : []);
      setTotal(Number(data?.data?.total || 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deleted leads');
    } finally {
      setLoading(false);
    }
  }, [token, limit, skip, q, reasonFilter, isSuperAdmin, userFilter]);

  useEffect(() => { if (token) fetchDeleted(); }, [token, fetchDeleted]);

  const handleRestore = async (row: DeletedLead) => {
    if (!token) return;
    setRestoring(row._id);
    setRestoreMsg(null);
    try {
      const res = await fetch(`/api/admin/crm/leads/${row.leadId}/restore`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');
      setRestoreMsg({ type: 'ok', text: data.message || 'Lead restored successfully!' });
      fetchDeleted();
    } catch (err) {
      setRestoreMsg({ type: 'err', text: err instanceof Error ? err.message : 'Restore failed' });
    } finally {
      setRestoring(null);
    }
  };

  // Stats from current page
  const statsByReason = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.deletedReason || 'manual';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  const canPrev = skip > 0;
  const canNext = skip + limit < total;

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Deleted Leads</h1>
            <p className="text-slate-400 text-sm mt-1">
              All deleted leads auto-archived here — Meta blocked numbers transferred automatically
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/crm/leads')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
          >
            ← Back to Leads
          </button>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{total}</div>
            <div className="text-slate-400 text-xs mt-1">Total Archived</div>
          </div>
          <div className="bg-red-950/40 border border-red-500/20 rounded-xl p-4">
            <div className="text-2xl font-bold text-red-400">{statsByReason['meta_blocked'] || 0}</div>
            <div className="text-slate-400 text-xs mt-1">Meta Blocked</div>
          </div>
          <div className="bg-orange-950/40 border border-orange-500/20 rounded-xl p-4">
            <div className="text-2xl font-bold text-orange-400">{statsByReason['delivery_failed'] || 0}</div>
            <div className="text-slate-400 text-xs mt-1">Delivery Failed</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-2xl font-bold text-slate-300">{statsByReason['manual'] || 0}</div>
            <div className="text-slate-400 text-xs mt-1">Manual Delete</div>
          </div>
        </div>

        {/* ── ALERTS ── */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-950/50 border border-red-500/30 rounded-xl text-red-300 text-sm">
            <span className="text-red-400">⚠</span> {error}
            <button onClick={() => setError(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>
        )}
        {restoreMsg && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${restoreMsg.type === 'ok' ? 'bg-emerald-950/50 border border-emerald-500/30 text-emerald-300' : 'bg-red-950/50 border border-red-500/30 text-red-300'}`}>
            <span>{restoreMsg.type === 'ok' ? '✅' : '❌'}</span>
            {restoreMsg.text}
            <button onClick={() => setRestoreMsg(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* ── FILTERS ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setSkip(0); }}
              placeholder="Search name / phone / email..."
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
            <select
              value={reasonFilter}
              onChange={e => { setReasonFilter(e.target.value); setSkip(0); }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="">All Reasons</option>
              <option value="meta_blocked">Meta Blocked</option>
              <option value="delivery_failed">Delivery Failed</option>
              <option value="bulk">Bulk Delete</option>
              <option value="manual">Manual</option>
            </select>
            {isSuperAdmin && (
              <select
                value={userFilter}
                onChange={e => { setUserFilter(e.target.value); setSkip(0); }}
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">All Users</option>
                {userOptions.map(u => (
                  <option key={u.userId} value={u.userId}>{u.userId}{u.email ? ` (${u.email})` : ''}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => fetchDeleted()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500">
              <div className="text-3xl mb-2">🗂</div>
              <div className="text-sm">No deleted leads found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/50">
                    {['Lead ID', 'Name', 'Phone', 'Email', 'Workshop', 'User', 'Deleted By', 'Reason', 'Deleted At', 'Action'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rows.map((row, i) => (
                    <tr key={row._id} className={`hover:bg-slate-800/40 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-800/20'}`}>
                      <td className="px-4 py-3 font-mono text-purple-400 text-xs whitespace-nowrap">{row.leadNumber || '—'}</td>
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{row.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs whitespace-nowrap">{row.phoneNumber || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[140px]">{row.email || '—'}</td>
                      <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">{row.workshopName || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{row.assignedToUserId || '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {row.deletedByUserId === 'system'
                          ? <span className="text-amber-400 font-medium">auto</span>
                          : (row.deletedByUserId || '—')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><ReasonBadge reason={row.deletedReason} /></td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{formatIST(row.deletedAt)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleRestore(row)}
                          disabled={restoring === row._id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 transition-colors disabled:opacity-40"
                        >
                          {restoring === row._id ? (
                            <span className="animate-spin">↻</span>
                          ) : '↩'} Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* pagination */}
          {!loading && rows.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-sm text-slate-400">
              <span>Showing {skip + 1}–{Math.min(total, skip + limit)} of {total}</span>
              <div className="flex gap-2">
                <button
                  disabled={!canPrev}
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition-colors"
                >← Prev</button>
                <button
                  disabled={!canNext}
                  onClick={() => setSkip(skip + limit)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 transition-colors"
                >Next →</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
