'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
import {
  CreditCard,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Download,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowUpDown,
  Eye,
  X,
} from 'lucide-react';

interface OrderData {
  _id: string;
  userId: string;
  items: { kind: string; name: string; price: number; quantity: number; currency: string }[];
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  payuTxnId: string;
  cashfreeOrderId: string;
  transactionId: string;
  shippingAddress: any;
  createdAt: string;
}

export default function SuperAdminPaymentsPage() {
  const router = useRouter();
  const token = useAuth();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [limit] = useState(25);
  const [summary, setSummary] = useState({ totalRevenue: 0, completedCount: 0, avgOrderValue: 0 });
  const [statusBreakdown, setStatusBreakdown] = useState<{ status: string; count: number; total: number }[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Detail modal
  const [viewOrder, setViewOrder] = useState<OrderData | null>(null);

  useEffect(() => {
    if (!checkIsSuperAdmin()) router.replace('/admin/crm');
  }, [router]);

  const fetchPayments = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({
        limit: String(limit),
        skip: String(page * limit),
        sortBy,
        sortOrder,
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (methodFilter) params.set('paymentMethod', methodFilter);

      const res = await fetch(`/api/admin/crm/super-admin/payments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push(getLoginPath()); return; }
      if (!res.ok) throw new Error('Failed to load payments');
      const data = await res.json();
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setSummary(data.summary || { totalRevenue: 0, completedCount: 0, avgOrderValue: 0 });
      setStatusBreakdown(data.statusBreakdown || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, search, statusFilter, methodFilter, sortBy, sortOrder, router]);

  useEffect(() => { if (token) fetchPayments(); }, [token]);

  const totalPages = Math.ceil(total / limit);

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortOrder('desc'); }
    setPage(0);
  };

  const exportCSV = () => {
    if (orders.length === 0) return;
    const headers = ['User ID', 'Items', 'Total', 'Status', 'Method', 'Transaction ID', 'Date'];
    const rows = orders.map((o) => [
      o.userId, o.items?.map((i) => i.name).join('; ') || '', o.total,
      o.paymentStatus, o.paymentMethod || '', o.transactionId || o.payuTxnId || o.cashfreeOrderId || '',
      o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'payments-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': case 'pending_manual': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      case 'pending': case 'pending_manual': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-purple-600" />
              Payments
            </h1>
            <p className="text-sm text-gray-500 mt-1">{total.toLocaleString()} total orders</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 text-gray-700">
              <Download className="w-4 h-4" /> Export
            </button>
            <button onClick={fetchPayments} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-white border rounded-lg hover:bg-gray-50 text-gray-700">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">₹{summary.totalRevenue.toLocaleString('en-IN')}</p>
                <p className="text-xs text-green-600">{summary.completedCount} completed orders</p>
              </div>
              <div className="bg-green-500 p-2 rounded-lg"><DollarSign className="w-5 h-5 text-white" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Order Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">₹{Math.round(summary.avgOrderValue).toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-purple-500 p-2 rounded-lg"><TrendingUp className="w-5 h-5 text-white" /></div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h4 className="text-sm text-gray-500 mb-3">By Status</h4>
            <div className="space-y-2">
              {statusBreakdown.map((s) => (
                <div key={s.status} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    {statusIcon(s.status)}
                    <span className="capitalize text-gray-700">{s.status}</span>
                  </span>
                  <span className="text-gray-600 font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user ID, item name, transaction ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
          </div>
          {showFilters && (
            <div className="flex items-center gap-3 flex-wrap mt-3 pt-3 border-t">
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }} className="px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="pending_manual">Pending Manual</option>
                <option value="failed">Failed</option>
              </select>
              <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(0); }} className="px-3 py-2 border rounded-lg text-sm bg-white">
                <option value="">All Methods</option>
                <option value="payu">PayU</option>
                <option value="cashfree">Cashfree</option>
                <option value="manual">Manual</option>
              </select>
              <button onClick={() => { setStatusFilter(''); setMethodFilter(''); setSearch(''); setPage(0); }} className="text-xs text-red-600 hover:underline">
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Orders Table */}
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
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">User</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Items</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">
                      <button onClick={() => handleSort('total')} className="flex items-center gap-1 hover:text-gray-900">
                        Amount <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">Status</th>
                    <th className="px-3 py-3 text-left hidden md:table-cell font-semibold text-gray-600">Method</th>
                    <th className="px-3 py-3 text-left font-semibold text-gray-600">
                      <button onClick={() => handleSort('createdAt')} className="flex items-center gap-1 hover:text-gray-900">
                        Date <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="px-3 py-3 text-right font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50 transition">
                      <td className="px-3 py-3">
                        <p className="text-gray-900 font-medium truncate">{order.userId || '-'}</p>
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-gray-700 truncate max-w-[200px]">
                          {order.items?.[0]?.name || 'N/A'}
                          {order.items?.length > 1 ? ` +${order.items.length - 1}` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-semibold text-gray-900">
                          {order.items?.[0]?.currency === 'USD' ? '$' : '₹'}{order.total?.toLocaleString() || 0}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(order.paymentStatus)}`}>
                          {statusIcon(order.paymentStatus)}
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-gray-600 capitalize">
                        {order.paymentMethod || '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={() => setViewOrder(order)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && !loading && (
                    <tr><td colSpan={7} className="text-center py-12 text-gray-400">No orders found</td></tr>
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

      {/* Order Detail Modal */}
      {viewOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setViewOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Order Details</h3>
              <button onClick={() => setViewOrder(null)} className="p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[11px] text-gray-500 mb-0.5">User ID</p>
                  <p className="text-sm font-medium text-gray-800">{viewOrder.userId}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[11px] text-gray-500 mb-0.5">Total</p>
                  <p className="text-sm font-medium text-gray-800">{viewOrder.items?.[0]?.currency === 'USD' ? '$' : '₹'}{viewOrder.total?.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[11px] text-gray-500 mb-0.5">Payment Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(viewOrder.paymentStatus)}`}>
                    {statusIcon(viewOrder.paymentStatus)} {viewOrder.paymentStatus}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[11px] text-gray-500 mb-0.5">Method</p>
                  <p className="text-sm font-medium text-gray-800 capitalize">{viewOrder.paymentMethod || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[11px] text-gray-500 mb-0.5">Date</p>
                  <p className="text-sm font-medium text-gray-800">{viewOrder.createdAt ? new Date(viewOrder.createdAt).toLocaleString() : '-'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-[11px] text-gray-500 mb-0.5">Transaction ID</p>
                  <p className="text-sm font-medium text-gray-800 truncate">{viewOrder.transactionId || viewOrder.payuTxnId || viewOrder.cashfreeOrderId || '-'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Items</h4>
                <div className="space-y-2">
                  {viewOrder.items?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.kind} × {item.quantity}</p>
                      </div>
                      <span className="font-semibold text-gray-800">
                        {item.currency === 'USD' ? '$' : '₹'}{item.price?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {viewOrder.shippingAddress && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Shipping Address</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    {typeof viewOrder.shippingAddress === 'object'
                      ? Object.values(viewOrder.shippingAddress).filter(Boolean).join(', ')
                      : String(viewOrder.shippingAddress)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
