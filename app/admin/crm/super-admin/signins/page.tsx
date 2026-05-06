'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import {
  LogIn,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  TrendingUp,
  Users,
  Monitor,
  Globe,
  Calendar,
} from 'lucide-react';

interface SigninData {
  _id: string;
  email: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export default function SuperAdminSigninsPage() {
  const router = useRouter();
  const token = useAuth();
  const [signins, setSignins] = useState<SigninData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(30);
  const [search, setSearch] = useState('');
  const [uniqueTodayCount, setUniqueTodayCount] = useState(0);
  const [signinTrend, setSigninTrend] = useState<{ _id: string; count: number }[]>([]);

  useEffect(() => {
    if (!checkIsSuperAdmin()) router.replace('/admin/crm');
  }, [router]);

  const fetchSignins = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(page * limit),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/crm/super-admin/signins?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push(getLoginPath()); return; }
      if (!res.ok) throw new Error('Failed to load signin data');
      const data = await res.json();
      setSignins(data.signins || []);
      setTotal(data.total || 0);
      setUniqueTodayCount(data.uniqueTodayCount || 0);
      setSigninTrend(data.signinTrend || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, search, router]);

  useEffect(() => { if (token) fetchSignins(); }, [token]);

  const totalPages = Math.ceil(total / limit);

  const parseUA = (ua: string) => {
    if (!ua) return 'Unknown';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Other';
  };

  const parseDevice = (ua: string) => {
    if (!ua) return 'Unknown';
    if (ua.includes('Mobile') || ua.includes('Android')) return 'Mobile';
    if (ua.includes('Tablet') || ua.includes('iPad')) return 'Tablet';
    return 'Desktop';
  };

  const exportCSV = () => {
    if (signins.length === 0) return;
    const headers = ['Email', 'User ID', 'IP Address', 'Browser', 'Device', 'Date'];
    const rows = signins.map((s) => [s.email, s.userId, s.ipAddress, parseUA(s.userAgent), parseDevice(s.userAgent), s.createdAt ? new Date(s.createdAt).toLocaleString() : '']);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'signins-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <LogIn className="w-6 h-6 text-orange-600" />
              Signin Activity
            </h1>
            <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} total signin records</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 text-gray-700">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={fetchSignins} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 text-gray-700">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats + Trend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Signins</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{total.toLocaleString()}</p>
              </div>
              <div className="bg-orange-500 p-2 rounded-lg"><LogIn className="w-5 h-5 text-white" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Unique Users Today</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{uniqueTodayCount}</p>
              </div>
              <div className="bg-blue-500 p-2 rounded-lg"><Users className="w-5 h-5 text-white" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h4 className="text-sm text-gray-500 mb-3 flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> Signin Trend (30d)</h4>
            <div className="flex items-end gap-[2px] h-16">
              {(() => {
                const maxC = Math.max(...signinTrend.map(d => d.count), 1);
                return signinTrend.slice(-30).map((d, i) => (
                  <div
                    key={d._id || i}
                    className="flex-1 bg-orange-400 hover:bg-orange-600 rounded-t min-w-[3px] transition group relative"
                    style={{ height: `${(d.count / maxC) * 100}%`, minHeight: '2px' }}
                    title={`${d._id}: ${d.count}`}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                      {d._id?.slice(5)}: {d.count}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, user ID, IP address..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Signins Table */}
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
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Email</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">User ID</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 hidden lg:table-cell">IP Address</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 hidden lg:table-cell">Browser</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600 hidden xl:table-cell">Device</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {signins.map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-3">
                        <p className="text-gray-900 truncate">{s.email || '-'}</p>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-gray-600 truncate">{s.userId || '-'}</td>
                      <td className="px-3 py-3 hidden lg:table-cell text-gray-500 font-mono text-xs">{s.ipAddress || '-'}</td>
                      <td className="px-3 py-3 hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                          <Globe className="w-3 h-3" /> {parseUA(s.userAgent)}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden xl:table-cell">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                          <Monitor className="w-3 h-3" /> {parseDevice(s.userAgent)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {s.createdAt ? new Date(s.createdAt).toLocaleString() : '-'}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {signins.length === 0 && !loading && (
                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No signin records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-sm text-gray-500">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, total)} of {total}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-sm font-medium text-gray-700">{page + 1} / {totalPages}</span>
                <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
