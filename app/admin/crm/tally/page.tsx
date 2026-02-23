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

type ActiveTab = 'dashboard' | 'sales' | 'receipts' | 'purchases' | 'ledgers' | 'stock' | 'daybook' | 'profitloss' | 'balancesheet' | 'opening' | 'settings';

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
  const [selectedFY, setSelectedFY] = useState('2023-24');
  const currentFY = FY_OPTIONS.find(f => f.value === selectedFY) || FY_OPTIONS[0];

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [ledgerGroup, setLedgerGroup] = useState('');
  const [voucherType, setVoucherType] = useState('Sales');

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

  // AI Chatbox
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Manual Opening Balances
  interface ManualEntry { _id: string; ledgerName: string; parentGroup: string; category: string; amount: number; drCr: string; asOnDate: string; notes: string; }
  const [manualEntries, setManualEntries] = useState<ManualEntry[]>([]);
  const [manualTotals, setManualTotals] = useState<{ totalAssets: number; totalLiabilities: number; totalIncome: number; totalExpenses: number }>({ totalAssets: 0, totalLiabilities: 0, totalIncome: 0, totalExpenses: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ledgerName: '', parentGroup: '', category: 'asset' as string, amount: '', drCr: 'Dr' as string, asOnDate: '', notes: '' });
  const [manualLoading, setManualLoading] = useState(false);

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
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crm/tally?action=dashboard&from=${f.from}&to=${f.to}`, { headers: headers() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setConfig(data.config);
      setSummary(data.summary);
      setConnected(true);
    } catch (err: any) {
      setError(err.message);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [token, headers]);

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

  // ── Fetch Profit & Loss (Tally first → manual fallback) ──
  const fetchPL = useCallback(async (fy?: { from: string; to: string }) => {
    if (!token) return;
    const f = fy || currentFY;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/tally?action=profitloss&from=${f.from}&to=${f.to}`, { headers: headers() });
      const data = await res.json();
      if (data.success && (data.income?.length > 0 || data.expenses?.length > 0)) {
        setPlData(data);
        return;
      }
    } catch { /* Tally not available */ }

    // Fallback: build from manual entries
    try {
      const manRes = await fetch(`/api/admin/crm/tally/manual-balances?fy=${selectedFY}`, { headers: headers() });
      const manData = await manRes.json();
      if (manData.success && manData.entries?.length > 0) {
        const incEntries = manData.entries.filter((e: any) => e.category === 'income');
        const expEntries = manData.entries.filter((e: any) => e.category === 'expense');
        const groupIt = (items: any[]) => {
          const map = new Map<string, { name: string; amount: number }[]>();
          for (const i of items) { const k = i.parentGroup || 'Other'; if (!map.has(k)) map.set(k, []); map.get(k)!.push({ name: i.ledgerName, amount: i.amount }); }
          return Array.from(map.entries()).map(([name, children]) => ({ name, amount: children.reduce((s: number, c: any) => s + c.amount, 0), children: children.sort((a: any, b: any) => b.amount - a.amount) })).sort((a, b) => b.amount - a.amount);
        };
        const income = groupIt(incEntries);
        const expenses = groupIt(expEntries);
        const totalIncome = income.reduce((s, g) => s + g.amount, 0);
        const totalExpenses = expenses.reduce((s, g) => s + g.amount, 0);
        setPlData({ income, expenses, totalIncome, totalExpenses, netProfit: totalIncome - totalExpenses });
      } else {
        setPlData(null);
      }
    } catch { setPlData(null); }
    finally { setLoading(false); }
  }, [token, headers, selectedFY]);

  // ── Build BS from manual entries ──
  const buildBSFromManual = (entries: ManualEntry[]): BalanceSheetData | null => {
    const assetEntries = entries.filter(e => e.category === 'asset');
    const liabEntries = entries.filter(e => e.category === 'liability');
    if (assetEntries.length === 0 && liabEntries.length === 0) return null;

    const groupEntries = (items: ManualEntry[]) => {
      const map = new Map<string, { name: string; amount: number }[]>();
      for (const item of items) {
        const key = item.parentGroup || 'Other';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push({ name: item.ledgerName, amount: item.amount });
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
    }
  }, [token, fetchDashboard, fetchSyncStatus, fetchManualBalances]);

  // ── Tab / FY change handler ──
  useEffect(() => {
    if (!token) return;
    const fy = FY_OPTIONS.find(f => f.value === selectedFY) || FY_OPTIONS[0];
    switch (activeTab) {
      case 'dashboard': fetchDashboard(fy); break;
      case 'sales': fetchVoucherData('Sales', fy); break;
      case 'receipts': fetchVoucherData('Receipt', fy); break;
      case 'purchases': fetchVoucherData('Purchase', fy); break;
      case 'ledgers': fetchLedgerData(ledgerGroup || undefined); break;
      case 'stock': fetchStock(); break;
      case 'daybook': fetchDaybook(fy); break;
      case 'profitloss': fetchPL(fy); break;
      case 'balancesheet': fetchBS(fy); break;
      case 'opening': fetchManualBalances(); break;
      case 'settings': testConnection(); break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedFY, token]);

  // ── Filtered data ──
  const filteredVouchers = vouchers.filter(v =>
    !searchQuery ||
    v.partyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.voucherNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLedgers = ledgers.filter(l =>
    !searchQuery ||
    l.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.parent?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStock = stockItems.filter(s =>
    !searchQuery || s.name?.toLowerCase().includes(searchQuery.toLowerCase())
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
            <h1 className="text-xl font-bold">Tally Prime</h1>
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
                        <h2 className="text-lg font-bold">{summary.company.name}</h2>
                        {summary.company.formalName && summary.company.formalName !== summary.company.name && (
                          <p className="text-sm text-gray-400">{summary.company.formalName}</p>
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

                  {/* Stats cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                    <StatCard label="Total Sales" value={fmt(summary.totalSales)} sub={`${summary.salesCount} vouchers`} icon={ArrowUpRight} color="text-green-400" bg="bg-green-500/10" />
                    <StatCard label="Total Receipts" value={fmt(summary.totalReceipts)} sub={`${summary.receiptCount} vouchers`} icon={ArrowDownLeft} color="text-blue-400" bg="bg-blue-500/10" />
                    <StatCard label="Total Purchases" value={fmt(summary.totalPurchases)} sub={`${summary.purchaseCount} vouchers`} icon={Package} color="text-orange-400" bg="bg-orange-500/10" />
                    <StatCard label="Debtors" value={fmt(summary.totalDebtors)} sub={`${summary.debtorCount} parties`} icon={Users} color="text-red-400" bg="bg-red-500/10" />
                    <StatCard label="Creditors" value={fmt(summary.totalCreditors)} sub={`${summary.creditorCount} parties`} icon={Users} color="text-purple-400" bg="bg-purple-500/10" />
                  </div>

                  {/* Recent tables */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <RecentTable title="Recent Sales" vouchers={summary.recentSales} color="text-green-400" />
                    <RecentTable title="Recent Receipts" vouchers={summary.recentReceipts} color="text-blue-400" />
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
                  {/* Tally not connected notice */}
                  <div className="p-4 bg-yellow-500/5 border border-yellow-800/40 rounded-xl flex items-start gap-3">
                    <WifiOff className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-400">Tally Prime Not Connected</p>
                      <p className="text-xs text-gray-500 mt-1">TSS subscription may be expired. Use the <strong className="text-gray-400">Opening Bal.</strong> tab to add data manually from your CA reports.</p>
                    </div>
                  </div>
                  {/* Manual Balance Summary */}
                  {manualEntries.length > 0 ? (
                    <>
                      <div className="mb-2">
                        <h2 className="text-lg font-bold text-gray-200 flex items-center gap-2">
                          <ClipboardList className="w-5 h-5 text-yellow-500" /> Manual Balance Summary — {currentFY.label}
                        </h2>
                        <p className="text-xs text-gray-500">From your CA balance sheet entries</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard label="Assets" value={fmt(manualTotals.totalAssets)} sub={`${manualEntries.filter(e => e.category === 'asset').length} entries`} icon={TrendingUp} color="text-blue-400" bg="bg-blue-500/10" />
                        <StatCard label="Liabilities" value={fmt(manualTotals.totalLiabilities)} sub={`${manualEntries.filter(e => e.category === 'liability').length} entries`} icon={Scale} color="text-purple-400" bg="bg-purple-500/10" />
                        <StatCard label="Income" value={fmt(manualTotals.totalIncome)} sub={`${manualEntries.filter(e => e.category === 'income').length} entries`} icon={ArrowDownLeft} color="text-green-400" bg="bg-green-500/10" />
                        <StatCard label="Expenses" value={fmt(manualTotals.totalExpenses)} sub={`${manualEntries.filter(e => e.category === 'expense').length} entries`} icon={ArrowUpRight} color="text-red-400" bg="bg-red-500/10" />
                      </div>
                      <div className={`p-4 rounded-xl border ${Math.abs(manualTotals.totalAssets - manualTotals.totalLiabilities) < 1 ? 'bg-green-500/5 border-green-800' : 'bg-yellow-500/5 border-yellow-800'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Balance (Assets − Liabilities)</span>
                          <span className={`text-lg font-bold ${Math.abs(manualTotals.totalAssets - manualTotals.totalLiabilities) < 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {fmt(Math.abs(manualTotals.totalAssets - manualTotals.totalLiabilities))}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <ClipboardList className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-400 mb-2">No Data Yet</h3>
                      <p className="text-sm text-gray-600 max-w-md mx-auto mb-6">
                        Add your CA balance sheet entries to see the dashboard summary.
                      </p>
                      <button onClick={() => setActiveTab('opening')} className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-black rounded-lg font-medium inline-flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Add Opening Balances
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ════════ VOUCHER TABS (Sales/Receipts/Purchases) ════════ */}
          {(activeTab === 'sales' || activeTab === 'receipts' || activeTab === 'purchases' || activeTab === 'daybook') && (
            <>
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
                <span className="text-sm text-gray-500">{filteredVouchers.length} records</span>
              </div>

              {loading ? (
                <LoadingSkeleton />
              ) : filteredVouchers.length === 0 ? (
                <EmptyState message={`No ${activeTab} vouchers found. Make sure Tally Prime is running.`} />
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {filteredVouchers.map((v, i) => (
                        <tr key={`${v.voucherNumber}-${i}`} className="hover:bg-gray-900/40 transition">
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
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-900/60">
                      <tr>
                        <td colSpan={activeTab === 'daybook' ? 5 : 4} className="px-4 py-3 text-right font-bold text-gray-300">Total:</td>
                        <td className="px-4 py-3 text-right font-bold text-yellow-400">{fmt(filteredVouchers.reduce((s, v) => s + v.amount, 0))}</td>
                        <td></td>
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
                  <option value="Sales Accounts">Sales Accounts</option>
                  <option value="Purchase Accounts">Purchase Accounts</option>
                  <option value="Direct Expenses">Direct Expenses</option>
                  <option value="Indirect Expenses">Indirect Expenses</option>
                </select>
                <span className="text-sm text-gray-500">{filteredLedgers.length} ledgers</span>
              </div>

              {loading ? (
                <LoadingSkeleton />
              ) : filteredLedgers.length === 0 ? (
                <EmptyState message="No ledgers found." />
              ) : (
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
              {loading && !plData ? (
                <LoadingSkeleton />
              ) : plData ? (
                <div className="space-y-6">
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
              {loading && !bsData ? (
                <LoadingSkeleton />
              ) : bsData ? (
                <div className="space-y-6">
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
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-yellow-500" /> Opening Balances
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Manually enter balances from your CA Balance Sheet report for {currentFY.label}</p>
                </div>
                <button
                  onClick={() => { setShowAddForm(true); setEditingId(null); setFormData({ ledgerName: '', parentGroup: '', category: 'asset', amount: '', drCr: 'Dr', asOnDate: '', notes: '' }); }}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-medium rounded-lg flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" /> Add Entry
                </button>
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
