'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, LogOut, Menu, X, Download, Search, KeyRound,
  Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw,
  Check, Trash2, Clock, AlertTriangle, UserX, UserCheck, ShieldAlert
} from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

interface SignupUser {
  _id: string;
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'pending' | 'rejected' | string;
  country: string;
  state: string;
  gender: string;
  age: number | string;
  profession: string;
  approvalReason?: string;
  createdAt: string;
}

export default function SignupData() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [signupData, setSignupData] = useState<SignupUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Status Tab Filter: 'all' | 'pending' | 'active' | 'rejected'
  const [statusTab, setStatusTab] = useState<'all' | 'pending' | 'active' | 'rejected'>('all');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Selected row IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  // Single action loading states: { [userId]: 'approve' | 'reject' | 'delete' }
  const [actionBusy, setActionBusy] = useState<Record<string, string>>({});

  // Password reset modal
  const [resetModal, setResetModal] = useState<SignupUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete confirmation modal
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; ids: string[]; names: string }>({
    isOpen: false,
    ids: [],
    names: '',
  });

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getStoredToken = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem('crm_token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('admin_token') ||
      localStorage.getItem('token') ||
      ''
    );
  }, []);

  const fetchSignupData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = getStoredToken();
      const response = await fetch('/api/admin/signups', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSignupData(result.data || []);
        setError('');
      } else {
        const errJson = await response.json().catch(() => ({}));
        setError(errJson.error || 'Failed to fetch signup data');
        setSignupData([]);
      }
    } catch (err) {
      setError('Failed to fetch signup data');
      console.error(err);
      setSignupData([]);
    } finally {
      setIsLoading(false);
    }
  }, [getStoredToken]);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      fetchSignupData();
    }
  }, [router, getStoredToken, fetchSignupData]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Counts
  const counts = useMemo(() => {
    let pending = 0;
    let active = 0;
    let rejected = 0;
    for (const u of signupData) {
      const s = u.status || 'active';
      if (s === 'pending') pending++;
      else if (s === 'active') active++;
      else if (s === 'rejected') rejected++;
    }
    return { all: signupData.length, pending, active, rejected };
  }, [signupData]);

  // Filtered users based on Tab and Search
  const filteredData = useMemo(() => {
    return signupData.filter((u) => {
      const userStatus = u.status || 'active';
      if (statusTab !== 'all' && userStatus !== statusTab) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.country?.toLowerCase().includes(q) ||
        u.state?.toLowerCase().includes(q) ||
        u.profession?.toLowerCase().includes(q) ||
        u.approvalReason?.toLowerCase().includes(q)
      );
    });
  }, [signupData, statusTab, searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const handleExport = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : signupData;
    const csv = [
      ['Name', 'Email', 'Phone', 'Status', 'Approval Reason', 'Country', 'State', 'Gender', 'Age', 'Profession', 'Date'].join(','),
      ...dataToExport.map((user) =>
        [
          `"${(user.name || '').replace(/"/g, '""')}"`,
          `"${user.email}"`,
          `"${user.phone}"`,
          `"${user.status || 'active'}"`,
          `"${(user.approvalReason || '').replace(/"/g, '""')}"`,
          `"${(user.country || '').replace(/"/g, '""')}"`,
          `"${(user.state || '').replace(/"/g, '""')}"`,
          `"${user.gender || ''}"`,
          user.age || '',
          `"${(user.profession || '').replace(/"/g, '""')}"`,
          new Date(user.createdAt).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signup_data_${statusTab}${searchQuery ? '_filtered' : ''}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Selection toggles
  const handleToggleSelectAll = () => {
    const visibleIds = filteredData.map((u) => u.id || u._id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Approve single user
  const handleApprove = async (user: SignupUser) => {
    const targetId = user.id || user._id;
    try {
      setActionBusy((prev) => ({ ...prev, [targetId]: 'approve' }));
      const token = getStoredToken();
      const res = await fetch('/api/admin/signups', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'approve', id: targetId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSignupData((prev) =>
          prev.map((u) =>
            (u.id || u._id) === targetId
              ? { ...u, status: 'active', approvalReason: 'Approved by admin' }
              : u
          )
        );
        setToast({ type: 'success', text: `Approved ${user.name} (${user.email})` });
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to approve user' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Network error approving user' });
    } finally {
      setActionBusy((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
    }
  };

  // Reject single user
  const handleReject = async (user: SignupUser) => {
    const targetId = user.id || user._id;
    try {
      setActionBusy((prev) => ({ ...prev, [targetId]: 'reject' }));
      const token = getStoredToken();
      const res = await fetch('/api/admin/signups', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'reject', id: targetId, reason: 'Rejected by admin' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSignupData((prev) =>
          prev.map((u) =>
            (u.id || u._id) === targetId
              ? { ...u, status: 'rejected', approvalReason: 'Rejected by admin' }
              : u
          )
        );
        setToast({ type: 'success', text: `Marked ${user.name} as rejected` });
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to reject user' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Network error rejecting user' });
    } finally {
      setActionBusy((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
    }
  };

  // Open Delete Modal
  const openDeleteModal = (ids: string[], names: string) => {
    setDeleteModal({ isOpen: true, ids, names });
  };

  // Execute Delete
  const confirmDelete = async () => {
    const { ids } = deleteModal;
    if (ids.length === 0) return;

    try {
      setBulkBusy(true);
      const token = getStoredToken();
      const res = await fetch('/api/admin/signups', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSignupData((prev) => prev.filter((u) => !ids.includes(u.id || u._id)));
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
        setToast({ type: 'success', text: `Successfully deleted ${ids.length} signup(s)` });
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to delete signup(s)' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Network error deleting user(s)' });
    } finally {
      setBulkBusy(false);
      setDeleteModal({ isOpen: false, ids: [], names: '' });
    }
  };

  // Bulk Approve
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkBusy(true);
      const token = getStoredToken();
      const res = await fetch('/api/admin/signups', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'bulk_approve', ids: selectedIds }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSignupData((prev) =>
          prev.map((u) =>
            selectedIds.includes(u.id || u._id)
              ? { ...u, status: 'active', approvalReason: 'Approved by admin (bulk)' }
              : u
          )
        );
        setToast({ type: 'success', text: `Approved ${selectedIds.length} users` });
        setSelectedIds([]);
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to bulk approve' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Network error during bulk approval' });
    } finally {
      setBulkBusy(false);
    }
  };

  // Bulk Reject
  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    try {
      setBulkBusy(true);
      const token = getStoredToken();
      const res = await fetch('/api/admin/signups', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'bulk_reject', ids: selectedIds, reason: 'Rejected in bulk by admin' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSignupData((prev) =>
          prev.map((u) =>
            selectedIds.includes(u.id || u._id)
              ? { ...u, status: 'rejected', approvalReason: 'Rejected in bulk by admin' }
              : u
          )
        );
        setToast({ type: 'success', text: `Rejected ${selectedIds.length} users` });
        setSelectedIds([]);
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to bulk reject' });
      }
    } catch (err) {
      setToast({ type: 'error', text: 'Network error during bulk rejection' });
    } finally {
      setBulkBusy(false);
    }
  };

  // Password reset
  const openResetModal = (user: SignupUser) => {
    setResetModal(user);
    setNewPassword('');
    setShowPassword(false);
    setResetMsg(null);
  };

  const handleResetPassword = async () => {
    if (!resetModal || !newPassword.trim()) return;

    if (newPassword.trim().length < 6) {
      setResetMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setResetBusy(true);
    setResetMsg(null);

    try {
      const token = getStoredToken();
      const targetId = resetModal.id || resetModal._id;
      const res = await fetch(`/api/admin/signups/${targetId}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: newPassword.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const emailNote = data.emailSent
          ? ' New password sent to their email.'
          : ' (Email notification could not be sent — share password manually)';
        setResetMsg({ type: 'success', text: (data.message || 'Password reset successfully!') + emailNote });
        setToast({ type: 'success', text: `Password reset for ${resetModal.email}` });
        setTimeout(() => setResetModal(null), 2500);
      } else {
        setResetMsg({ type: 'error', text: data.error || 'Reset failed' });
      }
    } catch (err) {
      setResetMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setResetBusy(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
    setShowPassword(true);
  };

  const isAllSelected = useMemo(() => {
    const visibleIds = filteredData.map((u) => u.id || u._id);
    return visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  }, [filteredData, selectedIds]);

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-swar-primary-light">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
              <div>
                <h1 className="text-2xl font-bold text-swar-text flex items-center space-x-2">
                  <Users className="h-8 w-8 text-swar-primary" />
                  <span>Signup Data</span>
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Connected to Bunny Database • Anti-bot spam protection active
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchSignupData}
                title="Refresh"
                className="p-2 rounded-lg bg-swar-primary-light text-swar-primary hover:bg-swar-border transition-colors"
              >
                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleExport}
                className="p-2 rounded-lg bg-swar-primary-light text-swar-primary hover:bg-swar-border transition-colors flex items-center space-x-2"
              >
                <Download className="h-5 w-5" />
                <span className="hidden sm:inline text-sm font-medium">Export CSV</span>
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg bg-swar-primary-light text-red-600 hover:bg-red-200 transition-colors"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Status Tabs & Search */}
          <div className="px-6 pb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Tabs */}
              <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setStatusTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusTab === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({counts.all})
                </button>
                <button
                  onClick={() => setStatusTab('pending')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    statusTab === 'pending'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-amber-700 hover:text-amber-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Pending Review ({counts.pending})
                </button>
                <button
                  onClick={() => setStatusTab('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    statusTab === 'active'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  Approved ({counts.active})
                </button>
                <button
                  onClick={() => setStatusTab('rejected')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    statusTab === 'rejected'
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-red-700 hover:text-red-900'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  Rejected ({counts.rejected})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, email, phone, country..."
                  className="w-full pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent text-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Bulk Actions Banner */}
            {selectedIds.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-semibold text-amber-900">
                    {selectedIds.length} signups selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkApprove}
                    disabled={bulkBusy}
                    className="px-3 py-1 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Approve Selected
                  </button>
                  <button
                    onClick={handleBulkReject}
                    disabled={bulkBusy}
                    className="px-3 py-1 bg-amber-600 text-white hover:bg-amber-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Reject Selected
                  </button>
                  <button
                    onClick={() => openDeleteModal(selectedIds, `${selectedIds.length} selected signups`)}
                    disabled={bulkBusy}
                    className="px-3 py-1 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Selected
                  </button>
                  <button
                    onClick={() => setSelectedIds([])}
                    className="px-2 py-1 text-gray-500 hover:text-gray-800 text-xs font-medium"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-swar-primary"></div>
              <p className="text-xs text-gray-500">Connecting to Bunny DB & loading signups...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-800 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span>{error}</span>
              </div>
              <p className="text-xs text-red-600">
                Please verify that you are logged in as admin and that the backend is reachable.
              </p>
              <button
                onClick={fetchSignupData}
                className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition"
              >
                Retry
              </button>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="bg-white border border-swar-border rounded-xl p-12 text-center shadow-sm">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-700 font-medium text-base">
                {searchQuery ? 'No signups match your search filter' : `No ${statusTab === 'all' ? '' : statusTab} signups found`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery ? 'Try clearing your search query' : 'New signups will appear here automatically.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={handleToggleSelectAll}
                          className="rounded border-gray-300 text-swar-primary focus:ring-swar-primary h-4 w-4"
                        />
                      </th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-600">Name & Details</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-600">Contact</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-600">Location</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-600">Status & Approval</th>
                      <th className="px-3 py-3 text-xs font-semibold text-gray-600">Signed Up</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredData.map((user) => {
                      const userId = user.id || user._id;
                      const isSelected = selectedIds.includes(userId);
                      const isPending = user.status === 'pending';
                      const isRejected = user.status === 'rejected';
                      const isActive = user.status === 'active' || (!user.status);
                      const busyType = actionBusy[userId];

                      return (
                        <tr
                          key={userId}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-amber-50/50'
                              : isPending
                              ? 'bg-amber-50/20 hover:bg-amber-50/40'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOne(userId)}
                              className="rounded border-gray-300 text-swar-primary focus:ring-swar-primary h-4 w-4"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-semibold text-sm text-gray-900">{user.name || 'Unnamed'}</div>
                            <div className="text-xs text-gray-500">
                              {[user.gender, user.age ? `${user.age} yrs` : '', user.profession]
                                .filter(Boolean)
                                .join(' • ') || 'No profile details'}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs">
                            <div className="text-gray-900 font-medium">{user.email}</div>
                            <div className="text-gray-500">{user.phone || 'No phone'}</div>
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-600">
                            <div>{user.country || 'Unknown'}</div>
                            {user.state && <div className="text-gray-400">{user.state}</div>}
                          </td>
                          <td className="px-3 py-3">
                            {isPending ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                  <Clock className="w-3 h-3" />
                                  Pending Review
                                </span>
                                {user.approvalReason && (
                                  <div
                                    title={user.approvalReason}
                                    className="text-[11px] text-amber-700 max-w-xs truncate"
                                  >
                                    {user.approvalReason}
                                  </div>
                                )}
                              </div>
                            ) : isActive ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3" />
                                  Approved
                                </span>
                                {user.approvalReason && user.approvalReason !== 'Approved by admin' && (
                                  <div className="text-[11px] text-gray-400 max-w-xs truncate">
                                    {user.approvalReason}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                  <UserX className="w-3 h-3" />
                                  Rejected
                                </span>
                                {user.approvalReason && (
                                  <div className="text-[11px] text-red-700 max-w-xs truncate">
                                    {user.approvalReason}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(user.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Approve Button */}
                              {isPending && (
                                <button
                                  onClick={() => handleApprove(user)}
                                  disabled={!!busyType}
                                  title="Approve Signup & Send Welcome Email"
                                  className="p-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition disabled:opacity-50"
                                >
                                  {busyType === 'approve' ? (
                                    <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {/* Reject Button */}
                              {(isPending || isActive) && (
                                <button
                                  onClick={() => handleReject(user)}
                                  disabled={!!busyType}
                                  title="Reject Signup"
                                  className="p-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition disabled:opacity-50"
                                >
                                  {busyType === 'reject' ? (
                                    <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <UserX className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {/* Reset Password Button */}
                              <button
                                onClick={() => openResetModal(user)}
                                title="Reset Password"
                                className="p-1.5 text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => openDeleteModal([userId], user.name || user.email)}
                                title="Delete Signup Permanently"
                                className="p-1.5 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-500">
                <div>
                  Showing <span className="font-semibold text-gray-900">{filteredData.length}</span> of{' '}
                  <span className="font-semibold text-gray-900">{signupData.length}</span> signups
                  {statusTab !== 'all' && (
                    <span> in <strong className="capitalize">{statusTab}</strong> filter</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span>Pending: <strong className="text-amber-700">{counts.pending}</strong></span>
                  <span>Approved: <strong className="text-emerald-700">{counts.active}</strong></span>
                  <span>Rejected: <strong className="text-red-700">{counts.rejected}</strong></span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Confirm Deletion</h3>
                <p className="text-xs text-gray-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 bg-red-50 border border-red-100 rounded-lg p-3">
              Are you sure you want to permanently delete{' '}
              <strong>{deleteModal.names}</strong> from the database?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteModal({ isOpen: false, ids: [], names: '' })}
                className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={bulkBusy}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {bulkBusy && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Reset Password</h3>
                  <p className="text-xs text-gray-500">Set a new password for this user</p>
                </div>
              </div>
              <button
                onClick={() => setResetModal(null)}
                className="p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* User Info */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-semibold text-gray-900">{resetModal.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-semibold text-gray-900">{resetModal.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-semibold text-gray-900">{resetModal.phone}</span>
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div className="px-6 py-4 space-y-3">
              {resetMsg && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-xs ${
                    resetMsg.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {resetMsg.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  )}
                  {resetMsg.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent pr-10 text-xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={generateRandomPassword}
                className="text-xs text-swar-primary hover:text-green-700 font-medium flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Generate random password
              </button>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={() => setResetModal(null)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetBusy || !newPassword.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {resetBusy ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-3.5 w-3.5" />
                    Reset Password
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
