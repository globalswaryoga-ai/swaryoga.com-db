'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, LogOut, Menu, X, UserPlus, Pencil, Trash2, Shield } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import PermissionManager from '@/components/admin/PermissionManager';
import { UserPermissions, migrateOldPermissions, getUserPermissionsList } from '@/lib/permissions';

type AdminUserRow = {
  _id: string;
  userId: string;
  email?: string;
  permissions?: string[]; // Legacy
  permissionsV2?: UserPermissions; // New granular permissions
  createdAt?: string;
};

const PERMISSION_KEYS = ['crm', 'whatsapp', 'email'] as const;

export default function AdminUsersPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
  
  // Add User state
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Permission state - supports both legacy and new V2
  const [permissionMode, setPermissionMode] = useState<'legacy' | 'granular'>('granular');
  const [selectedPermissions, setSelectedPermissions] = useState({
    crm: true,
    whatsapp: false,
    email: false,
  });
  const [granularPermissions, setGranularPermissions] = useState<UserPermissions>({ isSuperAdmin: false });

  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const resolvedToken = localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';
    if (!resolvedToken) {
      router.replace('/admin/login');
      return;
    }

    // Resolve userId + permissions from admin_user (preferred), fallback to legacy keys.
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

    setIsAuthenticated(true);
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated || !isSuperAdmin) return;
    if (!token) return;
    void fetchUsers(token);
  }, [isAuthenticated, isSuperAdmin, token]);

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
            permissions: Array.isArray(u?.permissions) ? u.permissions.map((p: any) => String(p)) : undefined,
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

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const openAdd = () => {
    setNewUserId('');
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setAddMsg('');
    setPermissionMode('granular');
    setGranularPermissions({ isSuperAdmin: false });
    setSelectedPermissions({ crm: true, whatsapp: false, email: false });
    setAddOpen(true);
  };

  const createAdminUser = async () => {
    const adminToken = localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';
    if (!adminToken) {
      setAddMsg('Admin token missing. Please login again.');
      return;
    }

    const userId = newUserId.trim();
    const email = newEmail.trim().toLowerCase();
    const name = newName.trim();
    const password = newPassword;

    if (!userId || !email || !password) {
      setAddMsg('Username, email, and password are required.');
      return;
    }

    // Determine permissions to send using existing helper logic
    const { permissions, permissionsV2 } = buildPermissionsPayload();

    setAddBusy(true);
    setAddMsg('');
    try {
      const response = await fetch('/api/admin/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId,
          email,
          name: name || userId,
          password,
          permissions,
          permissionsV2,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create user');
      }

      setAddMsg(`User created: ${userId}`);
      setAddOpen(false);
      // Refresh list
      fetchUsers(token);
    } catch (err) {
      setAddMsg(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setAddBusy(false);
    }
  };

  const openEdit = (u: AdminUserRow) => {
    setSelectedUser(u);
    setEditEmail(String(u.email || '').trim());
    setEditPassword('');
    
    // Load permissions - prefer V2, fallback to legacy
    if (u.permissionsV2) {
      setPermissionMode('granular');
      setGranularPermissions(u.permissionsV2);
    } else {
      // Migrate legacy permissions to V2 format
      const legacyPerms = Array.isArray(u.permissions) ? u.permissions : [];
      const migratedPerms = migrateOldPermissions(legacyPerms);
      setPermissionMode('granular');
      setGranularPermissions(migratedPerms);
      
      // Also set legacy checkboxes for backward compatibility view
      setSelectedPermissions({
        crm: legacyPerms.includes('crm') || legacyPerms.includes('all') || legacyPerms.length === 0,
        whatsapp: legacyPerms.includes('whatsapp') || legacyPerms.includes('all'),
        email: legacyPerms.includes('email') || legacyPerms.includes('all'),
      });
    }
    
    setEditMsg('');
    setEditOpen(true);
  };

  const toggleSelectedPermission = (key: keyof typeof selectedPermissions) => {
    setSelectedPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const buildPermissionsPayload = () => {
    if (permissionMode === 'granular') {
      // Use new granular permissions
      return {
        permissionsV2: granularPermissions,
        // Also generate legacy array for backward compatibility
        permissions: getUserPermissionsList(granularPermissions),
      };
    } else {
      // Legacy mode (for backward compatibility)
      const chosen = (Object.keys(selectedPermissions) as Array<keyof typeof selectedPermissions>)
        .filter((k) => selectedPermissions[k])
        .map((k) => String(k));
      return {
        permissions: chosen.length > 0 ? chosen : ['crm'],
        permissionsV2: migrateOldPermissions(chosen),
      };
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

    const permissionsPayload = buildPermissionsPayload();
    
    // Validate that at least some permission is granted
    if (permissionMode === 'granular' && !granularPermissions.isSuperAdmin) {
      const hasSomePermission = Object.keys(granularPermissions).some(key => {
        if (key === 'isSuperAdmin') return false;
        const permGroup = (granularPermissions as any)[key];
        return permGroup && typeof permGroup === 'object' && Object.values(permGroup).some(v => v === true);
      });
      
      if (!hasSomePermission) {
        setEditMsg('Select at least one permission or enable Super Administrator.');
        return;
      }
    }

    const body: Record<string, any> = { 
      email, 
      ...permissionsPayload 
    };
    
    const password = editPassword;
    if (password && password.trim().length > 0) {
      body.password = password;
    }

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
                  permissions: Array.isArray(updated?.permissions)
                    ? updated.permissions.map((p: any) => String(p))
                    : u.permissions,
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

  const PermissionBadges = ({ user }: { user: AdminUserRow }) => {
    const legacyPerms = Array.isArray(user.permissions) ? user.permissions : [];
    const v2Perms = user.permissionsV2;
    
    // Show V2 if available, otherwise fall back to legacy
    if (v2Perms) {
      if (v2Perms.isSuperAdmin) {
        return (
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-purple-600" />
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
              Super Admin
            </span>
          </div>
        );
      }
      
      // Count enabled modules
      const enabledModules: string[] = [];
      Object.keys(v2Perms).forEach((permKey) => {
        if (permKey === 'isSuperAdmin') return;
        const modulePerms = (v2Perms as any)[permKey];
        if (modulePerms && typeof modulePerms === 'object') {
          const hasAnyPermission = Object.values(modulePerms).some(v => v === true);
          if (hasAnyPermission) {
            enabledModules.push(permKey);
          }
        }
      });
      
      if (enabledModules.length === 0) {
        return <span className="text-xs text-red-600">No permissions</span>;
      }
      
      return (
        <div className="flex flex-wrap gap-1">
          {enabledModules.slice(0, 3).map((moduleName) => (
            <span key={moduleName} className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              {moduleName}
            </span>
          ))}
          {enabledModules.length > 3 && (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              +{enabledModules.length - 3} more
            </span>
          )}
        </div>
      );
    }
    
    // Legacy permission display
    if (legacyPerms.includes('all')) {
      return (
        <div className="flex items-center gap-1">
          <Shield className="w-3 h-3 text-blue-600" />
          <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            all (legacy)
          </span>
        </div>
      );
    }
    
    if (legacyPerms.length === 0) {
      return <span className="text-xs text-swar-text-secondary">—</span>;
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {PERMISSION_KEYS.filter((k) => legacyPerms.includes(k)).map((p) => (
          <span key={p} className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-swar-primary-light text-swar-text">
            {p}
          </span>
        ))}
      </div>
    );
  };

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-swar-primary-light">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
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
                <Users className="h-8 w-8 text-purple-600" />
                <span>Admin Users</span>
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                title="Add new admin user"
              >
                <UserPlus className="h-5 w-5" />
                <span className="font-semibold hidden sm:inline">Add Users</span>
              </button>
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

        <main className="flex-1 overflow-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-4">{error}</div>
          )}
          {message && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 mb-4">{message}</div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swar-primary"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="bg-swar-bg border border-swar-border rounded-lg p-8 text-center">
              <Users className="h-12 w-12 text-swar-text-secondary mx-auto mb-4" />
              <p className="text-swar-text-secondary text-lg">No admin users found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-swar-bg border-b border-swar-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">User ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Permissions</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-swar-text">Created</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-swar-text">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, index) => {
                      const isPrimaryAdmin = u.userId === 'admin';
                      const isSelf = Boolean(adminUserId) && u.userId === adminUserId;
                      return (
                        <tr key={u._id} className={index % 2 === 0 ? 'bg-white' : 'bg-swar-bg'}>
                          <td className="px-6 py-4 text-sm text-swar-text font-semibold">{u.userId}</td>
                          <td className="px-6 py-4 text-sm text-swar-text-secondary">{u.email || '—'}</td>
                          <td className="px-6 py-4 text-sm">
                            <PermissionBadges user={u} />
                          </td>
                          <td className="px-6 py-4 text-sm text-swar-text-secondary">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(u)}
                                className="p-2 rounded-lg bg-swar-primary-light text-swar-text hover:bg-swar-border transition-colors"
                                title="Edit user"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteUser(u)}
                                className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60"
                                title={isPrimaryAdmin ? 'Primary admin cannot be deleted' : (isSelf ? 'You cannot delete your own account' : 'Delete user')}
                                disabled={isPrimaryAdmin || isSelf}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-swar-bg border-t border-swar-border px-6 py-4 flex items-center justify-between">
                <p className="text-sm text-swar-text-secondary">
                  Total admin users: <span className="font-semibold text-swar-text">{users.length}</span>
                </p>
                <button
                  onClick={() => fetchUsers(token)}
                  className="text-sm font-semibold text-blue-700 hover:underline"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {editOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!editBusy) setEditOpen(false);
            }}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-xl border border-swar-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-swar-border">
              <h2 className="text-xl font-bold text-swar-text">Edit User: {selectedUser.userId}</h2>
              <button
                onClick={() => setEditOpen(false)}
                className="p-2 rounded-lg hover:bg-swar-primary-light"
                title="Close"
                disabled={editBusy}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-1">Username (userId)</label>
                  <input
                    value={selectedUser.userId}
                    readOnly
                    className="w-full border border-swar-border rounded-lg px-3 py-2 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full border border-swar-border rounded-lg px-3 py-2"
                    placeholder="user@example.com"
                    disabled={editBusy}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-swar-text mb-1">Reset Password (optional)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full border border-swar-border rounded-lg px-3 py-2"
                    placeholder="Leave blank to keep current password"
                    disabled={editBusy}
                  />
                  <p className="mt-1 text-xs text-swar-text-secondary">If you enter a password, it must be at least 6 characters.</p>
                </div>
              </div>

              <div className="mt-5 border-t border-swar-border pt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-swar-text">Permissions</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPermissionMode('legacy')}
                      className={`text-xs px-3 py-1 rounded ${
                        permissionMode === 'legacy' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      disabled={editBusy}
                    >
                      Legacy View
                    </button>
                    <button
                      onClick={() => setPermissionMode('granular')}
                      className={`text-xs px-3 py-1 rounded ${
                        permissionMode === 'granular' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      disabled={editBusy}
                    >
                      Granular Permissions
                    </button>
                  </div>
                </div>

                {permissionMode === 'granular' ? (
                  <PermissionManager
                    initialPermissions={granularPermissions}
                    onChange={setGranularPermissions}
                    disabled={editBusy}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                      ⚠️ <strong>Legacy Mode:</strong> This is the old permission system. We recommend using Granular Permissions for better control.
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-swar-primary-light rounded-lg p-3">
                      <label className="flex items-center gap-2 text-sm text-swar-text">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.crm}
                          onChange={() => toggleSelectedPermission('crm')}
                          disabled={editBusy}
                        />
                        CRM
                      </label>
                      <label className="flex items-center gap-2 text-sm text-swar-text">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.whatsapp}
                          onChange={() => toggleSelectedPermission('whatsapp')}
                          disabled={editBusy}
                        />
                        WhatsApp
                      </label>
                      <label className="flex items-center gap-2 text-sm text-swar-text">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.email}
                          onChange={() => toggleSelectedPermission('email')}
                          disabled={editBusy}
                        />
                        Email
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {editMsg && (
                <div className="mt-4 text-sm">
                  <div className={editMsg.toLowerCase().includes('success') ? 'text-green-700' : 'text-red-700'}>
                    {editMsg}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-swar-border flex items-center justify-end gap-2">
              <button
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                disabled={editBusy}
              >
                Close
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={editBusy}
              >
                {editBusy ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!addBusy) setAddOpen(false);
            }}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-xl border border-swar-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-swar-border sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-swar-text">Add New Admin User</h2>
              <button
                onClick={() => setAddOpen(false)}
                className="p-2 rounded-lg hover:bg-swar-primary-light"
                title="Close"
                disabled={addBusy}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-1">Username (ID) *</label>
                  <input
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="w-full border border-swar-border rounded-lg px-3 py-2"
                    placeholder="e.g. rahul_admin"
                    disabled={addBusy}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-1">Full Name</label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full border border-swar-border rounded-lg px-3 py-2"
                    placeholder="e.g. Rahul Sharma"
                    disabled={addBusy}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full border border-swar-border rounded-lg px-3 py-2"
                    placeholder="rahul@example.com"
                    disabled={addBusy}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-1">Password *</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border border-swar-border rounded-lg px-3 py-2"
                    placeholder="At least 6 characters"
                    disabled={addBusy}
                  />
                </div>
              </div>

              <div className="mt-5 border-t border-swar-border pt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-swar-text">Permissions</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPermissionMode('legacy')}
                      className={`text-xs px-3 py-1 rounded ${
                        permissionMode === 'legacy' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      disabled={addBusy}
                    >
                      Legacy
                    </button>
                    <button
                      onClick={() => setPermissionMode('granular')}
                      className={`text-xs px-3 py-1 rounded ${
                        permissionMode === 'granular' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      disabled={addBusy}
                    >
                      Granular
                    </button>
                  </div>
                </div>

                {permissionMode === 'granular' ? (
                  <PermissionManager
                    initialPermissions={granularPermissions}
                    onChange={setGranularPermissions}
                    disabled={addBusy}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-swar-primary-light rounded-lg p-3">
                    <label className="flex items-center gap-2 text-sm text-swar-text">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.crm}
                        onChange={() => toggleSelectedPermission('crm')}
                        disabled={addBusy}
                      />
                      CRM
                    </label>
                    <label className="flex items-center gap-2 text-sm text-swar-text">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.whatsapp}
                        onChange={() => toggleSelectedPermission('whatsapp')}
                        disabled={addBusy}
                      />
                      WhatsApp
                    </label>
                    <label className="flex items-center gap-2 text-sm text-swar-text">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.email}
                        onChange={() => toggleSelectedPermission('email')}
                        disabled={addBusy}
                      />
                      Email
                    </label>
                  </div>
                )}
              </div>

              {addMsg && (
                <div className="mt-4 text-sm">
                  <div className={addMsg.toLowerCase().includes('success') || addMsg.toLowerCase().includes('created') ? 'text-green-700' : 'text-red-700'}>
                    {addMsg}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-swar-border flex items-center justify-end gap-2 sticky bottom-0 bg-white">
              <button
                onClick={() => setAddOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
                disabled={addBusy}
              >
                Close
              </button>
              <button
                onClick={createAdminUser}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={addBusy}
              >
                {addBusy ? 'Creating...' : 'Create Admin Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
