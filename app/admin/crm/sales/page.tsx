'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, getLoginPath } from '@/hooks/useAuth';
import { checkIsSuperAdmin } from '@/lib/client-auth';
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
import ReceiptPreviewModal from '@/components/admin/crm/ReceiptPreviewModal';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  Upload,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  FileText,
  Sparkles,
  ArrowRight,
  Layers,
  Receipt,
  RotateCcw,
  ShoppingBag,
  Tag,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';

function toDateInputValue(v: string | undefined | null): string {
  if (!v) return '';
  // If already in YYYY-MM-DD format, keep as-is.
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  // Use UTC date portion for stability.
  return d.toISOString().slice(0, 10);
}

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

// Start of the current Indian financial year (1 April).
function financialYearStartDateInputValue(): string {
  const d = new Date();
  const year = d.getUTCMonth() >= 3 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  return `${year}-04-01`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Years available in the month/year date-range pickers.
function dateRangeYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= currentYear - 6; y--) years.push(y);
  return years;
}

// Parses a YYYY-MM-DD string into the year/month it falls in, defaulting to today.
function parseYearMonth(v: string | undefined | null): { year: number; month: number } {
  if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m] = v.split('-').map(Number);
    return { year: y, month: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function monthStartDateInputValue(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

function monthEndDateInputValue(year: number, month: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

// Formats a YYYY-MM-DD string as "01 Apr 2026" for report headers.
function formatDateRangeLabel(v: string | undefined | null): string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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
  bankName?: string;
  saleDate?: string;
  createdAt?: string;
  tallySynced?: boolean;
  tallySyncedAt?: string;
  tallySyncedBy?: string;
  tallyVoucherId?: string;
  tallyError?: string;
  receiptId?: string;
  receiptNumber?: string;
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
        setViewerUserId(u?.userId || '');
        setIsSuperAdmin(checkIsSuperAdmin());
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

  // Add-to-Event modal
  const [addToEventOpen, setAddToEventOpen] = useState(false);
  const [eventOptions, setEventOptions] = useState<Array<{ _id: string; month: string; workshopName: string; startDate: string; participantCount: number }>>([]);
  const [loadingEventOptions, setLoadingEventOptions] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [addingToEvent, setAddingToEvent] = useState(false);

  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [daily, setDaily] = useState<SalesAggRow[]>([]);
  const [weekly, setWeekly] = useState<SalesAggRow[]>([]);
  const [monthly, setMonthly] = useState<SalesAggRow[]>([]);
  const [yearly, setYearly] = useState<SalesAggRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
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
    bankName: '',
    transactionId: '',
    saleDate: '',
    reportedByUserId: '',
    status: 'completed',
    labelsText: '',
    targetAchieved: false,
    superAdminApproved: false,
  });

  const [draftFilters, setDraftFilters] = useState<{
    workshop: string[];
    batchFrom: string;
    batchTo: string;
    reportedByUserId: string;
  }>({
    workshop: [],
    batchFrom: financialYearStartDateInputValue(),
    batchTo: todayDateInputValue(),
    reportedByUserId: '',
  });
  const [appliedFilters, setAppliedFilters] = useState<{
    workshop: string[];
    batchFrom: string;
    batchTo: string;
    reportedByUserId: string;
  }>({
    workshop: [],
    batchFrom: financialYearStartDateInputValue(),
    batchTo: todayDateInputValue(),
    reportedByUserId: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [workshopFilterOpen, setWorkshopFilterOpen] = useState(false);
  const workshopFilterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!workshopFilterOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (workshopFilterRef.current && !workshopFilterRef.current.contains(e.target as Node)) {
        setWorkshopFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [workshopFilterOpen]);

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showExportMenu) return;
    const onClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [showExportMenu]);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadReportedByUserId, setUploadReportedByUserId] = useState('');
  const [csvContacts, setCsvContacts] = useState<CSVContact[]>([]);
  const [csvColumnMap, setCsvColumnMap] = useState<CSVColumnMap | null>(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);
  const [tallySyncingId, setTallySyncingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerId: '',
    leadId: '',
    customerName: '',
    customerPhone: '',
    workshopName: '',
    batchDate: todayDateInputValue(),
    saleAmount: 0,
    paymentMode: 'payu',
    bankName: '',
    transactionId: '',
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
  const [generatingFromLeads, setGeneratingFromLeads] = useState(false);

  const openAddToEvent = useCallback(async () => {
    setAddToEventOpen(true);
    setSelectedEventId('');
    setLoadingEventOptions(true);
    try {
      const list = await crmFetch('/api/admin/crm/sales/events', { params: { limit: 1000 } });
      setEventOptions(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setLoadingEventOptions(false);
    }
  }, [crmFetch]);

  const addSelectedToEvent = useCallback(
    async (opts?: { clearAfter?: () => void }) => {
      const ids = Array.from(selectedSaleIds);
      if (!ids.length || !selectedEventId) return;
      setAddingToEvent(true);
      setError(null);
      try {
        await crmFetch(`/api/admin/crm/sales/events/${selectedEventId}`, {
          method: 'PUT',
          body: { addSaleIds: ids },
        });
        setSuccessMsg(`Added ${ids.length} sale(s) to the event`);
        setAddToEventOpen(false);
        opts?.clearAfter?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add to event');
      } finally {
        setAddingToEvent(false);
      }
    },
    [crmFetch, selectedSaleIds, selectedEventId]
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
      if (view === 'list') params.limit = 1000; // show all entries, not just first 50
      if (appliedFilters.workshop.length > 0) params.workshop = appliedFilters.workshop.join(',');
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

      // Period views also need the full transaction list to show real
      // transactions grouped under each period header.
      if (view === 'daily' || view === 'weekly' || view === 'monthly' || view === 'yearly') {
        const listResult = await crmFetch('/api/admin/crm/sales', { params: { ...params, view: 'list', limit: 1000 } });
        setSales((listResult as any)?.sales || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [crmFetch, view, appliedFilters]);


  useEffect(() => {
    if (token === null) return;
    if (!token) return;
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
          bankName: formData.bankName || undefined,
          transactionId: formData.transactionId || undefined,
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
        batchDate: todayDateInputValue(),
        saleAmount: 0,
        paymentMode: 'payu',
        bankName: '',
        transactionId: '',
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

  const lookupCustomer = async (searchValue?: string) => {
    const customerId = (searchValue ?? formData.customerId).trim();
    if (!customerId) {
      setLookupMsg('Enter Customer ID or Mobile first.');
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
      bankName: sale.bankName || '',
      transactionId: sale.transactionId || '',
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
        bankName: editData.bankName || undefined,
        transactionId: editData.transactionId || undefined,
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
    const empty = { workshop: [] as string[], batchFrom: '', batchTo: '', reportedByUserId: '' };
    setDraftFilters(empty);
    setAppliedFilters(empty);
  };

  type SalesExportRow = {
    date: string;
    name: string;
    mobile: string;
    workshop: string;
    amount: number | string;
    bankOrCash: string;
    transactionDetails: string;
  };

  type SalesExportRowWithTotal = SalesExportRow & { isTotal?: boolean };

  // Rows arrive sorted oldest-to-newest by batchDate, so a simple month-change
  // check is enough to know when to drop in a subtotal.
  const monthLabel = (ym: string): string => {
    const [y, m] = ym.split('-').map(Number);
    if (!y || !m) return ym || 'Unknown';
    return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  };

  const withMonthlyTotals = (rows: SalesExportRow[]): SalesExportRowWithTotal[] => {
    const result: SalesExportRowWithTotal[] = [];
    let currentMonth = '';
    let monthSum = 0;
    let grandSum = 0;
    let monthCount = 0;

    const pushMonthTotal = () => {
      monthCount += 1;
      result.push({
        date: '',
        name: `Monthly Total - ${monthLabel(currentMonth)}`,
        mobile: '',
        workshop: '',
        amount: monthSum,
        bankOrCash: '',
        transactionDetails: '',
        isTotal: true,
      });
    };

    for (const r of rows) {
      const ym = r.date ? r.date.slice(0, 7) : '';
      if (currentMonth && ym !== currentMonth) {
        pushMonthTotal();
        monthSum = 0;
      }
      currentMonth = ym || currentMonth;
      monthSum += Number(r.amount) || 0;
      grandSum += Number(r.amount) || 0;
      result.push(r);
    }
    if (currentMonth) pushMonthTotal();

    if (monthCount > 1) {
      result.push({
        date: '',
        name: 'Grand Total',
        mobile: '',
        workshop: '',
        amount: grandSum,
        bankOrCash: '',
        transactionDetails: '',
        isTotal: true,
      });
    }

    return result;
  };

  const fetchExportRows = useCallback(async (): Promise<SalesExportRow[]> => {
    if (!token) throw new Error('Missing admin token. Please login again.');

    const params = new URLSearchParams();
    params.set('view', 'list');
    params.set('format', 'json');
    if (appliedFilters.workshop.length > 0) params.set('workshop', appliedFilters.workshop.join(','));
    if (appliedFilters.batchFrom) params.set('batchFrom', appliedFilters.batchFrom);
    if (appliedFilters.batchTo) params.set('batchTo', appliedFilters.batchTo);
    if (appliedFilters.reportedByUserId.trim()) params.set('reportedByUserId', appliedFilters.reportedByUserId.trim());

    const res = await fetch(`/api/admin/crm/sales?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || `Download failed (${res.status})`);
    }

    const rows: SalesExportRow[] = Array.isArray(data?.data?.rows) ? data.data.rows : [];
    if (rows.length === 0) throw new Error('No sales match the current filters.');
    return rows;
  }, [token, appliedFilters]);

  const downloadExcel = useCallback(async () => {
    try {
      setError(null);
      setExporting(true);
      const rows = await fetchExportRows();

      const XLSX = await import('xlsx');
      const rowsWithTotals = withMonthlyTotals(rows);
      const excelData = rowsWithTotals.map((r) => ({
        Date: r.date,
        Name: r.name,
        'Mobile Number': r.mobile,
        'Workshop Name': r.workshop,
        'Amount Received': r.amount,
        'Bank/Cash': r.bankOrCash,
        'Transaction Details': r.transactionDetails,
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales');
      ws['!cols'] = [
        { wch: 12 },
        { wch: 22 },
        { wch: 15 },
        { wch: 22 },
        { wch: 16 },
        { wch: 14 },
        { wch: 22 },
      ];

      XLSX.writeFile(wb, `sales_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download Excel');
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  }, [fetchExportRows]);

  const downloadPdf = useCallback(async () => {
    try {
      setError(null);
      setExporting(true);
      const rows = await fetchExportRows();

      const [{ default: jsPDF }, autoTableModule] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);
      const autoTable = autoTableModule.default;

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      const fromLabel = formatDateRangeLabel(appliedFilters.batchFrom) || 'All';
      const toLabel = formatDateRangeLabel(appliedFilters.batchTo) || 'All';
      const rangeLabel = fromLabel === 'All' && toLabel === 'All' ? 'All Dates' : `${fromLabel}   To   ${toLabel}`;

      const drawHeader = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(109, 40, 217);
        doc.text('Swar Yoga Workshop', pageWidth / 2, 14, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text('Enrollment Details', pageWidth / 2, 21, { align: 'center' });

        if (rangeLabel) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(90, 90, 90);
          doc.text(rangeLabel, pageWidth / 2, 27, { align: 'center' });
        }

        doc.setDrawColor(109, 40, 217);
        doc.setLineWidth(0.5);
        doc.line(14, 30, pageWidth - 14, 30);
      };

      const rowsWithTotals = withMonthlyTotals(rows);
      const totalRowFlags = rowsWithTotals.map((r) => !!r.isTotal);

      autoTable(doc, {
        startY: 35,
        margin: { top: 35 },
        head: [['Date', 'Name', 'Mobile Number', 'Workshop Name', 'Amount Received', 'Bank/Cash', 'Transaction Details']],
        body: rowsWithTotals.map((r) => [r.date, r.name, r.mobile, r.workshop, String(r.amount ?? ''), r.bankOrCash, r.transactionDetails]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [109, 40, 217] },
        didParseCell: (data) => {
          if (data.section === 'body' && totalRowFlags[data.row.index]) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [237, 233, 254];
          }
        },
        didDrawPage: drawHeader,
      });

      const fileSuffix = appliedFilters.batchFrom && appliedFilters.batchTo
        ? `${appliedFilters.batchFrom}_to_${appliedFilters.batchTo}`
        : new Date().toISOString().slice(0, 10);
      doc.save(`swar_yoga_enrollment_${fileSuffix}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  }, [fetchExportRows, appliedFilters]);

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

  // Period key for a sale, matching the backend's $dateToString/$year/$week grouping (UTC-based).
  function periodKeyForSale(s: SaleRecord, periodView: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
    const d = new Date(s.saleDate || s.createdAt || 0);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    if (periodView === 'yearly') return String(yyyy);
    if (periodView === 'monthly') return `${yyyy}-${mm}`;
    if (periodView === 'daily') return `${yyyy}-${mm}-${dd}`;
    // weekly: matches Mongo's $week (Sunday-based week of year)
    const jan1 = new Date(Date.UTC(yyyy, 0, 1));
    const dayOfYear = Math.floor((d.getTime() - jan1.getTime()) / 86400000);
    const week = Math.floor((dayOfYear + jan1.getUTCDay()) / 7);
    return `${yyyy}-W${week}`;
  }

  // Client-side search across the loaded sales: matches Customer ID, Lead ID,
  // name, mobile number, or amount.
  const filteredSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((s) => {
      const leadNumber = (typeof s.leadId === 'object' && s.leadId?.leadNumber) || '';
      const leadName = (typeof s.leadId === 'object' && s.leadId?.name) || '';
      const leadPhone = (typeof s.leadId === 'object' && s.leadId?.phoneNumber) || '';
      const haystack = [
        s.customerId,
        leadNumber,
        s.customerName,
        leadName,
        s.customerPhone,
        leadPhone,
        s.saleAmount != null ? String(s.saleAmount) : '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sales, searchQuery]);

  const allSelectedOnPage = filteredSales.length > 0 && filteredSales.every((s) => selectedSaleIds.has(s._id));
  const someSelectedOnPage = filteredSales.some((s) => selectedSaleIds.has(s._id));

  const toggleSelectAllOnPage = () => {
    setSelectedSaleIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        filteredSales.forEach((s) => next.delete(s._id));
      } else {
        filteredSales.forEach((s) => next.add(s._id));
      }
      return next;
    });
  };

  const columns = [
    {
      key: '_select',
      label: (
        <input
          type="checkbox"
          checked={allSelectedOnPage}
          ref={(el) => { if (el) el.indeterminate = !allSelectedOnPage && someSelectedOnPage; }}
          onChange={() => toggleSelectAllOnPage()}
          className="h-4 w-4"
          title={allSelectedOnPage ? 'Deselect all' : 'Select all'}
          aria-label={allSelectedOnPage ? 'Deselect all' : 'Select all'}
        />
      ),
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
        return (
          <div className="border border-white/20 rounded-xl px-3 py-2 bg-white/5 text-center">
            <div className="text-xs font-bold text-green-400 mb-1">LEAD ID</div>
            <div className="font-mono font-bold text-white">{displayId}</div>
          </div>
        );
      },
    },
    {
      key: 'customerName',
      label: 'Customer & Contact',
      render: (name: string, sale: SaleRecord) => {
        const displayName = name || sale.leadId?.name || 'N/A';
        const leadPhone = sale.leadId?.phoneNumber || '';
        // Synthetic placeholder numbers (919999900xxx) minted when no real
        // phone was on file -- don't show these as if they were real.
        const isPlaceholderPhone = /^91?9999900\d{3}$/.test(leadPhone);
        const displayPhone = sale.customerPhone || (isPlaceholderPhone ? '' : leadPhone) || 'N/A';
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
              ✓ Amount Received
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
    { key: 'bankName', label: 'Bank', render: (_: any, sale: SaleRecord) => sale.bankName || '-' },
    {
      key: 'saleDate',
      label: 'Date',
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      key: 'tallySynced',
      label: 'Tally',
      render: (_: any, sale: SaleRecord) => (
        <div className="flex items-center gap-2">
          {sale.tallySynced ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-900/40 text-emerald-400 border border-emerald-500/30">
              ✓ Synced
            </span>
          ) : (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (tallySyncingId) return;
                setTallySyncingId(sale._id);
                try {
                  const res = await fetch('/api/admin/crm/sales/tally-sync', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ saleId: sale._id, generateReceipt: true }),
                  });
                  const json = await res.json();
                  if (res.ok) {
                    fetchSalesData();
                  } else {
                    setError(json.error || 'Tally sync failed');
                  }
                } catch {
                  setError('Tally sync failed');
                } finally {
                  setTallySyncingId(null);
                }
              }}
              disabled={tallySyncingId === sale._id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-900/40 text-amber-400 border border-amber-500/30 hover:bg-amber-800/60 transition cursor-pointer disabled:opacity-50"
              title="Click to sync to Tally & generate receipt"
            >
              {tallySyncingId === sale._id ? '⏳' : '⚡'} Sync Tally
            </button>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, sale: SaleRecord) => (
        <div className="flex gap-2 items-center relative">
          {/* Receipt + messaging actions */}

          {/* Receipts Button */}
          <button
            onClick={() => {
              const leadId = getLeadIdString(sale.leadId);
              if (leadId) {
                setReceiptSaleId(sale._id);
              } else {
                router.push(`/admin/crm/sales/${sale._id}`);
              }
            }}
            className="px-3 py-1.5 bg-black border border-yellow-500 text-yellow-400 rounded-lg text-sm font-medium transition-colors hover:bg-yellow-400 hover:text-black"
            title="View Receipt"
          >
            {sale.receiptNumber ? `📄 ${sale.receiptNumber}` : 'Receipts'}
          </button>

          {/* Certificate Button */}
          <button
            onClick={() => router.push(`/admin/crm/sales/${sale._id}/certificate`)}
            className="px-3 py-1.5 bg-black border border-purple-500 text-purple-400 rounded-lg text-sm font-medium transition-colors hover:bg-purple-500 hover:text-white"
            title="View Certificate"
          >
            🎓 Certificate
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

              router.push(`/admin/crm/meta?phone=${phone}`);
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

  return (
    <div className="sales-dark min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 relative overflow-hidden">
      {/* Ambient glowing background accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <style jsx global>{`
        /* High-contrast modern dark table for Sales */
        .sales-dark table { color: #f8fafc !important; border-collapse: separate; border-spacing: 0; width: 100%; }
        .sales-dark thead { background: rgba(15, 23, 42, 0.95) !important; }
        .sales-dark thead th { color: #94a3b8 !important; border-bottom: 1px solid rgba(51, 65, 85, 0.6) !important; padding: 12px 16px !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-weight: 700 !important; }
        .sales-dark tbody tr { background-color: rgba(15, 23, 42, 0.45) !important; border-bottom: 1px solid rgba(51, 65, 85, 0.4) !important; transition: all 0.15s ease !important; }
        .sales-dark tbody tr:nth-child(even) { background-color: rgba(2, 6, 23, 0.45) !important; }
        .sales-dark tbody tr:hover { background-color: rgba(30, 41, 59, 0.8) !important; }
        .sales-dark tbody td { color: #f8fafc !important; padding: 12px 16px !important; border-bottom: 1px solid rgba(51, 65, 85, 0.3) !important; }
        .sales-dark .text-slate-900,
        .sales-dark .text-slate-700,
        .sales-dark .text-slate-600,
        .sales-dark .text-slate-500,
        .sales-dark .text-slate-400 { color: #cbd5e1 !important; }
        .sales-dark .border-slate-200 { border-color: rgba(51, 65, 85, 0.5) !important; }
        .sales-dark input, .sales-dark select, .sales-dark textarea {
          background-color: #020617 !important;
          color: #f8fafc !important;
          border-color: #334155 !important;
        }
        .sales-dark input:focus, .sales-dark select:focus, .sales-dark textarea:focus {
          border-color: #10b981 !important;
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2) !important;
        }
        .sales-dark option {
          background-color: #020617 !important;
          color: #ffffff !important;
        }
      `}</style>

      <div className="w-full space-y-6 relative z-10">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/crm')}
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition shadow-sm flex-shrink-0 cursor-pointer"
                title="Go to CRM Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Sales & Revenue Center</h1>
                  <span className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider">
                    Financial Operations
                  </span>
                </div>
                <p className="text-sm text-slate-300/80 mt-1.5 max-w-2xl leading-relaxed">
                  Real-time revenue monitoring, student workshop transactions, installment tracking, and payment reconciliations.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 flex-wrap items-center">
              <button
                onClick={() => router.push('/admin/crm/sales/events')}
                className="bg-slate-900/90 hover:bg-slate-800 text-purple-300 border border-purple-500/30 px-3.5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>Events</span>
              </button>
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  disabled={exporting}
                  className="bg-slate-900/90 hover:bg-slate-800 text-blue-300 border border-blue-500/30 px-3.5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>{exporting ? 'Exporting...' : 'Export'}</span>
                </button>
                {showExportMenu && (
                  <div className="absolute z-30 mt-2 right-0 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1">
                    <button
                      onClick={downloadPdf}
                      disabled={exporting}
                      className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-rose-400" />
                      <span>Export as PDF</span>
                    </button>
                    <button
                      onClick={downloadExcel}
                      disabled={exporting}
                      className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Export as Excel</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-slate-900/90 hover:bg-slate-800 text-violet-300 border border-violet-500/30 px-3.5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Upload className="w-4 h-4 text-violet-400" />
                <span>Upload CSV</span>
              </button>
              <button
                onClick={async () => {
                  if (!token || !isSuperAdmin) return;
                  const ok = window.confirm('Generate sales for Apr 2025-Mar 2026 from leads?');
                  if (!ok) return;
                  setGeneratingFromLeads(true);
                  setError(null);
                  try {
                    const res = await crmFetch('/api/admin/crm/sales/generate-from-leads', {
                      method: 'POST',
                      body: {
                        startMonth: '2025-04',
                        endMonth: '2026-03',
                        workshops: [
                          { workshopName: 'Swar Yoga L-1', totalIncome: 693000, feePerPerson: 3500 },
                          { workshopName: 'Swar Yoga L-2', totalIncome: 181500, feePerPerson: 3000 },
                          { workshopName: 'Swar Yoga L-3', totalIncome: 108900, feePerPerson: 3000 },
                          { workshopName: 'Swar Yoga Master Class', totalIncome: 204000, feePerPerson: 6800 },
                          { workshopName: 'Weight Loss', totalIncome: 80500, feePerPerson: 3500 },
                          { workshopName: 'Amrut aahat', totalIncome: 44000, feePerPerson: 2200 },
                          { workshopName: 'Meditation Class', totalIncome: 45000, feePerPerson: 2250 },
                        ],
                      },
                    });
                    if (res?.success) {
                      alert(`✅ Generated ${res.createdCount} sales entries`);
                      await fetchSalesData();
                    } else {
                      setError(res?.error || 'Generation failed');
                    }
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Failed to generate');
                  } finally {
                    setGeneratingFromLeads(false);
                  }
                }}
                disabled={generatingFromLeads}
                className="bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 px-3.5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{generatingFromLeads ? 'Generating...' : 'Gen Sales'}</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                <span>Record Sale</span>
              </button>
            </div>
          </div>

          {/* Quick Sub-module switcher */}
          <div className="mt-6 pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Sales Modules:</span>
            <button
              onClick={() => router.push('/admin/crm/sales')}
              className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-lg font-bold cursor-pointer"
            >
              💰 Sales Transactions
            </button>
            <button
              onClick={() => router.push('/admin/crm/order-maintenance')}
              className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-slate-700 px-3 py-1 rounded-lg transition cursor-pointer"
            >
              📦 Orders Maintenance
            </button>
            <button
              onClick={() => router.push('/admin/crm/workshop-offer')}
              className="bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-slate-700 px-3 py-1 rounded-lg transition cursor-pointer"
            >
              🏷️ Workshop Offers
            </button>
          </div>
        </div>

        {/* Real-time KPI Summary Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Revenue</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">
              ₹{Number(summary?.totalSales || 0).toLocaleString()}
            </p>
            <span className="text-xs text-slate-400 mt-1 block">Accumulated Volume</span>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Total Transactions</span>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">
              {String(summary?.totalTransactions || filteredSales.length || 0)}
            </p>
            <span className="text-xs text-slate-400 mt-1 block">Recorded Receipts</span>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Average Sale</span>
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-purple-200">
              ₹{Number(summary?.averageSale || 0).toLocaleString()}
            </p>
            <span className="text-xs text-slate-400 mt-1 block">Per Enrollee Average</span>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Top Sale Record</span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-200">
              ₹{Number(summary?.maxSale || 0).toLocaleString()}
            </p>
            <span className="text-xs text-slate-400 mt-1 block">Highest Ticket Amount</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-950/80 border border-red-500/50 rounded-2xl p-4 text-red-200 flex justify-between items-center shadow-lg">
            <span className="font-medium text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 font-bold text-xl cursor-pointer">×</button>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-4 text-emerald-200 flex justify-between items-center shadow-lg">
            <span className="font-medium text-sm">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300 font-bold text-xl cursor-pointer">×</button>
          </div>
        )}

        {/* View Selector Tabs */}
        <div className="flex gap-2 flex-wrap bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-2 w-fit">
          {(['list', 'summary', 'yearly', 'monthly', 'weekly', 'daily'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                view === v
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {v === 'list' && '📋 Transactions List'}
              {v === 'summary' && '📊 Summary Overview'}
              {v === 'yearly' && '🧾 Yearly Trends'}
              {v === 'monthly' && '📅 Monthly Breakdown'}
              {v === 'weekly' && '🗓️ Weekly Cycles'}
              {v === 'daily' && '⏱️ Daily Timeline'}
            </button>
          ))}
        </div>

        {/* Bulk actions (header) */}
        {view === 'list' && selectedSaleIds.size > 0 && (
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between shadow-xl">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="font-bold text-white text-sm">Selected: <span className="text-emerald-400">{selectedSaleIds.size}</span></div>

              <button
                onClick={clearSaleSelection}
                className="px-3.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
              >
                Clear
              </button>

              <button
                onClick={() => toggleSelectAllOnPage()}
                className="px-3.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
                title="Select/deselect all on this page"
              >
                Select Page
              </button>

              <button
                onClick={() => setBulkActionsOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Bulk Actions
              </button>

              <button
                onClick={openAddToEvent}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                title="Add selected sales to an Event"
              >
                📅 Add to Event
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Tip: Select multiple transactions to batch assign or export.
            </div>
          </div>
        )}

        {/* Filters - Glassmorphic Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Search & Filter Records</h2>
            </div>
            <button
              onClick={clearFilters}
              className="text-xs text-slate-400 hover:text-amber-300 transition flex items-center gap-1 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Program / Workshop Multi-select */}
            <div className="relative" ref={workshopFilterRef}>
              <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Program / Workshop</label>
              <button
                type="button"
                onClick={() => setWorkshopFilterOpen((o) => !o)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-medium text-sm text-left flex items-center justify-between gap-2 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <span className="truncate">
                  {draftFilters.workshop.length === 0
                    ? 'All Workshops'
                    : draftFilters.workshop.length === 1
                    ? draftFilters.workshop[0]
                    : `${draftFilters.workshop.length} selected`}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>
              {workshopFilterOpen && (
                <div className="absolute z-30 mt-2 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
                    <button
                      type="button"
                      onClick={() => setDraftFilters((p) => ({ ...p, workshop: [...workshopOptions] }))}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftFilters((p) => ({ ...p, workshop: [] }))}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  {workshopOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">No workshops found</div>
                  ) : (
                    workshopOptions.map((w) => {
                      const checked = draftFilters.workshop.includes(w);
                      return (
                        <label
                          key={w}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setDraftFilters((p) => ({
                                ...p,
                                workshop: e.target.checked
                                  ? [...p.workshop, w]
                                  : p.workshop.filter((x) => x !== w),
                              }));
                            }}
                            className="h-4 w-4 accent-emerald-500 rounded"
                          />
                          <span className="truncate">{w}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Date Range From */}
            <div>
              <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Date Range From</label>
              {(() => {
                const isAll = !draftFilters.batchFrom;
                const { year: fromYear, month: fromMonth } = parseYearMonth(draftFilters.batchFrom);
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <select
                        value={isAll ? 'all' : fromMonth}
                        onChange={(e) => setDraftFilters((p) => ({
                          ...p,
                          batchFrom: e.target.value === 'all' ? '' : monthStartDateInputValue(fromYear, Number(e.target.value)),
                        }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-sm focus:outline-none focus:border-emerald-500 transition"
                      >
                        <option value="all">All Months</option>
                        {MONTH_NAMES.map((m, i) => <option key={m} value={String(i)}>{m}</option>)}
                      </select>
                      <select
                        value={fromYear}
                        disabled={isAll}
                        onChange={(e) => setDraftFilters((p) => ({ ...p, batchFrom: monthStartDateInputValue(Number(e.target.value), fromMonth) }))}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-sm focus:outline-none focus:border-emerald-500 transition disabled:opacity-40"
                      >
                        {dateRangeYearOptions().map((y) => <option key={y} value={String(y)}>{y}</option>)}
                      </select>
                    </div>
                    <input
                      type="date"
                      value={draftFilters.batchFrom}
                      onChange={(e) => setDraftFilters((p) => ({ ...p, batchFrom: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition"
                      title="Pick an exact day instead of a whole month"
                    />
                  </div>
                );
              })()}
            </div>

            {/* Date Range To */}
            <div>
              <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Date Range To</label>
              {(() => {
                const isAll = !draftFilters.batchTo;
                const { year: toYear, month: toMonth } = parseYearMonth(draftFilters.batchTo);
                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <select
                        value={isAll ? 'all' : toMonth}
                        onChange={(e) => setDraftFilters((p) => ({
                          ...p,
                          batchTo: e.target.value === 'all' ? '' : monthEndDateInputValue(toYear, Number(e.target.value)),
                        }))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-sm focus:outline-none focus:border-emerald-500 transition"
                      >
                        <option value="all">All Months</option>
                        {MONTH_NAMES.map((m, i) => <option key={m} value={String(i)}>{m}</option>)}
                      </select>
                      <select
                        value={toYear}
                        disabled={isAll}
                        onChange={(e) => setDraftFilters((p) => ({ ...p, batchTo: monthEndDateInputValue(Number(e.target.value), toMonth) }))}
                        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-sm focus:outline-none focus:border-emerald-500 transition disabled:opacity-40"
                      >
                        {dateRangeYearOptions().map((y) => <option key={y} value={String(y)}>{y}</option>)}
                      </select>
                    </div>
                    <input
                      type="date"
                      value={draftFilters.batchTo}
                      onChange={(e) => setDraftFilters((p) => ({ ...p, batchTo: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 transition"
                      title="Pick an exact day instead of a whole month"
                    />
                  </div>
                );
              })()}
            </div>

            {/* Reported By & Search */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">Search Records</label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-white font-medium text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    placeholder="ID, name, mobile, amount..."
                  />
                </div>
              </div>
              <div>
                <input
                  type="text"
                  value={draftFilters.reportedByUserId}
                  onChange={(e) => setDraftFilters((p) => ({ ...p, reportedByUserId: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-white font-medium text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  placeholder="Filter by Admin User ID..."
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={applyFilters}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm transition shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              ✓ Apply Filters
            </button>
            <button
              onClick={clearFilters}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-6 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer"
            >
              ✕ Clear
            </button>
          </div>
        </div>

        {/* Loading State */}
        {crm.loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Summary View */}
            {view === 'summary' && summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Total Transactions</h3>
                    <Receipt className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-4xl font-black text-white mt-4">{String(summary.totalTransactions || 0)}</p>
                </div>
                
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Total Revenue</h3>
                    <DollarSign className="w-5 h-5 text-yellow-400" />
                  </div>
                  <p className="text-4xl font-black text-yellow-400 mt-4">₹{Number(summary.totalSales || 0).toLocaleString()}</p>
                </div>
                
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-purple-400 text-xs font-bold uppercase tracking-wider">Average Sale</h3>
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-4xl font-black text-purple-300 mt-4">₹{Number(summary.averageSale || 0).toLocaleString()}</p>
                </div>
                
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
                  <div className="text-blue-400 font-bold mb-3 text-xs uppercase tracking-wider">
                    Range Summary
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Sale:</span>
                      <span className="font-bold text-yellow-400">₹{Number(summary.maxSale || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Min Sale:</span>
                      <span className="font-bold text-emerald-400">₹{Number(summary.minSale || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Count:</span>
                      <span className="font-bold text-white">{Number(summary.targetAchieved || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Daily / Weekly / Monthly / Yearly: real transactions grouped per period */}
            {(view === 'daily' || view === 'weekly' || view === 'monthly' || view === 'yearly') && (
              <div className="space-y-6">
                {(view === 'daily' ? daily : view === 'weekly' ? weekly : view === 'monthly' ? monthly : yearly).map((row) => {
                  const periodSales = filteredSales.filter((s) => periodKeyForSale(s, view) === String(row._id));
                  return (
                    <div key={String(row._id)} className="space-y-3">
                      <div className="flex items-center justify-between bg-gradient-to-r from-purple-950/80 via-slate-900 to-slate-900 rounded-xl px-5 py-3.5 border border-purple-500/30 shadow-md">
                        <span className="text-purple-200 font-bold text-base">{String(row._id)}</span>
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-slate-300">{Number(row.count ?? 0)} transactions</span>
                          <span className="text-yellow-400 font-bold text-base">₹{Number(row.totalSales || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      {periodSales.length === 0 ? (
                        <div className="text-center text-slate-500 py-6 text-sm bg-slate-900/30 rounded-xl border border-slate-800">
                          No transactions in this period
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-slate-800 overflow-hidden shadow-xl bg-slate-900/60">
                          <DataTable
                            columns={columns}
                            data={periodSales}
                            loading={crm.loading}
                            empty={false}
                            striped
                            hover
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                {((view === 'daily' && daily.length === 0) ||
                  (view === 'weekly' && weekly.length === 0) ||
                  (view === 'monthly' && monthly.length === 0) ||
                  (view === 'yearly' && yearly.length === 0)) && (
                  <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-12 text-center my-6 shadow-2xl">
                    <Receipt className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-white">No data available for this period</h3>
                    <p className="text-sm text-slate-400 mt-1">Try widening your date filters.</p>
                  </div>
                )}
              </div>
            )}

            {/* Sales List */}
            {view === 'list' && (
              filteredSales.length === 0 ? (
                <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-12 text-center my-6 shadow-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-4 shadow-inner">
                    <Receipt className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-black text-white">No Sales Transactions Recorded</h3>
                  <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                    There are no sales entries matching your selected workshop or date filter. Try widening your dates or record a new sale.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg shadow-emerald-500/25 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Record Sale</span>
                    </button>
                    <button
                      onClick={clearFilters}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
                    >
                      Clear Filter Range
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 overflow-hidden shadow-2xl bg-slate-900/60">
                  <DataTable
                    columns={columns}
                    data={filteredSales}
                    loading={crm.loading}
                    empty={false}
                    striped
                    hover
                  />
                </div>
              )
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
                onBlur={(e) => {
                  if (e.target.value.trim()) lookupCustomer();
                }}
                className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Enter customer id / phone / email"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => lookupCustomer()}
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
                    // Auto-fill from CRM if no Customer ID has been entered yet
                    if (!formData.customerId.trim() && (normalized || e.target.value.trim())) {
                      lookupCustomer(normalized || e.target.value.trim());
                    }
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
                <option value="cashfree">Cashfree</option>
                <option value="upi">Paytm/PhonePe/Google Pay (UPI)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-white text-sm mb-2 font-semibold">Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g. Axis Bank, Union Bank"
                list="bank-name-options"
              />
              <datalist id="bank-name-options">
                <option value="Axis Bank" />
                <option value="Union Bank" />
              </datalist>
            </div>
            <div>
              <label className="block text-white text-sm mb-2 font-semibold">Payment Reference / Transaction ID</label>
              <input
                type="text"
                value={formData.transactionId}
                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Cashfree order ID, UPI ref no, bank UTR, etc."
              />
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
          <div className="bg-gray-950 border-2 border-white/30 rounded-xl p-6 max-w-2xl w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
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

            {/* CSV/Excel Upload */}
            <div className="space-y-3">
              <h3 className="text-white font-semibold">CSV or Excel File</h3>
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
            </div>

            {/* PDF Upload */}
            <div className="space-y-3 border-t border-white/20 pt-4">
              <h3 className="text-white font-semibold">Or Upload Bank Statement PDF</h3>
              <label className="block">
                <div className="border-2 border-dashed border-blue-500/50 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.currentTarget.files?.[0];
                      if (!file) return;

                      setCsvImporting(true);
                      try {
                        const formData = new FormData();
                        formData.append('file', file);

                        const res = await fetch('/api/admin/crm/sales/extract-pdf', {
                          method: 'POST',
                          headers: { 'Authorization': `Bearer ${token}` },
                          body: formData,
                        });

                        const data = await res.json();
                        if (res.ok && data.extracted?.length > 0) {
                          // Auto-map extracted sales to contacts format
                          const mappedContacts = data.extracted.map((sale: any) => ({
                            name: sale.customerName,
                            raw: {
                              name: sale.customerName,
                              amount: sale.saleAmount,
                              date: sale.saleDate,
                            },
                          }));

                          setCsvContacts(mappedContacts);
                          setCsvColumnMap({
                            name: 'name',
                            amount: 'amount',
                            date: 'date',
                          } as any);
                          setCsvFileName(`${file.name} (${data.count} entries)`);
                          alert(`✅ Extracted ${data.count} sales entries from PDF`);
                        } else {
                          alert(`❌ ${data.error || 'Failed to extract PDF'}`);
                        }
                      } catch (err) {
                        alert('❌ Error processing PDF');
                        console.error(err);
                      } finally {
                        setCsvImporting(false);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <div className="text-blue-400">
                    <div className="text-2xl mb-2">📄</div>
                    <p className="font-semibold">Drop PDF here or click to select</p>
                    <p className="text-sm text-white/50 mt-1">Bank statements auto-extract: Amount, Date, Name</p>
                  </div>
                </div>
              </label>
            </div>

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
                  Amount Received ✓ <span className="text-xs text-gray-400">(sends confirmation email to customer)</span>
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
                  <option value="cashfree">Cashfree</option>
                  <option value="upi">Paytm/PhonePe/Google Pay (UPI)</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Bank Name</label>
                <input
                  type="text"
                  value={editData.bankName}
                  onChange={(e) => setEditData({ ...editData, bankName: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Axis Bank, Union Bank"
                  list="bank-name-options"
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">Payment Reference / Transaction ID</label>
                <input
                  type="text"
                  value={editData.transactionId}
                  onChange={(e) => setEditData({ ...editData, transactionId: e.target.value })}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Cashfree order ID, UPI ref no, bank UTR, etc."
                />
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

      {/* ── Add to Event Modal ── */}
      {addToEventOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-gray-950 border-2 border-white/30 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-purple-400">📅 Add to Event</h2>
              <button
                onClick={() => setAddToEventOpen(false)}
                className="text-white/40 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="text-white/60 text-sm">
              Add {selectedSaleIds.size} selected sale(s) as participants to an existing event.
            </p>

            {loadingEventOptions ? (
              <div className="text-white/60 text-sm">Loading events...</div>
            ) : eventOptions.length === 0 ? (
              <div className="text-white/60 text-sm">No events found. Create one on the Events page first.</div>
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-black border border-white/30 rounded-lg px-4 py-2.5 text-white font-medium focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              >
                <option value="">Select an event...</option>
                {eventOptions.map((evt) => (
                  <option key={evt._id} value={evt._id}>
                    {evt.month} — {evt.workshopName} ({evt.participantCount} participants)
                  </option>
                ))}
              </select>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setAddToEventOpen(false)}
                className="px-4 py-2 border border-white/30 rounded-lg text-white font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => addSelectedToEvent({ clearAfter: clearSaleSelection })}
                disabled={!selectedEventId || addingToEvent}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {addingToEvent ? 'Adding...' : 'Add to Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Preview Modal ── */}
      {receiptSaleId && token && (() => {
        const sale = sales.find(s => s._id === receiptSaleId);
        const leadId = sale ? getLeadIdString(sale.leadId) : '';
        if (!leadId) return null;
        return (
          <ReceiptPreviewModal
            leadId={leadId}
            leadName={sale?.customerName || ''}
            leadPhone={sale?.customerPhone || ''}
            leadEmail={sale?.customerEmail || ''}
            saleId={receiptSaleId}
            token={token}
            onClose={() => setReceiptSaleId(null)}
          />
        );
      })()}
    </div>
  );
}
