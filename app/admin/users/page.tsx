'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users, LogOut, Menu, X, UserPlus, Pencil, Trash2, Shield, Eye, EyeOff,
  ArrowLeft, Search, RefreshCw, Sparkles, AlertCircle, Check, Mail, Key
} from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';
import PermissionManager from '@/components/admin/PermissionManager';
import { UserPermissions, PERMISSION_PRESETS, migrateOldPermissions, getUserPermissionsList } from '@/lib/permissions';

type AdminUserRow = {
  _id: string;
  userId: string;
  name?: string;
  email?: string;
  role?: string;
  permissions?: string[]; // Legacy
  permissionsV2?: UserPermissions; // New granular permissions
  createdAt?: string;
};

const ROLE_OPTIONS = [
  { value: 'superadmin', label: 'Super Admin', color: 'bg-purple-100 text-purple-700', description: 'Full access to everything' },
  { value: 'dm', label: 'DM', color: 'bg-indigo-100 text-indigo-700', description: 'All access, no delete/edit' },
  { value: 'manager', label: 'Manager', color: 'bg-blue-100 text-blue-700', description: 'Admin decides permissions' },
  { value: 'admin', label: 'Admin User', color: 'bg-teal-100 text-teal-700', description: 'CRM, sales, calls only' },
] as const;

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
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'superadmin' | 'manager' | 'admin'>('all');

  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  
  // Add User state
  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addMsg, setAddMsg] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('admin');
  const [editRole, setEditRole] = useState('admin');
  
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

    const resolvedToken = localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '';
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
            name: u?.name ? String(u.name) : undefined,
            email: u?.email ? String(u.email) : undefined,
            role: u?.role ? String(u.role) : undefined,
            permissions: Array.isArray(u?.permissions) ? u.permissions.map((p: any) => String(p)) : undefined,
            permissionsV2: u?.permissionsV2 || undefined,
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
    setShowNewPassword(false);
    setAddMsg('');
    setSelectedRole('admin');
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
          role: selectedRole,
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
    setEditName(String(u.name || '').trim());
    setEditEmail(String(u.email || '').trim());
    setEditPassword('');
    setShowEditPassword(false);
    setEditRole(u.role || 'admin');
    
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

  const handleRoleChange = (role: string, isEdit: boolean) => {
    if (isEdit) {
      setEditRole(role);
    } else {
      setSelectedRole(role);
    }
    
    // Auto-apply permission preset based on role
    if (role === 'superadmin') {
      setPermissionMode('granular');
      setGranularPermissions(PERMISSION_PRESETS.SUPER_ADMIN);
    } else if (role === 'dm') {
      setPermissionMode('granular');
      setGranularPermissions(PERMISSION_PRESETS.DM);
    } else if (role === 'manager') {
      setPermissionMode('granular');
      setGranularPermissions(PERMISSION_PRESETS.CRM_MANAGER);
    } else if (role === 'admin') {
      setPermissionMode('granular');
      setGranularPermissions(PERMISSION_PRESETS.ADMIN_USER);
    }
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

    const name = editName.trim();

    const body: Record<string, any> = { 
      email,
      name: name || undefined,
      role: editRole,
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
                  name: updated?.name ? String(updated.name) : u.name,
                  email: updated?.email ? String(updated.email) : u.email,
                  permissions: Array.isArray(updated?.permissions)
                    ? updated.permissions.map((p: any) => String(p))
                    : u.permissions,
                  permissionsV2: updated?.permissionsV2 || u.permissionsV2,
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

  const counts = useMemo(() => {
    let superadmin = 0;
    let manager = 0;
    let admin = 0;
    for (const u of users) {
      if (u.role === 'superadmin') superadmin++;
      else if (u.role === 'manager' || u.role === 'dm') manager++;
      else admin++;
    }
    return { all: users.length, superadmin, manager, admin };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'superadmin' && u.role === 'superadmin') ||
        (roleFilter === 'manager' && (u.role === 'manager' || u.role === 'dm')) ||
        (roleFilter === 'admin' && (u.role === 'admin' || !u.role));

      if (!matchesRole) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.userId?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, searchQuery]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top vibrant accent stripe */}
        <div className="h-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 w-full" />

        {/* Header Bar */}
        <header className="bg-white border-b border-slate-200/80 shadow-xs z-10">
          <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <Link
                href="/admin/crm/web-admin"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Web Admin</span>
              </Link>

              <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20 flex-shrink-0">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Admin Users
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      Bunny Auth
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 hidden sm:block">
                    Staff role definitions, granular module permissions & security access control
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={() => fetchUsers(token)}
                title="Refresh users"
                className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
              </button>
              <button
                onClick={openAdd}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-purple-500/20 transition flex items-center gap-2"
                title="Add new admin user"
              >
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Admin</span>
              </button>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-900 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{message}</span>
            </div>
          )}

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total */}
            <div
              onClick={() => setRoleFilter('all')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                roleFilter === 'all'
                  ? 'bg-gradient-to-br from-purple-500/15 via-indigo-500/10 to-white border-purple-400 shadow-md shadow-purple-500/10'
                  : 'bg-white border-slate-200/80 hover:border-purple-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Admins</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{counts.all}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-purple-700 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>All authorized staff</span>
              </div>
            </div>

            {/* Card 2: Super Admin */}
            <div
              onClick={() => setRoleFilter('superadmin')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                roleFilter === 'superadmin'
                  ? 'bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-white border-violet-400 shadow-md shadow-violet-500/10'
                  : 'bg-white border-slate-200/80 hover:border-violet-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Super Admins</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-violet-600 mt-1">{counts.superadmin}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-violet-600 to-purple-700 flex items-center justify-center text-white shadow-md shadow-violet-500/25">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-violet-700 font-medium">
                <Shield className="w-3.5 h-3.5" />
                <span>Unrestricted system access</span>
              </div>
            </div>

            {/* Card 3: Managers & DMs */}
            <div
              onClick={() => setRoleFilter('manager')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                roleFilter === 'manager'
                  ? 'bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-white border-blue-400 shadow-md shadow-blue-500/10'
                  : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Managers & DMs</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1">{counts.manager}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-700 font-medium">
                <span>Operational supervisors</span>
              </div>
            </div>

            {/* Card 4: Standard Staff */}
            <div
              onClick={() => setRoleFilter('admin')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                roleFilter === 'admin'
                  ? 'bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-white border-teal-400 shadow-md shadow-teal-500/10'
                  : 'bg-white border-slate-200/80 hover:border-teal-300 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin Staff</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-teal-600 mt-1">{counts.admin}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-teal-500/25">
                  <Key className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-teal-700 font-medium">
                <span>CRM & sales operators</span>
              </div>
            </div>
          </div>

          {/* Search & Role Filters Bar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  roleFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Roles ({counts.all})
              </button>
              <button
                onClick={() => setRoleFilter('superadmin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  roleFilter === 'superadmin'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
                }`}
              >
                Super Admin ({counts.superadmin})
              </button>
              <button
                onClick={() => setRoleFilter('manager')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  roleFilter === 'manager'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-blue-700 hover:text-blue-900 hover:bg-blue-50'
                }`}
              >
                Manager & DM ({counts.manager})
              </button>
              <button
                onClick={() => setRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  roleFilter === 'admin'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-teal-700 hover:text-teal-900 hover:bg-teal-50'
                }`}
              >
                Admin Staff ({counts.admin})
              </button>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user ID, name, email, role..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-xs transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-600 border-t-transparent" />
              <p className="text-xs font-semibold text-slate-600">Connecting to Bunny Auth & loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <Users className="h-7 w-7" />
              </div>
              <p className="text-slate-800 font-bold text-base">
                {searchQuery ? 'No admin users match your search filter' : 'No admin users found'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery ? 'Try searching by a different name or user ID' : 'Click "Add Admin" above to create an account.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">User ID & Name</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">Role & Access</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">Email Contact</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">Permissions Matrix</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">Created</th>
                      <th className="px-4 py-3.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const isPrimaryAdmin = u.userId === 'admin';
                      const isSelf = Boolean(adminUserId) && u.userId === adminUserId;
                      const roleInfo = ROLE_OPTIONS.find((r) => r.value === u.role) || ROLE_OPTIONS[3];
                      const initials = (u.name || u.userId || 'A').slice(0, 2).toUpperCase();

                      return (
                        <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-slate-900">{u.userId}</div>
                                <div className="text-[11px] text-slate-500">{u.name || 'No full name'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              title={roleInfo.description}
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${
                                u.role === 'superadmin'
                                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                                  : u.role === 'manager' || u.role === 'dm'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : 'bg-teal-100 text-teal-800 border-teal-200'
                              }`}
                            >
                              {roleInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            {u.email ? (
                              <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                                <Mail className="w-3.5 h-3.5 text-slate-400" />
                                <span>{u.email}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">No email</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <PermissionBadges user={u} />
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => openEdit(u)}
                                className="p-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition shadow-xs"
                                title="Edit user permissions"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => deleteUser(u)}
                                className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                title={
                                  isPrimaryAdmin
                                    ? 'Primary admin cannot be deleted'
                                    : isSelf
                                    ? 'You cannot delete your own account'
                                    : 'Delete user'
                                }
                                disabled={isPrimaryAdmin || isSelf}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Stats Footer */}
              <div className="bg-slate-50 border-t border-slate-200/80 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 font-medium">
                <div>
                  Showing <span className="font-bold text-slate-900">{filteredUsers.length}</span> of{' '}
                  <span className="font-bold text-slate-900">{users.length}</span> admin accounts
                </div>
                <div className="flex items-center gap-4">
                  <span>Super Admins: <strong className="text-purple-800">{counts.superadmin}</strong></span>
                  <span>Managers: <strong className="text-blue-800">{counts.manager}</strong></span>
                  <span>Admins: <strong className="text-teal-800">{counts.admin}</strong></span>
                </div>
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
          <div className="relative w-full max-w-2xl mx-4 bg-white rounded-xl shadow-xl border border-swar-border max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-swar-border sticky top-0 bg-white z-10">
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
                  <label className="block text-sm font-semibold text-swar-text mb-1">Full Name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-swar-border rounded-lg px-3 py-2"
                    placeholder="e.g. Rahul Sharma"
                    disabled={editBusy}
                  />
                </div>
                <div className="md:col-span-2">
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
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full border border-swar-border rounded-lg px-3 py-2 pr-10"
                      placeholder="Leave blank to keep current password"
                      disabled={editBusy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    >
                      {showEditPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-swar-text-secondary">If you enter a password, it must be at least 6 characters.</p>
                </div>
              </div>

              {/* Role Selector for Edit */}
              <div className="mt-5 border-t border-swar-border pt-4">
                <p className="text-sm font-semibold text-swar-text mb-3">Role</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => handleRoleChange(role.value, true)}
                      disabled={editBusy}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        editRole === role.value
                          ? `${role.color} border-current`
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      } ${editBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium text-sm">{role.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{role.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 border-t border-swar-border pt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-swar-text">Permissions</p>
                  {editRole !== 'superadmin' && (
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
                  )}
                </div>

                {editRole === 'superadmin' ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Super Administrator</p>
                    <p className="text-sm text-gray-600">Full access to all features and data</p>
                  </div>
                ) : permissionMode === 'granular' ? (
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

            <div className="px-6 py-4 border-t border-swar-border flex items-center justify-end gap-2 sticky bottom-0 bg-white">
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
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border border-swar-border rounded-lg px-3 py-2 pr-10"
                      placeholder="At least 6 characters"
                      disabled={addBusy}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    >
                      {showNewPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Role Selector */}
              <div className="mt-5 border-t border-swar-border pt-4">
                <p className="text-sm font-semibold text-swar-text mb-3">Role</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => handleRoleChange(role.value, false)}
                      disabled={addBusy}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedRole === role.value
                          ? `${role.color} border-current`
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      } ${addBusy ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium text-sm">{role.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{role.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 border-t border-swar-border pt-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-swar-text">Permissions</p>
                  {selectedRole !== 'superadmin' && (
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
                  )}
                </div>

                {selectedRole === 'superadmin' ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <Shield className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900">Super Administrator</p>
                    <p className="text-sm text-gray-600">Full access to all features and data</p>
                  </div>
                ) : permissionMode === 'granular' ? (
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
