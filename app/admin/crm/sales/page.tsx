'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { normalizePhoneForMeta } from '@/lib/utils/phone';
import CSVUploadPanel from '@/components/admin/crm/CSVUploadPanel';
import type { CSVContact, CSVColumnMap } from '@/components/admin/crm/CSVUploadPanel';
import {
  DataTable,
  FormModal,
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

// Helper to get leadId as string (handles both string and populated object)
function getLeadIdString(leadId: string | { _id: string } | undefined | null): string {
  if (!leadId) return '';
  if (typeof leadId === 'string') return leadId;
  return (leadId as any)?._id || '';
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
  customerEmail?: string;
  customerAddress?: string;
  workshopName?: string;
  batchDate?: string;
  reportedByUserId?: string;
  status?: string;
  labels?: string[];
  superAdminApproved?: boolean;
  superAdminApprovedAt?: string;
  superAdminApprovedBy?: string;
  saleAmount: number;
  workshopFee?: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentType?: 'full' | 'part' | 'advance';
  paymentHistory?: Array<{
    amount: number;
    date: string;
    mode: string;
    transactionId?: string;
    note?: string;
  }>;
  transactionId?: string;
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

const SALE_STATUS_OPTIONS = ['completed', 'pending', 'refunded', 'cancelled', 'failed'] as const;

// NOTE: Until we have a dedicated API endpoint for listing CRM admins, keep a small fallback list.
// If your deployment uses different admin userIds, update this list (or we can add an API later).
const ADMIN_USERID_OPTIONS = ['admin', 'admincrm'] as const;

type SalesAggRow = {
  _id: string;
  totalSales: number;
  count: number;
};

export default function SalesPage() {
  const router = useRouter();
  const token = useAuth();

  const enableMetaWhatsApp = (process.env.NEXT_PUBLIC_ENABLE_META_WHATSAPP || '').toLowerCase() === 'true';
  const crm = useCRM({ token });
  const crmFetch = crm.fetch;

  // Super admin state for approval checkbox visibility
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string>('');

  // Load user role on mount
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await fetch('/api/admin/crm/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        const u = json?.data;
        const perms = Array.isArray(u?.permissions) ? u.permissions : [];
        setViewerUserId(u?.userId || '');
        setIsSuperAdmin((u?.userId === 'admin' || u?.userId === 'admincrm') || perms.includes('all'));
      } catch {
        setIsSuperAdmin(false);
      }
    })();
  }, [token]);

  // Bulk selection + header actions
  const [selectedSaleIds, setSelectedSaleIds] = useState<Set<string>>(new Set());
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  useEffect(() => {
    setBulkActionsOpen(selectedSaleIds.size >= 2);
  }, [selectedSaleIds]);

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [daily, setDaily] = useState<SalesAggRow[]>([]);
  const [weekly, setWeekly] = useState<SalesAggRow[]>([]);
  const [monthly, setMonthly] = useState<SalesAggRow[]>([]);
  const [yearly, setYearly] = useState<SalesAggRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'summary' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('list');
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
    targetAchieved: false,
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
  const [csvContacts, setCsvContacts] = useState<CSVContact[]>([]);
  const [csvColumnMap, setCsvColumnMap] = useState<CSVColumnMap | null>(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);

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
    targetAchieved: false,
    reportedByUserId: '',
  });

  const [workshopOptions, setWorkshopOptions] = useState<string[]>([]);
  const [labelOptions, setLabelOptions] = useState<string[]>([]);

  useEffect(() => {
    if (token === null || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/crm/leads/metadata', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        const workshops = Array.isArray(json?.data?.workshops) ? json.data.workshops.map((w: any) => String(w)) : [];
        setWorkshopOptions(workshops);
      } catch {
        // Non-blocking
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    // Use whatever labels already exist in loaded sales as suggestions.
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of sales) {
      for (const l of Array.isArray(s.labels) ? s.labels : []) {
        const v = String(l || '').trim();
        if (!v) continue;
        const key = v.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(v);
      }
    }
    setLabelOptions(out.sort((a, b) => a.localeCompare(b)));
  }, [sales]);

  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMsg, setLookupMsg] = useState<string>('');

  const bulkDeleteSelected = useCallback(
    async (opts?: { clearAfter?: () => void; refreshAfter?: () => Promise<void> | void }) => {
      const ids = Array.from(selectedSaleIds);
      if (!ids.length) return;
      const ok = window.confirm(`Delete ${ids.length} selected sale(s)? This cannot be undone.`);
      if (!ok) return;
      try {
        setError(null);
        await Promise.all(ids.map((id) => crmFetch('/api/admin/crm/sales', { method: 'DELETE', params: { saleId: id } })));
        opts?.clearAfter?.();
        await opts?.refreshAfter?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Bulk delete failed');
      }
    },
    [crmFetch, selectedSaleIds]
  );

  const toggleSaleSelection = useCallback((saleId: string, opts?: { force?: boolean }) => {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      const exists = next.has(saleId);
      const shouldSelect = opts?.force ?? !exists;
      if (shouldSelect) next.add(saleId);
      else next.delete(saleId);
      return next;
    });
  }, []);

  const clearSaleSelection = useCallback(() => {
    setSelectedSaleIds(new Set());
  }, []);

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
      } else if (view === 'weekly') {
        setWeekly(Array.isArray((result as any)?.weekly) ? (result as any).weekly : []);
      } else if (view === 'monthly') {
        setMonthly(Array.isArray((result as any)?.monthly) ? (result as any).monthly : []);
      } else if (view === 'yearly') {
        setYearly(Array.isArray((result as any)?.yearly) ? (result as any).yearly : []);
      } else {
        setSales((result as any)?.sales || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [crmFetch, view, appliedFilters]);

  useEffect(() => {
    // Don't attempt fetch if token isn't loaded yet (null = loading, empty string = not authenticated)
    if (token === null) return;
    
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
          reportedByUserId: formData.reportedByUserId || undefined,
          status: formData.status || undefined,
          labels: parseLabelsText(formData.labelsText),
          targetAchieved: Boolean(formData.targetAchieved),
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
        targetAchieved: false,
        reportedByUserId: '',
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
      targetAchieved: (sale as any).targetAchieved ? true : false,
      superAdminApproved: sale.superAdminApproved ? true : false,
    });
    setShowEditModal(true);
  };

  const handleEditSale = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updateBody: any = {
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
        targetAchieved: Boolean((editData as any).targetAchieved),
      };
      
      // Only super admin can set approval
      if (isSuperAdmin) {
        updateBody.superAdminApproved = Boolean((editData as any).superAdminApproved);
        if (updateBody.superAdminApproved) {
          updateBody.superAdminApprovedBy = viewerUserId;
        }
      }

      await crm.fetch('/api/admin/crm/sales', {
        method: 'PUT',
        body: updateBody,
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
      key: '_select',
      label: '',
      render: (_: any, sale: SaleRecord) => {
        const checked = selectedSaleIds.has(sale._id);
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => toggleSaleSelection(sale._id, { force: e.target.checked })}
              className="h-4 w-4"
              aria-label={checked ? 'Deselect sale' : 'Select sale'}
            />
          </div>
        );
      },
    },
    {
      key: 'customerId',
      label: 'Customer ID',
      render: (_: any, sale: SaleRecord) => {
        const displayId = sale.customerId || sale.leadId?.leadNumber || (typeof sale.leadId === 'object' && sale.leadId?._id ? String(sale.leadId._id).slice(-8) : '') || '-';
        return <div className="font-mono text-xs text-white/70 break-words">{displayId}</div>;
      },
    },
    {
      key: 'customerName',
      label: 'Customer & Contact',
      render: (name: string, sale: SaleRecord) => {
        const displayName = name || sale.leadId?.name || 'N/A';
        const displayPhone = sale.customerPhone || sale.leadId?.phoneNumber || 'N/A';
        return (
          <div className="space-y-1">
            <div className="font-semibold text-white break-words">{displayName}</div>
            <div className="text-xs text-gray-400 break-words">{displayPhone}</div>
          </div>
        );
      }
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
        <div className="flex flex-col gap-1">
          <StatusBadge status={String(sale.status || '—')} size="sm" />
          {sale.superAdminApproved && (
            <span className="text-xs bg-emerald-600/30 text-emerald-400 px-1.5 py-0.5 rounded font-medium border border-emerald-500/30">
              ✓ Approved
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'labels',
      label: 'Label',
      render: (_: any, sale: SaleRecord) => {
        const labels = Array.isArray(sale.labels) ? sale.labels : [];
        if (!labels.length) return <span className="text-white/40">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {labels.slice(0, 4).map((l) => (
              <span
                key={l}
                className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20"
                title={l}
              >
                {l}
              </span>
            ))}
            {labels.length > 4 && (
              <span className="text-xs text-white/50">+{labels.length - 4}</span>
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
          {/* Receipt + messaging actions */}

          {/* Receipts Button */}
          <button
            onClick={() => router.push(`/admin/crm/sales/${sale._id}`)}
            className="px-3 py-1.5 bg-black border border-yellow-500 text-yellow-400 rounded-lg text-sm font-medium transition-colors hover:bg-yellow-400 hover:text-black"
            title="View Receipt"
          >
            Receipts
          </button>

          {/* WhatsApp Button */}
          <button
            onClick={() => {
              const phone = normalizePhoneForMeta(sale.customerPhone || '');
              const hasPhone = phone.length >= 10;
              if (!hasPhone && !sale.leadId) {
                setError('Missing customer phone number for WhatsApp');
                return;
              }

              // Route to leads-followup page for Meta WhatsApp
              const params = new URLSearchParams();
              if (sale.leadId) params.set('leadId', getLeadIdString(sale.leadId));
              if (phone) params.set('phone', phone);
              if (sale.customerName) params.set('name', sale.customerName);

              router.push(`/admin/crm/leads-followup?${params.toString()}`);
            }}
            className="px-3 py-1.5 bg-black border border-emerald-500 text-emerald-400 rounded-lg text-sm font-medium transition-colors hover:bg-emerald-600 hover:text-white"
            title="Meta WhatsApp"
          >
            WhatsApp
          </button>

          {/* Edit Button */}
          <button
            onClick={() => openEdit(sale)}
            className="px-3 py-1.5 bg-black border border-yellow-500 text-yellow-400 rounded-lg text-sm font-medium transition-colors hover:bg-yellow-400 hover:text-black"
            title="Edit sale"
          >
            Edit
          </button>

          {/* View Button */}
          <button
            onClick={() => router.push(`/admin/crm/sales/${sale._id}`)}
            className="px-3 py-1.5 bg-black border border-emerald-500 text-emerald-400 rounded-lg text-sm font-medium transition-colors hover:bg-emerald-600 hover:text-white"
            title="View sale details"
          >
            View
          </button>

          {/* Delete Button */}
          <button
            onClick={() => handleDeleteSale(sale._id)}
            className="px-3 py-1.5 bg-white border border-red-500 text-red-600 rounded-lg text-sm font-medium transition-colors hover:bg-red-600 hover:text-white"
            title="Delete sale"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const allSelectedOnPage = sales.length > 0 && sales.every((s) => selectedSaleIds.has(s._id));
  const someSelectedOnPage = sales.some((s) => selectedSaleIds.has(s._id));

  const toggleSelectAllOnPage = () => {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        sales.forEach((s) => next.delete(s._id));
      } else {
        sales.forEach((s) => next.add(s._id));
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="w-full space-y-8">
        {/* Page Header - Professional */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/crm')}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white border border-white/20"
                title="Go to CRM Dashboard"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div>
                <h1 className="text-4xl font-bold text-emerald-400">Sales Management</h1>
                <p className="text-white/70 text-lg">Track revenue, transactions, and workshop sales</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            <button
              onClick={downloadCsv}
              className="bg-black border border-emerald-500 text-emerald-400 px-4 py-2 rounded-lg transition-all font-semibold flex items-center gap-2 hover:bg-emerald-600 hover:text-white"
            >
              📤 Export
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-black border border-yellow-500 text-yellow-400 px-4 py-2 rounded-lg transition-all font-semibold hover:bg-yellow-400 hover:text-black"
            >
              📤 Upload
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-black border-2 border-emerald-500 text-emerald-400 px-6 py-2 rounded-lg transition-all font-bold hover:bg-emerald-600 hover:text-white"
            >
              + Record Sale
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 flex justify-between items-center backdrop-blur-sm">
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold text-xl">×</button>
          </div>
        )}

        {/* View Selector - Professional Tabs */}
        <div className="flex gap-2 flex-wrap bg-black border border-white/30 rounded-xl p-2 w-fit">
          {(['list', 'summary', 'yearly', 'monthly', 'weekly', 'daily'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                view === v
                  ? 'bg-black text-emerald-400 shadow-md border-2 border-emerald-500'
                  : 'bg-black text-white hover:text-yellow-400 border border-white/30'
              }`}
            >
              {v === 'list' && '📋 List'}
              {v === 'summary' && '📊 Summary'}
              {v === 'yearly' && '🧾 Yearly'}
              {v === 'daily' && '📈 Daily'}
              {v === 'weekly' && '🗓️ Weekly'}
              {v === 'monthly' && '📅 Monthly'}
            </button>
          ))}
        </div>

        {/* Bulk actions (header) */}
        {view === 'list' && selectedSaleIds.size > 0 && (
          <div className="bg-black border border-white/30 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="font-semibold text-white">Selected: {selectedSaleIds.size}</div>

              <button
                onClick={clearSaleSelection}
                className="px-3 py-1.5 bg-black border border-white/30 text-white rounded-lg font-semibold hover:bg-yellow-400 hover:text-black transition-colors"
              >
                Clear
              </button>

              <button
                onClick={() => toggleSelectAllOnPage()}
                className="px-3 py-1.5 bg-black border border-white/30 text-white rounded-lg font-semibold hover:text-yellow-400 transition-colors"
                title="Select/deselect all on this page"
              >
                Actions All
              </button>

              <button
                onClick={() => setBulkActionsOpen(true)}
                className="px-3 py-1.5 bg-black border border-emerald-500 text-emerald-400 rounded-lg font-semibold hover:bg-emerald-600 hover:text-white transition-colors"
              >
                Actions
              </button>

              <button
                onClick={() => bulkDeleteSelected({ clearAfter: clearSaleSelection, refreshAfter: fetchSalesData })}
                className="px-3 py-1.5 bg-white border border-red-500 text-red-600 rounded-lg font-semibold hover:bg-red-600 hover:text-white transition-colors"
                title="Delete selected sales"
              >
                Delete Selected
              </button>
            </div>

            <div className="text-sm text-white/60">
              Tip: select 2+ sales to auto-open actions.
            </div>
          </div>
        )}

        {/* Filters - Professional Card */}
        <div className="bg-black border border-white/30 rounded-xl p-8">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-6">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-white text-sm font-semibold mb-3">Program/Workshop</label>
              <input
                type="text"
                value={draftFilters.workshop}
                onChange={(e) => setDraftFilters((p) => ({ ...p, workshop: e.target.value }))}
                className="w-full bg-black border border-white/30 rounded-lg px-4 py-2.5 text-white font-medium placeholder-white/50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                placeholder="Search workshop"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-semibold mb-3">Date Range From</label>
              <input
                type="date"
                value={draftFilters.batchFrom}
                onChange={(e) => setDraftFilters((p) => ({ ...p, batchFrom: e.target.value }))}
                className="w-full bg-black border border-white/30 rounded-lg px-4 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-semibold mb-3">Date Range To</label>
              <input
                type="date"
                value={draftFilters.batchTo}
                onChange={(e) => setDraftFilters((p) => ({ ...p, batchTo: e.target.value }))}
                className="w-full bg-black border border-white/30 rounded-lg px-4 py-2.5 text-white font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-white text-sm font-semibold mb-3">Reported By (User ID)</label>
              <input
                type="text"
                value={draftFilters.reportedByUserId}
                onChange={(e) => setDraftFilters((p) => ({ ...p, reportedByUserId: e.target.value }))}
                className="w-full bg-black border border-white/30 rounded-lg px-4 py-2.5 text-white font-medium placeholder-white/50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                placeholder="Admin user ID"
              />
            </div>
          </div>
          <div className="mt-8 flex gap-3">
            <button
              onClick={applyFilters}
              className="bg-black border border-emerald-500 text-emerald-400 px-8 py-2.5 rounded-lg font-semibold transition-all hover:bg-emerald-600 hover:text-white"
            >
              ✓ Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="bg-black border border-yellow-500 text-yellow-400 px-8 py-2.5 rounded-lg font-semibold transition-all hover:bg-yellow-400 hover:text-black"
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
                {/* Total Sales Card */}
                <div className="bg-black border border-white/30 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider">Total Sales</h3>
                    <span className="text-2xl">📊</span>
                  </div>
                  <p className="text-4xl font-black text-white mt-3">{String(summary.totalTransactions || 0)}</p>
                </div>
                
                {/* Total Revenue Card */}
                <div className="bg-black border border-white/30 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider">Total Revenue</h3>
                    <span className="text-2xl">💰</span>
                  </div>
                  <p className="text-4xl font-black text-yellow-400 mt-3">₹{Number(summary.totalSales || 0).toLocaleString()}</p>
                </div>
                
                {/* Average Sale Card */}
                <div className="bg-black border border-white/30 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-wider">Average Sale</h3>
                    <span className="text-2xl">📈</span>
                  </div>
                  <p className="text-4xl font-black text-yellow-400 mt-3">₹{Number(summary.averageSale || 0).toLocaleString()}</p>
                </div>
                
                {/* Summary Card */}
                <div className="bg-black border border-white/30 rounded-xl p-6">
                  <div className="text-emerald-400 font-bold mb-4 text-sm uppercase tracking-wider">
                    Summary
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Max Sale</span>
                      <span className="font-bold text-yellow-400">₹{Number(summary.maxSale || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Min Sale</span>
                      <span className="font-bold text-yellow-400">₹{Number(summary.minSale || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/70">Target Achieved</span>
                      <span className="font-bold text-white">{Number(summary.targetAchieved || 0)}</span>
                    </div>
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

            {/* Weekly View */}
            {view === 'weekly' && (
              <DataTable
                columns={aggColumns}
                data={weekly}
                loading={crm.loading}
                empty={weekly.length === 0}
                striped
                hover
              />
            )}

            {/* Yearly View */}
            {view === 'yearly' && (
              <DataTable
                columns={aggColumns}
                data={yearly}
                loading={crm.loading}
                empty={yearly.length === 0}
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
              <label className="block text-white text-sm mb-2 font-semibold">Customer ID *</label>
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
                className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Enter customer id / phone / email"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={lookupCustomer}
                  disabled={lookupBusy}
                  className="px-3 py-1.5 rounded-lg bg-black border border-yellow-500 text-yellow-400 text-sm hover:bg-yellow-400 hover:text-black disabled:opacity-60 font-medium"
                >
                  {lookupBusy ? 'Loading...' : 'Load Customer'}
                </button>
                {lookupMsg && (
                  <span className={lookupMsg.toLowerCase().includes('loaded') ? 'text-emerald-400 text-xs font-medium' : 'text-white/70 text-xs'}>
                    {lookupMsg}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm mb-2 font-semibold">Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2 font-semibold">Mobile</label>
                <input
                  type="text"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  onBlur={(e) => {
                    const normalized = normalizePhoneForMeta(e.target.value);
                    if (normalized) setFormData({ ...formData, customerPhone: normalized });
                  }}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2 font-semibold">Workshop Name</label>
                <select
                  value={formData.workshopName}
                  onChange={(e) => setFormData({ ...formData, workshopName: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">(select)</option>
                  {workshopOptions.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white text-sm mb-2 font-semibold">Batch Date</label>
                <input
                  type="date"
                  value={toDateInputValue(formData.batchDate)}
                  onChange={(e) => setFormData({ ...formData, batchDate: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-white text-sm mb-2 font-semibold">Amount (₹) *</label>
              <input
                type="number"
                required
                value={formData.saleAmount}
                onChange={(e) => setFormData({ ...formData, saleAmount: Number(e.target.value) })}
                className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-white text-sm mb-2 font-semibold">Payment Mode</label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="payu">PayU</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="targetAchieved"
                type="checkbox"
                checked={Boolean(formData.targetAchieved)}
                onChange={(e) => setFormData({ ...formData, targetAchieved: e.target.checked })}
                className="h-4 w-4 rounded border-white/20"
              />
              <label htmlFor="targetAchieved" className="text-white text-sm font-medium">
                Target achieved
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm mb-2 font-semibold">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  {SALE_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white text-sm mb-2 font-semibold">Label</label>
                <select
                  value={formData.labelsText}
                  onChange={(e) => setFormData({ ...formData, labelsText: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">(select)</option>
                  {labelOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-white text-sm mb-2 font-semibold">Admin User (Reported by)</label>
              <select
                value={formData.reportedByUserId}
                onChange={(e) => setFormData({ ...formData, reportedByUserId: e.target.value })}
                className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">(use logged-in admin)</option>
                {ADMIN_USERID_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FormModal>
      )}

      {/* Upload Sales Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-gray-950 border-2 border-white/30 rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-emerald-400">📄 Bulk Import Sales</h2>
              <button
                onClick={() => {
                  if (csvImporting) return;
                  setShowUploadModal(false);
                  setCsvContacts([]);
                  setCsvColumnMap(null);
                  setCsvFileName('');
                }}
                className="text-white/40 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <CSVUploadPanel
              previewColumns={['name', 'phone', 'email', 'workshop', 'amount', 'date', 'customerId']}
              contacts={csvContacts}
              fileName={csvFileName}
              columnMap={csvColumnMap}
              accent="purple"
              label="Upload CSV or Excel — Auto-detect Name, Phone, Amount, Workshop, Date"
              onContactsParsed={(contacts, colMap, name) => {
                setCsvContacts(contacts);
                setCsvColumnMap(colMap);
                setCsvFileName(name);
              }}
              onRemove={() => {
                setCsvContacts([]);
                setCsvColumnMap(null);
                setCsvFileName('');
              }}
            />

            {csvContacts.length > 0 && (
              <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-500/30">
                <p className="text-emerald-300 text-sm font-semibold">
                  Ready to import {csvContacts.length} sale records
                </p>
                <p className="text-emerald-400/70 text-xs mt-1">
                  Records without a valid amount will be skipped. Missing fields can be updated later.
                </p>
              </div>
            )}

            {/* Reported By override for super admin */}
            {isSuperAdmin && (
              <div>
                <label className="block text-emerald-400 text-sm mb-1 font-semibold">Reported By (optional)</label>
                <input
                  type="text"
                  value={uploadReportedByUserId}
                  onChange={(e) => setUploadReportedByUserId(e.target.value)}
                  className="w-full bg-black border border-white/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Leave blank for logged-in admin"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                disabled={csvContacts.length === 0 || csvImporting}
                onClick={async () => {
                  if (!token || csvContacts.length === 0) return;
                  setCsvImporting(true);
                  try {
                    const records = csvContacts.map(c => {
                      const rec: any = {
                        customerPhone: c.phoneNumber,
                      };
                      if (c.name) rec.customerName = c.name;
                      if (c.email) rec.customerEmail = c.email;
                      if (csvColumnMap?.workshop) {
                        const v = c.raw[csvColumnMap.workshop]?.trim();
                        if (v) rec.workshopName = v;
                      }
                      if (csvColumnMap?.amount) {
                        const v = Number(c.raw[csvColumnMap.amount]);
                        if (Number.isFinite(v) && v > 0) rec.saleAmount = v;
                      }
                      if (csvColumnMap?.paymentMode) {
                        const v = c.raw[csvColumnMap.paymentMode]?.trim();
                        if (v) rec.paymentMode = v;
                      }
                      if (csvColumnMap?.date) {
                        const v = c.raw[csvColumnMap.date]?.trim();
                        if (v) rec.saleDate = v;
                      }
                      if (csvColumnMap?.batchDate) {
                        const v = c.raw[csvColumnMap.batchDate]?.trim();
                        if (v) rec.batchDate = v;
                      }
                      if (csvColumnMap?.customerId) {
                        const v = c.raw[csvColumnMap.customerId]?.trim();
                        if (v) rec.customerId = v;
                      }
                      if (csvColumnMap?.status) {
                        const v = c.raw[csvColumnMap.status]?.trim();
                        if (v) rec.status = v;
                      }
                      if (csvColumnMap?.address) {
                        const v = c.raw[csvColumnMap.address]?.trim();
                        if (v) rec.customerAddress = v;
                      }
                      if (csvColumnMap?.labels) {
                        const v = c.raw[csvColumnMap.labels]?.trim();
                        if (v) rec.labels = v.split(/[,|]+/).map((l: string) => l.trim()).filter(Boolean);
                      }
                      return rec;
                    });

                    const body: any = { records };
                    if (uploadReportedByUserId.trim()) {
                      body.reportedByUserId = uploadReportedByUserId.trim();
                    }

                    const res = await fetch('/api/admin/crm/sales/bulk-import', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(body),
                    });

                    const data = await res.json();
                    if (res.ok && data.success) {
                      alert(`✅ Imported ${data.data.imported} sale records!\n${data.data.skipped} skipped.${data.data.failed ? `\n${data.data.failed} failed.` : ''}`);
                      setShowUploadModal(false);
                      setCsvContacts([]);
                      setCsvColumnMap(null);
                      setCsvFileName('');
                      setUploadReportedByUserId('');
                      fetchSalesData();
                    } else {
                      alert(`Error: ${data.error || 'Import failed'}`);
                    }
                  } catch (err) {
                    alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                  } finally {
                    setCsvImporting(false);
                  }
                }}
                className="flex-1 bg-black border border-emerald-500 text-emerald-400 px-4 py-2 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {csvImporting ? '⏳ Importing...' : `Import ${csvContacts.length} Sales`}
              </button>
              <button
                onClick={() => {
                  if (csvImporting) return;
                  setShowUploadModal(false);
                  setCsvContacts([]);
                  setCsvColumnMap(null);
                  setCsvFileName('');
                  setUploadReportedByUserId('');
                }}
                disabled={csvImporting}
                className="flex-1 bg-black border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors font-medium disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
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
                <label className="block text-white text-sm mb-2">Customer ID</label>
                <input
                  type="text"
                  value={editData.customerId}
                  onChange={(e) => setEditData({ ...editData, customerId: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Admin User (Reported by)</label>
                <select
                  value={editData.reportedByUserId}
                  onChange={(e) => setEditData({ ...editData, reportedByUserId: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">(use logged-in admin)</option>
                  {ADMIN_USERID_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm mb-2">Name</label>
                <input
                  type="text"
                  value={editData.customerName}
                  onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Mobile</label>
                <input
                  type="text"
                  value={editData.customerPhone}
                  onChange={(e) => setEditData({ ...editData, customerPhone: e.target.value })}
                  onBlur={(e) => {
                    const normalized = normalizePhoneForMeta(e.target.value);
                    if (normalized) setEditData({ ...editData, customerPhone: normalized });
                  }}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Workshop Name</label>
                <select
                  value={editData.workshopName}
                  onChange={(e) => setEditData({ ...editData, workshopName: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">(select)</option>
                  {workshopOptions.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Batch Date</label>
                <input
                  type="date"
                  value={toDateInputValue(editData.batchDate)}
                  onChange={(e) => setEditData({ ...editData, batchDate: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="targetAchievedEdit"
                type="checkbox"
                checked={Boolean((editData as any).targetAchieved)}
                onChange={(e) => setEditData({ ...(editData as any), targetAchieved: e.target.checked })}
                className="h-4 w-4"
              />
              <label htmlFor="targetAchievedEdit" className="text-white text-sm">
                Target achieved
              </label>
            </div>

            {/* Super Admin Approval Checkbox - Only visible to super admins */}
            {isSuperAdmin && (
              <div className="flex items-center gap-3 p-3 bg-green-900/30 border border-green-500/30 rounded-lg">
                <input
                  id="superAdminApprovedEdit"
                  type="checkbox"
                  checked={Boolean((editData as any).superAdminApproved)}
                  onChange={(e) => setEditData({ ...(editData as any), superAdminApproved: e.target.checked })}
                  className="h-4 w-4"
                />
                <label htmlFor="superAdminApprovedEdit" className="text-emerald-400 text-sm font-medium">
                  Super Admin Approved ✓
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm mb-2">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={editData.saleAmount}
                  onChange={(e) => setEditData({ ...editData, saleAmount: Number(e.target.value) })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Payment Mode</label>
                <select
                  value={editData.paymentMode}
                  onChange={(e) => setEditData({ ...editData, paymentMode: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="payu">PayU</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Sale Date</label>
                <input
                  type="date"
                  value={toDateInputValue(editData.saleDate)}
                  onChange={(e) => setEditData({ ...editData, saleDate: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm mb-2">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  {SALE_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Label</label>
                <select
                  value={editData.labelsText}
                  onChange={(e) => setEditData({ ...editData, labelsText: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">(select)</option>
                  {labelOptions.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </FormModal>
      )}
    </div>
  );
}
