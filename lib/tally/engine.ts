/**
 * Accounting Engine — Double-Entry Bookkeeping (Tally Prime Compatible)
 *
 * RULES:
 * 1. Every voucher must have balanced debit and credit totals
 * 2. 5 Account Groups: ASSET, LIABILITY, INCOME, EXPENSE, CAPITAL
 * 3. Normal balances:
 *    - Assets & Expenses  → Debit nature
 *    - Liabilities, Income, Capital → Credit nature
 *
 * GOLDEN RULES:
 * - Personal Accounts: Debit the Receiver, Credit the Giver
 * - Real Accounts:     Debit what comes in, Credit what goes out
 * - Nominal Accounts:  Debit expenses & losses, Credit incomes & gains
 */

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAccLedger, getAccVoucher, getAccGroup, getAccFinancialYear } from '@/lib/schemas/enterpriseSchemas';

// ─── Server-Side Report Cache (30s TTL) ─────────────────────────────
// Avoids re-computing identical reports when user switches tabs quickly.
// Cache is keyed by "reportType:fy" and auto-expires after 30 seconds.

interface CacheEntry { data: any; expiresAt: number; }
const _reportCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds

function getCached<T>(key: string): T | null {
  const entry = _reportCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _reportCache.delete(key); return null; }
  return entry.data as T;
}

function setCache(key: string, data: any): void {
  _reportCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Call after any ledger/voucher mutation to invalidate stale reports */
export function invalidateReportCache(financialYear?: string): void {
  if (financialYear) {
    for (const k of _reportCache.keys()) {
      if (k.includes(`:${financialYear}`)) _reportCache.delete(k);
    }
  } else {
    _reportCache.clear();
  }
}

// ─── Types ──────────────────────────────────────────────────────────

export type AccountGroup = 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'CAPITAL';
export type BalanceType = 'DEBIT' | 'CREDIT';
export type VoucherType = 'RECEIPT' | 'PAYMENT' | 'JOURNAL' | 'CONTRA' | 'SALES' | 'PURCHASE' | 'DEBIT_NOTE' | 'CREDIT_NOTE';

export interface LedgerBalance {
  ledgerId: string;
  ledgerName: string;
  group: AccountGroup;
  subGroup?: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
  closingBalance: number;       // absolute value
  closingBalanceType: BalanceType; // which side it falls on
}

export interface TrialBalanceRow extends LedgerBalance {}

export interface ReportRow {
  ledgerName: string;
  amount: number;
  subGroup?: string;
}

export interface ProfitLossResult {
  income: ReportRow[];
  expenses: ReportRow[];
  incomeByGroup: Record<string, ReportRow[]>;
  expensesByGroup: Record<string, ReportRow[]>;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  isProfit: boolean;
}

export interface BalanceSheetResult {
  assets: ReportRow[];
  liabilities: ReportRow[];
  capital: ReportRow[];
  assetsByGroup: Record<string, ReportRow[]>;
  liabilitiesByGroup: Record<string, ReportRow[]>;
  capitalBySubGroup: Record<string, ReportRow[]>;
  totalAssets: number;
  totalLiabilities: number;
  totalCapital: number;
  capitalAdjusted: number;      // capital + net profit
  liabilitiesPlusCapital: number;
  difference: number;           // should be 0 if balanced
  netProfit: number;
  isProfit: boolean;
}

export interface DayBookEntry {
  voucherId: string;
  voucherNumber: string;
  date: Date;
  type: VoucherType;
  entries: {
    ledgerName: string;
    debit: number;
    credit: number;
  }[];
  narration?: string;
  totalAmount: number;
}

// ─── Voucher Number Generation ──────────────────────────────────────

const VOUCHER_PREFIX: Record<VoucherType, string> = {
  RECEIPT: 'REC',
  PAYMENT: 'PAY',
  JOURNAL: 'JRN',
  CONTRA: 'CTR',
  SALES: 'SAL',
  PURCHASE: 'PUR',
  DEBIT_NOTE: 'DN',
  CREDIT_NOTE: 'CN',
};

export async function generateVoucherNumber(type: VoucherType, financialYear: string): Promise<string> {
  await connectDB();
  const AccVoucher = getAccVoucher();
  const prefix = VOUCHER_PREFIX[type];

  const lastVoucher = await AccVoucher.findOne({
    type,
    financialYear,
  }).sort({ createdAt: -1 }).select('voucherNumber').lean();

  let nextNum = 1;
  if (lastVoucher?.voucherNumber) {
    const parts = (lastVoucher.voucherNumber as string).split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) nextNum = num + 1;
  }

  return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

// ─── Voucher Validation ─────────────────────────────────────────────

export interface VoucherValidation {
  valid: boolean;
  errors: string[];
}

export function validateVoucherEntries(
  entries: { ledgerId: string; ledgerName: string; amount: number; type: BalanceType }[]
): VoucherValidation {
  const errors: string[] = [];

  if (!entries || entries.length < 2) {
    errors.push('A voucher must have at least 2 entries (double-entry)');
  }

  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry.ledgerId) errors.push(`Entry ${i + 1}: ledgerId is required`);
    if (!entry.ledgerName) errors.push(`Entry ${i + 1}: ledgerName is required`);
    if (!entry.amount || entry.amount <= 0) errors.push(`Entry ${i + 1}: amount must be > 0`);
    if (!['DEBIT', 'CREDIT'].includes(entry.type)) errors.push(`Entry ${i + 1}: type must be DEBIT or CREDIT`);

    if (entry.type === 'DEBIT') totalDebit += entry.amount;
    else totalCredit += entry.amount;
  }

  // The golden rule: Debit MUST equal Credit
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    errors.push(
      `Voucher is NOT balanced: Total Debit (₹${totalDebit.toFixed(2)}) ≠ Total Credit (₹${totalCredit.toFixed(2)}). Difference: ₹${Math.abs(totalDebit - totalCredit).toFixed(2)}`
    );
  }

  return { valid: errors.length === 0, errors };
}

// ─── Create Voucher ─────────────────────────────────────────────────

export async function createVoucher(data: {
  date: Date | string;
  type: VoucherType;
  entries: { ledgerId: string; ledgerName: string; amount: number; type: BalanceType }[];
  narration?: string;
  financialYear: string;
  partyLedgerId?: string;
  partyName?: string;
  createdByUserId?: string;
  receiptFileUrl?: string;
  receiptFileName?: string;
}) {
  await connectDB();
  const AccVoucher = getAccVoucher();
  const AccFinancialYear = getAccFinancialYear();

  // Check if the FY is locked (closed)
  const fyDoc = await AccFinancialYear.findOne({ code: data.financialYear }).lean() as any;
  if (fyDoc?.isClosed) {
    throw new Error(`FY ${data.financialYear} is locked. No new vouchers can be created in a closed financial year.`);
  }

  // Validate entries
  const validation = validateVoucherEntries(data.entries);
  if (!validation.valid) {
    throw new Error(`Voucher validation failed:\n${validation.errors.join('\n')}`);
  }

  const totalDebit = data.entries.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);
  const totalCredit = data.entries.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);

  const voucherNumber = await generateVoucherNumber(data.type, data.financialYear);

  const voucher = await AccVoucher.create({
    voucherNumber,
    date: new Date(data.date),
    type: data.type,
    entries: data.entries,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    narration: data.narration,
    financialYear: data.financialYear,
    partyLedgerId: data.partyLedgerId,
    partyName: data.partyName,
    createdByUserId: data.createdByUserId,
    receiptFileUrl: data.receiptFileUrl,
    receiptFileName: data.receiptFileName,
  });

  return voucher;
}

// ─── Ledger Balance Calculation ─────────────────────────────────────

/**
 * Batch-calculate balances for ALL ledgers in a financial year using a single
 * aggregate query. Returns a Map keyed by ledgerId string.
 * This replaces dozens of sequential calculateLedgerBalance() calls.
 */
export async function batchCalculateLedgerBalances(
  financialYear: string,
  dateTo?: Date,
): Promise<Map<string, LedgerBalance>> {
  await connectDB();
  const AccLedger = getAccLedger();
  const AccVoucher = getAccVoucher();

  // 1. Fetch ALL active ledgers in one query
  const ledgers = await AccLedger.find({ financialYear, isActive: true }).lean() as any[];

  // 2. Single aggregate: sum debit/credit per ledger across all vouchers
  const matchQuery: any = { financialYear, isReversed: { $ne: true } };
  if (dateTo) matchQuery.date = { $lte: dateTo };

  const agg = await AccVoucher.aggregate([
    { $match: matchQuery },
    { $unwind: '$entries' },
    {
      $group: {
        _id: { ledgerId: '$entries.ledgerId', type: '$entries.type' },
        total: { $sum: '$entries.amount' },
      },
    },
  ]);

  // Build a lookup: ledgerId -> { periodDebit, periodCredit }
  const voucherTotals = new Map<string, { periodDebit: number; periodCredit: number }>();
  for (const row of agg) {
    const lid = String(row._id.ledgerId);
    if (!voucherTotals.has(lid)) voucherTotals.set(lid, { periodDebit: 0, periodCredit: 0 });
    const entry = voucherTotals.get(lid)!;
    if (row._id.type === 'DEBIT') entry.periodDebit = row.total;
    if (row._id.type === 'CREDIT') entry.periodCredit = row.total;
  }

  // 3. Build balance for each ledger
  const result = new Map<string, LedgerBalance>();
  for (const l of ledgers) {
    const lid = String(l._id);
    const openingDebit = l.openingBalanceType === 'DEBIT' ? (l.openingBalance || 0) : 0;
    const openingCredit = l.openingBalanceType === 'CREDIT' ? (l.openingBalance || 0) : 0;

    const vt = voucherTotals.get(lid) || { periodDebit: 0, periodCredit: 0 };
    const totalDebit = openingDebit + vt.periodDebit;
    const totalCredit = openingCredit + vt.periodCredit;
    const net = totalDebit - totalCredit;

    result.set(lid, {
      ledgerId: lid,
      ledgerName: l.name,
      group: l.group,
      subGroup: l.subGroup,
      openingDebit,
      openingCredit,
      periodDebit: Math.round(vt.periodDebit * 100) / 100,
      periodCredit: Math.round(vt.periodCredit * 100) / 100,
      closingDebit: net >= 0 ? Math.round(Math.abs(net) * 100) / 100 : 0,
      closingCredit: net < 0 ? Math.round(Math.abs(net) * 100) / 100 : 0,
      closingBalance: Math.round(Math.abs(net) * 100) / 100,
      closingBalanceType: net >= 0 ? 'DEBIT' : 'CREDIT',
    });
  }

  return result;
}


export async function calculateLedgerBalance(
  ledgerId: string,
  financialYear: string,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<LedgerBalance> {
  await connectDB();
  const AccLedger = getAccLedger();
  const AccVoucher = getAccVoucher();

  const ledger = await AccLedger.findById(ledgerId).lean();
  if (!ledger) throw new Error(`Ledger not found: ${ledgerId}`);

  const l = ledger as any;

  // Opening balance
  let openingDebit = 0;
  let openingCredit = 0;
  if (l.openingBalance > 0) {
    if (l.openingBalanceType === 'DEBIT') openingDebit = l.openingBalance;
    else openingCredit = l.openingBalance;
  }

  // Build query for voucher entries that reference this ledger
  // IMPORTANT: Convert string ledgerId to ObjectId for proper matching in aggregate
  const objectLedgerId = new mongoose.Types.ObjectId(ledgerId);
  const matchQuery: any = {
    financialYear,
    'entries.ledgerId': objectLedgerId,
    isReversed: { $ne: true },
  };
  if (dateFrom || dateTo) {
    matchQuery.date = {};
    if (dateFrom) matchQuery.date.$gte = dateFrom;
    if (dateTo) matchQuery.date.$lte = dateTo;
  }

  // Aggregate debit and credit from all vouchers
  const pipeline = [
    { $match: matchQuery },
    { $unwind: '$entries' },
    { $match: { 'entries.ledgerId': objectLedgerId } },
    {
      $group: {
        _id: '$entries.type',
        total: { $sum: '$entries.amount' },
      },
    },
  ];

  const agg = await AccVoucher.aggregate(pipeline);

  let periodDebit = 0;
  let periodCredit = 0;
  for (const row of agg) {
    if (row._id === 'DEBIT') periodDebit = row.total;
    if (row._id === 'CREDIT') periodCredit = row.total;
  }

  const totalDebit = openingDebit + periodDebit;
  const totalCredit = openingCredit + periodCredit;
  const net = totalDebit - totalCredit;

  return {
    ledgerId: String(l._id),
    ledgerName: l.name,
    group: l.group,
    subGroup: l.subGroup,
    openingDebit,
    openingCredit,
    periodDebit: Math.round(periodDebit * 100) / 100,
    periodCredit: Math.round(periodCredit * 100) / 100,
    closingDebit: net >= 0 ? Math.round(Math.abs(net) * 100) / 100 : 0,
    closingCredit: net < 0 ? Math.round(Math.abs(net) * 100) / 100 : 0,
    closingBalance: Math.round(Math.abs(net) * 100) / 100,
    closingBalanceType: net >= 0 ? 'DEBIT' : 'CREDIT',
  };
}

// ─── Trial Balance ──────────────────────────────────────────────────

export async function generateTrialBalance(
  financialYear: string,
  dateTo?: Date,
  _balanceMap?: Map<string, LedgerBalance>,
): Promise<{
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  difference: number;
}> {
  await connectDB();

  // Use provided balanceMap or compute once
  const balanceMap = _balanceMap || await batchCalculateLedgerBalances(financialYear, dateTo);

  const rows: TrialBalanceRow[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const bal of balanceMap.values()) {
    if (bal.closingBalance > 0) {
      rows.push(bal);
      totalDebit += bal.closingDebit;
      totalCredit += bal.closingCredit;
    }
  }

  // Sort: Assets, Expenses (debit-nature) first, then Liabilities, Income, Capital
  const groupOrder: Record<string, number> = { ASSET: 1, EXPENSE: 2, LIABILITY: 3, INCOME: 4, CAPITAL: 5 };
  rows.sort((a, b) => (groupOrder[a.group] || 99) - (groupOrder[b.group] || 99));

  return {
    rows,
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    difference: Math.round((totalDebit - totalCredit) * 100) / 100,
  };
}

// ─── Profit & Loss Statement ────────────────────────────────────────

export async function generateProfitLoss(
  financialYear: string,
  dateTo?: Date,
  _balanceMap?: Map<string, LedgerBalance>,
): Promise<ProfitLossResult> {
  await connectDB();

  // Use provided balanceMap or compute once
  const balanceMap = _balanceMap || await batchCalculateLedgerBalances(financialYear, dateTo);

  const income: ReportRow[] = [];
  const expenses: ReportRow[] = [];

  let totalIncome = 0;
  let totalExpense = 0;

  for (const bal of balanceMap.values()) {
    if (bal.group === 'INCOME') {
      // Income normal balance is CREDIT. Income amount = credit - debit
      const amount = (bal.openingCredit + bal.periodCredit) - (bal.openingDebit + bal.periodDebit);
      if (Math.abs(amount) > 0.01) {
        income.push({ ledgerName: bal.ledgerName, amount: Math.round(Math.abs(amount) * 100) / 100, subGroup: bal.subGroup });
        totalIncome += Math.abs(amount);
      }
    } else if (bal.group === 'EXPENSE') {
      // Expense normal balance is DEBIT. Expense amount = debit - credit
      const amount = (bal.openingDebit + bal.periodDebit) - (bal.openingCredit + bal.periodCredit);
      if (Math.abs(amount) > 0.01) {
        expenses.push({ ledgerName: bal.ledgerName, amount: Math.round(Math.abs(amount) * 100) / 100, subGroup: bal.subGroup });
        totalExpense += Math.abs(amount);
      }
    }
  }

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;
  const netProfit = Math.round((totalIncome - totalExpense) * 100) / 100;

  // Group income and expenses by subGroup for structured display
  const incomeByGroup: Record<string, ReportRow[]> = {};
  for (const item of income) {
    const sg = item.subGroup || 'Other Income';
    if (!incomeByGroup[sg]) incomeByGroup[sg] = [];
    incomeByGroup[sg].push(item);
  }

  const expensesByGroup: Record<string, ReportRow[]> = {};
  for (const item of expenses) {
    const sg = item.subGroup || 'Other Expenses';
    if (!expensesByGroup[sg]) expensesByGroup[sg] = [];
    expensesByGroup[sg].push(item);
  }

  return {
    income,
    expenses,
    incomeByGroup,
    expensesByGroup,
    totalIncome,
    totalExpense,
    netProfit,
    isProfit: netProfit >= 0,
  };
}

// ─── Balance Sheet ──────────────────────────────────────────────────

export async function generateBalanceSheet(
  financialYear: string,
  dateTo?: Date,
  _balanceMap?: Map<string, LedgerBalance>,
  _plResult?: ProfitLossResult,
): Promise<BalanceSheetResult> {
  await connectDB();

  // Use provided balanceMap or compute once
  const balanceMap = _balanceMap || await batchCalculateLedgerBalances(financialYear, dateTo);

  const assets: ReportRow[] = [];
  const liabilities: ReportRow[] = [];
  const capital: ReportRow[] = [];

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalCapital = 0;

  for (const bal of balanceMap.values()) {
    if (bal.group === 'ASSET') {
      if (bal.closingBalance > 0.01) {
        const signedAmount = bal.closingBalanceType === 'DEBIT' ? bal.closingBalance : -bal.closingBalance;
        assets.push({ ledgerName: bal.ledgerName, amount: signedAmount, subGroup: bal.subGroup });
        totalAssets += signedAmount;
      }
    } else if (bal.group === 'LIABILITY') {
      if (bal.closingBalance > 0.01) {
        const signedAmount = bal.closingBalanceType === 'CREDIT' ? bal.closingBalance : -bal.closingBalance;
        liabilities.push({ ledgerName: bal.ledgerName, amount: signedAmount, subGroup: bal.subGroup });
        totalLiabilities += signedAmount;
      }
    } else if (bal.group === 'CAPITAL') {
      if (bal.closingBalance > 0.01) {
        const signedAmount = bal.closingBalanceType === 'CREDIT' ? bal.closingBalance : -bal.closingBalance;
        capital.push({ ledgerName: bal.ledgerName, amount: signedAmount, subGroup: bal.subGroup });
        totalCapital += signedAmount;
      }
    }
  }

  // Reuse provided P&L or compute (sharing the same balanceMap avoids duplicate queries)
  const pl = _plResult || await generateProfitLoss(financialYear, dateTo, balanceMap);

  totalAssets = Math.round(totalAssets * 100) / 100;
  totalLiabilities = Math.round(totalLiabilities * 100) / 100;
  totalCapital = Math.round(totalCapital * 100) / 100;

  // Auto-add "Current Year Profit/Loss" as a capital line if not zero
  if (Math.abs(pl.netProfit) > 0.01) {
    capital.push({
      ledgerName: pl.isProfit ? 'Current Year Profit (Auto from P&L)' : 'Current Year Loss (Auto from P&L)',
      amount: Math.abs(pl.netProfit),
      subGroup: 'Surplus from P&L A/c',
    });
  }

  const capitalAdjusted = Math.round((totalCapital + pl.netProfit) * 100) / 100;
  const liabilitiesPlusCapital = Math.round((totalLiabilities + capitalAdjusted) * 100) / 100;

  // Group items by sub-group for structured display
  const assetsByGroup: Record<string, ReportRow[]> = {};
  for (const item of assets) {
    const sg = item.subGroup || 'Other Assets';
    if (!assetsByGroup[sg]) assetsByGroup[sg] = [];
    assetsByGroup[sg].push(item);
  }

  const liabilitiesByGroup: Record<string, ReportRow[]> = {};
  for (const item of liabilities) {
    const sg = item.subGroup || 'Other Liabilities';
    if (!liabilitiesByGroup[sg]) liabilitiesByGroup[sg] = [];
    liabilitiesByGroup[sg].push(item);
  }

  const capitalBySubGroup: Record<string, ReportRow[]> = {};
  for (const c of capital) {
    const sg = c.subGroup || 'Other Capital';
    if (!capitalBySubGroup[sg]) capitalBySubGroup[sg] = [];
    capitalBySubGroup[sg].push(c);
  }

  return {
    assets,
    liabilities,
    capital,
    assetsByGroup,
    liabilitiesByGroup,
    capitalBySubGroup,
    totalAssets,
    totalLiabilities,
    totalCapital,
    capitalAdjusted,
    liabilitiesPlusCapital,
    difference: Math.round((totalAssets - liabilitiesPlusCapital) * 100) / 100,
    netProfit: pl.netProfit,
    isProfit: pl.isProfit,
  };
}

// ─── Day Book ───────────────────────────────────────────────────────

export async function getDayBook(
  financialYear: string,
  date?: Date,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<DayBookEntry[]> {
  await connectDB();
  const AccVoucher = getAccVoucher();

  const query: any = { financialYear, isReversed: { $ne: true } };

  if (date) {
    // Single day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    query.date = { $gte: dayStart, $lte: dayEnd };
  } else if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo) query.date.$lte = dateTo;
  }

  const vouchers = await AccVoucher.find(query).sort({ date: -1, createdAt: -1 }).lean();

  return (vouchers as any[]).map(v => ({
    voucherId: String(v._id),
    voucherNumber: v.voucherNumber,
    date: v.date,
    type: v.type,
    entries: v.entries.map((e: any) => ({
      ledgerName: e.ledgerName,
      debit: e.type === 'DEBIT' ? e.amount : 0,
      credit: e.type === 'CREDIT' ? e.amount : 0,
    })),
    narration: v.narration,
    totalAmount: v.totalDebit, // debit === credit for balanced voucher
  }));
}

// ─── Day Book Ledger Summary (for CA Report years with no vouchers) ──

export interface DayBookGroupSummary {
  group: string;
  label: string;
  ledgers: { name: string; subGroup: string; amount: number; type: string }[];
  totalDebit: number;
  totalCredit: number;
}

const GROUP_LABELS_DAYBOOK: Record<string, string> = {
  INCOME: 'Revenue & Income',
  EXPENSE: 'Expenditure',
  ASSET: 'Assets',
  LIABILITY: 'Liabilities',
  CAPITAL: 'Capital & Equity',
};

export async function getDayBookLedgerSummary(financialYear: string): Promise<DayBookGroupSummary[]> {
  await connectDB();
  const AccLedger = getAccLedger();
  const ledgers = await AccLedger.find({ financialYear }).sort({ group: 1, subGroup: 1, name: 1 }).lean();

  const GROUP_ORDER = ['INCOME', 'EXPENSE', 'ASSET', 'LIABILITY', 'CAPITAL'];
  const groupMap: Record<string, DayBookGroupSummary> = {};

  for (const l of ledgers as any[]) {
    const g: string = l.group || 'OTHER';
    if (!groupMap[g]) {
      groupMap[g] = { group: g, label: GROUP_LABELS_DAYBOOK[g] || g, ledgers: [], totalDebit: 0, totalCredit: 0 };
    }

    const amount = l.openingBalance || 0;
    if (amount === 0) continue;

    groupMap[g].ledgers.push({
      name: l.name,
      subGroup: l.subGroup || '',
      amount,
      type: l.openingBalanceType || 'DEBIT',
    });

    if ((l.openingBalanceType || 'DEBIT') === 'DEBIT') groupMap[g].totalDebit += amount;
    else groupMap[g].totalCredit += amount;
  }

  const result: DayBookGroupSummary[] = [];
  for (const g of GROUP_ORDER) {
    if (groupMap[g] && groupMap[g].ledgers.length > 0) result.push(groupMap[g]);
  }
  return result;
}

// ─── Receipts & Payments Registers ──────────────────────────────────

export async function getReceiptsRegister(financialYear: string, dateFrom?: Date, dateTo?: Date) {
  await connectDB();
  const AccVoucher = getAccVoucher();
  const query: any = { financialYear, type: 'RECEIPT', isReversed: { $ne: true } };
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo) query.date.$lte = dateTo;
  }
  return AccVoucher.find(query).sort({ date: -1 }).lean();
}

export async function getPaymentsRegister(financialYear: string, dateFrom?: Date, dateTo?: Date) {
  await connectDB();
  const AccVoucher = getAccVoucher();
  const query: any = { financialYear, type: 'PAYMENT', isReversed: { $ne: true } };
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo) query.date.$lte = dateTo;
  }
  return AccVoucher.find(query).sort({ date: -1 }).lean();
}

// ─── Ledger Statement (like "Ledger-wise view" in Tally) ────────────

export async function getLedgerStatement(
  ledgerId: string,
  financialYear: string,
  dateFrom?: Date,
  dateTo?: Date,
) {
  await connectDB();
  const AccVoucher = getAccVoucher();
  const AccLedger = getAccLedger();

  const ledger = await AccLedger.findById(ledgerId).lean();
  if (!ledger) throw new Error('Ledger not found');
  const l = ledger as any;

  const query: any = {
    financialYear,
    'entries.ledgerId': l._id,
    isReversed: { $ne: true },
  };
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo) query.date.$lte = dateTo;
  }

  const vouchers = await AccVoucher.find(query).sort({ date: 1 }).lean();

  // Build running balance
  let runningBalance = l.openingBalanceType === 'DEBIT' ? l.openingBalance : -l.openingBalance;

  const rows = (vouchers as any[]).map(v => {
    const entry = v.entries.find((e: any) => String(e.ledgerId) === String(l._id));
    if (!entry) return null;

    const debit = entry.type === 'DEBIT' ? entry.amount : 0;
    const credit = entry.type === 'CREDIT' ? entry.amount : 0;
    runningBalance += debit - credit;

    // Find contra ledger (the other side of this transaction)
    const contraEntries = v.entries.filter((e: any) => String(e.ledgerId) !== String(l._id));
    const contraNames = contraEntries.map((e: any) => e.ledgerName).join(', ');

    return {
      date: v.date,
      voucherNumber: v.voucherNumber,
      voucherType: v.type,
      contraLedger: contraNames,
      narration: v.narration,
      debit,
      credit,
      balance: Math.abs(runningBalance),
      balanceType: runningBalance >= 0 ? 'DEBIT' : 'CREDIT' as BalanceType,
    };
  }).filter(Boolean);

  return {
    ledgerName: l.name,
    group: l.group,
    subGroup: l.subGroup,
    openingBalance: l.openingBalance,
    openingBalanceType: l.openingBalanceType,
    transactions: rows,
    closingBalance: Math.abs(runningBalance),
    closingBalanceType: runningBalance >= 0 ? 'DEBIT' : 'CREDIT',
  };
}

// ─── Cash/Bank Summary ──────────────────────────────────────────────

export async function getCashBankSummary(financialYear: string, _balanceMap?: Map<string, LedgerBalance>) {
  await connectDB();

  // Use provided balanceMap or compute
  const balanceMap = _balanceMap || await batchCalculateLedgerBalances(financialYear);

  const cashBankSubGroups = new Set(['Cash-in-Hand', 'Bank Accounts', 'Cash', 'Bank']);
  const result: { name: string; subGroup: string; balance: number; balanceType: BalanceType; totalReceipts: number; totalPayments: number }[] = [];

  for (const bal of balanceMap.values()) {
    if (bal.group === 'ASSET' && cashBankSubGroups.has(bal.subGroup || '')) {
      result.push({
        name: bal.ledgerName,
        subGroup: bal.subGroup || '',
        balance: bal.closingBalance,
        balanceType: bal.closingBalanceType,
        totalReceipts: bal.periodDebit,
        totalPayments: bal.periodCredit,
      });
    }
  }

  return result;
}

// ─── Dashboard Summary ──────────────────────────────────────────────

export async function getAccountingSummary(financialYear: string) {
  await connectDB();
  const AccLedger = getAccLedger();
  const AccVoucher = getAccVoucher();
  const AccFinancialYear = getAccFinancialYear();

  // Compute ALL ledger balances once (2 queries instead of 70+)
  const balanceMap = await batchCalculateLedgerBalances(financialYear);

  // Generate P&L first, then pass it to BS to avoid double computation
  const pl = await generateProfitLoss(financialYear, undefined, balanceMap);
  const bs = await generateBalanceSheet(financialYear, undefined, balanceMap, pl);
  const cashBank = await getCashBankSummary(financialYear, balanceMap);

  const [ledgerCount, voucherCount, fyDoc] = await Promise.all([
    AccLedger.countDocuments({ financialYear, isActive: true }),
    AccVoucher.countDocuments({ financialYear, isReversed: { $ne: true } }),
    AccFinancialYear.findOne({ code: financialYear }).lean(),
  ]);

  // Voucher breakdown by type
  const voucherBreakdown = await AccVoucher.aggregate([
    { $match: { financialYear, isReversed: { $ne: true } } },
    { $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$totalDebit' } } },
    { $sort: { _id: 1 } },
  ]);

  // Calculate opening balance and cash-in-hand from the already-computed balanceMap
  let openingBalanceAssets = 0;
  let cashInHand = 0;

  for (const bal of balanceMap.values()) {
    if (bal.group === 'ASSET') {
      const openingAmount = bal.openingDebit - bal.openingCredit;
      openingBalanceAssets += openingAmount;
    }
    if (bal.subGroup === 'Cash-in-Hand') {
      cashInHand += bal.closingBalanceType === 'DEBIT' ? bal.closingBalance : -bal.closingBalance;
    }
  }

  // ── Bank totals: total received (debit to bank) & total spent (credit from bank) ──
  // Use actual bank ledger IDs (subGroup = 'Bank Accounts') instead of regex on name
  const bankLedgerIds = [...balanceMap.values()]
    .filter(b => b.subGroup === 'Bank Accounts')
    .map(b => {
      try { return new mongoose.Types.ObjectId(b.ledgerId); } catch { return b.ledgerId; }
    });
  const bankAgg = bankLedgerIds.length > 0
    ? await AccVoucher.aggregate([
        { $match: { financialYear, isReversed: { $ne: true } } },
        { $unwind: '$entries' },
        { $match: { 'entries.ledgerId': { $in: bankLedgerIds } } },
        { $group: { _id: '$entries.type', total: { $sum: '$entries.amount' } } },
      ])
    : [];
  let totalBankReceived = 0;
  let totalBankExpense = 0;
  for (const row of bankAgg) {
    if (row._id === 'DEBIT') totalBankReceived = Math.round(row.total * 100) / 100;
    if (row._id === 'CREDIT') totalBankExpense = Math.round(row.total * 100) / 100;
  }

  return {
    financialYear,
    ledgerCount,
    voucherCount,
    isClosed: !!(fyDoc as any)?.isClosed,
    profitLoss: {
      totalIncome: pl.totalIncome,
      totalExpense: pl.totalExpense,
      netProfit: pl.netProfit,
      isProfit: pl.isProfit,
    },
    balanceSheet: {
      totalAssets: bs.totalAssets,
      liabilitiesPlusCapital: bs.liabilitiesPlusCapital,
      difference: bs.difference,
      isBalanced: Math.abs(bs.difference) < 1,
    },
    cashBank,
    voucherBreakdown: voucherBreakdown.map(v => ({
      type: v._id,
      count: v.count,
      totalAmount: Math.round(v.totalAmount * 100) / 100,
    })),
    openingBalance: Math.round(openingBalanceAssets * 100) / 100,
    closingBalance: Math.round(bs.totalAssets * 100) / 100,
    cashInHand: Math.round(cashInHand * 100) / 100,
    totalBankReceived,
    totalBankExpense,
  };
}

// ─── Tally Prime XML Export (Universal Format) ──────────────────────

/**
 * Export all accounting data as Tally Prime compatible XML.
 * This format works with Tally Prime 1.x through latest, and Tally.ERP 9.
 * 
 * Structure follows Tally's standard XML import format:
 * <ENVELOPE><HEADER/><BODY><IMPORTDATA><REQUESTDESC/>
 *   <REQUESTDATA><TALLYMESSAGE>..masters+vouchers..</TALLYMESSAGE></REQUESTDATA>
 * </IMPORTDATA></BODY></ENVELOPE>
 */
export async function exportTallyXML(financialYear: string): Promise<string> {
  await connectDB();
  const AccLedger = getAccLedger();
  const AccVoucher = getAccVoucher();
  const AccGroup = getAccGroup();
  const AccFinancialYear = getAccFinancialYear();

  const fyDoc = await AccFinancialYear.findOne({ code: financialYear }).lean() as any;
  const companyName = fyDoc?.companyName || 'Swar Yoga';
  const fyStart = fyDoc?.startDate ? new Date(fyDoc.startDate) : new Date();
  const fyEnd = fyDoc?.endDate ? new Date(fyDoc.endDate) : new Date();

  const groups = await AccGroup.find({ financialYear }).lean() as any[];
  const ledgers = await AccLedger.find({ financialYear, isActive: true }).lean() as any[];
  const vouchers = await AccVoucher.find({ financialYear, isReversed: { $ne: true } }).sort({ date: 1 }).lean() as any[];

  // Tally group mapping
  const TALLY_GROUP_MAP: Record<string, string> = {
    ASSET: 'Current Assets',
    LIABILITY: 'Current Liabilities',
    INCOME: 'Income (Direct)',
    EXPENSE: 'Indirect Expenses',
    CAPITAL: 'Capital Account',
  };

  const TALLY_SUBGROUP_MAP: Record<string, string> = {
    'Cash-in-Hand': 'Cash-in-Hand',
    'Bank Accounts': 'Bank Accounts',
    'Fixed Assets': 'Fixed Assets',
    'Current Assets': 'Current Assets',
    'Sundry Debtors': 'Sundry Debtors',
    'Investments': 'Investments',
    'Current Liabilities': 'Current Liabilities',
    'Sundry Creditors': 'Sundry Creditors',
    'Secured Loans': 'Secured Loans',
    'Unsecured Loans': 'Unsecured Loans',
    'Duties & Taxes': 'Duties & Taxes',
    'Provisions': 'Provisions',
    'Direct Incomes': 'Direct Incomes',
    'Indirect Incomes': 'Indirect Incomes',
    'Sales Accounts': 'Sales Accounts',
    'Direct Expenses': 'Direct Expenses',
    'Indirect Expenses': 'Indirect Expenses',
    'Purchase Accounts': 'Purchase Accounts',
    'Admin Expenses': 'Indirect Expenses',
    'Depreciation': 'Indirect Expenses',
    'Capital Account': 'Capital Account',
    'Share Capital': 'Capital Account',
    'Retained Earnings': 'Reserves & Surplus',
    'Capital Reserve': 'Reserves & Surplus',
    'General Reserve': 'Reserves & Surplus',
  };

  const TALLY_VOUCHER_TYPE: Record<string, string> = {
    RECEIPT: 'Receipt',
    PAYMENT: 'Payment',
    JOURNAL: 'Journal',
    CONTRA: 'Contra',
    SALES: 'Sales',
    PURCHASE: 'Purchase',
    DEBIT_NOTE: 'Debit Note',
    CREDIT_NOTE: 'Credit Note',
  };

  const fmtDate = (d: Date) => {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
  };

  const escXml = (s: string) => s?.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') || '';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<ENVELOPE>\n`;
  xml += ` <HEADER>\n`;
  xml += `  <TALLYREQUEST>Import Data</TALLYREQUEST>\n`;
  xml += ` </HEADER>\n`;
  xml += ` <BODY>\n`;
  xml += `  <IMPORTDATA>\n`;
  xml += `   <REQUESTDESC>\n`;
  xml += `    <REPORTNAME>All Masters</REPORTNAME>\n`;
  xml += `    <STATICVARIABLES>\n`;
  xml += `     <SVCURRENTCOMPANY>${escXml(companyName)}</SVCURRENTCOMPANY>\n`;
  xml += `    </STATICVARIABLES>\n`;
  xml += `   </REQUESTDESC>\n`;
  xml += `   <REQUESTDATA>\n`;

  // ── Export Groups ──
  // CRITICAL: Skip groups that match Tally's built-in predefined groups.
  // Tally Prime has ~28 built-in groups that cannot be re-created via XML import.
  // Trying to CREATE them causes errors / duplicates / corruption.
  const TALLY_BUILTIN_GROUPS = new Set([
    'Capital Account', 'Current Assets', 'Current Liabilities',
    'Direct Expenses', 'Direct Incomes', 'Fixed Assets',
    'Indirect Expenses', 'Indirect Incomes', 'Investments',
    'Loans (Liability)', 'Secured Loans', 'Unsecured Loans',
    'Suspense A/c', 'Misc. Expenses (ASSET)',
    'Purchase Accounts', 'Sales Accounts',
    'Cash-in-Hand', 'Bank Accounts', 'Bank OCC A/c', 'Bank OD A/c',
    'Sundry Debtors', 'Sundry Creditors', 'Duties & Taxes', 'Provisions',
    'Reserves & Surplus', 'Stock-in-Hand', 'Deposits (Asset)',
    'Loans & Advances (Asset)', 'Branch / Divisions', 'Primary',
  ]);

  for (const g of groups) {
    // Skip built-in groups — they already exist in every Tally company
    if (TALLY_BUILTIN_GROUPS.has(g.name)) continue;

    const parentGroup = TALLY_SUBGROUP_MAP[g.name] || TALLY_GROUP_MAP[g.nature] || 'Primary';
    xml += `    <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `     <GROUP NAME="${escXml(g.name)}" ACTION="Create">\n`;
    xml += `      <NAME.LIST>\n`;
    xml += `       <NAME>${escXml(g.name)}</NAME>\n`;
    xml += `      </NAME.LIST>\n`;
    xml += `      <PARENT>${escXml(parentGroup)}</PARENT>\n`;
    xml += `      <ISSUBLEDGER>No</ISSUBLEDGER>\n`;
    xml += `      <ISREVENUE>${g.report === 'profit_loss' ? 'Yes' : 'No'}</ISREVENUE>\n`;
    xml += `      <AFFECTSGROSSPROFIT>${g.affectsGrossProfit ? 'Yes' : 'No'}</AFFECTSGROSSPROFIT>\n`;
    xml += `     </GROUP>\n`;
    xml += `    </TALLYMESSAGE>\n`;
  }

  // ── Create "Profit & Loss A/c" ledger (required for journal vouchers) ──
  // This is a Tally reserved ledger under "Primary" group. We must create it
  // explicitly so the compound journal can reference it.
  xml += `    <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
  xml += `     <LEDGER NAME="Profit &amp; Loss A/c" ACTION="Create">\n`;
  xml += `      <NAME.LIST>\n`;
  xml += `       <NAME>Profit &amp; Loss A/c</NAME>\n`;
  xml += `      </NAME.LIST>\n`;
  xml += `      <PARENT>Primary</PARENT>\n`;
  xml += `      <OPENINGBALANCE>0.00</OPENINGBALANCE>\n`;
  xml += `     </LEDGER>\n`;
  xml += `    </TALLYMESSAGE>\n`;

  // ── Export Ledgers ──
  // CRITICAL for Tally Prime: Income/Expense are NOMINAL accounts — they must
  // NOT have opening balances. Only BS items (Asset, Liability, Capital) get OBs.
  // Income/Expense amounts are recorded via Journal vouchers below.
  const nominalLedgers: typeof ledgers = []; // income/expense to journal later

  for (const l of ledgers) {
    const tallyGroup = l.subGroup
      ? (TALLY_SUBGROUP_MAP[l.subGroup] || l.subGroup)
      : (TALLY_GROUP_MAP[l.group] || 'Sundry Debtors');

    const openBal = l.openingBalance || 0;
    const isNominal = l.group === 'INCOME' || l.group === 'EXPENSE';

    // Tally convention: positive = debit, negative = credit for opening
    // Nominal accounts get OB = 0 (their amounts go in as vouchers)
    const tallyOpenBal = isNominal ? 0 : (l.openingBalanceType === 'DEBIT' ? openBal : -openBal);

    if (isNominal && openBal > 0) nominalLedgers.push(l);

    xml += `    <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `     <LEDGER NAME="${escXml(l.name)}" ACTION="Create">\n`;
    xml += `      <NAME.LIST>\n`;
    xml += `       <NAME>${escXml(l.name)}</NAME>\n`;
    xml += `      </NAME.LIST>\n`;
    xml += `      <PARENT>${escXml(tallyGroup)}</PARENT>\n`;
    xml += `      <OPENINGBALANCE>${tallyOpenBal.toFixed(2)}</OPENINGBALANCE>\n`;
    if (l.gstin) xml += `      <PARTYGSTIN>${escXml(l.gstin)}</PARTYGSTIN>\n`;
    if (l.pan) xml += `      <INCOMETAXNUMBER>${escXml(l.pan)}</INCOMETAXNUMBER>\n`;
    if (l.address) xml += `      <ADDRESS.LIST><ADDRESS>${escXml(l.address)}</ADDRESS></ADDRESS.LIST>\n`;
    if (l.state) xml += `      <LEDSTATENAME>${escXml(l.state)}</LEDSTATENAME>\n`;
    if (l.email) xml += `      <EMAIL>${escXml(l.email)}</EMAIL>\n`;
    if (l.phone) xml += `      <LEDGERPHONE>${escXml(l.phone)}</LEDGERPHONE>\n`;
    xml += `     </LEDGER>\n`;
    xml += `    </TALLYMESSAGE>\n`;
  }

  // ── Income/Expense Journal Vouchers (CA Report annual amounts) ──
  // When no vouchers exist, Income/Expense amounts from CA report must be
  // entered as Journal vouchers so Tally shows them as period turnover, not OBs.
  // We create ONE compound Journal: Dr all Expenses + Cr all Incomes + net to P&L A/c
  if (vouchers.length === 0 && nominalLedgers.length > 0) {
    const fyStartDate = fmtDate(fyStart);

    const incomeEntries = nominalLedgers.filter(l => l.group === 'INCOME');
    const expenseEntries = nominalLedgers.filter(l => l.group === 'EXPENSE');

    let totalIncAmt = incomeEntries.reduce((s, l) => s + (l.openingBalance || 0), 0);
    let totalExpAmt = expenseEntries.reduce((s, l) => s + (l.openingBalance || 0), 0);

    // Single compound Journal — self-balancing:
    //   Dr: All Expense ledgers (their annual amounts)
    //   Cr: All Income ledgers (their annual amounts)
    //   Net difference → Profit & Loss A/c (balancing entry)
    //
    // This makes Tally show correct P&L period turnover WITHOUT
    // touching any BS ledger (no Cash-in-Hand inflation)
    xml += `    <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `     <VOUCHER VCHTYPE="Journal" ACTION="Create">\n`;
    xml += `      <DATE>${fyStartDate}</DATE>\n`;
    xml += `      <EFFECTIVEDATE>${fyStartDate}</EFFECTIVEDATE>\n`;
    xml += `      <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>\n`;
    xml += `      <NARRATION>FY ${financialYear} — CA Report: Annual Income &amp; Expense Summary</NARRATION>\n`;

    // Debit all expense ledgers
    for (const l of expenseEntries) {
      const amt = l.openingBalance || 0;
      xml += `      <ALLLEDGERENTRIES.LIST>\n`;
      xml += `       <LEDGERNAME>${escXml(l.name)}</LEDGERNAME>\n`;
      xml += `       <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
      xml += `       <AMOUNT>${amt.toFixed(2)}</AMOUNT>\n`;
      xml += `      </ALLLEDGERENTRIES.LIST>\n`;
    }

    // Credit all income ledgers
    for (const l of incomeEntries) {
      const amt = l.openingBalance || 0;
      xml += `      <ALLLEDGERENTRIES.LIST>\n`;
      xml += `       <LEDGERNAME>${escXml(l.name)}</LEDGERNAME>\n`;
      xml += `       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
      xml += `       <AMOUNT>-${amt.toFixed(2)}</AMOUNT>\n`;
      xml += `      </ALLLEDGERENTRIES.LIST>\n`;
    }

    // Balancing entry → Profit & Loss A/c
    // Journal sum so far: +totalExpAmt (Dr) - totalIncAmt (Cr)
    // P&L entry must be -plDiff to bring total to 0
    const plDiff = totalExpAmt - totalIncAmt; // positive = loss, negative = profit
    if (Math.abs(plDiff) > 0.01) {
      // Loss (plDiff>0): P&L A/c is CREDITED (-plDiff is negative) to balance
      // Profit (plDiff<0): P&L A/c is DEBITED (-plDiff is positive) to balance
      xml += `      <ALLLEDGERENTRIES.LIST>\n`;
      xml += `       <LEDGERNAME>Profit &amp; Loss A/c</LEDGERNAME>\n`;
      xml += `       <ISDEEMEDPOSITIVE>${plDiff > 0 ? 'No' : 'Yes'}</ISDEEMEDPOSITIVE>\n`;
      xml += `       <AMOUNT>${(-plDiff).toFixed(2)}</AMOUNT>\n`;
      xml += `      </ALLLEDGERENTRIES.LIST>\n`;
    }

    xml += `     </VOUCHER>\n`;
    xml += `    </TALLYMESSAGE>\n`;
  }

  // ── Year-End Profit → Capital Transfer (Voucher-mode only) ──
  // Only needed when actual vouchers exist. For CA Report mode, the compound
  // journal above already pushes the net P&L into "Profit & Loss A/c", and
  // the BS OBs (being closing figures) already include the P&L absorption —
  // adding a transfer would double-count.
  if (vouchers.length > 0) {
    const balanceMap = await batchCalculateLedgerBalances(financialYear);
    const pl = await generateProfitLoss(financialYear, undefined, balanceMap);
    const profitFromVouchers = pl.netProfit;
    if (Math.abs(profitFromVouchers) > 0) {
      const profitToCapital = Math.abs(profitFromVouchers);
      const fyEndDate = fmtDate(fyEnd);

      xml += `    <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
      xml += `     <VOUCHER VCHTYPE="Journal" ACTION="Create">\n`;
      xml += `      <DATE>${fyEndDate}</DATE>\n`;
      xml += `      <EFFECTIVEDATE>${fyEndDate}</EFFECTIVEDATE>\n`;
      xml += `      <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>\n`;
      xml += `      <NARRATION>Year End Profit Transfer — FY ${financialYear}</NARRATION>\n`;
      xml += `      <ALLLEDGERENTRIES.LIST>\n`;
      xml += `       <LEDGERNAME>Profit &amp; Loss A/c</LEDGERNAME>\n`;
      xml += `       <ISDEEMEDPOSITIVE>${pl.isProfit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>\n`;
      xml += `       <AMOUNT>${pl.isProfit ? -profitToCapital : profitToCapital}</AMOUNT>\n`;
      xml += `      </ALLLEDGERENTRIES.LIST>\n`;
      xml += `      <ALLLEDGERENTRIES.LIST>\n`;
      xml += `       <LEDGERNAME>Capital Account</LEDGERNAME>\n`;
      xml += `       <ISDEEMEDPOSITIVE>${pl.isProfit ? 'No' : 'Yes'}</ISDEEMEDPOSITIVE>\n`;
      xml += `       <AMOUNT>${pl.isProfit ? profitToCapital : -profitToCapital}</AMOUNT>\n`;
      xml += `      </ALLLEDGERENTRIES.LIST>\n`;
      xml += `     </VOUCHER>\n`;
      xml += `    </TALLYMESSAGE>\n`;
    }
  }

  // ── Export Vouchers ──
  for (const v of vouchers) {
    const vType = TALLY_VOUCHER_TYPE[v.type] || 'Journal';
    const vDate = fmtDate(v.date);

    xml += `    <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
    xml += `     <VOUCHER VCHTYPE="${escXml(vType)}" ACTION="Create">\n`;
    xml += `      <DATE>${vDate}</DATE>\n`;
    xml += `      <EFFECTIVEDATE>${vDate}</EFFECTIVEDATE>\n`;
    xml += `      <VOUCHERTYPENAME>${escXml(vType)}</VOUCHERTYPENAME>\n`;
    xml += `      <VOUCHERNUMBER>${escXml(v.voucherNumber)}</VOUCHERNUMBER>\n`;
    if (v.narration) xml += `      <NARRATION>${escXml(v.narration)}</NARRATION>\n`;
    if (v.partyName) xml += `      <PARTYLEDGERNAME>${escXml(v.partyName)}</PARTYLEDGERNAME>\n`;

    // Ledger entries — Tally uses ALLLEDGERENTRIES.LIST
    for (const entry of v.entries || []) {
      // In Tally: positive amount = debit, negative = credit
      const tallyAmount = entry.type === 'DEBIT' ? entry.amount : -entry.amount;
      xml += `      <ALLLEDGERENTRIES.LIST>\n`;
      xml += `       <LEDGERNAME>${escXml(entry.ledgerName)}</LEDGERNAME>\n`;
      xml += `       <ISDEEMEDPOSITIVE>${entry.type === 'DEBIT' ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>\n`;
      xml += `       <AMOUNT>${tallyAmount.toFixed(2)}</AMOUNT>\n`;
      xml += `      </ALLLEDGERENTRIES.LIST>\n`;
    }

    xml += `     </VOUCHER>\n`;
    xml += `    </TALLYMESSAGE>\n`;
  }

  xml += `   </REQUESTDATA>\n`;
  xml += `  </IMPORTDATA>\n`;
  xml += ` </BODY>\n`;
  xml += `</ENVELOPE>`;

  return xml;
}

/**
 * Standalone Tally XML builder — simplified format matching Tally Prime import spec.
 * Use this for quick exports without full DB lookups.
 *
 * @param ledgers Array of { name, group, openingBalance, openingBalanceType }
 * @param vouchers Array of { date (YYYY-MM-DD), narration, entries: [{ ledgerName, amount, type }] }
 * @param profitToCapital Net Profit/Loss amount to transfer to Capital Account
 */
export function buildTallyXML(
  ledgers: { name: string; group: string; openingBalance: number; openingBalanceType: string }[],
  vouchers: { date: string; narration?: string; entries: { ledgerName: string; amount: number; type: string }[] }[],
  profitToCapital: number,
): string {
  const escXml = (s: string) => s?.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') || '';

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<ENVELOPE>\n`;
  xml += `  <HEADER>\n`;
  xml += `    <TALLYREQUEST>Import Data</TALLYREQUEST>\n`;
  xml += `  </HEADER>\n`;
  xml += `  <BODY>\n`;
  xml += `    <IMPORTDATA>\n`;
  xml += `      <REQUESTDESC>\n`;
  xml += `        <REPORTNAME>All Masters</REPORTNAME>\n`;
  xml += `      </REQUESTDESC>\n`;
  xml += `      <REQUESTDATA>\n`;

  // 1. Export LEDGERS
  for (const l of ledgers) {
    const balance = l.openingBalanceType === 'DEBIT' ? l.openingBalance : -l.openingBalance;
    xml += `        <TALLYMESSAGE>\n`;
    xml += `          <LEDGER NAME="${escXml(l.name)}">\n`;
    xml += `            <GROUP>${escXml(l.group)}</GROUP>\n`;
    xml += `            <OPENINGBALANCE>${balance}</OPENINGBALANCE>\n`;
    xml += `          </LEDGER>\n`;
    xml += `        </TALLYMESSAGE>\n`;
  }

  // 2. Transfer PROFIT → CAPITAL / RESERVES
  if (Math.abs(profitToCapital) > 0) {
    xml += `        <TALLYMESSAGE>\n`;
    xml += `          <VOUCHER VCHTYPE="Journal" ACTION="Create">\n`;
    xml += `            <DATE>01042024</DATE>\n`;
    xml += `            <NARRATION>Year End Profit Transfer</NARRATION>\n`;
    xml += `            <ALLLEDGERENTRIES.LIST>\n`;
    xml += `              <LEDGERNAME>Profit &amp; Loss A/c</LEDGERNAME>\n`;
    xml += `              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>\n`;
    xml += `              <AMOUNT>-${Math.abs(profitToCapital)}</AMOUNT>\n`;
    xml += `            </ALLLEDGERENTRIES.LIST>\n`;
    xml += `            <ALLLEDGERENTRIES.LIST>\n`;
    xml += `              <LEDGERNAME>Capital Account</LEDGERNAME>\n`;
    xml += `              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>\n`;
    xml += `              <AMOUNT>${Math.abs(profitToCapital)}</AMOUNT>\n`;
    xml += `            </ALLLEDGERENTRIES.LIST>\n`;
    xml += `          </VOUCHER>\n`;
    xml += `        </TALLYMESSAGE>\n`;
  }

  // 3. Export VOUCHERS
  for (const v of vouchers) {
    const [Y, M, D] = v.date.split('-');
    const tallyDate = `${D}${M}${Y}`;

    xml += `        <TALLYMESSAGE>\n`;
    xml += `          <VOUCHER VCHTYPE="Journal" ACTION="Create">\n`;
    xml += `            <DATE>${tallyDate}</DATE>\n`;
    xml += `            <NARRATION>${escXml(v.narration || '')}</NARRATION>\n`;

    for (const e of v.entries) {
      const amt = e.type === 'DEBIT' ? e.amount : -e.amount;
      xml += `            <ALLLEDGERENTRIES.LIST>\n`;
      xml += `              <LEDGERNAME>${escXml(e.ledgerName)}</LEDGERNAME>\n`;
      xml += `              <AMOUNT>${amt}</AMOUNT>\n`;
      xml += `            </ALLLEDGERENTRIES.LIST>\n`;
    }

    xml += `          </VOUCHER>\n`;
    xml += `        </TALLYMESSAGE>\n`;
  }

  xml += `      </REQUESTDATA>\n`;
  xml += `    </IMPORTDATA>\n`;
  xml += `  </BODY>\n`;
  xml += `</ENVELOPE>`;

  return xml;
}

// ─── Tally Prime XML Import (Parse Universal Format) ────────────────

/**
 * Parse Tally Prime XML (exported from any version) and import into our system.
 * Handles both Tally.ERP 9 and Tally Prime XML formats.
 */
export async function importTallyXML(xmlContent: string, financialYear: string, createdByUserId?: string) {
  await connectDB();
  const AccLedger = getAccLedger();
  const AccVoucher = getAccVoucher();
  const AccGroup = getAccGroup();

  // Simple XML parser — extract nodes
  const extractNodes = (xml: string, tag: string): string[] => {
    const results: string[] = [];
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
    let match;
    while ((match = regex.exec(xml)) !== null) results.push(match[0]);
    return results;
  };

  const extractValue = (xml: string, tag: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'));
    return match?.[1]?.trim() || '';
  };

  const extractAttr = (xml: string, tag: string, attr: string): string => {
    const match = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i'));
    return match?.[1]?.trim() || '';
  };

  // Reverse group mapping — Tally group → our group
  const REVERSE_GROUP_MAP: Record<string, AccountGroup> = {
    'Cash-in-Hand': 'ASSET',
    'Bank Accounts': 'ASSET',
    'Bank OCC A/c': 'ASSET',
    'Bank OD A/c': 'ASSET',
    'Fixed Assets': 'ASSET',
    'Current Assets': 'ASSET',
    'Sundry Debtors': 'ASSET',
    'Investments': 'ASSET',
    'Stock-in-Hand': 'ASSET',
    'Deposits (Asset)': 'ASSET',
    'Loans & Advances (Asset)': 'ASSET',
    'Current Liabilities': 'LIABILITY',
    'Sundry Creditors': 'LIABILITY',
    'Secured Loans': 'LIABILITY',
    'Unsecured Loans': 'LIABILITY',
    'Duties & Taxes': 'LIABILITY',
    'Provisions': 'LIABILITY',
    'Direct Incomes': 'INCOME',
    'Indirect Incomes': 'INCOME',
    'Sales Accounts': 'INCOME',
    'Income (Direct)': 'INCOME',
    'Income (Indirect)': 'INCOME',
    'Direct Expenses': 'EXPENSE',
    'Indirect Expenses': 'EXPENSE',
    'Purchase Accounts': 'EXPENSE',
    'Manufacturing Expenses': 'EXPENSE',
    'Administrative Expenses': 'EXPENSE',
    'Capital Account': 'CAPITAL',
    'Reserves & Surplus': 'CAPITAL',
    'Share Capital': 'CAPITAL',
    'Partners Capital': 'CAPITAL',
    'Retained Earnings': 'CAPITAL',
    // Default category mappings
    'Primary': 'ASSET',
  };

  const REVERSE_VOUCHER_MAP: Record<string, VoucherType> = {
    'Receipt': 'RECEIPT',
    'Payment': 'PAYMENT',
    'Journal': 'JOURNAL',
    'Contra': 'CONTRA',
    'Sales': 'SALES',
    'Purchase': 'PURCHASE',
    'Debit Note': 'DEBIT_NOTE',
    'Credit Note': 'CREDIT_NOTE',
  };

  let importedGroups = 0;
  let importedLedgers = 0;
  let importedVouchers = 0;
  const errors: string[] = [];

  // ── Parse & Import Groups ──
  const groupNodes = extractNodes(xmlContent, 'GROUP');
  for (const gXml of groupNodes) {
    try {
      const name = extractValue(gXml, 'NAME') || extractAttr(gXml, 'GROUP', 'NAME');
      const parent = extractValue(gXml, 'PARENT');
      if (!name) continue;

      const nature = REVERSE_GROUP_MAP[parent] || REVERSE_GROUP_MAP[name] || 'ASSET';
      const isRevenue = extractValue(gXml, 'ISREVENUE')?.toLowerCase() === 'yes';

      const existing = await AccGroup.findOne({ name, financialYear });
      if (!existing) {
        await AccGroup.create({
          name,
          nature,
          report: isRevenue || nature === 'INCOME' || nature === 'EXPENSE' ? 'profit_loss' : 'balance_sheet',
          financialYear,
          isSystemDefault: false,
          createdByUserId,
        });
        importedGroups++;
      }
    } catch (e: any) { errors.push(`Group: ${e.message}`); }
  }

  // ── Parse & Import Ledgers ──
  const ledgerNodes = extractNodes(xmlContent, 'LEDGER');
  const ledgerNameMap: Record<string, string> = {}; // name → id mapping
  for (const lXml of ledgerNodes) {
    try {
      const name = extractValue(lXml, 'NAME') || extractAttr(lXml, 'LEDGER', 'NAME');
      const parent = extractValue(lXml, 'PARENT');
      if (!name) continue;

      const group = REVERSE_GROUP_MAP[parent] || 'ASSET';
      const subGroup = parent || undefined;

      // Parse opening balance — Tally: positive=debit, negative=credit
      const obStr = extractValue(lXml, 'OPENINGBALANCE');
      const obVal = parseFloat(obStr) || 0;
      const openingBalance = Math.abs(obVal);
      const openingBalanceType: BalanceType = obVal >= 0 ? 'DEBIT' : 'CREDIT';

      const gstin = extractValue(lXml, 'PARTYGSTIN');
      const pan = extractValue(lXml, 'INCOMETAXNUMBER');
      const email = extractValue(lXml, 'EMAIL');
      const phone = extractValue(lXml, 'LEDGERPHONE');
      const state = extractValue(lXml, 'LEDSTATENAME');
      const address = extractValue(lXml, 'ADDRESS');

      const existing = await AccLedger.findOne({ name, financialYear });
      if (existing) {
        ledgerNameMap[name] = String((existing as any)._id);
      } else {
        const doc = await AccLedger.create({
          name,
          group,
          subGroup: subGroup || undefined,
          openingBalance,
          openingBalanceType,
          financialYear,
          gstin: gstin || undefined,
          pan: pan || undefined,
          email: email || undefined,
          phone: phone || undefined,
          state: state || undefined,
          address: address || undefined,
          isActive: true,
          createdByUserId,
        });
        ledgerNameMap[name] = String(doc._id);
        importedLedgers++;
      }
    } catch (e: any) { errors.push(`Ledger: ${e.message}`); }
  }

  // Refresh ledger name map with all ledgers
  const allLedgers = await AccLedger.find({ financialYear }).lean() as any[];
  for (const l of allLedgers) {
    ledgerNameMap[l.name] = String(l._id);
  }

  // ── Parse & Import Vouchers ──
  const voucherNodes = extractNodes(xmlContent, 'VOUCHER');
  for (const vXml of voucherNodes) {
    try {
      const vTypeName = extractValue(vXml, 'VOUCHERTYPENAME') || extractAttr(vXml, 'VOUCHER', 'VCHTYPE');
      const dateStr = extractValue(vXml, 'DATE');
      const narration = extractValue(vXml, 'NARRATION');
      const partyName = extractValue(vXml, 'PARTYLEDGERNAME');
      const origVoucherNum = extractValue(vXml, 'VOUCHERNUMBER');

      const vType = REVERSE_VOUCHER_MAP[vTypeName] || 'JOURNAL';

      // Parse date — Tally format: YYYYMMDD
      let vDate: Date;
      if (dateStr && dateStr.length === 8) {
        vDate = new Date(
          parseInt(dateStr.substring(0, 4)),
          parseInt(dateStr.substring(4, 6)) - 1,
          parseInt(dateStr.substring(6, 8))
        );
      } else if (dateStr) {
        vDate = new Date(dateStr);
      } else {
        continue; // Skip vouchers without date
      }

      if (isNaN(vDate.getTime())) continue;

      // Parse ledger entries
      const entryNodes = extractNodes(vXml, 'ALLLEDGERENTRIES.LIST');
      const entries: { ledgerId: string; ledgerName: string; amount: number; type: BalanceType }[] = [];

      for (const eXml of entryNodes) {
        const ledgerName = extractValue(eXml, 'LEDGERNAME');
        const amountStr = extractValue(eXml, 'AMOUNT');
        const isDeemedPositive = extractValue(eXml, 'ISDEEMEDPOSITIVE')?.toLowerCase() === 'yes';

        if (!ledgerName) continue;
        const amount = parseFloat(amountStr) || 0;
        // In Tally: positive = debit (ISDEEMEDPOSITIVE=Yes), negative = credit
        const entryType: BalanceType = isDeemedPositive || amount > 0 ? 'DEBIT' : 'CREDIT';

        const ledgerId = ledgerNameMap[ledgerName];
        if (!ledgerId) {
          errors.push(`Voucher entry: Ledger "${ledgerName}" not found`);
          continue;
        }

        entries.push({
          ledgerId,
          ledgerName,
          amount: Math.abs(amount),
          type: entryType,
        });
      }

      if (entries.length < 2) continue;

      // Validate balance
      const totalDebit = entries.filter(e => e.type === 'DEBIT').reduce((s, e) => s + e.amount, 0);
      const totalCredit = entries.filter(e => e.type === 'CREDIT').reduce((s, e) => s + e.amount, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        errors.push(`Voucher ${origVoucherNum || 'unknown'}: Not balanced (Dr: ${totalDebit.toFixed(2)}, Cr: ${totalCredit.toFixed(2)})`);
        continue;
      }

      // Generate new voucher number and create
      const voucherNumber = await generateVoucherNumber(vType, financialYear);
      await AccVoucher.create({
        voucherNumber,
        date: vDate,
        type: vType,
        entries,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        narration: narration || undefined,
        financialYear,
        partyName: partyName || undefined,
        createdByUserId,
        metadata: { importedFrom: 'TallyPrime', originalVoucherNumber: origVoucherNum },
      });
      importedVouchers++;
    } catch (e: any) { errors.push(`Voucher: ${e.message}`); }
  }

  return {
    message: `Import complete. Groups: ${importedGroups}, Ledgers: ${importedLedgers}, Vouchers: ${importedVouchers}`,
    importedGroups,
    importedLedgers,
    importedVouchers,
    errors: errors.slice(0, 50), // cap error output
  };
}

// ─── JSON Export (for cross-system portability) ─────────────────────

export async function exportTallyJSON(financialYear: string) {
  await connectDB();
  const AccLedger = getAccLedger();
  const AccVoucher = getAccVoucher();
  const AccGroup = getAccGroup();
  const AccFinancialYear = getAccFinancialYear();

  const fyDoc = await AccFinancialYear.findOne({ code: financialYear }).lean() as any;
  const groups = await AccGroup.find({ financialYear }).lean();
  const ledgers = await AccLedger.find({ financialYear, isActive: true }).lean();
  const vouchers = await AccVoucher.find({ financialYear, isReversed: { $ne: true } }).sort({ date: 1 }).lean();

  return {
    format: 'SwarYoga-Tally-v1',
    exportedAt: new Date().toISOString(),
    financialYear: {
      code: fyDoc?.code || financialYear,
      companyName: fyDoc?.companyName || 'Swar Yoga',
      startDate: fyDoc?.startDate,
      endDate: fyDoc?.endDate,
    },
    groups: (groups as any[]).map(g => ({
      name: g.name,
      nature: g.nature,
      report: g.report,
      affectsGrossProfit: g.affectsGrossProfit || false,
    })),
    ledgers: (ledgers as any[]).map(l => ({
      name: l.name,
      group: l.group,
      subGroup: l.subGroup,
      openingBalance: l.openingBalance,
      openingBalanceType: l.openingBalanceType,
      gstin: l.gstin,
      pan: l.pan,
      email: l.email,
      phone: l.phone,
      address: l.address,
      state: l.state,
    })),
    vouchers: (vouchers as any[]).map(v => ({
      voucherNumber: v.voucherNumber,
      date: v.date,
      type: v.type,
      entries: (v.entries || []).map((e: any) => ({
        ledgerName: e.ledgerName,
        amount: e.amount,
        type: e.type,
      })),
      narration: v.narration,
      partyName: v.partyName,
    })),
  };
}

// ─── JSON Import (cross-system portability) ─────────────────────────

export async function importTallyJSON(jsonData: any, financialYear: string, createdByUserId?: string) {
  await connectDB();
  const AccLedger = getAccLedger();
  const AccVoucher = getAccVoucher();
  const AccGroup = getAccGroup();

  let importedGroups = 0;
  let importedLedgers = 0;
  let importedVouchers = 0;
  const errors: string[] = [];

  // Import groups
  for (const g of jsonData.groups || []) {
    try {
      const existing = await AccGroup.findOne({ name: g.name, financialYear });
      if (!existing) {
        await AccGroup.create({
          name: g.name,
          nature: g.nature || 'ASSET',
          report: g.report || 'balance_sheet',
          affectsGrossProfit: g.affectsGrossProfit || false,
          financialYear,
          isSystemDefault: false,
          createdByUserId,
        });
        importedGroups++;
      }
    } catch (e: any) { errors.push(`Group "${g.name}": ${e.message}`); }
  }

  // Import ledgers
  const ledgerNameMap: Record<string, string> = {};
  for (const l of jsonData.ledgers || []) {
    try {
      const existing = await AccLedger.findOne({ name: l.name, financialYear });
      if (existing) {
        ledgerNameMap[l.name] = String((existing as any)._id);
      } else {
        const doc = await AccLedger.create({
          name: l.name,
          group: l.group || 'ASSET',
          subGroup: l.subGroup || undefined,
          openingBalance: l.openingBalance || 0,
          openingBalanceType: l.openingBalanceType || 'DEBIT',
          financialYear,
          gstin: l.gstin,
          pan: l.pan,
          email: l.email,
          phone: l.phone,
          address: l.address,
          state: l.state,
          isActive: true,
          createdByUserId,
        });
        ledgerNameMap[l.name] = String(doc._id);
        importedLedgers++;
      }
    } catch (e: any) { errors.push(`Ledger "${l.name}": ${e.message}`); }
  }

  // Refresh all ledger maps
  const allLedgers = await AccLedger.find({ financialYear }).lean() as any[];
  for (const l of allLedgers) ledgerNameMap[l.name] = String(l._id);

  // Import vouchers
  for (const v of jsonData.vouchers || []) {
    try {
      const entries = (v.entries || []).map((e: any) => {
        const ledgerId = ledgerNameMap[e.ledgerName];
        if (!ledgerId) throw new Error(`Ledger "${e.ledgerName}" not found`);
        return { ledgerId, ledgerName: e.ledgerName, amount: e.amount, type: e.type };
      });
      if (entries.length < 2) continue;

      const totalDebit = entries.filter((e: any) => e.type === 'DEBIT').reduce((s: number, e: any) => s + e.amount, 0);
      const totalCredit = entries.filter((e: any) => e.type === 'CREDIT').reduce((s: number, e: any) => s + e.amount, 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) continue;

      const voucherNumber = await generateVoucherNumber(v.type || 'JOURNAL', financialYear);
      await AccVoucher.create({
        voucherNumber,
        date: new Date(v.date),
        type: v.type || 'JOURNAL',
        entries,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        narration: v.narration,
        financialYear,
        partyName: v.partyName,
        createdByUserId,
        metadata: { importedFrom: 'JSON', originalVoucherNumber: v.voucherNumber },
      });
      importedVouchers++;
    } catch (e: any) { errors.push(`Voucher: ${e.message}`); }
  }

  return {
    message: `JSON Import complete. Groups: ${importedGroups}, Ledgers: ${importedLedgers}, Vouchers: ${importedVouchers}`,
    importedGroups,
    importedLedgers,
    importedVouchers,
    errors: errors.slice(0, 50),
  };
}

// ─── Default Groups Seed ────────────────────────────────────────────
// Call this once when setting up a new financial year

// ─── Monthly P&L Breakdown ──────────────────────────────────────────

export interface MonthlyPLRow {
  month: string;        // "Apr 2025", "May 2025", etc.
  monthNum: number;     // 4 = Apr, 5 = May, ...
  year: number;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  isProfit: boolean;
}

export async function generateMonthlyPL(financialYear: string): Promise<MonthlyPLRow[]> {
  await connectDB();
  const AccLedger = getAccLedger();
  const AccVoucher = getAccVoucher();

  // Parse FY code: "2025-26" → start April 2025, end March 2026
  const [startYearStr] = financialYear.split('-');
  const startYear = parseInt(startYearStr, 10);
  if (isNaN(startYear)) throw new Error(`Invalid FY code: ${financialYear}`);

  const fyStart = new Date(startYear, 3, 1); // April 1
  const fyEnd = new Date(startYear + 1, 2, 31, 23, 59, 59, 999); // March 31

  // 1. Get all INCOME and EXPENSE ledger IDs in one query
  const plLedgers = await AccLedger.find({
    financialYear,
    group: { $in: ['INCOME', 'EXPENSE'] },
    isActive: true,
  }).lean() as any[];

  const ledgerMap = new Map(plLedgers.map((l: any) => [String(l._id), l]));

  // 2. Single aggregate: group by month + ledgerId + entry type
  //    Replaces 12 months × N ledgers sequential queries with ONE query
  const agg = await AccVoucher.aggregate([
    {
      $match: {
        financialYear,
        isReversed: { $ne: true },
        date: { $gte: fyStart, $lte: fyEnd },
      },
    },
    { $unwind: '$entries' },
    {
      $match: {
        'entries.ledgerId': { $in: plLedgers.map((l: any) => l._id) },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          ledgerId: '$entries.ledgerId',
          type: '$entries.type',
        },
        total: { $sum: '$entries.amount' },
      },
    },
  ]);

  // 3. Build monthly totals from the single aggregate result
  const monthlyData = new Map<string, { income: number; expense: number }>();
  for (const row of agg) {
    const { year, month, ledgerId, type } = row._id;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (!monthlyData.has(key)) monthlyData.set(key, { income: 0, expense: 0 });
    const entry = monthlyData.get(key)!;
    const ledger = ledgerMap.get(String(ledgerId));
    if (!ledger) continue;

    if (ledger.group === 'INCOME') {
      if (type === 'CREDIT') entry.income += row.total;
      else entry.income -= row.total;
    } else if (ledger.group === 'EXPENSE') {
      if (type === 'DEBIT') entry.expense += row.total;
      else entry.expense -= row.total;
    }
  }

  // 4. Build the 12-month result array
  const months: MonthlyPLRow[] = [];
  for (let i = 0; i < 12; i++) {
    const monthIndex = (3 + i) % 12;
    const year = monthIndex >= 3 ? startYear : startYear + 1;
    const dateObj = new Date(year, monthIndex, 1);
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    const data = monthlyData.get(key) || { income: 0, expense: 0 };

    const totalIncome = Math.round(Math.abs(data.income) * 100) / 100;
    const totalExpense = Math.round(Math.abs(data.expense) * 100) / 100;
    const netProfit = Math.round((totalIncome - totalExpense) * 100) / 100;

    months.push({
      month: dateObj.toLocaleString('en-IN', { month: 'short', year: 'numeric' }),
      monthNum: monthIndex + 1,
      year,
      totalIncome,
      totalExpense,
      netProfit,
      isProfit: netProfit >= 0,
    });
  }

  return months;
}

/**
 * P&L for a specific date range (not cumulative from FY start).
 * Used for monthly breakdowns.
 */
export async function generateProfitLossForPeriod(
  financialYear: string,
  dateFrom: Date,
  dateTo: Date,
): Promise<ProfitLossResult> {
  await connectDB();
  const AccLedger = getAccLedger();
  const AccVoucher = getAccVoucher();

  const incomeLedgers = await AccLedger.find({ financialYear, group: 'INCOME', isActive: true }).lean();
  const expenseLedgers = await AccLedger.find({ financialYear, group: 'EXPENSE', isActive: true }).lean();

  const income: { ledgerName: string; amount: number; subGroup?: string }[] = [];
  const expenses: { ledgerName: string; amount: number; subGroup?: string }[] = [];

  let totalIncome = 0;
  let totalExpense = 0;

  // For each income ledger, aggregate only vouchers within date range
  for (const l of incomeLedgers) {
    const ledger = l as any;
    const agg = await AccVoucher.aggregate([
      {
        $match: {
          financialYear,
          isReversed: { $ne: true },
          'entries.ledgerId': ledger._id,
          date: { $gte: dateFrom, $lte: dateTo },
        },
      },
      { $unwind: '$entries' },
      { $match: { 'entries.ledgerId': ledger._id } },
      { $group: { _id: '$entries.type', total: { $sum: '$entries.amount' } } },
    ]);

    let debit = 0, credit = 0;
    for (const r of agg) {
      if (r._id === 'DEBIT') debit = r.total;
      if (r._id === 'CREDIT') credit = r.total;
    }
    const amount = credit - debit; // income nature = credit
    if (Math.abs(amount) > 0.01) {
      income.push({ ledgerName: ledger.name, amount: Math.round(Math.abs(amount) * 100) / 100, subGroup: ledger.subGroup });
      totalIncome += Math.abs(amount);
    }
  }

  for (const l of expenseLedgers) {
    const ledger = l as any;
    const agg = await AccVoucher.aggregate([
      {
        $match: {
          financialYear,
          isReversed: { $ne: true },
          'entries.ledgerId': ledger._id,
          date: { $gte: dateFrom, $lte: dateTo },
        },
      },
      { $unwind: '$entries' },
      { $match: { 'entries.ledgerId': ledger._id } },
      { $group: { _id: '$entries.type', total: { $sum: '$entries.amount' } } },
    ]);

    let debit = 0, credit = 0;
    for (const r of agg) {
      if (r._id === 'DEBIT') debit = r.total;
      if (r._id === 'CREDIT') credit = r.total;
    }
    const amount = debit - credit; // expense nature = debit
    if (Math.abs(amount) > 0.01) {
      expenses.push({ ledgerName: ledger.name, amount: Math.round(Math.abs(amount) * 100) / 100, subGroup: ledger.subGroup });
      totalExpense += Math.abs(amount);
    }
  }

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;
  const netProfit = Math.round((totalIncome - totalExpense) * 100) / 100;

  const incomeByGroup: Record<string, ReportRow[]> = {};
  for (const item of income) {
    const sg = item.subGroup || 'Other Income';
    if (!incomeByGroup[sg]) incomeByGroup[sg] = [];
    incomeByGroup[sg].push(item);
  }
  const expensesByGroup: Record<string, ReportRow[]> = {};
  for (const item of expenses) {
    const sg = item.subGroup || 'Other Expenses';
    if (!expensesByGroup[sg]) expensesByGroup[sg] = [];
    expensesByGroup[sg].push(item);
  }

  return { income, expenses, incomeByGroup, expensesByGroup, totalIncome, totalExpense, netProfit, isProfit: netProfit >= 0 };
}

// ─── Year-End Closing ───────────────────────────────────────────────

/**
 * Carry forward Balance Sheet balances from one FY to the next.
 * This is the Tally Prime official logic:
 *
 * 1. ASSET / LIABILITY / CAPITAL → closing balance becomes opening balance in next FY
 * 2. INCOME / EXPENSE → reset to zero (fresh start in new FY)
 * 3. Net Profit/Loss from P&L → added to "Reserves & Surplus" (retained earnings)
 *
 * This function only creates ledgers in the next FY — it does NOT lock or close the current FY.
 * Use closeFinancialYear() to both carry forward AND lock.
 */
export async function carryForwardBalances(
  currentFY: string,
  nextFY: string,
  nextStartDate: Date,
  nextEndDate: Date,
  createdByUserId?: string,
) {
  await connectDB();
  const AccLedger = getAccLedger();
  const AccFinancialYear = getAccFinancialYear();

  // 1. Calculate all ledger balances in one batch (2 queries instead of N)
  const balanceMap = await batchCalculateLedgerBalances(currentFY);
  const pl = await generateProfitLoss(currentFY, undefined, balanceMap);

  // 2. Create next FY if not exists
  let nextFYDoc = await AccFinancialYear.findOne({ code: nextFY });
  if (!nextFYDoc) {
    await AccFinancialYear.updateMany({}, { isCurrent: false });
    nextFYDoc = await AccFinancialYear.create({
      code: nextFY,
      label: `FY ${nextFY}`,
      startDate: nextStartDate,
      endDate: nextEndDate,
      isCurrent: true,
      companyName: 'Upamnyu International Education Pvt. Ltd.',
      createdByUserId,
    });
  } else {
    // Mark this as the current FY
    await AccFinancialYear.updateMany({}, { isCurrent: false });
    await AccFinancialYear.updateOne({ code: nextFY }, { isCurrent: true });
  }

  // 3. Seed default groups for next FY
  await seedDefaultGroups(nextFY);

  // 4. Carry forward Balance Sheet items (ASSET, LIABILITY, CAPITAL)
  let carriedForward = 0;
  let skippedExisting = 0;
  const carriedLedgers: { name: string; group: string; openingBalance: number; openingBalanceType: string }[] = [];

  for (const bal of balanceMap.values()) {
    if (['INCOME', 'EXPENSE'].includes(bal.group)) {
      // Income/Expense ledgers start fresh — zero opening balance in next FY
      continue;
    }

    // Only carry forward if closing balance is meaningful
    if (bal.closingBalance > 0.01) {
      // Check if already exists in next FY
      const existing = await AccLedger.findOne({ name: bal.ledgerName, financialYear: nextFY });
      if (existing) {
        // Update existing ledger's opening balance to match current year's closing
        await AccLedger.updateOne(
          { _id: existing._id },
          {
            $set: {
              openingBalance: Math.round(bal.closingBalance * 100) / 100,
              openingBalanceType: bal.closingBalanceType,
              group: bal.group,
              subGroup: bal.subGroup,
            },
          },
        );
        skippedExisting++;
      } else {
        await AccLedger.create({
          name: bal.ledgerName,
          group: bal.group,
          subGroup: bal.subGroup,
          openingBalance: Math.round(bal.closingBalance * 100) / 100,
          openingBalanceType: bal.closingBalanceType,
          financialYear: nextFY,
          isActive: true,
        });
        carriedForward++;
      }
      carriedLedgers.push({
        name: bal.ledgerName,
        group: bal.group,
        openingBalance: Math.round(bal.closingBalance * 100) / 100,
        openingBalanceType: bal.closingBalanceType,
      });
    }
  }

  // 5. Transfer Net P/L → Reserves & Surplus (Tally Prime official logic)
  //    retainedEarnings += currentYearPL
  if (Math.abs(pl.netProfit) > 0.01) {
    const reservesLedger = await AccLedger.findOne({ name: 'Reserves & Surplus', financialYear: nextFY });
    if (reservesLedger) {
      const r = reservesLedger as any;
      // Current Reserves OB was carried forward from current FY's OB.
      // Need to add P&L to get the true "retained earnings" balance.
      const currentReservesOB = r.openingBalanceType === 'CREDIT' ? r.openingBalance : -r.openingBalance;
      const newReserves = currentReservesOB + pl.netProfit;
      await AccLedger.updateOne(
        { _id: r._id },
        {
          $set: {
            openingBalance: Math.round(Math.abs(newReserves) * 100) / 100,
            openingBalanceType: newReserves >= 0 ? 'CREDIT' : 'DEBIT',
          },
        },
      );
    } else {
      // No Reserves & Surplus exists — create it as Capital
      await AccLedger.create({
        name: 'Reserves & Surplus',
        group: 'CAPITAL',
        subGroup: 'Retained Earnings',
        openingBalance: Math.abs(pl.netProfit),
        openingBalanceType: pl.isProfit ? 'CREDIT' : 'DEBIT',
        financialYear: nextFY,
        isActive: true,
      });
      carriedForward++;
    }
  }

  // 6. Link ledgers to groups in next FY
  const AccGroup = getAccGroup();
  const nextFYLedgers = await AccLedger.find({ financialYear: nextFY, isActive: true }).lean() as any[];
  const groups = await AccGroup.find({ financialYear: nextFY }).lean() as any[];
  const groupMap = new Map(groups.map((g: any) => [g.name, g._id]));

  for (const ledger of nextFYLedgers) {
    if (!ledger.groupId && ledger.subGroup) {
      const groupId = groupMap.get(ledger.subGroup);
      if (groupId) {
        await AccLedger.updateOne({ _id: ledger._id }, { $set: { groupId } });
      }
    }
  }

  return {
    message: `${carriedForward} new ledgers carried forward to FY ${nextFY}. ${skippedExisting} existing ledgers updated.`,
    currentFY,
    nextFY,
    netProfit: pl.netProfit,
    isProfit: pl.isProfit,
    ledgersCarriedForward: carriedForward,
    ledgersUpdated: skippedExisting,
    carriedLedgers,
    totalIncome: pl.totalIncome,
    totalExpense: pl.totalExpense,
  };
}

/**
 * Close a Financial Year and carry forward to the next FY.
 * 
 * What Tally does at year-end:
 * 1. Calculate Net Profit/Loss from P&L
 * 2. Transfer it to "Retained Earnings" (or "Profit & Loss A/c") in Balance Sheet
 * 3. Carry forward all Asset/Liability/Capital closing balances as opening balances of next FY
 * 4. Income/Expense ledgers start fresh (zero) in new FY
 * 5. Mark the current FY as CLOSED (locked)
 */
export async function closeFinancialYear(
  currentFY: string,
  nextFY: string,
  nextStartDate: Date,
  nextEndDate: Date,
  createdByUserId?: string,
) {
  await connectDB();
  const AccFinancialYear = getAccFinancialYear();

  // 1. Carry forward all balances
  const result = await carryForwardBalances(currentFY, nextFY, nextStartDate, nextEndDate, createdByUserId);

  // 2. Mark current FY as closed (locked)
  await AccFinancialYear.updateOne({ code: currentFY }, { isClosed: true, isCurrent: false });

  return {
    ...result,
    message: `FY ${currentFY} closed & locked. ${result.ledgersCarriedForward} new ledgers + ${result.ledgersUpdated} updated in FY ${nextFY}.`,
  };
}

// ─── Default Groups Seed ────────────────────────────────────────────
// Call this once when setting up a new financial year

export const DEFAULT_GROUPS = [
  // ASSET sub-groups
  { name: 'Cash-in-Hand', nature: 'ASSET' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Bank Accounts', nature: 'ASSET' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Fixed Assets', nature: 'ASSET' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Current Assets', nature: 'ASSET' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Sundry Debtors', nature: 'ASSET' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Investments', nature: 'ASSET' as AccountGroup, report: 'balance_sheet' as const },
  // LIABILITY sub-groups
  { name: 'Current Liabilities', nature: 'LIABILITY' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Sundry Creditors', nature: 'LIABILITY' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Secured Loans', nature: 'LIABILITY' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Unsecured Loans', nature: 'LIABILITY' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Duties & Taxes', nature: 'LIABILITY' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Provisions', nature: 'LIABILITY' as AccountGroup, report: 'balance_sheet' as const },
  // INCOME sub-groups
  { name: 'Direct Incomes', nature: 'INCOME' as AccountGroup, report: 'profit_loss' as const, affectsGrossProfit: true },
  { name: 'Indirect Incomes', nature: 'INCOME' as AccountGroup, report: 'profit_loss' as const },
  { name: 'Sales Accounts', nature: 'INCOME' as AccountGroup, report: 'profit_loss' as const, affectsGrossProfit: true },
  // EXPENSE sub-groups
  { name: 'Direct Expenses', nature: 'EXPENSE' as AccountGroup, report: 'profit_loss' as const, affectsGrossProfit: true },
  { name: 'Indirect Expenses', nature: 'EXPENSE' as AccountGroup, report: 'profit_loss' as const },
  { name: 'Purchase Accounts', nature: 'EXPENSE' as AccountGroup, report: 'profit_loss' as const, affectsGrossProfit: true },
  { name: 'Admin Expenses', nature: 'EXPENSE' as AccountGroup, report: 'profit_loss' as const },
  { name: 'Depreciation', nature: 'EXPENSE' as AccountGroup, report: 'profit_loss' as const },
  // CAPITAL sub-groups (Tally Prime standard)
  { name: 'Capital Account', nature: 'CAPITAL' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Share Capital', nature: 'CAPITAL' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Share Premium', nature: 'CAPITAL' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Capital Reserve', nature: 'CAPITAL' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'General Reserve', nature: 'CAPITAL' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Retained Earnings', nature: 'CAPITAL' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Surplus from P&L A/c', nature: 'CAPITAL' as AccountGroup, report: 'balance_sheet' as const },
  { name: 'Reserves & Surplus', nature: 'CAPITAL' as AccountGroup, report: 'balance_sheet' as const },
];

// ─── CA Audit Report ─────────────────────────────────────────────────

export interface CAAuditReport {
  companyName: string;
  financialYear: string;
  generatedAt: string;
  trialBalance: { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; difference: number };
  profitLoss: ProfitLossResult;
  balanceSheet: BalanceSheetResult;
  monthlyPL: MonthlyPLRow[];
  voucherSummary: { type: string; count: number; totalAmount: number }[];
  ledgerWise: { name: string; group: string; subGroup?: string; debit: number; credit: number; closing: number; closingType: string }[];
  cashFlowSummary: { openingCash: number; totalReceipts: number; totalPayments: number; closingCash: number };
  pendingBills: { voucherId: string; voucherNumber: string; date: string; type: string; amount: number; narration?: string }[];
  billsAttached: number;
  billsMissing: number;
}

export async function generateCAAuditReport(financialYear: string): Promise<CAAuditReport> {
  await connectDB();
  const AccVoucher = getAccVoucher();
  const AccFinancialYear = getAccFinancialYear();

  // Get company info
  const fyDoc = await AccFinancialYear.findOne({ code: financialYear }).lean() as any;
  const companyName = fyDoc?.companyName || 'Swar Yoga';

  // Generate all reports sharing a single balanceMap (2 DB queries replaces 70+)
  const balanceMap = await batchCalculateLedgerBalances(financialYear);
  const [tb, pl, monthly] = await Promise.all([
    generateTrialBalance(financialYear, undefined, balanceMap),
    generateProfitLoss(financialYear, undefined, balanceMap),
    generateMonthlyPL(financialYear),
  ]);
  const bs = await generateBalanceSheet(financialYear, undefined, balanceMap, pl);
  const cashBank = await getCashBankSummary(financialYear, balanceMap);

  // Inline voucher breakdown instead of calling getAccountingSummary (avoids duplicate batchCalculateLedgerBalances)
  const voucherBreakdown = await AccVoucher.aggregate([
    { $match: { financialYear, isReversed: { $ne: true } } },
    { $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$totalDebit' } } },
    { $sort: { _id: 1 } },
  ]);
  const voucherSummary = voucherBreakdown.map((v: any) => ({
    type: v._id,
    count: v.count,
    totalAmount: Math.round(v.totalAmount * 100) / 100,
  }));

  // Generate ledger-wise details
  const ledgerWise = tb.rows.map((r: any) => ({
    name: r.ledgerName,
    group: r.group,
    subGroup: r.subGroup || '',
    debit: r.closingDebit,
    credit: r.closingCredit,
    closing: r.closingBalance || Math.abs(r.closingDebit - r.closingCredit),
    closingType: r.closingDebit >= r.closingCredit ? 'Dr' : 'Cr',
  }));

  // Cash flow summary
  const cashAccounts = cashBank || [];
  const openingCash = 0; // Will be detailed from ledger opening
  let totalReceipts = 0;
  let totalPayments = 0;
  for (const vs of voucherSummary) {
    if (vs.type === 'RECEIPT' || vs.type === 'SALES') totalReceipts += vs.totalAmount;
    if (vs.type === 'PAYMENT' || vs.type === 'PURCHASE') totalPayments += vs.totalAmount;
  }
  const closingCash = (cashAccounts as any[]).reduce((sum: number, a: any) => sum + (a.balanceType === 'DEBIT' ? a.balance : -a.balance), 0);

  // Bills audit — count vouchers with and without receipts
  const allVouchers = await AccVoucher.find({
    financialYear,
    isReversed: { $ne: true },
    type: { $in: ['PAYMENT', 'PURCHASE', 'RECEIPT', 'SALES', 'EXPENSE'] },
  }).lean() as any[];

  const billsAttached = allVouchers.filter(v => v.receiptFileUrl).length;
  const billsMissing = allVouchers.filter(v => !v.receiptFileUrl).length;

  // Pending bills = vouchers without receipts
  const pendingBills = allVouchers
    .filter(v => !v.receiptFileUrl)
    .map(v => ({
      voucherId: String(v._id),
      voucherNumber: v.voucherNumber,
      date: v.date?.toISOString?.() || String(v.date),
      type: v.type,
      amount: v.totalDebit || 0,
      narration: v.narration,
    }));

  return {
    companyName,
    financialYear,
    generatedAt: new Date().toISOString(),
    trialBalance: tb,
    profitLoss: pl,
    balanceSheet: bs,
    monthlyPL: monthly,
    voucherSummary,
    ledgerWise,
    cashFlowSummary: { openingCash, totalReceipts, totalPayments, closingCash },
    pendingBills,
    billsAttached,
    billsMissing,
  };
}

// ─── Get Vouchers With Bills (for CA view) ───────────────────────────

export async function getVouchersWithBills(financialYear: string, month?: number, year?: number) {
  await connectDB();
  const AccVoucher = getAccVoucher();

  const query: any = { financialYear, isReversed: { $ne: true }, receiptFileUrl: { $exists: true, $ne: '' } };

  if (month !== undefined && year !== undefined) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    query.date = { $gte: startDate, $lte: endDate };
  }

  const vouchers = await AccVoucher.find(query).sort({ date: -1 }).lean() as any[];

  return vouchers.map(v => ({
    id: String(v._id),
    voucherNumber: v.voucherNumber,
    date: v.date,
    type: v.type,
    amount: v.totalDebit || 0,
    narration: v.narration || '',
    partyName: v.partyName || '',
    receiptFileUrl: v.receiptFileUrl,
    receiptFileName: v.receiptFileName || 'bill',
    entries: (v.entries || []).map((e: any) => ({
      ledgerName: e.ledgerName,
      amount: e.amount,
      type: e.type,
    })),
  }));
}

export async function seedDefaultGroups(financialYear: string) {
  await connectDB();
  const AccGroup = getAccGroup();

  let created = 0;
  for (const g of DEFAULT_GROUPS) {
    const exists = await AccGroup.findOne({ name: g.name, financialYear });
    if (!exists) {
      await AccGroup.create({
        ...g,
        financialYear,
        isSystemDefault: true,
      });
      created++;
    }
  }

  return { created, total: DEFAULT_GROUPS.length };
}

// ─── GST Ledger Seeding ─────────────────────────────────────────────

const GST_LEDGERS = [
  { name: 'CGST Input', group: 'ASSET' as AccountGroup, subGroup: 'Current Assets', openingBalance: 0, openingBalanceType: 'DEBIT' as BalanceType },
  { name: 'SGST Input', group: 'ASSET' as AccountGroup, subGroup: 'Current Assets', openingBalance: 0, openingBalanceType: 'DEBIT' as BalanceType },
  { name: 'IGST Input', group: 'ASSET' as AccountGroup, subGroup: 'Current Assets', openingBalance: 0, openingBalanceType: 'DEBIT' as BalanceType },
  { name: 'CGST Output', group: 'LIABILITY' as AccountGroup, subGroup: 'Duties & Taxes', openingBalance: 0, openingBalanceType: 'CREDIT' as BalanceType },
  { name: 'SGST Output', group: 'LIABILITY' as AccountGroup, subGroup: 'Duties & Taxes', openingBalance: 0, openingBalanceType: 'CREDIT' as BalanceType },
  { name: 'IGST Output', group: 'LIABILITY' as AccountGroup, subGroup: 'Duties & Taxes', openingBalance: 0, openingBalanceType: 'CREDIT' as BalanceType },
];

export async function seedGSTLedgers(financialYear: string) {
  await connectDB();
  const AccLedger = getAccLedger();

  let created = 0;
  for (const ledger of GST_LEDGERS) {
    const exists = await AccLedger.findOne({ name: ledger.name, financialYear });
    if (!exists) {
      await AccLedger.create({ ...ledger, financialYear });
      created++;
    }
  }

  return { created, total: GST_LEDGERS.length };
}

// ─── Excel (Tally Day Book / Ledger Vouchers) Import ────────────────

function excelSerialToDate(serial: number): Date {
  return new Date((serial - 25569) * 86400000);
}

function escapeRegexStr(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function guessLedgerGroup(name: string, balanceType: 'DEBIT' | 'CREDIT'): AccountGroup {
  const u = name.toUpperCase();

  // Assets
  if (u.includes('BANK') || u === 'CASH' || u === 'CASH-IN-HAND' || u.includes('CASH IN HAND')) return 'ASSET';
  if (u.includes('COMPUTER') || u.includes('FURNITURE') || u.includes('FIXTURE') || u.includes('MACHINERY') || u.includes('EQUIPMENT')) return 'ASSET';
  if (u.includes('SOFTWARE') || u.includes('VEHICLE') || u.includes('BUILDING') || u.includes('LAND') || u.includes('PLANT')) return 'ASSET';
  if (u.includes('SUSPENSE') || u.includes('PREPAID') || u.includes('DEPOSIT') || u.includes('TDS') || u.includes('ADVANCE')) return 'ASSET';
  if (u.includes('STOCK') || u.includes('INVENTORY') || u.includes('CLOSING STOCK')) return 'ASSET';
  if (u.includes('INVESTMENT')) return 'ASSET';

  // Expenses
  if (u.includes('EXPENSE') || u.includes('CHARGES') || u.includes('RENT') || u.includes('SALARY') || u.includes('WAGE')) return 'EXPENSE';
  if (u.includes('TRAVELLING') || u.includes('TRAELLING') || u.includes('TRAVEL')) return 'EXPENSE';
  if (u.includes('ADVERTISING') || u.includes('ADERTISING') || u.includes('MARKETING')) return 'EXPENSE';
  if (u.includes('MOBILE') || u.includes('TELEPHONE') || u.includes('INTERNET')) return 'EXPENSE';
  if (u.includes('ELECTRICITY') || u.includes('WATER') || u.includes('UTILITY')) return 'EXPENSE';
  if (u.includes('PROFESSIONAL') || u.includes('LEGAL') || u.includes('AUDIT FEE')) return 'EXPENSE';
  if (u.includes('ROC') || u.includes('FILING') || u.includes('REGISTRATION')) return 'EXPENSE';
  if (u.includes('DEPRECIATION') || u.includes('AMORTIZATION') || u.includes('WRITE OFF')) return 'EXPENSE';
  if (u.includes('INTEREST PAID') || u.includes('FINANCE COST')) return 'EXPENSE';
  if (u.includes('REPAIR') || u.includes('MAINTENANCE')) return 'EXPENSE';
  if (u.includes('PRINTING') || u.includes('STATIONERY')) return 'EXPENSE';
  if (u.includes('INSURANCE')) return 'EXPENSE';
  if (u.includes('CLASS EXP')) return 'EXPENSE';

  // Income
  if (u.includes('SWAR YOGA') || u.includes('BANDHAN MUKTI')) return 'INCOME';
  if (u.includes('INCOME') || u.includes('REVENUE') || u.includes('SALES') || u.includes('FEE RECEIVED')) return 'INCOME';
  if (u.includes('INTEREST RECEIVED') || u.includes('COMMISSION RECEIVED')) return 'INCOME';
  if (u.includes('DISCOUNT RECEIVED')) return 'INCOME';

  // Capital
  if (u.includes('PROFIT') && u.includes('LOSS')) return 'CAPITAL';
  if (u.includes('RESERVE') || u.includes('SURPLUS') || u.includes('SHARE CAPITAL') || u.includes('EQUITY')) return 'CAPITAL';
  if (u.includes('KALBURGI')) return 'CAPITAL'; // Director/owner accounts

  // Liability
  if (u.includes('PAYABLE') || u.includes('OUTSTANDING') || u.includes('PROVISION') || u.includes('CREDITOR')) return 'LIABILITY';
  if (u.includes('LOAN') || u.includes('BORROWING') || u.includes('OVERDRAFT')) return 'LIABILITY';

  // Default: use balance type — credit closing = liability, debit closing = asset
  return balanceType === 'CREDIT' ? 'LIABILITY' : 'ASSET';
}

function guessLedgerSubGroup(name: string, group: AccountGroup): string {
  const u = name.toUpperCase();
  switch (group) {
    case 'ASSET':
      if (u.includes('BANK')) return 'Bank Accounts';
      if (u === 'CASH' || u.includes('CASH IN HAND') || u === 'CASH-IN-HAND') return 'Cash-in-Hand';
      if (u.includes('COMPUTER') || u.includes('FURNITURE') || u.includes('FIXTURE') || u.includes('MACHINERY') || u.includes('EQUIPMENT') || u.includes('VEHICLE') || u.includes('BUILDING') || u.includes('PLANT') || u.includes('SOFTWARE')) return 'Fixed Assets';
      if (u.includes('SUSPENSE')) return 'Suspense Account';
      if (u.includes('STOCK') || u.includes('INVENTORY')) return 'Closing Stock';
      return 'Loans & Advances';
    case 'LIABILITY':
      if (u.includes('PAYABLE') || u.includes('OUTSTANDING')) return 'Current Liabilities';
      return 'Sundry Creditors';
    case 'INCOME':
      if (u.includes('INTEREST')) return 'Indirect Income';
      return 'Direct Income';
    case 'EXPENSE':
      if (u.includes('DEPRECIATION')) return 'Depreciation';
      return 'Indirect Expenses';
    case 'CAPITAL':
      if (u.includes('PROFIT') || u.includes('LOSS') || u.includes('RESERVE') || u.includes('SURPLUS')) return 'Reserves & Surplus';
      return 'Capital Account';
    default:
      return '';
  }
}

function mapVchType(tallyType: string): VoucherType {
  const t = tallyType.toLowerCase();
  if (t === 'payment') return 'PAYMENT';
  if (t === 'receipt') return 'RECEIPT';
  if (t === 'journal') return 'JOURNAL';
  if (t === 'contra') return 'CONTRA';
  if (t === 'sales' || t === 'sale') return 'SALES';
  if (t === 'purchase') return 'PURCHASE';
  if (t.includes('debit note')) return 'DEBIT_NOTE';
  if (t.includes('credit note')) return 'CREDIT_NOTE';
  return 'JOURNAL';
}

interface LedgerSection {
  name: string;
  openingBalance: number;
  openingBalanceType: BalanceType;
  transactions: Array<{
    date: number;
    direction: 'To' | 'By';
    contra: string;
    vchType: string;
    vchNo: string;
    debit: number;
    credit: number;
  }>;
}

function parseLedgerSections(data: any[][]): LedgerSection[] {
  const sections: LedgerSection[] = [];
  let current: LedgerSection | null = null;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || (row.length === 1 && !row[0])) continue;

    // Detect ledger header: ["Ledger:", "LEDGER NAME", ...]
    if (row[0] === 'Ledger:' && row[1]) {
      if (current) sections.push(current);
      current = { name: String(row[1]).trim(), openingBalance: 0, openingBalanceType: 'DEBIT', transactions: [] };
      continue;
    }

    if (!current) continue;

    // Opening Balance detection (row starts with date or empty + "To/By" + "Opening Balance")
    const dir = row[1];
    const contra = row[2];
    if (typeof dir === 'string' && typeof contra === 'string' && contra.trim() === 'Opening Balance') {
      if (dir === 'To') {
        current.openingBalance = row[5] || 0;
        current.openingBalanceType = 'DEBIT';
      } else if (dir === 'By') {
        current.openingBalance = row[6] || 0;
        current.openingBalanceType = 'CREDIT';
      }
      continue;
    }

    // Transaction row: [excelDate, "To"/"By", contraName, vchType, vchNo, debit, credit]
    const dateVal = row[0];
    if (typeof dateVal !== 'number' || dateVal < 40000 || dateVal > 60000) continue;
    if (dir !== 'To' && dir !== 'By') continue;

    const contraStr = String(contra || '').trim();
    if (!contraStr || contraStr === 'Closing Balance' || contraStr === 'Opening Balance') continue;

    current.transactions.push({
      date: dateVal,
      direction: dir as 'To' | 'By',
      contra: contraStr,
      vchType: String(row[3] || '').trim(),
      vchNo: String(row[4] || '').trim(),
      debit: row[5] || 0,
      credit: row[6] || 0,
    });
  }
  if (current) sections.push(current);
  return sections;
}

// ─── Bank Statement Import ──────────────────────────────────────────

interface BankTxn {
  no: number;
  date: string;       // "03 Nov 2023"
  desc: string;       // raw description
  withdrawal: number;
  deposit: number;
  balance: number;
  category: string;
  contraLedger: string;
}

/** Parse raw bank statement text (from pdftotext -layout) into transactions */
function parseBankStatementText(text: string): BankTxn[] {
  const lines = text.split('\n');
  const rawTxns: { no: number; date: string; desc: string; balance: number }[] = [];
  let current: { no: number; date: string; desc: string; balance: number } | null = null;

  for (const line of lines) {
    const m = line.match(/^\s*(\d+)\s+([\d]{2}\s+\w+\s+\d{4})\s+(.+)/);
    if (m) {
      if (current) rawTxns.push(current);
      current = {
        no: parseInt(m[1]),
        date: m[2].trim(),
        desc: m[3].trim(),
        balance: 0,
      };
    } else if (current) {
      current.desc += ' ' + line.trim();
    }
  }
  if (current) rawTxns.push(current);

  // Extract balance (last decimal number in description)
  for (const t of rawTxns) {
    const amounts = t.desc.match(/[\d,]+\.\d{2}/g);
    if (amounts) t.balance = parseFloat(amounts[amounts.length - 1].replace(/,/g, ''));
  }

  // Calculate withdrawal/deposit from balance changes
  const txns: BankTxn[] = [];
  for (let i = 0; i < rawTxns.length; i++) {
    const r = rawTxns[i];
    const prevBal = i > 0 ? rawTxns[i - 1].balance : 0;
    const diff = Math.round((r.balance - prevBal) * 100) / 100;
    const result = categorizeBankTxn(r.desc, diff);
    txns.push({
      ...r,
      withdrawal: diff < 0 ? Math.abs(diff) : 0,
      deposit: diff > 0 ? diff : 0,
      category: result.category,
      contraLedger: result.contraLedger,
    });
  }
  return txns;
}

/** Categorize a bank transaction based on description keywords */
function categorizeBankTxn(desc: string, diff: number): { category: string; contraLedger: string } {
  const d = desc.toUpperCase();
  const isDebit = diff < 0;

  // ── Specific matches (most specific first) ──
  if (d.includes('IB:RENT'))
    return { category: 'EXPENSE', contraLedger: 'Office Rent' };
  if (d.includes('FACEBOOK'))
    return { category: 'EXPENSE', contraLedger: 'Advertisement Expenses' };
  if (d.includes('VODAFONE') || d.includes('AIRTEL') || d.includes('JIO'))
    return { category: 'EXPENSE', contraLedger: 'Internet and Mobile Expenses' };
  if (d.includes('APPLE SERVICE'))
    return { category: 'EXPENSE', contraLedger: 'Internet and Mobile Expenses' };
  if (d.includes('GOOGLE PLAY') && isDebit)
    return { category: 'EXPENSE', contraLedger: 'Internet and Mobile Expenses' };

  // Google AdSense / Google India payments = Other Income
  if ((d.includes('GOOGLEINDI') || d.includes('GOOGLE INDIA')) && !isDebit)
    return { category: 'INCOME', contraLedger: 'Other Income' };

  // BHIM Cashback
  if (d.includes('BHIM') && d.includes('CASHBACK'))
    return { category: 'INCOME', contraLedger: 'Other Income' };

  // Tax Refund
  if (d.includes('TAX REFUND') || d.includes('ITDTAX'))
    return { category: 'INCOME', contraLedger: 'Other Income' };

  // Directors / Owners
  if (d.includes('MOHAN KALBURGI') || d.includes('MOHAN PANDURANG'))
    return { category: 'CAPITAL', contraLedger: 'Mohan Kalburgi (Director)' };
  if (d.includes('UPAMANYU MOHAN') || d.includes('UPAMANYU') || d.includes('UPAMNYU'))
    return { category: 'CAPITAL', contraLedger: 'Upamanyu Kalburgi (Director)' };

  // Contra (cash deposits/withdrawals)
  if (d.includes('CASH DEPOSIT'))
    return { category: 'CONTRA', contraLedger: 'Cash-in-Hand' };
  if (d.includes('CONTRA'))
    return { category: 'CONTRA', contraLedger: 'Cash-in-Hand' };

  // Cheque Clearing
  if (d.includes('CLG INST'))
    return { category: 'INCOME', contraLedger: 'Course Fees' };

  // Related parties
  if (d.includes('SWAR SAKSHI'))
    return { category: 'CAPITAL', contraLedger: 'Swar Sakshi International' };

  // Dividend
  if (d.includes('DIVIDEND'))
    return { category: 'CAPITAL', contraLedger: 'Dividend Paid' };

  // Teachers payment
  if (d.includes('TEACHER'))
    return { category: 'EXPENSE', contraLedger: 'Teachers Fees' };

  // IGNOU / Education
  if (d.includes('IGNOU'))
    return { category: 'EXPENSE', contraLedger: 'Training Expenses' };

  // Food / Restaurant / Hotel
  if (d.includes('FOOD') || d.includes('FAST FOOD') || d.includes('HOTEL'))
    return { category: 'EXPENSE', contraLedger: 'Office Expenses' };

  // Printing
  if (d.includes('PRINTING') || d.includes('SAISAGAR'))
    return { category: 'EXPENSE', contraLedger: 'Printing and Stationary' };

  // Amazon
  if (d.includes('AMAZON'))
    return { category: 'EXPENSE', contraLedger: 'Office Expenses' };

  // Fuel / Travel
  if (d.includes('DISEL') || d.includes('DIESEL') || d.includes('PETROL'))
    return { category: 'EXPENSE', contraLedger: 'Travelling Expenses' };
  if (d.includes('IBIBOGROUP') || d.includes('SMART PUNE'))
    return { category: 'EXPENSE', contraLedger: 'Travelling Expenses' };
  if (d.includes('TRAVELLING'))
    return { category: 'EXPENSE', contraLedger: 'Travelling Expenses' };

  // Donation / Rishi Vana
  if (d.includes('DONETION') || d.includes('RISHI VANA'))
    return { category: 'EXPENSE', contraLedger: 'Class Expenses' };

  // Electricity
  if (d.includes('SHRADDHA ELECTR'))
    return { category: 'EXPENSE', contraLedger: 'Electricity Expenses' };

  // Bank charges
  if (d.includes('CHRG:') || d.includes('DEBIT CARD ANNUAL'))
    return { category: 'EXPENSE', contraLedger: 'Bank Charges and Commission' };

  // Reversals
  if (d.includes('REV-UPI') || d.includes('UPI-REF'))
    return { category: 'REVERSAL', contraLedger: '_REVERSAL_' };

  // Kirana / Grocery / Vegetables / Fruit
  if (d.includes('KIRANA') || d.includes('VEGETABLE') || d.includes('FRUIT'))
    return { category: 'EXPENSE', contraLedger: 'Office Expenses' };

  // Battery / Electrical supplies
  if (d.includes('BATTERY'))
    return { category: 'EXPENSE', contraLedger: 'Office Expenses' };

  // Software (Lensmatic/Dubverse)
  if (d.includes('LENSMATIC') || d.includes('DUBVER'))
    return { category: 'EXPENSE', contraLedger: 'Office Expenses' };

  // HDFC Bank credit card
  if (d.includes('HDFC BANK') && d.includes('CREDI'))
    return { category: 'EXPENSE', contraLedger: 'Office Expenses' };

  // NIKHIL MEDICO (large NEFT receipt - likely related party/loan)
  if (d.includes('NIKHIL MEDICO'))
    return { category: 'LIABILITY', contraLedger: 'Other Current Liabilities' };

  // Nanda Kantilal (large deposits = likely related party/loan or advance fees)
  if (d.includes('NANDA KANTILAL'))
    return { category: 'INCOME', contraLedger: 'Course Fees' };

  // ── Default: Deposits = Course Fees, Debits = Class/Training Expenses ──
  if (!isDebit) {
    // Course fee keywords
    const feeKw = ['YOGA', 'SWAR', 'SADHNA', 'CLASS', 'FEE', 'FEES', 'LEVEL', 'PAYMENT FROM'];
    for (const kw of feeKw) {
      if (d.includes(kw)) return { category: 'INCOME', contraLedger: 'Course Fees' };
    }
    return { category: 'INCOME', contraLedger: 'Course Fees' };
  } else {
    // Uncategorized debits = Class/Training Expenses (per user confirmation)
    return { category: 'EXPENSE', contraLedger: 'Class Expenses' };
  }
}

/** Convert "03 Nov 2023" → Date object */
function parseBankDate(dateStr: string): Date {
  const months: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length !== 3) throw new Error(`Invalid date: ${dateStr}`);
  const day = parseInt(parts[0]);
  const month = months[parts[1].toUpperCase()];
  const year = parseInt(parts[2]);
  if (isNaN(day) || month === undefined || isNaN(year)) throw new Error(`Invalid date: ${dateStr}`);
  return new Date(year, month, day);
}

/** Determine voucher type from transaction category */
function bankCatToVoucherType(cat: string, isDebit: boolean): VoucherType {
  if (cat === 'CONTRA') return 'CONTRA';
  // Bank receipts = RECEIPT, Bank payments = PAYMENT
  return isDebit ? 'PAYMENT' : 'RECEIPT';
}

/**
 * Import bank statement text (from pdftotext -layout output).
 * Parses transactions, creates ledgers, and creates double-entry vouchers.
 *
 * @param text Raw text from pdftotext
 * @param bankLedgerName Name of the bank ledger (e.g., "Kotak Mahindra Bank")
 * @param financialYear Financial year string (e.g., "2023-24")
 * @param fromTxn Starting transaction number to import (inclusive)
 * @param toTxn Ending transaction number to import (inclusive)
 * @param openingBalance Opening balance of bank A/C at start of period
 */
export async function importBankStatement(
  text: string,
  bankLedgerName: string,
  financialYear: string,
  fromTxn: number,
  toTxn: number,
  openingBalance: number,
  createdByUserId?: string,
) {
  await connectDB();
  const AccLedger = getAccLedger();
  const errors: string[] = [];
  let ledgersCreated = 0;
  let vouchersCreated = 0;
  let skipped = 0;

  // Seed default groups
  try { await seedDefaultGroups(financialYear); } catch {}

  // Parse the text
  const allTxns = parseBankStatementText(text);
  const txns = allTxns.filter(t => t.no >= fromTxn && t.no <= toTxn);

  if (txns.length === 0) {
    throw new Error(`No transactions found in range #${fromTxn}–#${toTxn}. Total parsed: ${allTxns.length}`);
  }

  // ── Ensure Bank ledger exists ──
  const ledgerIdMap: Record<string, string> = {};
  let bankLedger = await AccLedger.findOne({
    name: { $regex: new RegExp(`^${escapeRegexStr(bankLedgerName)}$`, 'i') },
    financialYear,
  }).lean() as any;

  if (!bankLedger) {
    try {
      bankLedger = await AccLedger.create({
        name: bankLedgerName,
        group: 'ASSET' as AccountGroup,
        subGroup: 'Bank Accounts',
        financialYear,
        openingBalance,
        openingBalanceType: 'DEBIT' as BalanceType,
        createdByUserId,
      });
      ledgersCreated++;
    } catch (e: any) { errors.push(`Bank ledger: ${e.message}`); }
  }
  if (bankLedger) ledgerIdMap[bankLedgerName] = String(bankLedger._id);

  // ── Ledger definitions for each contra account ──
  const ledgerDefs: Record<string, { group: AccountGroup; subGroup: string }> = {
    'Course Fees':                  { group: 'INCOME', subGroup: 'Direct Income' },
    'Other Income':                 { group: 'INCOME', subGroup: 'Indirect Income' },
    'Office Rent':                  { group: 'EXPENSE', subGroup: 'Indirect Expenses' },
    'Advertisement Expenses':       { group: 'EXPENSE', subGroup: 'Indirect Expenses' },
    'Internet and Mobile Expenses': { group: 'EXPENSE', subGroup: 'Indirect Expenses' },
    'Bank Charges and Commission':  { group: 'EXPENSE', subGroup: 'Indirect Expenses' },
    'Office Expenses':              { group: 'EXPENSE', subGroup: 'Indirect Expenses' },
    'Class Expenses':               { group: 'EXPENSE', subGroup: 'Indirect Expenses' },
    'Training Expenses':            { group: 'EXPENSE', subGroup: 'Indirect Expenses' },
    'Teachers Fees':                { group: 'EXPENSE', subGroup: 'Indirect Expenses' },
    'Travelling Expenses':          { group: 'EXPENSE', subGroup: 'Indirect Expenses' },
    'Printing and Stationary':      { group: 'EXPENSE', subGroup: 'Indirect Expenses' },
    'Electricity Expenses':         { group: 'EXPENSE', subGroup: 'Indirect Expenses' },
    'Mohan Kalburgi (Director)':    { group: 'CAPITAL', subGroup: 'Capital Account' },
    'Upamanyu Kalburgi (Director)': { group: 'CAPITAL', subGroup: 'Capital Account' },
    'Swar Sakshi International':    { group: 'CAPITAL', subGroup: 'Capital Account' },
    'Dividend Paid':                { group: 'CAPITAL', subGroup: 'Capital Account' },
    'Cash-in-Hand':                 { group: 'ASSET', subGroup: 'Cash-in-Hand' },
    'Other Current Liabilities':    { group: 'LIABILITY', subGroup: 'Current Liabilities' },
  };

  // ── Create contra ledgers ──
  const neededLedgers = new Set(txns.map(t => t.contraLedger).filter(l => l !== '_REVERSAL_'));
  for (const ledgerName of neededLedgers) {
    if (ledgerIdMap[ledgerName]) continue;

    let existing = await AccLedger.findOne({
      name: { $regex: new RegExp(`^${escapeRegexStr(ledgerName)}$`, 'i') },
      financialYear,
    }).lean() as any;

    if (existing) {
      ledgerIdMap[ledgerName] = String(existing._id);
      continue;
    }

    const def = ledgerDefs[ledgerName] || { group: 'EXPENSE' as AccountGroup, subGroup: 'Indirect Expenses' };
    try {
      const ledger = await AccLedger.create({
        name: ledgerName,
        group: def.group,
        subGroup: def.subGroup,
        financialYear,
        openingBalance: 0,
        openingBalanceType: 'DEBIT' as BalanceType,
        createdByUserId,
      });
      ledgerIdMap[ledgerName] = String(ledger._id);
      ledgersCreated++;
    } catch (e: any) {
      errors.push(`Ledger "${ledgerName}": ${e.message}`);
    }
  }

  // ── Create vouchers ──
  for (const txn of txns) {
    const amount = txn.withdrawal || txn.deposit;
    if (!amount || amount <= 0) { skipped++; continue; }

    // Skip reversals (they cancel each other out)
    if (txn.contraLedger === '_REVERSAL_') { skipped++; continue; }

    const bankId = ledgerIdMap[bankLedgerName];
    const contraId = ledgerIdMap[txn.contraLedger];

    if (!bankId || !contraId) {
      errors.push(`#${txn.no}: Missing ledger ID for "${txn.contraLedger}"`);
      skipped++;
      continue;
    }

    let jsDate: Date;
    try { jsDate = parseBankDate(txn.date); } catch (e: any) {
      errors.push(`#${txn.no}: ${e.message}`);
      skipped++;
      continue;
    }

    const isPayment = txn.withdrawal > 0;
    const entries: Array<{ ledgerId: string; ledgerName: string; amount: number; type: BalanceType }> = [];

    if (isPayment) {
      // Money going out: Debit expense/contra, Credit bank
      entries.push({ ledgerId: contraId, ledgerName: txn.contraLedger, amount, type: 'DEBIT' });
      entries.push({ ledgerId: bankId, ledgerName: bankLedgerName, amount, type: 'CREDIT' });
    } else {
      // Money coming in: Debit bank, Credit income/contra
      entries.push({ ledgerId: bankId, ledgerName: bankLedgerName, amount, type: 'DEBIT' });
      entries.push({ ledgerId: contraId, ledgerName: txn.contraLedger, amount, type: 'CREDIT' });
    }

    const voucherType = bankCatToVoucherType(txn.category, isPayment);

    // Clean narration
    let narration = txn.desc.replace(/[\d,]+\.\d{2}/g, '').replace(/\s+/g, ' ').trim();
    narration = narration.substring(0, 200);

    try {
      await createVoucher({
        date: jsDate,
        type: voucherType,
        entries,
        narration: `Bank #${txn.no}: ${narration}`,
        financialYear,
        createdByUserId,
      });
      vouchersCreated++;
    } catch (e: any) {
      errors.push(`#${txn.no} ${txn.date}: ${e.message}`);
    }
  }

  return {
    totalParsed: allTxns.length,
    filtered: txns.length,
    vouchersCreated,
    ledgersCreated,
    skipped,
    errors,
    categories: txns.reduce((acc, t) => {
      acc[t.contraLedger] = (acc[t.contraLedger] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}

export async function importExcelTally(buffer: Buffer, financialYear: string, createdByUserId?: string) {
  await connectDB();
  const XLSX = require('xlsx');
  const wb = XLSX.read(buffer, { type: 'buffer' });

  const errors: string[] = [];
  let ledgersCreated = 0;
  let vouchersCreated = 0;
  let groupsCreated = 0;

  // Ensure default groups exist
  try {
    const seedResult = await seedDefaultGroups(financialYear);
    groupsCreated = seedResult.created;
  } catch {}

  // Parse Ledger Vouchers sheet
  const lvSheet = wb.Sheets['Ledger Vouchers'] || wb.Sheets['Ledger Accounts'] || wb.Sheets['Ledger'];
  if (!lvSheet) {
    throw new Error('Sheet "Ledger Vouchers" not found in Excel file. Expected sheets: Ledger Vouchers, Ledger Accounts, or Ledger.');
  }

  const data: any[][] = XLSX.utils.sheet_to_json(lvSheet, { header: 1 });
  const sections = parseLedgerSections(data);

  if (sections.length === 0) {
    throw new Error('No ledger data found in the Excel file. Make sure it contains Tally Ledger Vouchers.');
  }

  // ── Create all ledgers ──
  const AccLedger = getAccLedger();
  const ledgerIdMap: Record<string, string> = {};

  for (const sec of sections) {
    // Skip system ledgers
    if (sec.name === 'Profit & Loss A/c') {
      // Create as Reserve & Surplus
      const group: AccountGroup = 'CAPITAL';
      const subGroup = 'Reserves & Surplus';
      let existing = await AccLedger.findOne({ name: 'Profit & Loss A/c', financialYear }).lean() as any;
      if (!existing) {
        try {
          const ledger = await AccLedger.create({
            name: 'Profit & Loss A/c',
            group, subGroup, financialYear,
            openingBalance: sec.openingBalance, openingBalanceType: sec.openingBalanceType,
            createdByUserId,
          });
          ledgerIdMap['Profit & Loss A/c'] = String(ledger._id);
          ledgersCreated++;
        } catch (e: any) { errors.push(`Ledger "Profit & Loss A/c": ${e.message}`); }
      } else {
        ledgerIdMap['Profit & Loss A/c'] = String(existing._id);
      }
      continue;
    }

    const group = guessLedgerGroup(sec.name, sec.openingBalanceType);
    const subGroup = guessLedgerSubGroup(sec.name, group);

    let existing = await AccLedger.findOne({
      name: { $regex: new RegExp(`^${escapeRegexStr(sec.name)}$`, 'i') },
      financialYear,
    }).lean() as any;

    if (!existing) {
      try {
        const ledger = await AccLedger.create({
          name: sec.name, group, subGroup, financialYear,
          openingBalance: sec.openingBalance,
          openingBalanceType: sec.openingBalanceType,
          createdByUserId,
        });
        ledgerIdMap[sec.name] = String(ledger._id);
        ledgersCreated++;
      } catch (e: any) { errors.push(`Ledger "${sec.name}": ${e.message}`); }
    } else {
      ledgerIdMap[sec.name] = String(existing._id);
    }
  }

  // ── Create vouchers from Bank + Cash sections ──
  // All transactions flow through bank or cash, so processing these gives complete coverage
  const bankCashSections = sections.filter(s => {
    const u = s.name.toUpperCase();
    if (u === 'CASH' || u === 'CASH-IN-HAND' || u.includes('CASH IN HAND')) return true;
    // Match bank accounts but exclude BANK CHARGES, BANK INTEREST etc.
    if (u.includes('BANK') && !u.includes('CHARGES') && !u.includes('INTEREST') && !u.includes('COMMISSION')) return true;
    return false;
  });

  // Counter-based dedup: allows multiple identical transactions (e.g., two ₹1000 payments on same date)
  // while still preventing cross-section duplicates (Contra vouchers in both bank+cash sections)
  const voucherKeyCounter: Record<string, number> = {};
  const processedKeys = new Set<string>();

  for (const bankSec of bankCashSections) {
    for (const tx of bankSec.transactions) {
      const amount = tx.debit || tx.credit;
      if (!amount || amount <= 0) continue;

      // Counter key (allows duplicates within same section)
      const baseKey = `${tx.date}_${tx.vchType}_${tx.vchNo}_${tx.contra}_${amount}`;
      voucherKeyCounter[baseKey] = (voucherKeyCounter[baseKey] || 0) + 1;
      const uniqueKey = `${baseKey}#${voucherKeyCounter[baseKey]}`;
      if (processedKeys.has(uniqueKey)) continue;
      processedKeys.add(uniqueKey);

      const jsDate = excelSerialToDate(tx.date);

      // Build double-entry
      const entries: Array<{ ledgerId: string; ledgerName: string; amount: number; type: BalanceType }> = [];

      if (tx.direction === 'To') {
        // Bank/Cash DEBITED (money coming in) → Receipt
        entries.push({ ledgerId: ledgerIdMap[bankSec.name], ledgerName: bankSec.name, amount, type: 'DEBIT' });
        entries.push({ ledgerId: ledgerIdMap[tx.contra], ledgerName: tx.contra, amount, type: 'CREDIT' });
      } else {
        // Bank/Cash CREDITED (money going out) → Payment
        entries.push({ ledgerId: ledgerIdMap[tx.contra], ledgerName: tx.contra, amount, type: 'DEBIT' });
        entries.push({ ledgerId: ledgerIdMap[bankSec.name], ledgerName: bankSec.name, amount, type: 'CREDIT' });
      }

      // Skip if any ledger ID is missing
      if (!entries[0].ledgerId || !entries[1].ledgerId) {
        const missing = !entries[0].ledgerId ? entries[0].ledgerName : entries[1].ledgerName;
        errors.push(`Skipped ${tx.vchType} ${tx.vchNo || ''} on ${jsDate.toISOString().split('T')[0]}: Ledger "${missing}" not found`);
        continue;
      }

      try {
        const voucherType = mapVchType(tx.vchType);
        await createVoucher({
          date: jsDate,
          type: voucherType,
          entries,
          narration: `${tx.vchType}${tx.vchNo ? ' #' + tx.vchNo : ''} — ${tx.contra}`,
          financialYear,
          createdByUserId,
        });
        vouchersCreated++;
      } catch (e: any) {
        errors.push(`Voucher ${tx.vchType} ${tx.vchNo || ''}: ${e.message}`);
      }
    }
  }

  return { groupsCreated, ledgersCreated, vouchersCreated, totalLedgerSections: sections.length, errors };
}
