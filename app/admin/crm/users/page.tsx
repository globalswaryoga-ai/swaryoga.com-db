'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, LogOut, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type AdminUserRow = {
  _id: string;
  userId: string;
  email?: string;
  name?: string;
  permissions?: string[];
  role?: 'superadmin' | 'manager' | 'admin' | 'user';
  managedUserIds?: string[];
  createdAt?: string;
};

const PERMISSION_KEYS = ['crm', 'whatsapp', 'email'] as const;
const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin User', desc: 'Can only see their own assigned data' },
  { value: 'manager', label: 'MR Admin (Manager)', desc: 'Can see assigned team members\' data + manage broadcasts/templates' },
  { value: 'superadmin', label: 'Super Admin', desc: 'Full access to all data' },
] as const;

export default function CRMAdminUsersPage() {
  const router = useRouter();
  const token = useAuth();
  const [adminUserId, setAdminUserId] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'manager' | 'superadmin'>('admin');
  const [editManagedUserIds, setEditManagedUserIds] = useState<string[]>([]);
  const [permissionMode, setPermissionMode] = useState<'all' | 'selected'>('selected');
  const [selectedPermissions, setSelectedPermissions] = useState({
    crm: true,
    whatsapp: false,
    email: false,
  });

  // Add Admin User modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'manager' | 'superadmin'>('admin');
  const [addManagedUserIds, setAddManagedUserIds] = useState<string[]>([]);
  const [addPermissionMode, setAddPermissionMode] = useState<'all' | 'selected'>('selected');
  const [addSelectedPermissions, setAddSelectedPermissions] = useState({
    crm: true,
    whatsapp: false,
    email: false,
  });

  // Check permissions on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userStr = localStorage.getItem('admin_user');
    let resolvedUserId = localStorage.getItem('adminUser') || '';
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

    const superAdmin = resolvedUserId === 'admin' || permissions.includes('all');
    setAdminUserId(resolvedUserId || '');
    setIsSuperAdmin(superAdmin);

    if (!superAdmin) {
      router.replace('/admin/crm');
      return;
    }
  }, [router]);

  // Fetch users
  useEffect(() => {
    if (!isSuperAdmin || !token) return;
    void fetchUsers(token);
  }, [isSuperAdmin, token]);

  const fetchUsers = async (authToken: string) => {
    try {
      setIsLoading(true);
      setError('');
      setMessage('');

      const response = await fetch('/api/admin/auth/users', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch users');
      }

      const rows = Array.isArray(data?.data) ? data.data : [];
      setUsers(
        rows
          .map((u: any) => ({
            _id: String(u?._id || ''),
            userId: String(u?.userId || ''),
            email: u?.email ? String(u.email) : undefined,
            name: u?.name ? String(u.name) : undefined,
            permissions: Array.isArray(u?.permissions) ? u.permissions.map((p: any) => String(p)) : undefined,
            role: u?.role || 'admin',
            managedUserIds: Array.isArray(u?.managedUserIds) ? u.managedUserIds.map((id: any) => String(id)) : [],
            createdAt: u?.createdAt ? String(u.createdAt) : undefined,
          }))
          .filter((u: AdminUserRow) => Boolean(u._id) && Boolean(u.userId))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (u: AdminUserRow) => {
    setSelectedUser(u);
    setEditEmail(String(u.email || '').trim());
    setEditName(String(u.name || '').trim());
    setEditPassword('');
    setEditRole((u.role as 'admin' | 'manager' | 'superadmin') || 'admin');
    setEditManagedUserIds(Array.isArray(u.managedUserIds) ? u.managedUserIds : []);
    const perms = Array.isArray(u.permissions) ? u.permissions : [];
    if (perms.includes('all')) {
      setPermissionMode('all');
      setSelectedPermissions({ crm: true, whatsapp: false, email: false });
    } else {
      setPermissionMode('selected');
      setSelectedPermissions({
        crm: perms.includes('crm') || perms.length === 0,
        whatsapp: perms.includes('whatsapp'),
        email: perms.includes('email'),
      });
    }
    setEditMsg('');
    setEditOpen(true);
  };

  const toggleSelectedPermission = (key: keyof typeof selectedPermissions) => {
    setSelectedPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const buildPermissionsPayload = () => {
    if (permissionMode === 'all') return ['all'];
    const chosen = (Object.keys(selectedPermissions) as Array<keyof typeof selectedPermissions>)
      .filter((k) => selectedPermissions[k])
      .map((k) => String(k));
    return chosen;
  };
  const buildAddPermissionsPayload = () => {
    if (addPermissionMode === 'all') return ['all'];
    const chosen = (Object.keys(addSelectedPermissions) as Array<keyof typeof addSelectedPermissions>)
      .filter((k) => addSelectedPermissions[k])
      .map((k) => String(k));
    return chosen;
  };
  const resetAddModal = () => {
    setAddUserId('');
    setAddEmail('');
    setAddPassword('');
    setAddName('');
    setAddRole('admin');
    setAddManagedUserIds([]);
    setAddPermissionMode('selected');
    setAddSelectedPermissions({ crm: true, whatsapp: false, email: false });
    setAddMsg('');
  };

  const openAdd = () => {
    resetAddModal();
    setAddOpen(true);
  };

  const saveAdd = async () => {
    if (!token) {
      setAddMsg('Admin token missing. Please login again.');
      return;
    }
    const userId = addUserId.trim();
    const email = addEmail.trim().toLowerCase();
    const password = addPassword;
    const name = addName.trim();
    const permissions = buildAddPermissionsPayload();
    const role = addRole;
    const managedUserIds = addRole === 'manager' ? addManagedUserIds : [];
    if (!userId) {
      setAddMsg('Username (userId) is required.');
      return;
    }
    if (!email) {
      setAddMsg('Email is required.');
      return;
    }
    if (!password || password.length < 6) {
      setAddMsg('Password must be at least 6 characters.');
      return;
    }
    if (permissions.length === 0) {
      setAddMsg('Select at least one permission (CRM/WhatsApp/Email) or choose Full Access.');
      return;
    }
    setAddBusy(true);
    setAddMsg('');
    try {
      const response = await fetch('/api/admin/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, email, password, name, permissions, role, managedUserIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        // Check if we can convert existing user
        if (data?.canConvert && data?.existingUserId) {
          const confirmConvert = window.confirm(
            `Email "${email}" already exists for user "${data.existingName || data.existingUserId}". \n\nDo you want to convert this user to an admin?`
          );
          if (confirmConvert) {
            // Retry with convertExisting flag
            const retryResponse = await fetch('/api/admin/auth/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ userId, email, password, name, permissions, role, managedUserIds, convertExisting: true }),
            });
            const retryData = await retryResponse.json().catch(() => ({}));
            if (!retryResponse.ok) {
              throw new Error(retryData?.error || 'Failed to convert user');
            }
            setAddMsg(retryData?.converted ? 'User converted to admin successfully!' : 'User added successfully.');
            setAddOpen(false);
            await fetchUsers(token);
            return;
          }
        }
        throw new Error(data?.error || 'Failed to add user');
      }
      setAddMsg('User added successfully.');
      setAddOpen(false);
      await fetchUsers(token);
    } catch (err) {
      setAddMsg(err instanceof Error ? err.message : 'Failed to add user');
    } finally {
      setAddBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!token) {
      setEditMsg('Admin token missing. Please login again.');
      return;
    }
    if (!selectedUser?._id) return;

    const email = editEmail.trim().toLowerCase();
    if (!email) {
      setEditMsg('Email is required.');
      return;
    }

    const permissions = buildPermissionsPayload();
    if (permissions.length === 0) {
      setEditMsg('Select at least one permission (CRM/WhatsApp/Email) or choose Full Access.');
      return;
    }

    const body: Record<string, any> = { email, permissions };
    const name = editName.trim();
    if (name) {
      body.name = name;
    }
    const password = editPassword;
    if (password && password.trim().length > 0) {
      body.password = password;
    }
    // Add role and managedUserIds
    body.role = editRole;
    body.managedUserIds = editRole === 'manager' ? editManagedUserIds : [];

    setEditBusy(true);
    setEditMsg('');
    try {
      const response = await fetch(`/api/admin/auth/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update user');
      }

      const updated = data?.data;
      if (updated?._id) {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === String(updated._id)
              ? {
                  ...u,
                  email: updated?.email ? String(updated.email) : u.email,
                  name: updated?.name ? String(updated.name) : u.name,
                  permissions: Array.isArray(updated?.permissions)
                    ? updated.permissions.map((p: any) => String(p))
                    : u.permissions,
                  role: updated?.role || u.role,
                  managedUserIds: Array.isArray(updated?.managedUserIds)
                    ? updated.managedUserIds.map((id: any) => String(id))
                    : u.managedUserIds,
                }
              : u
          )
        );
      } else {
        // Fallback: refresh
        await fetchUsers(token);
      }

      setEditOpen(false);
      setSelectedUser(null);
      setMessage('User updated successfully.');
    } catch (err) {
      setEditMsg(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setEditBusy(false);
    }
  };

  const deleteUser = async (u: AdminUserRow) => {
    if (!token) {
      setError('Admin token missing. Please login again.');
      return;
    }

    if (u.userId === 'admin') {
      setError('The primary admin user cannot be deleted.');
      return;
    }

    if (u.userId === adminUserId) {
      setError('You cannot delete your own account while logged in.');
      return;
    }

    const ok = window.confirm(`Delete admin user "${u.userId}"? This cannot be undone.`);
    if (!ok) return;

    try {
      setError('');
      setMessage('');
      const response = await fetch(`/api/admin/auth/users/${u._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete user');
      }
      setUsers((prev) => prev.filter((x) => x._id !== u._id));
      setMessage('User deleted successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const PermissionBadges = ({ permissions }: { permissions?: string[] }) => {
    const perms = Array.isArray(permissions) ? permissions : [];
    if (perms.includes('all')) {
      return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">all</span>;
    }
    if (perms.length === 0) {
      return <span className="text-xs text-slate-500">—</span>;
    }
    return (
      <div className="flex flex-wrap gap-1">
        {PERMISSION_KEYS.filter((k) => perms.includes(k)).map((p) => (
          <span key={p} className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
            {p}
          </span>
        ))}
      </div>
    );
  };

  const RoleBadge = ({ role, managedUserIds }: { role?: string; managedUserIds?: string[] }) => {
    const roleLabel = ROLE_OPTIONS.find((r) => r.value === role)?.label || role || 'admin';
    const roleColors: Record<string, string> = {
      superadmin: 'bg-red-100 text-red-700',
      manager: 'bg-yellow-100 text-yellow-700',
      admin: 'bg-green-100 text-green-700',
    };
    const colorClass = roleColors[role || 'admin'] || 'bg-slate-100 text-slate-700';
    const teamCount = Array.isArray(managedUserIds) ? managedUserIds.length : 0;
    return (
      <div className="flex items-center gap-1">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
          {roleLabel}
        </span>
        {role === 'manager' && teamCount > 0 && (
          <span className="text-xs text-slate-400">({teamCount} team)</span>
        )}
      </div>
    );
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600">Access denied. Super admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <nav className="bg-slate-800/50 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-purple-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Admin Users
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Admin User</span>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
                localStorage.removeItem('adminUser');
                router.push('/admin/login');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>
      {/* Add Admin User Modal */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!addBusy) setAddOpen(false);
            }}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-2xl bg-slate-800 rounded-xl shadow-2xl border border-purple-500/30">
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20">
              <h2 className="text-xl font-bold text-green-300">Add Admin User</h2>
              <button
                onClick={() => setAddOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Close"
                disabled={addBusy}
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-5 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-green-300 mb-1">Username (userId)</label>
                  <input
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 bg-slate-700 text-slate-300"
                    placeholder="admin2"
                    disabled={addBusy}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-green-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 bg-slate-700 text-slate-100 placeholder-slate-500"
                    placeholder="John Doe"
                    disabled={addBusy}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-green-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 bg-slate-700 text-slate-100 placeholder-slate-500"
                    placeholder="user@example.com"
                    disabled={addBusy}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-green-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 bg-slate-700 text-slate-100 placeholder-slate-500"
                    placeholder="At least 6 characters"
                    disabled={addBusy}
                  />
                </div>
              </div>
              <div className="mt-5 border-t border-slate-700 pt-4">
                <p className="text-sm font-semibold text-green-300 mb-2">Permissions</p>
                <div className="flex flex-col gap-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="add-permission-mode"
                      checked={addPermissionMode === 'selected'}
                      onChange={() => setAddPermissionMode('selected')}
                      disabled={addBusy}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-semibold text-slate-100">Custom</div>
                      <div className="text-sm text-slate-400">Select CRM/WhatsApp/Email.</div>
                    </div>
                  </label>
                  {addPermissionMode === 'selected' && (
                    <div className="ml-7 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-700/50 rounded-lg p-3">
                      <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addSelectedPermissions.crm}
                          onChange={() => setAddSelectedPermissions((prev) => ({ ...prev, crm: !prev.crm }))}
                          disabled={addBusy}
                        />
                        CRM
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addSelectedPermissions.whatsapp}
                          onChange={() => setAddSelectedPermissions((prev) => ({ ...prev, whatsapp: !prev.whatsapp }))}
                          disabled={addBusy}
                        />
                        WhatsApp
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addSelectedPermissions.email}
                          onChange={() => setAddSelectedPermissions((prev) => ({ ...prev, email: !prev.email }))}
                          disabled={addBusy}
                        />
                        Email
                      </label>
                    </div>
                  )}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="add-permission-mode"
                      checked={addPermissionMode === 'all'}
                      onChange={() => setAddPermissionMode('all')}
                      disabled={addBusy}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-semibold text-slate-100">Full Access (all)</div>
                      <div className="text-sm text-slate-400">Use only for trusted admins.</div>
                    </div>
                  </label>
                </div>
              </div>
              {/* Role Selection */}
              <div className="mt-5 border-t border-slate-700 pt-4">
                <p className="text-sm font-semibold text-green-300 mb-2">Role</p>
                <div className="flex flex-col gap-3">
                  {ROLE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="add-role"
                        checked={addRole === opt.value}
                        onChange={() => setAddRole(opt.value as 'admin' | 'manager' | 'superadmin')}
                        disabled={addBusy}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-semibold text-slate-100">{opt.label}</div>
                        <div className="text-sm text-slate-400">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              {/* Managed Users (for Manager role) */}
              {addRole === 'manager' && (
                <div className="mt-5 border-t border-slate-700 pt-4">
                  <p className="text-sm font-semibold text-green-300 mb-2">Assign Team Members</p>
                  <p className="text-xs text-slate-400 mb-3">Select which admin users this manager can supervise.</p>
                  <div className="max-h-40 overflow-y-auto bg-slate-700/50 rounded-lg p-3">
                    {users.filter((u) => u.userId !== addUserId && u.role !== 'superadmin').length === 0 ? (
                      <p className="text-sm text-slate-400">No other admin users available.</p>
                    ) : (
                      users
                        .filter((u) => u.userId !== addUserId && u.role !== 'superadmin')
                        .map((u) => (
                          <label key={u.userId} className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer py-1">
                            <input
                              type="checkbox"
                              checked={addManagedUserIds.includes(u.userId)}
                              onChange={() => {
                                setAddManagedUserIds((prev) =>
                                  prev.includes(u.userId)
                                    ? prev.filter((id) => id !== u.userId)
                                    : [...prev, u.userId]
                                );
                              }}
                              disabled={addBusy}
                            />
                            {u.name || u.userId} <span className="text-slate-500">({u.email})</span>
                          </label>
                        ))
                    )}
                  </div>
                </div>
              )}
              {addMsg && (
                <div className="mt-4 text-sm">
                  <div className={addMsg.toLowerCase().includes('success') ? 'text-green-400' : 'text-red-400'}>
                    {addMsg}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-2">
              <button
                onClick={() => setAddOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 transition-colors"
                disabled={addBusy}
              >
                Close
              </button>
              <button
                onClick={saveAdd}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-60"
                disabled={addBusy}
              >
                {addBusy ? 'Saving...' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-200">{error}</div>
        )}

        {/* Success Alert */}
        {message && (
          <div className="mb-4 bg-green-900/20 border border-green-500/30 rounded-lg p-4 text-green-200">{message}</div>
        )}

        {/* Users Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-slate-800/50 backdrop-blur border border-purple-500/20 rounded-lg p-8 text-center">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-300 text-lg">No admin users found</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {users.map((u) => {
                const isPrimaryAdmin = u.userId === 'admin';
                const isSelf = Boolean(adminUserId) && u.userId === adminUserId;
                return (
                  <div
                    key={u._id}
                    className="bg-gradient-to-r from-slate-800/80 via-purple-900/60 to-slate-900/80 backdrop-blur border border-purple-500/30 rounded-lg p-6 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                          {u.name || u.userId}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">{u.email || '—'}</p>
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <RoleBadge role={u.role} managedUserIds={u.managedUserIds} />
                          <PermissionBadges permissions={u.permissions} />
                          {u.createdAt && (
                            <span className="text-xs text-slate-500 ml-auto">
                              Created: {new Date(u.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-2 rounded-lg bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 hover:text-blue-200 transition-colors"
                          title="Edit user"
                        >
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteUser(u)}
                          className="p-2 rounded-lg bg-red-600/30 text-red-300 hover:bg-red-600/50 hover:text-red-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          title={isPrimaryAdmin ? 'Primary admin cannot be deleted' : (isSelf ? 'You cannot delete your own account' : 'Delete user')}
                          disabled={isPrimaryAdmin || isSelf}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-400 mb-4">
                Total admin users: <span className="font-semibold text-purple-300">{users.length}</span>
              </p>
              <button
                onClick={() => token && fetchUsers(token)}
                className="text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors px-4 py-2 rounded-lg hover:bg-purple-600/20"
              >
                Refresh
              </button>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!editBusy) setEditOpen(false);
            }}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-2xl bg-slate-800 rounded-xl shadow-2xl border border-purple-500/30">
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-500/20">
              <h2 className="text-xl font-bold text-purple-300">Edit User: {selectedUser.userId}</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                title="Close"
                disabled={editBusy}
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-purple-300 mb-1">Username (userId)</label>
                  <input
                    value={selectedUser.userId}
                    readOnly
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 bg-slate-700 text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-purple-300 mb-1">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 bg-slate-700 text-slate-100 placeholder-slate-500"
                    placeholder="John Doe"
                    disabled={editBusy}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-purple-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 bg-slate-700 text-slate-100 placeholder-slate-500"
                    placeholder="user@example.com"
                    disabled={editBusy}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-purple-300 mb-1">Reset Password (optional)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full border border-slate-600 rounded-lg px-3 py-2 bg-slate-700 text-slate-100 placeholder-slate-500"
                    placeholder="Leave blank to keep current password"
                    disabled={editBusy}
                  />
                  <p className="mt-1 text-xs text-slate-400">If you enter a password, it must be at least 6 characters.</p>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-700 pt-4">
                <p className="text-sm font-semibold text-purple-300 mb-2">Permissions</p>
                <div className="flex flex-col gap-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="permission-mode"
                      checked={permissionMode === 'selected'}
                      onChange={() => setPermissionMode('selected')}
                      disabled={editBusy}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-semibold text-slate-100">Custom</div>
                      <div className="text-sm text-slate-400">Select CRM/WhatsApp/Email.</div>
                    </div>
                  </label>

                  {permissionMode === 'selected' && (
                    <div className="ml-7 grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-700/50 rounded-lg p-3">
                      <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.crm}
                          onChange={() => toggleSelectedPermission('crm')}
                          disabled={editBusy}
                        />
                        CRM
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.whatsapp}
                          onChange={() => toggleSelectedPermission('whatsapp')}
                          disabled={editBusy}
                        />
                        WhatsApp
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.email}
                          onChange={() => toggleSelectedPermission('email')}
                          disabled={editBusy}
                        />
                        Email
                      </label>
                    </div>
                  )}

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="permission-mode"
                      checked={permissionMode === 'all'}
                      onChange={() => setPermissionMode('all')}
                      disabled={editBusy}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-semibold text-slate-100">Full Access (all)</div>
                      <div className="text-sm text-slate-400">Use only for trusted admins.</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Role Selection */}
              <div className="mt-5 border-t border-slate-700 pt-4">
                <p className="text-sm font-semibold text-purple-300 mb-2">Role</p>
                <div className="flex flex-col gap-3">
                  {ROLE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="edit-role"
                        checked={editRole === opt.value}
                        onChange={() => setEditRole(opt.value as 'admin' | 'manager' | 'superadmin')}
                        disabled={editBusy}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-semibold text-slate-100">{opt.label}</div>
                        <div className="text-sm text-slate-400">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Managed Users (for Manager role) */}
              {editRole === 'manager' && (
                <div className="mt-5 border-t border-slate-700 pt-4">
                  <p className="text-sm font-semibold text-purple-300 mb-2">Assign Team Members</p>
                  <p className="text-xs text-slate-400 mb-3">Select which admin users this manager can supervise.</p>
                  <div className="max-h-40 overflow-y-auto bg-slate-700/50 rounded-lg p-3">
                    {users.filter((u) => u.userId !== selectedUser?.userId && u.role !== 'superadmin').length === 0 ? (
                      <p className="text-sm text-slate-400">No other admin users available.</p>
                    ) : (
                      users
                        .filter((u) => u.userId !== selectedUser?.userId && u.role !== 'superadmin')
                        .map((u) => (
                          <label key={u.userId} className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer py-1">
                            <input
                              type="checkbox"
                              checked={editManagedUserIds.includes(u.userId)}
                              onChange={() => {
                                setEditManagedUserIds((prev) =>
                                  prev.includes(u.userId)
                                    ? prev.filter((id) => id !== u.userId)
                                    : [...prev, u.userId]
                                );
                              }}
                              disabled={editBusy}
                            />
                            {u.name || u.userId} <span className="text-slate-500">({u.email})</span>
                          </label>
                        ))
                    )}
                  </div>
                </div>
              )}

              {editMsg && (
                <div className="mt-4 text-sm">
                  <div className={editMsg.toLowerCase().includes('success') ? 'text-green-400' : 'text-red-400'}>
                    {editMsg}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 transition-colors"
                disabled={editBusy}
              >
                Close
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-60"
                disabled={editBusy}
              >
                {editBusy ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
