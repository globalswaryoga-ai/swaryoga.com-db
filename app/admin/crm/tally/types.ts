export type AccountGroup = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'CAPITAL';
export type BalanceType = 'DEBIT' | 'CREDIT';
export type VoucherType = 'RECEIPT' | 'PAYMENT' | 'JOURNAL' | 'CONTRA' | 'SALES' | 'PURCHASE' | 'DEBIT_NOTE' | 'CREDIT_NOTE';
export type ViewTab = 'dashboard' | 'account' | 'ledgers' | 'vouchers' | 'trial-balance' | 'profit-loss' | 'monthly-pl' | 'balance-sheet' | 'daybook' | 'cashbank' | 'group-summary' | 'outstanding' | 'bank-recon' | 'gst-reports' | 'comparative' | 'budget' | 'ca-audit' | 'ca-bills' | 'cost-centers' | 'year-end' | 'analytics' | 'audit-trail' | 'tds' | 'inventory' | 'settings';

export interface Ledger {
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

export interface VoucherEntry {
  ledgerId: string;
  ledgerName: string;
  amount: number;
  type: BalanceType;
}

export interface Voucher {
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

export interface Summary {
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

export interface TrialBalanceRow {
  ledgerName: string;
  group: string;
  closingDebit: number;
  closingCredit: number;
}

export interface PLRow {
  ledgerName: string;
  amount: number;
  subGroup?: string;
}

export interface BSRow {
  ledgerName: string;
  amount: number;
  subGroup?: string;
}

export interface MonthlyPLRow {
  month: string;
  monthNum: number;
  year: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  isProfit: boolean;
}
