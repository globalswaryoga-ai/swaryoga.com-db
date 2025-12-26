'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, LogOut, Menu, X, TrendingUp, ShoppingCart, DollarSign, Home, UserPlus } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import ServerStatus from '@/components/ServerStatus';

interface DashboardData {
  totalUsers: number;
  totalSignins: number;
  totalMessages: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalAmountUSD: number;
  currencyBreakdown: {
    INR: number;
    USD: number;
    NPR: number;
  };
  orders: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    transactionId: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [adminUser, setAdminUser] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Quick add-user modal (create admin users with permissions)
  const [showAddUser, setShowAddUser] = useState(false);
  const [createUserBusy, setCreateUserBusy] = useState(false);
  const [createUserMsg, setCreateUserMsg] = useState<string>('');
  const [newUserId, setNewUserId] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [permissionMode, setPermissionMode] = useState<'all' | 'selected'>('selected');
  const [selectedPermissions, setSelectedPermissions] = useState({
    crm: true,
    whatsapp: false,
    email: false,
  });
  const [purgeEmail, setPurgeEmail] = useState('swarsakshi9999@gmail.com');
  const [purgeOlderThanDays, setPurgeOlderThanDays] = useState<string>('');
  const [purgePaymentMethod, setPurgePaymentMethod] = useState<string>('');
  const [purgePreviewCount, setPurgePreviewCount] = useState<number | null>(null);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<string>('');
  const [expireEmail, setExpireEmail] = useState('swarsakshi9999@gmail.com');
  const [expireOlderThanMinutes, setExpireOlderThanMinutes] = useState<string>('60');
  const [expirePaymentMethod, setExpirePaymentMethod] = useState<string>('');
  const [expirePreviewCount, setExpirePreviewCount] = useState<number | null>(null);
  const [expireBusy, setExpireBusy] = useState(false);
  const [expireMsg, setExpireMsg] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalUsers: 0,
    totalSignins: 0,
    totalMessages: 0,
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalAmountUSD: 0,
    currencyBreakdown: { INR: 0, USD: 0, NPR: 0 },
    orders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if admin is logged in
    const adminToken = localStorage.getItem('admin_token') || localStorage.getItem('adminToken');
    const adminUsername = localStorage.getItem('adminUser');

    // Full access gate: allow "admin" and admins with permissions: ['all'] (e.g., admincrm).
    const userStr = localStorage.getItem('admin_user');
    let resolvedUserId = localStorage.getItem('adminUser') || adminUsername || '';
    let permissions: string[] = [];
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        resolvedUserId = (u?.userId as string) || resolvedUserId;
        permissions = Array.isArray(u?.permissions) ? u.permissions : [];
      } catch {
        // ignore
      }
    }

    const isSuperAdminResolved = resolvedUserId === 'admin' || permissions.includes('all');
    setIsSuperAdmin(isSuperAdminResolved);

    if (!adminToken) {
      router.push('/admin/login');
    } else {
      if (!isSuperAdminResolved) {
        router.push('/admin/crm');
        return;
      }
      setIsAuthenticated(true);
      setAdminUser(resolvedUserId || '');
      fetchDashboardData(adminToken);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!isSuperAdmin) return;

    // NOTE: Avoid useSearchParams() in this page because it can trigger
    // "missing-suspense-with-csr-bailout" during Vercel prerendering.
    // We only need this on the client anyway.
    const open = new URLSearchParams(window.location.search).get('addUsers');
    if (open === '1') {
      resetCreateUserForm();
      setShowAddUser(true);
      // Clean URL so refresh doesn't re-open every time
      router.replace('/admin/dashboard');
    }
  }, [isAuthenticated, isSuperAdmin, router]);

  const toggleSelectedPermission = (key: keyof typeof selectedPermissions) => {
    setSelectedPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const resetCreateUserForm = () => {
    setNewUserId('');
    setNewEmail('');
    setNewPassword('');
    setPermissionMode('selected');
    setSelectedPermissions({ crm: true, whatsapp: false, email: false });
    setCreateUserMsg('');
  };

  const createAdminUser = async () => {
    const token = getAdminToken();
    if (!token) {
      setCreateUserMsg('Admin token missing. Please login again.');
      return;
    }

    const userId = newUserId.trim();
    const email = newEmail.trim().toLowerCase();
    const password = newPassword;

    if (!userId || !email || !password) {
      setCreateUserMsg('userId, email, and password are required.');
      return;
    }

    const permissions =
      permissionMode === 'all'
        ? ['all']
        : (Object.keys(selectedPermissions) as Array<keyof typeof selectedPermissions>)
            .filter((k) => selectedPermissions[k])
            .map((k) => String(k));

    if (permissions.length === 0) {
      setCreateUserMsg('Select at least one permission (CRM/WhatsApp/Email) or choose Full Access.');
      return;
    }

    setCreateUserBusy(true);
    setCreateUserMsg('');
    try {
      const response = await fetch('/api/admin/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          email,
          password,
          permissions,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create user');
      }

      setCreateUserMsg(`User created: ${userId}`);
      // Keep modal open so admin can add multiple users quickly
      setNewUserId('');
      setNewEmail('');
      setNewPassword('');
      setPermissionMode('selected');
      setSelectedPermissions({ crm: true, whatsapp: false, email: false });
    } catch (err) {
      setCreateUserMsg(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreateUserBusy(false);
    }
  };

  const fetchDashboardData = async (token: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const getAdminToken = () => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';
  };

  const buildPurgeQuery = () => {
    const params = new URLSearchParams();
    const email = purgeEmail.trim();
    if (email) params.set('email', email);

    const days = purgeOlderThanDays.trim();
    if (days) params.set('olderThanDays', days);

    const method = purgePaymentMethod.trim();
    if (method) params.set('paymentMethod', method);

    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const buildExpireQuery = () => {
    const params = new URLSearchParams();
    const email = expireEmail.trim();
    if (email) params.set('email', email);

    const minutes = expireOlderThanMinutes.trim();
    if (minutes) params.set('olderThanMinutes', minutes);

    const method = expirePaymentMethod.trim();
    if (method) params.set('paymentMethod', method);

    const qs = params.toString();
    return qs ? `?${qs}` : '';
  };

  const previewPurge = async () => {
    const token = getAdminToken();
    if (!token) {
      setPurgeMsg('Admin token missing. Please login again.');
      return;
    }

    setPurgeBusy(true);
    setPurgeMsg('');
    setPurgePreviewCount(null);
    try {
      const response = await fetch(`/api/admin/orders/purge-failed${buildPurgeQuery()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to preview');
      }

      setPurgePreviewCount(typeof data?.count === 'number' ? data.count : null);
      setPurgeMsg('Preview loaded.');
    } catch (err) {
      setPurgeMsg(err instanceof Error ? err.message : 'Failed to preview');
    } finally {
      setPurgeBusy(false);
    }
  };

  const runPurge = async () => {
    const token = getAdminToken();
    if (!token) {
      setPurgeMsg('Admin token missing. Please login again.');
      return;
    }

    const email = purgeEmail.trim();
    if (!email) {
      setPurgeMsg('Please enter an email to purge.');
      return;
    }

    const ok = window.confirm(
      `Delete FAILED orders for\n${email}\n\nThis will permanently delete only paymentStatus="failed" orders. Continue?`
    );
    if (!ok) return;

    setPurgeBusy(true);
    setPurgeMsg('');
    try {
      const body: Record<string, unknown> = {
        confirm: 'DELETE_FAILED_ORDERS',
        email,
      };
      const days = purgeOlderThanDays.trim();
      if (days) body.olderThanDays = Number(days);
      const method = purgePaymentMethod.trim();
      if (method) body.paymentMethod = method;

      const response = await fetch('/api/admin/orders/purge-failed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete');
      }

      setPurgeMsg(`Deleted ${data?.deletedCount ?? 0} failed orders.`);
      setPurgePreviewCount(null);
    } catch (err) {
      setPurgeMsg(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setPurgeBusy(false);
    }
  };

  const previewExpire = async () => {
    const token = getAdminToken();
    if (!token) {
      setExpireMsg('Admin token missing. Please login again.');
      return;
    }

    setExpireBusy(true);
    setExpireMsg('');
    setExpirePreviewCount(null);
    try {
      const response = await fetch(`/api/admin/orders/expire-pending${buildExpireQuery()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to preview');
      }

      setExpirePreviewCount(typeof data?.count === 'number' ? data.count : null);
      setExpireMsg('Preview loaded.');
    } catch (err) {
      setExpireMsg(err instanceof Error ? err.message : 'Failed to preview');
    } finally {
      setExpireBusy(false);
    }
  };

  const runExpire = async () => {
    const token = getAdminToken();
    if (!token) {
      setExpireMsg('Admin token missing. Please login again.');
      return;
    }

    const email = expireEmail.trim();
    if (!email) {
      setExpireMsg('Please enter an email to expire pending orders.');
      return;
    }

    const minutes = Number(expireOlderThanMinutes);
    if (!Number.isFinite(minutes) || minutes < 30) {
      setExpireMsg('olderThanMinutes must be a number and at least 30.');
      return;
    }

    const ok = window.confirm(
      `Mark PENDING orders as FAILED (expired) for\n${email}\n\nThreshold: older than ${minutes} minutes\n\nThis does NOT delete orders; it only marks them as failed so they stop showing as pending. Continue?`
    );
    if (!ok) return;

    setExpireBusy(true);
    setExpireMsg('');
    try {
      const body: Record<string, unknown> = {
        confirm: 'EXPIRE_PENDING_ORDERS',
        email,
        olderThanMinutes: minutes,
      };
      const method = expirePaymentMethod.trim();
      if (method) body.paymentMethod = method;

      const response = await fetch('/api/admin/orders/expire-pending', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to expire');
      }

      setExpireMsg(`Expired (marked failed): ${data?.modifiedCount ?? 0} orders.`);
      setExpirePreviewCount(null);
    } catch (err) {
      setExpireMsg(err instanceof Error ? err.message : 'Failed to expire');
    } finally {
      setExpireBusy(false);
    }
  };

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-swar-primary-light">
      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-lg bg-swar-primary-light hover:bg-swar-primary-light"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <h1 className="text-2xl font-bold text-swar-text flex items-center space-x-2">
                <LayoutDashboard className="h-8 w-8 text-blue-600" />
                <span>Dashboard</span>
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <ServerStatus />

              {isSuperAdmin && (
                <button
                  onClick={() => {
                    resetCreateUserForm();
                    setShowAddUser(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  title="Add new admin user"
                >
                  <UserPlus className="h-5 w-5" />
                  <span className="font-semibold">Add Users</span>
                </button>
              )}

              <div className="text-right">
                <p className="text-sm text-swar-text-secondary">Welcome back</p>
                <p className="font-semibold text-swar-text capitalize">{adminUser}</p>
              </div>
              <Link
                href="/"
                className="p-2 rounded-lg bg-swar-primary-light text-red-600 hover:bg-red-200 transition-colors"
                title="Go to Home"
              >
                <Home className="h-6 w-6" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-swar-primary-light text-red-600 hover:bg-red-200 transition-colors"
                title="Logout"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        {showAddUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowAddUser(false)}
              aria-hidden="true"
            />
            <div className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-xl border border-swar-border">
              <div className="flex items-center justify-between px-6 py-4 border-b border-swar-border">
                <h2 className="text-xl font-bold text-swar-text">Add Users</h2>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="p-2 rounded-lg hover:bg-swar-primary-light"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-swar-text mb-1">Username (userId)</label>
                    <input
                      value={newUserId}
                      onChange={(e) => setNewUserId(e.target.value)}
                      className="w-full border border-swar-border rounded-lg px-3 py-2"
                      placeholder="e.g., usercrm1"
                      disabled={createUserBusy}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-swar-text mb-1">Email</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full border border-swar-border rounded-lg px-3 py-2"
                      placeholder="user@example.com"
                      disabled={createUserBusy}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-swar-text mb-1">Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border border-swar-border rounded-lg px-3 py-2"
                      placeholder="Enter strong password"
                      disabled={createUserBusy}
                    />
                  </div>
                </div>

                <div className="mt-5 border-t border-swar-border pt-4">
                  <p className="text-sm font-semibold text-swar-text mb-2">Permissions</p>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="permission-mode"
                        checked={permissionMode === 'selected'}
                        onChange={() => setPermissionMode('selected')}
                        disabled={createUserBusy}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-semibold text-swar-text">Custom (recommended for User CRM)</div>
                        <div className="text-sm text-swar-text-secondary">Default is CRM only.</div>
                      </div>
                    </label>

                    {permissionMode === 'selected' && (
                      <div className="ml-7 grid grid-cols-1 md:grid-cols-3 gap-3 bg-swar-primary-light rounded-lg p-3">
                        <label className="flex items-center gap-2 text-sm text-swar-text">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.crm}
                            onChange={() => toggleSelectedPermission('crm')}
                            disabled={createUserBusy}
                          />
                          CRM
                        </label>
                        <label className="flex items-center gap-2 text-sm text-swar-text">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.whatsapp}
                            onChange={() => toggleSelectedPermission('whatsapp')}
                            disabled={createUserBusy}
                          />
                          WhatsApp
                        </label>
                        <label className="flex items-center gap-2 text-sm text-swar-text">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.email}
                            onChange={() => toggleSelectedPermission('email')}
                            disabled={createUserBusy}
                          />
                          Email
                        </label>
                      </div>
                    )}

                    <label className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="permission-mode"
                        checked={permissionMode === 'all'}
                        onChange={() => setPermissionMode('all')}
                        disabled={createUserBusy}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-semibold text-swar-text">Full Access (all)</div>
                        <div className="text-sm text-swar-text-secondary">Use only for trusted admins.</div>
                      </div>
                    </label>
                  </div>
                </div>

                {createUserMsg && (
                  <div className="mt-4 text-sm">
                    <div
                      className={
                        createUserMsg.toLowerCase().includes('created')
                          ? 'text-green-700'
                          : 'text-red-700'
                      }
                    >
                      {createUserMsg}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-swar-border flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                  disabled={createUserBusy}
                >
                  Close
                </button>
                <button
                  onClick={createAdminUser}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={createUserBusy}
                >
                  {createUserBusy ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto p-6">
          {error && (
            <div className="bg-swar-primary-light border border-red-400 text-swar-primary px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center min-h-96">
              <p className="text-swar-text-secondary">Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {/* Maintenance tools */}
              <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Purge Failed Orders */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-swar-text mb-2">Maintenance: Purge Failed Orders</h2>
                  <p className="text-sm text-swar-text-secondary mb-4">
                    Permanently deletes only <span className="font-semibold">failed</span> orders.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Email</label>
                      <input
                        value={purgeEmail}
                        onChange={(e) => setPurgeEmail(e.target.value)}
                        className="w-full border border-swar-border rounded-lg px-3 py-2"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Older than (days)</label>
                      <input
                        value={purgeOlderThanDays}
                        onChange={(e) => setPurgeOlderThanDays(e.target.value)}
                        className="w-full border border-swar-border rounded-lg px-3 py-2"
                        placeholder="(optional)"
                        inputMode="numeric"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Payment method</label>
                      <input
                        value={purgePaymentMethod}
                        onChange={(e) => setPurgePaymentMethod(e.target.value)}
                        className="w-full border border-swar-border rounded-lg px-3 py-2"
                        placeholder="india_payu (optional)"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 items-center">
                    <button
                      type="button"
                      onClick={previewPurge}
                      disabled={purgeBusy}
                      className={`px-4 py-2 rounded-lg border border-swar-border bg-white ${purgeBusy ? 'opacity-50 cursor-not-allowed' : 'hover:border-swar-primary'}`}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={runPurge}
                      disabled={purgeBusy}
                      className={`px-4 py-2 rounded-lg bg-red-600 text-white font-semibold ${purgeBusy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
                    >
                      Delete Failed Orders
                    </button>

                    {purgePreviewCount != null && (
                      <div className="text-sm text-swar-text-secondary">
                        Matching failed orders: <span className="font-bold text-swar-text">{purgePreviewCount}</span>
                      </div>
                    )}

                    {purgeMsg && <div className="text-sm text-swar-text-secondary">{purgeMsg}</div>}
                  </div>
                </div>

                {/* Expire Pending Orders */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-swar-text mb-2">Maintenance: Expire Stale Pending Orders</h2>
                  <p className="text-sm text-swar-text-secondary mb-4">
                    Marks old <span className="font-semibold">pending</span> orders as <span className="font-semibold">failed</span> (expired). This is safe for cleanup because it does not delete records.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Email</label>
                      <input
                        value={expireEmail}
                        onChange={(e) => setExpireEmail(e.target.value)}
                        className="w-full border border-swar-border rounded-lg px-3 py-2"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Older than (minutes)</label>
                      <input
                        value={expireOlderThanMinutes}
                        onChange={(e) => setExpireOlderThanMinutes(e.target.value)}
                        className="w-full border border-swar-border rounded-lg px-3 py-2"
                        placeholder="60"
                        inputMode="numeric"
                      />
                      <p className="mt-1 text-xs text-swar-text-secondary">Minimum: 30</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Payment method</label>
                      <input
                        value={expirePaymentMethod}
                        onChange={(e) => setExpirePaymentMethod(e.target.value)}
                        className="w-full border border-swar-border rounded-lg px-3 py-2"
                        placeholder="india_payu (optional)"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 items-center">
                    <button
                      type="button"
                      onClick={previewExpire}
                      disabled={expireBusy}
                      className={`px-4 py-2 rounded-lg border border-swar-border bg-white ${expireBusy ? 'opacity-50 cursor-not-allowed' : 'hover:border-swar-primary'}`}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={runExpire}
                      disabled={expireBusy}
                      className={`px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold ${expireBusy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-700'}`}
                    >
                      Expire Pending Orders
                    </button>

                    {expirePreviewCount != null && (
                      <div className="text-sm text-swar-text-secondary">
                        Matching pending orders: <span className="font-bold text-swar-text">{expirePreviewCount}</span>
                      </div>
                    )}

                    {expireMsg && <div className="text-sm text-swar-text-secondary">{expireMsg}</div>}
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Users */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-swar-text-secondary text-sm">Total Users</p>
                      <p className="text-3xl font-bold text-swar-text">{dashboardData.totalUsers}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Total Logins */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-swar-text-secondary text-sm">Total Logins</p>
                      <p className="text-3xl font-bold text-swar-text">{dashboardData.totalSignins}</p>
                    </div>
                    <div className="p-3 bg-swar-primary-light rounded-full">
                      <TrendingUp className="h-6 w-6 text-swar-primary" />
                    </div>
                  </div>
                </div>

                {/* Contact Messages */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-swar-text-secondary text-sm">Messages</p>
                      <p className="text-3xl font-bold text-swar-text">{dashboardData.totalMessages}</p>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <Users className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </div>

                {/* Total Orders */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-swar-text-secondary text-sm">Total Orders</p>
                      <p className="text-3xl font-bold text-swar-text">{dashboardData.totalOrders}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <ShoppingCart className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Total Revenue USD */}
                <div className="bg-gradient-to-br from-green-500 to-swar-primary rounded-lg shadow p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-swar-primary-light text-sm">Total Revenue (USD)</p>
                      <p className="text-3xl font-bold">${dashboardData.totalAmountUSD.toFixed(2)}</p>
                      <p className="text-sm text-swar-primary-light mt-2">Completed Orders: {dashboardData.completedOrders}</p>
                    </div>
                    <div className="p-3 bg-white bg-opacity-20 rounded-full">
                      <DollarSign className="h-8 w-8" />
                    </div>
                  </div>
                </div>

                {/* Completed Orders */}
                <div className="bg-gradient-to-br from-blue-500 to-swar-primary rounded-lg shadow p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Completed Orders</p>
                      <p className="text-3xl font-bold">{dashboardData.completedOrders}</p>
                      <p className="text-sm text-blue-100 mt-2">Pending: {dashboardData.pendingOrders}</p>
                    </div>
                    <div className="p-3 bg-white bg-opacity-20 rounded-full">
                      <ShoppingCart className="h-8 w-8" />
                    </div>
                  </div>
                </div>

                {/* Pending Orders */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm">Pending Orders</p>
                      <p className="text-3xl font-bold">{dashboardData.pendingOrders}</p>
                      <p className="text-sm text-orange-100 mt-2">Need Attention</p>
                    </div>
                    <div className="p-3 bg-white bg-opacity-20 rounded-full">
                      <TrendingUp className="h-8 w-8" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Currency Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* INR Revenue */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-swar-text mb-4">Indian Rupees (INR)</h3>
                  <p className="text-3xl font-bold text-swar-text">₹{dashboardData.currencyBreakdown.INR.toFixed(2)}</p>
                  <p className="text-sm text-swar-text-secondary mt-2">
                    {dashboardData.orders.filter(o => o.currency === 'INR').length} orders
                  </p>
                </div>

                {/* USD Revenue */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-swar-text mb-4">US Dollar (USD)</h3>
                  <p className="text-3xl font-bold text-swar-text">${dashboardData.currencyBreakdown.USD.toFixed(2)}</p>
                  <p className="text-sm text-swar-text-secondary mt-2">
                    {dashboardData.orders.filter(o => o.currency === 'USD').length} orders
                  </p>
                </div>

                {/* NPR Revenue */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-swar-text mb-4">Nepali Rupees (NPR)</h3>
                  <p className="text-3xl font-bold text-swar-text">Rs{dashboardData.currencyBreakdown.NPR.toFixed(2)}</p>
                  <p className="text-sm text-swar-text-secondary mt-2">
                    {dashboardData.orders.filter(o => o.currency === 'NPR').length} orders
                  </p>
                </div>
              </div>

              {/* Recent Orders Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-swar-border">
                  <h2 className="text-xl font-bold text-swar-text">Recent Completed Orders</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-swar-bg border-b border-swar-border">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Amount</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Currency</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Transaction ID</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.orders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-swar-text-secondary">
                            No completed orders yet
                          </td>
                        </tr>
                      ) : (
                        dashboardData.orders.slice(0, 10).map((order) => (
                          <tr key={order.id} className="border-b border-swar-border hover:bg-swar-bg">
                            <td className="px-6 py-4 text-sm font-semibold text-swar-text">
                              {order.currency === 'INR' && '₹'}
                              {order.currency === 'USD' && '$'}
                              {order.currency === 'NPR' && 'Rs'}
                              {order.amount.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-sm text-swar-text-secondary">{order.currency}</td>
                            <td className="px-6 py-4 text-sm text-swar-text-secondary font-mono">{order.transactionId || 'N/A'}</td>
                            <td className="px-6 py-4">
                              <span className="inline-block bg-swar-primary-light text-swar-primary text-xs font-semibold px-3 py-1 rounded-full">
                                {order.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-swar-text-secondary">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Info Section */}
              <div className="mt-8 bg-white rounded-lg shadow p-8">
                <h2 className="text-2xl font-bold text-swar-text mb-4">Dashboard Overview</h2>
                <p className="text-swar-text-secondary mb-4">
                  This dashboard displays real-time statistics about your Swar Yoga platform including user registrations, logins, messages, and payment data.
                </p>
                <ul className="text-swar-text-secondary space-y-2 ml-4">
                  <li>� <strong>Total Users:</strong> Total number of registered users</li>
                  <li>🔑 <strong>Total Logins:</strong> Total number of user login sessions</li>
                  <li>💬 <strong>Messages:</strong> Total contact messages received</li>
                  <li>🛒 <strong>Orders:</strong> Total number of orders placed</li>
                  <li>💰 <strong>Revenue:</strong> Total amount received in multiple currencies (INR, USD, NPR)</li>
                </ul>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
