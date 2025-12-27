'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  DataTable,
  FormModal,
  StatCard,
  PageHeader,
  LoadingSpinner,
  AlertBox,
  Toolbar,
  StatusBadge,
} from '@/components/admin/crm';

function toDateInputValue(v: string | undefined | null): string {
  if (!v) return '';
  // If already in YYYY-MM-DD format, keep as-is.
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  // Use UTC date portion for stability.
  return d.toISOString().slice(0, 10);
}

function parseLabelsText(v: string | undefined | null): string[] {
  const raw = String(v || '');
  const parts = raw.split(/[,|\n\r]+/g).map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= 25) break;
  }
  return out;
}

interface SaleRecord {
  _id: string;
  userId?: any;
  leadId?: any;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  workshopName?: string;
  batchDate?: string;
  reportedByUserId?: string;
  status?: string;
  labels?: string[];
  saleAmount: number;
  paymentMode: string;
  saleDate?: string;
  createdAt?: string;
}

interface SalesSummary {
  totalSales: number;
  totalTransactions: number;
  averageSale: number;
  maxSale: number;
  minSale: number;
  targetAchieved: number;
}

type SalesAggRow = {
  _id: string;
  totalSales: number;
  count: number;
};

export default function SalesPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [daily, setDaily] = useState<SalesAggRow[]>([]);
  const [monthly, setMonthly] = useState<SalesAggRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'summary' | 'daily' | 'monthly'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    saleId: '',
    customerId: '',
    customerName: '',
    customerPhone: '',
    workshopName: '',
    batchDate: '',
    saleAmount: 0,
    paymentMode: 'payu',
    saleDate: '',
    reportedByUserId: '',
    status: 'completed',
    labelsText: '',
  });

  const [draftFilters, setDraftFilters] = useState({
    workshop: '',
    batchFrom: '',
    batchTo: '',
    reportedByUserId: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    workshop: '',
    batchFrom: '',
    batchTo: '',
    reportedByUserId: '',
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadReportedByUserId, setUploadReportedByUserId] = useState('');

  const [formData, setFormData] = useState({
    customerId: '',
    leadId: '',
    customerName: '',
    customerPhone: '',
    workshopName: '',
    batchDate: '',
    saleAmount: 0,
    paymentMode: 'payu',
    status: 'completed',
    labelsText: '',
  });

  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<string>('');

  const fetchSalesData = useCallback(async () => {
    try {
      setError(null);
      const params: any = { view };
      if (appliedFilters.workshop.trim()) params.workshop = appliedFilters.workshop.trim();
      if (appliedFilters.batchFrom) params.batchFrom = appliedFilters.batchFrom;
      if (appliedFilters.batchTo) params.batchTo = appliedFilters.batchTo;
      if (appliedFilters.reportedByUserId.trim()) params.reportedByUserId = appliedFilters.reportedByUserId.trim();

      const result = await crmFetch('/api/admin/crm/sales', { params });
      if (view === 'summary') {
        const s = (result && typeof result === 'object' ? (result as any).summary : null) || {};
        setSummary({
          totalSales: Number(s.totalSales || 0),
          totalTransactions: Number(s.totalTransactions || 0),
          averageSale: Number(s.averageSale || 0),
          maxSale: Number(s.maxSale || 0),
          minSale: Number(s.minSale || 0),
          targetAchieved: Number(s.targetAchieved || 0),
        });
      } else if (view === 'daily') {
        setDaily(Array.isArray((result as any)?.daily) ? (result as any).daily : []);
      } else if (view === 'monthly') {
        setMonthly(Array.isArray((result as any)?.monthly) ? (result as any).monthly : []);
      } else {
        setSales((result as any)?.sales || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [crmFetch, view, appliedFilters]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchSalesData();
  }, [token, router, fetchSalesData]);

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crm.fetch('/api/admin/crm/sales', {
        method: 'POST',
        body: {
          customerId: formData.customerId || undefined,
          leadId: formData.leadId || undefined,
          customerName: formData.customerName || undefined,
          customerPhone: formData.customerPhone || undefined,
          workshopName: formData.workshopName || undefined,
          batchDate: formData.batchDate || undefined,
          saleAmount: formData.saleAmount,
          paymentMode: formData.paymentMode,
          status: formData.status || undefined,
          labels: parseLabelsText(formData.labelsText),
        },
      });

      setShowCreateModal(false);
      setFormData({
        customerId: '',
        leadId: '',
        customerName: '',
        customerPhone: '',
        workshopName: '',
        batchDate: '',
        saleAmount: 0,
        paymentMode: 'payu',
        status: 'completed',
        labelsText: '',
      });
      setLookupMsg('');
      fetchSalesData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sale');
    }
  };

  const lookupCustomer = async () => {
    const customerId = formData.customerId.trim();
    if (!customerId) {
      setLookupMsg('Enter Customer ID first.');
      return;
    }
    try {
      setLookupBusy(true);
      setLookupMsg('');
      const res = await crm.fetch('/api/admin/crm/sales/lookup', {
        params: { customerId },
      });

      if (!res?.found) {
        setLookupMsg('Customer not found. You can still fill details manually.');
        setFormData((prev) => ({
          ...prev,
          leadId: '',
          customerName: prev.customerName,
          customerPhone: prev.customerPhone,
          workshopName: prev.workshopName,
          batchDate: prev.batchDate,
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        customerId: String(res.customerId || prev.customerId),
        leadId: String(res.leadId || ''),
        customerName: String(res.customerName || ''),
        customerPhone: String(res.customerPhone || ''),
        workshopName: String(res.workshopName || ''),
        batchDate: toDateInputValue(res.batchDate ? String(res.batchDate) : ''),
        saleAmount:
          prev.saleAmount && prev.saleAmount > 0
            ? prev.saleAmount
            : (res.amount ? Number(res.amount) : prev.saleAmount),
      }));
      setLookupMsg('Customer loaded.');
    } catch (err) {
      setLookupMsg(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLookupBusy(false);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Delete this sale record?')) return;
    try {
      await crm.fetch('/api/admin/crm/sales', {
        method: 'DELETE',
        params: { saleId },
      });
      setError(null);
      fetchSalesData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const openEdit = (sale: SaleRecord) => {
    setEditData({
      saleId: sale._id,
      customerId: sale.customerId || '',
      customerName: sale.customerName || '',
      customerPhone: sale.customerPhone || '',
      workshopName: sale.workshopName || '',
      batchDate: toDateInputValue(sale.batchDate || ''),
      saleAmount: Number(sale.saleAmount || 0),
      paymentMode: sale.paymentMode || 'payu',
      saleDate: toDateInputValue(sale.saleDate || ''),
      reportedByUserId: sale.reportedByUserId || '',
      status: sale.status || 'completed',
      labelsText: Array.isArray(sale.labels) ? sale.labels.join(', ') : '',
    });
    setShowEditModal(true);
  };

  const handleEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crm.fetch('/api/admin/crm/sales', {
        method: 'PUT',
        body: {
          saleId: editData.saleId,
          customerId: editData.customerId || undefined,
          customerName: editData.customerName || undefined,
          customerPhone: editData.customerPhone || undefined,
          workshopName: editData.workshopName || undefined,
          batchDate: editData.batchDate || undefined,
          saleAmount: editData.saleAmount,
          paymentMode: editData.paymentMode,
          saleDate: editData.saleDate || undefined,
          reportedByUserId: editData.reportedByUserId || undefined,
          status: editData.status || undefined,
          labels: parseLabelsText(editData.labelsText),
        },
      });
      setShowEditModal(false);
      fetchSalesData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sale');
    }
  };

  const applyFilters = () => {
    setAppliedFilters({
      workshop: draftFilters.workshop,
      batchFrom: draftFilters.batchFrom,
      batchTo: draftFilters.batchTo,
      reportedByUserId: draftFilters.reportedByUserId,
    });
  };

  const clearFilters = () => {
    const empty = { workshop: '', batchFrom: '', batchTo: '', reportedByUserId: '' };
    setDraftFilters(empty);
    setAppliedFilters(empty);
  };

  const downloadCsv = useCallback(async () => {
    try {
      setError(null);
      if (!token) throw new Error('Missing admin token. Please login again.');

      const params = new URLSearchParams();
      params.set('view', 'list');
      params.set('format', 'csv');
      if (appliedFilters.workshop.trim()) params.set('workshop', appliedFilters.workshop.trim());
      if (appliedFilters.batchFrom) params.set('batchFrom', appliedFilters.batchFrom);
      if (appliedFilters.batchTo) params.set('batchTo', appliedFilters.batchTo);
      if (appliedFilters.reportedByUserId.trim()) params.set('reportedByUserId', appliedFilters.reportedByUserId.trim());

      const res = await fetch(`/api/admin/crm/sales?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `Download failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download CSV');
    }
  }, [token, appliedFilters]);

  const handleUploadSales = async () => {
    if (!token) {
      setError('Missing admin token. Please login again.');
      return;
    }
    if (!uploadFile) {
      setError('Please select an Excel file (.xlsx/.xls).');
      return;
    }

    try {
      setUploadBusy(true);
      setError(null);

      const fd = new FormData();
      fd.append('file', uploadFile);

      const url = new URL('/api/admin/crm/sales/upload', window.location.origin);
      if (uploadReportedByUserId.trim()) {
        url.searchParams.set('reportedByUserId', uploadReportedByUserId.trim());
      }

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error || `Upload failed (${res.status})`);
      }

      setShowUploadModal(false);
      setUploadFile(null);
      setUploadReportedByUserId('');
      fetchSalesData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload sales');
    } finally {
      setUploadBusy(false);
    }
  };

  const aggColumns = [
    { key: '_id', label: 'Period' },
    { key: 'count', label: 'Transactions', render: (v: number) => String(v ?? 0) },
    { key: 'totalSales', label: 'Total Revenue', render: (v: number) => `₹${Number(v || 0).toLocaleString()}` },
  ];

  const columns = [
    {
      key: 'customerId',
      label: 'Customer ID',
      render: (_: any, sale: SaleRecord) => (
        <div className="font-mono text-xs text-slate-700 break-words">{sale.customerId || '-'}</div>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer & Contact',
      render: (name: string, sale: SaleRecord) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-900 break-words">{name || 'N/A'}</div>
          <div className="text-xs text-slate-600 break-words">{sale.customerPhone || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'workshopName',
      label: 'Workshop',
      render: (_: any, sale: SaleRecord) => sale.workshopName || '-'
    },
    {
      key: 'status',
      label: 'Status',
      render: (_: any, sale: SaleRecord) => (
        <StatusBadge status={String(sale.status || '—')} size="sm" />
      ),
    },
    {
      key: 'labels',
      label: 'Label',
      render: (_: any, sale: SaleRecord) => {
        const labels = Array.isArray(sale.labels) ? sale.labels : [];
        if (!labels.length) return <span className="text-slate-500">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {labels.slice(0, 4).map((l) => (
              <span
                key={l}
                className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                title={l}
              >
                {l}
              </span>
            ))}
            {labels.length > 4 && (
              <span className="text-xs text-slate-500">+{labels.length - 4}</span>
            )}
          </div>
        );
      },
    },
    {
      key: 'batchDate',
      label: 'Batch Date',
      render: (_: any, sale: SaleRecord) => (sale.batchDate ? new Date(sale.batchDate).toLocaleDateString() : '-')
    },
    {
      key: 'reportedByUserId',
      label: 'Admin User',
      render: (_: any, sale: SaleRecord) => sale.reportedByUserId || '-',
    },
    { key: 'saleAmount', label: 'Amount', render: (amt: number) => `₹${amt?.toLocaleString() || 0}` },
    { key: 'paymentMode', label: 'Payment', render: (mode: string) => mode.charAt(0).toUpperCase() + mode.slice(1) },
    {
      key: 'saleDate',
      label: 'Date',
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, sale: SaleRecord) => (
        <div className="flex gap-2 items-center relative">
          {/* Messaging actions intentionally disabled for deployment scope */}

          {/* Edit Button */}
          <button
            onClick={() => openEdit(sale)}
            className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
            title="Edit sale"
          >
            Edit
          </button>

          {/* View Button */}
          <button
            onClick={() => router.push(`/admin/crm/sales/${sale._id}`)}
            className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-medium transition-colors"
            title="View sale details"
          >
            View
          </button>

          {/* Delete Button */}
          <button
            onClick={() => handleDeleteSale(sale._id)}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
            title="Delete sale"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header - Professional */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/crm')}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
                title="Go to CRM Dashboard"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div>
                <h1 className="text-4xl font-bold text-slate-900">Sales Management</h1>
                <p className="text-slate-600 text-lg">Track revenue, transactions, and workshop sales</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <button
              onClick={downloadCsv}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-lg transition-all font-semibold border border-blue-200 flex items-center gap-2"
            >
              📤 Export
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-amber-50 hover:bg-amber-100 text-amber-700 px-4 py-2 rounded-lg transition-all font-semibold border border-amber-200"
            >
              📤 Upload
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-2 rounded-lg transition-all font-bold shadow-md hover:shadow-lg"
            >
              + Record Sale
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 text-red-700 flex justify-between items-center">
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold text-xl">×</button>
          </div>
        )}

        {/* View Selector - Professional Tabs */}
        <div className="flex gap-2 flex-wrap bg-white border border-slate-200 rounded-xl p-2 w-fit">
          {(['list', 'summary', 'daily', 'monthly'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                view === v
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {v === 'list' && '📋 List'}
              {v === 'summary' && '📊 Summary'}
              {v === 'daily' && '📈 Daily'}
              {v === 'monthly' && '📅 Monthly'}
            </button>
          ))}
        </div>

        {/* Filters - Professional Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-6">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-3">Program/Workshop</label>
              <input
                type="text"
                value={draftFilters.workshop}
                onChange={(e) => setDraftFilters((p) => ({ ...p, workshop: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 font-medium placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 transition-all"
                placeholder="Search workshop"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-3">Date Range From</label>
              <input
                type="date"
                value={draftFilters.batchFrom}
                onChange={(e) => setDraftFilters((p) => ({ ...p, batchFrom: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-3">Date Range To</label>
              <input
                type="date"
                value={draftFilters.batchTo}
                onChange={(e) => setDraftFilters((p) => ({ ...p, batchTo: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm font-semibold mb-3">Reported By (User ID)</label>
              <input
                type="text"
                value={draftFilters.reportedByUserId}
                onChange={(e) => setDraftFilters((p) => ({ ...p, reportedByUserId: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 font-medium placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-400 transition-all"
                placeholder="Admin user ID"
              />
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <button
              onClick={applyFilters}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-2.5 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
            >
              ✓ Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-8 py-2.5 rounded-lg font-semibold transition-all border border-slate-300"
            >
              ✕ Clear
            </button>
          </div>
        </div>

        {/* Loading State */}
        {crm.loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Summary View */}
            {view === 'summary' && summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Sales"
                  value={String(summary.totalTransactions || 0)}
                  icon="📊"
                  color="purple"
                />
                <StatCard
                  label="Total Revenue"
                  value={`₹${Number(summary.totalSales || 0).toLocaleString()}`}
                  icon="💰"
                  color="green"
                />
                <StatCard
                  label="Average Sale"
                  value={`₹${Number(summary.averageSale || 0).toLocaleString()}`}
                  icon="📈"
                  color="blue"
                />
                <div className="bg-slate-800/50 border border-purple-500/20 rounded-xl p-6">
                  <div className="text-white font-semibold mb-4 text-sm">Summary</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-purple-200 text-xs"><span>Max Sale</span><span>₹{Number(summary.maxSale || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between text-purple-200 text-xs"><span>Min Sale</span><span>₹{Number(summary.minSale || 0).toLocaleString()}</span></div>
                    <div className="flex justify-between text-purple-200 text-xs"><span>Target Achieved</span><span>{Number(summary.targetAchieved || 0)}</span></div>
                  </div>
                </div>
              </div>
            )}

            {view === 'daily' && (
              <DataTable
                columns={aggColumns}
                data={daily}
                loading={crm.loading}
                empty={daily.length === 0}
                striped
                hover
              />
            )}

            {view === 'monthly' && (
              <DataTable
                columns={aggColumns}
                data={monthly}
                loading={crm.loading}
                empty={monthly.length === 0}
                striped
                hover
              />
            )}

            {/* Sales List */}
            {view === 'list' && (
              <DataTable
                columns={columns}
                data={sales}
                loading={crm.loading}
                empty={sales.length === 0}
                striped
                hover
              />
            )}
          </>
        )}
      </div>

      {/* Create Sale Modal */}
      {showCreateModal && (
        <FormModal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSale}
          title="Record New Sale"
          submitLabel="Record Sale"
          cancelLabel="Cancel"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-purple-200 text-sm mb-2">Customer ID *</label>
              <input
                type="text"
                required
                value={formData.customerId}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customerId: e.target.value,
                  })
                }
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="Enter customer id / phone / email"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={lookupCustomer}
                  disabled={lookupBusy}
                  className="px-3 py-1.5 rounded-lg bg-purple-600/40 text-white text-sm hover:bg-purple-600/60 disabled:opacity-60"
                >
                  {lookupBusy ? 'Loading...' : 'Load Customer'}
                </button>
                {lookupMsg && (
                  <span className={lookupMsg.toLowerCase().includes('loaded') ? 'text-green-200 text-xs' : 'text-purple-200 text-xs'}>
                    {lookupMsg}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-200 text-sm mb-2">Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Mobile</label>
                <input
                  type="text"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Workshop Name</label>
                <input
                  type="text"
                  value={formData.workshopName}
                  onChange={(e) => setFormData({ ...formData, workshopName: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="Workshop"
                />
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Batch Date</label>
                <input
                  type="date"
                  value={toDateInputValue(formData.batchDate)}
                  onChange={(e) => setFormData({ ...formData, batchDate: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-purple-200 text-sm mb-2">Amount (₹) *</label>
              <input
                type="number"
                required
                value={formData.saleAmount}
                onChange={(e) => setFormData({ ...formData, saleAmount: Number(e.target.value) })}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-purple-200 text-sm mb-2">Payment Mode</label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="payu">PayU</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-200 text-sm mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Labels (comma separated)</label>
                <input
                  type="text"
                  value={formData.labelsText}
                  onChange={(e) => setFormData({ ...formData, labelsText: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g., offline, referral"
                />
              </div>
            </div>
          </div>
        </FormModal>
      )}

      {/* Upload Sales Modal */}
      {showUploadModal && (
        <FormModal
          isOpen={true}
          onClose={() => {
            if (uploadBusy) return;
            setShowUploadModal(false);
            setUploadFile(null);
            setUploadReportedByUserId('');
          }}
          onSubmit={async () => {
            await handleUploadSales();
          }}
          title="Upload Sales (Old Data)"
          submitLabel="Upload"
          cancelLabel="Cancel"
          loading={uploadBusy}
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-purple-200 text-sm mb-2">Excel File (.xlsx/.xls)</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="w-full text-purple-100"
              />
              <p className="text-purple-200 text-xs mt-2">
                Supported columns: Customer ID, Name, Mobile/Phone, Workshop, Batch Date, Amount, Payment Mode, Sale Date.
              </p>
            </div>

            <div>
              <label className="block text-purple-200 text-sm mb-2">Reported By UserId (optional)</label>
              <input
                type="text"
                value={uploadReportedByUserId}
                onChange={(e) => setUploadReportedByUserId(e.target.value)}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="(super admin can override)"
              />
              <p className="text-purple-200 text-xs mt-2">
                If blank, uploads will be attributed to the logged-in admin user.
              </p>
            </div>
          </div>
        </FormModal>
      )}

      {/* Edit Sale Modal */}
      {showEditModal && (
        <FormModal
          isOpen={true}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEditSale}
          title="Edit Sale"
          submitLabel="Save"
          cancelLabel="Cancel"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-200 text-sm mb-2">Customer ID</label>
                <input
                  type="text"
                  value={editData.customerId}
                  onChange={(e) => setEditData({ ...editData, customerId: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Reported By (super admin only)</label>
                <input
                  type="text"
                  value={editData.reportedByUserId}
                  onChange={(e) => setEditData({ ...editData, reportedByUserId: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-200 text-sm mb-2">Name</label>
                <input
                  type="text"
                  value={editData.customerName}
                  onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Mobile</label>
                <input
                  type="text"
                  value={editData.customerPhone}
                  onChange={(e) => setEditData({ ...editData, customerPhone: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Workshop Name</label>
                <input
                  type="text"
                  value={editData.workshopName}
                  onChange={(e) => setEditData({ ...editData, workshopName: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Batch Date</label>
                <input
                  type="date"
                  value={toDateInputValue(editData.batchDate)}
                  onChange={(e) => setEditData({ ...editData, batchDate: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-200 text-sm mb-2">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={editData.saleAmount}
                  onChange={(e) => setEditData({ ...editData, saleAmount: Number(e.target.value) })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Payment Mode</label>
                <select
                  value={editData.paymentMode}
                  onChange={(e) => setEditData({ ...editData, paymentMode: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="payu">PayU</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Sale Date</label>
                <input
                  type="date"
                  value={toDateInputValue(editData.saleDate)}
                  onChange={(e) => setEditData({ ...editData, saleDate: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-200 text-sm mb-2">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-purple-200 text-sm mb-2">Labels (comma separated)</label>
                <input
                  type="text"
                  value={editData.labelsText}
                  onChange={(e) => setEditData({ ...editData, labelsText: e.target.value })}
                  className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  placeholder="e.g., offline, referral"
                />
              </div>
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
}
