'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LogIn, LogOut, Menu, X, Download, Search, RefreshCw,
  ArrowLeft, Users, Shield, Globe, Monitor, Smartphone,
  Clock, Calendar, Sparkles, Filter, ChevronLeft, ChevronRight,
  AlertCircle
} from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

interface SigninLog {
  _id: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
  loginTime?: string;
}

const formatSigninTimestamp = (timestamp?: string) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? 'N/A'
    : date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

const getRelativeTime = (timestamp?: string) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 30) return '';
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'Just now';
};

const parseBrowserAndDevice = (userAgent?: string) => {
  if (!userAgent || userAgent === 'N/A') {
    return { browser: 'Unknown', device: 'Desktop', isMobile: false };
  }

  const ua = userAgent.toLowerCase();
  let browser = 'Browser';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';

  const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad');
  let device = 'Desktop';
  if (ua.includes('iphone')) device = 'iPhone';
  else if (ua.includes('ipad')) device = 'iPad';
  else if (ua.includes('android')) device = 'Android';
  else if (ua.includes('macintosh') || ua.includes('mac os')) device = 'Mac';
  else if (ua.includes('windows')) device = 'Windows';
  else if (ua.includes('linux')) device = 'Linux';

  return { browser, device, isMobile };
};

export default function SigninData() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [signinData, setSigninData] = useState<SigninLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  const fetchSigninData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      const token = getStoredToken();
      const response = await fetch('/api/admin/signins', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        setSigninData(Array.isArray(data) ? data : []);
      } else {
        const errJson = response ? await response.json().catch(() => ({})) : {};
        setError(errJson.error || 'Failed to fetch signin logs');
        setSigninData([]);
      }
    } catch (err) {
      setError('Failed to fetch signin data');
      console.error(err);
      setSigninData([]);
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
      fetchSigninData();
    }
  }, [router, getStoredToken, fetchSigninData]);

  // Quick stats calculation
  const stats = useMemo(() => {
    const total = signinData.length;
    const uniqueEmails = new Set(signinData.map((s) => s.email?.toLowerCase()).filter(Boolean)).size;
    const uniqueIPs = new Set(signinData.map((s) => s.ipAddress).filter((ip) => ip && ip !== 'N/A')).size;

    // Today's logins
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = signinData.filter((s) => {
      const t = s.createdAt || s.loginTime;
      if (!t) return false;
      const d = new Date(t);
      return !Number.isNaN(d.getTime()) && d >= today;
    }).length;

    return { total, uniqueEmails, uniqueIPs, todayCount };
  }, [signinData]);

  // Filtered data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return signinData;
    const q = searchQuery.toLowerCase();
    return signinData.filter((log) => {
      const email = log.email?.toLowerCase() || '';
      const ip = log.ipAddress?.toLowerCase() || '';
      const ua = log.userAgent?.toLowerCase() || '';
      return email.includes(q) || ip.includes(q) || ua.includes(q);
    });
  }, [signinData, searchQuery]);

  // Paginated slice
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  const handleLogout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  const handleExport = () => {
    const dataToExport = filteredData.length > 0 ? filteredData : signinData;
    const csv = [
      ['Email', 'IP Address', 'User Agent', 'Login Time'].join(','),
      ...dataToExport.map((log) =>
        [
          `"${log.email || ''}"`,
          `"${log.ipAddress ?? 'N/A'}"`,
          `"${(log.userAgent ?? 'N/A').replace(/"/g, '""')}"`,
          `"${formatSigninTimestamp(log.createdAt ?? log.loginTime)}"`,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signin_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top vibrant accent stripe */}
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full" />

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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 flex-shrink-0">
                  <LogIn className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                      Signin Data
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      Session Audit
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 hidden sm:block">
                    Live student login timestamps, IP geographic tracing & authentication logs
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={fetchSigninData}
                title="Refresh logs"
                className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
              <button
                onClick={handleExport}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
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

        {/* Content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 space-y-5">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sign-ins</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
                  <LogIn className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-indigo-700 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Recorded authentication logs</span>
              </div>
            </div>

            {/* Card 2: Unique Accounts */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unique Members</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1">{stats.uniqueEmails}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-700 font-medium">
                <Shield className="w-3.5 h-3.5" />
                <span>Distinct active student accounts</span>
              </div>
            </div>

            {/* Card 3: Today's Logins */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Logins Today</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{stats.todayCount}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Since midnight local time</span>
              </div>
            </div>

            {/* Card 4: Unique IPs */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distinct IPs</p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">{stats.uniqueIPs}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/25">
                  <Globe className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
                <Globe className="w-3.5 h-3.5" />
                <span>Network routing footprints</span>
              </div>
            </div>
          </div>

          {/* Search & Pagination Toolbar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search email, IP address, device..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs transition"
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

            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="hidden sm:inline">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={15}>15 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
                <option value={100}>100 rows</option>
              </select>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-semibold text-slate-900">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent" />
              <p className="text-xs font-semibold text-slate-600">Loading signin authentication logs...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>{error}</span>
              </div>
              <p className="text-xs text-rose-700">
                Please verify that you are logged in as admin and that the backend signin logs API is reachable.
              </p>
              <button
                onClick={fetchSigninData}
                className="mt-2 px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition"
              >
                Retry
              </button>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-16 text-center shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                <LogIn className="h-7 w-7" />
              </div>
              <p className="text-slate-800 font-bold text-base">
                {searchQuery ? 'No signin logs match your search filter' : 'No signin data available yet'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {searchQuery ? 'Try searching by a different email or IP address' : 'New signins will appear here as users log in.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">Member Account</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">Network & IP</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">Browser & Device</th>
                      <th className="px-4 py-3.5 text-xs font-bold text-slate-600 uppercase tracking-wider">Login Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((log) => {
                      const initials = (log.email || 'U').slice(0, 2).toUpperCase();
                      const { browser, device, isMobile } = parseBrowserAndDevice(log.userAgent);
                      const timestamp = log.createdAt ?? log.loginTime;
                      const relative = getRelativeTime(timestamp);

                      return (
                        <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-sm text-slate-900">{log.email}</div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Authenticated</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-medium border border-slate-200">
                              <Globe className="w-3.5 h-3.5 text-slate-400" />
                              <span>{log.ipAddress ?? 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-200">
                                  {isMobile ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                                  {browser}
                                </span>
                                <span className="text-[11px] text-slate-600 font-medium">
                                  {device}
                                </span>
                              </div>
                              {log.userAgent && log.userAgent !== 'N/A' && (
                                <p
                                  title={log.userAgent}
                                  className="text-[10px] text-slate-400 max-w-xs truncate"
                                >
                                  {log.userAgent}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>{formatSigninTimestamp(timestamp)}</span>
                              </div>
                              {relative && (
                                <div className="text-[11px] text-indigo-600 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{relative}</span>
                                </div>
                              )}
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
                  Showing{' '}
                  <span className="font-bold text-slate-900">
                    {Math.min(filteredData.length, (currentPage - 1) * pageSize + 1)}
                  </span>
                  -
                  <span className="font-bold text-slate-900">
                    {Math.min(filteredData.length, currentPage * pageSize)}
                  </span>{' '}
                  of <span className="font-bold text-slate-900">{filteredData.length}</span> signin records
                </div>
                <div className="flex items-center gap-2">
                  <span>Page {currentPage} of {totalPages}</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
