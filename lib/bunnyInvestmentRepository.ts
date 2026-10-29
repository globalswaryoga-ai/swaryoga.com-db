import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

// ============ SCHEME DEFINITIONS ============
export type CompoundingFrequency = 'monthly' | 'daily' | 'annually';
const COMPOUNDING_FREQUENCIES: CompoundingFrequency[] = ['monthly', 'daily', 'annually'];

export class InvestmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvestmentValidationError';
  }
}

export interface InvestmentScheme {
  id: string;
  name: string;
  description: string;
  tenureYears: number;
  payoutType: 'milestone' | 'periodic_dividend';
  payoutIntervalMonths: number; // 6 for semi-annual
  minInvestment: number;
  annualDividendRatePct: number; // e.g. 12% p.a.
  lateCompoundRatePct: number; // e.g. 12% compound on overdue payouts
  lateCompoundingFrequency: CompoundingFrequency;
  graceDays: number; // days after due date before late compound interest starts
  profit5yrPerUnit: number;
  profit10yrPerUnit: number;
  bookingDepositPerUnit: number;
  isActive: boolean;
  rulesJson?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchemeUpdateInput {
  name?: string;
  description?: string;
  minInvestment?: number;
  annualDividendRatePct?: number;
  lateCompoundRatePct?: number;
  lateCompoundingFrequency?: CompoundingFrequency;
  graceDays?: number;
  profit5yrPerUnit?: number;
  profit10yrPerUnit?: number;
}

export interface SchemeCreateInput {
  name: string;
  description?: string;
  tenureYears: number;
  payoutIntervalMonths: number;
  minInvestment: number;
  annualDividendRatePct: number;
  lateCompoundRatePct: number;
  lateCompoundingFrequency?: CompoundingFrequency;
  graceDays?: number;
}

function parseSchemeRules(rulesJson?: string | null): Record<string, any> {
  try {
    const parsed = JSON.parse(rulesJson || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function mapSchemeRow(r: any): InvestmentScheme {
  const rules = parseSchemeRules(r.rules_json);
  return {
    id: String(r.id),
    name: String(r.name),
    description: String(r.description || ''),
    tenureYears: Number(r.tenure_years),
    payoutType: r.payout_type as any,
    payoutIntervalMonths: Number(r.payout_interval_months || 6),
    minInvestment: Number(r.min_investment || 11000),
    annualDividendRatePct: Number(r.annual_dividend_rate_pct || 12),
    lateCompoundRatePct: Number(r.late_compound_rate_pct || 12),
    lateCompoundingFrequency: (r.late_compounding_frequency || 'monthly') as CompoundingFrequency,
    graceDays: Math.max(0, Math.floor(Number(rules.graceDays) || 0)),
    profit5yrPerUnit: Number(r.profit_5yr_per_unit || 9000),
    profit10yrPerUnit: Number(r.profit_10yr_per_unit || 18000),
    bookingDepositPerUnit: Number(r.booking_deposit_per_unit || 1000),
    isActive: Boolean(r.is_active),
    rulesJson: r.rules_json ? String(r.rules_json) : undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

function validateSchemeRates(input: {
  annualDividendRatePct?: number;
  lateCompoundRatePct?: number;
  lateCompoundingFrequency?: string;
  graceDays?: number;
}) {
  const { annualDividendRatePct, lateCompoundRatePct, lateCompoundingFrequency, graceDays } = input;
  if (annualDividendRatePct !== undefined && !(annualDividendRatePct >= 0 && annualDividendRatePct <= 100)) {
    throw new InvestmentValidationError('Dividend rate must be between 0 and 100');
  }
  if (lateCompoundRatePct !== undefined && !(lateCompoundRatePct >= 0 && lateCompoundRatePct <= 100)) {
    throw new InvestmentValidationError('Late compound rate must be between 0 and 100');
  }
  if (lateCompoundingFrequency !== undefined && !COMPOUNDING_FREQUENCIES.includes(lateCompoundingFrequency as CompoundingFrequency)) {
    throw new InvestmentValidationError('Compounding frequency must be monthly, daily or annually');
  }
  if (graceDays !== undefined && !(Number.isInteger(graceDays) && graceDays >= 0 && graceDays <= 365)) {
    throw new InvestmentValidationError('Grace days must be a whole number between 0 and 365');
  }
}

// ============ DIVIDEND PAYOUT RECORD ============
export interface DividendPayoutRecord {
  id: string;
  investmentId: string;
  certificateNumber: string;
  cycleNumber: number; // e.g. 1 to 6 for 3-year scheme
  dueDate: string;
  baseDividendAmount: number;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  paidDate?: string;
  paidAmount?: number;
  paidTxnId?: string;
  paidMethod?: string;
  isOverdue: boolean;
  daysOverdue: number;
  accruedCompoundInterest: number;
  totalDueToday: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============ MAIN INVESTOR RECORD ============
export interface InvestmentRecord {
  id: string;
  certificateNumber: string;
  schemeId: string;
  schemeName: string;
  investorName: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  postalAddress?: string;
  slotsCount: number;
  totalInvestmentAmount: number;
  amountPaid: number;
  remainingBalance: number;
  tenureYears: number;
  payoutType: 'milestone' | 'periodic_dividend';
  annualDividendRatePct: number;
  lateCompoundRatePct: number;
  startDate: string;
  endDate: string;
  profit5yr: number;
  profit10yr: number;
  maturityAmount: number;
  bookingDate: string;
  bookingTxnId?: string;
  bookingPaymentMethod?: string;
  finalDeadline: string;
  finalPaymentDate?: string;
  finalPaymentTxnId?: string;
  isLegacyData: boolean;
  totalDividendsPaid: number;
  totalDividendsPending: number;
  totalOverdueInterest: number;
  bookingAmountRequested: number; // what the investor said they pay now (min 1,000)
  nomineeName?: string;
  nomineeRelationship?: string;
  nomineeAge?: number;
  nomineePhone?: string;
  bankAccountHolder?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  panNumber?: string;
  panDocUrl?: string;
  aadhaarNumber?: string;
  aadhaarFrontDocUrl?: string;
  aadhaarBackDocUrl?: string;
  kycStatus: 'pending' | 'submitted' | 'verified' | 'rejected';
  kycVerifiedAt?: string;
  kycVerifiedBy?: string;
  paymentStatus: 'awaiting_payment' | 'booking_paid' | 'fully_paid' | 'overdue' | 'cancelled';
  status: 'active' | 'matured' | 'cancelled';
  dividends?: DividendPayoutRecord[];
  notesJson?: string;
  createdAt: string;
  updatedAt: string;
}

const TOTAL_LIMITED_SLOTS = 150;
export const BASE_UNIT_AMOUNT = 11000;
export const BASE_5YR_PROFIT = 9000;
export const BASE_10YR_PROFIT = 18000;
export const BASE_MIN_BOOKING = 1000;

/**
 * Late Dividend Compound Interest
 * Interest starts only after due date + graceDays, then compounds at the
 * scheme's frequency:
 *   monthly : A = P * (1 + r/12)^(days / 30.4375)
 *   daily   : A = P * (1 + r/365)^days
 *   annually: A = P * (1 + r)^(days / 365)
 */
export function calculateOverdueDividendInterest(
  baseDividend: number,
  dueDateStr: string,
  annualRatePct: number = 12,
  frequency: CompoundingFrequency = 'monthly',
  graceDays: number = 0
) {
  const DAY_MS = 1000 * 60 * 60 * 24;
  const due = new Date(dueDateStr).getTime();
  const now = Date.now();

  if (isNaN(due) || now <= due) {
    return {
      isOverdue: false,
      daysOverdue: 0,
      accruedInterest: 0,
      totalDue: Math.round(baseDividend * 100) / 100,
    };
  }

  const daysOverdue = (now - due) / DAY_MS;
  const interestDays = Math.max(daysOverdue - Math.max(graceDays, 0), 0);
  const rate = annualRatePct / 100;

  let factor: number;
  if (frequency === 'daily') {
    factor = Math.pow(1 + rate / 365, interestDays);
  } else if (frequency === 'annually') {
    factor = Math.pow(1 + rate, interestDays / 365);
  } else {
    factor = Math.pow(1 + rate / 12, interestDays / 30.4375);
  }

  const totalDue = Math.round(baseDividend * factor * 100) / 100;
  const accruedInterest = Math.round((totalDue - baseDividend) * 100) / 100;

  return {
    isOverdue: true,
    daysOverdue: Math.floor(daysOverdue),
    accruedInterest,
    totalDue,
  };
}

/**
 * Calculate standard returns for 10-Year Growth Scheme
 */
export function calculateInvestmentReturns(amount: number) {
  const safeAmount = Math.max(amount, BASE_UNIT_AMOUNT);
  const ratio = safeAmount / BASE_UNIT_AMOUNT;
  const profit5yr = Math.round(ratio * BASE_5YR_PROFIT);
  const profit10yr = Math.round(ratio * BASE_10YR_PROFIT);
  const maturityAmount = safeAmount + profit10yr;
  const monthlySimpleYieldPct = 1.3636;
  const annualCagrPct = ((Math.pow(maturityAmount / safeAmount, 1 / 10) - 1) * 100);
  const bankFdComp10Yr = Math.round(safeAmount * Math.pow(1 + 0.065, 10));

  return {
    totalInvestment: safeAmount,
    profit5yr,
    profit10yr,
    maturityAmount,
    monthlySimpleYieldPct,
    annualCagrPct: Number(annualCagrPct.toFixed(2)),
    bankFdComp10Yr,
    netAdvantageOverFd: maturityAmount - bankFdComp10Yr,
  };
}

/**
 * Ensure all Bunny Edge SQL Tables exist
 */
export async function ensureBunnyInvestmentSchema() {
  await bunnyBatch([
    // 1. Schemes table
    {
      sql: `CREATE TABLE IF NOT EXISTS bunny_investment_schemes_sql (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        tenure_years INTEGER NOT NULL DEFAULT 3,
        payout_type TEXT NOT NULL DEFAULT 'milestone',
        payout_interval_months INTEGER DEFAULT 6,
        min_investment REAL DEFAULT 11000,
        annual_dividend_rate_pct REAL DEFAULT 12,
        late_compound_rate_pct REAL DEFAULT 12,
        late_compounding_frequency TEXT DEFAULT 'monthly',
        profit_5yr_per_unit REAL DEFAULT 9000,
        profit_10yr_per_unit REAL DEFAULT 18000,
        booking_deposit_per_unit REAL DEFAULT 1000,
        is_active INTEGER DEFAULT 1,
        rules_json TEXT DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
    // 2. Main investments table
    {
      sql: `CREATE TABLE IF NOT EXISTS bunny_investments_sql (
        id TEXT PRIMARY KEY,
        certificate_number TEXT UNIQUE NOT NULL,
        scheme_id TEXT DEFAULT 'scheme_10yr_growth',
        scheme_name TEXT DEFAULT 'Swar Yoga 10-Year Yogic Growth',
        investor_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        city TEXT,
        state TEXT,
        postal_address TEXT,
        slots_count INTEGER DEFAULT 1,
        total_investment_amount REAL NOT NULL,
        amount_paid REAL NOT NULL DEFAULT 0,
        remaining_balance REAL NOT NULL DEFAULT 0,
        tenure_years INTEGER DEFAULT 10,
        payout_type TEXT DEFAULT 'milestone',
        annual_dividend_rate_pct REAL DEFAULT 12,
        late_compound_rate_pct REAL DEFAULT 12,
        start_date TEXT,
        end_date TEXT,
        profit_5yr REAL NOT NULL,
        profit_10yr REAL NOT NULL,
        maturity_amount REAL NOT NULL,
        booking_date TEXT NOT NULL,
        booking_txnid TEXT,
        booking_payment_method TEXT,
        final_deadline TEXT DEFAULT '2027-01-05',
        final_payment_date TEXT,
        final_payment_txnid TEXT,
        is_legacy_data INTEGER DEFAULT 0,
        total_dividends_paid REAL DEFAULT 0,
        total_dividends_pending REAL DEFAULT 0,
        total_overdue_interest REAL DEFAULT 0,
        nominee_name TEXT,
        nominee_relationship TEXT,
        nominee_age INTEGER,
        nominee_phone TEXT,
        bank_account_holder TEXT,
        bank_name TEXT,
        bank_account_number TEXT,
        bank_ifsc TEXT,
        pan_number TEXT,
        pan_doc_url TEXT,
        aadhaar_number TEXT,
        aadhaar_front_doc_url TEXT,
        aadhaar_back_doc_url TEXT,
        kyc_status TEXT DEFAULT 'pending',
        kyc_verified_at TEXT,
        kyc_verified_by TEXT,
        payment_status TEXT DEFAULT 'booking_paid',
        status TEXT DEFAULT 'active',
        notes_json TEXT DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
    // 3. Dividends schedule table (for 6-month dividend payouts & overdue compound interest)
    {
      sql: `CREATE TABLE IF NOT EXISTS bunny_investment_dividends_sql (
        id TEXT PRIMARY KEY,
        investment_id TEXT NOT NULL,
        certificate_number TEXT NOT NULL,
        cycle_number INTEGER NOT NULL,
        due_date TEXT NOT NULL,
        base_dividend_amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        paid_date TEXT,
        paid_amount REAL DEFAULT 0,
        paid_txnid TEXT,
        paid_method TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
  ]);

  // Safely migrate existing tables if columns were added later
  const columnsToAdd = [
    `ALTER TABLE bunny_investments_sql ADD COLUMN scheme_id TEXT DEFAULT 'scheme_10yr_growth'`,
    `ALTER TABLE bunny_investments_sql ADD COLUMN scheme_name TEXT DEFAULT 'Swar Yoga 10-Year Yogic Growth'`,
    `ALTER TABLE bunny_investments_sql ADD COLUMN tenure_years INTEGER DEFAULT 10`,
    `ALTER TABLE bunny_investments_sql ADD COLUMN payout_type TEXT DEFAULT 'milestone'`,
    `ALTER TABLE bunny_investments_sql ADD COLUMN annual_dividend_rate_pct REAL DEFAULT 12`,
    `ALTER TABLE bunny_investments_sql ADD COLUMN late_compound_rate_pct REAL DEFAULT 12`,
    `ALTER TABLE bunny_investments_sql ADD COLUMN start_date TEXT`,
    `ALTER TABLE bunny_investments_sql ADD COLUMN end_date TEXT`,
    `ALTER TABLE bunny_investments_sql ADD COLUMN is_legacy_data INTEGER DEFAULT 0`,
    `ALTER TABLE bunny_investments_sql ADD COLUMN total_dividends_paid REAL DEFAULT 0`,
    `ALTER TABLE bunny_investments_sql ADD COLUMN total_dividends_pending REAL DEFAULT 0`,
    `ALTER TABLE bunny_investments_sql ADD COLUMN total_overdue_interest REAL DEFAULT 0`,
    `ALTER TABLE bunny_investments_sql ADD COLUMN booking_amount_requested REAL DEFAULT 1000`,
  ];

  for (const colSql of columnsToAdd) {
    try {
      await bunnyExecute({ sql: colSql, args: [] });
    } catch {}
  }

  // Create indexes
  try {
    await bunnyExecute({ sql: 'CREATE INDEX IF NOT EXISTS idx_inv_scheme ON bunny_investments_sql(scheme_id)', args: [] });
    await bunnyExecute({ sql: 'CREATE INDEX IF NOT EXISTS idx_inv_div_invid ON bunny_investment_dividends_sql(investment_id)', args: [] });
  } catch {}

  // Seed default schemes if none exist
  await seedDefaultSchemes();
}

/**
 * Seed Default Scheme Rules into Bunny Edge SQL
 */
async function seedDefaultSchemes() {
  const countRes = await bunnyExecute({
    sql: 'SELECT COUNT(*) as count FROM bunny_investment_schemes_sql',
    args: [],
  });

  if (Number(countRes.rows[0]?.count || 0) === 0) {
    const now = new Date().toISOString();
    await bunnyBatch([
      {
        sql: `INSERT INTO bunny_investment_schemes_sql (
          id, name, description, tenure_years, payout_type, payout_interval_months,
          min_investment, annual_dividend_rate_pct, late_compound_rate_pct, late_compounding_frequency,
          profit_5yr_per_unit, profit_10yr_per_unit, booking_deposit_per_unit, is_active, created_at, updated_at
        ) VALUES (
          'scheme_10yr_growth',
          'Swar Yoga 10-Year Yogic Growth',
          'Limited to 150 seats. Invest min ₹11,000 (or custom). Get ₹9,000 profit at 5 Years & ₹18,000 profit at 10 Years. Booking token ₹1,000.',
          10, 'milestone', 60,
          11000, 16.36, 12, 'monthly',
          9000, 18000, 1000, 1, ?, ?
        )`,
        args: [now, now],
      },
      {
        sql: `INSERT INTO bunny_investment_schemes_sql (
          id, name, description, tenure_years, payout_type, payout_interval_months,
          min_investment, annual_dividend_rate_pct, late_compound_rate_pct, late_compounding_frequency,
          profit_5yr_per_unit, profit_10yr_per_unit, booking_deposit_per_unit, is_active, created_at, updated_at
        ) VALUES (
          'scheme_3yr_dividend',
          '3-Year Semi-Annual Dividend Plan',
          'Legacy 3-Year tenure with dividend paid every 6 months (6 cycles). If payment is delayed, compound interest is automatically paid on overdue dividends at 12% p.a.',
          3, 'periodic_dividend', 6,
          10000, 12.0, 12.0, 'monthly',
          0, 0, 0, 1, ?, ?
        )`,
        args: [now, now],
      },
    ]);
  }
}

/**
 * Get all available Schemes / Rules
 */
export async function listInvestmentSchemes(): Promise<InvestmentScheme[]> {
  await ensureBunnyInvestmentSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM bunny_investment_schemes_sql WHERE is_active = 1 ORDER BY tenure_years ASC',
    args: [],
  });

  return res.rows.map((r: any) => mapSchemeRow(r));
}

/**
 * Update Scheme Settings
 * Rates, compounding frequency and grace days are live: investors on this scheme
 * pick them up on the next read. Pending dividend amounts are re-synced so the
 * new dividend rate applies to every unpaid cycle.
 * Tenure and payout interval are fixed at creation (they shape the schedule).
 */
export async function updateInvestmentScheme(schemeId: string, updates: SchemeUpdateInput) {
  await ensureBunnyInvestmentSchema();
  const existing = await getSchemeById(schemeId);
  if (!existing) throw new InvestmentValidationError('Scheme not found');

  validateSchemeRates(updates);
  if (updates.minInvestment !== undefined && !(updates.minInvestment >= 0)) {
    throw new InvestmentValidationError('Minimum investment must be 0 or more');
  }

  const now = new Date().toISOString();
  const graceDays = updates.graceDays ?? existing.graceDays;
  const rules = { ...parseSchemeRules(existing.rulesJson), graceDays };

  await bunnyExecute({
    sql: `UPDATE bunny_investment_schemes_sql SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      annual_dividend_rate_pct = COALESCE(?, annual_dividend_rate_pct),
      late_compound_rate_pct = COALESCE(?, late_compound_rate_pct),
      late_compounding_frequency = COALESCE(?, late_compounding_frequency),
      rules_json = ?,
      profit_5yr_per_unit = COALESCE(?, profit_5yr_per_unit),
      profit_10yr_per_unit = COALESCE(?, profit_10yr_per_unit),
      min_investment = COALESCE(?, min_investment),
      updated_at = ?
    WHERE id = ?`,
    args: [
      updates.name?.trim() || null,
      updates.description ?? null,
      updates.annualDividendRatePct ?? null,
      updates.lateCompoundRatePct ?? null,
      updates.lateCompoundingFrequency ?? null,
      JSON.stringify(rules),
      updates.profit5yrPerUnit ?? null,
      updates.profit10yrPerUnit ?? null,
      updates.minInvestment ?? null,
      now,
      schemeId,
    ],
  });

  if (existing.payoutType === 'periodic_dividend') {
    await syncSchemePendingDividends(schemeId);
  }

  return getSchemeById(schemeId);
}

/**
 * Create a new rule / scheme (periodic dividend plan)
 */
export async function createInvestmentScheme(params: SchemeCreateInput) {
  await ensureBunnyInvestmentSchema();
  const name = params.name?.trim();
  if (!name) throw new InvestmentValidationError('Scheme name is required');
  if (!(Number.isInteger(params.tenureYears) && params.tenureYears >= 1 && params.tenureYears <= 30)) {
    throw new InvestmentValidationError('Tenure must be a whole number of years between 1 and 30');
  }
  if (!(Number.isInteger(params.payoutIntervalMonths) && params.payoutIntervalMonths >= 1 && params.payoutIntervalMonths <= 12 && (params.tenureYears * 12) % params.payoutIntervalMonths === 0)) {
    throw new InvestmentValidationError('Payout interval must divide the tenure evenly (e.g. 1, 3, 6 or 12 months)');
  }
  if (!(params.minInvestment >= 0)) {
    throw new InvestmentValidationError('Minimum investment must be 0 or more');
  }
  validateSchemeRates({
    annualDividendRatePct: params.annualDividendRatePct,
    lateCompoundRatePct: params.lateCompoundRatePct,
    lateCompoundingFrequency: params.lateCompoundingFrequency ?? 'monthly',
    graceDays: params.graceDays ?? 0,
  });

  const id = `scheme_${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  await bunnyExecute({
    sql: `INSERT INTO bunny_investment_schemes_sql (
      id, name, description, tenure_years, payout_type, payout_interval_months,
      min_investment, annual_dividend_rate_pct, late_compound_rate_pct, late_compounding_frequency,
      profit_5yr_per_unit, profit_10yr_per_unit, booking_deposit_per_unit, is_active, rules_json,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'periodic_dividend', ?, ?, ?, ?, ?, 0, 0, 0, 1, ?, ?, ?)`,
    args: [
      id,
      name,
      params.description?.trim() || '',
      params.tenureYears,
      params.payoutIntervalMonths,
      params.minInvestment,
      params.annualDividendRatePct,
      params.lateCompoundRatePct,
      params.lateCompoundingFrequency ?? 'monthly',
      JSON.stringify({ graceDays: params.graceDays ?? 0 }),
      now,
      now,
    ],
  });

  return getSchemeById(id);
}

/**
 * Re-apply a scheme's current dividend rate to every unpaid cycle of its investors.
 * Paid cycles are never touched.
 */
export async function syncSchemePendingDividends(schemeId: string) {
  const scheme = await getSchemeById(schemeId);
  if (!scheme) return 0;

  const invRes = await bunnyExecute({
    sql: 'SELECT id, total_investment_amount FROM bunny_investments_sql WHERE scheme_id = ?',
    args: [schemeId],
  });

  const now = new Date().toISOString();
  const batch: Array<{ sql: string; args: any[] }> = [];
  for (const row of invRes.rows as any[]) {
    const principal = Number(row.total_investment_amount || 0);
    const cycleBase = Math.round(principal * (scheme.annualDividendRatePct / 100) * (scheme.payoutIntervalMonths / 12) * 100) / 100;
    batch.push({
      sql: `UPDATE bunny_investment_dividends_sql SET base_dividend_amount = ?, updated_at = ?
            WHERE investment_id = ? AND status = 'pending'`,
      args: [cycleBase, now, String(row.id)],
    });
    batch.push({
      sql: `UPDATE bunny_investments_sql SET annual_dividend_rate_pct = ?, late_compound_rate_pct = ?, updated_at = ? WHERE id = ?`,
      args: [scheme.annualDividendRatePct, scheme.lateCompoundRatePct, now, String(row.id)],
    });
  }

  if (batch.length > 0) {
    await bunnyBatch(batch);
  }
  return invRes.rows.length;
}

export async function getSchemeById(id: string): Promise<InvestmentScheme | null> {
  await ensureBunnyInvestmentSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM bunny_investment_schemes_sql WHERE id = ? LIMIT 1',
    args: [id],
  });
  if (!res.rows[0]) return null;
  return mapSchemeRow(res.rows[0]);
}

/**
 * Generate 6-Month Dividend Schedule for an Investment (Auto-Generates 6 cycles for 3-Year scheme)
 */
export async function generateDividendScheduleForInvestment(params: {
  investmentId: string;
  certificateNumber: string;
  totalAmount: number;
  startDateStr: string;
  tenureYears?: number;
  intervalMonths?: number;
  annualRatePct?: number;
}) {
  await ensureBunnyInvestmentSchema();
  const tenure = params.tenureYears || 3;
  const interval = params.intervalMonths || 6;
  const totalCycles = (tenure * 12) / interval; // 6 cycles for 3 years
  const annualRate = params.annualRatePct || 12; // 12% p.a.
  const cycleRate = (annualRate / 100) * (interval / 12); // 6% per 6 months
  const baseDividendPerCycle = Math.round(params.totalAmount * cycleRate * 100) / 100;

  const start = new Date(params.startDateStr);
  const now = new Date().toISOString();

  // Delete existing un-paid schedule to regenerate clean
  await bunnyExecute({
    sql: "DELETE FROM bunny_investment_dividends_sql WHERE investment_id = ? AND status = 'pending'",
    args: [params.investmentId],
  });

  const batchInserts: Array<{ sql: string; args: any[] }> = [];
  for (let c = 1; c <= totalCycles; c++) {
    const cycleDue = new Date(start);
    cycleDue.setMonth(cycleDue.getMonth() + c * interval);
    const dueDateStr = cycleDue.toISOString().split('T')[0];

    const divId = `div_${params.investmentId}_c${c}`;
    batchInserts.push({
      sql: `INSERT OR IGNORE INTO bunny_investment_dividends_sql (
        id, investment_id, certificate_number, cycle_number, due_date, base_dividend_amount,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      args: [divId, params.investmentId, params.certificateNumber, c, dueDateStr, baseDividendPerCycle, now, now],
    });
  }

  if (batchInserts.length > 0) {
    await bunnyBatch(batchInserts);
  }

  return getDividendsForInvestment(params.investmentId);
}

/**
 * Fetch All Dividends for an Investment (With Live Overdue Compound Interest Auto-Calculated)
 */
export async function getDividendsForInvestment(investmentId: string): Promise<DividendPayoutRecord[]> {
  await ensureBunnyInvestmentSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM bunny_investment_dividends_sql WHERE investment_id = ? ORDER BY cycle_number ASC',
    args: [investmentId],
  });

  // Late interest terms come from the LIVE scheme so settings changes auto-apply.
  // Investment row values are only a fallback if the scheme no longer exists.
  const invRes = await bunnyExecute({
    sql: 'SELECT scheme_id, late_compound_rate_pct FROM bunny_investments_sql WHERE id = ? LIMIT 1',
    args: [investmentId],
  });
  const scheme = invRes.rows[0] ? await getSchemeById(String(invRes.rows[0].scheme_id)) : null;
  const lateRate = scheme?.lateCompoundRatePct ?? Number(invRes.rows[0]?.late_compound_rate_pct || 12);
  const lateFrequency: CompoundingFrequency = scheme?.lateCompoundingFrequency ?? 'monthly';
  const graceDays = scheme?.graceDays ?? 0;

  return res.rows.map((r: any) => {
    const baseDividend = Number(r.base_dividend_amount);
    const dueDate = String(r.due_date);
    const status = String(r.status);

    if (status === 'paid') {
      return {
        id: String(r.id),
        investmentId: String(r.investment_id),
        certificateNumber: String(r.certificate_number),
        cycleNumber: Number(r.cycle_number),
        dueDate,
        baseDividendAmount: baseDividend,
        status: 'paid',
        paidDate: r.paid_date ? String(r.paid_date) : undefined,
        paidAmount: Number(r.paid_amount || baseDividend),
        paidTxnId: r.paid_txnid ? String(r.paid_txnid) : undefined,
        paidMethod: r.paid_method ? String(r.paid_method) : undefined,
        isOverdue: false,
        daysOverdue: 0,
        accruedCompoundInterest: 0,
        totalDueToday: 0,
        notes: r.notes ? String(r.notes) : undefined,
        createdAt: String(r.created_at),
        updatedAt: String(r.updated_at),
      };
    }

    // Dynamic Live Overdue Calculation!
    const overdueCalc = calculateOverdueDividendInterest(baseDividend, dueDate, lateRate, lateFrequency, graceDays);

    return {
      id: String(r.id),
      investmentId: String(r.investment_id),
      certificateNumber: String(r.certificate_number),
      cycleNumber: Number(r.cycle_number),
      dueDate,
      baseDividendAmount: baseDividend,
      status: overdueCalc.isOverdue ? 'overdue' : 'pending',
      isOverdue: overdueCalc.isOverdue,
      daysOverdue: overdueCalc.daysOverdue,
      accruedCompoundInterest: overdueCalc.accruedInterest,
      totalDueToday: overdueCalc.totalDue,
      notes: r.notes ? String(r.notes) : undefined,
      createdAt: String(r.created_at),
      updatedAt: String(r.updated_at),
    };
  });
}

/**
 * Record a Dividend Payout (Admin marks a 6-month dividend as paid)
 */
export async function markDividendAsPaid(params: {
  dividendId: string;
  paidAmount: number;
  paidDate?: string;
  paidTxnId: string;
  paidMethod?: string;
  notes?: string;
}) {
  await ensureBunnyInvestmentSchema();
  const now = new Date().toISOString();
  const paidDate = params.paidDate || now.split('T')[0];

  await bunnyExecute({
    sql: `UPDATE bunny_investment_dividends_sql SET
      status = 'paid',
      paid_date = ?,
      paid_amount = ?,
      paid_txnid = ?,
      paid_method = ?,
      notes = COALESCE(?, notes),
      updated_at = ?
    WHERE id = ?`,
    args: [
      paidDate,
      params.paidAmount,
      params.paidTxnId,
      params.paidMethod || 'bank_neft',
      params.notes || null,
      now,
      params.dividendId,
    ],
  });

  return true;
}

/**
 * Add Old / Legacy 3-Year Semi-Annual Dividend Investor
 */
export async function addLegacyInvestmentRecord(params: {
  schemeId?: string; // periodic dividend scheme; defaults to the 3-year semi-annual plan
  investorName: string;
  phone: string;
  email?: string;
  city?: string;
  totalInvestmentAmount: number;
  startDate: string; // e.g. '2024-01-15'
  certificateNumber?: string;
  amountPaid?: number;
  panNumber?: string;
  aadhaarNumber?: string;
  bankAccountHolder?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  nomineeName?: string;
  nomineeRelationship?: string;
  pastDividendsPaidCycles?: number[]; // e.g. [1, 2] if first 2 cycles paid
}) {
  await ensureBunnyInvestmentSchema();
  const id = `inv_legacy_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const scheme = await getSchemeById(params.schemeId || 'scheme_3yr_dividend');
  if (!scheme) throw new InvestmentValidationError('Selected scheme not found');
  if (scheme.payoutType !== 'periodic_dividend') {
    throw new InvestmentValidationError('Legacy investors can only be added to a periodic dividend scheme');
  }

  // Terms come from the scheme (single source of truth) and stay live afterwards.
  const tenure = scheme.tenureYears;
  const interval = scheme.payoutIntervalMonths;
  const annualDiv = scheme.annualDividendRatePct;
  const lateRate = scheme.lateCompoundRatePct;

  const start = new Date(params.startDate);
  if (isNaN(start.getTime())) throw new InvestmentValidationError('Start date is invalid');
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + tenure);
  const endDateStr = end.toISOString().split('T')[0];

  // Certificate Number
  let certNo = params.certificateNumber?.trim();
  if (!certNo) {
    const countRes = await bunnyExecute({
      sql: 'SELECT COUNT(*) as count FROM bunny_investments_sql',
      args: [],
    });
    const count = Number(countRes.rows[0]?.count || 0);
    certNo = `SY-DIV-3YR-${String(count + 1).padStart(3, '0')}`;
  }

  const amount = Number(params.totalInvestmentAmount);
  if (!(amount > 0)) throw new InvestmentValidationError('Invested amount must be greater than 0');
  const paid = params.amountPaid !== undefined ? Number(params.amountPaid) : amount;
  if (!(paid >= 0) || paid > amount) throw new InvestmentValidationError('Amount paid must be between 0 and the invested amount');
  const remaining = Math.max(amount - paid, 0);

  // Insert main investment row
  await bunnyExecute({
    sql: `INSERT INTO bunny_investments_sql (
      id, certificate_number, scheme_id, scheme_name, investor_name, phone, email, city,
      slots_count, total_investment_amount, amount_paid, remaining_balance,
      tenure_years, payout_type, annual_dividend_rate_pct, late_compound_rate_pct,
      start_date, end_date, profit_5yr, profit_10yr, maturity_amount,
      booking_date, final_deadline, is_legacy_data,
      pan_number, aadhaar_number, bank_account_holder, bank_name, bank_account_number, bank_ifsc,
      nominee_name, nominee_relationship,
      payment_status, kyc_status, status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      1, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, 0, 0, ?,
      ?, ?, 1,
      ?, ?, ?, ?, ?, ?,
      ?, ?,
      'fully_paid', 'submitted', 'active', ?, ?
    )`,
    args: [
      id,
      certNo,
      scheme.id,
      scheme.name,
      params.investorName.trim(),
      params.phone.trim(),
      params.email?.trim() || null,
      params.city?.trim() || null,
      amount,
      paid,
      remaining,
      tenure,
      scheme.payoutType,
      annualDiv,
      lateRate,
      params.startDate,
      endDateStr,
      amount, // at end of tenure principal is returned
      params.startDate,
      endDateStr,
      params.panNumber || null,
      params.aadhaarNumber || null,
      params.bankAccountHolder || null,
      params.bankName || null,
      params.bankAccountNumber || null,
      params.bankIfsc || null,
      params.nomineeName || null,
      params.nomineeRelationship || null,
      now,
      now,
    ],
  });

  // Generate the dividend schedule using the scheme's interval
  await generateDividendScheduleForInvestment({
    investmentId: id,
    certificateNumber: certNo,
    totalAmount: amount,
    startDateStr: params.startDate,
    tenureYears: tenure,
    intervalMonths: interval,
    annualRatePct: annualDiv,
  });

  // Cycles already paid before import are recorded as paid; the rest stay pending/overdue
  const totalCycles = Math.round((tenure * 12) / interval);
  const cycleBase = Math.round(amount * (annualDiv / 100) * (interval / 12) * 100) / 100;
  if (Array.isArray(params.pastDividendsPaidCycles) && params.pastDividendsPaidCycles.length > 0) {
    const cycles = [...new Set(params.pastDividendsPaidCycles.map(Number))];
    const invalid = cycles.filter((c) => !Number.isInteger(c) || c < 1 || c > totalCycles);
    if (invalid.length > 0) {
      throw new InvestmentValidationError(`Paid cycle numbers must be between 1 and ${totalCycles}`);
    }
    for (const cycleNo of cycles) {
      const divId = `div_${id}_c${cycleNo}`;
      await markDividendAsPaid({
        dividendId: divId,
        paidAmount: cycleBase,
        paidTxnId: `PAST_DIV_CYCLE_${cycleNo}`,
        paidMethod: 'bank_transfer',
        notes: `Recorded as historically paid for Cycle ${cycleNo}`,
      });
    }
  }

  return getInvestmentById(id);
}

/**
 * Enhanced Row Mapping including Scheme and Dividends Summary
 */
function mapRow(row: any): InvestmentRecord {
  return {
    id: String(row.id),
    certificateNumber: String(row.certificate_number),
    schemeId: String(row.scheme_id || 'scheme_10yr_growth'),
    schemeName: String(row.scheme_name || 'Swar Yoga 10-Year Yogic Growth'),
    investorName: String(row.investor_name),
    phone: String(row.phone),
    email: row.email ? String(row.email) : undefined,
    city: row.city ? String(row.city) : undefined,
    state: row.state ? String(row.state) : undefined,
    postalAddress: row.postal_address ? String(row.postal_address) : undefined,
    slotsCount: Number(row.slots_count || 1),
    totalInvestmentAmount: Number(row.total_investment_amount || 0),
    amountPaid: Number(row.amount_paid || 0),
    remainingBalance: Number(row.remaining_balance || 0),
    tenureYears: Number(row.tenure_years || 10),
    payoutType: (row.payout_type as any) || 'milestone',
    annualDividendRatePct: Number(row.annual_dividend_rate_pct || 12),
    lateCompoundRatePct: Number(row.late_compound_rate_pct || 12),
    startDate: String(row.start_date || row.booking_date),
    endDate: String(row.end_date || row.final_deadline),
    profit5yr: Number(row.profit_5yr || 0),
    profit10yr: Number(row.profit_10yr || 0),
    maturityAmount: Number(row.maturity_amount || 0),
    bookingDate: String(row.booking_date),
    bookingTxnId: row.booking_txnid ? String(row.booking_txnid) : undefined,
    bookingPaymentMethod: row.booking_payment_method ? String(row.booking_payment_method) : undefined,
    finalDeadline: String(row.final_deadline || '2027-01-05'),
    finalPaymentDate: row.final_payment_date ? String(row.final_payment_date) : undefined,
    finalPaymentTxnId: row.final_payment_txnid ? String(row.final_payment_txnid) : undefined,
    isLegacyData: Boolean(row.is_legacy_data),
    totalDividendsPaid: Number(row.total_dividends_paid || 0),
    totalDividendsPending: Number(row.total_dividends_pending || 0),
    totalOverdueInterest: Number(row.total_overdue_interest || 0),
    bookingAmountRequested: Number(row.booking_amount_requested || 1000),
    nomineeName: row.nominee_name ? String(row.nominee_name) : undefined,
    nomineeRelationship: row.nominee_relationship ? String(row.nominee_relationship) : undefined,
    nomineeAge: row.nominee_age ? Number(row.nominee_age) : undefined,
    nomineePhone: row.nominee_phone ? String(row.nominee_phone) : undefined,
    bankAccountHolder: row.bank_account_holder ? String(row.bank_account_holder) : undefined,
    bankName: row.bank_name ? String(row.bank_name) : undefined,
    bankAccountNumber: row.bank_account_number ? String(row.bank_account_number) : undefined,
    bankIfsc: row.bank_ifsc ? String(row.bank_ifsc) : undefined,
    panNumber: row.pan_number ? String(row.pan_number) : undefined,
    panDocUrl: row.pan_doc_url ? String(row.pan_doc_url) : undefined,
    aadhaarNumber: row.aadhaar_number ? String(row.aadhaar_number) : undefined,
    aadhaarFrontDocUrl: row.aadhaar_front_doc_url ? String(row.aadhaar_front_doc_url) : undefined,
    aadhaarBackDocUrl: row.aadhaar_back_doc_url ? String(row.aadhaar_back_doc_url) : undefined,
    kycStatus: (row.kyc_status as any) || 'pending',
    kycVerifiedAt: row.kyc_verified_at ? String(row.kyc_verified_at) : undefined,
    kycVerifiedBy: row.kyc_verified_by ? String(row.kyc_verified_by) : undefined,
    paymentStatus: (row.payment_status as any) || 'booking_paid',
    status: (row.status as any) || 'active',
    notesJson: row.notes_json ? String(row.notes_json) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/**
 * Get Investment by ID with its Dividends
 */
export async function getInvestmentById(id: string): Promise<InvestmentRecord | null> {
  await ensureBunnyInvestmentSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM bunny_investments_sql WHERE id = ? LIMIT 1',
    args: [id],
  });
  if (!res.rows[0]) return null;
  const mapped = mapRow(res.rows[0]);

  // If scheme has dividends, attach live schedule
  if (mapped.payoutType === 'periodic_dividend') {
    mapped.dividends = await getDividendsForInvestment(id);
    mapped.totalDividendsPaid = mapped.dividends.filter(d => d.status === 'paid').reduce((s, d) => s + (d.paidAmount || d.baseDividendAmount), 0);
    mapped.totalDividendsPending = mapped.dividends.filter(d => d.status !== 'paid').reduce((s, d) => s + d.baseDividendAmount, 0);
    mapped.totalOverdueInterest = mapped.dividends.filter(d => d.isOverdue).reduce((s, d) => s + d.accruedCompoundInterest, 0);
  }

  return mapped;
}

export async function getInvestmentByCertificate(certNo: string): Promise<InvestmentRecord | null> {
  await ensureBunnyInvestmentSchema();
  const res = await bunnyExecute({
    sql: 'SELECT * FROM bunny_investments_sql WHERE certificate_number = ? LIMIT 1',
    args: [certNo.trim().toUpperCase()],
  });
  if (!res.rows[0]) return null;
  return getInvestmentById(String(res.rows[0].id));
}

export async function getInvestmentsByPhone(phone: string): Promise<InvestmentRecord[]> {
  await ensureBunnyInvestmentSchema();
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const res = await bunnyExecute({
    sql: 'SELECT id FROM bunny_investments_sql WHERE phone LIKE ? ORDER BY created_at DESC',
    args: [`%${cleanPhone}%`],
  });
  const results: InvestmentRecord[] = [];
  for (const r of res.rows) {
    const item = await getInvestmentById(String(r.id));
    if (item) results.push(item);
  }
  return results;
}

export async function getInvestmentStats() {
  await ensureBunnyInvestmentSchema();
  const countRes = await bunnyExecute({
    sql: `SELECT 
      COUNT(*) as total_investors,
      COALESCE(SUM(CASE WHEN scheme_id = 'scheme_10yr_growth' THEN slots_count ELSE 0 END), 0) as slots_claimed,
      COALESCE(SUM(total_investment_amount), 0) as total_committed,
      COALESCE(SUM(amount_paid), 0) as total_collected,
      COALESCE(SUM(remaining_balance), 0) as total_pending
    FROM bunny_investments_sql WHERE status = 'active'`,
    args: [],
  });

  const row = countRes.rows[0] || {};
  const slotsClaimed = Number(row.slots_claimed || 0);
  const remainingSlots = Math.max(TOTAL_LIMITED_SLOTS - slotsClaimed, 0);

  return {
    totalCapacity: TOTAL_LIMITED_SLOTS,
    slotsClaimed,
    remainingSlots,
    totalInvestors: Number(row.total_investors || 0),
    totalCommitted: Number(row.total_committed || 0),
    totalCollected: Number(row.total_collected || 0),
    totalPending: Number(row.total_pending || 0),
  };
}

export async function createInvestmentBooking(params: {
  investorName: string;
  phone: string;
  email?: string;
  city?: string;
  state?: string;
  postalAddress?: string;
  schemeId?: string;
  totalInvestmentAmount: number;
  amountPaidNow: number;
  slotsCount?: number;
  bookingTxnId?: string;
  bookingPaymentMethod?: string;
  finalDeadline?: string;
  nomineeName?: string;
  nomineeRelationship?: string;
  nomineeAge?: number;
  nomineePhone?: string;
}) {
  await ensureBunnyInvestmentSchema();

  const id = `inv_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const schemeId = params.schemeId || 'scheme_10yr_growth';
  const scheme = (await getSchemeById(schemeId)) || {
    id: 'scheme_10yr_growth',
    name: 'Swar Yoga 10-Year Yogic Growth',
    tenureYears: 10,
    annualDividendRatePct: 16.36,
    lateCompoundRatePct: 12,
  };

  const totalAmount = Math.max(Number(params.totalInvestmentAmount) || BASE_UNIT_AMOUNT, BASE_UNIT_AMOUNT);
  const calculatedSlots = params.slotsCount || Math.max(Math.floor(totalAmount / BASE_UNIT_AMOUNT), 1);
  // 0 is a valid value here: a booking created before its payment has cleared
  const requestedPaidNow = Number(params.amountPaidNow);
  const paidNow = Math.min(
    Number.isFinite(requestedPaidNow) && requestedPaidNow >= 0 ? requestedPaidNow : BASE_MIN_BOOKING,
    totalAmount
  );
  const remaining = Math.max(totalAmount - paidNow, 0);

  const returns = calculateInvestmentReturns(totalAmount);

  const countRes = await bunnyExecute({
    sql: 'SELECT COUNT(*) as count FROM bunny_investments_sql',
    args: [],
  });
  const currentCount = Number(countRes.rows[0]?.count || 0);
  const certificateNumber = `SY-INV-2026-${String(currentCount + 1).padStart(3, '0')}`;

  const paymentStatus = remaining === 0 ? 'fully_paid' : paidNow === 0 ? 'awaiting_payment' : 'booking_paid';
  const finalDeadline = params.finalDeadline || '2027-01-05';

  const start = new Date();
  const end = new Date();
  end.setFullYear(end.getFullYear() + (scheme.tenureYears || 10));

  await bunnyExecute({
    sql: `INSERT INTO bunny_investments_sql (
      id, certificate_number, scheme_id, scheme_name, investor_name, phone, email, city, state, postal_address,
      slots_count, total_investment_amount, amount_paid, remaining_balance,
      tenure_years, payout_type, annual_dividend_rate_pct, late_compound_rate_pct,
      start_date, end_date, profit_5yr, profit_10yr, maturity_amount, booking_date, booking_txnid, booking_payment_method,
      final_deadline, nominee_name, nominee_relationship, nominee_age, nominee_phone,
      payment_status, status, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, 'milestone', ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, 'active', ?, ?
    )`,
    args: [
      id,
      certificateNumber,
      scheme.id,
      scheme.name,
      params.investorName.trim(),
      params.phone.trim(),
      params.email?.trim() || null,
      params.city?.trim() || null,
      params.state?.trim() || null,
      params.postalAddress?.trim() || null,
      calculatedSlots,
      totalAmount,
      paidNow,
      remaining,
      scheme.tenureYears || 10,
      scheme.annualDividendRatePct || 16.36,
      scheme.lateCompoundRatePct || 12,
      start.toISOString().split('T')[0],
      end.toISOString().split('T')[0],
      returns.profit5yr,
      returns.profit10yr,
      returns.maturityAmount,
      now,
      params.bookingTxnId || null,
      params.bookingPaymentMethod || 'online',
      finalDeadline,
      params.nomineeName?.trim() || null,
      params.nomineeRelationship?.trim() || null,
      params.nomineeAge || null,
      params.nomineePhone?.trim() || null,
      paymentStatus,
      now,
      now,
    ],
  });

  return getInvestmentById(id);
}

export async function recordRemainingPayment(params: {
  investmentId: string;
  amountPaid: number;
  txnid: string;
  paymentMethod?: string;
}) {
  await ensureBunnyInvestmentSchema();
  const inv = await getInvestmentById(params.investmentId);
  if (!inv) throw new Error('Investment not found');

  const newAmountPaid = inv.amountPaid + params.amountPaid;
  const newRemaining = Math.max(inv.totalInvestmentAmount - newAmountPaid, 0);
  const paymentStatus = newRemaining === 0 ? 'fully_paid' : 'booking_paid';
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `UPDATE bunny_investments_sql SET 
      amount_paid = ?,
      remaining_balance = ?,
      payment_status = ?,
      final_payment_date = ?,
      final_payment_txnid = ?,
      updated_at = ?
    WHERE id = ?`,
    args: [newAmountPaid, newRemaining, paymentStatus, now, params.txnid, now, params.investmentId],
  });

  return getInvestmentById(params.investmentId);
}

export async function updateInvestorKYC(params: {
  investmentId: string;
  panNumber?: string;
  panDocUrl?: string;
  aadhaarNumber?: string;
  aadhaarFrontDocUrl?: string;
  aadhaarBackDocUrl?: string;
  bankAccountHolder?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  nomineeName?: string;
  nomineeRelationship?: string;
  nomineeAge?: number;
  nomineePhone?: string;
  postalAddress?: string;
  city?: string;
  state?: string;
}) {
  await ensureBunnyInvestmentSchema();
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `UPDATE bunny_investments_sql SET
      pan_number = COALESCE(?, pan_number),
      pan_doc_url = COALESCE(?, pan_doc_url),
      aadhaar_number = COALESCE(?, aadhaar_number),
      aadhaar_front_doc_url = COALESCE(?, aadhaar_front_doc_url),
      aadhaar_back_doc_url = COALESCE(?, aadhaar_back_doc_url),
      bank_account_holder = COALESCE(?, bank_account_holder),
      bank_name = COALESCE(?, bank_name),
      bank_account_number = COALESCE(?, bank_account_number),
      bank_ifsc = COALESCE(?, bank_ifsc),
      nominee_name = COALESCE(?, nominee_name),
      nominee_relationship = COALESCE(?, nominee_relationship),
      nominee_age = COALESCE(?, nominee_age),
      nominee_phone = COALESCE(?, nominee_phone),
      postal_address = COALESCE(?, postal_address),
      city = COALESCE(?, city),
      state = COALESCE(?, state),
      kyc_status = 'submitted',
      updated_at = ?
    WHERE id = ?`,
    args: [
      params.panNumber?.trim() || null,
      params.panDocUrl?.trim() || null,
      params.aadhaarNumber?.trim() || null,
      params.aadhaarFrontDocUrl?.trim() || null,
      params.aadhaarBackDocUrl?.trim() || null,
      params.bankAccountHolder?.trim() || null,
      params.bankName?.trim() || null,
      params.bankAccountNumber?.trim() || null,
      params.bankIfsc?.trim() || null,
      params.nomineeName?.trim() || null,
      params.nomineeRelationship?.trim() || null,
      params.nomineeAge || null,
      params.nomineePhone?.trim() || null,
      params.postalAddress?.trim() || null,
      params.city?.trim() || null,
      params.state?.trim() || null,
      now,
      params.investmentId,
    ],
  });

  return getInvestmentById(params.investmentId);
}

export async function setKYCStatus(params: {
  investmentId: string;
  kycStatus: 'verified' | 'rejected';
  verifiedBy: string;
}) {
  await ensureBunnyInvestmentSchema();
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `UPDATE bunny_investments_sql SET 
      kyc_status = ?,
      kyc_verified_at = ?,
      kyc_verified_by = ?,
      updated_at = ?
    WHERE id = ?`,
    args: [params.kycStatus, now, params.verifiedBy, now, params.investmentId],
  });

  return getInvestmentById(params.investmentId);
}

export async function listAllInvestments(opts: {
  search?: string;
  schemeId?: string;
  paymentStatus?: string;
  kycStatus?: string;
  limit?: number;
  skip?: number;
} = {}) {
  await ensureBunnyInvestmentSchema();
  const limit = Math.min(Math.max(Number(opts.limit || 150), 1), 500);
  const skip = Math.max(Number(opts.skip || 0), 0);

  const conditions: string[] = ["status = 'active'"];
  const args: any[] = [];

  if (opts.schemeId && opts.schemeId !== 'all') {
    conditions.push('scheme_id = ?');
    args.push(opts.schemeId);
  }

  if (opts.paymentStatus && opts.paymentStatus !== 'all') {
    conditions.push('payment_status = ?');
    args.push(opts.paymentStatus);
  }

  if (opts.kycStatus && opts.kycStatus !== 'all') {
    conditions.push('kyc_status = ?');
    args.push(opts.kycStatus);
  }

  if (opts.search?.trim()) {
    const q = `%${opts.search.trim()}%`;
    conditions.push('(investor_name LIKE ? OR phone LIKE ? OR certificate_number LIKE ? OR city LIKE ?)');
    args.push(q, q, q, q);
  }

  const whereClause = conditions.join(' AND ');

  const countRes = await bunnyExecute({
    sql: `SELECT COUNT(*) as count FROM bunny_investments_sql WHERE ${whereClause}`,
    args,
  });
  const total = Number(countRes.rows[0]?.count || 0);

  const res = await bunnyExecute({
    sql: `SELECT id FROM bunny_investments_sql WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    args: [...args, limit, skip],
  });

  const investments: InvestmentRecord[] = [];
  for (const r of res.rows) {
    const item = await getInvestmentById(String(r.id));
    if (item) investments.push(item);
  }

  return { investments, total };
}

/** Store how much the investor says they will pay now (their first payment). */
export async function setBookingAmountRequested(investmentId: string, amount: number) {
  await ensureBunnyInvestmentSchema();
  await bunnyExecute({
    sql: 'UPDATE bunny_investments_sql SET booking_amount_requested = ?, updated_at = ? WHERE id = ?',
    args: [amount, new Date().toISOString(), investmentId],
  });
}

/** Update general investment record details (Admin CRM) */
export async function updateInvestmentRecord(
  investmentId: string,
  params: {
    investorName?: string;
    phone?: string;
    email?: string;
    city?: string;
    totalInvestmentAmount?: number;
    amountPaid?: number;
    startDate?: string;
    endDate?: string;
    annualDividendRatePct?: number;
    status?: 'active' | 'matured' | 'cancelled';
    paymentStatus?: 'awaiting_payment' | 'booking_paid' | 'fully_paid' | 'overdue' | 'cancelled';
    kycStatus?: 'pending' | 'submitted' | 'verified' | 'rejected';
  }
): Promise<InvestmentRecord | null> {
  await ensureBunnyInvestmentSchema();
  const inv = await getInvestmentById(investmentId);
  if (!inv) return null;

  const now = new Date().toISOString();
  const newTotal = params.totalInvestmentAmount !== undefined ? Number(params.totalInvestmentAmount) : inv.totalInvestmentAmount;
  const newPaid = params.amountPaid !== undefined ? Number(params.amountPaid) : inv.amountPaid;
  const newRemaining = Math.max(newTotal - newPaid, 0);

  await bunnyExecute({
    sql: `UPDATE bunny_investments_sql SET
      investor_name = COALESCE(?, investor_name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      city = COALESCE(?, city),
      total_investment_amount = ?,
      amount_paid = ?,
      remaining_balance = ?,
      start_date = COALESCE(?, start_date),
      end_date = COALESCE(?, end_date),
      annual_dividend_rate_pct = COALESCE(?, annual_dividend_rate_pct),
      status = COALESCE(?, status),
      payment_status = COALESCE(?, payment_status),
      kyc_status = COALESCE(?, kyc_status),
      updated_at = ?
    WHERE id = ?`,
    args: [
      params.investorName?.trim() || null,
      params.phone?.trim() || null,
      params.email?.trim() || null,
      params.city?.trim() || null,
      newTotal,
      newPaid,
      newRemaining,
      params.startDate || null,
      params.endDate || null,
      params.annualDividendRatePct !== undefined ? Number(params.annualDividendRatePct) : null,
      params.status || null,
      params.paymentStatus || null,
      params.kycStatus || null,
      now,
      investmentId,
    ],
  });

  return getInvestmentById(investmentId);
}

/** Delete investment and related dividends & payments (Admin CRM) */
export async function deleteInvestmentRecord(investmentId: string): Promise<boolean> {
  await ensureBunnyInvestmentSchema();
  await bunnyExecute({
    sql: 'DELETE FROM bunny_investment_dividends_sql WHERE investment_id = ?',
    args: [investmentId],
  });
  await bunnyExecute({
    sql: 'DELETE FROM bunny_investment_payments_sql WHERE investment_id = ?',
    args: [investmentId],
  });
  const res = await bunnyExecute({
    sql: 'DELETE FROM bunny_investments_sql WHERE id = ?',
    args: [investmentId],
  });
  return (res.rowsAffected || 0) > 0;
}
