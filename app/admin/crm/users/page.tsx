'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import {
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Mail,
  User,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowLeft,
} from 'lucide-react';

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
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<EditFormState | null>(null);

  useEffect(() => {
    setIsSuperAdmin(checkIsSuperAdmin());
  }, []);

  const getActiveToken = () => {
    if (token) return token;
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('crm_token') ||
        localStorage.getItem('adminToken') ||
        localStorage.getItem('admin_token') ||
        ''
      );
    }
    return '';
  };

  const loadUsers = async () => {
    const activeToken = getActiveToken();
    if (!activeToken) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/auth/users', {
        headers: { Authorization: `Bearer ${activeToken}` },
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
      } else {
        setError(err instanceof Error ? err.message : 'Error loading admin users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [token]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !q || [user.name, user.email, user.userId, user.role]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q));

      const matchesRole =
        roleFilter === 'all' ||
        (user.role || 'admin').toLowerCase() === roleFilter.toLowerCase();

      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  // Metric stats
  const metrics = useMemo(() => {
    const total = users.length;
    const superadmins = users.filter((u) => (u.role || '').toLowerCase() === 'superadmin').length;
    const managers = users.filter((u) => {
      const r = (u.role || '').toLowerCase();
      return r === 'manager' || r === 'dm';
    }).length;
    const staffAdmins = users.filter((u) => {
      const r = (u.role || '').toLowerCase();
      return r !== 'superadmin' && r !== 'manager' && r !== 'dm';
    }).length;
    return { total, superadmins, managers, staffAdmins };
  }, [users]);

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    const activeToken = getActiveToken();
    if (!activeToken || !isSuperAdmin) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/admin/auth/users', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
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
    const activeToken = getActiveToken();
    if (!activeToken || !isSuperAdmin || !editingUser?._id) return;

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
          Authorization: `Bearer ${activeToken}`,
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
    const activeToken = getActiveToken();
    if (!activeToken || !isSuperAdmin) return;
    const confirmed = window.confirm(`Delete admin user ${user.name || user.userId}? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingUserId(user._id);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/admin/auth/users/${user._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${activeToken}` },
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

  const getInitials = (name?: string, fallback = 'U') => {
    if (!name) return fallback.slice(0, 2).toUpperCase();
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Colorful Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/admin/crm/web-admin"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Web Admin
              </Link>
              <span className="text-slate-300">/</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Database className="w-3 h-3 text-emerald-600" />
                Bunny Auth Connected
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Shield className="w-7 h-7 text-indigo-600" />
              Admin Users & Team Access
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage CRM staff privileges, role-based access controls, and admin accounts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setShowCreateForm((prev) => !prev);
                  setSuccess(null);
                  setError(null);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs ${
                  showCreateForm
                    ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                }`}
              >
                {showCreateForm ? (
                  <>
                    <X className="w-4 h-4" /> Cancel
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Add Admin User
                  </>
                )}
              </button>
            )}

            <Link
              href="/admin/crm/users/profile"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-xs shadow-indigo-600/20"
            >
              <User className="w-4 h-4" /> User Profile Search
            </Link>

            <button
              onClick={loadUsers}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-all shadow-xs disabled:opacity-60"
              title="Refresh admin user records"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* 4 Colorful Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Admins</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{metrics.total}</p>
              <p className="text-xs text-indigo-600 font-medium mt-1">Platform operators</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Super Admins</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{metrics.superadmins}</p>
              <p className="text-xs text-violet-600 font-medium mt-1">Full root privileges</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 mb-3">
                <UserCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Managers & DMs</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{metrics.managers}</p>
              <p className="text-xs text-amber-600 font-medium mt-1">Team leads & digital managers</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                <Shield className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Staff Admins</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{metrics.staffAdmins}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">CRM support staff</p>
            </div>
          </div>
        </div>

        {/* Notifications / Alerts */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Create Admin Form Accordion */}
        {isSuperAdmin && showCreateForm && (
          <div className="bg-white rounded-2xl border border-emerald-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Create New Admin User</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Creates an authorized user account in the Bunny Auth database with immediate login access.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">User ID / Username *</label>
                <input
                  value={form.userId}
                  onChange={(e) => setForm((prev) => ({ ...prev, userId: e.target.value }))}
                  placeholder="e.g. john_doe"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Display Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. John Doe"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g. john@swaryoga.com"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Initial Password *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Role *</label>
                <div className="flex gap-2">
                  <select
                    value={form.role}
                    onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="dm">DM</option>
                    <option value="superadmin">Super Admin</option>
                  </select>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-xs disabled:opacity-60 shrink-0"
                  >
                    {saving ? 'Creating…' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Directory Card with Filters */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Card Top Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Active Admin Directory</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {filteredUsers.length} of {users.length} registered admin accounts
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, userId..."
                  className="w-full sm:w-64 pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Role filter buttons */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 overflow-x-auto">
                {['all', 'superadmin', 'manager', 'dm', 'admin'].map((role) => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                      roleFilter === role
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">User ID</th>
                  <th className="px-5 py-3.5">Email</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Permissions</th>
                  <th className="px-5 py-3.5">Created</th>
                  {isSuperAdmin && <th className="px-5 py-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 7 : 6} className="px-5 py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                      Loading admin user accounts…
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={isSuperAdmin ? 7 : 6} className="px-5 py-12 text-center text-slate-400">
                      No admin users found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const role = (user.role || 'admin').toLowerCase();
                    const isSuper = role === 'superadmin';
                    const isMgr = role === 'manager' || role === 'dm';

                    const roleBadgeClass = isSuper
                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : isMgr
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200';

                    return (
                      <tr key={user._id || user.userId} className="hover:bg-slate-50/70 transition-colors">
                        {/* Avatar & Name */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                              {getInitials(user.name, user.userId)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 leading-snug">
                                {user.name || user.userId}
                              </p>
                              {user.name && (
                                <p className="text-xs text-slate-400 font-mono">@{user.userId}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* User ID */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 font-mono text-xs">
                          {user.userId}
                        </td>

                        {/* Email */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {user.email}
                          </span>
                        </td>

                        {/* Role Badge */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${roleBadgeClass}`}
                          >
                            {user.role || 'admin'}
                          </span>
                        </td>

                        {/* Permissions */}
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {Array.isArray(user.permissions) && user.permissions.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {user.permissions.slice(0, 3).map((p) => (
                                <span
                                  key={p}
                                  className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-mono"
                                >
                                  {p}
                                </span>
                              ))}
                              {user.permissions.length > 3 && (
                                <span className="text-[11px] text-slate-400">
                                  +{user.permissions.length - 3} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-400">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                        </td>

                        {/* Actions */}
                        {isSuperAdmin && (
                          <td className="px-5 py-3.5 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => openEditModal(user)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user)}
                                disabled={deletingUserId === user._id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {deletingUserId === user._id ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal (Crisp White & Colorful) */}
        {editingUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
            onClick={() => setEditingUser(null)}
          >
            <div
              className="w-full max-w-xl bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Edit Admin User</h3>
                    <p className="text-xs text-slate-500">
                      Update account details, role permissions, or reset login password
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">User ID / Username *</label>
                    <input
                      value={editingUser.userId}
                      onChange={(e) =>
                        setEditingUser((prev) => (prev ? { ...prev, userId: e.target.value } : prev))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Display Name *</label>
                    <input
                      value={editingUser.name}
                      onChange={(e) =>
                        setEditingUser((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={editingUser.email}
                      onChange={(e) =>
                        setEditingUser((prev) => (prev ? { ...prev, email: e.target.value } : prev))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Role *</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) =>
                        setEditingUser((prev) => (prev ? { ...prev, role: e.target.value } : prev))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="admin">Admin</option>
                      <option value="manager">Manager</option>
                      <option value="dm">DM</option>
                      <option value="superadmin">Super Admin</option>
                      <option value="user">User</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    New Password (optional)
                  </label>
                  <input
                    type="password"
                    value={editingUser.password}
                    onChange={(e) =>
                      setEditingUser((prev) => (prev ? { ...prev, password: e.target.value } : prev))
                    }
                    placeholder="Leave blank to keep existing password unchanged"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-xs disabled:opacity-60"
                  >
                    {saving ? 'Saving Changes…' : 'Save Changes'}
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
