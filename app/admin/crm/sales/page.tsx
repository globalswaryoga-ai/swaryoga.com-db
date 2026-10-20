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
import CertificateModal from '@/components/admin/crm/CertificateModal';
import { BulkActionsModal } from '@/components/admin/crm/BulkActionsModal';
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
  ChevronUp,
  Eye,
  EyeOff,
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
  // Open / Hide Sections State
  const [sectionsOpen, setSectionsOpen] = useState({
    kpi: true,
    filters: true,
    ledger: true,
  });
  const toggleSection = (key: 'kpi' | 'filters' | 'ledger') => {
    setSectionsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const areAllSectionsOpen = sectionsOpen.kpi && sectionsOpen.filters && sectionsOpen.ledger;
  const toggleAllSections = () => {
    const next = !areAllSectionsOpen;
    setSectionsOpen({ kpi: next, filters: next, ledger: next });
  };
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
  const [certificateSale, setCertificateSale] = useState<SaleRecord | null>(null);
  const [tallySyncingId, setTallySyncingId] = useState<string | null>(null);

  const handleDownloadReceiptDirect = (saleId: string, receiptNum?: string) => {
    const url = `/api/admin/crm/receipts/pdf?saleId=${saleId}&download=1`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt-${receiptNum || saleId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBulkDownloadReceipts = () => {
    const selectedList = sales.filter((s) => selectedSaleIds.has(s._id));
    if (selectedList.length === 0) return;
    selectedList.forEach((s, idx) => {
      setTimeout(() => {
        handleDownloadReceiptDirect(s._id, s.receiptNumber);
      }, idx * 350);
    });
    setBulkActionsOpen(false);
  };

  const handleBulkPreviewCertificate = () => {
    const firstSelected = sales.find((s) => selectedSaleIds.has(s._id));
    if (firstSelected) {
      setCertificateSale(firstSelected);
    }
    setBulkActionsOpen(false);
  };

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
          <div className="border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 text-center">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-0.5">LEAD ID</div>
            <div className="font-mono font-bold text-slate-900 text-xs">{displayId}</div>
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
          <div className="space-y-0.5">
            <div className="font-semibold text-slate-900 break-words text-xs">{displayName}</div>
            <div className="text-xs text-slate-500 break-words">{displayPhone}</div>
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
            <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
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
        if (!labels.length) return <span className="text-slate-400">-</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {labels.slice(0, 4).map((l) => (
              <span
                key={l}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
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
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
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
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition cursor-pointer disabled:opacity-50"
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

          {/* Receipts Button Group */}
          <div className="inline-flex rounded-lg shadow-2xs">
            <button
              onClick={() => setReceiptSaleId(sale._id)}
              className="px-2.5 py-1.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-l-lg text-xs font-semibold transition-colors hover:bg-amber-100 flex items-center gap-1 cursor-pointer"
              title="View & Share Receipt"
            >
              {sale.receiptNumber ? `📄 ${sale.receiptNumber}` : '📄 Receipt'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadReceiptDirect(sale._id, sale.receiptNumber);
              }}
              className="px-1.5 py-1.5 bg-amber-50 border-y border-r border-amber-300 text-amber-900 rounded-r-lg text-xs font-bold transition-colors hover:bg-amber-100 cursor-pointer"
              title="Download Receipt PDF Directly"
            >
              ⬇️
            </button>
          </div>

          {/* Certificate Button Group */}
          <div className="inline-flex rounded-lg shadow-2xs">
            <button
              onClick={() => setCertificateSale(sale)}
              className="px-2.5 py-1.5 bg-purple-50 border border-purple-300 text-purple-900 rounded-l-lg text-xs font-semibold transition-colors hover:bg-purple-100 flex items-center gap-1 cursor-pointer"
              title="Preview & Download Certificate"
            >
              🎓 Certificate
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/admin/crm/sales/${sale._id}/certificate`);
              }}
              className="px-1.5 py-1.5 bg-purple-50 border-y border-r border-purple-300 text-purple-900 rounded-r-lg text-xs font-bold transition-colors hover:bg-purple-100 cursor-pointer"
              title="Open Certificate Full Page Editor"
            >
              ✏️
            </button>
          </div>

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
            className="px-2.5 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-semibold transition-colors hover:bg-emerald-100 cursor-pointer"
            title="Meta WhatsApp"
          >
            WhatsApp
          </button>

          {/* Edit Button */}
          <button
            onClick={() => openEdit(sale)}
            className="px-2.5 py-1.5 bg-blue-50 border border-blue-300 text-blue-800 rounded-lg text-xs font-semibold transition-colors hover:bg-blue-100 cursor-pointer"
            title="Edit sale"
          >
            Edit
          </button>

          {/* View Button */}
          <button
            onClick={() => router.push(`/admin/crm/sales/${sale._id}`)}
            className="px-2.5 py-1.5 bg-teal-50 border border-teal-300 text-teal-800 rounded-lg text-xs font-semibold transition-colors hover:bg-teal-100 cursor-pointer"
            title="View sale details"
          >
            View
          </button>

          {/* Delete Button */}
          <button
            onClick={() => handleDeleteSale(sale._id)}
            className="px-2.5 py-1.5 bg-rose-50 border border-rose-300 text-rose-800 rounded-lg text-xs font-semibold transition-colors hover:bg-rose-100 cursor-pointer"
            title="Delete sale"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Vibrant Gradient Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => router.push('/admin/crm')}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition shadow-2xs flex-shrink-0 cursor-pointer active:scale-95"
                title="Go to CRM Dashboard"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">
                    Sales &amp; Revenue Center
                  </h1>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
                    Financial Operations
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
                  Real-time revenue monitoring, student workshop transactions, installment tracking, and payment reconciliations.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 flex-wrap items-center">
              <button
                onClick={toggleAllSections}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                title={areAllSectionsOpen ? 'Hide all sections' : 'Open all sections'}
              >
                {areAllSectionsOpen ? (
                  <>
                    <EyeOff className="w-4 h-4 text-slate-500" />
                    <span>Hide All</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>Open All</span>
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/admin/crm/sales/events')}
                className="bg-white hover:bg-slate-50 text-purple-700 border border-purple-200 px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Events</span>
              </button>
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  disabled={exporting}
                  className="bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>{exporting ? 'Exporting...' : 'Export'}</span>
                </button>
                {showExportMenu && (
                  <div className="absolute z-30 mt-2 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1">
                    <button
                      onClick={downloadPdf}
                      disabled={exporting}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-rose-600" />
                      <span>Export as PDF</span>
                    </button>
                    <button
                      onClick={downloadExcel}
                      disabled={exporting}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Export as Excel</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-white hover:bg-slate-50 text-violet-700 border border-violet-200 px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Upload className="w-4 h-4 text-violet-600" />
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
                className="bg-white hover:bg-slate-50 text-amber-700 border border-amber-200 px-3.5 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>{generatingFromLeads ? 'Generating...' : 'Gen Sales'}</span>
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Record Sale</span>
              </button>
            </div>
          </div>

          {/* Quick Sub-module switcher */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold mr-1">Sales Modules:</span>
            <button
              onClick={() => router.push('/admin/crm/sales')}
              className="bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-1 rounded-lg font-bold cursor-pointer"
            >
              💰 Sales Transactions
            </button>
            <button
              onClick={() => router.push('/admin/crm/order-maintenance')}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-lg transition cursor-pointer"
            >
              📦 Orders Maintenance
            </button>
            <button
              onClick={() => router.push('/admin/crm/workshop-offer')}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-lg transition cursor-pointer"
            >
              🏷️ Workshop Offers
            </button>
          </div>
        </div>

        {/* SECTION 1: Real-time Revenue & KPI Summary Metrics */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden transition-all">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Revenue &amp; Performance Metrics
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Analytics
                  </span>
                </div>
                <p className="text-xs text-slate-500">Real-time aggregate financial KPIs across filtered records</p>
              </div>
            </div>

            <button
              onClick={() => toggleSection('kpi')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              {sectionsOpen.kpi ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hide Metrics</span>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Open Metrics</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </>
              )}
            </button>
          </div>

          {sectionsOpen.kpi ? (
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-4 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Total Revenue</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">
                    ₹{Number(summary?.totalSales || 0).toLocaleString()}
                  </p>
                  <span className="text-xs text-slate-400 mt-1 block">Accumulated Volume</span>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-4 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Total Transactions</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">
                    {String(summary?.totalTransactions || filteredSales.length || 0)}
                  </p>
                  <span className="text-xs text-slate-400 mt-1 block">Recorded Receipts</span>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-4 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Average Sale</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">
                    ₹{Number(summary?.averageSale || 0).toLocaleString()}
                  </p>
                  <span className="text-xs text-slate-400 mt-1 block">Per Enrollee Average</span>
                </div>

                <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-4 shadow-2xs relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Top Sale Record</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">
                    ₹{Number(summary?.maxSale || 0).toLocaleString()}
                  </p>
                  <span className="text-xs text-slate-400 mt-1 block">Highest Ticket Amount</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-5 py-3.5 bg-slate-50/60 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <span>Revenue: <strong className="text-slate-900 font-bold">₹{Number(summary?.totalSales || 0).toLocaleString()}</strong></span>
                <span className="text-slate-300">|</span>
                <span>Transactions: <strong className="text-slate-900 font-bold">{String(summary?.totalTransactions || filteredSales.length || 0)}</strong></span>
                <span className="text-slate-300">|</span>
                <span>Avg: <strong className="text-slate-900 font-bold">₹{Number(summary?.averageSale || 0).toLocaleString()}</strong></span>
                <span className="text-slate-300">|</span>
                <span>Max: <strong className="text-slate-900 font-bold">₹{Number(summary?.maxSale || 0).toLocaleString()}</strong></span>
              </div>
              <button
                onClick={() => toggleSection('kpi')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                Open Metrics &rarr;
              </button>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex justify-between items-center shadow-2xs">
            <span className="font-medium text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold text-xl cursor-pointer">×</button>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800 flex justify-between items-center shadow-2xs">
            <span className="font-medium text-sm">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold text-xl cursor-pointer">×</button>
          </div>
        )}


        {/* SECTION 2: Search & Filter Records Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden transition-all">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Search &amp; Filter Records
                  </h2>
                  {(draftFilters.workshop.length > 0 || draftFilters.batchFrom || draftFilters.batchTo || searchQuery || draftFilters.reportedByUserId) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Filters Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">Filter transactions by workshop program, date intervals, or search queries</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-amber-600 transition flex items-center gap-1 cursor-pointer font-medium px-2.5 py-1.5 rounded-xl hover:bg-slate-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
              <button
                onClick={() => toggleSection('filters')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                {sectionsOpen.filters ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hide Filters</span>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Open Filters</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </>
                )}
              </button>
            </div>
          </div>

          {sectionsOpen.filters ? (
            <div className="p-5 sm:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Program / Workshop Multi-select */}
                <div className="relative" ref={workshopFilterRef}>
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">Program / Workshop</label>
                  <button
                    type="button"
                    onClick={() => setWorkshopFilterOpen((o) => !o)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-medium text-sm text-left flex items-center justify-between gap-2 focus:bg-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
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
                    <div className="absolute z-30 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                        <button
                          type="button"
                          onClick={() => setDraftFilters((p) => ({ ...p, workshop: [...workshopOptions] }))}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraftFilters((p) => ({ ...p, workshop: [] }))}
                          className="text-xs font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                      {workshopOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-400">No workshops found</div>
                      ) : (
                        workshopOptions.map((w) => {
                          const checked = draftFilters.workshop.includes(w);
                          return (
                            <label
                              key={w}
                              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer transition"
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
                                className="h-4 w-4 accent-emerald-600 rounded"
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
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">Date Range From</label>
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                          >
                            <option value="all">All Months</option>
                            {MONTH_NAMES.map((m, i) => <option key={m} value={String(i)}>{m}</option>)}
                          </select>
                          <select
                            value={fromYear}
                            disabled={isAll}
                            onChange={(e) => setDraftFilters((p) => ({ ...p, batchFrom: monthStartDateInputValue(Number(e.target.value), fromMonth) }))}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition disabled:opacity-40"
                          >
                            {dateRangeYearOptions().map((y) => <option key={y} value={String(y)}>{y}</option>)}
                          </select>
                        </div>
                        <input
                          type="date"
                          value={draftFilters.batchFrom}
                          onChange={(e) => setDraftFilters((p) => ({ ...p, batchFrom: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                          title="Pick an exact day instead of a whole month"
                        />
                      </div>
                    );
                  })()}
                </div>

                {/* Date Range To */}
                <div>
                  <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">Date Range To</label>
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                          >
                            <option value="all">All Months</option>
                            {MONTH_NAMES.map((m, i) => <option key={m} value={String(i)}>{m}</option>)}
                          </select>
                          <select
                            value={toYear}
                            disabled={isAll}
                            onChange={(e) => setDraftFilters((p) => ({ ...p, batchTo: monthEndDateInputValue(Number(e.target.value), toMonth) }))}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition disabled:opacity-40"
                          >
                            {dateRangeYearOptions().map((y) => <option key={y} value={String(y)}>{y}</option>)}
                          </select>
                        </div>
                        <input
                          type="date"
                          value={draftFilters.batchTo}
                          onChange={(e) => setDraftFilters((p) => ({ ...p, batchTo: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                          title="Pick an exact day instead of a whole month"
                        />
                      </div>
                    );
                  })()}
                </div>

                {/* Reported By & Search */}
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">Search Records</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-slate-900 font-medium text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                        placeholder="ID, name, mobile, amount..."
                      />
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={draftFilters.reportedByUserId}
                      onChange={(e) => setDraftFilters((p) => ({ ...p, reportedByUserId: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-1.5 text-slate-900 font-medium text-xs placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                      placeholder="Filter by Admin User ID..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={applyFilters}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  ✓ Apply Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-6 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer"
                >
                  ✕ Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="px-5 py-3.5 bg-slate-50/60 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
              <span className="truncate">
                {draftFilters.workshop.length > 0 ? `Workshops (${draftFilters.workshop.length})` : 'All Workshops'} &bull;{' '}
                {draftFilters.batchFrom || draftFilters.batchTo ? `Dates: ${draftFilters.batchFrom || 'Any'} to ${draftFilters.batchTo || 'Any'}` : 'All Dates'}
                {searchQuery ? ` &bull; Query: "${searchQuery}"` : ''}
                {draftFilters.reportedByUserId ? ` &bull; Reported By: "${draftFilters.reportedByUserId}"` : ''}
              </span>
              <button
                onClick={() => toggleSection('filters')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                Open Filters &rarr;
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: Transactions & Financial Ledger Card */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden transition-all">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Transactions &amp; Financial Ledger
                  </h2>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                    {filteredSales.length} {filteredSales.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Student transactions, digital receipts, certification credentials, and grouped periods
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* View Selector Tabs */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {(['list', 'summary', 'yearly', 'monthly', 'weekly', 'daily'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      setView(v);
                      if (!sectionsOpen.ledger) setSectionsOpen((p) => ({ ...p, ledger: true }));
                    }}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                      view === v
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {v === 'list' && '📋 List'}
                    {v === 'summary' && '📊 Summary'}
                    {v === 'yearly' && '🧾 Yearly'}
                    {v === 'monthly' && '📅 Monthly'}
                    {v === 'weekly' && '🗓️ Weekly'}
                    {v === 'daily' && '⏱️ Daily'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => toggleSection('ledger')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                {sectionsOpen.ledger ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Hide Ledger</span>
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-purple-600" />
                    <span>Open Ledger</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </>
                )}
              </button>
            </div>
          </div>

          {sectionsOpen.ledger ? (
            <div className="p-4 sm:p-6 space-y-5">
              {/* Bulk actions (header) */}
              {view === 'list' && selectedSaleIds.size > 0 && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between shadow-2xs">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="font-bold text-slate-900 text-sm">
                      Selected: <span className="text-emerald-700 font-extrabold">{selectedSaleIds.size}</span>
                    </div>

                    <button
                      onClick={clearSaleSelection}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                    >
                      Clear
                    </button>

                    <button
                      onClick={() => toggleSelectAllOnPage()}
                      className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                      title="Select/deselect all on this page"
                    >
                      Select Page
                    </button>

                    <button
                      onClick={() => setBulkActionsOpen(true)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      Bulk Actions
                    </button>

                    <button
                      onClick={openAddToEvent}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      title="Add selected sales to an Event"
                    >
                      📅 Add to Event
                    </button>
                  </div>

                  <div className="text-xs text-slate-500">
                    Tip: Select multiple transactions to batch assign or export receipts.
                  </div>
                </div>
              )}

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
                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <h3 className="text-emerald-700 text-xs font-bold uppercase tracking-wider">Total Transactions</h3>
                          <Receipt className="w-5 h-5 text-emerald-600" />
                        </div>
                        <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-4">{String(summary.totalTransactions || 0)}</p>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <h3 className="text-amber-700 text-xs font-bold uppercase tracking-wider">Total Revenue</h3>
                          <DollarSign className="w-5 h-5 text-amber-600" />
                        </div>
                        <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-4">₹{Number(summary.totalSales || 0).toLocaleString()}</p>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <h3 className="text-purple-700 text-xs font-bold uppercase tracking-wider">Average Sale</h3>
                          <TrendingUp className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-4">₹{Number(summary.averageSale || 0).toLocaleString()}</p>
                      </div>

                      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-6 shadow-2xs">
                        <div className="text-blue-700 font-bold mb-3 text-xs uppercase tracking-wider">
                          Range Summary
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Max Sale:</span>
                            <span className="font-bold text-amber-700">₹{Number(summary.maxSale || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Min Sale:</span>
                            <span className="font-bold text-emerald-700">₹{Number(summary.minSale || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Target Count:</span>
                            <span className="font-bold text-slate-900">{Number(summary.targetAchieved || 0)}</span>
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
                            <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 via-slate-50 to-white rounded-xl px-5 py-3.5 border border-purple-200 shadow-2xs">
                              <span className="text-purple-900 font-bold text-base">{String(row._id)}</span>
                              <div className="flex items-center gap-6 text-sm">
                                <span className="text-slate-600">{Number(row.count ?? 0)} transactions</span>
                                <span className="text-purple-700 font-bold text-base">₹{Number(row.totalSales || 0).toLocaleString()}</span>
                              </div>
                            </div>
                            {periodSales.length === 0 ? (
                              <div className="text-center text-slate-500 py-6 text-sm bg-slate-50 rounded-xl border border-slate-200">
                                No transactions in this period
                              </div>
                            ) : (
                              <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs bg-white">
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
                        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center my-6 shadow-xs">
                          <Receipt className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                          <h3 className="text-lg font-bold text-slate-900">No data available for this period</h3>
                          <p className="text-sm text-slate-500 mt-1">Try widening your date filters.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sales List */}
                  {view === 'list' && (
                    filteredSales.length === 0 ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center my-6 shadow-xs">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-4">
                          <Receipt className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">No Sales Transactions Recorded</h3>
                        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                          There are no sales entries matching your selected workshop or date filter. Try widening your dates or record a new sale.
                        </p>
                        <div className="mt-6 flex items-center justify-center gap-3">
                          <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Record Sale</span>
                          </button>
                          <button
                            onClick={clearFilters}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
                          >
                            Clear Filter Range
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs bg-white">
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
          ) : (
            <div className="px-5 py-6 bg-slate-50/50 text-center">
              <p className="text-xs text-slate-500">
                Transactions Ledger is currently hidden ({filteredSales.length} {filteredSales.length === 1 ? 'record' : 'records'} matching filter).
              </p>
              <button
                onClick={() => toggleSection('ledger')}
                className="mt-2 text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
              >
                Open Ledger &amp; Records &rarr;
              </button>
            </div>
          )}
        </div>
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
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Customer ID *</label>
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                placeholder="Enter customer id / phone / email"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => lookupCustomer()}
                  disabled={lookupBusy}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs hover:bg-amber-100 disabled:opacity-60 font-semibold cursor-pointer"
                >
                  {lookupBusy ? 'Loading...' : 'Load Customer'}
                </button>
                {lookupMsg && (
                  <span className={lookupMsg.toLowerCase().includes('loaded') ? 'text-emerald-700 text-xs font-medium' : 'text-slate-500 text-xs'}>
                    {lookupMsg}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Mobile</label>
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Workshop Name</label>
                <select
                  value={formData.workshopName}
                  onChange={(e) => setFormData({ ...formData, workshopName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
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
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Batch Date</label>
                <input
                  type="date"
                  value={toDateInputValue(formData.batchDate)}
                  onChange={(e) => setFormData({ ...formData, batchDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Amount (₹) *</label>
              <input
                type="number"
                required
                value={formData.saleAmount}
                onChange={(e) => setFormData({ ...formData, saleAmount: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Payment Mode</label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
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
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Bank Name</label>
              <input
                type="text"
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                placeholder="e.g. Axis Bank, Union Bank"
                list="bank-name-options"
              />
              <datalist id="bank-name-options">
                <option value="Axis Bank" />
                <option value="Union Bank" />
              </datalist>
            </div>
            <div>
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Payment Reference / Transaction ID</label>
              <input
                type="text"
                value={formData.transactionId}
                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                placeholder="Cashfree order ID, UPI ref no, bank UTR, etc."
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="targetAchieved"
                type="checkbox"
                checked={Boolean(formData.targetAchieved)}
                onChange={(e) => setFormData({ ...formData, targetAchieved: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
              />
              <label htmlFor="targetAchieved" className="text-slate-800 text-xs font-semibold">
                Target achieved
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
                >
                  {SALE_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Label</label>
                <select
                  value={formData.labelsText}
                  onChange={(e) => setFormData({ ...formData, labelsText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
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
              <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Admin User (Reported by)</label>
              <select
                value={formData.reportedByUserId}
                onChange={(e) => setFormData({ ...formData, reportedByUserId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">📄 Bulk Import Sales</h2>
              <button
                onClick={() => {
                  if (csvImporting) return;
                  setShowUploadModal(false);
                  setCsvContacts([]);
                  setCsvColumnMap(null);
                  setCsvFileName('');
                }}
                className="text-slate-400 hover:text-slate-700 text-2xl leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* CSV/Excel Upload */}
            <div className="space-y-3">
              <h3 className="text-slate-800 text-xs font-bold uppercase tracking-wider">CSV or Excel File</h3>
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
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-slate-800 text-xs font-bold uppercase tracking-wider">Or Upload Bank Statement PDF</h3>
              <label className="block">
                <div className="border-2 border-dashed border-blue-200 bg-blue-50/30 hover:bg-blue-50/70 rounded-xl p-6 text-center cursor-pointer transition">
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
                  <div className="text-blue-600">
                    <div className="text-2xl mb-2">📄</div>
                    <p className="font-semibold text-sm text-slate-800">Drop PDF here or click to select</p>
                    <p className="text-xs text-slate-500 mt-1">Bank statements auto-extract: Amount, Date, Name</p>
                  </div>
                </div>
              </label>
            </div>

            {csvContacts.length > 0 && (
              <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-200">
                <p className="text-emerald-800 text-xs font-bold">
                  Ready to import {csvContacts.length} sale records
                </p>
                <p className="text-emerald-700 text-xs mt-0.5">
                  Records without a valid amount will be skipped. Missing fields can be updated later.
                </p>
              </div>
            )}

            {/* Reported By override for super admin */}
            {isSuperAdmin && (
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Reported By (optional)</label>
                <input
                  type="text"
                  value={uploadReportedByUserId}
                  onChange={(e) => setUploadReportedByUserId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
                  placeholder="Leave blank for logged-in admin"
                />
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
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
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer disabled:opacity-40"
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
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Customer ID</label>
                <input
                  type="text"
                  value={editData.customerId}
                  onChange={(e) => setEditData({ ...editData, customerId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Admin User (Reported by)</label>
                <select
                  value={editData.reportedByUserId}
                  onChange={(e) => setEditData({ ...editData, reportedByUserId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
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
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Name</label>
                <input
                  type="text"
                  value={editData.customerName}
                  onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Mobile</label>
                <input
                  type="text"
                  value={editData.customerPhone}
                  onChange={(e) => setEditData({ ...editData, customerPhone: e.target.value })}
                  onBlur={(e) => {
                    const normalized = normalizePhoneForMeta(e.target.value);
                    if (normalized) setEditData({ ...editData, customerPhone: normalized });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Workshop Name</label>
                <select
                  value={editData.workshopName}
                  onChange={(e) => setEditData({ ...editData, workshopName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
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
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Batch Date</label>
                <input
                  type="date"
                  value={toDateInputValue(editData.batchDate)}
                  onChange={(e) => setEditData({ ...editData, batchDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="targetAchievedEdit"
                type="checkbox"
                checked={Boolean((editData as any).targetAchieved)}
                onChange={(e) => setEditData({ ...(editData as any), targetAchieved: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
              />
              <label htmlFor="targetAchievedEdit" className="text-slate-800 text-xs font-semibold">
                Target achieved
              </label>
            </div>

            {/* Super Admin Approval Checkbox - Only visible to super admins */}
            {isSuperAdmin && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <input
                  id="superAdminApprovedEdit"
                  type="checkbox"
                  checked={Boolean((editData as any).superAdminApproved)}
                  onChange={(e) => setEditData({ ...(editData as any), superAdminApproved: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                />
                <label htmlFor="superAdminApprovedEdit" className="text-emerald-800 text-xs font-semibold">
                  Amount Received ✓ <span className="text-xs text-slate-500 font-normal">(sends confirmation email to customer)</span>
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={editData.saleAmount}
                  onChange={(e) => setEditData({ ...editData, saleAmount: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Payment Mode</label>
                <select
                  value={editData.paymentMode}
                  onChange={(e) => setEditData({ ...editData, paymentMode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
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
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Bank Name</label>
                <input
                  type="text"
                  value={editData.bankName}
                  onChange={(e) => setEditData({ ...editData, bankName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
                  placeholder="e.g. Axis Bank, Union Bank"
                  list="bank-name-options"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Payment Reference / Transaction ID</label>
                <input
                  type="text"
                  value={editData.transactionId}
                  onChange={(e) => setEditData({ ...editData, transactionId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
                  placeholder="Cashfree order ID, UPI ref no, bank UTR, etc."
                />
              </div>
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Sale Date</label>
                <input
                  type="date"
                  value={toDateInputValue(editData.saleDate)}
                  onChange={(e) => setEditData({ ...editData, saleDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
                >
                  {SALE_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 text-xs font-bold uppercase tracking-wider mb-1.5">Label</label>
                <select
                  value={editData.labelsText}
                  onChange={(e) => setEditData({ ...editData, labelsText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 text-xs"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">📅 Add to Event</h2>
              <button
                onClick={() => setAddToEventOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-slate-600 text-xs">
              Add {selectedSaleIds.size} selected sale(s) as participants to an existing event.
            </p>

            {loadingEventOptions ? (
              <div className="text-slate-500 text-xs">Loading events...</div>
            ) : eventOptions.length === 0 ? (
              <div className="text-slate-500 text-xs">No events found. Create one on the Events page first.</div>
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-purple-500 text-xs"
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
                className="px-4 py-2 border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => addSelectedToEvent({ clearAfter: clearSaleSelection })}
                disabled={!selectedEventId || addingToEvent}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition shadow-xs cursor-pointer disabled:opacity-50"
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
        return (
          <ReceiptPreviewModal
            leadId={sale ? getLeadIdString(sale.leadId) : undefined}
            leadName={sale?.customerName || ''}
            leadPhone={sale?.customerPhone || ''}
            leadEmail={sale?.customerEmail || ''}
            saleId={receiptSaleId}
            token={token}
            onClose={() => setReceiptSaleId(null)}
          />
        );
      })()}

      {/* ── Certificate Preview Modal ── */}
      {certificateSale && (
        <CertificateModal
          sale={certificateSale}
          token={token || undefined}
          onClose={() => setCertificateSale(null)}
        />
      )}

      {/* ── Bulk Actions Modal ── */}
      {bulkActionsOpen && (
        <BulkActionsModal
          isOpen={bulkActionsOpen}
          onClose={() => setBulkActionsOpen(false)}
          title="Bulk Transaction Actions"
          selectedCount={selectedSaleIds.size}
          actions={[
            {
              key: 'bulk_receipts',
              label: 'Download Receipts (PDF)',
              icon: '📄',
              variant: 'primary',
              onClick: handleBulkDownloadReceipts,
            },
            {
              key: 'bulk_certificate',
              label: 'Preview Certificate',
              icon: '🎓',
              variant: 'secondary',
              onClick: handleBulkPreviewCertificate,
            },
            {
              key: 'bulk_event',
              label: 'Add to Event',
              icon: '📅',
              variant: 'secondary',
              onClick: () => {
                setBulkActionsOpen(false);
                openAddToEvent();
              },
            },
          ]}
        />
      )}
    </div>
  );
}
