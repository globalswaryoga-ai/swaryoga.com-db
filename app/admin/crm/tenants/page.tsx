'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tenant {
  _id: string;
  slug: string;
  name: string;
  ownerEmail: string;
  ownerUserId: string;
  plan: string;
  status: string;
  dbName: string;
  subdomain?: string;
  customDomain?: string;
  customDomainVerified?: boolean;
  enabledModules: string[];
  currentLeadCount: number;
  currentUserCount: number;
  currentStorageMB: number;
  subscriptionEndsAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Plan {
  tier: string;
  name: string;
  description: string;
  limits: Record<string, number>;
  enabledModules: string[];
  monthlyPriceINR: number;
  annualPriceINR: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
  archived: 'bg-gray-100 text-gray-500',
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  starter: 'bg-blue-100 text-blue-700',
  growth: 'bg-purple-100 text-purple-700',
  professional: 'bg-amber-100 text-amber-700',
  enterprise: 'bg-rose-100 text-rose-700',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TenantsPage() {
  const token = useAuth();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);

  // Create dialog
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    ownerEmail: '',
    ownerUserId: '',
    plan: 'free',
  });
  const [creating, setCreating] = useState(false);

  // Edit dialog
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const headers = useCallback(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token],
  );

  // Fetch tenants
  const fetchTenants = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (planFilter) params.set('plan', planFilter);

      const res = await fetch(`/api/admin/tenants?${params}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to load tenants');
      setTenants(data.data?.tenants || []);
      setPagination(data.data?.pagination || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, planFilter, headers]);

  // Fetch plans (once)
  useEffect(() => {
    fetch('/api/admin/tenants/plans')
      .then((r) => r.json())
      .then((d) => setPlans(d.data?.plans || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Create tenant
  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create tenant');
      setShowCreate(false);
      setForm({ name: '', slug: '', ownerEmail: '', ownerUserId: '', plan: 'free' });
      fetchTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Update tenant
  const handleUpdate = async () => {
    if (!editTenant) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ slug: editTenant.slug, ...editForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update tenant');
      setEditTenant(null);
      fetchTenants();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Auto-slug from name
  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    }));
  };

  if (!token) return null;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Multi-tenant SaaS administration — manage organisations, plans, and databases.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          + New Tenant
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading tenants…</div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No tenants found. Click &ldquo;+ New Tenant&rdquo; to onboard your first organisation.
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Slug</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Plan</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Leads</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Users</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">DB</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {tenants.map((t) => (
                <tr key={t._id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{t.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[t.plan] || ''}`}>
                      {t.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[t.status] || ''}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{(t.currentLeadCount ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{t.currentUserCount ?? 0}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[140px]" title={t.dbName}>
                    {t.dbName}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        setEditTenant(t);
                        setEditForm({ plan: t.plan, status: t.status, customDomain: t.customDomain || '' });
                      }}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ====== Create Tenant Modal ====== */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4">Onboard New Tenant</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Organisation Name</label>
                <input
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Acme Yoga Studio"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Slug (URL-safe)</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  placeholder="acme-yoga"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Owner Email</label>
                <input
                  value={form.ownerEmail}
                  onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="owner@example.com"
                  type="email"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Owner User ID</label>
                <input
                  value={form.ownerUserId}
                  onChange={(e) => setForm((f) => ({ ...f, ownerUserId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="admin_user_id"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                <select
                  value={form.plan}
                  onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {plans.length > 0
                    ? plans.map((p) => (
                        <option key={p.tier} value={p.tier}>
                          {p.name} — ₹{p.monthlyPriceINR}/mo
                        </option>
                      ))
                    : ['free', 'starter', 'growth', 'professional', 'enterprise'].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name || !form.slug || !form.ownerEmail}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40"
              >
                {creating ? 'Creating…' : 'Create Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Edit Tenant Modal ====== */}
      {editTenant && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-1">Edit Tenant</h2>
            <p className="text-xs text-gray-400 mb-4 font-mono">{editTenant.slug}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                <select
                  value={editForm.plan || ''}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, plan: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {['free', 'starter', 'growth', 'professional', 'enterprise'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={editForm.status || ''}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, status: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  {['active', 'pending', 'suspended', 'archived'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Custom Domain</label>
                <input
                  value={editForm.customDomain || ''}
                  onChange={(e) => setEditForm((f: any) => ({ ...f, customDomain: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="crm.client.com"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditTenant(null)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== Plans Reference Card ====== */}
      {plans.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Plan Tiers Reference</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {plans.map((p) => (
              <div
                key={p.tier}
                className={`border rounded-xl p-4 ${
                  p.tier === 'enterprise' ? 'border-rose-300 bg-rose-50/30' : 'bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PLAN_COLORS[p.tier] || ''}`}>
                    {p.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {p.monthlyPriceINR === 0 ? 'Free' : `₹${p.monthlyPriceINR.toLocaleString()}/mo`}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{p.description}</p>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  <li>Leads: {p.limits.maxLeads?.toLocaleString()}</li>
                  <li>Users: {p.limits.maxUsers}</li>
                  <li>Modules: {p.enabledModules.length}</li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
