'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';

type AdminUser = {
  _id: string;
  userId: string;
  email: string;
  name?: string;
  role?: string;
  permissions?: string[];
  createdAt?: string;
};

type CreateFormState = {
  userId: string;
  name: string;
  email: string;
  password: string;
  role: string;
};

const INITIAL_FORM: CreateFormState = {
  userId: '',
  name: '',
  email: '',
  password: '',
  role: 'admin',
};

export default function CRMUsersPage() {
  const token = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);

  useEffect(() => {
    setIsSuperAdmin(checkIsSuperAdmin());
  }, []);

  const loadUsers = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to load admin users');
      }
      setUsers(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadUsers();
  }, [token]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.name, user.email, user.userId, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [users, search]);

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !isSuperAdmin) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/admin/auth/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: form.userId.trim(),
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          permissions: ['crm'],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create admin user');
      }
      setSuccess(data?.message || 'Admin user created successfully');
      setForm(INITIAL_FORM);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a] p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Admin Users</h1>
            <p className="text-gray-400 mt-2">Manage CRM admin accounts and quickly jump to unified profile tools.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/crm/users/profile"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold border border-indigo-400/50 transition-all duration-300"
            >
              👤 User Profile Search
            </Link>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold border border-white/20 disabled:opacity-60 transition-all duration-300"
            >
              {loading ? 'Refreshing…' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-300">
            {success}
          </div>
        )}

        {isSuperAdmin && (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">Create Admin User</h2>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
              <input
                value={form.userId}
                onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))}
                placeholder="Username / userId"
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                required
              />
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Display name"
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
              />
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="Email"
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                required
              />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Password"
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                required
              />
              <div className="flex gap-3">
                <select
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:outline-none focus:border-green-400"
                >
                  <option value="admin" className="bg-[#1a1a1a]">Admin</option>
                  <option value="manager" className="bg-[#1a1a1a]">Manager</option>
                  <option value="dm" className="bg-[#1a1a1a]">DM</option>
                </select>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-green-500 hover:bg-green-400 px-5 py-2.5 text-white font-bold disabled:opacity-60 transition-all duration-300"
                >
                  {saving ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">CRM Admin Directory</h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, role..."
              className="w-full md:w-80 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-green-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-green-400">User ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-green-400">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-green-400">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-green-400">Permissions</th>
                  <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-green-400">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">Loading admin users…</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400">No admin users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr key={user._id || user.userId} className={index % 2 === 0 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}>
                      <td className="px-4 py-4 text-white font-semibold">{user.name || user.userId}</td>
                      <td className="px-4 py-4 text-gray-300 font-mono text-sm">{user.userId}</td>
                      <td className="px-4 py-4 text-gray-300">{user.email}</td>
                      <td className="px-4 py-4 text-gray-300">
                        <span className="inline-flex rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
                          {user.role || 'admin'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-gray-400 text-sm">{Array.isArray(user.permissions) && user.permissions.length ? user.permissions.join(', ') : '—'}</td>
                      <td className="px-4 py-4 text-gray-400 text-sm">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
