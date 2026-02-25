'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/AdminSidebar';
import {
  BarChart3,
  RefreshCw,
  Wifi,
  WifiOff,
  IndianRupee,
  Users,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
  Calendar,
  Building2,
  Settings,
  ChevronDown,
  Search,
  Menu,
  ArrowLeft,
  TrendingUp,
  Scale,
  ChevronRight,
  MessageCircle,
  Send,
  X,
  Bot,
  ToggleLeft,
  ToggleRight,
  ClipboardList,
  Plus,
  Trash2,
  Edit3,
  Save,
  Upload,
  Download,
  Database,
  Wallet,
  Eye,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  Image,
} from 'lucide-react';

// ── Types ──
interface TallyConfigStatus {
  url: string;
  companyName: string;
  serialNumber: string;
  email: string;
  configured: boolean;
}

interface TallyCompanyInfo {
  name: string;
  formalName?: string;
  address?: string;
  state?: string;
  email?: string;
  phone?: string;
  financialYearFrom?: string;
  financialYearTo?: string;
}

interface TallyVoucher {
  voucherNumber: string;
  voucherType: string;
  date: string;
  partyName: string;
  amount: number;
  narration?: string;
}

interface TallyLedger {
  name: string;
  parent: string;
  openingBalance: number;
  closingBalance: number;
  phone?: string;
  email?: string;
  gstin?: string;
}

interface TallyStockItem {
  name: string;
  parent: string;
  closingBalance: number;
  closingRate: number;
  closingValue: number;
  unit?: string;
}

interface DashboardSummary {
  company: TallyCompanyInfo | null;
  totalSales: number;
  totalReceipts: number;
  totalPurchases: number;
  totalDebtors: number;
  totalCreditors: number;
  salesCount: number;
  receiptCount: number;
  purchaseCount: number;
  debtorCount: number;
  creditorCount: number;
  recentSales: TallyVoucher[];
  recentReceipts: TallyVoucher[];
}

interface PLGroup {
  name: string;
  amount: number;
  children: { name: string; amount: number }[];
}

interface ProfitAndLoss {
  income: PLGroup[];
  expenses: PLGroup[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
}

interface BSGroup {
  name: string;
  amount: number;
  children: { name: string; amount: number }[];
}

interface BalanceSheetData {
  assets: BSGroup[];
  liabilities: BSGroup[];
  totalAssets: number;
  totalLiabilities: number;
  difference: number;
}

type ActiveTab = 'dashboard' | 'sales' | 'receipts' | 'purchases' | 'ledgers' | 'stock' | 'daybook' | 'profitloss' | 'balancesheet' | 'opening' | 'caaudit' | 'settings';

// ── Helpers ──
function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

function tallyDateToDisplay(d: string) {
  if (!d || d.length !== 8) return d || '-';
  return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
}

// ────────────────────────────────────────────────────────────
export default function TallyPage() {
  const token = useAuth();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dashboard data
  const [config, setConfig] = useState<TallyConfigStatus | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connectionMsg, setConnectionMsg] = useState('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  // Tab-specific data
  const [vouchers, setVouchers] = useState<TallyVoucher[]>([]);
  const [ledgers, setLedgers] = useState<TallyLedger[]>([]);
  const [stockItems, setStockItems] = useState<TallyStockItem[]>([]);

  // Financial Year
  const FY_OPTIONS = [
    { label: 'FY 2023-24', value: '2023-24', from: '20230401', to: '20240331' },
    { label: 'FY 2024-25', value: '2024-25', from: '20240401', to: '20250331' },
    { label: 'FY 2025-26', value: '2025-26', from: '20250401', to: '20260331' },
  ];
  const [selectedFY, setSelectedFY] = useState('2024-25');
  const currentFY = FY_OPTIONS.find(f => f.value === selectedFY) || FY_OPTIONS[1];

  // Monthly / Yearly toggle
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly');
  const [selectedMonth, setSelectedMonth] = useState(0); // 0=Apr, 1=May, ..., 11=Mar

  const MONTH_NAMES = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const MONTH_FULL = ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];

  // Get date range for selected month within the FY
  const getMonthDateRange = (monthIdx: number): { from: string; to: string; isoFrom: string; isoTo: string } => {
    const fyStart = parseInt(selectedFY.split('-')[0]);
    // monthIdx: 0=Apr(fyStart), 1=May, ..., 8=Dec, 9=Jan(fyStart+1), 10=Feb, 11=Mar
    const calMonth = monthIdx < 9 ? monthIdx + 4 : monthIdx - 8; // 4=Apr..12=Dec, 1=Jan..3=Mar
    const year = monthIdx < 9 ? fyStart : fyStart + 1;
    const daysInMonth = new Date(year, calMonth, 0).getDate();
    const mm = String(calMonth).padStart(2, '0');
    return {
      from: `${year}${mm}01`,
      to: `${year}${mm}${String(daysInMonth).padStart(2, '0')}`,
      isoFrom: `${year}-${mm}-01`,
      isoTo: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
    };
  };

  // Effective date range: monthly or yearly
  const effectiveDateRange = viewMode === 'monthly'
    ? getMonthDateRange(selectedMonth)
    : { from: currentFY.from, to: currentFY.to, isoFrom: '', isoTo: '' };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [ledgerGroup, setLedgerGroup] = useState('');
  const [voucherType, setVoucherType] = useState('Sales');

  // Month label helper
  const monthLabel = viewMode === 'monthly'
    ? `${MONTH_FULL[selectedMonth]} ${selectedMonth < 9 ? selectedFY.split('-')[0] : '20' + selectedFY.split('-')[1]}`
    : '';

  // P&L and Balance Sheet
  const [plData, setPlData] = useState<ProfitAndLoss | null>(null);
  const [bsData, setBsData] = useState<BalanceSheetData | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [lastSync, setLastSync] = useState<any>(null);
  const [syncCounts, setSyncCounts] = useState<{ customers: number; invoices: number; payments: number } | null>(null);

  // Feature toggles
  const [showSales, setShowSales] = useState(false);
  const [showPurchases, setShowPurchases] = useState(false);

  // Dashboard extras (from API)
  const [dashProfitLoss, setDashProfitLoss] = useState(0);
  const [dashParticipants, setDashParticipants] = useState(0);
  const [dashTotalPayments, setDashTotalPayments] = useState(0);
  const [dashRecentPayments, setDashRecentPayments] = useState<TallyVoucher[]>([]);
  const [bankSummary, setBankSummary] = useState<any>(null);

  // AI Chatbox
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Manual Opening Balances
  interface ManualEntry { _id: string; ledgerName: string; parentGroup: string; category: string; amount: number; drCr: string; asOnDate: string; notes: string; }
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [manualTotals, setManualTotals] = useState<{ totalAssets: number; totalLiabilities: number; totalIncome: number; totalExpenses: number }>({ totalAssets: 0, totalLiabilities: 0, totalIncome: 0, totalExpenses: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ledgerName: '', parentGroup: '', category: 'asset' as string, amount: '', drCr: 'Dr' as string, asOnDate: '', notes: '' });
  const [manualLoading, setManualLoading] = useState(false);

  // Manual Vouchers (Receipts, Payments, etc.)
  interface ManualVoucher { _id: string; voucherType: string; voucherNumber: string; date: string; partyName: string; ledgerName: string; amount: number; narration: string; paymentMode: string; }
  const [manualVouchers, setManualVouchers] = useState<ManualVoucher[]>([]);
  const [manualVoucherTotal, setManualVoucherTotal] = useState(0);
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [editingVoucherId, setEditingVoucherId] = useState<string | null>(null);
  const [voucherFormData, setVoucherFormData] = useState({ voucherType: 'Receipt', voucherNumber: '', date: '', partyName: '', ledgerName: '', amount: '', narration: '', paymentMode: 'Bank' });
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [manualVoucherStats, setManualVoucherStats] = useState<Record<string, { count: number; total: number }>>({});

  // CA Audit — Receipt Files
  interface ReceiptFile { _id: string; fileName: string; fileUrl: string; previewUrl: string; fileType: string; fileSize: number; category: string; voucherId?: string; voucherType: string; voucherNumber: string; partyName: string; amount?: number; date: string; notes: string; createdAt: string; }
  const [receiptFiles, setReceiptFiles] = useState<ReceiptFile[]>([]);
  const [receiptFilesLoading, setReceiptFilesLoading] = useState(false);
  const [receiptFileStats, setReceiptFileStats] = useState<{ total: number; income: number; expense: number; other: number }>({ total: 0, income: 0, expense: 0, other: 0 });
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<ReceiptFile | null>(null);
  const receiptFileInputRef = useRef<HTMLInputElement>(null);
  const bulkReceiptInputRef = useRef<HTMLInputElement>(null);
  const [caFilterCategory, setCaFilterCategory] = useState<'all' | 'income' | 'expense' | 'other'>('all');
  const [uploadFormData, setUploadFormData] = useState({ category: 'income' as string, voucherType: '', voucherNumber: '', partyName: '', amount: '', date: '', notes: '' });

  // ── CA Audit: Fetch Receipt Files ──
  const fetchReceiptFiles = useCallback(async () => {
    if (!token) return;
    setReceiptFilesLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/tally/receipt-files?fy=${selectedFY}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setReceiptFiles(data.files || []);
        setReceiptFileStats(data.stats || { total: 0, income: 0, expense: 0, other: 0 });
      }
    } catch (err: any) {
      console.error('Fetch receipt files error:', err);
    } finally {
      setReceiptFilesLoading(false);
    }
  }, [token, selectedFY]);

  // ── CA Audit: Upload Receipt File ──
  const uploadReceiptFile = async (file: File) => {
    if (!token || !file) return;
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('financialYear', selectedFY);
      fd.append('category', uploadFormData.category);
      fd.append('voucherType', uploadFormData.voucherType);
      fd.append('voucherNumber', uploadFormData.voucherNumber);
      fd.append('partyName', uploadFormData.partyName);
      fd.append('amount', uploadFormData.amount);
      fd.append('date', uploadFormData.date);
      fd.append('notes', uploadFormData.notes);

      const res = await fetch('/api/admin/crm/tally/receipt-files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        await fetchReceiptFiles();
        setShowUploadForm(false);
        setUploadFormData({ category: 'income', voucherType: '', voucherNumber: '', partyName: '', amount: '', date: '', notes: '' });
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (err: any) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  // ── CA Audit: Bulk Upload ──
  const handleBulkReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !token) return;
    setUploadingFile(true);
    let success = 0;
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      try {
        const fd = new FormData();
        fd.append('file', files[i]);
        fd.append('financialYear', selectedFY);
        fd.append('category', 'other');
        const res = await fetch('/api/admin/crm/tally/receipt-files', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json();
        if (data.success) success++;
        else failed++;
      } catch {
        failed++;
      }
    }
    await fetchReceiptFiles();
    setUploadingFile(false);
    alert(`Uploaded: ${success} files${failed > 0 ? `, Failed: ${failed}` : ''}`);
    if (bulkReceiptInputRef.current) bulkReceiptInputRef.current.value = '';
  };

  // ── CA Audit: Delete Receipt File ──
  const deleteReceiptFile = async (id: string) => {
    if (!token || !confirm('Delete this receipt file?')) return;
    try {
      const res = await fetch(`/api/admin/crm/tally/receipt-files?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        await fetchReceiptFiles();
        setReceiptPreview(null);
      }
    } catch (err: any) {
      alert('Delete error: ' + err.message);
    }
  };

  // ── CA Audit: Download CSV ──
  const downloadAuditCSV = () => {
    // Combine manual voucher data + manual balance income/expense data
    const allVouchers = [...manualVouchers];
    const incomeEntries = manualEntries.filter(e => e.category === 'income');
    const expenseEntries = manualEntries.filter(e => e.category === 'expense');

    // Build CSV rows
    const rows: string[][] = [];
    rows.push(['RECEIPTS & PAYMENTS — FY ' + selectedFY]);
    rows.push([]);
    rows.push(['S.No', 'Date', 'Voucher Type', 'Voucher No', 'Party Name', 'Account Head', 'Amount (₹)', 'Payment Mode', 'Narration']);

    const receiptVouchers = allVouchers.filter(v => v.voucherType === 'Receipt').sort((a, b) => a.date.localeCompare(b.date));
    const paymentVouchers = allVouchers.filter(v => v.voucherType === 'Payment').sort((a, b) => a.date.localeCompare(b.date));
    const journalVouchers = allVouchers.filter(v => v.voucherType === 'Journal').sort((a, b) => a.date.localeCompare(b.date));
    const contraVouchers = allVouchers.filter(v => v.voucherType === 'Contra').sort((a, b) => a.date.localeCompare(b.date));

    let idx = 1;
    rows.push([]);
    rows.push(['--- RECEIPT VOUCHERS ---']);
    for (const v of receiptVouchers) {
      rows.push([String(idx++), v.date, v.voucherType, v.voucherNumber, v.partyName, v.ledgerName, String(v.amount), v.paymentMode, v.narration]);
    }
    rows.push(['', '', '', '', 'Total Receipts', '', String(receiptVouchers.reduce((s, v) => s + v.amount, 0)), '', '']);

    idx = 1;
    rows.push([]);
    rows.push(['--- PAYMENT VOUCHERS ---']);
    for (const v of paymentVouchers) {
      rows.push([String(idx++), v.date, v.voucherType, v.voucherNumber, v.partyName, v.ledgerName, String(v.amount), v.paymentMode, v.narration]);
    }
    rows.push(['', '', '', '', 'Total Payments', '', String(paymentVouchers.reduce((s, v) => s + v.amount, 0)), '', '']);

    if (journalVouchers.length > 0) {
      idx = 1;
      rows.push([]);
      rows.push(['--- JOURNAL VOUCHERS ---']);
      for (const v of journalVouchers) {
        rows.push([String(idx++), v.date, v.voucherType, v.voucherNumber, v.partyName, v.ledgerName, String(v.amount), v.paymentMode, v.narration]);
      }
      rows.push(['', '', '', '', 'Total Journals', '', String(journalVouchers.reduce((s, v) => s + v.amount, 0)), '', '']);
    }

    if (contraVouchers.length > 0) {
      idx = 1;
      rows.push([]);
      rows.push(['--- CONTRA VOUCHERS ---']);
      for (const v of contraVouchers) {
        rows.push([String(idx++), v.date, v.voucherType, v.voucherNumber, v.partyName, v.ledgerName, String(v.amount), v.paymentMode, v.narration]);
      }
      rows.push(['', '', '', '', 'Total Contra', '', String(contraVouchers.reduce((s, v) => s + v.amount, 0)), '', '']);
    }

    // Income
    rows.push([]);
    rows.push(['--- INCOME ---']);
    rows.push(['S.No', 'Ledger Name', 'Parent Group', 'Amount (₹)', 'Dr/Cr']);
    incomeEntries.forEach((e, i) => {
      rows.push([String(i + 1), e.ledgerName, e.parentGroup, String(e.amount), e.drCr]);
    });
    const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
    rows.push(['', 'Total Income', '', String(totalIncome), '']);

    // Expenses
    rows.push([]);
    rows.push(['--- EXPENSES ---']);
    rows.push(['S.No', 'Ledger Name', 'Parent Group', 'Amount (₹)', 'Dr/Cr']);
    expenseEntries.forEach((e, i) => {
      rows.push([String(i + 1), e.ledgerName, e.parentGroup, String(e.amount), e.drCr]);
    });
    const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0);
    rows.push(['', 'Total Expenses', '', String(totalExpenses), '']);
    rows.push(['', 'Net Profit/Loss', '', String(totalIncome - totalExpenses), '']);

    // Convert to CSV string
    const csv = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CA-Audit-Report-FY-${selectedFY}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── CA Audit: Download Full PDF Report ──
  const downloadAuditPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const companyName = 'UPAMNYU INTERNATIONAL EDUCATION PRIVATE LIMITED';
    const fy = FY_OPTIONS.find(f => f.value === selectedFY) || FY_OPTIONS[0];
    const fromDate = `1-Apr-${fy.value.split('-')[0]}`;
    const toDate = `31-Mar-20${fy.value.split('-')[1]}`;
    const fmtNum = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);

    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 12;

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, pageWidth / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(11);
    doc.text(`CA Audit Report — ${fy.label}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${fromDate} to ${toDate}`, pageWidth / 2, y, { align: 'center' });
    y += 8;

    const allVouchers = [...manualVouchers];
    const incomeEntries = manualEntries.filter(e => e.category === 'income');
    const expenseEntries = manualEntries.filter(e => e.category === 'expense');
    const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
    const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0);
    const receiptVouchers = allVouchers.filter(v => v.voucherType === 'Receipt').sort((a, b) => a.date.localeCompare(b.date));
    const paymentVouchers = allVouchers.filter(v => v.voucherType === 'Payment').sort((a, b) => a.date.localeCompare(b.date));
    const journalVouchers = allVouchers.filter(v => v.voucherType === 'Journal' || v.voucherType === 'Contra').sort((a, b) => a.date.localeCompare(b.date));

    // ── Summary Section ──
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [['Particulars', 'Count', 'Amount (₹)']],
      body: [
        ['Receipt Vouchers', String(receiptVouchers.length), fmtNum(receiptVouchers.reduce((s, v) => s + v.amount, 0))],
        ['Payment Vouchers', String(paymentVouchers.length), fmtNum(paymentVouchers.reduce((s, v) => s + v.amount, 0))],
        ['Journal / Contra', String(journalVouchers.length), fmtNum(journalVouchers.reduce((s, v) => s + v.amount, 0))],
        ['Total Income', String(incomeEntries.length), fmtNum(totalIncome)],
        ['Total Expenses', String(expenseEntries.length), fmtNum(totalExpenses)],
        [totalIncome >= totalExpenses ? 'Net Profit' : 'Net Loss', '', fmtNum(Math.abs(totalIncome - totalExpenses))],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [60, 60, 60], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // ── Income Details ──
    if (incomeEntries.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`INCOME — ${fmtNum(totalIncome)}`, 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['#', 'Ledger Name', 'Parent Group', 'Amount (₹)']],
        body: incomeEntries.map((e, i) => [String(i + 1), e.ledgerName, e.parentGroup, fmtNum(e.amount)]),
        foot: [['', 'Total Income', '', fmtNum(totalIncome)]],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [34, 120, 60], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [34, 120, 60], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 3: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Expense Details ──
    if (expenseEntries.length > 0) {
      if (y > 250) { doc.addPage(); y = 14; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`EXPENSES — ${fmtNum(totalExpenses)}`, 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['#', 'Ledger Name', 'Parent Group', 'Amount (₹)']],
        body: expenseEntries.map((e, i) => [String(i + 1), e.ledgerName, e.parentGroup, fmtNum(e.amount)]),
        foot: [['', 'Total Expenses', '', fmtNum(totalExpenses)]],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [160, 40, 40], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [160, 40, 40], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 3: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Receipt Vouchers ──
    if (receiptVouchers.length > 0) {
      if (y > 220) { doc.addPage(); y = 14; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`RECEIPT VOUCHERS (${receiptVouchers.length})`, 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['#', 'Date', 'Vch No', 'Party Name', 'Amount (₹)', 'Mode', 'Narration']],
        body: receiptVouchers.map((v, i) => [String(i + 1), v.date, v.voucherNumber || '-', v.partyName, fmtNum(v.amount), v.paymentMode || '-', v.narration || '-']),
        foot: [['', '', '', 'Total Receipts', fmtNum(receiptVouchers.reduce((s, v) => s + v.amount, 0)), '', '']],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [34, 120, 60], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [34, 120, 60], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 4: { halign: 'right' }, 6: { cellWidth: 40 } },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Payment Vouchers ──
    if (paymentVouchers.length > 0) {
      if (y > 220) { doc.addPage(); y = 14; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`PAYMENT VOUCHERS (${paymentVouchers.length})`, 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['#', 'Date', 'Vch No', 'Party Name', 'Amount (₹)', 'Mode', 'Narration']],
        body: paymentVouchers.map((v, i) => [String(i + 1), v.date, v.voucherNumber || '-', v.partyName, fmtNum(v.amount), v.paymentMode || '-', v.narration || '-']),
        foot: [['', '', '', 'Total Payments', fmtNum(paymentVouchers.reduce((s, v) => s + v.amount, 0)), '', '']],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [160, 40, 40], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [160, 40, 40], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 4: { halign: 'right' }, 6: { cellWidth: 40 } },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // ── Journal / Contra Vouchers ──
    if (journalVouchers.length > 0) {
      if (y > 220) { doc.addPage(); y = 14; }
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`JOURNAL / CONTRA VOUCHERS (${journalVouchers.length})`, 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [['#', 'Date', 'Vch No', 'Party Name', 'Amount (₹)', 'Mode', 'Narration']],
        body: journalVouchers.map((v, i) => [String(i + 1), v.date, v.voucherNumber || '-', v.partyName, fmtNum(v.amount), v.paymentMode || '-', v.narration || '-']),
        foot: [['', '', '', 'Total', fmtNum(journalVouchers.reduce((s, v) => s + v.amount, 0)), '', '']],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [80, 80, 80], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 4: { halign: 'right' }, 6: { cellWidth: 40 } },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Footer on each page
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120);
      doc.text(`Generated from Swar Yoga CRM — ${new Date().toLocaleDateString('en-IN')}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
      doc.text(`Page ${p} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
      doc.setTextColor(0);
    }

    doc.save(`CA-Audit-Report-FY-${selectedFY}.pdf`);
  };

  // ── CA Audit: Download All Receipt Files as ZIP ──
  const downloadAllReceiptsZip = async () => {
    if (receiptFiles.length === 0) { alert('No receipt files to download.'); return; }

    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    let downloaded = 0;
    const total = receiptFiles.length;
    const progressEl = document.getElementById('zip-progress');

    for (const f of receiptFiles) {
      try {
        if (progressEl) progressEl.textContent = `Downloading ${++downloaded}/${total}...`;
        const url = f.previewUrl || f.fileUrl;
        const res = await fetch(url);
        if (!res.ok) continue;
        const blob = await res.blob();
        // Organize by category
        const folder = f.category || 'other';
        const fileName = f.partyName
          ? `${f.date || 'undated'}_${f.partyName.replace(/[^a-zA-Z0-9]/g, '_')}_${f.amount ? f.amount : ''}.${f.fileName.split('.').pop()}`
          : f.fileName;
        zip.file(`${folder}/${fileName}`, blob);
      } catch {
        // Skip failed downloads silently
      }
    }

    if (progressEl) progressEl.textContent = 'Creating ZIP...';
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CA-Receipts-FY-${selectedFY}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    if (progressEl) progressEl.textContent = '';
  };

  // ── Print Report (Tally A4 format) ──
  const printReport = (type: 'pl' | 'bs' | 'receipts') => {
    const companyName = 'UPAMNYU INTERNATIONAL EDUCATION PRIVATE LIMITED';
    const fy = FY_OPTIONS.find(f => f.value === selectedFY) || FY_OPTIONS[0];
    const fromDate = `1-Apr-${fy.value.split('-')[0]}`;
    const toDate = `31-Mar-20${fy.value.split('-')[1]}`;

    const fmtPrint = (n: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

    let title = '';
    let bodyHtml = '';

    if (type === 'pl' && plData) {
      title = 'Profit & Loss A/c';
      // Side by side: Income (Credit) | Expenses (Debit)
      const maxRows = Math.max(
        plData.income.reduce((s, g) => s + 1 + g.children.length, 0),
        plData.expenses.reduce((s, g) => s + 1 + g.children.length, 0)
      );
      let incomeRows = '';
      for (const g of plData.income) {
        incomeRows += `<tr class="group-row"><td colspan="2" style="font-weight:600;padding-left:8px;">${g.name}</td></tr>`;
        for (const c of g.children) {
          incomeRows += `<tr><td style="padding-left:24px;">${c.name}</td><td class="amt">${fmtPrint(c.amount)}</td></tr>`;
        }
      }
      let expenseRows = '';
      for (const g of plData.expenses) {
        expenseRows += `<tr class="group-row"><td colspan="2" style="font-weight:600;padding-left:8px;">${g.name}</td></tr>`;
        for (const c of g.children) {
          expenseRows += `<tr><td style="padding-left:24px;">${c.name}</td><td class="amt">${fmtPrint(c.amount)}</td></tr>`;
        }
      }
      // Net profit/loss row
      if (plData.netProfit >= 0) {
        expenseRows += `<tr class="total-row"><td style="padding-left:8px;font-weight:700;">Net Profit</td><td class="amt" style="font-weight:700;">${fmtPrint(plData.netProfit)}</td></tr>`;
      } else {
        incomeRows += `<tr class="total-row"><td style="padding-left:8px;font-weight:700;">Net Loss</td><td class="amt" style="font-weight:700;">${fmtPrint(plData.netProfit)}</td></tr>`;
      }
      const grandTotal = plData.netProfit >= 0 ? plData.totalIncome : plData.totalExpenses;

      bodyHtml = `
        <table class="tally-table" style="width:100%;">
          <thead>
            <tr>
              <th colspan="2" style="width:50%;text-align:left;">Particulars (Income)</th>
              <th colspan="2" style="width:50%;text-align:left;">Particulars (Expenditure)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="2" style="vertical-align:top;padding:0;">
                <table class="inner-table">${incomeRows}
                  <tr class="grand-total"><td>Total</td><td class="amt">${fmtPrint(grandTotal)}</td></tr>
                </table>
              </td>
              <td colspan="2" style="vertical-align:top;padding:0;">
                <table class="inner-table">${expenseRows}
                  <tr class="grand-total"><td>Total</td><td class="amt">${fmtPrint(grandTotal)}</td></tr>
                </table>
              </td>
            </tr>
          </tbody>
        </table>`;
    } else if (type === 'bs' && bsData) {
      title = 'Balance Sheet';
      let assetRows = '';
      for (const g of bsData.assets) {
        assetRows += `<tr class="group-row"><td colspan="2" style="font-weight:600;padding-left:8px;">${g.name}</td></tr>`;
        for (const c of g.children) {
          assetRows += `<tr><td style="padding-left:24px;">${c.name}</td><td class="amt">${fmtPrint(c.amount)}</td></tr>`;
        }
      }
      let liabRows = '';
      for (const g of bsData.liabilities) {
        liabRows += `<tr class="group-row"><td colspan="2" style="font-weight:600;padding-left:8px;">${g.name}</td></tr>`;
        for (const c of g.children) {
          liabRows += `<tr><td style="padding-left:24px;">${c.name}</td><td class="amt">${fmtPrint(c.amount)}</td></tr>`;
        }
      }
      if (bsData.difference !== 0) {
        const diffLabel = bsData.difference > 0 ? 'Difference (Excess Assets)' : 'Difference (Excess Liabilities)';
        if (bsData.difference > 0) {
          liabRows += `<tr class="total-row"><td style="padding-left:8px;font-style:italic;">${diffLabel}</td><td class="amt">${fmtPrint(bsData.difference)}</td></tr>`;
        } else {
          assetRows += `<tr class="total-row"><td style="padding-left:8px;font-style:italic;">${diffLabel}</td><td class="amt">${fmtPrint(bsData.difference)}</td></tr>`;
        }
      }
      const maxSide = Math.max(bsData.totalAssets, bsData.totalLiabilities + Math.max(0, bsData.difference));

      bodyHtml = `
        <table class="tally-table" style="width:100%;">
          <thead>
            <tr>
              <th colspan="2" style="width:50%;text-align:left;">Liabilities</th>
              <th colspan="2" style="width:50%;text-align:left;">Assets</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colspan="2" style="vertical-align:top;padding:0;">
                <table class="inner-table">${liabRows}
                  <tr class="grand-total"><td>Total</td><td class="amt">${fmtPrint(bsData.totalLiabilities + Math.max(0, bsData.difference))}</td></tr>
                </table>
              </td>
              <td colspan="2" style="vertical-align:top;padding:0;">
                <table class="inner-table">${assetRows}
                  <tr class="grand-total"><td>Total</td><td class="amt">${fmtPrint(bsData.totalAssets + Math.max(0, -bsData.difference))}</td></tr>
                </table>
              </td>
            </tr>
          </tbody>
        </table>`;
    } else if (type === 'receipts') {
      title = 'Receipt Register';
      // Combine Tally + manual vouchers for receipts
      const allReceipts = [
        ...filteredVouchers.map(v => ({ ...v, source: 'Tally', displayDate: tallyDateToDisplay(v.date) })),
        ...filteredManualVouchers.map(v => ({ ...v, voucherType: v.voucherType, source: 'Manual', displayDate: v.date })),
      ];
      const totalAmt = allReceipts.reduce((s, v) => s + v.amount, 0);

      let rows = '';
      allReceipts.forEach((v, i) => {
        rows += `<tr>
          <td style="text-align:center;">${i + 1}</td>
          <td>${v.displayDate || '-'}</td>
          <td>${v.voucherNumber || '-'}</td>
          <td>${v.partyName || '-'}</td>
          <td class="amt">${fmtPrint(v.amount)}</td>
          <td>${v.narration || '-'}</td>
        </tr>`;
      });

      bodyHtml = `
        <table class="tally-table" style="width:100%;">
          <thead>
            <tr>
              <th style="width:5%;text-align:center;">S.No</th>
              <th style="width:12%;">Date</th>
              <th style="width:13%;">Voucher No</th>
              <th style="width:30%;">Party Name</th>
              <th style="width:15%;text-align:right;">Amount (₹)</th>
              <th style="width:25%;">Narration</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr class="grand-total">
              <td colspan="4" style="text-align:right;font-weight:700;">Total Receipts</td>
              <td class="amt" style="font-weight:700;">${fmtPrint(totalAmt)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>`;
    }

    if (!bodyHtml) { alert('No data to print. Please add entries first.'); return; }

    const printWindow = window.open('', '_blank');
    if (!printWindow) { alert('Please allow popups to print.'); return; }

    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${title} - ${companyName}</title>
  <style>
    @page { size: A4; margin: 15mm 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; background: #fff; }
    .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #000; padding-bottom: 8px; }
    .header h1 { font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
    .header h2 { font-size: 12px; font-weight: 600; margin-bottom: 2px; }
    .header .period { font-size: 10px; color: #333; }
    .tally-table { border-collapse: collapse; width: 100%; margin-top: 8px; }
    .tally-table th { background: #f0f0f0; border: 1px solid #000; padding: 4px 6px; font-size: 10px; text-transform: uppercase; font-weight: 700; }
    .tally-table td { border: 1px solid #ccc; padding: 3px 6px; font-size: 10px; vertical-align: top; }
    .inner-table { width: 100%; border-collapse: collapse; }
    .inner-table td { border: none; border-bottom: 1px solid #eee; padding: 3px 6px; font-size: 10px; }
    .inner-table .group-row td { background: #f8f8f8; font-weight: 600; border-bottom: 1px solid #ccc; }
    .inner-table .total-row td { border-top: 1px solid #999; }
    .inner-table .grand-total td { border-top: 2px solid #000; font-weight: 700; font-size: 11px; background: #f0f0f0; }
    .amt { text-align: right; font-family: 'Courier New', monospace; }
    .group-row td { background: #f8f8f8; }
    .total-row td { border-top: 1px solid #999; }
    .grand-total td { border-top: 2px solid #000; font-weight: 700; font-size: 11px; background: #f0f0f0; }
    .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #666; border-top: 1px solid #ccc; padding-top: 6px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${companyName}</h1>
    <h2>${title}</h2>
    <div class="period">${fromDate} to ${toDate}</div>
  </div>
  ${bodyHtml}
  <div class="footer">
    Generated from Swar Yoga CRM &mdash; ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN')}
  </div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 500); };
  </script>
</body>
</html>`);
    printWindow.document.close();
  };

  // ── Carry Forward Balances ──
  // ── Export Tally XML ──
  const exportTallyXml = useCallback(async (type: 'all' | 'ledgers' | 'vouchers' = 'all') => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/crm/tally/export-xml?fy=${selectedFY}&type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Export failed');
        return;
      }
      const ledgerCount = res.headers.get('X-Ledger-Count') || '0';
      const voucherCount = res.headers.get('X-Voucher-Count') || '0';
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tally-import-${selectedFY}-${type}.xml`;
      a.click();
      URL.revokeObjectURL(url);
      alert(`Tally XML exported!\n${ledgerCount} ledgers + ${voucherCount} vouchers\n\nTo import in Tally Prime 3.0.1:\n1. Open Tally Prime → your company\n2. Gateway of Tally → Import Data\n3. Select this XML file`);
    } catch (err: any) {
      alert('Export error: ' + err.message);
    }
  }, [token, selectedFY]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const headers = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  // ── Fetch dashboard ──
  const fetchDashboard = useCallback(async (fy?: { from: string; to: string }) => {
    if (!token) return;
    const f = fy || currentFY;
    const fyValue = FY_OPTIONS.find(o => o.from === f.from)?.value || selectedFY;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crm/tally?action=dashboard&from=${f.from}&to=${f.to}&fy=${fyValue}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setConfig(data.config);
      setSummary(data.summary);
      setConnected(data.tallyConnected ?? true);
      setDashProfitLoss(data.profitLoss ?? 0);
      setDashParticipants(data.participantCount ?? 0);
      setDashTotalPayments(data.totalPayments ?? 0);
      setDashRecentPayments(data.recentPayments ?? []);
      if (data.bankSummary) setBankSummary(data.bankSummary);
      if (data.manualStats) setManualVoucherStats(data.manualStats);
    } catch (err: any) {
      setError(err.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [token, headers, selectedFY]);

  // ── Test connection ──
  const testConnection = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/tally?action=test', { headers: headers() });
      const data = await res.json();
      setConfig(data.config);
      setConnected(data.connection?.connected || false);
      setConnectionMsg(data.connection?.error || (data.connection?.connected ? `Connected to ${data.connection.companyName}` : 'Not connected'));
    } catch (err: any) {
      setConnected(false);
      setConnectionMsg(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  // ── Fetch vouchers ──
  const fetchVoucherData = useCallback(async (type: string, fy?: { from: string; to: string }) => {
    if (!token) return;
    const f = fy || currentFY;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/tally?action=vouchers&type=${encodeURIComponent(type)}&from=${f.from}&to=${f.to}`, { headers: headers() });
      const data = await res.json();
      setVouchers(data.vouchers || []);
    } catch {
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  // ── Fetch ledgers ──
  const fetchLedgerData = useCallback(async (group?: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const url = group ? `/api/admin/crm/tally?action=ledgers&group=${encodeURIComponent(group)}` : '/api/admin/crm/tally?action=ledgers';
      const res = await fetch(url, { headers: headers() });
      const data = await res.json();
      setLedgers(data.ledgers || []);
    } catch {
      setLedgers([]);
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  // ── Fetch stock ──
  const fetchStock = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/crm/tally?action=stock', { headers: headers() });
      const data = await res.json();
      setStockItems(data.items || []);
    } catch {
      setStockItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  // ── Fetch daybook ──
  const fetchDaybook = useCallback(async (fy?: { from: string; to: string }) => {
    if (!token) return;
    const f = fy || currentFY;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/tally?action=daybook&from=${f.from}&to=${f.to}`, { headers: headers() });
      const data = await res.json();
      setVouchers(data.vouchers || []);
    } catch {
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

  // ── Fetch Profit & Loss ──
  const fetchPL = useCallback(async (fy?: { from: string; to: string }) => {
    if (!token) return;
    const f = fy || currentFY;
    setLoading(true);
    try {
      const modeParam = viewMode === 'monthly' ? '&mode=monthly' : '';
      const res = await fetch(`/api/admin/crm/tally?action=profitloss&from=${f.from}&to=${f.to}&fy=${selectedFY}${modeParam}`, { headers: headers() });
      const data = await res.json();
      if (data.success && (data.totalIncome > 0 || data.totalExpenses > 0)) {
        setPlData(data);
      } else {
        setPlData(null);
      }
    } catch { setPlData(null); }
    finally { setLoading(false); }
  }, [token, headers, selectedFY, viewMode]);

  // ── Build BS from manual entries ──
  // Accounting: Assets normally Dr (positive), Liabilities normally Cr (positive)
  // A liability with Dr balance (e.g., P&L loss) REDUCES liabilities
  // An asset with Cr balance REDUCES assets
  const buildBSFromManual = (entries: ManualEntry[]): BalanceSheetData | null => {
    const assetEntries = entries.filter(e => e.category === 'asset');
    const liabEntries = entries.filter(e => e.category === 'liability');
    if (assetEntries.length === 0 && liabEntries.length === 0) return null;

    // Get effective signed amount based on Dr/Cr and category
    const effectiveAmount = (entry: ManualEntry): number => {
      const amt = Math.abs(entry.amount);
      if (entry.category === 'asset') {
        // Assets: Dr = positive (normal), Cr = negative
        return entry.drCr === 'Cr' ? -amt : amt;
      } else {
        // Liabilities: Cr = positive (normal), Dr = negative
        return entry.drCr === 'Dr' ? -amt : amt;
      }
    };

    const groupEntries = (items: ManualEntry[]) => {
      const map = new Map<string, { name: string; amount: number }[]>();
      for (const item of items) {
        const key = item.parentGroup || 'Other';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ name: item.ledgerName, amount: effectiveAmount(item) });
      }
      return Array.from(map.entries()).map(([name, children]) => ({
        name,
        amount: children.reduce((s, c) => s + c.amount, 0),
        children: children.sort((a, b) => b.amount - a.amount),
      })).sort((a, b) => b.amount - a.amount);
    };

    const assets = groupEntries(assetEntries);
    const liabilities = groupEntries(liabEntries);
    const totalAssets = assets.reduce((s, g) => s + g.amount, 0);
    const totalLiabilities = liabilities.reduce((s, g) => s + g.amount, 0);
    return { assets, liabilities, totalAssets, totalLiabilities, difference: totalAssets - totalLiabilities };
  };

  // ── Fetch Balance Sheet (Tally first → manual fallback) ──
  const fetchBS = useCallback(async (fy?: { from: string; to: string }) => {
    if (!token) return;
    const f = fy || currentFY;
    setLoading(true);
    try {
      // Try Tally first
      const res = await fetch(`/api/admin/crm/tally?action=balancesheet&from=${f.from}&to=${f.to}`, { headers: headers() });
      const data = await res.json();
      if (data.success && (data.assets?.length > 0 || data.liabilities?.length > 0)) {
        setBsData(data);
        return;
      }
    } catch { /* Tally not available */ }

    // Fallback: load manual balances
    try {
      const manRes = await fetch(`/api/admin/crm/tally/manual-balances?fy=${selectedFY}`, { headers: headers() });
      const manData = await manRes.json();
      if (manData.success && manData.entries?.length > 0) {
        const bsFromManual = buildBSFromManual(manData.entries);
        setBsData(bsFromManual);
      } else {
        setBsData(null);
      }
    } catch { setBsData(null); }
    finally { setLoading(false); }
  }, [token, headers, selectedFY]);

  // ── Fetch Manual Balances ──
  const fetchManualBalances = useCallback(async () => {
    if (!token) return;
    setManualLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/tally/manual-balances?fy=${selectedFY}`, { headers: headers() });
      const data = await res.json();
      if (data.success) {
        setManualEntries(data.entries || []);
        setManualTotals(data.totals || { totalAssets: 0, totalLiabilities: 0, totalIncome: 0, totalExpenses: 0 });
      }
    } catch { setManualEntries([]); }
    finally { setManualLoading(false); }
  }, [token, headers, selectedFY]);

  // ── Carry Forward Balances to New FY ──
  const carryForwardBalances = useCallback(async () => {
    if (!token) return;
    // Determine source and target FY
    const fyIndex = FY_OPTIONS.findIndex(f => f.value === selectedFY);
    if (fyIndex <= 0) {
      alert('No previous FY to carry forward from. Select FY 2024-25 or later.');
      return;
    }
    const sourceFY = FY_OPTIONS[fyIndex - 1].value;
    const targetFY = selectedFY;

    if (!confirm(`Carry forward ALL ledger balances from FY ${sourceFY} → FY ${targetFY}?\n\nBalance Sheet items: closing balance carried forward\nP&L items: ledger created with zero opening balance\n\nEvery ledger will have its own entry in the new year.`)) return;

    try {
      const res = await fetch('/api/admin/crm/tally/manual-balances', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'carry-forward', sourceFY, targetFY }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Carry forward failed');
        return;
      }
      alert(`✅ Carried forward ${data.carried} ledgers from FY ${sourceFY} → FY ${targetFY}\n\nBS items (with balance): ${data.bsItems || '?'}\nP&L items (zero balance): ${data.plItems || '?'}\n\nTotal Dr: ₹${data.totalDr?.toLocaleString('en-IN')}\nTotal Cr: ₹${data.totalCr?.toLocaleString('en-IN')}\n${data.balanced ? '✅ Balanced!' : '⚠️ Not balanced'}`);
      fetchManualBalances();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }, [token, selectedFY, headers, fetchManualBalances]);

  // ── Add / Update Manual Entry ──
  const saveManualEntry = useCallback(async () => {
    if (!token || !formData.ledgerName || !formData.parentGroup || !formData.amount) return;
    setManualLoading(true);
    try {
      const payload = editingId
        ? { action: 'update', id: editingId, ...formData, amount: Number(formData.amount) }
        : { action: 'add', ...formData, amount: Number(formData.amount), financialYear: selectedFY };
      const res = await fetch('/api/admin/crm/tally/manual-balances', {
        method: 'POST', headers: headers(), body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddForm(false);
        setEditingId(null);
        setFormData({ ledgerName: '', parentGroup: '', category: 'asset', amount: '', drCr: 'Dr', asOnDate: '', notes: '' });
        fetchManualBalances();
      }
    } catch { /* ignore */ }
    finally { setManualLoading(false); }
  }, [token, formData, editingId, selectedFY, headers, fetchManualBalances]);

  // ── Delete Manual Entry ──
  const deleteManualEntry = useCallback(async (id: string) => {
    if (!token || !confirm('Delete this entry?')) return;
    try {
      await fetch('/api/admin/crm/tally/manual-balances', {
        method: 'POST', headers: headers(), body: JSON.stringify({ action: 'delete', id }),
      });
      fetchManualBalances();
    } catch { /* ignore */ }
  }, [token, headers, fetchManualBalances]);

  // ── Fetch Manual Vouchers ──
  const fetchManualVouchers = useCallback(async (type?: string) => {
    if (!token) return;
    setVoucherLoading(true);
    try {
      const t = type || 'all';
      const res = await fetch(`/api/admin/crm/tally/manual-vouchers?fy=${selectedFY}&type=${t}`, { headers: headers() });
      const data = await res.json();
      if (data.success) {
        setManualVouchers(data.entries || []);
        setManualVoucherTotal(data.total || 0);
      }
    } catch { setManualVouchers([]); }
    finally { setVoucherLoading(false); }
  }, [token, headers, selectedFY]);

  // ── Fetch Manual Voucher Stats (for dashboard) ──
  const fetchVoucherStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/tally/manual-vouchers', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ action: 'stats', financialYear: selectedFY }),
      });
      const data = await res.json();
      if (data.success) setManualVoucherStats(data.stats || {});
    } catch { /* ignore */ }
  }, [token, headers, selectedFY]);

  // ── Save Manual Voucher ──
  const saveManualVoucher = useCallback(async () => {
    if (!token || !voucherFormData.date || !voucherFormData.partyName || !voucherFormData.amount) return;
    setVoucherLoading(true);
    try {
      const payload = editingVoucherId
        ? { action: 'update', id: editingVoucherId, ...voucherFormData, amount: Number(voucherFormData.amount) }
        : { action: 'add', ...voucherFormData, amount: Number(voucherFormData.amount), financialYear: selectedFY };
      const res = await fetch('/api/admin/crm/tally/manual-vouchers', {
        method: 'POST', headers: headers(), body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setShowVoucherForm(false);
        setEditingVoucherId(null);
        setVoucherFormData({ voucherType: 'Receipt', voucherNumber: '', date: '', partyName: '', ledgerName: '', amount: '', narration: '', paymentMode: 'Bank' });
        // Refresh the right tab
        const vType = activeTab === 'receipts' ? 'Receipt' : activeTab === 'sales' ? 'Sales' : activeTab === 'purchases' ? 'Purchase' : 'all';
        fetchManualVouchers(vType);
      } else {
        alert(data.error || 'Failed to save voucher');
      }
    } catch (err: any) { alert('Network error: ' + (err?.message || 'Unknown')); }
    finally { setVoucherLoading(false); }
  }, [token, voucherFormData, editingVoucherId, selectedFY, headers, activeTab, fetchManualVouchers]);

  // ── Delete Manual Voucher ──
  const deleteManualVoucher = useCallback(async (id: string) => {
    if (!token || !confirm('Delete this voucher?')) return;
    try {
      await fetch('/api/admin/crm/tally/manual-vouchers', {
        method: 'POST', headers: headers(), body: JSON.stringify({ action: 'delete', id }),
      });
      const vType = activeTab === 'receipts' ? 'Receipt' : activeTab === 'sales' ? 'Sales' : activeTab === 'purchases' ? 'Purchase' : 'all';
      fetchManualVouchers(vType);
    } catch { /* ignore */ }
  }, [token, headers, activeTab, fetchManualVouchers]);

  // ── Edit Manual Voucher ──
  const startEditVoucher = (v: ManualVoucher) => {
    setEditingVoucherId(v._id);
    setVoucherFormData({
      voucherType: v.voucherType,
      voucherNumber: v.voucherNumber,
      date: v.date,
      partyName: v.partyName,
      ledgerName: v.ledgerName || '',
      amount: String(v.amount),
      narration: v.narration || '',
      paymentMode: v.paymentMode || 'Bank',
    });
    setShowVoucherForm(true);
  };

  // ── Edit Manual Entry ──
  const startEdit = (entry: ManualEntry) => {
    setEditingId(entry._id);
    setFormData({
      ledgerName: entry.ledgerName,
      parentGroup: entry.parentGroup,
      category: entry.category,
      amount: String(entry.amount),
      drCr: entry.drCr,
      asOnDate: entry.asOnDate || '',
      notes: entry.notes || '',
    });
    setShowAddForm(true);
  };

  // ── CSV Download ──
  const handleCSVDownload = () => {
    if (manualEntries.length === 0) { alert('No entries to download'); return; }
    const header = 'Ledger Name,Parent Group,Category,Amount,Dr/Cr,As On Date,Notes';
    const rows = manualEntries.map(e =>
      [e.ledgerName, e.parentGroup, e.category, e.amount, e.drCr, e.asOnDate || '', (e.notes || '').replace(/,/g, ';')]
        .map(v => `"${v}"`)
        .join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `opening-balances-${selectedFY}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── CSV Upload ──
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { alert('CSV file is empty or has only headers'); return; }
      // skip header row
      const entries = lines.slice(1).map(line => {
        // parse CSV respecting quoted values
        const cols: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') { inQuotes = !inQuotes; }
          else if (ch === ',' && !inQuotes) { cols.push(current.trim()); current = ''; }
          else { current += ch; }
        }
        cols.push(current.trim());
        return {
          ledgerName: cols[0] || '',
          parentGroup: cols[1] || '',
          category: (['asset', 'liability', 'income', 'expense'].includes(cols[2]?.toLowerCase()) ? cols[2].toLowerCase() : 'asset'),
          amount: parseFloat(cols[3]) || 0,
          drCr: cols[4] === 'Cr' ? 'Cr' : 'Dr',
          asOnDate: cols[5] || '',
          notes: cols[6] || '',
        };
      }).filter(e => e.ledgerName);

      if (entries.length === 0) { alert('No valid entries found in CSV'); return; }
      if (!confirm(`Found ${entries.length} entries. Import them for ${currentFY.label}?`)) return;

      setManualLoading(true);
      const res = await fetch('/api/admin/crm/tally/manual-balances', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action: 'bulk-add', entries, financialYear: selectedFY }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Imported ${data.insertedCount || entries.length} entries!`);
        fetchManualBalances();
      } else {
        alert('Import failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('CSV parse error: ' + err.message);
    } finally {
      setManualLoading(false);
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  };

  // ── Import from Tally Backup (pre-extracted ledgers) ──
  const handleTallyBackupImport = async () => {
    if (!token) return;
    const tallyLedgers: { ledgerName: string; parentGroup: string; category: string }[] = [
      // Assets
      { ledgerName: 'KOTAK MAHINDRA BANK A/C 0247296457', parentGroup: 'Bank Accounts', category: 'asset' },
      { ledgerName: 'Cash', parentGroup: 'Cash-in-Hand', category: 'asset' },
      { ledgerName: 'Computers & Accessories', parentGroup: 'Fixed Assets', category: 'asset' },
      { ledgerName: 'Machinery & Equipments', parentGroup: 'Fixed Assets', category: 'asset' },
      { ledgerName: 'Furniture & Fixtures', parentGroup: 'Fixed Assets', category: 'asset' },
      { ledgerName: 'Tally Software', parentGroup: 'Fixed Assets', category: 'asset' },
      // Liabilities / Capital
      { ledgerName: 'Mohan Kalburgi', parentGroup: 'Capital Account', category: 'liability' },
      { ledgerName: 'Vishal Agrawal', parentGroup: 'Capital Account', category: 'liability' },
      { ledgerName: 'Vaishali Pathak', parentGroup: 'Capital Account', category: 'liability' },
      { ledgerName: 'Janvi Purohit', parentGroup: 'Capital Account', category: 'liability' },
      { ledgerName: 'Janavi Suryawanshi', parentGroup: 'Capital Account', category: 'liability' },
      { ledgerName: 'Suvarna Sanjay', parentGroup: 'Capital Account', category: 'liability' },
      { ledgerName: 'Swati Sawant', parentGroup: 'Capital Account', category: 'liability' },
      { ledgerName: 'Arati Akula', parentGroup: 'Capital Account', category: 'liability' },
      { ledgerName: 'Mahesh Agrawal', parentGroup: 'Capital Account', category: 'liability' },
      { ledgerName: 'Santosh Agrawal', parentGroup: 'Capital Account', category: 'liability' },
      { ledgerName: 'Sonu Gupta', parentGroup: 'Capital Account', category: 'liability' },
      { ledgerName: 'Nagesh Dantkale', parentGroup: 'Capital Account', category: 'liability' },
      { ledgerName: 'Google India', parentGroup: 'Sundry Creditors', category: 'liability' },
      { ledgerName: 'Bibo Group Corporation', parentGroup: 'Sundry Creditors', category: 'liability' },
      { ledgerName: 'MSEDCL', parentGroup: 'Sundry Creditors', category: 'liability' },
      { ledgerName: 'Facebook India Online Services', parentGroup: 'Sundry Creditors', category: 'liability' },
      { ledgerName: 'JIO - Reliance Jio Infocomm Ltd', parentGroup: 'Sundry Creditors', category: 'liability' },
      // Income
      { ledgerName: 'Fees Received', parentGroup: 'Direct Incomes', category: 'income' },
      { ledgerName: 'Swar Yoga Level-1', parentGroup: 'Direct Incomes', category: 'income' },
      { ledgerName: 'Swar Yoga Level-3', parentGroup: 'Direct Incomes', category: 'income' },
      { ledgerName: 'Swar Yoga Level-1 Online Raipur', parentGroup: 'Direct Incomes', category: 'income' },
      { ledgerName: 'Bandhan Mukti Program', parentGroup: 'Direct Incomes', category: 'income' },
      // Expenses
      { ledgerName: 'Bank Charges', parentGroup: 'Indirect Expenses', category: 'expense' },
      { ledgerName: 'Audit Fees & Charges', parentGroup: 'Indirect Expenses', category: 'expense' },
      { ledgerName: 'Rent, Rates & Taxes', parentGroup: 'Indirect Expenses', category: 'expense' },
      { ledgerName: 'Professional Fees', parentGroup: 'Indirect Expenses', category: 'expense' },
      { ledgerName: 'Electricity Expenses', parentGroup: 'Indirect Expenses', category: 'expense' },
      { ledgerName: 'Advertisement Expenses', parentGroup: 'Indirect Expenses', category: 'expense' },
      { ledgerName: 'Mobile & Telephone Expenses', parentGroup: 'Indirect Expenses', category: 'expense' },
      { ledgerName: 'Travelling Expenses', parentGroup: 'Indirect Expenses', category: 'expense' },
      { ledgerName: 'ROC Fees & Charges', parentGroup: 'Indirect Expenses', category: 'expense' },
      { ledgerName: 'Incorporation Expenses', parentGroup: 'Indirect Expenses', category: 'expense' },
    ];

    // Filter out any ledgers already in the list
    const existing = new Set(manualEntries.map(e => e.ledgerName.toLowerCase()));
    const newLedgers = tallyLedgers.filter(l => !existing.has(l.ledgerName.toLowerCase()));
    if (newLedgers.length === 0) { alert('All Tally ledgers are already imported.'); return; }
    if (!confirm(`Import ${newLedgers.length} ledger accounts from Tally backup?\n(Amounts will be ₹0 — fill them in manually or via CSV)`)) return;

    const entries = newLedgers.map(l => ({ ...l, amount: 0, drCr: 'Dr', asOnDate: '', notes: 'From Tally backup' }));
    setManualLoading(true);
    try {
      const res = await fetch('/api/admin/crm/tally/manual-balances', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action: 'bulk-add', entries, financialYear: selectedFY }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Imported ${data.insertedCount || entries.length} Tally ledgers!`);
        fetchManualBalances();
      } else {
        alert('Import failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Import error: ' + err.message);
    } finally {
      setManualLoading(false);
    }
  };

  // ── Sync to MongoDB ──
  const runSync = useCallback(async () => {
    if (!token) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/crm/tally', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ action: 'sync', from: currentFY.from, to: currentFY.to }),
      });
      const data = await res.json();
      setSyncResult(data);
      // Refresh sync status too
      fetchSyncStatus();
    } catch (err: any) {
      setSyncResult({ success: false, error: err.message });
    } finally {
      setSyncing(false);
    }
  }, [token, headers, currentFY]);

  // ── Fetch sync status ──
  const fetchSyncStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/crm/tally?action=syncStatus', { headers: headers() });
      const data = await res.json();
      if (data.success) {
        setLastSync(data.lastSync);
        setSyncCounts(data.counts);
      }
    } catch { /* ignore */ }
  }, [token, headers]);

  // ── Initial load ──
  useEffect(() => {
    if (token) {
      fetchDashboard();
      fetchSyncStatus();
      fetchManualBalances();
      fetchVoucherStats();
    }
  }, [token, fetchDashboard, fetchSyncStatus, fetchManualBalances, fetchVoucherStats]);

  // ── Tab / FY / Month change handler ──
  useEffect(() => {
    if (!token) return;
    const fy = viewMode === 'monthly' ? effectiveDateRange : (FY_OPTIONS.find(f => f.value === selectedFY) || FY_OPTIONS[0]);
    switch (activeTab) {
      case 'dashboard': fetchDashboard(fy); fetchVoucherStats(); break;
      case 'sales': fetchVoucherData('Sales', fy); fetchManualVouchers('Sales'); break;
      case 'receipts': fetchVoucherData('Receipt', fy); fetchManualVouchers('Receipt'); break;
      case 'purchases': fetchVoucherData('Purchase', fy); fetchManualVouchers('Purchase'); break;
      case 'ledgers': fetchLedgerData(ledgerGroup || undefined); break;
      case 'stock': fetchStock(); break;
      case 'daybook': fetchDaybook(fy); fetchManualVouchers('all'); break;
      case 'profitloss': fetchPL(fy); break;
      case 'balancesheet': fetchBS(fy); break;
      case 'opening': fetchManualBalances(); break;
      case 'caaudit': fetchReceiptFiles(); fetchManualVouchers('all'); fetchManualBalances(); break;
      case 'settings': testConnection(); break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedFY, viewMode, selectedMonth, token]);

  // ── Filter vouchers by month (when monthly mode) ──
  const monthFilterVoucher = (v: { date: string }) => {
    if (viewMode !== 'monthly') return true;
    const { isoFrom, isoTo } = getMonthDateRange(selectedMonth);
    // Manual vouchers date: YYYY-MM-DD, Tally vouchers: YYYYMMDD
    const d = v.date?.includes('-') ? v.date : `${v.date?.slice(0,4)}-${v.date?.slice(4,6)}-${v.date?.slice(6,8)}`;
    return d >= isoFrom && d <= isoTo;
  };

  // ── Filtered data ──
  const filteredVouchers = vouchers.filter(v =>
    monthFilterVoucher(v) &&
    (!searchQuery ||
      v.partyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.voucherNumber?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredLedgers = ledgers.filter(l =>
    !searchQuery ||
    l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.parent?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStock = stockItems.filter(s =>
    !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredManualVouchers = manualVouchers.filter(v =>
    monthFilterVoucher(v) &&
    (!searchQuery ||
      v.partyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.voucherNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.narration?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── Send AI chat message ──
  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || !token || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const res = await fetch('/api/admin/crm/tally/chat', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          message: userMsg,
          history: chatMessages.slice(-10),
          fy: { from: currentFY.from, to: currentFY.to },
        }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.error || 'No response' }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + err.message }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, token, chatLoading, chatMessages, headers, currentFY]);

  // ── Tab config ──
  const allTabs: { key: ActiveTab; label: string; icon: any; toggle?: boolean }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { key: 'sales', label: 'Sales', icon: ArrowUpRight, toggle: true },
    { key: 'receipts', label: 'Receipts', icon: ArrowDownLeft },
    { key: 'purchases', label: 'Purchases', icon: Package, toggle: true },
    { key: 'ledgers', label: 'Ledgers', icon: Users },
    { key: 'stock', label: 'Stock', icon: Package },
    { key: 'daybook', label: 'Day Book', icon: Calendar },
    { key: 'profitloss', label: 'P&L', icon: TrendingUp },
    { key: 'balancesheet', label: 'Balance Sheet', icon: Scale },
    { key: 'opening', label: 'Opening Bal.', icon: ClipboardList },
    { key: 'caaudit', label: 'CA Audit', icon: Paperclip },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  const tabs = allTabs.filter(t => {
    if (t.key === 'sales') return showSales;
    if (t.key === 'purchases') return showPurchases;
    return true;
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">Please login to access Tally</p>
          <button onClick={() => router.push('/admin/login')} className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700">
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur border-b border-gray-800 p-4 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 hover:bg-gray-800 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <button onClick={() => router.push('/admin/crm')} className="p-2 hover:bg-gray-800 rounded-lg" title="Back to CRM">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-yellow-500" />
            <h1 className="text-xl font-bold text-white">Tally Prime</h1>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {connected === true && <Wifi className="w-4 h-4 text-green-400" />}
            {connected === false && <WifiOff className="w-4 h-4 text-red-400" />}
            {connected === null && <div className="w-4 h-4 rounded-full bg-gray-600 animate-pulse" />}
            <span className={`text-xs ${connected ? 'text-green-400' : connected === false ? 'text-red-400' : 'text-gray-500'}`}>
              {connected ? 'Connected' : connected === false ? 'Disconnected' : 'Checking...'}
            </span>
          </div>
          <div className="flex-1" />
          {/* Monthly/Yearly Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'yearly' ? 'monthly' : 'yearly')}
              className={`relative inline-flex h-7 w-[52px] items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 ${viewMode === 'monthly' ? 'bg-yellow-600' : 'bg-gray-700'}`}
              title={viewMode === 'monthly' ? 'Switch to Yearly' : 'Switch to Monthly'}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${viewMode === 'monthly' ? 'translate-x-[26px]' : 'translate-x-[3px]'}`} />
            </button>
            <span className="text-xs font-medium text-gray-300 min-w-[50px]">
              {viewMode === 'monthly' ? 'Monthly' : 'Yearly'}
            </span>
          </div>
          {/* Month Selector (visible in monthly mode) */}
          {viewMode === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 bg-cyan-600/20 border border-cyan-600/50 text-cyan-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
            >
              {MONTH_NAMES.map((m, i) => {
                const yr = i < 9 ? selectedFY.split('-')[0] : '20' + selectedFY.split('-')[1];
                return (
                  <option key={i} value={i} className="bg-gray-900 text-white">
                    {m} {yr}
                  </option>
                );
              })}
            </select>
          )}
          {/* FY Selector */}
          <select
            value={selectedFY}
            onChange={e => setSelectedFY(e.target.value)}
            className="px-3 py-2 bg-yellow-600/20 border border-yellow-600/50 text-yellow-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-500/50 cursor-pointer"
          >
            {FY_OPTIONS.map(fy => (
              <option key={fy.value} value={fy.value} className="bg-gray-900 text-white">
                {fy.label}
              </option>
            ))}
          </select>
          {selectedFY !== FY_OPTIONS[0].value && (
            <button
              onClick={carryForwardBalances}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-700/30 hover:bg-purple-700/50 border border-purple-600/50 text-purple-300 rounded-lg text-sm font-medium"
              title={`Carry forward closing balances from previous FY → ${selectedFY}`}
            >
              <Database className="w-3.5 h-3.5" /> Carry Forward
            </button>
          )}
          <button
            onClick={() => { setActiveTab('dashboard'); fetchDashboard(); }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-800 overflow-x-auto">
          <div className="flex px-4 gap-1 min-w-max">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setSearchQuery(''); }}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap
                    ${isActive
                      ? 'border-yellow-500 text-yellow-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {/* Error banner */}
          {error && (
            <div className="mb-4 p-4 bg-red-900/40 border border-red-700 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* ════════ DASHBOARD TAB ════════ */}
          {activeTab === 'dashboard' && (
            <>
              {loading && !summary ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />
                </div>
              ) : summary ? (
                <>
                  {/* Company info */}
                  {summary.company && (
                    <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-xl flex items-center gap-4">
                      <Building2 className="w-10 h-10 text-yellow-500 flex-shrink-0" />
                      <div>
                        <h2 className="text-lg font-bold text-green-400">{summary.company.name}</h2>
                        {summary.company.formalName && summary.company.formalName !== summary.company.name && (
                          <p className="text-sm text-white">{summary.company.formalName}</p>
                        )}
                        {summary.company.state && <p className="text-xs text-gray-500">{summary.company.state}</p>}
                        {summary.company.financialYearFrom && (
                          <p className="text-xs text-gray-500 mt-1">
                            FY: {summary.company.financialYearFrom} — {summary.company.financialYearTo}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bank Statement Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <StatCard label="Opening Balance" value={fmt(bankSummary?.openingBalance || 0)} sub="Dr" icon={Building2} color="text-purple-400" bg="bg-purple-500/10" />
                    <StatCard label="Total Deposit Amt" value={fmt(bankSummary?.totalDeposits || 0)} sub={`${bankSummary?.depositCount || 0} Cr entries`} icon={ArrowDownLeft} color="text-green-400" bg="bg-green-500/10" />
                    <StatCard label="Total Withdrawal Amt" value={fmt(bankSummary?.totalWithdrawals || 0)} sub={`${bankSummary?.withdrawalCount || 0} Dr entries`} icon={ArrowUpRight} color="text-red-400" bg="bg-red-500/10" />
                    <StatCard label="Closing Balance" value={fmt(bankSummary?.closingBalance || 0)} sub="Dr" icon={Wallet} color="text-blue-400" bg="bg-blue-500/10" />
                    <div className={`p-4 rounded-xl border border-gray-800 ${dashProfitLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className={`w-5 h-5 ${dashProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-xs text-gray-400 font-medium">{dashProfitLoss >= 0 ? 'Profit' : 'Loss'}</span>
                      </div>
                      <p className={`text-xl font-bold ${dashProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(Math.abs(dashProfitLoss))}</p>
                      <p className="text-xs text-gray-500 mt-1">Deposits - Withdrawals</p>
                    </div>
                    <StatCard label="Participants" value={String(dashParticipants)} sub="registered users" icon={Users} color="text-yellow-400" bg="bg-yellow-500/10" />
                  </div>

                  {/* Recent tables */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <RecentTable title="Recent Deposits" vouchers={summary.recentReceipts} color="text-green-400" />
                    <RecentTable title="Recent Withdrawals" vouchers={dashRecentPayments} color="text-red-400" />
                  </div>

                  {/* ── Auto-Sync Panel ── */}
                  <div className="mt-6 p-5 bg-gray-900 border border-gray-800 rounded-xl">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-base font-semibold text-gray-200 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-yellow-500" />
                          Auto-Sync to Database
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Pull customers, invoices & payments from Tally and save to MongoDB for offline access.
                        </p>
                      </div>
                      <button
                        onClick={runSync}
                        disabled={syncing}
                        className="flex items-center gap-2 px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-black disabled:text-gray-400 font-medium rounded-lg text-sm transition"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : `Sync ${currentFY.label}`}
                      </button>
                    </div>

                    {/* Sync counts */}
                    {syncCounts && (
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                          <p className="text-lg font-bold text-blue-400">{syncCounts.customers}</p>
                          <p className="text-xs text-gray-500">Customers</p>
                        </div>
                        <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                          <p className="text-lg font-bold text-green-400">{syncCounts.invoices}</p>
                          <p className="text-xs text-gray-500">Invoices</p>
                        </div>
                        <div className="p-3 bg-gray-800/50 rounded-lg text-center">
                          <p className="text-lg font-bold text-purple-400">{syncCounts.payments}</p>
                          <p className="text-xs text-gray-500">Payments</p>
                        </div>
                      </div>
                    )}

                    {/* Last sync info */}
                    {lastSync && (
                      <div className="text-xs text-gray-500 flex flex-wrap items-center gap-3">
                        <span>Last sync: <span className="text-gray-300">{new Date(lastSync.syncedAt).toLocaleString('en-IN')}</span></span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${lastSync.status === 'success' ? 'bg-green-500/20 text-green-400' : lastSync.status === 'partial' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                          {lastSync.status}
                        </span>
                        <span>{lastSync.totalSucceeded}/{lastSync.totalProcessed} records</span>
                        {lastSync.duration > 0 && <span>{(lastSync.duration / 1000).toFixed(1)}s</span>}
                      </div>
                    )}

                    {/* Sync result (just completed) */}
                    {syncResult && (
                      <div className={`mt-3 p-3 rounded-lg border text-sm ${syncResult.success ? (syncResult.status === 'success' ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-yellow-900/30 border-yellow-700 text-yellow-300') : 'bg-red-900/30 border-red-700 text-red-300'}`}>
                        {syncResult.success ? (
                          <div>
                            <p className="font-medium">
                              Sync {syncResult.status === 'success' ? 'completed' : 'completed with errors'} — {syncResult.totalSucceeded} of {syncResult.totalProcessed} records
                            </p>
                            <div className="mt-1 text-xs opacity-75">
                              Customers: {syncResult.customers?.succeeded || 0} • 
                              Invoices: {syncResult.invoices?.succeeded || 0} • 
                              Payments: {syncResult.payments?.succeeded || 0}
                              {syncResult.duration > 0 && ` • ${(syncResult.duration / 1000).toFixed(1)}s`}
                            </div>
                          </div>
                        ) : (
                          <p>{syncResult.error || 'Sync failed'}</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  {/* Loading / No summary available */}
                  <div className="p-4 bg-yellow-500/5 border border-yellow-800/40 rounded-xl flex items-start gap-3">
                    <WifiOff className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-400">Loading Data...</p>
                      <p className="text-xs text-gray-500 mt-1">Fetching {currentFY.label} accounting data from database.</p>
                    </div>
                  </div>

                  {/* Quick stats from bankSummary or manualVoucherStats if available */}
                  {(bankSummary || Object.keys(manualVoucherStats).length > 0) && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      <StatCard label="Opening Balance" value={fmt(bankSummary?.openingBalance || 0)} sub="Dr" icon={Building2} color="text-purple-400" bg="bg-purple-500/10" />
                      <StatCard label="Total Deposit Amt" value={fmt(bankSummary?.totalDeposits || 0)} sub={`${bankSummary?.depositCount || 0} Cr entries`} icon={ArrowDownLeft} color="text-green-400" bg="bg-green-500/10" />
                      <StatCard label="Total Withdrawal Amt" value={fmt(bankSummary?.totalWithdrawals || 0)} sub={`${bankSummary?.withdrawalCount || 0} Dr entries`} icon={ArrowUpRight} color="text-red-400" bg="bg-red-500/10" />
                      <StatCard label="Closing Balance" value={fmt(bankSummary?.closingBalance || 0)} sub="Dr" icon={Wallet} color="text-blue-400" bg="bg-blue-500/10" />
                      <div className={`p-4 rounded-xl border border-gray-800 ${dashProfitLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className={`w-5 h-5 ${dashProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                          <span className="text-xs text-gray-400 font-medium">{dashProfitLoss >= 0 ? 'Profit' : 'Loss'}</span>
                        </div>
                        <p className={`text-xl font-bold ${dashProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(Math.abs(dashProfitLoss))}</p>
                        <p className="text-xs text-gray-500 mt-1">Income - Expenses</p>
                      </div>
                      <StatCard label="Participants" value={String(dashParticipants)} sub="registered users" icon={Users} color="text-yellow-400" bg="bg-yellow-500/10" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ════════ VOUCHER TABS (Sales/Receipts/Purchases/Daybook) ════════ */}
          {(activeTab === 'sales' || activeTab === 'receipts' || activeTab === 'purchases' || activeTab === 'daybook') && (
            <>
              {/* Monthly indicator */}
              {viewMode === 'monthly' && (
                <div className="mb-3 px-4 py-2 bg-cyan-600/10 border border-cyan-700/30 rounded-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-300">Showing: {monthLabel}</span>
                  <span className="text-xs text-gray-500">({filteredVouchers.length + filteredManualVouchers.length} entries)</span>
                </div>
              )}
              {/* Header with search + Add button */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by party name or voucher #..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                </div>
                <span className="text-sm text-gray-500">
                  {filteredVouchers.length > 0 ? `${filteredVouchers.length} from Tally` : ''}
                  {filteredVouchers.length > 0 && filteredManualVouchers.length > 0 ? ' + ' : ''}
                  {filteredManualVouchers.length > 0 ? `${filteredManualVouchers.length} manual` : ''}
                  {filteredVouchers.length === 0 && filteredManualVouchers.length === 0 ? '0 records' : ''}
                </span>
                <button
                  onClick={() => {
                    const vType = activeTab === 'receipts' ? 'Receipt' : activeTab === 'sales' ? 'Sales' : activeTab === 'purchases' ? 'Purchase' : 'Receipt';
                    setShowVoucherForm(true);
                    setEditingVoucherId(null);
                    setVoucherFormData({ voucherType: vType, voucherNumber: '', date: new Date().toISOString().slice(0, 10), partyName: '', ledgerName: '', amount: '', narration: '', paymentMode: 'Bank' });
                  }}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" /> Add {activeTab === 'daybook' ? 'Entry' : activeTab === 'receipts' ? 'Receipt' : activeTab === 'sales' ? 'Sale' : 'Purchase'}
                </button>
                {activeTab === 'receipts' && (filteredVouchers.length > 0 || filteredManualVouchers.length > 0) && (
                  <button
                    onClick={() => printReport('receipts')}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg flex items-center gap-2 text-sm"
                  >
                    <FileText className="w-4 h-4" /> Print
                  </button>
                )}
              </div>

              {/* Add / Edit Voucher Form */}
              {showVoucherForm && (
                <div className="mb-6 p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-200">{editingVoucherId ? 'Edit Voucher' : 'Add New Voucher'}</h3>
                    <button onClick={() => { setShowVoucherForm(false); setEditingVoucherId(null); }} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {activeTab === 'daybook' && (
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Type</label>
                        <select value={voucherFormData.voucherType} onChange={e => setVoucherFormData(p => ({ ...p, voucherType: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200">
                          <option value="Receipt">Receipt</option>
                          <option value="Payment">Payment</option>
                          <option value="Journal">Journal</option>
                          <option value="Sales">Sales</option>
                          <option value="Purchase">Purchase</option>
                          <option value="Contra">Contra</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Date *</label>
                      <input type="date" value={voucherFormData.date} onChange={e => setVoucherFormData(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Party Name *</label>
                      <input type="text" value={voucherFormData.partyName} onChange={e => setVoucherFormData(p => ({ ...p, partyName: e.target.value }))} placeholder="e.g. Mohan Kalburgi" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600" list="partyNames" />
                      <datalist id="partyNames">
                        {manualEntries.map((e, i) => <option key={i} value={e.ledgerName} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Amount (₹) *</label>
                      <input type="number" value={voucherFormData.amount} onChange={e => setVoucherFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Account Head</label>
                      <input type="text" value={voucherFormData.ledgerName} onChange={e => setVoucherFormData(p => ({ ...p, ledgerName: e.target.value }))} placeholder="e.g. Fees Received" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600" list="ledgerNames" />
                      <datalist id="ledgerNames">
                        {manualEntries.map((e, i) => <option key={i} value={e.ledgerName} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Payment Mode</label>
                      <select value={voucherFormData.paymentMode} onChange={e => setVoucherFormData(p => ({ ...p, paymentMode: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200">
                        <option value="Bank">Bank Transfer</option>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Card">Card</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Voucher No</label>
                      <input type="text" value={voucherFormData.voucherNumber} onChange={e => setVoucherFormData(p => ({ ...p, voucherNumber: e.target.value }))} placeholder="Auto-generated" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Narration</label>
                      <input type="text" value={voucherFormData.narration} onChange={e => setVoucherFormData(p => ({ ...p, narration: e.target.value }))} placeholder="Description / notes" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setShowVoucherForm(false); setEditingVoucherId(null); }} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">Cancel</button>
                    <button onClick={saveManualVoucher} disabled={voucherLoading || !voucherFormData.date || !voucherFormData.partyName || !voucherFormData.amount} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-black font-medium rounded-lg text-sm flex items-center gap-2">
                      <Save className="w-4 h-4" /> {editingVoucherId ? 'Update' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {loading && !voucherLoading ? (
                <LoadingSkeleton />
              ) : (filteredVouchers.length === 0 && filteredManualVouchers.length === 0) ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No {activeTab} entries yet.</p>
                  <button
                    onClick={() => {
                      const vType = activeTab === 'receipts' ? 'Receipt' : activeTab === 'sales' ? 'Sales' : activeTab === 'purchases' ? 'Purchase' : 'Receipt';
                      setShowVoucherForm(true);
                      setEditingVoucherId(null);
                      setVoucherFormData({ voucherType: vType, voucherNumber: '', date: new Date().toISOString().slice(0, 10), partyName: '', ledgerName: '', amount: '', narration: '', paymentMode: 'Bank' });
                    }}
                    className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add First {activeTab === 'receipts' ? 'Receipt' : activeTab === 'sales' ? 'Sale' : activeTab === 'purchases' ? 'Purchase' : 'Entry'}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto border border-gray-800 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900/60">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">#</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Voucher No</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Party</th>
                        {activeTab === 'daybook' && <th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th>}
                        <th className="text-right px-4 py-3 text-gray-400 font-medium">Amount</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Narration</th>
                        <th className="text-center px-4 py-3 text-gray-400 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {/* Tally vouchers (read-only) */}
                      {filteredVouchers.map((v, i) => (
                        <tr key={`tally-${v.voucherNumber}-${i}`} className="hover:bg-gray-900/40 transition">
                          <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 font-mono text-gray-200">{v.voucherNumber || '-'}</td>
                          <td className="px-4 py-3 text-gray-400">{tallyDateToDisplay(v.date)}</td>
                          <td className="px-4 py-3 text-gray-200 max-w-[200px] truncate">{v.partyName || '-'}</td>
                          {activeTab === 'daybook' && (
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300">{v.voucherType}</span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-right font-medium text-gray-200">{fmt(v.amount)}</td>
                          <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{v.narration || '-'}</td>
                          <td className="px-4 py-3 text-center text-[10px] text-gray-600">Tally</td>
                        </tr>
                      ))}
                      {/* Manual vouchers (editable) */}
                      {filteredManualVouchers.map((v, i) => (
                        <tr key={`manual-${v._id}`} className="hover:bg-gray-900/40 transition bg-yellow-500/[0.03]">
                          <td className="px-4 py-3 text-gray-500">{filteredVouchers.length + i + 1}</td>
                          <td className="px-4 py-3 font-mono text-yellow-400/80">{v.voucherNumber || '-'}</td>
                          <td className="px-4 py-3 text-gray-400">{v.date || '-'}</td>
                          <td className="px-4 py-3 text-gray-200 max-w-[200px] truncate">{v.partyName || '-'}</td>
                          {activeTab === 'daybook' && (
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-900/40 text-yellow-400">{v.voucherType}</span>
                            </td>
                          )}
                          <td className="px-4 py-3 text-right font-medium text-gray-200">{fmt(v.amount)}</td>
                          <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">{v.narration || '-'}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => startEditVoucher(v)} className="p-1 text-gray-500 hover:text-yellow-400" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteManualVoucher(v._id)} className="p-1 text-gray-500 hover:text-red-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-900/60">
                      <tr>
                        <td colSpan={activeTab === 'daybook' ? 5 : 4} className="px-4 py-3 text-right font-bold text-gray-300">Total:</td>
                        <td className="px-4 py-3 text-right font-bold text-yellow-400">{fmt(filteredVouchers.reduce((s, v) => s + v.amount, 0) + filteredManualVouchers.reduce((s, v) => s + v.amount, 0))}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ════════ LEDGERS TAB ════════ */}
          {activeTab === 'ledgers' && (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search ledgers..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                </div>
                <select
                  value={ledgerGroup}
                  onChange={e => { setLedgerGroup(e.target.value); fetchLedgerData(e.target.value || undefined); }}
                  className="px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                >
                  <option value="">All Groups</option>
                  <option value="Sundry Debtors">Sundry Debtors</option>
                  <option value="Sundry Creditors">Sundry Creditors</option>
                  <option value="Bank Accounts">Bank Accounts</option>
                  <option value="Cash-in-Hand">Cash-in-Hand</option>
                  <option value="Capital Account">Capital Account</option>
                  <option value="Fixed Assets">Fixed Assets</option>
                  <option value="Direct Incomes">Direct Incomes</option>
                  <option value="Indirect Expenses">Indirect Expenses</option>
                  <option value="Sales Accounts">Sales Accounts</option>
                  <option value="Purchase Accounts">Purchase Accounts</option>
                  <option value="Direct Expenses">Direct Expenses</option>
                </select>
                <span className="text-sm text-gray-500">{filteredLedgers.length > 0 ? `${filteredLedgers.length} from Tally` : `${manualEntries.filter(e => !ledgerGroup || e.parentGroup === ledgerGroup).filter(e => !searchQuery || e.ledgerName.toLowerCase().includes(searchQuery.toLowerCase())).length} ledgers`}</span>
                <button
                  onClick={() => setActiveTab('opening')}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" /> Add Ledger
                </button>
              </div>

              {loading ? (
                <LoadingSkeleton />
              ) : filteredLedgers.length > 0 ? (
                <div className="overflow-x-auto border border-gray-800 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900/60">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">#</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Ledger Name</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Group</th>
                        <th className="text-right px-4 py-3 text-gray-400 font-medium">Opening Bal</th>
                        <th className="text-right px-4 py-3 text-gray-400 font-medium">Closing Bal</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {filteredLedgers.map((l, i) => (
                        <tr key={`${l.name}-${i}`} className="hover:bg-gray-900/40 transition">
                          <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 text-gray-200 font-medium">{l.name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300">{l.parent}</span>
                          </td>
                          <td className={`px-4 py-3 text-right ${l.openingBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {fmt(Math.abs(l.openingBalance))} {l.openingBalance < 0 ? 'Cr' : 'Dr'}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${l.closingBalance < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {fmt(Math.abs(l.closingBalance))} {l.closingBalance < 0 ? 'Cr' : 'Dr'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {l.phone || l.email || l.gstin || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : manualEntries.length > 0 ? (
                /* Show manual balance entries as ledger list */
                <div className="overflow-x-auto border border-gray-800 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900/60">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">#</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Ledger Name</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Group</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Category</th>
                        <th className="text-right px-4 py-3 text-gray-400 font-medium">Balance</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Dr/Cr</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {manualEntries
                        .filter(e => !ledgerGroup || e.parentGroup === ledgerGroup)
                        .filter(e => !searchQuery || e.ledgerName.toLowerCase().includes(searchQuery.toLowerCase()) || e.parentGroup.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((e, i) => (
                        <tr key={e._id} className="hover:bg-gray-900/40 transition">
                          <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 text-gray-200 font-medium">{e.ledgerName}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300">{e.parentGroup}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${e.category === 'asset' ? 'bg-blue-900/40 text-blue-400' : e.category === 'liability' ? 'bg-purple-900/40 text-purple-400' : e.category === 'income' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>{e.category}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-200">{fmt(e.amount)}</td>
                          <td className="px-4 py-3 text-gray-400">{e.drCr}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No ledgers found.</p>
                  <button onClick={() => setActiveTab('opening')} className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add Ledgers via Opening Balances
                  </button>
                </div>
              )}
            </>
          )}

          {/* ════════ STOCK TAB ════════ */}
          {activeTab === 'stock' && (
            <>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search stock items..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                </div>
                <span className="text-sm text-gray-500">{filteredStock.length} items</span>
              </div>

              {loading ? (
                <LoadingSkeleton />
              ) : filteredStock.length === 0 ? (
                <EmptyState message="No stock items found." />
              ) : (
                <div className="overflow-x-auto border border-gray-800 rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-900/60">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">#</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Item Name</th>
                        <th className="text-left px-4 py-3 text-gray-400 font-medium">Group</th>
                        <th className="text-right px-4 py-3 text-gray-400 font-medium">Qty</th>
                        <th className="text-right px-4 py-3 text-gray-400 font-medium">Rate</th>
                        <th className="text-right px-4 py-3 text-gray-400 font-medium">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {filteredStock.map((s, i) => (
                        <tr key={`${s.name}-${i}`} className="hover:bg-gray-900/40 transition">
                          <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                          <td className="px-4 py-3 text-gray-200 font-medium">{s.name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300">{s.parent}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-300">{s.closingBalance} {s.unit || ''}</td>
                          <td className="px-4 py-3 text-right text-gray-300">{fmt(s.closingRate)}</td>
                          <td className="px-4 py-3 text-right font-medium text-yellow-400">{fmt(s.closingValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-900/60">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 text-right font-bold text-gray-300">Total Stock Value:</td>
                        <td className="px-4 py-3 text-right font-bold text-yellow-400">{fmt(filteredStock.reduce((s, item) => s + item.closingValue, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ════════ PROFIT & LOSS TAB ════════ */}
          {activeTab === 'profitloss' && (
            <>
              {/* Monthly indicator */}
              {viewMode === 'monthly' && (
                <div className="mb-4 px-4 py-2 bg-cyan-600/10 border border-cyan-700/30 rounded-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-300">P&L for: {monthLabel}</span>
                </div>
              )}
              {loading && !plData ? (
                <LoadingSkeleton />
              ) : plData ? (
                <div className="space-y-6">
                  {/* Print button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => printReport('pl')}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg flex items-center gap-2 text-sm"
                    >
                      <FileText className="w-4 h-4" /> Print / Download PDF
                    </button>
                  </div>
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl border border-gray-800 bg-green-500/10">
                      <p className="text-xs text-gray-400 mb-1">Total Income</p>
                      <p className="text-2xl font-bold text-green-400">{fmt(plData.totalIncome)}</p>
                    </div>
                    <div className="p-5 rounded-xl border border-gray-800 bg-red-500/10">
                      <p className="text-xs text-gray-400 mb-1">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-400">{fmt(plData.totalExpenses)}</p>
                    </div>
                    <div className={`p-5 rounded-xl border border-gray-800 ${plData.netProfit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      <p className="text-xs text-gray-400 mb-1">{plData.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}</p>
                      <p className={`text-2xl font-bold ${plData.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(Math.abs(plData.netProfit))}</p>
                    </div>
                  </div>

                  {/* Income and Expenses side by side */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Income */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="font-bold text-green-400 flex items-center gap-2"><ArrowDownLeft className="w-4 h-4" /> Income</h3>
                        <span className="text-sm font-bold text-green-400">{fmt(plData.totalIncome)}</span>
                      </div>
                      <div className="divide-y divide-gray-800/40">
                        {plData.income.length === 0 ? (
                          <p className="p-4 text-sm text-gray-500">No income data</p>
                        ) : plData.income.map((g, i) => (
                          <PLGroupRow key={i} group={g} color="text-green-400" />
                        ))}
                      </div>
                    </div>

                    {/* Expenses */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="font-bold text-red-400 flex items-center gap-2"><ArrowUpRight className="w-4 h-4" /> Expenses</h3>
                        <span className="text-sm font-bold text-red-400">{fmt(plData.totalExpenses)}</span>
                      </div>
                      <div className="divide-y divide-gray-800/40">
                        {plData.expenses.length === 0 ? (
                          <p className="p-4 text-sm text-gray-500">No expense data</p>
                        ) : plData.expenses.map((g, i) => (
                          <PLGroupRow key={i} group={g} color="text-red-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No P&L data. Add income/expense entries manually.</p>
                  <button onClick={() => setActiveTab('opening')} className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg inline-flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> Add Opening Balances
                  </button>
                </div>
              )}
            </>
          )}

          {/* ════════ BALANCE SHEET TAB ════════ */}
          {activeTab === 'balancesheet' && (
            <>
              {/* Monthly indicator */}
              {viewMode === 'monthly' && (
                <div className="mb-4 px-4 py-2 bg-cyan-600/10 border border-cyan-700/30 rounded-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-300">Balance Sheet as of: {monthLabel}</span>
                </div>
              )}
              {loading && !bsData ? (
                <LoadingSkeleton />
              ) : bsData ? (
                <div className="space-y-6">
                  {/* Print button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => printReport('bs')}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg flex items-center gap-2 text-sm"
                    >
                      <FileText className="w-4 h-4" /> Print / Download PDF
                    </button>
                  </div>
                  {/* Summary cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl border border-gray-800 bg-blue-500/10">
                      <p className="text-xs text-gray-400 mb-1">Total Assets</p>
                      <p className="text-2xl font-bold text-blue-400">{fmt(bsData.totalAssets)}</p>
                    </div>
                    <div className="p-5 rounded-xl border border-gray-800 bg-purple-500/10">
                      <p className="text-xs text-gray-400 mb-1">Total Liabilities</p>
                      <p className="text-2xl font-bold text-purple-400">{fmt(bsData.totalLiabilities)}</p>
                    </div>
                    <div className={`p-5 rounded-xl border border-gray-800 ${Math.abs(bsData.difference) < 1 ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                      <p className="text-xs text-gray-400 mb-1">Difference</p>
                      <p className={`text-2xl font-bold ${Math.abs(bsData.difference) < 1 ? 'text-green-400' : 'text-yellow-400'}`}>{fmt(Math.abs(bsData.difference))}</p>
                      {Math.abs(bsData.difference) < 1 && <p className="text-xs text-green-500 mt-1">Balanced</p>}
                    </div>
                  </div>

                  {/* Assets and Liabilities side by side */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Assets */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="font-bold text-blue-400 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Assets</h3>
                        <span className="text-sm font-bold text-blue-400">{fmt(bsData.totalAssets)}</span>
                      </div>
                      <div className="divide-y divide-gray-800/40">
                        {bsData.assets.length === 0 ? (
                          <p className="p-4 text-sm text-gray-500">No asset data</p>
                        ) : bsData.assets.map((g, i) => (
                          <PLGroupRow key={i} group={g} color="text-blue-400" />
                        ))}
                      </div>
                    </div>

                    {/* Liabilities */}
                    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="font-bold text-purple-400 flex items-center gap-2"><Scale className="w-4 h-4" /> Liabilities & Capital</h3>
                        <span className="text-sm font-bold text-purple-400">{fmt(bsData.totalLiabilities)}</span>
                      </div>
                      <div className="divide-y divide-gray-800/40">
                        {bsData.liabilities.length === 0 ? (
                          <p className="p-4 text-sm text-gray-500">No liability data</p>
                        ) : bsData.liabilities.map((g, i) => (
                          <PLGroupRow key={i} group={g} color="text-purple-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No Balance Sheet data from Tally.</p>
                  <button onClick={() => setActiveTab('opening')} className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg inline-flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> Add Opening Balances Manually
                  </button>
                </div>
              )}
            </>
          )}

          {/* ════════ OPENING BALANCES TAB ════════ */}
          {activeTab === 'opening' && (
            <div className="space-y-6">
              {/* Hidden CSV file input */}
              <input ref={csvFileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />

              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-yellow-500" /> Opening Balances
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Manually enter balances from your CA Balance Sheet report for {currentFY.label}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleTallyBackupImport}
                    disabled={manualLoading}
                    className="px-3 py-2 bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                    title="Import ledger names from Tally backup"
                  >
                    <Database className="w-3.5 h-3.5" /> Tally Import
                  </button>
                  <button
                    onClick={() => exportTallyXml('all')}
                    disabled={manualEntries.length === 0}
                    className="px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                    title="Export all data as Tally Prime XML for import"
                  >
                    <Download className="w-3.5 h-3.5" /> Export for Tally
                  </button>
                  <button
                    onClick={() => csvFileInputRef.current?.click()}
                    disabled={manualLoading}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                    title="Upload entries from CSV file"
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload CSV
                  </button>
                  <button
                    onClick={handleCSVDownload}
                    disabled={manualEntries.length === 0}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                    title="Download entries as CSV"
                  >
                    <Download className="w-3.5 h-3.5" /> Download CSV
                  </button>
                  <button
                    onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ ledgerName: '', parentGroup: '', category: 'asset', amount: '', drCr: 'Dr', asOnDate: '', notes: '' }); }}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" /> Add Entry
                  </button>
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl border border-gray-800 bg-blue-500/10">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Assets</p>
                  <p className="text-lg font-bold text-blue-400">{fmt(manualTotals.totalAssets)}</p>
                  <p className="text-[10px] text-gray-600">{manualEntries.filter(e => e.category === 'asset').length} entries</p>
                </div>
                <div className="p-4 rounded-xl border border-gray-800 bg-purple-500/10">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Liabilities</p>
                  <p className="text-lg font-bold text-purple-400">{fmt(manualTotals.totalLiabilities)}</p>
                  <p className="text-[10px] text-gray-600">{manualEntries.filter(e => e.category === 'liability').length} entries</p>
                </div>
                <div className="p-4 rounded-xl border border-gray-800 bg-green-500/10">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Income</p>
                  <p className="text-lg font-bold text-green-400">{fmt(manualTotals.totalIncome)}</p>
                  <p className="text-[10px] text-gray-600">{manualEntries.filter(e => e.category === 'income').length} entries</p>
                </div>
                <div className="p-4 rounded-xl border border-gray-800 bg-red-500/10">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500">Expenses</p>
                  <p className="text-lg font-bold text-red-400">{fmt(manualTotals.totalExpenses)}</p>
                  <p className="text-[10px] text-gray-600">{manualEntries.filter(e => e.category === 'expense').length} entries</p>
                </div>
              </div>

              {/* Add / Edit Form */}
              {showAddForm && (
                <div className="p-5 bg-gray-900 border border-yellow-800/50 rounded-xl space-y-4">
                  <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                    {editingId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingId ? 'Edit Entry' : 'Add New Entry'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Ledger Name */}
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 block mb-1">Ledger / Account Name *</label>
                      <input type="text" value={formData.ledgerName} onChange={e => setFormData(f => ({ ...f, ledgerName: e.target.value }))}
                        placeholder="e.g. SBI Current A/c" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-yellow-500/50 focus:outline-none" />
                    </div>
                    {/* Parent Group */}
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 block mb-1">Group / Head *</label>
                      <input type="text" list="group-suggestions" value={formData.parentGroup} onChange={e => setFormData(f => ({ ...f, parentGroup: e.target.value }))}
                        placeholder="e.g. Bank Accounts" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-yellow-500/50 focus:outline-none" />
                      <datalist id="group-suggestions">
                        <option value="Bank Accounts" /><option value="Cash-in-Hand" /><option value="Sundry Debtors" />
                        <option value="Fixed Assets" /><option value="Investments" /><option value="Deposits (Asset)" />
                        <option value="Loans & Advances (Asset)" /><option value="Stock-in-Hand" />
                        <option value="Sundry Creditors" /><option value="Capital Account" /><option value="Reserves & Surplus" />
                        <option value="Secured Loans" /><option value="Unsecured Loans" /><option value="Current Liabilities" />
                        <option value="Duties & Taxes" /><option value="Provisions" />
                        <option value="Direct Incomes" /><option value="Indirect Incomes" /><option value="Sales Accounts" />
                        <option value="Direct Expenses" /><option value="Indirect Expenses" /><option value="Purchase Accounts" />
                      </datalist>
                    </div>
                    {/* Category */}
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 block mb-1">Category *</label>
                      <select value={formData.category} onChange={e => {
                        const cat = e.target.value;
                        setFormData(f => ({ ...f, category: cat, drCr: cat === 'asset' || cat === 'expense' ? 'Dr' : 'Cr' }));
                      }} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-yellow-500/50 focus:outline-none">
                        <option value="asset">Asset</option>
                        <option value="liability">Liability</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                      </select>
                    </div>
                    {/* Amount */}
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 block mb-1">Amount (₹) *</label>
                      <input type="number" value={formData.amount} onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
                        placeholder="0.00" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-yellow-500/50 focus:outline-none" />
                    </div>
                    {/* Dr/Cr */}
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 block mb-1">Dr / Cr</label>
                      <select value={formData.drCr} onChange={e => setFormData(f => ({ ...f, drCr: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-yellow-500/50 focus:outline-none">
                        <option value="Dr">Debit (Dr)</option>
                        <option value="Cr">Credit (Cr)</option>
                      </select>
                    </div>
                    {/* As On Date */}
                    <div>
                      <label className="text-[10px] uppercase text-gray-500 block mb-1">As On Date</label>
                      <input type="text" value={formData.asOnDate} onChange={e => setFormData(f => ({ ...f, asOnDate: e.target.value }))}
                        placeholder="31-03-2024" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-yellow-500/50 focus:outline-none" />
                    </div>
                  </div>
                  {/* Notes */}
                  <div>
                    <label className="text-[10px] uppercase text-gray-500 block mb-1">Notes (optional)</label>
                    <input type="text" value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Any remarks..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 focus:ring-2 focus:ring-yellow-500/50 focus:outline-none" />
                  </div>
                  {/* Buttons */}
                  <div className="flex items-center gap-3">
                    <button onClick={saveManualEntry} disabled={manualLoading || !formData.ledgerName || !formData.parentGroup || !formData.amount}
                      className="px-5 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-black font-medium rounded-lg flex items-center gap-2 text-sm">
                      <Save className="w-4 h-4" /> {editingId ? 'Update' : 'Save'}
                    </button>
                    <button onClick={() => { setShowAddForm(false); setEditingId(null); }} className="px-5 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Entries Table */}
              {manualLoading && manualEntries.length === 0 ? (
                <LoadingSkeleton />
              ) : manualEntries.length === 0 ? (
                <div className="text-center py-16">
                  <ClipboardList className="w-14 h-14 text-gray-700 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-400 mb-2">No Opening Balances Yet</h3>
                  <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                    Add your CA balance sheet entries here. Enter each account head with its closing balance as on 31st March.
                  </p>
                  <button onClick={() => setShowAddForm(true)} className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add First Entry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Group: Assets */}
                  {['asset', 'liability', 'income', 'expense'].map(cat => {
                    const catEntries = manualEntries.filter(e => e.category === cat);
                    if (catEntries.length === 0) return null;
                    const catColors: Record<string, string> = { asset: 'text-blue-400', liability: 'text-purple-400', income: 'text-green-400', expense: 'text-red-400' };
                    const catBgs: Record<string, string> = { asset: 'border-blue-800/30', liability: 'border-purple-800/30', income: 'border-green-800/30', expense: 'border-red-800/30' };
                    const catLabel: Record<string, string> = { asset: 'Assets', liability: 'Liabilities', income: 'Income', expense: 'Expenses' };
                    const catTotal = catEntries.reduce((s, e) => s + e.amount, 0);
                    return (
                      <div key={cat} className={`bg-gray-900 border ${catBgs[cat]} rounded-xl overflow-hidden`}>
                        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                          <h3 className={`font-bold ${catColors[cat]} text-sm`}>{catLabel[cat]}</h3>
                          <span className={`text-sm font-bold ${catColors[cat]}`}>{fmt(catTotal)}</span>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-800/50">
                              <th className="text-left px-4 py-2 text-gray-500 text-xs font-medium">Ledger</th>
                              <th className="text-left px-4 py-2 text-gray-500 text-xs font-medium">Group</th>
                              <th className="text-right px-4 py-2 text-gray-500 text-xs font-medium">Amount</th>
                              <th className="text-center px-4 py-2 text-gray-500 text-xs font-medium">Dr/Cr</th>
                              <th className="text-center px-2 py-2 text-gray-500 text-xs font-medium w-20">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800/30">
                            {catEntries.map((entry) => (
                              <tr key={entry._id} className="hover:bg-gray-800/20">
                                <td className="px-4 py-2.5 text-gray-200">{entry.ledgerName}</td>
                                <td className="px-4 py-2.5 text-gray-400 text-xs">{entry.parentGroup}</td>
                                <td className="px-4 py-2.5 text-right font-medium text-gray-200">{fmt(entry.amount)}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${entry.drCr === 'Dr' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{entry.drCr}</span>
                                </td>
                                <td className="px-2 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={() => startEdit(entry)} className="p-1 hover:bg-gray-700 rounded transition" title="Edit">
                                      <Edit3 className="w-3.5 h-3.5 text-gray-500 hover:text-yellow-400" />
                                    </button>
                                    <button onClick={() => deleteManualEntry(entry._id)} className="p-1 hover:bg-gray-700 rounded transition" title="Delete">
                                      <Trash2 className="w-3.5 h-3.5 text-gray-500 hover:text-red-400" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}

                  {/* Difference check */}
                  {(() => {
                    const diff = manualTotals.totalAssets - manualTotals.totalLiabilities;
                    return (
                      <div className={`p-4 rounded-xl border ${Math.abs(diff) < 1 ? 'bg-green-500/5 border-green-800/30' : 'bg-yellow-500/5 border-yellow-800/30'} flex items-center justify-between`}>
                        <div>
                          <p className="text-xs text-gray-500">Assets − Liabilities</p>
                          <p className={`text-lg font-bold ${Math.abs(diff) < 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {fmt(Math.abs(diff))} {diff > 0 ? '(Dr)' : diff < 0 ? '(Cr)' : ''}
                          </p>
                        </div>
                        {Math.abs(diff) < 1 ? (
                          <span className="text-xs text-green-500 bg-green-500/10 px-3 py-1 rounded-full">✓ Balanced</span>
                        ) : (
                          <span className="text-xs text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full">⚠ Not Balanced</span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ════════ CA AUDIT TAB ════════ */}
          {activeTab === 'caaudit' && (
            <div className="space-y-6">
              {/* Hidden file inputs */}
              <input ref={receiptFileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadReceiptFile(f);
                if (receiptFileInputRef.current) receiptFileInputRef.current.value = '';
              }} />
              <input ref={bulkReceiptInputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleBulkReceiptUpload} />

              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-yellow-500" /> CA Audit — Receipts & Reports
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Upload receipts, preview, and download data for {currentFY.label}. Share this page with your CA.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setShowUploadForm(!showUploadForm)} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg flex items-center gap-2 text-sm">
                    <Upload className="w-4 h-4" /> Upload Receipt
                  </button>
                  <button onClick={() => bulkReceiptInputRef.current?.click()} className="px-4 py-2 bg-purple-700/40 hover:bg-purple-700/60 border border-purple-600/50 text-purple-300 rounded-lg flex items-center gap-2 text-sm" disabled={uploadingFile}>
                    <Image className="w-4 h-4" /> Bulk Upload
                  </button>
                  <button onClick={downloadAuditPDF} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4" /> Download PDF
                  </button>
                  {receiptFiles.length > 0 && (
                    <button onClick={downloadAllReceiptsZip} className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 text-sm">
                      <Download className="w-4 h-4" /> All Receipts (ZIP)
                      <span id="zip-progress" className="text-xs opacity-70"></span>
                    </button>
                  )}
                  <button onClick={downloadAuditCSV} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2 text-sm">
                    <Download className="w-4 h-4" /> CSV
                  </button>
                </div>
              </div>

              {/* Upload Form */}
              {showUploadForm && (
                <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-200">Upload Receipt / Bill</h3>
                    <button onClick={() => setShowUploadForm(false)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Category *</label>
                      <select value={uploadFormData.category} onChange={e => setUploadFormData(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200">
                        <option value="income">Income Receipt</option>
                        <option value="expense">Expense Receipt / Bill</option>
                        <option value="other">Other Document</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Date</label>
                      <input type="date" value={uploadFormData.date} onChange={e => setUploadFormData(p => ({ ...p, date: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Party Name</label>
                      <input type="text" value={uploadFormData.partyName} onChange={e => setUploadFormData(p => ({ ...p, partyName: e.target.value }))} placeholder="e.g. Mohan Kalburgi" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Amount (₹)</label>
                      <input type="number" value={uploadFormData.amount} onChange={e => setUploadFormData(p => ({ ...p, amount: e.target.value }))} placeholder="0" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Voucher Type</label>
                      <select value={uploadFormData.voucherType} onChange={e => setUploadFormData(p => ({ ...p, voucherType: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200">
                        <option value="">— Select —</option>
                        <option value="Receipt">Receipt</option>
                        <option value="Payment">Payment</option>
                        <option value="Journal">Journal</option>
                        <option value="Contra">Contra</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                      <input type="text" value={uploadFormData.notes} onChange={e => setUploadFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Description" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowUploadForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm">Cancel</button>
                    <button
                      onClick={() => receiptFileInputRef.current?.click()}
                      disabled={uploadingFile}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-black font-medium rounded-lg text-sm flex items-center gap-2"
                    >
                      {uploadingFile ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingFile ? 'Uploading...' : 'Choose File & Upload'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Summary Cards ── */}
              {(() => {
                const receiptVouchers = manualVouchers.filter(v => v.voucherType === 'Receipt');
                const paymentVouchers = manualVouchers.filter(v => v.voucherType === 'Payment');
                const journalVouchers = manualVouchers.filter(v => v.voucherType === 'Journal');
                const contraVouchers = manualVouchers.filter(v => v.voucherType === 'Contra');
                const incomeEntries = manualEntries.filter(e => e.category === 'income');
                const expenseEntries = manualEntries.filter(e => e.category === 'expense');
                const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
                const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0);
                const totalReceiptAmt = receiptVouchers.reduce((s, v) => s + v.amount, 0);
                const totalPaymentAmt = paymentVouchers.reduce((s, v) => s + v.amount, 0);

                return (
                  <>
                    {/* Voucher Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-4 rounded-xl border border-gray-800 bg-green-500/10">
                        <div className="flex items-center gap-2 mb-1">
                          <ArrowDownLeft className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-gray-400">Receipt Vouchers</span>
                        </div>
                        <p className="text-lg font-bold text-green-400">{receiptVouchers.length}</p>
                        <p className="text-xs text-green-400/70 mt-0.5">{fmt(totalReceiptAmt)}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-gray-800 bg-red-500/10">
                        <div className="flex items-center gap-2 mb-1">
                          <ArrowUpRight className="w-4 h-4 text-red-400" />
                          <span className="text-xs text-gray-400">Payment Vouchers</span>
                        </div>
                        <p className="text-lg font-bold text-red-400">{paymentVouchers.length}</p>
                        <p className="text-xs text-red-400/70 mt-0.5">{fmt(totalPaymentAmt)}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-gray-800 bg-blue-500/10">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-gray-400">Journal / Contra</span>
                        </div>
                        <p className="text-lg font-bold text-blue-400">{journalVouchers.length + contraVouchers.length}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-gray-800 bg-yellow-500/10">
                        <div className="flex items-center gap-2 mb-1">
                          <Paperclip className="w-4 h-4 text-yellow-400" />
                          <span className="text-xs text-gray-400">Uploaded Files</span>
                        </div>
                        <p className="text-lg font-bold text-yellow-400">{receiptFileStats.total}</p>
                        <p className="text-xs text-yellow-400/70 mt-0.5">{receiptFileStats.income} income, {receiptFileStats.expense} expense</p>
                      </div>
                    </div>

                    {/* Income & Expense Summary */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                          <h3 className="font-bold text-green-400 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Income ({incomeEntries.length})</h3>
                          <span className="text-sm font-bold text-green-400">{fmt(totalIncome)}</span>
                        </div>
                        <div className="divide-y divide-gray-800/40">
                          {incomeEntries.length === 0 ? (
                            <p className="p-4 text-sm text-gray-500">No income entries. Add from Opening Bal. tab.</p>
                          ) : incomeEntries.map((e, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-800/20">
                              <div>
                                <span className="text-gray-200">{e.ledgerName}</span>
                                <span className="text-gray-600 text-xs ml-2">[{e.parentGroup}]</span>
                              </div>
                              <span className="text-green-400 font-mono">{fmt(e.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                          <h3 className="font-bold text-red-400 flex items-center gap-2"><Wallet className="w-4 h-4" /> Expenses ({expenseEntries.length})</h3>
                          <span className="text-sm font-bold text-red-400">{fmt(totalExpenses)}</span>
                        </div>
                        <div className="divide-y divide-gray-800/40">
                          {expenseEntries.length === 0 ? (
                            <p className="p-4 text-sm text-gray-500">No expense entries. Add from Opening Bal. tab.</p>
                          ) : expenseEntries.map((e, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-800/20">
                              <div>
                                <span className="text-gray-200">{e.ledgerName}</span>
                                <span className="text-gray-600 text-xs ml-2">[{e.parentGroup}]</span>
                              </div>
                              <span className="text-red-400 font-mono">{fmt(e.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Net Profit/Loss */}
                    <div className={`p-4 rounded-xl border ${totalIncome - totalExpenses >= 0 ? 'bg-green-500/10 border-green-800' : 'bg-red-500/10 border-red-800'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Net {totalIncome - totalExpenses >= 0 ? 'Profit' : 'Loss'}</span>
                        <span className={`text-xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(Math.abs(totalIncome - totalExpenses))}</span>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* ── Receipt Vouchers Table ── */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-green-400 flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4" /> Receipt Vouchers (Income)
                  </h3>
                  <span className="text-xs text-gray-500">{manualVouchers.filter(v => v.voucherType === 'Receipt').length} entries</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-950/60">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">#</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Date</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Vch No</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Party</th>
                        <th className="text-right px-3 py-2 text-gray-500 text-xs">Amount</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Mode</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Narration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/30">
                      {manualVouchers.filter(v => v.voucherType === 'Receipt').sort((a, b) => a.date.localeCompare(b.date)).map((v, i) => (
                        <tr key={v._id} className="hover:bg-gray-800/20">
                          <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                          <td className="px-3 py-2 text-gray-300">{v.date}</td>
                          <td className="px-3 py-2 text-gray-400">{v.voucherNumber || '-'}</td>
                          <td className="px-3 py-2 text-gray-200">{v.partyName}</td>
                          <td className="px-3 py-2 text-green-400 text-right font-mono">{fmt(v.amount)}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{v.paymentMode || '-'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate">{v.narration || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-950/40 border-t border-gray-700">
                        <td colSpan={4} className="px-3 py-2 text-right text-sm font-bold text-gray-300">Total Receipts</td>
                        <td className="px-3 py-2 text-right font-bold text-green-400">{fmt(manualVouchers.filter(v => v.voucherType === 'Receipt').reduce((s, v) => s + v.amount, 0))}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ── Payment Vouchers Table ── */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-red-400 flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4" /> Payment Vouchers (Expenses)
                  </h3>
                  <span className="text-xs text-gray-500">{manualVouchers.filter(v => v.voucherType === 'Payment').length} entries</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-950/60">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">#</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Date</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Vch No</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Party</th>
                        <th className="text-right px-3 py-2 text-gray-500 text-xs">Amount</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Mode</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Narration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/30">
                      {manualVouchers.filter(v => v.voucherType === 'Payment').sort((a, b) => a.date.localeCompare(b.date)).map((v, i) => (
                        <tr key={v._id} className="hover:bg-gray-800/20">
                          <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                          <td className="px-3 py-2 text-gray-300">{v.date}</td>
                          <td className="px-3 py-2 text-gray-400">{v.voucherNumber || '-'}</td>
                          <td className="px-3 py-2 text-gray-200">{v.partyName}</td>
                          <td className="px-3 py-2 text-red-400 text-right font-mono">{fmt(v.amount)}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{v.paymentMode || '-'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate">{v.narration || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-950/40 border-t border-gray-700">
                        <td colSpan={4} className="px-3 py-2 text-right text-sm font-bold text-gray-300">Total Payments</td>
                        <td className="px-3 py-2 text-right font-bold text-red-400">{fmt(manualVouchers.filter(v => v.voucherType === 'Payment').reduce((s, v) => s + v.amount, 0))}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ── Contra (Cash) Vouchers Table ── */}
              {manualVouchers.filter(v => v.voucherType === 'Contra').length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-blue-400 flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Contra / Cash Vouchers
                  </h3>
                  <span className="text-xs text-gray-500">{manualVouchers.filter(v => v.voucherType === 'Contra').length} entries</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-950/60">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">#</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Date</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Vch No</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Party</th>
                        <th className="text-right px-3 py-2 text-gray-500 text-xs">Amount</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Mode</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Narration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/30">
                      {manualVouchers.filter(v => v.voucherType === 'Contra').sort((a, b) => a.date.localeCompare(b.date)).map((v, i) => (
                        <tr key={v._id} className="hover:bg-gray-800/20">
                          <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                          <td className="px-3 py-2 text-gray-300">{v.date}</td>
                          <td className="px-3 py-2 text-gray-400">{v.voucherNumber || '-'}</td>
                          <td className="px-3 py-2 text-gray-200">{v.partyName}</td>
                          <td className="px-3 py-2 text-blue-400 text-right font-mono">{fmt(v.amount)}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{v.paymentMode || '-'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate">{v.narration || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-950/40 border-t border-gray-700">
                        <td colSpan={4} className="px-3 py-2 text-right text-sm font-bold text-gray-300">Total Contra</td>
                        <td className="px-3 py-2 text-right font-bold text-blue-400">{fmt(manualVouchers.filter(v => v.voucherType === 'Contra').reduce((s, v) => s + v.amount, 0))}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              )}

              {/* ── Journal Vouchers Table ── */}
              {manualVouchers.filter(v => v.voucherType === 'Journal').length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-purple-400 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> Journal Vouchers
                  </h3>
                  <span className="text-xs text-gray-500">{manualVouchers.filter(v => v.voucherType === 'Journal').length} entries</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-950/60">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">#</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Date</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Vch No</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Party</th>
                        <th className="text-right px-3 py-2 text-gray-500 text-xs">Amount</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Mode</th>
                        <th className="text-left px-3 py-2 text-gray-500 text-xs">Narration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/30">
                      {manualVouchers.filter(v => v.voucherType === 'Journal').sort((a, b) => a.date.localeCompare(b.date)).map((v, i) => (
                        <tr key={v._id} className="hover:bg-gray-800/20">
                          <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                          <td className="px-3 py-2 text-gray-300">{v.date}</td>
                          <td className="px-3 py-2 text-gray-400">{v.voucherNumber || '-'}</td>
                          <td className="px-3 py-2 text-gray-200">{v.partyName}</td>
                          <td className="px-3 py-2 text-purple-400 text-right font-mono">{fmt(v.amount)}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{v.paymentMode || '-'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate">{v.narration || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-950/40 border-t border-gray-700">
                        <td colSpan={4} className="px-3 py-2 text-right text-sm font-bold text-gray-300">Total Journal</td>
                        <td className="px-3 py-2 text-right font-bold text-purple-400">{fmt(manualVouchers.filter(v => v.voucherType === 'Journal').reduce((s, v) => s + v.amount, 0))}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              )}

              {/* ── Uploaded Receipt Files ── */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-bold text-yellow-400 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" /> Uploaded Receipt Files
                  </h3>
                  <div className="flex items-center gap-2">
                    <select value={caFilterCategory} onChange={e => setCaFilterCategory(e.target.value as any)} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300">
                      <option value="all">All ({receiptFileStats.total})</option>
                      <option value="income">Income ({receiptFileStats.income})</option>
                      <option value="expense">Expense ({receiptFileStats.expense})</option>
                      <option value="other">Other ({receiptFileStats.other})</option>
                    </select>
                    <button onClick={fetchReceiptFiles} className="p-1 hover:bg-gray-700 rounded" title="Refresh">
                      <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${receiptFilesLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {receiptFilesLoading && receiptFiles.length === 0 ? (
                  <div className="p-8 text-center"><RefreshCw className="w-6 h-6 text-gray-600 animate-spin mx-auto" /></div>
                ) : receiptFiles.filter(f => caFilterCategory === 'all' || f.category === caFilterCategory).length === 0 ? (
                  <div className="p-8 text-center">
                    <Image className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm mb-3">No receipt files uploaded yet.</p>
                    <button onClick={() => setShowUploadForm(true)} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg text-sm inline-flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Upload First Receipt
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                    {receiptFiles.filter(f => caFilterCategory === 'all' || f.category === caFilterCategory).map(f => (
                      <div key={f._id} className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden hover:border-gray-600 transition group">
                        {/* Preview */}
                        {f.fileType?.startsWith('image/') ? (
                          <div className="h-32 bg-gray-900 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => setReceiptPreview(f)}>
                            <img src={f.previewUrl || f.fileUrl} alt={f.fileName} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-32 bg-gray-900 flex items-center justify-center cursor-pointer" onClick={() => window.open(f.previewUrl || f.fileUrl, '_blank')}>
                            <FileText className="w-10 h-10 text-gray-600" />
                            <span className="text-xs text-gray-500 ml-2">PDF</span>
                          </div>
                        )}
                        {/* Info */}
                        <div className="p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${f.category === 'income' ? 'bg-green-500/20 text-green-400' : f.category === 'expense' ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>
                              {f.category}
                            </span>
                            {f.amount && <span className="text-xs font-mono text-gray-300">{fmt(f.amount)}</span>}
                          </div>
                          <p className="text-xs text-gray-300 truncate">{f.partyName || f.fileName}</p>
                          {f.date && <p className="text-[10px] text-gray-600">{f.date}</p>}
                          {f.notes && <p className="text-[10px] text-gray-600 truncate">{f.notes}</p>}
                          <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => setReceiptPreview(f)} className="p-1 hover:bg-gray-800 rounded" title="Preview">
                              <Eye className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                            <a href={f.previewUrl || f.fileUrl} download={f.fileName} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-gray-800 rounded" title="Download">
                              <Download className="w-3.5 h-3.5 text-gray-400" />
                            </a>
                            <button onClick={() => deleteReceiptFile(f._id)} className="p-1 hover:bg-red-900/30 rounded" title="Delete">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Preview Modal ── */}
              {receiptPreview && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setReceiptPreview(null)}>
                  <div className="bg-gray-900 rounded-xl max-w-4xl max-h-[90vh] overflow-auto border border-gray-700 w-full" onClick={e => e.stopPropagation()}>
                    <div className="sticky top-0 bg-gray-900/95 px-4 py-3 border-b border-gray-800 flex items-center justify-between z-10">
                      <div>
                        <h3 className="text-sm font-bold text-gray-200">{receiptPreview.fileName}</h3>
                        <p className="text-xs text-gray-500">{receiptPreview.partyName} {receiptPreview.date ? `— ${receiptPreview.date}` : ''} {receiptPreview.amount ? `— ${fmt(receiptPreview.amount)}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={receiptPreview.previewUrl || receiptPreview.fileUrl} download={receiptPreview.fileName} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-gray-800 rounded-lg" title="Download">
                          <Download className="w-4 h-4 text-gray-300" />
                        </a>
                        <button onClick={() => setReceiptPreview(null)} className="p-2 hover:bg-gray-800 rounded-lg">
                          <X className="w-4 h-4 text-gray-300" />
                        </button>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-center min-h-[400px]">
                      {receiptPreview.fileType?.startsWith('image/') ? (
                        <img src={receiptPreview.previewUrl || receiptPreview.fileUrl} alt={receiptPreview.fileName} className="max-w-full max-h-[70vh] object-contain rounded" />
                      ) : (
                        <iframe src={receiptPreview.previewUrl || receiptPreview.fileUrl} className="w-full h-[70vh] rounded border border-gray-700" title={receiptPreview.fileName} />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════ SETTINGS TAB ════════ */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-6">
              {/* Connection status */}
              <div className={`p-5 rounded-xl border ${connected ? 'bg-green-500/5 border-green-800' : 'bg-red-500/5 border-red-800'}`}>
                <div className="flex items-center gap-3 mb-3">
                  {connected ? <Wifi className="w-6 h-6 text-green-400" /> : <WifiOff className="w-6 h-6 text-red-400" />}
                  <h3 className="text-lg font-bold">{connected ? 'Connected to Tally Prime' : 'Not Connected'}</h3>
                </div>
                {connectionMsg && <p className="text-sm text-gray-400 mb-3">{connectionMsg}</p>}
                <button
                  onClick={testConnection}
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Test Connection
                </button>
              </div>

              {/* Config display */}
              <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-yellow-500" />
                  Configuration (.env.local)
                </h3>
                <p className="text-xs text-gray-500">
                  Update these values in your <code className="bg-gray-800 px-1 rounded">.env.local</code> file and restart the server.
                </p>

                <div className="space-y-3">
                  <ConfigRow label="TALLY_PRIME_URL" value={config?.url} placeholder="http://localhost:9000" />
                  <ConfigRow label="TALLY_PRIME_COMPANY_NAME" value={config?.companyName} placeholder="Your company name in Tally" />
                  <ConfigRow label="TALLY_PRIME_SERIAL_NUMBER" value={config?.serialNumber} placeholder="Tally licence serial number" />
                  <ConfigRow label="TALLY_PRIME_EMAIL" value={config?.email} placeholder="your-email@example.com" />
                  <ConfigRow label="TALLY_PRIME_PASSWORD" value="••••••••" placeholder="Tally password" />
                  <ConfigRow label="TALLY_PRIME_CONFIGURED" value={config?.configured ? 'true' : 'false'} placeholder="Set to true after config" highlight={!config?.configured} />
                </div>
              </div>

              {/* Setup instructions */}
              <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl">
                <h3 className="text-lg font-bold mb-3">Setup Instructions</h3>
                <ol className="space-y-3 text-sm text-gray-400 list-decimal list-inside">
                  <li>
                    Open <strong className="text-gray-200">Tally Prime 3.0.1</strong> on your PC
                  </li>
                  <li>
                    Go to <strong className="text-gray-200">F12 (Configure)</strong> → <strong className="text-gray-200">Connectivity</strong>
                  </li>
                  <li>
                    Enable <strong className="text-gray-200">Tally ODBC / XML Server</strong> (set port to <code className="bg-gray-800 px-1 rounded">9000</code>)
                  </li>
                  <li>
                    Note your <strong className="text-gray-200">Company Name</strong> exactly as shown in Tally
                  </li>
                  <li>
                    Find your <strong className="text-gray-200">Serial Number</strong> in Tally → Help → About (or licence key)
                  </li>
                  <li>
                    Update <code className="bg-gray-800 px-1 rounded">.env.local</code> with the values above
                  </li>
                  <li>
                    Set <code className="bg-gray-800 px-1 rounded">TALLY_PRIME_CONFIGURED=true</code>
                  </li>
                  <li>
                    Restart dev server (<code className="bg-gray-800 px-1 rounded">npm run dev</code>) and click <strong className="text-gray-200">&quot;Test Connection&quot;</strong>
                  </li>
                </ol>
              </div>

              {/* Feature Toggles */}
              <div className="p-5 bg-gray-900 border border-gray-800 rounded-xl space-y-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ToggleRight className="w-5 h-5 text-yellow-500" />
                  Feature Toggles
                </h3>
                <p className="text-xs text-gray-500">Enable or disable tabs as needed for your workflow.</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Sales Tab</p>
                      <p className="text-xs text-gray-500">Show Sales voucher tracking</p>
                    </div>
                    <button onClick={() => setShowSales(v => !v)} className="flex items-center gap-2">
                      {showSales
                        ? <ToggleRight className="w-8 h-8 text-green-400" />
                        : <ToggleLeft className="w-8 h-8 text-gray-600" />
                      }
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-200">Purchases Tab</p>
                      <p className="text-xs text-gray-500">Show Purchase voucher tracking</p>
                    </div>
                    <button onClick={() => setShowPurchases(v => !v)} className="flex items-center gap-2">
                      {showPurchases
                        ? <ToggleRight className="w-8 h-8 text-green-400" />
                        : <ToggleLeft className="w-8 h-8 text-gray-600" />
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ═══ AI Chat Floating Button ═══ */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-yellow-600 hover:bg-yellow-500 rounded-full shadow-lg shadow-yellow-600/30 flex items-center justify-center transition-all hover:scale-110"
          title="Ask Tally AI"
        >
          <Bot className="w-7 h-7 text-black" />
        </button>
      )}

      {/* ═══ AI Chat Panel ═══ */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-yellow-500" />
              <span className="font-bold text-sm">Tally AI Assistant</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="p-1 hover:bg-gray-700 rounded-lg transition">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" id="tally-chat-scroll">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-1">Ask me anything about Tally</p>
                <p className="text-xs text-gray-600">Ledger balances, receipts, P&L, outstanding, voucher details...</p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-yellow-600 text-black rounded-br-sm'
                    : 'bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 border border-gray-700 px-4 py-2 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat input */}
          <div className="p-3 border-t border-gray-700 bg-gray-800/50">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                placeholder="Ask about Tally data..."
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
              />
              <button
                onClick={sendChatMessage}
                disabled={chatLoading || !chatInput.trim()}
                className="p-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 rounded-lg transition"
              >
                <Send className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function StatCard({ label, value, sub, icon: Icon, color, bg }: {
  label: string; value: string; sub: string; icon: any; color: string; bg: string;
}) {
  return (
    <div className={`p-4 rounded-xl border border-gray-800 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-xs text-gray-400 font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-100">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function RecentTable({ title, vouchers, color }: { title: string; vouchers: TallyVoucher[]; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className={`font-bold ${color}`}>{title}</h3>
      </div>
      {vouchers.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">No data</p>
      ) : (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-800/40">
            {vouchers.map((v, i) => (
              <tr key={i} className="hover:bg-gray-800/30">
                <td className="px-4 py-2.5 text-gray-400">{tallyDateToDisplay(v.date)}</td>
                <td className="px-4 py-2.5 text-gray-200 truncate max-w-[180px]">{v.partyName || v.voucherNumber}</td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-200">{fmt(v.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ConfigRow({ label, value, placeholder, highlight }: { label: string; value?: string; placeholder: string; highlight?: boolean }) {
  const displayValue = value || `(not set)`;
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-3 rounded-lg ${highlight ? 'bg-yellow-500/10 border border-yellow-800' : 'bg-gray-800/50'}`}>
      <code className="text-xs text-yellow-400 font-mono min-w-[280px]">{label}</code>
      <span className={`text-sm ${value && value !== '(not set)' ? 'text-gray-200' : 'text-gray-500 italic'}`}>
        {displayValue}
      </span>
    </div>
  );
}

function NotConfiguredCard({ onTest }: { onTest: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <WifiOff className="w-16 h-16 text-gray-700 mb-4" />
      <h2 className="text-2xl font-bold text-gray-300 mb-2">Tally Prime Not Connected</h2>
      <p className="text-gray-500 max-w-md mb-6">
        Configure your Tally Prime connection in <code className="bg-gray-800 px-1 rounded">.env.local</code> and make sure Tally is running with XML Server enabled.
      </p>
      <button onClick={onTest} className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium flex items-center gap-2">
        <Settings className="w-5 h-5" />
        Go to Settings
      </button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-12 bg-gray-900 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileText className="w-12 h-12 text-gray-700 mb-3" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

function PLGroupRow({ group, color }: { group: PLGroup | BSGroup; color: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/30 transition text-left"
      >
        <div className="flex items-center gap-2">
          <ChevronRight className={`w-3.5 h-3.5 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          <span className="text-sm text-gray-200 font-medium">{group.name}</span>
          {group.children.length > 0 && (
            <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{group.children.length}</span>
          )}
        </div>
        <span className={`text-sm font-bold ${color}`}>{fmt(group.amount)}</span>
      </button>
      {expanded && group.children.length > 0 && (
        <div className="bg-gray-950/40 border-t border-gray-800/30">
          {group.children.map((c, i) => (
            <div key={i} className="flex items-center justify-between px-4 pl-10 py-2 text-xs hover:bg-gray-800/20">
              <span className="text-gray-400">{c.name}</span>
              <span className="text-gray-300">{fmt(c.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
