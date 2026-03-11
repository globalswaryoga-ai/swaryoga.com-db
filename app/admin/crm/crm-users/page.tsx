'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import {
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  QrCode,
  CreditCard,
  Eye,
  X,
  Filter,
  IndianRupee,
  HardDrive,
  Wallet,
  Pencil,
  Save,
  FileText,
} from 'lucide-react';

interface CrmUser {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isAdmin: boolean;
  tenantSlug: string;
  plan: string;
  businessName: string;
  tenantStatus: string;
  qrWhatsappEnabled: boolean;
  qrConnectedPhone: string;
  hasOwnBridge: boolean;
  createdAt: string | null;
  lastLogin: string | null;
  storagePlan: string;
  monthlyCost: number;
  storagePaidUntil: string | null;
  receivedAmount: number;
  paymentNote: string;
  paymentDate: string | null;
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  basic: 'bg-blue-100 text-blue-700',
  starter: 'bg-green-100 text-green-700',
  growth: 'bg-purple-100 text-purple-700',
  professional: 'bg-orange-100 text-orange-700',
};

export default function CrmUsersPage() {
  const router = useRouter();
  const token = useAuth();
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [limit] = useState(25);

  // Filters
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Detail modal
  const [viewUser, setViewUser] = useState<CrmUser | null>(null);

  // Payment edit modal
  const [paymentUser, setPaymentUser] = useState<CrmUser | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);

  // Plans for filter
  const plans = ['free', 'basic', 'starter', 'growth', 'professional'];

  useEffect(() => {
    if (!checkIsSuperAdmin()) {
      router.replace('/admin/crm');
    }
  }, [router]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(page * limit),
      });
      if (search) params.set('search', search);
      if (planFilter) params.set('plan', planFilter);

      const res = await fetch(`/api/admin/crm/crm-users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        router.push(getLoginPath());
        return;
      }
      if (res.status === 403) {
        setError('Super admin access required');
        return;
      }
      if (!res.ok) throw new Error('Failed to load CRM users');
      const data = await res.json();
      setUsers(data.data?.users || []);
      setTotal(data.data?.total || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, search, planFilter, router]);

  useEffect(() => {
    if (token) fetchUsers();
  }, [token, fetchUsers]);

  const totalPages = Math.ceil(total / limit);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Open payment edit modal
  const openPaymentEdit = (user: CrmUser) => {
    setPaymentUser(user);
    setPaymentAmount(String(user.receivedAmount || ''));
    setPaymentNote(user.paymentNote || '');
    setPaymentDate(user.paymentDate ? new Date(user.paymentDate).toISOString().slice(0, 10) : '');
  };

  // Save payment details
  const savePayment = async () => {
    if (!paymentUser || !token) return;
    try {
      setSavingPayment(true);
      const res = await fetch('/api/admin/crm/crm-users', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: paymentUser.userId,
          receivedAmount: Number(paymentAmount) || 0,
          paymentNote,
          paymentDate: paymentDate || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      // Update local state
      setUsers(prev => prev.map(u =>
        u._id === paymentUser._id
          ? { ...u, receivedAmount: Number(paymentAmount) || 0, paymentNote, paymentDate: paymentDate || null }
          : u
      ));
      setPaymentUser(null);
    } catch (err: any) {
      alert('Failed to save payment: ' + err.message);
    } finally {
      setSavingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-600" />
            CRM Users
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Users registered from crm.swaryoga.com with QR WhatsApp access
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name, email, phone..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 border rounded-lg ${showFilters ? 'bg-indigo-50 border-indigo-300' : 'border-gray-300'}`}
            >
              <Filter className="w-4 h-4 text-gray-500" />
            </button>
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Plans</option>
              {plans.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(search || planFilter) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <span>Filters:</span>
            {search && (
              <span className="px-2 py-0.5 bg-gray-100 rounded-full flex items-center gap-1">
                Search: {search}
                <button onClick={() => setSearch('')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {planFilter && (
              <span className="px-2 py-0.5 bg-gray-100 rounded-full flex items-center gap-1">
                Plan: {planFilter}
                <button onClick={() => setPlanFilter('')}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Business</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">QR WhatsApp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Billing</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Received</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No CRM users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                          {(user.name || user.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{user.name || '-'}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {user.email}
                          </p>
                          {user.phone && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {user.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Business */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-900">{user.businessName || '-'}</p>
                          {user.tenantSlug && (
                            <p className="text-[10px] text-gray-400">{user.tenantSlug}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${PLAN_COLORS[user.plan] || PLAN_COLORS.free}`}>
                        <CreditCard className="w-3 h-3" />
                        {user.plan?.charAt(0).toUpperCase() + user.plan?.slice(1)}
                      </span>
                    </td>

                    {/* QR WhatsApp */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {user.qrWhatsappEnabled ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-300" />
                        )}
                        <div>
                          {user.qrConnectedPhone ? (
                            <span className="text-sm text-gray-900 flex items-center gap-1">
                              <QrCode className="w-3 h-3 text-green-500" />
                              {user.qrConnectedPhone}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Not connected</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Billing */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                          <IndianRupee className="w-3 h-3 text-green-600" />
                          {user.monthlyCost}/mo
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <HardDrive className="w-3 h-3" />
                          {user.storagePlan?.charAt(0).toUpperCase() + user.storagePlan?.slice(1)}
                        </span>
                      </div>
                    </td>

                    {/* Received Amount */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`flex items-center gap-0.5 text-sm font-semibold ${user.receivedAmount > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                          <IndianRupee className="w-3 h-3" />
                          {user.receivedAmount || 0}
                        </span>
                        <button
                          onClick={() => openPaymentEdit(user)}
                          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                          title="Edit payment details"
                        >
                          <Wallet className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {user.paymentNote && (
                        <p className="text-[10px] text-gray-400 truncate max-w-[120px]" title={user.paymentNote}>
                          {user.paymentNote}
                        </p>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setViewUser(user)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <p className="text-sm text-gray-500">
              Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {viewUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewUser(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-xl">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Details
              </h3>
              <button onClick={() => setViewUser(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
                  {(viewUser.name || viewUser.email || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900">{viewUser.name || '-'}</p>
                  <p className="text-sm text-gray-500">{viewUser.email}</p>
                  {viewUser.phone && <p className="text-sm text-gray-500">{viewUser.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-gray-400 uppercase">Business</p>
                  <p className="text-sm font-medium text-gray-900">{viewUser.businessName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Tenant Slug</p>
                  <p className="text-sm font-medium text-gray-900">{viewUser.tenantSlug || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Plan</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${PLAN_COLORS[viewUser.plan] || PLAN_COLORS.free}`}>
                    {viewUser.plan?.charAt(0).toUpperCase() + viewUser.plan?.slice(1)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase">Status</p>
                  <p className="text-sm font-medium text-gray-900">{viewUser.tenantStatus || '-'}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-400 uppercase mb-2">Billing & Storage</p>
                <div className="bg-green-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Monthly Cost</span>
                    <span className="flex items-center gap-1 text-sm font-bold text-green-700">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {viewUser.monthlyCost}/mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Storage Plan</span>
                    <span className="text-sm font-medium text-gray-900">
                      {viewUser.storagePlan?.charAt(0).toUpperCase() + viewUser.storagePlan?.slice(1)}
                    </span>
                  </div>
                  {viewUser.storagePaidUntil && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Paid Until</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(viewUser.storagePaidUntil)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-green-200">
                    <span className="text-sm text-gray-600">Received Amount</span>
                    <span className={`flex items-center gap-1 text-sm font-bold ${viewUser.receivedAmount > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                      <IndianRupee className="w-3.5 h-3.5" />
                      {viewUser.receivedAmount || 0}
                    </span>
                  </div>
                  {viewUser.paymentNote && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Payment Note</span>
                      <span className="text-sm text-gray-900 max-w-[200px] truncate" title={viewUser.paymentNote}>
                        {viewUser.paymentNote}
                      </span>
                    </div>
                  )}
                  {viewUser.paymentDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Payment Date</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDate(viewUser.paymentDate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-gray-400 uppercase mb-2">QR WhatsApp</p>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Enabled</span>
                    {viewUser.qrWhatsappEnabled ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm"><CheckCircle2 className="w-4 h-4" /> Yes</span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-sm"><XCircle className="w-4 h-4" /> No</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Connected Phone</span>
                    <span className="text-sm font-medium text-gray-900">
                      {viewUser.qrConnectedPhone || 'Not connected'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Own Bridge</span>
                    {viewUser.hasOwnBridge ? (
                      <span className="text-green-600 text-sm">Yes</span>
                    ) : (
                      <span className="text-gray-400 text-sm">No</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Joined: {formatDate(viewUser.createdAt)}</span>
                  <span>Last Login: {formatDate(viewUser.lastLogin)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Edit Modal */}
      {paymentUser && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPaymentUser(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between bg-gradient-to-r from-green-500 to-emerald-500 rounded-t-xl">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Payment Details
              </h3>
              <button onClick={() => setPaymentUser(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* User info */}
              <div className="flex items-center gap-3 pb-3 border-b">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-sm">
                  {(paymentUser.name || paymentUser.email || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{paymentUser.name || paymentUser.email}</p>
                  <p className="text-xs text-gray-500">
                    Plan: {paymentUser.plan?.charAt(0).toUpperCase() + paymentUser.plan?.slice(1)} · {paymentUser.monthlyCost}/mo
                  </p>
                </div>
              </div>

              {/* Received Amount */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Received Amount (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>

              {/* Payment Note */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
                <textarea
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g. UPI transfer, partial payment..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                />
              </div>

              {/* Due indicator */}
              {paymentUser.monthlyCost > 0 && (
                <div className={`p-3 rounded-lg text-sm ${
                  (Number(paymentAmount) || 0) >= paymentUser.monthlyCost
                    ? 'bg-green-50 text-green-700'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  {(Number(paymentAmount) || 0) >= paymentUser.monthlyCost ? (
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      Fully paid ({paymentUser.monthlyCost}/mo)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <IndianRupee className="w-4 h-4" />
                      Due: ₹{paymentUser.monthlyCost - (Number(paymentAmount) || 0)} remaining of ₹{paymentUser.monthlyCost}/mo
                    </span>
                  )}
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={savePayment}
                disabled={savingPayment}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
              >
                {savingPayment ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingPayment ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
