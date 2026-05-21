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

type EditFormState = {
  _id: string;
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
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<EditFormState | null>(null);

  useEffect(() => {
    setIsSuperAdmin(checkIsSuperAdmin());
  }, []);

  const loadUsers = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          setError('Session expired. Please login again.');
          return;
        }
        throw new Error(data?.error || 'Failed to load admin users');
      }
      setUsers(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Session')) {
        setError(err.message);
      }
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
      setShowCreateForm(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin user');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (user: AdminUser) => {
    setSuccess(null);
    setError(null);
    setEditingUser({
      _id: user._id,
      userId: user.userId,
      name: user.name || '',
      email: user.email,
      password: '',
      role: user.role || 'admin',
    });
  };

  const handleEditUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !isSuperAdmin || !editingUser?._id) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const payload: Record<string, string> = {
        userId: editingUser.userId.trim(),
        name: editingUser.name.trim(),
        email: editingUser.email.trim(),
        role: editingUser.role,
      };
      if (editingUser.password.trim()) {
        payload.password = editingUser.password;
      }

      const res = await fetch(`/api/admin/auth/users/${editingUser._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update admin user');
      }
      setSuccess(data?.message || 'Admin user updated successfully');
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update admin user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!token || !isSuperAdmin) return;
    const confirmed = window.confirm(`Delete admin user ${user.name || user.userId}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingUserId(user._id);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/admin/auth/users/${user._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete admin user');
      }
      setSuccess(data?.message || 'Admin user deleted successfully');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete admin user');
    } finally {
      setDeletingUserId(null);
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
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setShowCreateForm((prev) => !prev);
                  setSuccess(null);
                  setError(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white font-semibold border border-green-400/50 transition-all duration-300"
              >
                {showCreateForm ? '✕ Close Add Form' : '+ Add Admin'}
              </button>
            )}
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

        {isSuperAdmin && showCreateForm && (
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
                  {isSuperAdmin && (
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-green-400">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 7 : 6} className="px-4 py-10 text-center text-gray-400">Loading admin users…</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 7 : 6} className="px-4 py-10 text-center text-gray-400">No admin users found.</td>
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
                      {isSuperAdmin && (
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              className="rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 px-3 py-1.5 text-xs font-semibold text-indigo-300 border border-indigo-400/30 transition-all duration-300"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              disabled={deletingUserId === user._id}
                              className="rounded-lg bg-red-500/15 hover:bg-red-500/25 px-3 py-1.5 text-xs font-semibold text-red-300 border border-red-400/30 disabled:opacity-60 transition-all duration-300"
                            >
                              {deletingUserId === user._id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditingUser(null)}>
            <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#151515] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Edit Admin User</h3>
                  <p className="text-sm text-gray-400 mt-1">Update user details or reset the password if needed.</p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-sm font-semibold text-gray-300 hover:bg-white/10 transition-all duration-300"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleEditUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={editingUser.userId}
                  onChange={(e) => setEditingUser((prev) => prev ? { ...prev, userId: e.target.value } : prev)}
                  placeholder="Username / userId"
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                  required
                />
                <input
                  value={editingUser.name}
                  onChange={(e) => setEditingUser((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                  placeholder="Display name"
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                />
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser((prev) => prev ? { ...prev, email: e.target.value } : prev)}
                  placeholder="Email"
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                  required
                />
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser((prev) => prev ? { ...prev, role: e.target.value } : prev)}
                  className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white focus:outline-none focus:border-green-400"
                >
                  <option value="admin" className="bg-[#1a1a1a]">Admin</option>
                  <option value="manager" className="bg-[#1a1a1a]">Manager</option>
                  <option value="dm" className="bg-[#1a1a1a]">DM</option>
                  <option value="user" className="bg-[#1a1a1a]">User</option>
                </select>
                <div className="md:col-span-2">
                  <input
                    type="password"
                    value={editingUser.password}
                    onChange={(e) => setEditingUser((prev) => prev ? { ...prev, password: e.target.value } : prev)}
                    placeholder="New password (leave blank to keep current password)"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-green-400"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="rounded-xl bg-white/10 hover:bg-white/20 px-5 py-2.5 text-white font-semibold transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-green-500 hover:bg-green-400 px-5 py-2.5 text-white font-bold disabled:opacity-60 transition-all duration-300"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
