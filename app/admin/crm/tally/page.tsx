'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AdminSidebar from '@/components/AdminSidebar';
import {
  BarChart3,
  RefreshCw,
  IndianRupee,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Building2,
  Settings,
  User,
  Search,
  Menu,
  ArrowLeft,
  TrendingUp,
  Scale,
  Plus,
  Save,
  Wallet,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  PieChart,
  ClipboardList,
  Download,
  Upload,
  Image,
  Eye,
  Printer,
  Shield,
  Lock,
  Unlock,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

type AccountGroup = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'CAPITAL';
type BalanceType = 'DEBIT' | 'CREDIT';
type VoucherType = 'RECEIPT' | 'PAYMENT' | 'JOURNAL' | 'CONTRA' | 'SALES' | 'PURCHASE' | 'DEBIT_NOTE' | 'CREDIT_NOTE';
type ViewTab = 'dashboard' | 'account' | 'ledgers' | 'vouchers' | 'trial-balance' | 'profit-loss' | 'monthly-pl' | 'balance-sheet' | 'daybook' | 'ca-audit' | 'ca-bills' | 'settings';

interface Ledger {
  id: string;
  name: string;
  group: AccountGroup;
  subGroup?: string;
  openingBalance: number;
  openingBalanceType: BalanceType;
  closingBalance?: number;
  closingBalanceType?: BalanceType;
  periodDebit?: number;
  periodCredit?: number;
}

interface VoucherEntry {
  ledgerId: string;
  ledgerName: string;
  amount: number;
  type: BalanceType;
}

interface Voucher {
  id: string;
  voucherNumber: string;
  date: string;
  type: VoucherType;
  entries: VoucherEntry[];
  totalDebit: number;
  totalCredit: number;
  narration?: string;
  partyName?: string;
}

interface Summary {
  financialYear: string;
  ledgerCount: number;
  voucherCount: number;
  isClosed: boolean;
  profitLoss: { totalIncome: number; totalExpense: number; netProfit: number; isProfit: boolean };
  balanceSheet: { totalAssets: number; liabilitiesPlusCapital: number; difference: number; isBalanced: boolean };
  cashBank: { name: string; balance: number; balanceType: string }[];
  voucherBreakdown: { type: string; count: number; totalAmount: number }[];
  openingBalance: number;
  closingBalance: number;
  cashInHand: number;
  totalBankReceived?: number;
  totalBankExpense?: number;
}

interface TrialBalanceRow {
  ledgerName: string;
  group: string;
  closingDebit: number;
  closingCredit: number;
}

interface PLRow { ledgerName: string; amount: number; subGroup?: string }
interface BSRow { ledgerName: string; amount: number; subGroup?: string }

interface MonthlyPLRow {
  month: string;
  monthNum: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  isProfit: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────

function fmt(n: number): string {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const GROUP_COLORS: Record<AccountGroup, string> = {
  ASSET: 'text-blue-400 bg-blue-500/10',
  LIABILITY: 'text-red-400 bg-red-500/10',
  INCOME: 'text-green-400 bg-green-500/10',
  EXPENSE: 'text-orange-400 bg-orange-500/10',
  CAPITAL: 'text-purple-400 bg-purple-500/10',
};

const VOUCHER_COLORS: Record<string, string> = {
  RECEIPT: 'text-green-400 bg-green-500/10',
  PAYMENT: 'text-red-400 bg-red-500/10',
  JOURNAL: 'text-yellow-400 bg-yellow-500/10',
  CONTRA: 'text-blue-400 bg-blue-500/10',
  SALES: 'text-emerald-400 bg-emerald-500/10',
  PURCHASE: 'text-amber-400 bg-amber-500/10',
  DEBIT_NOTE: 'text-pink-400 bg-pink-500/10',
  CREDIT_NOTE: 'text-indigo-400 bg-indigo-500/10',
};

const TABS: { key: ViewTab; label: string; icon: any }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'account', label: 'Account', icon: User },
  { key: 'ledgers', label: 'Ledgers', icon: BookOpen },
  { key: 'vouchers', label: 'Vouchers', icon: FileText },
  { key: 'daybook', label: 'Day Book', icon: Calendar },
  { key: 'trial-balance', label: 'Trial Balance', icon: Scale },
  { key: 'profit-loss', label: 'P&L (Yearly)', icon: TrendingUp },
  { key: 'monthly-pl', label: 'P&L (Monthly)', icon: IndianRupee },
  { key: 'balance-sheet', label: 'Balance Sheet', icon: PieChart },
  { key: 'ca-audit', label: 'CA Audit', icon: Shield },
  { key: 'ca-bills', label: 'Bills', icon: Image },
  { key: 'settings', label: 'Setup', icon: Settings },
];

// ── Stat Card ───────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    red: 'bg-red-500/10 text-red-400',
    purple: 'bg-purple-500/10 text-purple-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    orange: 'bg-orange-500/10 text-orange-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
  };
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colorMap[color] || 'bg-gray-800 text-gray-400'}`}><Icon className="w-4 h-4" /></div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────────────

export default function TallyPage() {
  const router = useRouter();
  const token = useAuth();

  // State
  const [tab, setTab] = useState<ViewTab>('dashboard');
  const [fy, setFy] = useState('2024-25');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data states
  const [summary, setSummary] = useState<Summary | null>(null);
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [trialBalance, setTrialBalance] = useState<{ rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; difference: number } | null>(null);
  const [profitLoss, setProfitLoss] = useState<{ income: PLRow[]; expenses: PLRow[]; incomeByGroup?: Record<string, PLRow[]>; expensesByGroup?: Record<string, PLRow[]>; totalIncome: number; totalExpense: number; netProfit: number; isProfit: boolean } | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<{ assets: BSRow[]; liabilities: BSRow[]; capital: BSRow[]; assetsByGroup?: Record<string, BSRow[]>; liabilitiesByGroup?: Record<string, BSRow[]>; capitalBySubGroup?: Record<string, { ledgerName: string; amount: number }[]>; totalAssets: number; liabilitiesPlusCapital: number; difference: number; netProfit: number; isProfit: boolean; capitalAdjusted: number } | null>(null);
  const [daybook, setDaybook] = useState<any[]>([]);
  const [daybookLedgerSummary, setDaybookLedgerSummary] = useState<any[] | null>(null);
  const [monthlyPL, setMonthlyPL] = useState<MonthlyPLRow[]>([]);
  const [caAudit, setCaAudit] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [billsMonth, setBillsMonth] = useState<number>(new Date().getMonth() + 1);
  const [billsYear, setBillsYear] = useState<number>(new Date().getFullYear());

  // Form states
  const [showLedgerForm, setShowLedgerForm] = useState(false);
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false);
  const [fyLocked, setFyLocked] = useState(false);
  const [lockLoading, setLockLoading] = useState(false);

  // Company profile for print headers
  const [companyProfile, setCompanyProfile] = useState<Record<string, string>>({});

  // ── API Helper ────────────────────────────────────────────────────

  const apiFetch = useCallback(async (url: string, options?: RequestInit) => {
    if (!token) return null;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      },
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'API Error');
    return data.data;
  }, [token]);

  // ── Load Data ─────────────────────────────────────────────────────

  // Clear all cached data so next tab switch fetches fresh from server
  const clearAllCachedData = useCallback(() => {
    setSummary(null);
    setLedgers([]);
    setVouchers([]);
    setTrialBalance(null);
    setProfitLoss(null);
    setBalanceSheet(null);
    setDaybook([]);
    setDaybookLedgerSummary(null);
    setMonthlyPL([]);
    setCaAudit(null);
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/tally/reports?type=summary&fy=${fy}`);
      setSummary(data);
      if (data?.isClosed !== undefined) setFyLocked(data.isClosed);
    } catch (e: any) { setError(e.message); }
  }, [apiFetch, fy]);

  const loadLedgers = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/tally/ledgers?fy=${fy}&withBalance=true`);
      setLedgers(data?.ledgers || []);
    } catch (e: any) { setError(e.message); }
  }, [apiFetch, fy]);

  const loadVouchers = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/tally/vouchers?fy=${fy}&limit=100`);
      setVouchers(data?.vouchers || []);
    } catch (e: any) { setError(e.message); }
  }, [apiFetch, fy]);

  const loadTrialBalance = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/tally/reports?type=trial-balance&fy=${fy}`);
      setTrialBalance(data);
    } catch (e: any) { setError(e.message); }
  }, [apiFetch, fy]);

  const loadProfitLoss = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/tally/reports?type=profit-loss&fy=${fy}`);
      setProfitLoss(data);
    } catch (e: any) { setError(e.message); }
  }, [apiFetch, fy]);

  const loadBalanceSheet = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/tally/reports?type=balance-sheet&fy=${fy}`);
      setBalanceSheet(data);
    } catch (e: any) { setError(e.message); }
  }, [apiFetch, fy]);

  const loadDayBook = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/tally/daybook?fy=${fy}`);
      setDaybook(data?.entries || []);
      setDaybookLedgerSummary(data?.ledgerSummary || null);
    } catch (e: any) { setError(e.message); }
  }, [apiFetch, fy]);

  const loadMonthlyPL = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/tally/reports?type=monthly-pl&fy=${fy}`);
      setMonthlyPL(data?.months || []);
    } catch (e: any) { setError(e.message); }
  }, [apiFetch, fy]);

  const loadCAAudit = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/tally/reports?type=ca-audit&fy=${fy}`);
      setCaAudit(data);
    } catch (e: any) { setError(e.message); }
  }, [apiFetch, fy]);

  const loadBills = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/tally/bills?fy=${fy}&month=${billsMonth}&year=${billsYear}`);
      setBills(data?.vouchers || []);
    } catch (e: any) { setError(e.message); }
  }, [apiFetch, fy, billsMonth, billsYear]);

  const refreshCurrentTab = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      switch (tab) {
        case 'dashboard': await loadSummary(); break;
        case 'account': break; // AccountView loads its own data
        case 'ledgers': await loadLedgers(); break;
        case 'vouchers': await loadVouchers(); break;
        case 'trial-balance': await loadTrialBalance(); break;
        case 'profit-loss': await loadProfitLoss(); break;
        case 'monthly-pl': await loadMonthlyPL(); break;
        case 'balance-sheet': await loadBalanceSheet(); break;
        case 'daybook': await loadDayBook(); break;
        case 'ca-audit': await loadCAAudit(); break;
        case 'ca-bills': await loadBills(); break;
      }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [tab, loadSummary, loadLedgers, loadVouchers, loadTrialBalance, loadProfitLoss, loadMonthlyPL, loadBalanceSheet, loadDayBook, loadCAAudit, loadBills]);

  // Toggle FY lock/unlock
  const toggleFYLock = useCallback(async () => {
    if (!token) return;
    setLockLoading(true);
    try {
      const data = await apiFetch('/api/tally/setup', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'toggle-lock', fy }),
      });
      setFyLocked(data?.isClosed || false);
      clearAllCachedData();
      await loadSummary();
    } catch (e: any) { setError(e.message); }
    setLockLoading(false);
  }, [apiFetch, fy, token, clearAllCachedData, loadSummary]);

  // Load company profile for print headers
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const data = await apiFetch('/api/tally/setup');
        const fyData = data?.financialYears?.find((f: any) => f.code === fy);
        if (fyData) setCompanyProfile(fyData);
      } catch {}
    })();
  }, [fy, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load data based on active tab
  useEffect(() => {
    if (!token) return;
    refreshCurrentTab();
  }, [tab, fy, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ledger Form ───────────────────────────────────────────────────

  const LedgerForm = () => {
    const [name, setName] = useState('');
    const [group, setGroup] = useState<AccountGroup>('ASSET');
    const [subGroup, setSubGroup] = useState('');
    const [openBal, setOpenBal] = useState(0);
    const [openBalType, setOpenBalType] = useState<BalanceType>('DEBIT');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      try {
        await apiFetch('/api/tally/ledgers', {
          method: 'POST',
          body: JSON.stringify({
            name, group, subGroup: subGroup || undefined,
            openingBalance: openBal, openingBalanceType: openBalType,
            financialYear: fy,
          }),
        });
        setShowLedgerForm(false);
        // Clear all cached data so every tab fetches fresh from server
        clearAllCachedData();
        refreshCurrentTab();
      } catch (e: any) { setError(e.message); }
      setSaving(false);
    };

    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl shadow-xl border border-gray-800 p-6 w-full max-w-md space-y-4">
          <h3 className="text-lg font-bold text-white">Create Ledger</h3>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 outline-none placeholder-gray-500" placeholder="e.g. Cash, Kotak Bank A/C" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Group *</label>
            <select value={group} onChange={e => setGroup(e.target.value as AccountGroup)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
              <option value="ASSET">Asset</option>
              <option value="LIABILITY">Liability</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expense</option>
              <option value="CAPITAL">Capital</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Sub-Group</label>
            <input value={subGroup} onChange={e => setSubGroup(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500" placeholder="e.g. Bank Accounts, Fixed Assets" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Opening Balance</label>
              <input type="number" value={openBal} onChange={e => setOpenBal(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Type</label>
              <select value={openBalType} onChange={e => setOpenBalType(e.target.value as BalanceType)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                <option value="DEBIT">Debit</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowLedgerForm(false)}
              className="flex-1 px-4 py-2 text-sm border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2 text-sm bg-yellow-600 text-black rounded-lg hover:bg-yellow-500 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold">
              <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Create Ledger'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // ── Voucher Form ──────────────────────────────────────────────────

  const VoucherForm = () => {
    const [vType, setVType] = useState<VoucherType>('RECEIPT');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [narration, setNarration] = useState('');
    const [entries, setEntries] = useState<{ ledgerId: string; ledgerName: string; amount: string; type: BalanceType }[]>([
      { ledgerId: '', ledgerName: '', amount: '', type: 'DEBIT' },
      { ledgerId: '', ledgerName: '', amount: '', type: 'CREDIT' },
    ]);
    const [saving, setSaving] = useState(false);
    const [billFile, setBillFile] = useState<File | null>(null);
    const [gstRate, setGstRate] = useState<number>(18);
    const [gstType, setGstType] = useState<'intra' | 'inter'>('intra'); // intra = CGST+SGST, inter = IGST

    const totalDebit = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const totalCredit = entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

    const addEntry = () => setEntries([...entries, { ledgerId: '', ledgerName: '', amount: '', type: 'CREDIT' }]);
    const removeEntry = (i: number) => { if (entries.length > 2) setEntries(entries.filter((_, idx) => idx !== i)); };

    const updateEntry = (i: number, field: string, value: string) => {
      const updated = [...entries];
      if (field === 'ledgerId') {
        const ledger = ledgers.find(l => l.id === value);
        updated[i] = { ...updated[i], ledgerId: value, ledgerName: ledger?.name || '' };
      } else {
        (updated[i] as any)[field] = value;
      }
      setEntries(updated);
    };

    // Auto-add GST entries for SALES / PURCHASE
    const applyGST = () => {
      // Find the first entry with a valid amount
      const baseEntry = entries.find(e => parseFloat(e.amount) > 0);
      if (!baseEntry) { setError('Enter a base amount first.'); return; }
      const baseAmount = parseFloat(baseEntry.amount);
      const isSales = vType === 'SALES' || vType === 'DEBIT_NOTE';

      // Remove existing GST entries
      const filteredEntries = entries.filter(e => {
        const name = e.ledgerName.toLowerCase();
        return !name.includes('cgst') && !name.includes('sgst') && !name.includes('igst');
      });

      const newEntries = [...filteredEntries];

      if (gstType === 'intra') {
        // CGST + SGST (each half rate)
        const halfRate = gstRate / 2;
        const taxAmount = Math.round((baseAmount * halfRate / 100) * 100) / 100;
        const cgstLedger = ledgers.find(l => l.name === (isSales ? 'CGST Output' : 'CGST Input'));
        const sgstLedger = ledgers.find(l => l.name === (isSales ? 'SGST Output' : 'SGST Input'));

        if (cgstLedger) {
          newEntries.push({ ledgerId: cgstLedger.id, ledgerName: cgstLedger.name, amount: String(taxAmount), type: isSales ? 'CREDIT' : 'DEBIT' });
        }
        if (sgstLedger) {
          newEntries.push({ ledgerId: sgstLedger.id, ledgerName: sgstLedger.name, amount: String(taxAmount), type: isSales ? 'CREDIT' : 'DEBIT' });
        }
      } else {
        // IGST
        const taxAmount = Math.round((baseAmount * gstRate / 100) * 100) / 100;
        const igstLedger = ledgers.find(l => l.name === (isSales ? 'IGST Output' : 'IGST Input'));
        if (igstLedger) {
          newEntries.push({ ledgerId: igstLedger.id, ledgerName: igstLedger.name, amount: String(taxAmount), type: isSales ? 'CREDIT' : 'DEBIT' });
        }
      }

      setEntries(newEntries);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isBalanced) { setError('Voucher is NOT balanced. Debit must equal Credit.'); return; }
      setSaving(true);
      try {
        const result = await apiFetch('/api/tally/vouchers', {
          method: 'POST',
          body: JSON.stringify({
            date, type: vType, narration, financialYear: fy,
            entries: entries.map(en => ({
              ledgerId: en.ledgerId,
              ledgerName: en.ledgerName,
              amount: parseFloat(en.amount) || 0,
              type: en.type,
            })),
          }),
        });

        // Upload bill if file was attached
        if (billFile && result?.id) {
          try {
            const formData = new FormData();
            formData.append('file', billFile);
            formData.append('voucherId', result.id);
            const res = await fetch('/api/tally/bills', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });
            const billResult = await res.json();
            if (!billResult.success) console.error('Bill upload failed:', billResult.error);
          } catch (billErr) { console.error('Bill upload error:', billErr); }
        }

        setShowVoucherForm(false);
        // Clear all cached data so every tab fetches fresh from server
        clearAllCachedData();
        refreshCurrentTab();
      } catch (e: any) { setError(e.message); }
      setSaving(false);
    };

    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl shadow-xl border border-gray-800 p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-auto">
          <h3 className="text-lg font-bold text-white">Create Voucher (Double-Entry)</h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Voucher Type *</label>
              <select value={vType} onChange={e => setVType(e.target.value as VoucherType)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm">
                {['RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'SALES', 'PURCHASE', 'DEBIT_NOTE', 'CREDIT_NOTE'].map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Narration</label>
            <input value={narration} onChange={e => setNarration(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500" placeholder="Description of the transaction" />
          </div>

          {/* GST Section — shown when GST is enabled & voucher is SALES/PURCHASE/DN/CN */}
          {gstEnabled && ['SALES', 'PURCHASE', 'DEBIT_NOTE', 'CREDIT_NOTE'].includes(vType) && (
            <div className="p-3 bg-yellow-500/5 border border-yellow-600/30 rounded-lg space-y-2">
              <div className="text-xs font-semibold text-yellow-400 flex items-center gap-1"><IndianRupee className="w-3 h-3" /> GST Auto-Calculation</div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">GST Rate (%)</label>
                  <select value={gstRate} onChange={e => setGstRate(Number(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-sm">
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <select value={gstType} onChange={e => setGstType(e.target.value as 'intra' | 'inter')}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-sm">
                    <option value="intra">Intra-State (CGST + SGST)</option>
                    <option value="inter">Inter-State (IGST)</option>
                  </select>
                </div>
                <div className="flex-shrink-0 self-end">
                  <button type="button" onClick={applyGST}
                    className="px-3 py-1.5 bg-yellow-600 text-black text-xs rounded-lg hover:bg-yellow-500 font-semibold">
                    Apply GST
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">Enter base amount first, then click Apply GST to auto-add tax entries.</p>
            </div>
          )}

          {/* Entries */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-400">Entries (Double-Entry) *</label>
              <button type="button" onClick={addEntry} className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>

            <div className="space-y-2">
              {entries.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={entry.ledgerId} onChange={e => updateEntry(i, 'ledgerId', e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-sm">
                    <option value="">Select Ledger</option>
                    {ledgers.map(l => (
                      <option key={l.id} value={l.id}>{l.name} ({l.group})</option>
                    ))}
                  </select>
                  <input type="number" value={entry.amount} onChange={e => updateEntry(i, 'amount', e.target.value)}
                    className="w-28 bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-sm text-right placeholder-gray-500" placeholder="Amount" min="0.01" step="0.01" />
                  <select value={entry.type} onChange={e => updateEntry(i, 'type', e.target.value)}
                    className={`w-24 border rounded-lg px-2 py-1.5 text-sm font-medium ${entry.type === 'DEBIT' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30'}`}>
                    <option value="DEBIT">Dr</option>
                    <option value="CREDIT">Cr</option>
                  </select>
                  {entries.length > 2 && (
                    <button type="button" onClick={() => removeEntry(i)} className="text-red-400 hover:text-red-300 text-sm">×</button>
                  )}
                </div>
              ))}
            </div>

            {/* Balance indicator */}
            <div className={`mt-3 p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${isBalanced ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {isBalanced ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>Total Debit: {fmt(totalDebit)}</span>
              <span className="mx-2">|</span>
              <span>Total Credit: {fmt(totalCredit)}</span>
              {!isBalanced && totalDebit > 0 && <span className="ml-2">(Diff: {fmt(Math.abs(totalDebit - totalCredit))})</span>}
              {isBalanced && <span className="ml-auto text-green-400 font-bold">✓ BALANCED</span>}
            </div>
          </div>

          {/* Bill Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
              <Upload className="w-4 h-4" /> Attach Bill / Receipt (optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer">
                <div className={`w-full border-2 border-dashed rounded-lg px-4 py-3 text-center text-sm transition-colors ${
                  billFile ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-gray-700 bg-gray-800/50 text-gray-500 hover:border-yellow-600/50 hover:bg-yellow-600/5'
                }`}>
                  {billFile ? (
                    <span className="flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> {billFile.name} ({(billFile.size / 1024).toFixed(0)} KB)</span>
                  ) : (
                    <span>Click to upload bill (JPEG, PNG, PDF — max 10MB)</span>
                  )}
                </div>
                <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                  onChange={e => setBillFile(e.target.files?.[0] || null)} />
              </label>
              {billFile && (
                <button type="button" onClick={() => setBillFile(null)} className="text-red-400 hover:text-red-300 text-sm px-2">Remove</button>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowVoucherForm(false)}
              className="flex-1 px-4 py-2 text-sm border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800">Cancel</button>
            <button type="submit" disabled={saving || !isBalanced}
              className="flex-1 px-4 py-2 text-sm bg-yellow-600 text-black rounded-lg hover:bg-yellow-500 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold">
              <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Create Voucher'}
            </button>
          </div>
        </form>
      </div>
    );
  };

  // ── Account Details View ─────────────────────────────────────────

  const AccountView = () => {
    const [acctLoading, setAcctLoading] = useState(false);
    const [acctSaving, setAcctSaving] = useState(false);
    const [acctMsg, setAcctMsg] = useState('');
    const [profile, setProfile] = useState({
      businessType: '' as string,
      companyName: '',
      legalName: '',
      tradeName: '',
      ownerName: '',
      fatherName: '',
      designation: '',
      gstin: '',
      pan: '',
      tan: '',
      cin: '',
      udyam: '',
      phone: '',
      altPhone: '',
      email: '',
      website: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
      bankName: '',
      bankAccountNo: '',
      bankIfsc: '',
      bankBranch: '',
      notes: '',
    });

    // Load profile from FY record
    useEffect(() => {
      (async () => {
        setAcctLoading(true);
        try {
          const data = await apiFetch(`/api/tally/setup`);
          const fyData = data?.financialYears?.find((f: any) => f.code === fy);
          if (fyData) {
            setProfile(prev => ({
              ...prev,
              businessType: fyData.businessType || '',
              companyName: fyData.companyName || '',
              legalName: fyData.legalName || '',
              tradeName: fyData.tradeName || '',
              ownerName: fyData.ownerName || '',
              fatherName: fyData.fatherName || '',
              designation: fyData.designation || '',
              gstin: fyData.gstin || '',
              pan: fyData.pan || '',
              tan: fyData.tan || '',
              cin: fyData.cin || '',
              udyam: fyData.udyam || '',
              phone: fyData.phone || '',
              altPhone: fyData.altPhone || '',
              email: fyData.email || '',
              website: fyData.website || '',
              address: fyData.address || '',
              city: fyData.city || '',
              state: fyData.state || '',
              pincode: fyData.pincode || '',
              country: fyData.country || 'India',
              bankName: fyData.bankName || '',
              bankAccountNo: fyData.bankAccountNo || '',
              bankIfsc: fyData.bankIfsc || '',
              bankBranch: fyData.bankBranch || '',
              notes: fyData.notes || '',
            }));
          }
        } catch {} 
        setAcctLoading(false);
      })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fy]);

    const handleSave = async () => {
      setAcctSaving(true);
      setAcctMsg('');
      try {
        await apiFetch('/api/tally/setup', {
          method: 'PATCH',
          body: JSON.stringify({ action: 'save-profile', fy, ...profile }),
        });
        // Refresh companyProfile so print headers use updated data
        setCompanyProfile(prev => ({ ...prev, ...profile }));
        setAcctMsg('Account details saved successfully!');
      } catch (e: any) { setError(e.message); }
      setAcctSaving(false);
    };

    const up = (field: string, value: string) => setProfile(prev => ({ ...prev, [field]: value }));

    const INPUT = "w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:border-yellow-600 focus:outline-none";
    const LABEL = "block text-sm font-medium text-gray-400 mb-1";

    if (acctLoading) return <div className="text-gray-500 text-center py-12"><RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-yellow-500" />Loading account...</div>;

    const INDIAN_STATES = [
      '', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
      'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
      'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
      'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
      'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
      'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
    ];

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><User className="w-5 h-5 text-yellow-500" /> Account Details — FY {fy}</h3>
          <button onClick={handleSave} disabled={acctSaving}
            className="px-4 py-2 bg-yellow-600 text-black text-sm rounded-lg hover:bg-yellow-500 disabled:opacity-50 flex items-center gap-2 font-semibold">
            <Save className="w-4 h-4" />{acctSaving ? 'Saving...' : 'Save Details'}
          </button>
        </div>

        {acctMsg && (
          <div className="p-3 bg-green-900/40 border border-green-700 rounded-lg text-sm text-green-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {acctMsg}
          </div>
        )}

        {/* Business Type */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2"><Building2 className="w-4 h-4" /> Business Type</h4>
          <div>
            <label className={LABEL}>Type of Business *</label>
            <select value={profile.businessType} onChange={e => up('businessType', e.target.value)} className={INPUT}>
              <option value="">— Select —</option>
              <option value="company">Company (Pvt. Ltd / Ltd)</option>
              <option value="proprietor">Proprietorship</option>
              <option value="individual">Individual</option>
              <option value="partnership">Partnership Firm</option>
              <option value="llp">LLP (Limited Liability Partnership)</option>
              <option value="trust">Trust / Society / NGO</option>
              <option value="huf">HUF (Hindu Undivided Family)</option>
            </select>
          </div>
        </div>

        {/* Company / Business Name */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2"><Building2 className="w-4 h-4" /> Business Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Company / Business Name *</label>
              <input value={profile.companyName} onChange={e => up('companyName', e.target.value)} className={INPUT} placeholder="e.g. Swar Yoga Pvt. Ltd." />
            </div>
            <div>
              <label className={LABEL}>Legal / Registered Name</label>
              <input value={profile.legalName} onChange={e => up('legalName', e.target.value)} className={INPUT} placeholder="As per registration certificate" />
            </div>
            <div>
              <label className={LABEL}>Trade Name / Brand</label>
              <input value={profile.tradeName} onChange={e => up('tradeName', e.target.value)} className={INPUT} placeholder="Trading as..." />
            </div>
            <div>
              <label className={LABEL}>Owner / Proprietor / Director Name *</label>
              <input value={profile.ownerName} onChange={e => up('ownerName', e.target.value)} className={INPUT} placeholder="Full name" />
            </div>
            <div>
              <label className={LABEL}>Father&apos;s Name</label>
              <input value={profile.fatherName} onChange={e => up('fatherName', e.target.value)} className={INPUT} placeholder="Father's name" />
            </div>
            <div>
              <label className={LABEL}>Designation</label>
              <input value={profile.designation} onChange={e => up('designation', e.target.value)} className={INPUT} placeholder="e.g. Managing Director, Proprietor" />
            </div>
          </div>
        </div>

        {/* Tax & Registration Details */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2"><Shield className="w-4 h-4" /> Tax & Registration</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>GSTIN</label>
              <input value={profile.gstin} onChange={e => up('gstin', e.target.value.toUpperCase())} className={INPUT} placeholder="22AAAAA0000A1Z5" maxLength={15} />
            </div>
            <div>
              <label className={LABEL}>PAN</label>
              <input value={profile.pan} onChange={e => up('pan', e.target.value.toUpperCase())} className={INPUT} placeholder="AAAAA0000A" maxLength={10} />
            </div>
            <div>
              <label className={LABEL}>TAN</label>
              <input value={profile.tan} onChange={e => up('tan', e.target.value.toUpperCase())} className={INPUT} placeholder="AAAA00000A" maxLength={10} />
            </div>
            <div>
              <label className={LABEL}>CIN (Company Identification)</label>
              <input value={profile.cin} onChange={e => up('cin', e.target.value.toUpperCase())} className={INPUT} placeholder="U00000AA0000AAA000000" maxLength={21} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Udyam / MSME Registration</label>
              <input value={profile.udyam} onChange={e => up('udyam', e.target.value.toUpperCase())} className={INPUT} placeholder="UDYAM-XX-00-0000000" />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2"><FileText className="w-4 h-4" /> Contact Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Phone *</label>
              <input value={profile.phone} onChange={e => up('phone', e.target.value)} className={INPUT} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className={LABEL}>Alternate Phone</label>
              <input value={profile.altPhone} onChange={e => up('altPhone', e.target.value)} className={INPUT} placeholder="+91 98765 43211" />
            </div>
            <div>
              <label className={LABEL}>Email *</label>
              <input type="email" value={profile.email} onChange={e => up('email', e.target.value)} className={INPUT} placeholder="accounts@company.com" />
            </div>
            <div>
              <label className={LABEL}>Website</label>
              <input value={profile.website} onChange={e => up('website', e.target.value)} className={INPUT} placeholder="https://www.company.com" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2"><Building2 className="w-4 h-4" /> Registered Address</h4>
          <div>
            <label className={LABEL}>Full Address *</label>
            <textarea value={profile.address} onChange={e => up('address', e.target.value)} rows={2}
              className={INPUT + ' resize-none'} placeholder="Building, Street, Area..." />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className={LABEL}>City</label>
              <input value={profile.city} onChange={e => up('city', e.target.value)} className={INPUT} placeholder="City" />
            </div>
            <div>
              <label className={LABEL}>State</label>
              <select value={profile.state} onChange={e => up('state', e.target.value)} className={INPUT}>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s || '— Select —'}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Pincode</label>
              <input value={profile.pincode} onChange={e => up('pincode', e.target.value)} className={INPUT} placeholder="560001" maxLength={6} />
            </div>
            <div>
              <label className={LABEL}>Country</label>
              <input value={profile.country} onChange={e => up('country', e.target.value)} className={INPUT} placeholder="India" />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2"><Wallet className="w-4 h-4" /> Bank Details</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Bank Name</label>
              <input value={profile.bankName} onChange={e => up('bankName', e.target.value)} className={INPUT} placeholder="e.g. State Bank of India" />
            </div>
            <div>
              <label className={LABEL}>Account Number</label>
              <input value={profile.bankAccountNo} onChange={e => up('bankAccountNo', e.target.value)} className={INPUT} placeholder="Account number" />
            </div>
            <div>
              <label className={LABEL}>IFSC Code</label>
              <input value={profile.bankIfsc} onChange={e => up('bankIfsc', e.target.value.toUpperCase())} className={INPUT} placeholder="SBIN0000123" maxLength={11} />
            </div>
            <div>
              <label className={LABEL}>Branch</label>
              <input value={profile.bankBranch} onChange={e => up('bankBranch', e.target.value)} className={INPUT} placeholder="Branch name" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h4 className="text-sm font-semibold text-yellow-400">Additional Notes</h4>
          <textarea value={profile.notes} onChange={e => up('notes', e.target.value)} rows={3}
            className={INPUT + ' resize-none'} placeholder="Any additional notes about this account..." />
        </div>

        {/* Save Button Bottom */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={acctSaving}
            className="px-6 py-2.5 bg-yellow-600 text-black text-sm rounded-lg hover:bg-yellow-500 disabled:opacity-50 flex items-center gap-2 font-semibold">
            <Save className="w-4 h-4" />{acctSaving ? 'Saving...' : 'Save Account Details'}
          </button>
        </div>
      </div>
    );
  };

  // ── Dashboard View ────────────────────────────────────────────────

  const DashboardView = () => {
    if (!summary) return <div className="text-gray-500 text-center py-12">No data. Go to <strong>Setup</strong> tab to create a Financial Year first.</div>;

    return (
      <div className="space-y-6">
        {/* FY Status Banner */}
        {summary.isClosed && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <Lock className="w-4 h-4" />
            <span className="font-semibold">FY {fy} is Locked</span>
            <span className="text-red-400/70 ml-1">— No new entries allowed. Unlock to make changes.</span>
          </div>
        )}

        {/* Financial Overview — Opening → Income → Expense → Closing */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2"><IndianRupee className="w-4 h-4" /> Financial Overview — FY {fy}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center">
              <div className="text-xs text-gray-500 mb-1">Opening Balance</div>
              <div className="text-lg font-bold font-mono text-cyan-400">{fmt(summary.openingBalance)}</div>
            </div>
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <div className="text-xs text-gray-500 mb-1">Total Income</div>
              <div className="text-lg font-bold font-mono text-green-400">{fmt(summary.profitLoss.totalIncome)}</div>
            </div>
            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
              <div className="text-xs text-gray-500 mb-1">Total Expense</div>
              <div className="text-lg font-bold font-mono text-orange-400">{fmt(summary.profitLoss.totalExpense)}</div>
            </div>
            <div className={`p-3 rounded-lg border text-center ${summary.profitLoss.isProfit ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <div className="text-xs text-gray-500 mb-1">Closing Balance</div>
              <div className={`text-lg font-bold font-mono ${summary.profitLoss.isProfit ? 'text-green-400' : 'text-red-400'}`}>{fmt(summary.closingBalance)}</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-center">
              <div className="text-xs text-gray-500 mb-1">Cash in Hand</div>
              <div className="text-lg font-bold font-mono text-yellow-400">{fmt(summary.cashInHand)}</div>
            </div>
          </div>
          {/* Bank Received vs Bank Expense row */}
          {(summary.totalBankReceived || summary.totalBankExpense) ? (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="text-xs text-gray-500 mb-1">Total Bank Received</div>
                <div className="text-lg font-bold font-mono text-emerald-400">{fmt(summary.totalBankReceived || 0)}</div>
              </div>
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                <div className="text-xs text-gray-500 mb-1">Total Bank Expense</div>
                <div className="text-lg font-bold font-mono text-rose-400">{fmt(summary.totalBankExpense || 0)}</div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Balance Sheet Status + Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={BookOpen} label="Ledgers" value={String(summary.ledgerCount)} color="blue" />
          <StatCard icon={FileText} label="Vouchers" value={String(summary.voucherCount)} color="purple" />
          <StatCard icon={TrendingUp} label={summary.profitLoss.isProfit ? 'Net Profit' : 'Net Loss'}
            value={fmt(Math.abs(summary.profitLoss.netProfit))}
            color={summary.profitLoss.isProfit ? 'green' : 'red'} />
          <StatCard icon={Wallet} label="Cash in Hand" value={fmt(summary.cashInHand)} color="yellow" />
          <div className={`p-4 rounded-xl border ${summary.balanceSheet.isBalanced ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              {summary.balanceSheet.isBalanced
                ? <CheckCircle className="w-4 h-4 text-green-400" />
                : <AlertTriangle className="w-4 h-4 text-red-400" />}
              <span className={`text-xs font-semibold ${summary.balanceSheet.isBalanced ? 'text-green-400' : 'text-red-400'}`}>
                BS {summary.balanceSheet.isBalanced ? 'Balanced' : 'Unbalanced'}
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-white">{fmt(summary.balanceSheet.totalAssets)}</div>
            {!summary.balanceSheet.isBalanced && (
              <div className="text-xs text-red-400 mt-1">Diff: {fmt(summary.balanceSheet.difference)}</div>
            )}
          </div>
        </div>

        {summary.cashBank.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Wallet className="w-4 h-4" /> Cash & Bank Summary</h3>
            <div className="space-y-2">
              {summary.cashBank.map((cb, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <span className="text-sm text-gray-300">{cb.name}</span>
                  <span className={`text-sm font-mono font-medium ${cb.balanceType === 'DEBIT' ? 'text-blue-400' : 'text-red-400'}`}>
                    {fmt(cb.balance)} {cb.balanceType === 'DEBIT' ? 'Dr' : 'Cr'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.voucherBreakdown.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Voucher Breakdown</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {summary.voucherBreakdown.map((vb, i) => (
                <div key={i} className="p-3 rounded-lg bg-gray-800/50">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${VOUCHER_COLORS[vb.type] || 'text-gray-400 bg-gray-800'}`}>{vb.type}</span>
                  <div className="mt-2 text-lg font-bold text-white">{vb.count}</div>
                  <div className="text-xs text-gray-500">{fmt(vb.totalAmount)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Ledgers View ──────────────────────────────────────────────────

  const LedgersView = () => {
    const filtered = ledgers.filter(l =>
      l.name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      l.group.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
      (l.subGroup || '').toLowerCase().includes(ledgerSearch.toLowerCase())
    );

    const grouped = filtered.reduce((acc, l) => {
      if (!acc[l.group]) acc[l.group] = [];
      acc[l.group].push(l);
      return acc;
    }, {} as Record<string, Ledger[]>);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input value={ledgerSearch} onChange={e => setLedgerSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg text-sm placeholder-gray-500" placeholder="Search ledgers..." />
          </div>
          <button onClick={() => setShowLedgerForm(true)}
            className="px-4 py-2 bg-yellow-600 text-black text-sm rounded-lg hover:bg-yellow-500 flex items-center gap-2 font-semibold">
            <Plus className="w-4 h-4" /> New Ledger
          </button>
        </div>

        {Object.entries(grouped).map(([group, items]) => (
          <div key={group} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className={`px-4 py-2.5 flex items-center gap-2 ${GROUP_COLORS[group as AccountGroup] || 'bg-gray-800'}`}>
              <span className="text-sm font-semibold">{group}</span>
              <span className="text-xs opacity-70">({items.length})</span>
            </div>
            <div className="divide-y divide-gray-800">
              {items.map(l => (
                <div key={l.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-800/50">
                  <div>
                    <div className="text-sm font-medium text-gray-200">{l.name}</div>
                    {l.subGroup && <div className="text-xs text-gray-500">{l.subGroup}</div>}
                  </div>
                  <div className="text-right">
                    {l.closingBalance !== undefined ? (
                      <div className={`text-sm font-mono font-medium ${l.closingBalanceType === 'DEBIT' ? 'text-blue-400' : 'text-red-400'}`}>
                        {fmt(l.closingBalance)} {l.closingBalanceType === 'DEBIT' ? 'Dr' : 'Cr'}
                      </div>
                    ) : (
                      <div className="text-sm font-mono text-gray-500">
                        {fmt(l.openingBalance)} {l.openingBalanceType === 'DEBIT' ? 'Dr' : 'Cr'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-12">No ledgers found. Create your first ledger to get started.</div>
        )}
      </div>
    );
  };

  // ── Vouchers View ─────────────────────────────────────────────────

  const VouchersView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-400">{vouchers.length} Vouchers</h3>
        <button onClick={() => { loadLedgers(); setShowVoucherForm(true); }}
          className="px-4 py-2 bg-yellow-600 text-black text-sm rounded-lg hover:bg-yellow-500 flex items-center gap-2 font-semibold">
          <Plus className="w-4 h-4" /> New Voucher
        </button>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50 text-gray-400">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">No.</th>
              <th className="px-4 py-2.5 text-left font-medium">Date</th>
              <th className="px-4 py-2.5 text-left font-medium">Type</th>
              <th className="px-4 py-2.5 text-left font-medium">Particulars</th>
              <th className="px-4 py-2.5 text-right font-medium">Debit</th>
              <th className="px-4 py-2.5 text-right font-medium">Credit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {vouchers.map(v => (
              <tr key={v.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{v.voucherNumber}</td>
                <td className="px-4 py-2.5 text-gray-400">{new Date(v.date).toLocaleDateString('en-IN')}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${VOUCHER_COLORS[v.type] || ''}`}>{v.type}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="text-gray-200">{v.entries.map(e => e.ledgerName).join(' / ')}</div>
                  {v.narration && <div className="text-xs text-gray-500 mt-0.5">{v.narration}</div>}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-blue-400">{fmt(v.totalDebit)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-red-400">{fmt(v.totalCredit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {vouchers.length === 0 && <div className="text-center text-gray-500 py-12">No vouchers yet. Click &quot;New Voucher&quot; to create one.</div>}
      </div>
    </div>
  );

  // ── Trial Balance View ────────────────────────────────────────────

  const TrialBalanceView = () => {
    if (!trialBalance) return <div className="text-gray-500 text-center py-12">No data. Create ledgers and vouchers first.</div>;

    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400">Trial Balance — FY {fy}</h3>
          <div className="flex items-center gap-2">
            <div className={`text-xs font-medium px-2 py-1 rounded ${trialBalance.difference === 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
              {trialBalance.difference === 0 ? '✓ Balanced' : `⚠ Difference: ${fmt(Math.abs(trialBalance.difference))}`}
            </div>
            <button onClick={printTrialBalance} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded flex items-center gap-1">
              <Printer className="w-3 h-3" /> PDF
            </button>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50 text-gray-400">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Ledger</th>
              <th className="px-4 py-2.5 text-left font-medium">Group</th>
              <th className="px-4 py-2.5 text-right font-medium">Debit (₹)</th>
              <th className="px-4 py-2.5 text-right font-medium">Credit (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {trialBalance.rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-800/50">
                <td className="px-4 py-2.5 text-gray-200">{r.ledgerName}</td>
                <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded ${GROUP_COLORS[r.group as AccountGroup] || ''}`}>{r.group}</span></td>
                <td className="px-4 py-2.5 text-right font-mono text-blue-400">{r.closingDebit > 0 ? fmt(r.closingDebit) : '-'}</td>
                <td className="px-4 py-2.5 text-right font-mono text-red-400">{r.closingCredit > 0 ? fmt(r.closingCredit) : '-'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-800 font-semibold">
            <tr>
              <td className="px-4 py-2.5 text-gray-200" colSpan={2}>TOTAL</td>
              <td className="px-4 py-2.5 text-right font-mono text-blue-300">{fmt(trialBalance.totalDebit)}</td>
              <td className="px-4 py-2.5 text-right font-mono text-red-300">{fmt(trialBalance.totalCredit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  // ── P&L View ──────────────────────────────────────────────────────

  const ProfitLossView = () => {
    if (!profitLoss) return <div className="text-gray-500 text-center py-12">No data</div>;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Profit & Loss — FY {fy}</h3>
          <button onClick={printProfitLoss} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded flex items-center gap-1">
            <Printer className="w-3 h-3" /> PDF
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 bg-green-500/10 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-green-400 flex items-center gap-2"><ArrowDownLeft className="w-4 h-4" /> Income</h3>
            </div>
            <div className="divide-y divide-gray-800">
              {profitLoss.incomeByGroup && Object.keys(profitLoss.incomeByGroup).length > 0 ? (
                Object.entries(profitLoss.incomeByGroup).map(([groupName, items]) => (
                  <div key={groupName}>
                    <div className="px-4 py-1.5 bg-green-500/5 text-xs font-semibold text-green-400/70 uppercase tracking-wide">{groupName}</div>
                    {items.map((item, i) => (
                      <div key={`${groupName}-${i}`} className="px-6 py-2 flex justify-between">
                        <span className="text-sm text-gray-300">{item.ledgerName}</span>
                        <span className="text-sm font-mono text-green-400">{fmt(item.amount)}</span>
                      </div>
                    ))}
                    <div className="px-6 py-1.5 flex justify-between bg-green-500/5">
                      <span className="text-xs text-green-400/60 font-medium">{groupName} Total</span>
                      <span className="text-xs font-mono text-green-400/60">{fmt(items.reduce((s, i) => s + i.amount, 0))}</span>
                    </div>
                  </div>
                ))
              ) : (
                profitLoss.income.map((item, i) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between">
                    <span className="text-sm text-gray-300">{item.ledgerName}</span>
                    <span className="text-sm font-mono text-green-400">{fmt(item.amount)}</span>
                  </div>
                ))
              )}
              {profitLoss.income.length === 0 && <div className="px-4 py-4 text-xs text-gray-500 text-center">No income ledgers</div>}
            </div>
            <div className="px-4 py-2.5 bg-green-500/10 border-t border-gray-800 flex justify-between font-semibold">
              <span className="text-sm text-green-400">Total Income</span>
              <span className="text-sm font-mono text-green-400">{fmt(profitLoss.totalIncome)}</span>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 bg-orange-500/10 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-orange-400 flex items-center gap-2"><ArrowUpRight className="w-4 h-4" /> Expenses</h3>
            </div>
            <div className="divide-y divide-gray-800">
              {profitLoss.expensesByGroup && Object.keys(profitLoss.expensesByGroup).length > 0 ? (
                Object.entries(profitLoss.expensesByGroup).map(([groupName, items]) => (
                  <div key={groupName}>
                    <div className="px-4 py-1.5 bg-orange-500/5 text-xs font-semibold text-orange-400/70 uppercase tracking-wide">{groupName}</div>
                    {items.map((item, i) => (
                      <div key={`${groupName}-${i}`} className="px-6 py-2 flex justify-between">
                        <span className="text-sm text-gray-300">{item.ledgerName}</span>
                        <span className="text-sm font-mono text-orange-400">{fmt(item.amount)}</span>
                      </div>
                    ))}
                    <div className="px-6 py-1.5 flex justify-between bg-orange-500/5">
                      <span className="text-xs text-orange-400/60 font-medium">{groupName} Total</span>
                      <span className="text-xs font-mono text-orange-400/60">{fmt(items.reduce((s, i) => s + i.amount, 0))}</span>
                    </div>
                  </div>
                ))
              ) : (
                profitLoss.expenses.map((item, i) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between">
                    <span className="text-sm text-gray-300">{item.ledgerName}</span>
                    <span className="text-sm font-mono text-orange-400">{fmt(item.amount)}</span>
                  </div>
                ))
              )}
              {profitLoss.expenses.length === 0 && <div className="px-4 py-4 text-xs text-gray-500 text-center">No expense ledgers</div>}
            </div>
            <div className="px-4 py-2.5 bg-orange-500/10 border-t border-gray-800 flex justify-between font-semibold">
              <span className="text-sm text-orange-400">Total Expenses</span>
              <span className="text-sm font-mono text-orange-400">{fmt(profitLoss.totalExpense)}</span>
            </div>
          </div>
        </div>

        {/* P&L Summary with Difference */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-gray-800">
            <div className="p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Total Income</div>
              <div className="text-xl font-bold font-mono text-green-400">{fmt(profitLoss.totalIncome)}</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Total Expense</div>
              <div className="text-xl font-bold font-mono text-orange-400">{fmt(profitLoss.totalExpense)}</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Difference (Income − Expense)</div>
              <div className={`text-xl font-bold font-mono ${profitLoss.netProfit === 0 ? 'text-gray-400' : profitLoss.isProfit ? 'text-green-400' : 'text-red-400'}`}>
                {profitLoss.netProfit === 0 ? '₹0.00' : fmt(Math.abs(profitLoss.netProfit))}
              </div>
            </div>
          </div>
          <div className={`px-4 py-3 text-center border-t border-gray-800 ${profitLoss.isProfit ? 'bg-green-500/10' : profitLoss.netProfit === 0 ? 'bg-gray-800/50' : 'bg-red-500/10'}`}>
            <div className="flex items-center justify-center gap-2">
              {profitLoss.netProfit === 0 ? (
                <span className="text-sm font-semibold text-gray-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> No Profit / No Loss — Balanced</span>
              ) : (
                <span className={`text-sm font-semibold flex items-center gap-2 ${profitLoss.isProfit ? 'text-green-400' : 'text-red-400'}`}>
                  {profitLoss.isProfit ? <TrendingUp className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {profitLoss.isProfit ? 'Net Profit' : 'Net Loss'}: {fmt(Math.abs(profitLoss.netProfit))}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Balance Sheet View ────────────────────────────────────────────

  const BalanceSheetView = () => {
    if (!balanceSheet) return <div className="text-gray-500 text-center py-12">No data</div>;

    // Group all sections by sub-group for Tally-like display
    const capitalBySubGroup = balanceSheet.capitalBySubGroup || {};
    const capitalGroups = Object.keys(capitalBySubGroup);
    const assetsByGroup = balanceSheet.assetsByGroup || {};
    const assetGroups = Object.keys(assetsByGroup);
    const liabilitiesByGroup = balanceSheet.liabilitiesByGroup || {};
    const liabilityGroups = Object.keys(liabilitiesByGroup);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2"><PieChart className="w-4 h-4" /> Balance Sheet — FY {fy}</h3>
          <button onClick={printBalanceSheet} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded flex items-center gap-1">
            <Printer className="w-3 h-3" /> PDF
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ASSETS */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 bg-blue-500/10 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-blue-400">Assets</h3>
            </div>
            <div className="divide-y divide-gray-800">
              {assetGroups.length > 0 ? (
                assetGroups.map(sg => (
                  <div key={sg}>
                    <div className="px-4 py-1.5 bg-blue-500/5 text-xs font-semibold text-blue-400/70 uppercase tracking-wide">{sg}</div>
                    {assetsByGroup[sg].map((item, i) => (
                      <div key={`${sg}-${i}`} className="px-6 py-2 flex justify-between">
                        <span className="text-sm text-gray-300">{item.ledgerName}</span>
                        <span className="text-sm font-mono text-blue-400">{fmt(item.amount)}</span>
                      </div>
                    ))}
                    <div className="px-6 py-1.5 flex justify-between bg-blue-500/5">
                      <span className="text-xs text-blue-400/60 font-medium">{sg} Total</span>
                      <span className="text-xs font-mono text-blue-400/60">{fmt(assetsByGroup[sg].reduce((s, i) => s + i.amount, 0))}</span>
                    </div>
                  </div>
                ))
              ) : (
                balanceSheet.assets.map((item, i) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between">
                    <div>
                      <span className="text-sm text-gray-300">{item.ledgerName}</span>
                      {item.subGroup && <span className="ml-2 text-xs text-gray-500">({item.subGroup})</span>}
                    </div>
                    <span className="text-sm font-mono text-blue-400">{fmt(item.amount)}</span>
                  </div>
                ))
              )}
              {balanceSheet.assets.length === 0 && <div className="px-4 py-4 text-xs text-gray-500 text-center">No asset ledgers</div>}
            </div>
            <div className="px-4 py-2.5 bg-blue-500/10 border-t border-gray-800 flex justify-between font-bold">
              <span className="text-sm text-blue-300">Total Assets</span>
              <span className="text-sm font-mono text-blue-300">{fmt(balanceSheet.totalAssets)}</span>
            </div>
          </div>

          {/* LIABILITIES + CAPITAL */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 bg-red-500/10 border-b border-gray-800">
              <h3 className="text-sm font-semibold text-red-400">Liabilities & Capital (Equity)</h3>
            </div>
            <div className="divide-y divide-gray-800">
              {/* Capital section with sub-group headers */}
              {capitalGroups.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-purple-500/10 text-xs font-semibold text-purple-400">Capital / Equity</div>
                  {capitalGroups.map(sg => (
                    <div key={sg}>
                      <div className="px-6 py-1.5 bg-purple-500/5 text-xs font-medium text-purple-400/70">{sg}</div>
                      {capitalBySubGroup[sg].map((item, i) => (
                        <div key={`${sg}-${i}`} className="px-8 py-2 flex justify-between">
                          <span className="text-sm text-gray-300">{item.ledgerName}</span>
                          <span className="text-sm font-mono text-purple-400">{fmt(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              )}
              {capitalGroups.length === 0 && balanceSheet.capital.length > 0 && (
                <>
                  <div className="px-4 py-2 bg-purple-500/10 text-xs font-semibold text-purple-400">Capital</div>
                  {balanceSheet.capital.map((item, i) => (
                    <div key={`c-${i}`} className="px-4 py-2.5 flex justify-between">
                      <span className="text-sm text-gray-300">{item.ledgerName}</span>
                      <span className="text-sm font-mono text-purple-400">{fmt(item.amount)}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Liabilities with sub-group headers */}
              {liabilityGroups.length > 0 ? (
                <>
                  <div className="px-4 py-2 bg-red-500/10 text-xs font-semibold text-red-400">Liabilities</div>
                  {liabilityGroups.map(sg => (
                    <div key={sg}>
                      <div className="px-6 py-1.5 bg-red-500/5 text-xs font-medium text-red-400/70">{sg}</div>
                      {liabilitiesByGroup[sg].map((item, i) => (
                        <div key={`${sg}-${i}`} className="px-8 py-2 flex justify-between">
                          <span className="text-sm text-gray-300">{item.ledgerName}</span>
                          <span className="text-sm font-mono text-red-400">{fmt(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </>
              ) : balanceSheet.liabilities.length > 0 ? (
                <>
                  <div className="px-4 py-2 bg-red-500/10 text-xs font-semibold text-red-400">Liabilities</div>
                  {balanceSheet.liabilities.map((item, i) => (
                    <div key={`l-${i}`} className="px-4 py-2.5 flex justify-between">
                      <div>
                        <span className="text-sm text-gray-300">{item.ledgerName}</span>
                        {item.subGroup && <span className="ml-2 text-xs text-gray-500">({item.subGroup})</span>}
                      </div>
                      <span className="text-sm font-mono text-red-400">{fmt(item.amount)}</span>
                    </div>
                  ))}
                </>
              ) : null}
              {balanceSheet.capital.length === 0 && balanceSheet.liabilities.length === 0 && (
                <div className="px-4 py-4 text-xs text-gray-500 text-center">No liability/capital ledgers</div>
              )}
            </div>
            <div className="px-4 py-2.5 bg-red-500/10 border-t border-gray-800 flex justify-between font-bold">
              <span className="text-sm text-red-300">Total Liabilities + Capital</span>
              <span className="text-sm font-mono text-red-300">{fmt(balanceSheet.liabilitiesPlusCapital)}</span>
            </div>
          </div>
        </div>

        {/* Balance Sheet Equation & Difference */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-gray-800">
            <div className="p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Total Assets</div>
              <div className="text-xl font-bold font-mono text-blue-400">{fmt(balanceSheet.totalAssets)}</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Liabilities + Capital</div>
              <div className="text-xl font-bold font-mono text-red-400">{fmt(balanceSheet.liabilitiesPlusCapital)}</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Difference</div>
              <div className={`text-xl font-bold font-mono ${balanceSheet.difference === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {balanceSheet.difference === 0 ? '₹0.00' : fmt(Math.abs(balanceSheet.difference))}
              </div>
            </div>
          </div>
          <div className={`px-4 py-3 text-center border-t border-gray-800 ${balanceSheet.difference === 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <div className="flex items-center justify-center gap-2">
              {balanceSheet.difference === 0 ? (
                <span className="text-sm font-semibold text-green-400 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Assets = Liabilities + Capital — Balance Sheet is BALANCED
                </span>
              ) : (
                <span className="text-sm font-semibold text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Assets ≠ Liabilities + Capital — Difference: {fmt(Math.abs(balanceSheet.difference))}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Day Book View ─────────────────────────────────────────────────

  const [expandedDaybookGroups, setExpandedDaybookGroups] = useState<Record<string, boolean>>({});

  const toggleDaybookGroup = (key: string) => {
    setExpandedDaybookGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAllDaybookGroups = () => {
    if (daybookLedgerSummary) {
      const all: Record<string, boolean> = {};
      daybookLedgerSummary.forEach((g: any) => { all[g.group] = true; });
      setExpandedDaybookGroups(all);
    } else if (daybook.length > 0) {
      // Group vouchers by type
      const types = new Set(daybook.map((e: any) => e.type));
      const all: Record<string, boolean> = {};
      types.forEach(t => { all[t] = true; });
      setExpandedDaybookGroups(all);
    }
  };

  const collapseAllDaybookGroups = () => setExpandedDaybookGroups({});

  const GROUP_ICON_COLORS: Record<string, string> = {
    INCOME: 'text-green-400 bg-green-500/10 border-green-500/30',
    EXPENSE: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    ASSET: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    LIABILITY: 'text-red-400 bg-red-500/10 border-red-500/30',
    CAPITAL: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  };

  const DayBookView = () => {
    // ── Voucher-based daybook (when vouchers exist) ──
    if (daybook.length > 0) {
      // Group vouchers by type
      const grouped: Record<string, any[]> = {};
      for (const entry of daybook) {
        const t = entry.type || 'OTHER';
        if (!grouped[t]) grouped[t] = [];
        grouped[t].push(entry);
      }
      const typeOrder = ['RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'SALES', 'PURCHASE', 'DEBIT_NOTE', 'CREDIT_NOTE'];
      const sortedTypes = typeOrder.filter(t => grouped[t]);
      // Add any types not in the predefined order
      Object.keys(grouped).forEach(t => { if (!sortedTypes.includes(t)) sortedTypes.push(t); });

      const totalDebit = daybook.reduce((s: number, e: any) => s + (e.totalAmount || 0), 0);
      const totalCredit = totalDebit; // balanced vouchers

      return (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Day Book — FY {fy}
              <span className="text-xs text-gray-500 ml-2">({daybook.length} vouchers)</span>
            </h3>
            <div className="flex items-center gap-2">
              <button onClick={expandAllDaybookGroups} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-400 text-xs rounded">Expand All</button>
              <button onClick={collapseAllDaybookGroups} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-400 text-xs rounded">Collapse</button>
              <button onClick={printDayBook} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded flex items-center gap-1">
                <Printer className="w-3 h-3" /> PDF
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-800">
            {sortedTypes.map(vType => {
              const entries = grouped[vType];
              const groupTotal = entries.reduce((s: number, e: any) => s + (e.totalAmount || 0), 0);
              const isExpanded = expandedDaybookGroups[vType];
              return (
                <div key={vType}>
                  <button
                    onClick={() => toggleDaybookGroup(vType)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/70 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      <span className={`text-xs font-bold px-2.5 py-1 rounded ${VOUCHER_COLORS[vType] || 'text-gray-400 bg-gray-800'}`}>{vType}</span>
                      <span className="text-sm text-gray-300 font-medium">{entries.length} entries</span>
                    </div>
                    <span className="text-sm font-mono font-semibold text-white">{fmt(groupTotal)}</span>
                  </button>
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-800/30 text-gray-500">
                          <tr>
                            <th className="px-6 py-2 text-left font-medium text-xs">Date</th>
                            <th className="px-4 py-2 text-left font-medium text-xs">Voucher #</th>
                            <th className="px-4 py-2 text-left font-medium text-xs">Particulars</th>
                            <th className="px-4 py-2 text-right font-medium text-xs">Debit (₹)</th>
                            <th className="px-4 py-2 text-right font-medium text-xs">Credit (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/50">
                          {entries.map((entry: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-800/30">
                              <td className="px-6 py-2 text-gray-400 text-xs">{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                              <td className="px-4 py-2 text-gray-300 text-xs font-mono">{entry.voucherNumber}</td>
                              <td className="px-4 py-2">
                                <div className="text-gray-200 text-xs">{entry.entries?.map((e: any) => e.ledgerName).join(' → ')}</div>
                                {entry.narration && <div className="text-[11px] text-gray-500 mt-0.5">{entry.narration}</div>}
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-xs text-blue-400">{fmt(entry.totalAmount)}</td>
                              <td className="px-4 py-2 text-right font-mono text-xs text-red-400">{fmt(entry.totalAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Grand Total */}
          <div className="px-4 py-3 bg-gray-800/50 border-t border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-300">Grand Total</span>
            <div className="flex gap-8">
              <span className="text-sm font-mono font-bold text-blue-400">Dr: {fmt(totalDebit)}</span>
              <span className="text-sm font-mono font-bold text-red-400">Cr: {fmt(totalCredit)}</span>
            </div>
          </div>
        </div>
      );
    }

    // ── CA Report Summary (when no vouchers but ledger OBs exist) ──
    if (daybookLedgerSummary && daybookLedgerSummary.length > 0) {
      const grandTotalDebit = daybookLedgerSummary.reduce((s: number, g: any) => s + g.totalDebit, 0);
      const grandTotalCredit = daybookLedgerSummary.reduce((s: number, g: any) => s + g.totalCredit, 0);

      return (
        <div className="space-y-3">
          {/* Header */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Day Book — FY {fy}
                </h3>
                <p className="text-xs text-yellow-500/80 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> CA Report Summary — Annual totals from audited accounts (click group headers to expand)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={expandAllDaybookGroups} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-400 text-xs rounded">Expand All</button>
                <button onClick={collapseAllDaybookGroups} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-400 text-xs rounded">Collapse</button>
                <button onClick={printDayBook} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded flex items-center gap-1">
                  <Printer className="w-3 h-3" /> PDF
                </button>
              </div>
            </div>
          </div>

          {/* Group Cards */}
          {daybookLedgerSummary.map((group: any) => {
            const isExpanded = expandedDaybookGroups[group.group];
            const colorClass = GROUP_ICON_COLORS[group.group] || 'text-gray-400 bg-gray-800 border-gray-700';
            const totalAmount = group.group === 'INCOME' || group.group === 'LIABILITY' || group.group === 'CAPITAL'
              ? group.totalCredit
              : group.totalDebit;

            // Sub-group grouping within each main group
            const subGroups: Record<string, any[]> = {};
            for (const l of group.ledgers) {
              const sg = l.subGroup || 'General';
              if (!subGroups[sg]) subGroups[sg] = [];
              subGroups[sg].push(l);
            }

            return (
              <div key={group.group} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                {/* Group Header — Clickable "Big Head" */}
                <button
                  onClick={() => toggleDaybookGroup(group.group)}
                  className={`w-full px-4 py-3.5 flex items-center justify-between hover:bg-gray-800/50 transition-colors cursor-pointer border-l-4 ${colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-gray-700'}`}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded
                      ? <ChevronDown className={`w-5 h-5 ${colorClass.split(' ')[0]}`} />
                      : <ChevronRight className={`w-5 h-5 ${colorClass.split(' ')[0]}`} />
                    }
                    <div className={`px-2.5 py-1 rounded-lg text-xs font-bold ${colorClass}`}>{group.group}</div>
                    <span className="text-base font-semibold text-gray-200">{group.label}</span>
                    <span className="text-xs text-gray-500">({group.ledgers.length} ledgers)</span>
                  </div>
                  <span className={`text-base font-mono font-bold ${colorClass.split(' ')[0]}`}>{fmt(totalAmount)}</span>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-gray-800">
                    {Object.entries(subGroups).map(([sgName, ledgers]: [string, any[]]) => (
                      <div key={sgName}>
                        {Object.keys(subGroups).length > 1 && (
                          <div className="px-6 py-1.5 bg-gray-800/30 text-xs text-gray-500 font-medium uppercase tracking-wider">{sgName}</div>
                        )}
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-gray-800/50">
                            {ledgers.map((ledger: any, j: number) => (
                              <tr key={j} className="hover:bg-gray-800/30">
                                <td className="px-8 py-2.5 text-gray-300 text-sm">{ledger.name}</td>
                                <td className="px-4 py-2.5 text-right font-mono text-sm">
                                  <span className={ledger.type === 'DEBIT' ? 'text-blue-400' : 'text-red-400'}>
                                    {fmt(ledger.amount)}
                                    <span className="text-[10px] text-gray-500 ml-1">{ledger.type === 'DEBIT' ? 'Dr' : 'Cr'}</span>
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                    {/* Sub-total */}
                    <div className="px-6 py-2 bg-gray-800/40 flex items-center justify-between border-t border-gray-700">
                      <span className="text-xs text-gray-400 font-medium">Sub-Total</span>
                      <div className="flex gap-6">
                        {group.totalDebit > 0 && <span className="text-xs font-mono font-semibold text-blue-400">Dr: {fmt(group.totalDebit)}</span>}
                        {group.totalCredit > 0 && <span className="text-xs font-mono font-semibold text-red-400">Cr: {fmt(group.totalCredit)}</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Grand Total Card */}
          <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-200">Grand Total</span>
              <div className="flex gap-8">
                <span className="text-sm font-mono font-bold text-blue-400">Total Debit: {fmt(grandTotalDebit)}</span>
                <span className="text-sm font-mono font-bold text-red-400">Total Credit: {fmt(grandTotalCredit)}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Empty state ──
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2"><Calendar className="w-4 h-4" /> Day Book — FY {fy}</h3>
        </div>
        <div className="text-center text-gray-500 py-12">No entries. Create vouchers or import bank statement first.</div>
      </div>
    );
  };

  // ── Monthly P&L View ───────────────────────────────────────────────

  const MonthlyPLView = () => {
    if (monthlyPL.length === 0) return <div className="text-gray-500 text-center py-12">No data. Create income/expense vouchers first.</div>;

    const totalIncome = monthlyPL.reduce((s, m) => s + m.totalIncome, 0);
    const totalExpense = monthlyPL.reduce((s, m) => s + m.totalExpense, 0);
    const totalNet = totalIncome - totalExpense;

    return (
      <div className="space-y-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden overflow-x-auto">
          <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
              <IndianRupee className="w-4 h-4" /> Monthly Profit & Loss — FY {fy}
            </h3>
            <button onClick={printMonthlyPL} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded flex items-center gap-1">
              <Printer className="w-3 h-3" /> PDF
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50 text-gray-400">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Month</th>
                <th className="px-4 py-2.5 text-right font-medium">Income (₹)</th>
                <th className="px-4 py-2.5 text-right font-medium">Expense (₹)</th>
                <th className="px-4 py-2.5 text-right font-medium">Net P&L (₹)</th>
                <th className="px-4 py-2.5 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {monthlyPL.map((m, i) => (
                <tr key={i} className="hover:bg-gray-800/50">
                  <td className="px-4 py-2.5 font-medium text-gray-200">{m.month}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-green-400">{m.totalIncome > 0 ? fmt(m.totalIncome) : '-'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-orange-400">{m.totalExpense > 0 ? fmt(m.totalExpense) : '-'}</td>
                  <td className={`px-4 py-2.5 text-right font-mono font-medium ${m.isProfit ? 'text-green-400' : 'text-red-400'}`}>
                    {Math.abs(m.netProfit) > 0.01 ? fmt(m.netProfit) : '-'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {Math.abs(m.netProfit) > 0.01 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${m.isProfit ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {m.isProfit ? 'Profit' : 'Loss'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-800 font-bold">
              <tr>
                <td className="px-4 py-2.5 text-gray-200">YEARLY TOTAL</td>
                <td className="px-4 py-2.5 text-right font-mono text-green-300">{fmt(totalIncome)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-orange-300">{fmt(totalExpense)}</td>
                <td className={`px-4 py-2.5 text-right font-mono ${totalNet >= 0 ? 'text-green-300' : 'text-red-300'}`}>{fmt(totalNet)}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${totalNet >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {totalNet >= 0 ? 'NET PROFIT' : 'NET LOSS'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Visual bar chart */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h4 className="text-xs font-semibold text-gray-500 mb-3">Monthly Trend</h4>
          <div className="flex items-end gap-2 h-32">
            {monthlyPL.map((m, i) => {
              const maxVal = Math.max(...monthlyPL.map(x => Math.max(x.totalIncome, x.totalExpense)), 1);
              const incH = (m.totalIncome / maxVal) * 100;
              const expH = (m.totalExpense / maxVal) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex gap-0.5 items-end h-24 w-full justify-center">
                    <div className="w-3 bg-green-500 rounded-t" style={{ height: `${incH}%`, minHeight: incH > 0 ? '2px' : '0' }} title={`Income: ${fmt(m.totalIncome)}`} />
                    <div className="w-3 bg-orange-500 rounded-t" style={{ height: `${expH}%`, minHeight: expH > 0 ? '2px' : '0' }} title={`Expense: ${fmt(m.totalExpense)}`} />
                  </div>
                  <span className="text-[9px] text-gray-500 leading-tight">{m.month.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> Income</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 rounded" /> Expense</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Settings View ─────────────────────────────────────────────────

  // ── A4 Print / PDF Helper ──────────────────────────────────────────

  const handlePrintReport = (title: string, contentHtml: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { setError('Popup blocked. Please allow popups for PDF download.'); return; }

    const cp = companyProfile;
    const companyName = cp.companyName || cp.legalName || 'Swar Yoga';
    const detailParts: string[] = [];
    if (cp.address) detailParts.push(cp.address);
    if (cp.city || cp.state || cp.pincode) detailParts.push([cp.city, cp.state, cp.pincode].filter(Boolean).join(', '));
    const contactParts: string[] = [];
    if (cp.phone) contactParts.push(`Phone: ${cp.phone}`);
    if (cp.email) contactParts.push(`Email: ${cp.email}`);
    if (cp.website) contactParts.push(cp.website);
    const taxParts: string[] = [];
    if (cp.gstin) taxParts.push(`GSTIN: ${cp.gstin}`);
    if (cp.pan) taxParts.push(`PAN: ${cp.pan}`);
    if (cp.cin) taxParts.push(`CIN: ${cp.cin}`);

    printWindow.document.write(`<!DOCTYPE html>
<html><head><title>${title} — FY ${fy}</title>
<style>
  @page { size: A4; margin: 15mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 11px; color: #222; line-height: 1.4; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
  .header h1 { font-size: 18px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
  .header .company-detail { font-size: 9.5px; color: #555; margin-top: 2px; }
  .header .tax-info { font-size: 9px; color: #777; margin-top: 1px; }
  .header h2 { font-size: 13px; font-weight: 600; color: #333; margin-top: 6px; border-top: 1px solid #ddd; padding-top: 5px; }
  .header .fy { font-size: 11px; color: #777; margin-top: 2px; }
  .header .date { font-size: 9px; color: #999; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; font-size: 10.5px; }
  th { background: #f0f0f0; font-weight: 600; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.3px; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .total-row { background: #f5f5f5; font-weight: bold; }
  .section-title { font-size: 12px; font-weight: bold; margin: 14px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
  .profit { color: #16a34a; }
  .loss { color: #dc2626; }
  .debit { color: #2563eb; }
  .credit { color: #dc2626; }
  .two-col { display: flex; gap: 12px; }
  .two-col > div { flex: 1; }
  .diff-box { text-align: center; margin-top: 10px; padding: 6px; border: 1px solid #ccc; font-weight: bold; font-size: 11px; }
  .footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 9px; color: #999; text-align: center; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <h1>${companyName}</h1>
  ${detailParts.length > 0 ? `<div class="company-detail">${detailParts.join(' | ')}</div>` : ''}
  ${contactParts.length > 0 ? `<div class="company-detail">${contactParts.join(' | ')}</div>` : ''}
  ${taxParts.length > 0 ? `<div class="tax-info">${taxParts.join(' &nbsp;|&nbsp; ')}</div>` : ''}
  <h2>${title}</h2>
  <div class="fy">Financial Year: ${fy}</div>
  <div class="date">Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
</div>
${contentHtml}
<div class="footer">Generated by Tally Prime — ${companyName} Accounting System</div>
</body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const printTrialBalance = () => {
    if (!trialBalance) return;
    let rows = trialBalance.rows.map(r =>
      `<tr><td>${r.ledgerName}</td><td>${r.group}</td><td class="text-right debit">${r.closingDebit > 0 ? fmt(r.closingDebit) : '-'}</td><td class="text-right credit">${r.closingCredit > 0 ? fmt(r.closingCredit) : '-'}</td></tr>`
    ).join('');
    rows += `<tr class="total-row"><td colspan="2">TOTAL</td><td class="text-right">${fmt(trialBalance.totalDebit)}</td><td class="text-right">${fmt(trialBalance.totalCredit)}</td></tr>`;
    const status = trialBalance.difference === 0 ? '<p style="text-align:center;color:#16a34a;font-weight:bold;margin-top:8px;">✓ Trial Balance is Balanced</p>' : `<p style="text-align:center;color:#dc2626;font-weight:bold;margin-top:8px;">⚠ Difference: ${fmt(Math.abs(trialBalance.difference))}</p>`;
    handlePrintReport('Trial Balance', `<table><tr><th>Ledger</th><th>Group</th><th class="text-right">Debit (₹)</th><th class="text-right">Credit (₹)</th></tr>${rows}</table>${status}`);
  };

  const printProfitLoss = () => {
    if (!profitLoss) return;
    // Two-column layout: Income on left, Expenses on right
    let html = '<div class="two-col">';
    // Left — Income
    html += '<div>';
    html += '<div class="section-title" style="color:#16a34a;">INCOME</div>';
    html += '<table><tr><th>Particulars</th><th class="text-right">Amount (₹)</th></tr>';
    profitLoss.income.forEach(i => {
      html += `<tr><td>${i.ledgerName}${i.subGroup ? ` <small style="color:#888;">(${i.subGroup})</small>` : ''}</td><td class="text-right">${fmt(i.amount)}</td></tr>`;
    });
    if (profitLoss.income.length === 0) html += '<tr><td colspan="2" class="text-center" style="color:#999;">No income ledgers</td></tr>';
    html += `<tr class="total-row" style="background:#e8f5e9;"><td>Total Income</td><td class="text-right">${fmt(profitLoss.totalIncome)}</td></tr>`;
    html += '</table></div>';
    // Right — Expenses
    html += '<div>';
    html += '<div class="section-title" style="color:#ea580c;">EXPENSES</div>';
    html += '<table><tr><th>Particulars</th><th class="text-right">Amount (₹)</th></tr>';
    profitLoss.expenses.forEach(e => {
      html += `<tr><td>${e.ledgerName}${e.subGroup ? ` <small style="color:#888;">(${e.subGroup})</small>` : ''}</td><td class="text-right">${fmt(e.amount)}</td></tr>`;
    });
    if (profitLoss.expenses.length === 0) html += '<tr><td colspan="2" class="text-center" style="color:#999;">No expense ledgers</td></tr>';
    html += `<tr class="total-row" style="background:#fff3e0;"><td>Total Expenses</td><td class="text-right">${fmt(profitLoss.totalExpense)}</td></tr>`;
    html += '</table></div></div>';
    // Difference summary
    const diffColor = profitLoss.netProfit === 0 ? '#666' : profitLoss.isProfit ? '#16a34a' : '#dc2626';
    html += `<div class="diff-box" style="border-color:${diffColor};">`;
    html += `<span>Total Income: ${fmt(profitLoss.totalIncome)}</span> &nbsp;−&nbsp; <span>Total Expense: ${fmt(profitLoss.totalExpense)}</span> &nbsp;=&nbsp; `;
    html += `<span style="color:${diffColor};font-size:13px;">${profitLoss.netProfit === 0 ? 'Difference: ₹0.00' : (profitLoss.isProfit ? 'Net Profit: ' : 'Net Loss: ') + fmt(Math.abs(profitLoss.netProfit))}</span>`;
    html += '</div>';
    handlePrintReport('Profit & Loss Account', html);
  };

  const printBalanceSheet = () => {
    if (!balanceSheet) return;
    let html = '<div style="display:flex;gap:16px;"><div style="flex:1;">';
    html += '<div class="section-title">ASSETS</div><table><tr><th>Ledger</th><th class="text-right">Amount (₹)</th></tr>';
    balanceSheet.assets.forEach(a => { html += `<tr><td>${a.ledgerName}${a.subGroup ? ` <small>(${a.subGroup})</small>` : ''}</td><td class="text-right">${fmt(a.amount)}</td></tr>`; });
    html += `<tr class="total-row"><td>Total Assets</td><td class="text-right">${fmt(balanceSheet.totalAssets)}</td></tr></table></div>`;
    html += '<div style="flex:1;">';
    html += '<div class="section-title">LIABILITIES & CAPITAL</div><table><tr><th>Ledger</th><th class="text-right">Amount (₹)</th></tr>';
    balanceSheet.capital.forEach(c => { html += `<tr><td>${c.ledgerName}${c.subGroup ? ` <small>(${c.subGroup})</small>` : ''}</td><td class="text-right">${fmt(c.amount)}</td></tr>`; });
    balanceSheet.liabilities.forEach(l => { html += `<tr><td>${l.ledgerName}${l.subGroup ? ` <small>(${l.subGroup})</small>` : ''}</td><td class="text-right">${fmt(l.amount)}</td></tr>`; });
    html += `<tr class="total-row"><td>Total Liabilities + Capital</td><td class="text-right">${fmt(balanceSheet.liabilitiesPlusCapital)}</td></tr></table></div></div>`;
    const bal = balanceSheet.difference === 0 ? '<p style="text-align:center;color:#16a34a;font-weight:bold;margin-top:8px;">✓ Balance Sheet is Balanced</p>' : `<p style="text-align:center;color:#dc2626;font-weight:bold;margin-top:8px;">⚠ Difference: ${fmt(Math.abs(balanceSheet.difference))}</p>`;
    handlePrintReport('Balance Sheet', html + bal);
  };

  const printMonthlyPL = () => {
    if (monthlyPL.length === 0) return;
    let rows = monthlyPL.map(m =>
      `<tr><td>${m.month}</td><td class="text-right">${m.totalIncome > 0 ? fmt(m.totalIncome) : '-'}</td><td class="text-right">${m.totalExpense > 0 ? fmt(m.totalExpense) : '-'}</td><td class="text-right ${m.isProfit ? 'profit' : 'loss'}">${Math.abs(m.netProfit) > 0.01 ? fmt(m.netProfit) : '-'}</td><td class="text-center">${m.isProfit ? 'Profit' : 'Loss'}</td></tr>`
    ).join('');
    const ti = monthlyPL.reduce((s, m) => s + m.totalIncome, 0);
    const te = monthlyPL.reduce((s, m) => s + m.totalExpense, 0);
    rows += `<tr class="total-row"><td>YEARLY TOTAL</td><td class="text-right">${fmt(ti)}</td><td class="text-right">${fmt(te)}</td><td class="text-right">${fmt(ti - te)}</td><td class="text-center">${ti >= te ? 'NET PROFIT' : 'NET LOSS'}</td></tr>`;
    handlePrintReport('Monthly Profit & Loss', `<table><tr><th>Month</th><th class="text-right">Income (₹)</th><th class="text-right">Expense (₹)</th><th class="text-right">Net P&L (₹)</th><th class="text-center">Status</th></tr>${rows}</table>`);
  };

  const printDayBook = () => {
    // If vouchers exist, print voucher-based daybook
    if (daybook.length > 0) {
      let rows = daybook.map((e: any) =>
        `<tr><td>${new Date(e.date).toLocaleDateString('en-IN')}</td><td>${e.voucherNumber}</td><td>${e.type}</td><td>${e.entries?.map((en: any) => en.ledgerName).join(' / ') || ''}${e.narration ? '<br/><small>' + e.narration + '</small>' : ''}</td><td class="text-right">${fmt(e.totalAmount)}</td></tr>`
      ).join('');
      handlePrintReport('Day Book', `<table><tr><th>Date</th><th>Voucher</th><th>Type</th><th>Particulars</th><th class="text-right">Amount (₹)</th></tr>${rows}</table>`);
      return;
    }
    // If CA Report summary, print grouped ledger data
    if (daybookLedgerSummary && daybookLedgerSummary.length > 0) {
      let html = '<h3 style="text-align:center;margin-bottom:12px">CA Report Summary — Annual Totals</h3>';
      for (const group of daybookLedgerSummary) {
        html += `<div class="section-title" style="background:#f5f5f5;padding:8px;margin-top:12px;font-weight:bold">${group.label} (${group.group})</div>`;
        html += '<table style="width:100%;margin-bottom:8px"><tr><th style="text-align:left">Ledger</th><th style="text-align:left">Sub-Group</th><th style="text-align:right">Amount (₹)</th><th>Type</th></tr>';
        for (const l of group.ledgers) {
          html += `<tr><td>${l.name}</td><td>${l.subGroup}</td><td style="text-align:right">${fmt(l.amount)}</td><td>${l.type}</td></tr>`;
        }
        html += `<tr style="font-weight:bold;border-top:2px solid #333"><td colspan="2">Sub-Total</td><td style="text-align:right">${group.totalDebit > 0 ? 'Dr: ' + fmt(group.totalDebit) : ''}${group.totalDebit > 0 && group.totalCredit > 0 ? ' | ' : ''}${group.totalCredit > 0 ? 'Cr: ' + fmt(group.totalCredit) : ''}</td><td></td></tr>`;
        html += '</table>';
      }
      const gd = daybookLedgerSummary.reduce((s: number, g: any) => s + g.totalDebit, 0);
      const gc = daybookLedgerSummary.reduce((s: number, g: any) => s + g.totalCredit, 0);
      html += `<div style="margin-top:16px;padding:8px;background:#e8e8e8;font-weight:bold">Grand Total — Debit: ${fmt(gd)} | Credit: ${fmt(gc)}</div>`;
      handlePrintReport(`Day Book — FY ${fy} (CA Report)`, html);
      return;
    }
  };

  // ── CA Audit View ─────────────────────────────────────────────────

  const CAAuditView = () => {
    if (!caAudit) return <div className="text-gray-500 text-center py-12">Loading CA Audit Report...</div>;

    const printFullAudit = () => {
      let html = '';
      // Company info
      html += '<div class="section-title">AUDIT SUMMARY</div>';
      html += `<table><tr><th>Parameter</th><th>Value</th></tr>`;
      html += `<tr><td>Company</td><td>${caAudit.companyName}</td></tr>`;
      html += `<tr><td>Financial Year</td><td>${caAudit.financialYear}</td></tr>`;
      html += `<tr><td>Report Generated</td><td>${new Date(caAudit.generatedAt).toLocaleString('en-IN')}</td></tr>`;
      html += `<tr><td>Bills Attached</td><td>${caAudit.billsAttached}</td></tr>`;
      html += `<tr><td>Bills Missing</td><td>${caAudit.billsMissing}</td></tr>`;
      html += `</table>`;

      // Trial Balance
      if (caAudit.trialBalance) {
        html += '<div class="section-title">TRIAL BALANCE</div><table><tr><th>Ledger</th><th>Group</th><th class="text-right">Debit (₹)</th><th class="text-right">Credit (₹)</th></tr>';
        caAudit.trialBalance.rows?.forEach((r: any) => { html += `<tr><td>${r.ledgerName}</td><td>${r.group}</td><td class="text-right">${r.closingDebit > 0 ? fmt(r.closingDebit) : '-'}</td><td class="text-right">${r.closingCredit > 0 ? fmt(r.closingCredit) : '-'}</td></tr>`; });
        html += `<tr class="total-row"><td colspan="2">Total</td><td class="text-right">${fmt(caAudit.trialBalance.totalDebit)}</td><td class="text-right">${fmt(caAudit.trialBalance.totalCredit)}</td></tr></table>`;
      }

      // P&L
      if (caAudit.profitLoss) {
        html += '<div class="section-title">PROFIT & LOSS</div><table><tr><th colspan="2">Income</th></tr>';
        caAudit.profitLoss.income?.forEach((i: any) => { html += `<tr><td>${i.ledgerName}</td><td class="text-right">${fmt(i.amount)}</td></tr>`; });
        html += `<tr class="total-row"><td>Total Income</td><td class="text-right">${fmt(caAudit.profitLoss.totalIncome)}</td></tr>`;
        html += '<tr><th colspan="2">Expenses</th></tr>';
        caAudit.profitLoss.expenses?.forEach((e: any) => { html += `<tr><td>${e.ledgerName}</td><td class="text-right">${fmt(e.amount)}</td></tr>`; });
        html += `<tr class="total-row"><td>Total Expenses</td><td class="text-right">${fmt(caAudit.profitLoss.totalExpense)}</td></tr>`;
        html += `<tr class="total-row"><td><strong>${caAudit.profitLoss.isProfit ? 'Net Profit' : 'Net Loss'}</strong></td><td class="text-right ${caAudit.profitLoss.isProfit ? 'profit' : 'loss'}"><strong>${fmt(Math.abs(caAudit.profitLoss.netProfit))}</strong></td></tr></table>`;
      }

      // Ledger-wise
      if (caAudit.ledgerWise?.length) {
        html += '<div class="section-title">LEDGER-WISE DETAILS</div><table><tr><th>Ledger</th><th>Group</th><th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Closing</th><th>Type</th></tr>';
        caAudit.ledgerWise.forEach((l: any) => { html += `<tr><td>${l.name}</td><td>${l.group}</td><td class="text-right">${fmt(l.debit)}</td><td class="text-right">${fmt(l.credit)}</td><td class="text-right">${fmt(l.closing)}</td><td>${l.closingType}</td></tr>`; });
        html += '</table>';
      }

      // Cash Flow
      if (caAudit.cashFlowSummary) {
        const cf = caAudit.cashFlowSummary;
        html += '<div class="section-title">CASH FLOW SUMMARY</div><table>';
        html += `<tr><td>Total Receipts</td><td class="text-right">${fmt(cf.totalReceipts)}</td></tr>`;
        html += `<tr><td>Total Payments</td><td class="text-right">${fmt(cf.totalPayments)}</td></tr>`;
        html += `<tr class="total-row"><td>Closing Cash/Bank</td><td class="text-right">${fmt(cf.closingCash)}</td></tr></table>`;
      }

      // Voucher Summary
      if (caAudit.voucherSummary?.length) {
        html += '<div class="section-title">VOUCHER SUMMARY</div><table><tr><th>Type</th><th class="text-right">Count</th><th class="text-right">Amount (₹)</th></tr>';
        caAudit.voucherSummary.forEach((v: any) => { html += `<tr><td>${v.type}</td><td class="text-right">${v.count}</td><td class="text-right">${fmt(v.totalAmount)}</td></tr>`; });
        html += '</table>';
      }

      // Pending Bills
      if (caAudit.pendingBills?.length) {
        html += '<div class="section-title">PENDING BILLS (Missing Receipts)</div><table><tr><th>Voucher</th><th>Date</th><th>Type</th><th class="text-right">Amount (₹)</th><th>Narration</th></tr>';
        caAudit.pendingBills.forEach((b: any) => { html += `<tr><td>${b.voucherNumber}</td><td>${new Date(b.date).toLocaleDateString('en-IN')}</td><td>${b.type}</td><td class="text-right">${fmt(b.amount)}</td><td>${b.narration || '-'}</td></tr>`; });
        html += '</table>';
      }

      handlePrintReport('CA Audit Report (Complete)', html);
    };

    return (
      <div className="space-y-4">
        {/* Header with download */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2"><Shield className="w-4 h-4" /> CA Audit Report — FY {fy}</h3>
          <button onClick={printFullAudit} className="px-4 py-2 bg-yellow-600 text-black text-sm rounded-lg hover:bg-yellow-500 flex items-center gap-2 font-semibold">
            <Printer className="w-4 h-4" /> Print / Download PDF
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-xs text-gray-500 mb-1">Company</div>
            <div className="text-lg font-bold text-white">{caAudit.companyName}</div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-xs text-gray-500 mb-1">Net P&L</div>
            <div className={`text-lg font-bold ${caAudit.profitLoss?.isProfit ? 'text-green-400' : 'text-red-400'}`}>
              {fmt(Math.abs(caAudit.profitLoss?.netProfit || 0))} {caAudit.profitLoss?.isProfit ? 'Profit' : 'Loss'}
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-xs text-gray-500 mb-1">Bills Attached</div>
            <div className="text-lg font-bold text-green-400">{caAudit.billsAttached}</div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="text-xs text-gray-500 mb-1">Bills Missing</div>
            <div className="text-lg font-bold text-red-400">{caAudit.billsMissing}</div>
          </div>
        </div>

        {/* Trial Balance Summary */}
        {caAudit.trialBalance && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Scale className="w-4 h-4" /> Trial Balance</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500">Total Debit</div>
                <div className="text-lg font-mono font-bold text-blue-400">{fmt(caAudit.trialBalance.totalDebit)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total Credit</div>
                <div className="text-lg font-mono font-bold text-red-400">{fmt(caAudit.trialBalance.totalCredit)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Difference</div>
                <div className={`text-lg font-mono font-bold ${caAudit.trialBalance.difference === 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {caAudit.trialBalance.difference === 0 ? '✓ Balanced' : fmt(Math.abs(caAudit.trialBalance.difference))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voucher Summary */}
        {caAudit.voucherSummary?.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><ClipboardList className="w-4 h-4" /> Voucher Summary</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50 text-gray-400">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Type</th>
                    <th className="px-4 py-2 text-right font-medium">Count</th>
                    <th className="px-4 py-2 text-right font-medium">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {caAudit.voucherSummary.map((v: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-800/50">
                      <td className="px-4 py-2"><span className={`text-xs font-medium px-2 py-0.5 rounded ${VOUCHER_COLORS[v.type] || 'text-gray-400 bg-gray-800'}`}>{v.type}</span></td>
                      <td className="px-4 py-2 text-right font-mono text-gray-300">{v.count}</td>
                      <td className="px-4 py-2 text-right font-mono text-yellow-400">{fmt(v.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Cash Flow Summary */}
        {caAudit.cashFlowSummary && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Wallet className="w-4 h-4" /> Cash Flow Summary</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg text-center">
                <div className="text-xs text-gray-500">Total Receipts</div>
                <div className="text-lg font-mono font-bold text-green-400">{fmt(caAudit.cashFlowSummary.totalReceipts)}</div>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg text-center">
                <div className="text-xs text-gray-500">Total Payments</div>
                <div className="text-lg font-mono font-bold text-red-400">{fmt(caAudit.cashFlowSummary.totalPayments)}</div>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                <div className="text-xs text-gray-500">Closing Cash/Bank</div>
                <div className="text-lg font-mono font-bold text-blue-400">{fmt(caAudit.cashFlowSummary.closingCash)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Ledger-wise Details */}
        {caAudit.ledgerWise?.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-800">
              <h4 className="text-sm font-semibold text-gray-400 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Ledger-wise Details ({caAudit.ledgerWise.length})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50 text-gray-400">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Ledger</th>
                    <th className="px-4 py-2 text-left font-medium">Group</th>
                    <th className="px-4 py-2 text-right font-medium">Debit (₹)</th>
                    <th className="px-4 py-2 text-right font-medium">Credit (₹)</th>
                    <th className="px-4 py-2 text-right font-medium">Closing</th>
                    <th className="px-4 py-2 text-center font-medium">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {caAudit.ledgerWise.map((l: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-800/50">
                      <td className="px-4 py-2 text-gray-200">{l.name}</td>
                      <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded ${GROUP_COLORS[l.group as AccountGroup] || ''}`}>{l.group}</span></td>
                      <td className="px-4 py-2 text-right font-mono text-blue-400">{l.debit > 0 ? fmt(l.debit) : '-'}</td>
                      <td className="px-4 py-2 text-right font-mono text-red-400">{l.credit > 0 ? fmt(l.credit) : '-'}</td>
                      <td className="px-4 py-2 text-right font-mono text-yellow-400">{fmt(l.closing)}</td>
                      <td className="px-4 py-2 text-center text-gray-400">{l.closingType}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pending Bills */}
        {caAudit.pendingBills?.length > 0 && (
          <div className="bg-gray-900 rounded-xl border border-red-800/50 overflow-hidden">
            <div className="px-4 py-3 bg-red-500/10 border-b border-red-800/50">
              <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Pending Bills — Missing Receipts ({caAudit.pendingBills.length})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50 text-gray-400">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Voucher</th>
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-left font-medium">Type</th>
                    <th className="px-4 py-2 text-right font-medium">Amount (₹)</th>
                    <th className="px-4 py-2 text-left font-medium">Narration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {caAudit.pendingBills.map((b: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-800/50">
                      <td className="px-4 py-2 font-mono text-xs text-gray-400">{b.voucherNumber}</td>
                      <td className="px-4 py-2 text-gray-400">{new Date(b.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-2"><span className={`text-xs font-medium px-2 py-0.5 rounded ${VOUCHER_COLORS[b.type] || ''}`}>{b.type}</span></td>
                      <td className="px-4 py-2 text-right font-mono text-yellow-400">{fmt(b.amount)}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{b.narration || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── CA Bills View ─────────────────────────────────────────────────

  const CABillsView = () => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const printBillsSummary = () => {
      if (bills.length === 0) return;
      let html = `<div class="section-title">Bills for ${monthNames[billsMonth - 1]} ${billsYear}</div>`;
      html += '<table><tr><th>Voucher</th><th>Date</th><th>Type</th><th>Party</th><th class="text-right">Amount (₹)</th><th>Bill File</th></tr>';
      bills.forEach((b: any) => {
        html += `<tr><td>${b.voucherNumber}</td><td>${new Date(b.date).toLocaleDateString('en-IN')}</td><td>${b.type}</td><td>${b.partyName || '-'}</td><td class="text-right">${fmt(b.amount)}</td><td>${b.receiptFileName || 'Attached'}</td></tr>`;
      });
      html += '</table>';
      html += `<p style="margin-top:12px;font-size:10px;color:#666;">Total Bills: ${bills.length}</p>`;
      handlePrintReport(`Bills — ${monthNames[billsMonth - 1]} ${billsYear}`, html);
    };

    return (
      <div className="space-y-4">
        {/* Month selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Month:</label>
            <select value={billsMonth} onChange={e => setBillsMonth(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm">
              {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Year:</label>
            <select value={billsYear} onChange={e => setBillsYear(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm">
              {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={() => loadBills()} className="px-4 py-1.5 bg-yellow-600 text-black text-sm rounded-lg hover:bg-yellow-500 flex items-center gap-2 font-semibold">
            <Search className="w-4 h-4" /> Load Bills
          </button>
          {bills.length > 0 && (
            <button onClick={printBillsSummary} className="px-4 py-1.5 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-600 flex items-center gap-2">
              <Download className="w-4 h-4" /> Download PDF Summary
            </button>
          )}
        </div>

        {/* Bills grid */}
        {bills.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bills.map((bill: any, i: number) => (
              <div key={i} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-yellow-600/50 transition-colors">
                {/* Bill preview / thumbnail */}
                <div className="h-40 bg-gray-800 flex items-center justify-center relative cursor-pointer group"
                  onClick={() => setPreviewUrl(bill.receiptFileUrl)}>
                  {bill.receiptFileUrl?.match(/\.(jpg|jpeg|png|webp|heic)$/i) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bill.receiptFileUrl} alt={bill.receiptFileName || 'Bill'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <FileText className="w-10 h-10 text-gray-600 mx-auto" />
                      <span className="text-xs text-gray-500 mt-1 block">{bill.receiptFileName || 'PDF'}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <Eye className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                {/* Bill info */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${VOUCHER_COLORS[bill.type] || 'text-gray-400 bg-gray-800'}`}>{bill.type}</span>
                    <span className="text-sm font-mono text-yellow-400">{fmt(bill.amount)}</span>
                  </div>
                  <div className="text-xs text-gray-400">{bill.voucherNumber} • {new Date(bill.date).toLocaleDateString('en-IN')}</div>
                  {bill.narration && <div className="text-xs text-gray-500 mt-0.5 truncate">{bill.narration}</div>}
                  <div className="flex gap-2 mt-2">
                    <a href={bill.receiptFileUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-center px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded flex items-center justify-center gap-1">
                      <Eye className="w-3 h-3" /> View
                    </a>
                    <a href={bill.receiptFileUrl} download={bill.receiptFileName}
                      className="flex-1 text-center px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded flex items-center justify-center gap-1">
                      <Download className="w-3 h-3" /> Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            <Image className="w-10 h-10 mx-auto mb-3 text-gray-700" />
            No bills found for {monthNames[billsMonth - 1]} {billsYear}. Upload bills when creating vouchers.
          </div>
        )}

        {/* Bill preview modal */}
        {previewUrl && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
            <div className="max-w-4xl max-h-[90vh] overflow-auto bg-gray-900 rounded-xl border border-gray-800 p-2" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-2 mb-2">
                <span className="text-sm text-gray-400">Bill Preview</span>
                <div className="flex gap-2">
                  <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Open Full
                  </a>
                  <button onClick={() => setPreviewUrl(null)} className="text-gray-400 hover:text-white text-lg px-2">×</button>
                </div>
              </div>
              {previewUrl.match(/\.(jpg|jpeg|png|webp|heic)$/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Bill" className="max-w-full rounded" />
              ) : (
                <iframe src={previewUrl} className="w-full h-[80vh] rounded" title="Bill PDF" />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const SettingsView = () => {
    const [setupCode, setSetupCode] = useState('2024-25');
    const [setupStart, setSetupStart] = useState('2023-04-01');
    const [setupEnd, setSetupEnd] = useState('2024-03-31');
    const [setting, setSetting] = useState(false);
    const [setupMsg, setSetupMsg] = useState('');

    // Year-end closing & carry forward
    const [closingFY, setClosingFY] = useState('2023-24');
    const [nextFYCode, setNextFYCode] = useState('2024-25');
    const [nextStart, setNextStart] = useState('2024-04-01');
    const [nextEnd, setNextEnd] = useState('2025-03-31');
    const [closing, setClosing] = useState(false);
    const [carrying, setCarrying] = useState(false);
    const [closeMsg, setCloseMsg] = useState('');
    const [carryResult, setCarryResult] = useState<any>(null);

    // Tally Prime Desktop connection
    const [desktopTesting, setDesktopTesting] = useState(false);
    const [desktopConnected, setDesktopConnected] = useState<boolean | null>(null);
    const [desktopInfo, setDesktopInfo] = useState<any>(null);
    const [desktopError, setDesktopError] = useState('');
    const [desktopSyncing, setDesktopSyncing] = useState(false);
    const [desktopSyncMsg, setDesktopSyncMsg] = useState('');
    const [desktopLedgers, setDesktopLedgers] = useState<any[]>([]);
    const [desktopPL, setDesktopPL] = useState<any>(null);
    const [desktopBS, setDesktopBS] = useState<any>(null);
    const [showDesktopData, setShowDesktopData] = useState<'none' | 'ledgers' | 'pl' | 'bs'>('none');
    const [desktopFetching, setDesktopFetching] = useState(false);

    const testDesktopConnection = async () => {
      setDesktopTesting(true);
      setDesktopError('');
      setDesktopConnected(null);
      setDesktopInfo(null);
      try {
        const data = await apiFetch('/api/admin/crm/tally?action=test');
        if (data?.connection?.connected) {
          setDesktopConnected(true);
          setDesktopInfo({ ...data.connection, config: data.config });
        } else {
          setDesktopConnected(false);
          setDesktopError(data?.connection?.error || 'Cannot connect to Tally Prime Desktop');
        }
      } catch (e: any) {
        setDesktopConnected(false);
        setDesktopError(e.message || 'Connection failed');
      }
      setDesktopTesting(false);
    };

    const fetchDesktopLedgers = async () => {
      setDesktopFetching(true);
      setShowDesktopData('ledgers');
      try {
        const data = await apiFetch('/api/admin/crm/tally?action=ledgers');
        setDesktopLedgers(data?.ledgers || []);
      } catch (e: any) { setDesktopError(e.message); }
      setDesktopFetching(false);
    };

    const fetchDesktopPL = async () => {
      setDesktopFetching(true);
      setShowDesktopData('pl');
      try {
        const data = await apiFetch(`/api/admin/crm/tally?action=profitloss&fy=${fy}`);
        setDesktopPL(data);
      } catch (e: any) { setDesktopError(e.message); }
      setDesktopFetching(false);
    };

    const fetchDesktopBS = async () => {
      setDesktopFetching(true);
      setShowDesktopData('bs');
      try {
        const data = await apiFetch(`/api/admin/crm/tally?action=balancesheet&fy=${fy}`);
        setDesktopBS(data);
      } catch (e: any) { setDesktopError(e.message); }
      setDesktopFetching(false);
    };

    const runDesktopSync = async () => {
      if (!confirm('Sync all data from Tally Prime Desktop to MongoDB?\n\nThis will pull latest ledgers and vouchers from your desktop Tally Prime installation.')) return;
      setDesktopSyncing(true);
      setDesktopSyncMsg('');
      try {
        const data = await apiFetch('/api/admin/crm/tally', {
          method: 'POST',
          body: JSON.stringify({ action: 'sync' }),
        });
        if (data?.success) {
          setDesktopSyncMsg(`✅ Synced ${data.ledgerCount || 0} ledgers and ${data.voucherCount || 0} vouchers (${data.durationMs || 0}ms)`);
        } else {
          setDesktopSyncMsg(`❌ ${data?.error || 'Sync failed'}`);
        }
      } catch (e: any) { setDesktopSyncMsg(`❌ ${e.message}`); }
      setDesktopSyncing(false);
    };

    const handleSetup = async () => {
      setSetting(true);
      setSetupMsg('');
      try {
        const data = await apiFetch('/api/tally/setup', {
          method: 'POST',
          body: JSON.stringify({ code: setupCode, startDate: setupStart, endDate: setupEnd }),
        });
        setSetupMsg(data?.message || 'Setup complete!');
        setFy(setupCode);
      } catch (e: any) { setError(e.message); }
      setSetting(false);
    };

    const handleCarryForward = async () => {
      if (!confirm(`Carry forward balances from FY ${closingFY} → FY ${nextFYCode}?\n\nThis will:\n• Carry forward Asset/Liability/Capital closing balances as opening in FY ${nextFYCode}\n• Transfer Net P/L → Reserves & Surplus\n• Income/Expense ledgers start fresh (zero)\n\nFY ${closingFY} will remain OPEN (not locked).`)) return;
      setCarrying(true);
      setCloseMsg('');
      setCarryResult(null);
      try {
        const data = await apiFetch('/api/tally/reports', {
          method: 'POST',
          body: JSON.stringify({
            action: 'carry-forward',
            currentFY: closingFY,
            nextFY: nextFYCode,
            nextStartDate: nextStart,
            nextEndDate: nextEnd,
          }),
        });
        setCloseMsg(data?.message || 'Balances carried forward!');
        setCarryResult(data);
      } catch (e: any) { setError(e.message); }
      setCarrying(false);
    };

    const handleCloseYear = async () => {
      if (!confirm(`Are you sure you want to CLOSE & LOCK FY ${closingFY}?\n\nThis will:\n1. Carry forward ALL Balance Sheet ledgers to FY ${nextFYCode}\n2. Transfer Net Profit/Loss → Reserves & Surplus\n3. Income/Expense ledgers start fresh (zero) in FY ${nextFYCode}\n4. LOCK FY ${closingFY} (no more vouchers can be added)\n\nThis action cannot be easily undone.`)) return;
      setClosing(true);
      setCloseMsg('');
      setCarryResult(null);
      try {
        const data = await apiFetch('/api/tally/reports', {
          method: 'POST',
          body: JSON.stringify({
            action: 'close-year',
            currentFY: closingFY,
            nextFY: nextFYCode,
            nextStartDate: nextStart,
            nextEndDate: nextEnd,
          }),
        });
        setCloseMsg(data?.message || 'Year closed successfully!');
        setCarryResult(data);
        setFyLocked(true);
        setFy(nextFYCode);
        clearAllCachedData();
      } catch (e: any) { setError(e.message); }
      setClosing(false);
    };

    return (
      <div className="max-w-lg mx-auto space-y-6">

        {/* ── Tally Prime Desktop Connection ── */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cyan-500" /> Tally Prime Desktop
          </h3>
          <p className="text-sm text-gray-500">
            Connect directly to your Tally Prime Desktop (HTTP/XML API on port 9000) to pull live accounting data.
          </p>

          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${desktopConnected === true ? 'bg-green-500 animate-pulse' : desktopConnected === false ? 'bg-red-500' : 'bg-gray-600'}`} />
              <div>
                <div className="text-sm font-medium text-white">
                  {desktopConnected === true ? 'Connected' : desktopConnected === false ? 'Disconnected' : 'Not Tested'}
                </div>
                <div className="text-xs text-gray-500">http://localhost:9000</div>
              </div>
            </div>
            <button onClick={testDesktopConnection} disabled={desktopTesting}
              className="px-3 py-1.5 bg-cyan-600 text-white text-xs rounded-lg hover:bg-cyan-500 disabled:opacity-50 flex items-center gap-1.5 font-medium">
              <RefreshCw className={`w-3.5 h-3.5 ${desktopTesting ? 'animate-spin' : ''}`} />
              {desktopTesting ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {/* Connection Info */}
          {desktopConnected && desktopInfo && (
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-sm space-y-1">
              <div className="flex items-center gap-1.5 text-green-300 font-semibold">
                <CheckCircle className="w-4 h-4" /> Connected to Tally Prime
              </div>
              <div className="text-xs text-green-400/80 space-y-0.5">
                <div>Company: <span className="text-green-300">{desktopInfo.companyName || desktopInfo.config?.companyName || '-'}</span></div>
                <div>Version: <span className="text-green-300">{desktopInfo.tallyVersion || 'Tally Prime'}</span></div>
                {desktopInfo.config?.serialNumber && <div>Serial: <span className="text-green-300">{desktopInfo.config.serialNumber}</span></div>}
              </div>
            </div>
          )}

          {/* Connection Error */}
          {desktopConnected === false && desktopError && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-sm">
              <div className="flex items-center gap-1.5 text-red-300 font-semibold mb-1">
                <AlertTriangle className="w-4 h-4" /> Connection Failed
              </div>
              <div className="text-xs text-red-400/80">{desktopError}</div>
              <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                <div>Make sure:</div>
                <div>• Tally Prime is running on your computer</div>
                <div>• Go to F12 → Advanced → Enable ODBC Server</div>
                <div>• Port 9000 is accessible</div>
              </div>
            </div>
          )}

          {/* Action Buttons (shown when connected) */}
          {desktopConnected && (
            <>
              <div className="border-t border-gray-800 pt-3">
                <div className="text-sm font-medium text-gray-300 mb-2">📊 Fetch Live Data from Desktop</div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={fetchDesktopLedgers} disabled={desktopFetching}
                    className="px-3 py-2 bg-blue-600/20 border border-blue-600/40 text-blue-300 rounded-lg hover:bg-blue-600/30 flex items-center gap-1.5 text-xs font-medium disabled:opacity-50">
                    <BookOpen className="w-3.5 h-3.5" /> Ledgers
                  </button>
                  <button onClick={fetchDesktopPL} disabled={desktopFetching}
                    className="px-3 py-2 bg-green-600/20 border border-green-600/40 text-green-300 rounded-lg hover:bg-green-600/30 flex items-center gap-1.5 text-xs font-medium disabled:opacity-50">
                    <TrendingUp className="w-3.5 h-3.5" /> Profit &amp; Loss
                  </button>
                  <button onClick={fetchDesktopBS} disabled={desktopFetching}
                    className="px-3 py-2 bg-purple-600/20 border border-purple-600/40 text-purple-300 rounded-lg hover:bg-purple-600/30 flex items-center gap-1.5 text-xs font-medium disabled:opacity-50">
                    <PieChart className="w-3.5 h-3.5" /> Balance Sheet
                  </button>
                  <button onClick={runDesktopSync} disabled={desktopSyncing}
                    className="px-3 py-2 bg-yellow-600/20 border border-yellow-600/40 text-yellow-300 rounded-lg hover:bg-yellow-600/30 flex items-center gap-1.5 text-xs font-medium disabled:opacity-50">
                    <Download className="w-3.5 h-3.5" /> {desktopSyncing ? 'Syncing...' : 'Full Sync'}
                  </button>
                </div>
              </div>

              {/* Sync Message */}
              {desktopSyncMsg && (
                <div className={`p-2 rounded-lg text-xs ${desktopSyncMsg.startsWith('✅') ? 'bg-green-900/30 border border-green-700/50 text-green-300' : 'bg-red-900/30 border border-red-700/50 text-red-300'}`}>
                  {desktopSyncMsg}
                </div>
              )}

              {/* Loading indicator */}
              {desktopFetching && (
                <div className="text-center py-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-cyan-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">Fetching from Tally Prime Desktop...</p>
                </div>
              )}

              {/* Desktop Ledgers List */}
              {showDesktopData === 'ledgers' && !desktopFetching && desktopLedgers.length > 0 && (
                <div className="border-t border-gray-800 pt-3">
                  <div className="text-sm font-medium text-blue-300 mb-2 flex items-center justify-between">
                    <span>📋 Desktop Ledgers ({desktopLedgers.length})</span>
                    <button onClick={() => setShowDesktopData('none')} className="text-xs text-gray-500 hover:text-gray-300">✕ Close</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1 text-xs">
                    {desktopLedgers.map((l: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                        <div>
                          <span className="text-white">{l.name}</span>
                          <span className="text-gray-500 ml-2">({l.parent})</span>
                        </div>
                        <span className={l.closingBalance >= 0 ? 'text-blue-400' : 'text-red-400'}>
                          {fmt(l.closingBalance)} {l.closingBalance >= 0 ? 'Dr' : 'Cr'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Desktop P&L */}
              {showDesktopData === 'pl' && !desktopFetching && desktopPL && (
                <div className="border-t border-gray-800 pt-3">
                  <div className="text-sm font-medium text-green-300 mb-2 flex items-center justify-between">
                    <span>📊 Desktop P&amp;L</span>
                    <button onClick={() => setShowDesktopData('none')} className="text-xs text-gray-500 hover:text-gray-300">✕ Close</button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2 bg-green-900/20 rounded">
                      <span className="text-green-400">Total Income</span>
                      <span className="text-green-300 font-semibold">{fmt(desktopPL.totalIncome || 0)}</span>
                    </div>
                    {desktopPL.income?.map((g: any, i: number) => (
                      <div key={i} className="ml-3">
                        <div className="text-gray-400 font-medium">{g.name}: {fmt(g.amount)}</div>
                        {g.children?.map((c: any, j: number) => (
                          <div key={j} className="ml-3 flex justify-between text-gray-500">
                            <span>{c.name}</span><span>{fmt(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="flex justify-between p-2 bg-red-900/20 rounded">
                      <span className="text-red-400">Total Expenses</span>
                      <span className="text-red-300 font-semibold">{fmt(desktopPL.totalExpenses || 0)}</span>
                    </div>
                    {desktopPL.expenses?.map((g: any, i: number) => (
                      <div key={i} className="ml-3">
                        <div className="text-gray-400 font-medium">{g.name}: {fmt(g.amount)}</div>
                        {g.children?.map((c: any, j: number) => (
                          <div key={j} className="ml-3 flex justify-between text-gray-500">
                            <span>{c.name}</span><span>{fmt(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className={`flex justify-between p-2 rounded font-semibold ${(desktopPL.netProfit || 0) >= 0 ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                      <span>Net {(desktopPL.netProfit || 0) >= 0 ? 'Profit' : 'Loss'}</span>
                      <span>{fmt(desktopPL.netProfit || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop Balance Sheet */}
              {showDesktopData === 'bs' && !desktopFetching && desktopBS && (
                <div className="border-t border-gray-800 pt-3">
                  <div className="text-sm font-medium text-purple-300 mb-2 flex items-center justify-between">
                    <span>📊 Desktop Balance Sheet</span>
                    <button onClick={() => setShowDesktopData('none')} className="text-xs text-gray-500 hover:text-gray-300">✕ Close</button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between p-2 bg-blue-900/20 rounded">
                      <span className="text-blue-400">Total Assets</span>
                      <span className="text-blue-300 font-semibold">{fmt(desktopBS.totalAssets || 0)}</span>
                    </div>
                    {desktopBS.assets?.map((g: any, i: number) => (
                      <div key={i} className="ml-3">
                        <div className="text-gray-400 font-medium">{g.name}: {fmt(g.amount)}</div>
                        {g.children?.map((c: any, j: number) => (
                          <div key={j} className="ml-3 flex justify-between text-gray-500">
                            <span>{c.name}</span><span>{fmt(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="flex justify-between p-2 bg-red-900/20 rounded">
                      <span className="text-red-400">Total Liabilities</span>
                      <span className="text-red-300 font-semibold">{fmt(desktopBS.totalLiabilities || 0)}</span>
                    </div>
                    {desktopBS.liabilities?.map((g: any, i: number) => (
                      <div key={i} className="ml-3">
                        <div className="text-gray-400 font-medium">{g.name}: {fmt(g.amount)}</div>
                        {g.children?.map((c: any, j: number) => (
                          <div key={j} className="ml-3 flex justify-between text-gray-500">
                            <span>{c.name}</span><span>{fmt(c.amount)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className={`flex justify-between p-2 rounded font-semibold ${Math.abs(desktopBS.difference || 0) < 1 ? 'bg-green-900/30 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                      <span>Difference</span>
                      <span>{fmt(desktopBS.difference || 0)}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Config Reference */}
          <div className="border-t border-gray-800 pt-3">
            <div className="text-xs text-gray-600 space-y-0.5">
              <div className="font-medium text-gray-500 mb-1">Configured in .env.local:</div>
              <div>TALLY_PRIME_URL = http://localhost:9000</div>
              <div>TALLY_PRIME_COMPANY_NAME = Upamnyu International Education P.ltd</div>
              <div>TALLY_PRIME_CONFIGURED = true</div>
            </div>
          </div>
        </div>

        {/* Setup FY */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-yellow-500" /> Setup Financial Year</h3>
          <p className="text-sm text-gray-500">Create a Financial Year and seed default account groups (Cash-in-Hand, Bank Accounts, Capital Reserve, Retained Earnings, etc.)</p>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">FY Code</label>
            <input value={setupCode} onChange={e => setSetupCode(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500" placeholder="2023-24" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Start Date</label>
              <input type="date" value={setupStart} onChange={e => setSetupStart(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">End Date</label>
              <input type="date" value={setupEnd} onChange={e => setSetupEnd(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <button onClick={handleSetup} disabled={setting}
            className="w-full px-4 py-2.5 bg-yellow-600 text-black text-sm rounded-lg hover:bg-yellow-500 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold">
            <Building2 className="w-4 h-4" />{setting ? 'Setting up...' : 'Create FY & Seed Groups'}
          </button>

          {setupMsg && (
            <div className="p-3 bg-green-900/40 border border-green-700 rounded-lg text-sm text-green-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {setupMsg}
            </div>
          )}
        </div>

        {/* Year-End Closing & Carry Forward */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><Scale className="w-5 h-5 text-yellow-500" /> Year-End Closing &amp; Carry Forward</h3>
          <p className="text-sm text-gray-500">
            Tally Prime compatible year-end process:
          </p>
          <ul className="text-xs text-gray-500 list-disc list-inside space-y-1">
            <li><strong className="text-gray-300">Asset / Liability / Capital</strong> → Closing balance becomes opening balance in next FY</li>
            <li><strong className="text-gray-300">Income / Expense</strong> → Reset to zero (fresh start in new FY)</li>
            <li><strong className="text-gray-300">Net P/L</strong> → Transferred to &quot;Reserves &amp; Surplus&quot; (retained earnings)</li>
          </ul>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Current FY</label>
              <input value={closingFY} onChange={e => setClosingFY(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500" placeholder="2023-24" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Next FY Code</label>
              <input value={nextFYCode} onChange={e => setNextFYCode(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500" placeholder="2024-25" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Next FY Start</label>
              <input type="date" value={nextStart} onChange={e => setNextStart(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Next FY End</label>
              <input type="date" value={nextEnd} onChange={e => setNextEnd(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Two action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleCarryForward} disabled={carrying || closing}
              className="px-4 py-2.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium">
              <ArrowRight className="w-4 h-4" />{carrying ? 'Carrying...' : 'Carry Forward'}
            </button>
            <button onClick={handleCloseYear} disabled={closing || carrying}
              className="px-4 py-2.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium">
              <Lock className="w-4 h-4" />{closing ? 'Closing...' : 'Close & Lock FY'}
            </button>
          </div>

          <div className="flex gap-2 text-xs">
            <div className="flex-1 p-2 bg-blue-900/20 border border-blue-800/40 rounded-lg text-blue-400">
              <strong>Carry Forward:</strong> Creates ledgers in next FY without locking current FY. Can re-run to update.
            </div>
            <div className="flex-1 p-2 bg-red-900/20 border border-red-800/40 rounded-lg text-red-400">
              <strong>Close &amp; Lock:</strong> Carry forward + permanently locks FY {closingFY}. No more vouchers.
            </div>
          </div>

          {closeMsg && (
            <div className="p-3 bg-green-900/40 border border-green-700 rounded-lg text-sm text-green-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {closeMsg}
            </div>
          )}

          {/* Carry Forward Result Details */}
          {carryResult && (
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 space-y-3">
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Carry Forward Summary
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-gray-800 rounded">
                  <div className="text-gray-500">FY Carried</div>
                  <div className="text-white font-semibold">{carryResult.currentFY} → {carryResult.nextFY}</div>
                </div>
                <div className="p-2 bg-gray-800 rounded">
                  <div className="text-gray-500">Ledgers</div>
                  <div className="text-white font-semibold">{carryResult.ledgersCarriedForward} new, {carryResult.ledgersUpdated} updated</div>
                </div>
                <div className="p-2 bg-gray-800 rounded">
                  <div className="text-gray-500">Total Income</div>
                  <div className="text-green-400 font-semibold">{fmt(carryResult.totalIncome || 0)}</div>
                </div>
                <div className="p-2 bg-gray-800 rounded">
                  <div className="text-gray-500">Total Expense</div>
                  <div className="text-red-400 font-semibold">{fmt(carryResult.totalExpense || 0)}</div>
                </div>
                <div className={`p-2 rounded col-span-2 ${carryResult.isProfit ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
                  <div className="text-gray-400">Net {carryResult.isProfit ? 'Profit' : 'Loss'} → Reserves &amp; Surplus</div>
                  <div className={`text-lg font-bold ${carryResult.isProfit ? 'text-green-400' : 'text-red-400'}`}>
                    {fmt(Math.abs(carryResult.netProfit || 0))}
                  </div>
                </div>
              </div>

              {/* Carried Ledger List */}
              {carryResult.carriedLedgers?.length > 0 && (
                <details className="text-xs">
                  <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
                    View {carryResult.carriedLedgers.length} carried ledgers
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                    {carryResult.carriedLedgers.map((l: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-1.5 bg-gray-800 rounded">
                        <div>
                          <span className="text-white">{l.name}</span>
                          <span className="text-gray-600 ml-1.5">({l.group})</span>
                        </div>
                        <span className={l.openingBalanceType === 'DEBIT' ? 'text-blue-400' : 'text-orange-400'}>
                          {fmt(l.openingBalance)} {l.openingBalanceType === 'DEBIT' ? 'Dr' : 'Cr'}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* GST Settings */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><IndianRupee className="w-5 h-5 text-yellow-500" /> GST Settings</h3>
          <p className="text-sm text-gray-500">Enable GST to auto-create CGST, SGST, IGST ledgers and show tax fields in voucher form.</p>

          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-white">GST Mode</div>
              <div className="text-xs text-gray-500">When enabled, GST input/output ledgers are created and tax fields appear in voucher form</div>
            </div>
            <button onClick={async () => {
              if (!gstEnabled) {
                // Seed GST ledgers when enabling
                try {
                  await apiFetch('/api/tally/setup', { method: 'PATCH', body: JSON.stringify({ action: 'seed-gst', fy }) });
                  setGstEnabled(true);
                } catch (e: any) { setError(e.message); }
              } else {
                setGstEnabled(false);
              }
            }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${gstEnabled ? 'bg-green-600' : 'bg-gray-600'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${gstEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {gstEnabled && (
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-xs text-green-300 space-y-1">
              <div className="font-semibold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> GST Ledgers Active</div>
              <div className="text-green-400/70">CGST Input/Output, SGST Input/Output, IGST Input/Output ledgers created under Duties & Taxes / Current Assets.</div>
            </div>
          )}
        </div>

        {/* Tally Import / Export */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2"><Download className="w-5 h-5 text-yellow-500" /> Import / Export</h3>
          <p className="text-sm text-gray-500">Import from or export to Tally Prime (XML format compatible with all versions). Also supports JSON backup.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export XML */}
            <button onClick={async () => {
              try {
                const res = await fetch(`/api/tally/exchange?fy=${fy}&format=xml`, { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `TallyExport-${fy}.xml`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e: any) { setError(e.message); }
            }}
              className="px-4 py-3 bg-blue-600/20 border border-blue-600/40 text-blue-300 rounded-lg hover:bg-blue-600/30 flex items-center gap-2 text-sm font-medium">
              <Download className="w-4 h-4" /> Export Tally XML
            </button>

            {/* Export JSON */}
            <button onClick={async () => {
              try {
                const res = await fetch(`/api/tally/exchange?fy=${fy}&format=json`, { headers: { Authorization: `Bearer ${token}` } });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `TallyBackup-${fy}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e: any) { setError(e.message); }
            }}
              className="px-4 py-3 bg-purple-600/20 border border-purple-600/40 text-purple-300 rounded-lg hover:bg-purple-600/30 flex items-center gap-2 text-sm font-medium">
              <Download className="w-4 h-4" /> Export JSON Backup
            </button>
          </div>

          {/* Import */}
          <div className="border-t border-gray-800 pt-4">
            <div className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2"><Upload className="w-4 h-4" /> Import Tally Data</div>
            <p className="text-xs text-gray-500 mb-3">Import from Tally Prime (.xml), JSON backup (.json), or Tally Excel export (.xlsx). Existing data will not be deleted — duplicates are skipped.</p>
            <input type="file" accept=".xml,.json,.xlsx,.xls" id="tally-import-file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('fy', fy);
                  const res = await fetch('/api/tally/exchange', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                  });
                  const data = await res.json();
                  if (!data.success) throw new Error(data.error || 'Import failed');
                  const r = data.data;
                  alert(`Import Complete!\n\nGroups: ${r.groupsCreated || 0}\nLedgers: ${r.ledgersCreated || 0}\nVouchers: ${r.vouchersCreated || 0}${r.totalLedgerSections ? `\nLedger Sections Parsed: ${r.totalLedgerSections}` : ''}${r.errors?.length ? `\n\nWarnings/Errors: ${r.errors.length}\n${r.errors.slice(0, 5).join('\n')}${r.errors.length > 5 ? '\n...' : ''}` : ''}`);
                  // Refresh data
                  loadSummary();
                  loadLedgers();
                } catch (err: any) { setError(err.message); }
                // Reset input
                e.target.value = '';
              }}
              className="hidden" />
            <label htmlFor="tally-import-file"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-yellow-600 text-black text-sm rounded-lg hover:bg-yellow-500 font-semibold">
              <Upload className="w-4 h-4" /> Choose Tally File
            </label>
          </div>

          {/* Bank Statement Import */}
          <div className="border-t border-gray-800 pt-4">
            <div className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2"><Upload className="w-4 h-4" /> Import Bank Statement</div>
            <p className="text-xs text-gray-500 mb-3">Import bank statement PDF (password-protected supported) or pre-extracted .txt file. Transactions are auto-categorized into accounting ledgers.</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Bank Name</label>
                <input type="text" defaultValue="Kotak Mahindra Bank" id="bank-name-input"
                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">PDF Password (if any)</label>
                <input type="password" id="bank-pdf-password" placeholder="Leave blank if none"
                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">From Transaction #</label>
                <input type="number" defaultValue="105" id="bank-from-txn"
                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">To Transaction #</label>
                <input type="number" defaultValue="308" id="bank-to-txn"
                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Opening Balance (₹)</label>
                <input type="number" step="0.01" defaultValue="71280.60" id="bank-opening-bal"
                  className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-200" />
              </div>
            </div>
            <input type="file" accept=".pdf,.txt" id="bank-import-file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  formData.append('fy', fy);
                  formData.append('bankName', (document.getElementById('bank-name-input') as HTMLInputElement)?.value || 'Kotak Mahindra Bank');
                  formData.append('pdfPassword', (document.getElementById('bank-pdf-password') as HTMLInputElement)?.value || '');
                  formData.append('fromTxn', (document.getElementById('bank-from-txn') as HTMLInputElement)?.value || '105');
                  formData.append('toTxn', (document.getElementById('bank-to-txn') as HTMLInputElement)?.value || '308');
                  formData.append('openingBalance', (document.getElementById('bank-opening-bal') as HTMLInputElement)?.value || '71280.60');
                  const res = await fetch('/api/tally/exchange', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                  });
                  const data = await res.json();
                  if (!data.success) throw new Error(data.error || 'Bank import failed');
                  const r = data.data;
                  const catSummary = r.categories ? Object.entries(r.categories).map(([k, v]: [string, any]) => `  ${k}: ${v}`).join('\n') : '';
                  alert(`Bank Statement Import Complete!\n\nTotal Parsed: ${r.totalParsed}\nFiltered (range): ${r.filtered}\nVouchers Created: ${r.vouchersCreated}\nLedgers Created: ${r.ledgersCreated}\nSkipped: ${r.skipped}${catSummary ? `\n\nCategories:\n${catSummary}` : ''}${r.errors?.length ? `\n\nWarnings: ${r.errors.length}\n${r.errors.slice(0, 5).join('\n')}${r.errors.length > 5 ? '\n...' : ''}` : ''}`);
                  loadSummary();
                  loadLedgers();
                } catch (err: any) { setError(err.message); }
                e.target.value = '';
              }}
              className="hidden" />
            <label htmlFor="bank-import-file"
              className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-green-600 text-black text-sm rounded-lg hover:bg-green-500 font-semibold">
              <Upload className="w-4 h-4" /> Import Bank Statement
            </label>
          </div>
        </div>

        {/* Rules Reference */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Debit/Credit Rules (Reference)</h3>
          <div className="text-xs text-gray-500 space-y-1">
            <div className="grid grid-cols-3 gap-2 font-semibold text-gray-300 border-b border-gray-700 pb-1">
              <span>Account</span><span>Increase</span><span>Decrease</span>
            </div>
            {[
              ['Asset', 'Debit', 'Credit'],
              ['Expense', 'Debit', 'Credit'],
              ['Income', 'Credit', 'Debit'],
              ['Liability', 'Credit', 'Debit'],
              ['Capital', 'Credit', 'Debit'],
            ].map(([acc, inc, dec]) => (
              <div key={acc} className="grid grid-cols-3 gap-2 py-1">
                <span className="font-medium text-gray-300">{acc}</span>
                <span className="text-blue-400">{inc}</span>
                <span className="text-red-400">{dec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Capital Items Reference */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Capital / Equity Items (Auto-tracked)</h3>
          <div className="text-xs text-gray-500 space-y-2">
            {[
              ['Current Year P/L', 'Auto-computed from P&L, shown in Balance Sheet as "Surplus from P&L A/c"'],
              ['Previous Year P/L', 'Carried forward via Year-End Closing to "Retained Earnings"'],
              ['Capital Reserve', 'Create as CAPITAL ledger, sub-group "Capital Reserve"'],
              ['General Reserve', 'Create as CAPITAL ledger, sub-group "General Reserve"'],
              ['Retained Earnings', 'Accumulates all previous year profits/losses'],
              ['Share Premium', 'Create as CAPITAL ledger, sub-group "Share Premium"'],
              ['Share Capital', 'Create as CAPITAL ledger, sub-group "Share Capital"'],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-2">
                <span className="font-medium text-purple-400 whitespace-nowrap">• {title}:</span>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ── Main Render ───────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 hover:bg-gray-800 rounded-lg">
              <Menu className="w-5 h-5" />
            </button>
            <button onClick={() => router.push('/admin/crm')} className="p-2 hover:bg-gray-800 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-yellow-500" />
                Tally Prime
              </h1>
              <p className="text-xs text-gray-500">Double-Entry Bookkeeping</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-yellow-600/20 border border-yellow-600/50 rounded-lg px-3 py-1.5">
              <Calendar className="w-4 h-4 text-yellow-400" />
              <select value={fy} onChange={e => { setFy(e.target.value); clearAllCachedData(); }}
                className="text-sm text-yellow-300 bg-transparent outline-none">
                <option value="2025-26" className="bg-gray-900 text-white">FY 2025-26{fy === '2025-26' && fyLocked ? ' (Locked)' : ''}</option>
                <option value="2024-25" className="bg-gray-900 text-white">FY 2024-25{fy === '2024-25' && fyLocked ? ' (Locked)' : ''}</option>
                <option value="2023-24" className="bg-gray-900 text-white">FY 2023-24{fy === '2023-24' && fyLocked ? ' (Locked)' : ''}</option>
              </select>
            </div>

            {/* Lock / Unlock FY Button */}
            <button
              onClick={toggleFYLock}
              disabled={lockLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                fyLocked
                  ? 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
                  : 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
              } disabled:opacity-50`}
              title={fyLocked ? `Unlock FY ${fy} to allow edits` : `Lock FY ${fy} to prevent changes`}
            >
              {lockLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : fyLocked ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
              {fyLocked ? 'Locked' : 'Open'}
            </button>

            <button onClick={() => { clearAllCachedData(); refreshCurrentTab(); }}
              className="p-2 hover:bg-gray-800 rounded-lg" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-yellow-500' : 'text-gray-400'}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1 border-b border-gray-800">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap transition-colors border-b-2 ${
                  tab === t.key ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'
                }`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-sm text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" /> <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300 text-lg leading-none">×</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        )}

        {/* Tab Content */}
        {!loading && (
          <>
            {tab === 'dashboard' && <DashboardView />}
            {tab === 'account' && <AccountView />}
            {tab === 'ledgers' && <LedgersView />}
            {tab === 'vouchers' && <VouchersView />}
            {tab === 'trial-balance' && <TrialBalanceView />}
            {tab === 'profit-loss' && <ProfitLossView />}
            {tab === 'monthly-pl' && <MonthlyPLView />}
            {tab === 'balance-sheet' && <BalanceSheetView />}
            {tab === 'daybook' && <DayBookView />}
            {tab === 'ca-audit' && <CAAuditView />}
            {tab === 'ca-bills' && <CABillsView />}
            {tab === 'settings' && <SettingsView />}
          </>
        )}
      </main>

      {/* Modals */}
      {showLedgerForm && <LedgerForm />}
      {showVoucherForm && <VoucherForm />}
    </div>
  );
}
