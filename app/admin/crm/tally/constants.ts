import { AccountGroup, ViewTab } from './types';
import {
  BarChart3,
  BookOpen,
  FileText,
  Calendar,
  Scale,
  TrendingUp,
  PieChart,
  Wallet,
  Settings,
  User,
  IndianRupee,
  Layers,
  Clock,
  CheckCircle,
  Shield,
  ArrowRight,
  ClipboardList,
  Image,
  Target,
  GitBranch,
  Activity,
  History,
  Percent,
  Package,
} from 'lucide-react';

export function fmt(n: number): string {
  return '₹' + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const GROUP_COLORS: Record<AccountGroup, string> = {
  ASSET: 'text-blue-400 bg-blue-500/10',
  LIABILITY: 'text-red-400 bg-red-500/10',
  INCOME: 'text-green-400 bg-green-500/10',
  EXPENSE: 'text-orange-400 bg-orange-500/10',
  CAPITAL: 'text-purple-400 bg-purple-500/10',
};

export const VOUCHER_COLORS: Record<string, string> = {
  RECEIPT: 'text-green-400 bg-green-500/10',
  PAYMENT: 'text-red-400 bg-red-500/10',
  JOURNAL: 'text-yellow-400 bg-yellow-500/10',
  CONTRA: 'text-blue-400 bg-blue-500/10',
  SALES: 'text-emerald-400 bg-emerald-500/10',
  PURCHASE: 'text-amber-400 bg-amber-500/10',
  DEBIT_NOTE: 'text-pink-400 bg-pink-500/10',
  CREDIT_NOTE: 'text-indigo-400 bg-indigo-500/10',
};

export type TabDef = { key: ViewTab; label: string; icon: any };

export const PRIMARY_TABS: TabDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { key: 'ledgers', label: 'Ledgers', icon: BookOpen },
  { key: 'vouchers', label: 'Vouchers', icon: FileText },
  { key: 'daybook', label: 'Day Book', icon: Calendar },
  { key: 'trial-balance', label: 'Trial Balance', icon: Scale },
  { key: 'profit-loss', label: 'P&L (Yearly)', icon: TrendingUp },
  { key: 'balance-sheet', label: 'Balance Sheet', icon: PieChart },
  { key: 'cashbank', label: 'Cash/Bank', icon: Wallet },
  { key: 'settings', label: 'Setup', icon: Settings },
];

export const MORE_TABS: TabDef[] = [
  { key: 'account', label: 'Account', icon: User },
  { key: 'monthly-pl', label: 'P&L (Monthly)', icon: IndianRupee },
  { key: 'group-summary', label: 'Group Summary', icon: Layers },
  { key: 'outstanding', label: 'Outstanding', icon: Clock },
  { key: 'bank-recon', label: 'Bank Recon', icon: CheckCircle },
  { key: 'gst-reports', label: 'GST Reports', icon: Shield },
  { key: 'comparative', label: 'Comparative', icon: ArrowRight },
  { key: 'budget', label: 'Budget', icon: ClipboardList },
  { key: 'ca-audit', label: 'CA Audit', icon: Shield },
  { key: 'ca-bills', label: 'Bills', icon: Image },
  { key: 'cost-centers', label: 'Cost Centers', icon: Target },
  { key: 'year-end', label: 'Year-End', icon: GitBranch },
  { key: 'analytics', label: 'Analytics', icon: Activity },
  { key: 'audit-trail', label: 'Audit Trail', icon: History },
  { key: 'tds', label: 'TDS', icon: Percent },
  { key: 'inventory', label: 'Inventory', icon: Package },
];

export const ALL_TABS: TabDef[] = [...PRIMARY_TABS, ...MORE_TABS];

export const GROUP_ORDER: AccountGroup[] = ['CAPITAL', 'ASSET', 'LIABILITY', 'INCOME', 'EXPENSE'];

export const GROUP_LABELS: Record<string, string> = {
  CAPITAL: 'Capital Account',
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  INCOME: 'Income',
  EXPENSE: 'Expenses',
};

export const GROUP_ICON_COLORS: Record<string, string> = {
  INCOME: 'text-green-400 bg-green-500/10 border-green-500/30',
  EXPENSE: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  ASSET: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  LIABILITY: 'text-red-400 bg-red-500/10 border-red-500/30',
  CAPITAL: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
};

export const VOUCHER_TYPES = ['ALL', 'RECEIPT', 'PAYMENT', 'JOURNAL', 'CONTRA', 'SALES', 'PURCHASE', 'DEBIT_NOTE', 'CREDIT_NOTE'];
