'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import {
  DataTable,
  PageHeader,
  LoadingSpinner,
  AlertBox,
} from '@/components/admin/crm';

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
};

type AdminUserOption = {
  userId: string;
  email?: string;
  permissions?: string[];
};

export default function DeletedLeadsPage() {
  const router = useRouter();
  const token = useAuth();

  const [rows, setRows] = useState<DeletedLead[]>([]);
  const [total, setTotal] = useState(0);
  const [limit] = useState(50);
  const [skip, setSkip] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userFilter, setUserFilter] = useState<string>('');
  const [userOptions, setUserOptions] = useState<AdminUserOption[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    if (!userStr) {
      setIsSuperAdmin(false);
      return;
    }
    try {
      const u = JSON.parse(userStr);
      const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      setIsSuperAdmin(checkIsSuperAdmin());
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);

  useEffect(() => {
    // For super-admin, load users list for filter.
    const loadUsers = async () => {
      if (!token || !isSuperAdmin) return;
      try {
        const response = await fetch('/api/admin/auth/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const users = Array.isArray(data?.data) ? data.data : [];
        setUserOptions(
          users
            .map((x: any) => ({
              userId: String(x?.userId || '').trim(),
              email: x?.email ? String(x.email) : undefined,
              permissions: Array.isArray(x?.permissions) ? x.permissions : undefined,
            }))
            .filter((u: AdminUserOption) => Boolean(u.userId))
        );
      } catch {
        // ignore
      }
    };
    loadUsers();
  }, [token, isSuperAdmin]);

  const fetchDeleted = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, any> = { limit, skip };
      if (q.trim()) params.q = q.trim();
      if (isSuperAdmin && userFilter) params.userId = userFilter;

      const response = await fetch('/api/admin/crm/leads/deleted?' + new URLSearchParams(params), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load deleted leads');

      setRows(Array.isArray(data?.data?.deletedLeads) ? data.data.deletedLeads : []);
      setTotal(Number(data?.data?.total || 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deleted leads');
    } finally {
      setLoading(false);
    }
  }, [token, limit, skip, q, isSuperAdmin, userFilter]);

  useEffect(() => {
    if (!token) return;
    fetchDeleted();
  }, [token, router, fetchDeleted]);

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
      setRestoreMsg(`✅ ${data.message || 'Lead restored successfully!'}`);
      fetchDeleted();
    } catch (err) {
      setRestoreMsg(`❌ ${err instanceof Error ? err.message : 'Restore failed'}`);
    } finally {
      setRestoring(null);
    }
  };

  const columns = [
    { key: 'leadNumber', label: 'Lead ID', render: (v: any) => <span className="font-mono text-purple-100">{v || '-'}</span> },
    { key: 'name', label: 'Name' },
    { key: 'phoneNumber', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'workshopName', label: 'Workshop' },
    { key: 'assignedToUserId', label: 'User', render: (v: any) => <span className="text-purple-100">{v || '-'}</span> },
    { key: 'deletedByUserId', label: 'Deleted By', render: (v: any) => <span className="text-purple-100">{v || '-'}</span> },
    {
      key: 'deletedReason',
      label: 'Reason',
      render: (v: any) => {
        const color = v === 'meta_blocked' ? 'text-red-400' : v === 'bulk' ? 'text-amber-400' : 'text-gray-400';
        return <span className={`text-xs font-medium ${color}`}>{v || 'manual'}</span>;
      },
    },
    {
      key: 'deletedAt',
      label: 'Deleted At',
      render: (v: any) => (v ? new Date(String(v)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'),
    },
    {
      key: '_id',
      label: 'Action',
      render: (_: any, row: any) => (
        <button
          onClick={() => handleRestore(row)}
          disabled={restoring === row._id}
          className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600/30 hover:bg-emerald-600/60 text-emerald-300 transition-colors disabled:opacity-50"
        >
          {restoring === row._id ? '...' : '↩ Restore'}
        </button>
      ),
    },
  ];

  const canPrev = skip > 0;
  const canNext = skip + limit < total;

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Deleted Leads"
          subtitle="Deletion log (lead numbers are preserved here)"
          action={
            <button
              onClick={() => router.push('/admin/crm/leads')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Back to Leads
            </button>
          }
        />

        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {restoreMsg && (
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${restoreMsg.startsWith('✅') ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30' : 'bg-red-900/40 text-red-300 border border-red-500/30'}`}>
            {restoreMsg}
            <button onClick={() => setRestoreMsg(null)} className="ml-3 text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6 backdrop-blur space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-purple-200 text-sm mb-2">Search</label>
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSkip(0);
                }}
                placeholder="Lead ID / name / phone / email"
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {isSuperAdmin && (
              <div>
                <label className="block text-purple-200 text-sm mb-2">Filter by User</label>
                <select
                  value={userFilter}
                  onChange={(e) => {
                    setUserFilter(e.target.value);
                    setSkip(0);
                  }}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">All Users</option>
                  {userOptions.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.userId}{u.email ? ` (${u.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => fetchDeleted()}
                className="px-4 py-2 bg-purple-600/40 hover:bg-purple-600/60 text-white rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              loading={loading}
              empty={rows.length === 0}
              striped
              hover
            />
          )}

          <div className="flex items-center justify-between text-sm text-purple-200">
            <div>
              Showing {Math.min(total, skip + 1)}-{Math.min(total, skip + limit)} of {total}
            </div>
            <div className="flex gap-2">
              <button
                disabled={!canPrev}
                onClick={() => setSkip(Math.max(0, skip - limit))}
                className="px-3 py-1.5 rounded-lg bg-slate-700/60 text-white disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={!canNext}
                onClick={() => setSkip(skip + limit)}
                className="px-3 py-1.5 rounded-lg bg-slate-700/60 text-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
