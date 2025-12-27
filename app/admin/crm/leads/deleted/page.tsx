'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
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
      setIsSuperAdmin(u?.userId === 'admin' || perms.includes('all'));
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
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchDeleted();
  }, [token, router, fetchDeleted]);

  const columns = [
    { key: 'leadNumber', label: 'Lead ID', render: (v: any) => <span className="font-mono text-purple-100">{v || '-'}</span> },
    { key: 'name', label: 'Name' },
    { key: 'phoneNumber', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'workshopName', label: 'Workshop' },
    { key: 'assignedToUserId', label: 'User', render: (v: any) => <span className="text-purple-100">{v || '-'}</span> },
    { key: 'deletedByUserId', label: 'Deleted By', render: (v: any) => <span className="text-purple-100">{v || '-'}</span> },
    {
      key: 'deletedAt',
      label: 'Deleted At',
      render: (v: any) => (v ? new Date(String(v)).toLocaleString() : '-'),
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
