'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, LogOut, Menu, X, Download, Search, KeyRound,
  Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw,
} from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

interface SignupUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  state: string;
  gender: string;
  age: number;
  profession: string;
  createdAt: string;
}

export default function SignupData() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [signupData, setSignupData] = useState<SignupUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Password reset modal
  const [resetModal, setResetModal] = useState<SignupUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const token = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '';
  }, []);

  useEffect(() => {
    const storedToken = typeof window !== 'undefined'
      ? (localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token'))
      : null;
    if (!storedToken) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      fetchSignupData();
    }
  }, [router]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchSignupData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/signups', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setSignupData(result.data || []);
        setError('');
      } else {
        setError('Failed to fetch signup data');
        setSignupData([]);
      }
    } catch (err) {
      setError('Failed to fetch signup data');
      console.error(err);
      setSignupData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered users based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return signupData;
    const q = searchQuery.toLowerCase();
    return signupData.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.country?.toLowerCase().includes(q) ||
        u.state?.toLowerCase().includes(q) ||
        u.profession?.toLowerCase().includes(q)
    );
  }, [signupData, searchQuery]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const handleExport = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : signupData;
    const csv = [
      ['Name', 'Email', 'Phone', 'Country', 'State', 'Gender', 'Age', 'Profession', 'Date'].join(','),
      ...dataToExport.map((user) =>
        [
          `"${user.name}"`,
          user.email,
          user.phone,
          user.country,
          user.state,
          user.gender,
          user.age,
          user.profession,
          new Date(user.createdAt).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signup_data${searchQuery ? '_filtered' : ''}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
      const res = await fetch(`/api/admin/signups/${resetModal._id}/reset-password`, {
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
        // Close after a delay
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
              <h1 className="text-2xl font-bold text-swar-text flex items-center space-x-2">
                <Users className="h-8 w-8 text-swar-primary" />
                <span>Signup Data</span>
              </h1>
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

          {/* Search Bar */}
          <div className="px-6 pb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, phone, country..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-1 text-xs text-gray-500">
                Showing {filteredData.length} of {signupData.length} users
              </p>
            )}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-swar-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">{error}</div>
          ) : filteredData.length === 0 ? (
            <div className="bg-swar-bg border border-swar-border rounded-lg p-8 text-center">
              <Users className="h-12 w-12 text-swar-text-secondary mx-auto mb-4" />
              <p className="text-swar-text-secondary text-lg">
                {searchQuery ? 'No users match your search' : 'No signup data available yet'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-swar-bg border-b border-swar-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-swar-text">#</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-swar-text">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-swar-text">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-swar-text">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-swar-text">Country</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-swar-text">State</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-swar-text">Gender</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-swar-text">Age</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-swar-text">Profession</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-swar-text">Signed Up</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-swar-text">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((user, index) => (
                      <tr key={user._id} className={index % 2 === 0 ? 'bg-white' : 'bg-swar-bg'}>
                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-swar-text">{user.name}</td>
                        <td className="px-4 py-3 text-sm text-swar-text-secondary">{user.email}</td>
                        <td className="px-4 py-3 text-sm text-swar-text-secondary">{user.phone}</td>
                        <td className="px-4 py-3 text-sm text-swar-text-secondary">{user.country}</td>
                        <td className="px-4 py-3 text-sm text-swar-text-secondary">{user.state}</td>
                        <td className="px-4 py-3 text-sm text-swar-text-secondary">{user.gender}</td>
                        <td className="px-4 py-3 text-sm text-swar-text-secondary">{user.age}</td>
                        <td className="px-4 py-3 text-sm text-swar-text-secondary">{user.profession}</td>
                        <td className="px-4 py-3 text-sm text-swar-text-secondary">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openResetModal(user)}
                            title="Reset Password"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Reset Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Stats Footer */}
              <div className="bg-swar-bg border-t border-swar-border px-6 py-4 flex items-center justify-between">
                <p className="text-sm text-swar-text-secondary">
                  Total signups: <span className="font-semibold text-swar-text">{signupData.length}</span>
                  {searchQuery && (
                    <span>
                      {' '}| Filtered: <span className="font-semibold text-swar-text">{filteredData.length}</span>
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Password Reset Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
                  <p className="text-sm text-gray-500">Set a new password for this user</p>
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
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-medium text-gray-900">{resetModal.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-medium text-gray-900">{resetModal.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Phone:</span>
                  <span className="font-medium text-gray-900">{resetModal.phone}</span>
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div className="px-6 py-5 space-y-4">
              {resetMsg && (
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent pr-10"
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
                className="text-sm text-swar-primary hover:text-green-700 font-medium flex items-center gap-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Generate random password
              </button>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setResetModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetBusy || !newPassword.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {resetBusy ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
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
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
            {toast.text}
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
