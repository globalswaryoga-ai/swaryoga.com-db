'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import {
  Users,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Mail,
  Phone,
  Globe,
  Calendar,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  ArrowUpDown,
  X,
  Eye,
  Send,
} from 'lucide-react';

interface UserData {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  country: string;
  state: string;
  gender: string;
  age: string;
  profession: string;
  role: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  orderCount?: number;
  totalSpent?: number;
}

export default function SuperAdminUsersPage() {
  const router = useRouter();
  const token = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(25);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [converting, setConverting] = useState(false);
  const [convertMsg, setConvertMsg] = useState('');

  // User detail modal
  const [viewUser, setViewUser] = useState<UserData | null>(null);

  useEffect(() => {
    if (!checkIsSuperAdmin()) router.replace('/admin/crm');
  }, [router]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(page * limit),
        sortBy,
        sortOrder,
        hasOrders: 'true',
      });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (genderFilter) params.set('gender', genderFilter);
      if (countryFilter) params.set('country', countryFilter);

      const res = await fetch(`/api/admin/crm/super-admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push(getLoginPath()); return; }
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, search, roleFilter, genderFilter, countryFilter, sortBy, sortOrder, router]);

  useEffect(() => { if (token) fetchUsers(); }, [token]);

  const totalPages = Math.ceil(total / limit);

  const toggleSelect = (id: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.userId || u._id)));
    }
  };

  const convertToLeads = async () => {
    if (selectedUsers.size === 0) return;
    try {
      setConverting(true);
      setConvertMsg('');
      const res = await fetch('/api/admin/crm/super-admin/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: Array.from(selectedUsers) }),
      });
      if (!res.ok) throw new Error('Failed to convert to leads');
      const data = await res.json();
      const created = data.results?.filter((r: any) => r.status === 'created').length || 0;
      const exists = data.results?.filter((r: any) => r.status === 'exists').length || 0;
      setConvertMsg(`${created} new leads created${exists ? `, ${exists} already existed` : ''}`);
      setSelectedUsers(new Set());
    } catch (err: any) {
      setConvertMsg(err.message);
    } finally {
      setConverting(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(0);
  };

  const exportCSV = () => {
    if (users.length === 0) return;
    const headers = ['Name', 'Email', 'Phone', 'Country', 'Gender', 'Role', 'Orders', 'Spent', 'Signup Date'];
    const rows = users.map((u) => [
      u.name || '', u.email || '', u.phone || '', u.country || '', u.gender || '',
      u.role || 'user', u.orderCount || 0, u.totalSpent || 0,
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'users-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              All Users
            </h1>
            <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} users registered on the platform</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 text-gray-700">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={fetchUsers} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 text-gray-700">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, userId..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>

          {showFilters && (
            <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t">
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="">All Roles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
                <option value="manager">Manager</option>
              </select>
              <select
                value={genderFilter}
                onChange={(e) => { setGenderFilter(e.target.value); setPage(0); }}
                className="px-3 py-2 border rounded-lg text-sm bg-white"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="text"
                placeholder="Country filter..."
                value={countryFilter}
                onChange={(e) => { setCountryFilter(e.target.value); setPage(0); }}
                className="px-3 py-2 border rounded-lg text-sm w-40"
              />
              <button
                onClick={() => { setRoleFilter(''); setGenderFilter(''); setCountryFilter(''); setSearch(''); setPage(0); }}
                className="text-xs text-red-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Selected actions */}
        {selectedUsers.size > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm text-indigo-700 font-medium">{selectedUsers.size} user(s) selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={convertToLeads}
                disabled={converting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {converting ? 'Converting...' : 'Convert to Leads'}
              </button>
              <button onClick={() => setSelectedUsers(new Set())} className="text-sm text-gray-500 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {convertMsg && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${convertMsg.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {convertMsg.includes('Failed') ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {convertMsg}
            <button onClick={() => setConvertMsg('')} className="ml-auto"><X className="w-3 h-3" /></button>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-500">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size === users.length && users.length > 0}
                        onChange={selectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-3 py-3 text-left">
                      <button onClick={() => handleSort('name')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">
                        User <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left hidden md:table-cell">
                      <button onClick={() => handleSort('email')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">
                        Contact <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left hidden lg:table-cell font-semibold text-gray-600">Location</th>
                    <th className="px-3 py-3 text-left hidden lg:table-cell font-semibold text-gray-600">Role</th>
                    <th className="px-3 py-3 text-left hidden xl:table-cell font-semibold text-gray-600">Orders</th>
                    <th className="px-3 py-3 text-left">
                      <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1 font-semibold text-gray-600 hover:text-gray-900">
                        Signup <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map((user) => {
                    const uid = user.userId || user._id;
                    return (
                      <tr key={user._id} className="hover:bg-gray-50 transition">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(uid)}
                            onChange={() => toggleSelect(uid)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold flex-shrink-0">
                              {(user.name || user.userId || '?')[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{user.name || user.userId || 'Unknown'}</p>
                              <p className="text-xs text-gray-400 truncate">{user.userId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          <p className="text-gray-700 truncate">{user.email || '-'}</p>
                          <p className="text-xs text-gray-400">{user.phone || '-'}</p>
                        </td>
                        <td className="px-3 py-3 hidden lg:table-cell text-gray-600">
                          {user.country || '-'}
                          {user.state ? `, ${user.state}` : ''}
                        </td>
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                            user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                            user.isAdmin ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {user.role || (user.isAdmin ? 'admin' : 'user')}
                          </span>
                        </td>
                        <td className="px-3 py-3 hidden xl:table-cell">
                          {user.orderCount && user.orderCount > 0 ? (
                            <div>
                              <span className="text-gray-700">{user.orderCount} orders</span>
                              <p className="text-xs text-green-600">₹{user.totalSpent?.toLocaleString()}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-gray-600 text-xs">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</p>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewUser(user)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {user.phone && (
                              <a
                                href={`https://wa.me/${user.phone?.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </a>
                            )}
                            {user.email && (
                              <a
                                href={`mailto:${user.email}`}
                                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"
                                title="Email"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-400">
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-sm text-gray-500">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-sm font-medium text-gray-700">{page + 1} / {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setViewUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
              <button onClick={() => setViewUser(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xl font-bold">
                  {(viewUser.name || viewUser.userId || '?')[0]?.toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{viewUser.name || 'Unknown'}</h4>
                  <p className="text-sm text-gray-500">@{viewUser.userId}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Email', value: viewUser.email, icon: Mail },
                  { label: 'Phone', value: viewUser.phone ? `${viewUser.countryCode || ''}${viewUser.phone}` : '-', icon: Phone },
                  { label: 'Country', value: viewUser.country || '-', icon: Globe },
                  { label: 'Gender', value: viewUser.gender || '-', icon: Users },
                  { label: 'Role', value: viewUser.role || 'user', icon: Users },
                  { label: 'Joined', value: viewUser.createdAt ? new Date(viewUser.createdAt).toLocaleDateString() : '-', icon: Calendar },
                  { label: 'Profession', value: viewUser.profession || '-', icon: Users },
                  { label: 'Age', value: viewUser.age || '-', icon: Users },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-[11px] text-gray-500 mb-0.5 flex items-center gap-1"><Icon className="w-3 h-3" />{f.label}</p>
                      <p className="text-sm font-medium text-gray-800 truncate">{f.value || '-'}</p>
                    </div>
                  );
                })}
              </div>

              {(viewUser.orderCount !== undefined && viewUser.orderCount > 0) && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-sm font-medium text-green-800">{viewUser.orderCount} Order(s) — ₹{viewUser.totalSpent?.toLocaleString()}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                {viewUser.phone && (
                  <a
                    href={`https://wa.me/${viewUser.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                )}
                {viewUser.email && (
                  <a
                    href={`mailto:${viewUser.email}`}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Mail className="w-4 h-4" /> Email
                  </a>
                )}
                <button
                  onClick={() => {
                    setSelectedUsers(new Set([viewUser.userId || viewUser._id]));
                    setViewUser(null);
                    convertToLeads();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <UserPlus className="w-4 h-4" /> Add as Lead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
