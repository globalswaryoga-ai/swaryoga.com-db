/**
 * Transform engine.ts to add ownerId multi-tenant support.
 * 
 * Run: node scripts/transform-engine-ownerid.js
 * 
 * What this does:
 * 1. Adds import for scopeQuery
 * 2. Adds ownerId?: string parameter to all exported functions
 * 3. Adds ownerId scoping to all { financialYear } query objects  
 * 4. Adds ownerId to all .create() payloads
 * 5. Passes ownerId through internal function calls
 */

const fs = require('fs');
const path = require('path');

const ENGINE_PATH = path.join(__dirname, '..', 'lib', 'tally', 'engine.ts');
let code = fs.readFileSync(ENGINE_PATH, 'utf-8');

// ─── 1. Add import for scopeQuery ───────────────────────────────────

code = code.replace(
  `import { getAccLedger, getAccVoucher, getAccGroup, getAccFinancialYear, getAccVoucherNumbering, getAccCostCenter, getAccAuditTrail, getAccTdsEntry, getAccStockGroup, getAccStockItem, getAccStockTxn } from '@/lib/schemas/enterpriseSchemas';`,
  `import { getAccLedger, getAccVoucher, getAccGroup, getAccFinancialYear, getAccVoucherNumbering, getAccCostCenter, getAccAuditTrail, getAccTdsEntry, getAccStockGroup, getAccStockItem, getAccStockTxn } from '@/lib/schemas/enterpriseSchemas';
import { scopeQuery } from '@/lib/tally/access';`
);

// ─── 2. Update cache invalidation to include ownerId ────────────────

code = code.replace(
  `export function invalidateReportCache(financialYear?: string): void {`,
  `export function invalidateReportCache(financialYear?: string, ownerId?: string): void {`
);

// ─── 3. Add ownerId to all exported function signatures ─────────────

// Group of functions that take (financialYear: string) as their FIRST parameter
const fyFirstParamFunctions = [
  // Balance & Reports
  ['batchCalculateLedgerBalances', 'financialYear: string,\n  dateTo?: Date,', 'financialYear: string,\n  dateTo?: Date,\n  ownerId?: string,'],
  ['generateTrialBalance', 'financialYear: string,\n  dateTo?: Date,\n  _balanceMap?: Map<string, LedgerBalance>,', 'financialYear: string,\n  dateTo?: Date,\n  _balanceMap?: Map<string, LedgerBalance>,\n  ownerId?: string,'],
  ['generateProfitLoss', 'financialYear: string,\n  dateTo?: Date,\n  _balanceMap?: Map<string, LedgerBalance>,', 'financialYear: string,\n  dateTo?: Date,\n  _balanceMap?: Map<string, LedgerBalance>,\n  ownerId?: string,'],
  ['generateBalanceSheet', 'financialYear: string,\n  dateTo?: Date,\n  _balanceMap?: Map<string, LedgerBalance>,\n  _plResult?: ProfitLossResult,', 'financialYear: string,\n  dateTo?: Date,\n  _balanceMap?: Map<string, LedgerBalance>,\n  _plResult?: ProfitLossResult,\n  ownerId?: string,'],
];

for (const [fn, oldSig, newSig] of fyFirstParamFunctions) {
  code = code.replace(oldSig, newSig);
}

// Functions with simple (financialYear: string) signature
const simpleFyFunctions = [
  'getDayBookLedgerSummary',
  'getCashBankLedgers', 
  'getGroupSummary',
  'getAccountingSummary',
  'exportTallyXML',
  'exportTallyJSON',
  'generateMonthlyPL',
  'seedDefaultGroups',
  'seedGSTLedgers',
  'generateCAAuditReport',
  'getDashboardAnalytics',
  'getBudgetReport',
  'getStockGroups',
  'getStockSummary',
  'getCostCenters',
];

for (const fn of simpleFyFunctions) {
  const regex = new RegExp(`export async function ${fn}\\(financialYear: string\\)`, 'g');
  code = code.replace(regex, `export async function ${fn}(financialYear: string, ownerId?: string)`);
}

// getDayBook with its specific signature
code = code.replace(
  'export async function getDayBook(\n  financialYear: string,\n  date?: Date,\n  dateFrom?: Date,\n  dateTo?: Date,\n)',
  'export async function getDayBook(\n  financialYear: string,\n  date?: Date,\n  dateFrom?: Date,\n  dateTo?: Date,\n  ownerId?: string,\n)'
);

// getReceiptsRegister and getPaymentsRegister
code = code.replace(
  'export async function getReceiptsRegister(financialYear: string, dateFrom?: Date, dateTo?: Date)',
  'export async function getReceiptsRegister(financialYear: string, dateFrom?: Date, dateTo?: Date, ownerId?: string)'
);
code = code.replace(
  'export async function getPaymentsRegister(financialYear: string, dateFrom?: Date, dateTo?: Date)',
  'export async function getPaymentsRegister(financialYear: string, dateFrom?: Date, dateTo?: Date, ownerId?: string)'
);

// getLedgerStatement 
code = code.replace(
  `export async function getLedgerStatement(
  ledgerId: string,
  financialYear: string,
  dateFrom?: Date,
  dateTo?: Date,
)`,
  `export async function getLedgerStatement(
  ledgerId: string,
  financialYear: string,
  dateFrom?: Date,
  dateTo?: Date,
  ownerId?: string,
)`
);

// getCashBankSummary
code = code.replace(
  'export async function getCashBankSummary(financialYear: string, _balanceMap?: Map<string, LedgerBalance>)',
  'export async function getCashBankSummary(financialYear: string, _balanceMap?: Map<string, LedgerBalance>, ownerId?: string)'
);

// calculateLedgerBalance
code = code.replace(
  `export async function calculateLedgerBalance(
  ledgerId: string,
  financialYear: string,
  dateFrom?: Date,
  dateTo?: Date,
)`,
  `export async function calculateLedgerBalance(
  ledgerId: string,
  financialYear: string,
  dateFrom?: Date,
  dateTo?: Date,
  ownerId?: string,
)`
);

// getNumberingConfig
code = code.replace(
  'export async function getNumberingConfig(type: VoucherType, financialYear: string)',
  'export async function getNumberingConfig(type: VoucherType, financialYear: string, ownerId?: string)'
);

// generateVoucherNumber
code = code.replace(
  'export async function generateVoucherNumber(type: VoucherType, financialYear: string)',
  'export async function generateVoucherNumber(type: VoucherType, financialYear: string, ownerId?: string)'
);

// getAllNumberingSeries
code = code.replace(
  'export async function getAllNumberingSeries(financialYear: string)',
  'export async function getAllNumberingSeries(financialYear: string, ownerId?: string)'
);

// updateNumberingSeries
code = code.replace(
  `export async function updateNumberingSeries(
  voucherType: VoucherType,
  financialYear: string,`,
  `export async function updateNumberingSeries(
  voucherType: VoucherType,
  financialYear: string,
  ownerId?: string,`
);

// resetNumberingCounter
code = code.replace(
  `export async function resetNumberingCounter(
  voucherType: VoucherType,
  financialYear: string,
  resetTo?: number`,
  `export async function resetNumberingCounter(
  voucherType: VoucherType,
  financialYear: string,
  ownerId?: string,
  resetTo?: number`
);

// createVoucher — add ownerId to the data type
code = code.replace(
  `export async function createVoucher(data: {
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
})`,
  `export async function createVoucher(data: {
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
  ownerId?: string;
})`
);

// importTallyXML
code = code.replace(
  'export async function importTallyXML(xmlContent: string, financialYear: string, createdByUserId?: string)',
  'export async function importTallyXML(xmlContent: string, financialYear: string, createdByUserId?: string, ownerId?: string)'
);

// importTallyJSON
code = code.replace(
  'export async function importTallyJSON(jsonData: any, financialYear: string, createdByUserId?: string)',
  'export async function importTallyJSON(jsonData: any, financialYear: string, createdByUserId?: string, ownerId?: string)'
);

// generateProfitLossForPeriod
code = code.replace(
  `export async function generateProfitLossForPeriod(
  financialYear: string,
  dateFrom: Date,
  dateTo: Date,
)`,
  `export async function generateProfitLossForPeriod(
  financialYear: string,
  dateFrom: Date,
  dateTo: Date,
  ownerId?: string,
)`
);

// carryForwardBalances
code = code.replace(
  `export async function carryForwardBalances(
  currentFY: string,
  nextFY: string,
  nextStartDate: Date,
  nextEndDate: Date,
  createdByUserId?: string,
)`,
  `export async function carryForwardBalances(
  currentFY: string,
  nextFY: string,
  nextStartDate: Date,
  nextEndDate: Date,
  createdByUserId?: string,
  ownerId?: string,
)`
);

// closeFinancialYear
code = code.replace(
  `export async function closeFinancialYear(
  currentFY: string,
  nextFY: string,
  nextStartDate: Date,
  nextEndDate: Date,
  createdByUserId?: string,
)`,
  `export async function closeFinancialYear(
  currentFY: string,
  nextFY: string,
  nextStartDate: Date,
  nextEndDate: Date,
  createdByUserId?: string,
  ownerId?: string,
)`
);

// getVouchersWithBills
code = code.replace(
  'export async function getVouchersWithBills(financialYear: string, month?: number, year?: number)',
  'export async function getVouchersWithBills(financialYear: string, month?: number, year?: number, ownerId?: string)'
);

// Outstanding reports
code = code.replace(
  'export async function getOutstandingReceivables(financialYear: string, asOnDate?: Date)',
  'export async function getOutstandingReceivables(financialYear: string, asOnDate?: Date, ownerId?: string)'
);
code = code.replace(
  'export async function getOutstandingPayables(financialYear: string, asOnDate?: Date)',
  'export async function getOutstandingPayables(financialYear: string, asOnDate?: Date, ownerId?: string)'
);

// Internal getOutstandingReport
code = code.replace(
  `async function getOutstandingReport(
  reportType: 'receivable' | 'payable',
  financialYear: string,
  asOnDate?: Date
)`,
  `async function getOutstandingReport(
  reportType: 'receivable' | 'payable',
  financialYear: string,
  asOnDate?: Date,
  ownerId?: string,
)`
);

// getOutstandingByParty
code = code.replace(
  `export async function getOutstandingByParty(
  ledgerId: string,
  financialYear: string,
  asOnDate?: Date
)`,
  `export async function getOutstandingByParty(
  ledgerId: string,
  financialYear: string,
  asOnDate?: Date,
  ownerId?: string,
)`
);

// getBankReconciliation
code = code.replace(
  `export async function getBankReconciliation(
  bankLedgerId: string,
  financialYear: string,
  asOnDate?: Date,
)`,
  `export async function getBankReconciliation(
  bankLedgerId: string,
  financialYear: string,
  asOnDate?: Date,
  ownerId?: string,
)`
);

// GST reports
code = code.replace(
  `export async function generateGSTR1(
  financialYear: string,
  month?: number,  // 1-12, if undefined = full year
  year?: number,
)`,
  `export async function generateGSTR1(
  financialYear: string,
  month?: number,  // 1-12, if undefined = full year
  year?: number,
  ownerId?: string,
)`
);
code = code.replace(
  `export async function generateGSTR3B(
  financialYear: string,
  month?: number,
  year?: number,
)`,
  `export async function generateGSTR3B(
  financialYear: string,
  month?: number,
  year?: number,
  ownerId?: string,
)`
);

// Comparative reports
code = code.replace(
  `export async function generateComparativePL(
  currentFY: string,
  previousFY: string,
)`,
  `export async function generateComparativePL(
  currentFY: string,
  previousFY: string,
  ownerId?: string,
)`
);
code = code.replace(
  `export async function generateComparativeBS(
  currentFY: string,
  previousFY: string,
)`,
  `export async function generateComparativeBS(
  currentFY: string,
  previousFY: string,
  ownerId?: string,
)`
);

// importBankStatement
code = code.replace(
  `export async function importBankStatement(
  text: string,
  bankLedgerName: string,
  financialYear: string,
  fromTxn: number,
  toTxn: number,
  openingBalance: number,
  createdByUserId?: string,
)`,
  `export async function importBankStatement(
  text: string,
  bankLedgerName: string,
  financialYear: string,
  fromTxn: number,
  toTxn: number,
  openingBalance: number,
  createdByUserId?: string,
  ownerId?: string,
)`
);

// importExcelTally
code = code.replace(
  'export async function importExcelTally(buffer: Buffer, financialYear: string, createdByUserId?: string)',
  'export async function importExcelTally(buffer: Buffer, financialYear: string, createdByUserId?: string, ownerId?: string)'
);

// Audit trail
code = code.replace(
  `export async function getAuditTrail(
  financialYear: string,
  opts?: { entityType?: string; entityId?: string; userId?: string; limit?: number; skip?: number }
)`,
  `export async function getAuditTrail(
  financialYear: string,
  opts?: { entityType?: string; entityId?: string; userId?: string; limit?: number; skip?: number },
  ownerId?: string,
)`
);

// Cost center functions
code = code.replace(
  'export async function getCostCenterReport(financialYear: string)',
  'export async function getCostCenterReport(financialYear: string, ownerId?: string)'
);

// TDS functions 
code = code.replace(
  `export async function getTdsEntries(
  financialYear: string,
  opts?: { section?: string; quarter?: string; deducteeId?: string }
)`,
  `export async function getTdsEntries(
  financialYear: string,
  opts?: { section?: string; quarter?: string; deducteeId?: string },
  ownerId?: string,
)`
);
code = code.replace(
  'export async function getTdsSummary(financialYear: string)',
  'export async function getTdsSummary(financialYear: string, ownerId?: string)'
);

// Stock functions
code = code.replace(
  'export async function getStockItems(financialYear: string, opts?: { groupId?: string })',
  'export async function getStockItems(financialYear: string, opts?: { groupId?: string }, ownerId?: string)'
);
code = code.replace(
  'export async function getStockTransactions(financialYear: string, opts?: { stockItemId?: string })',
  'export async function getStockTransactions(financialYear: string, opts?: { stockItemId?: string }, ownerId?: string)'
);

// ─── 4. Scope all { financialYear, ... } query patterns ─────────────

// Pattern: .find({ financialYear, ... })
// We'll handle the most common inline query patterns

// batchCalculateLedgerBalances — scope both find and aggregate
code = code.replace(
  `const ledgers = await AccLedger.find({ financialYear, isActive: true }).lean() as any[];

  // 2. Single aggregate: sum debit/credit per ledger across all vouchers
  const matchQuery: any = { financialYear, isReversed: { $ne: true } };`,
  `const ledgers = await AccLedger.find(scopeQuery({ financialYear, isActive: true }, ownerId)).lean() as any[];

  // 2. Single aggregate: sum debit/credit per ledger across all vouchers
  const matchQuery: any = scopeQuery({ financialYear, isReversed: { $ne: true } }, ownerId);`
);

// calculateLedgerBalance — scope the aggregate match
code = code.replace(
  `  const matchQuery: any = {
    financialYear,
    'entries.ledgerId': objectLedgerId,
    isReversed: { $ne: true },
  };`,
  `  const matchQuery: any = scopeQuery({
    financialYear,
    'entries.ledgerId': objectLedgerId,
    isReversed: { $ne: true },
  }, ownerId);`
);

// getDayBook — scope query
code = code.replace(
  `  const query: any = { financialYear, isReversed: { $ne: true } };

  if (date) {`,
  `  const query: any = scopeQuery({ financialYear, isReversed: { $ne: true } }, ownerId);

  if (date) {`
);

// getDayBookLedgerSummary — scope
code = code.replace(
  'const ledgers = await AccLedger.find({ financialYear }).sort({ group: 1, subGroup: 1, name: 1 }).lean();',
  'const ledgers = await AccLedger.find(scopeQuery({ financialYear }, ownerId)).sort({ group: 1, subGroup: 1, name: 1 }).lean();'
);

// getReceiptsRegister — scope
code = code.replace(
  `  const query: any = { financialYear, type: 'RECEIPT', isReversed: { $ne: true } };
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo) query.date.$lte = dateTo;
  }
  return AccVoucher.find(query).sort({ date: -1 }).lean();
}

export async function getPaymentsRegister`,
  `  const query: any = scopeQuery({ financialYear, type: 'RECEIPT', isReversed: { $ne: true } }, ownerId);
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo) query.date.$lte = dateTo;
  }
  return AccVoucher.find(query).sort({ date: -1 }).lean();
}

export async function getPaymentsRegister`
);

// getPaymentsRegister — scope
code = code.replace(
  `  const query: any = { financialYear, type: 'PAYMENT', isReversed: { $ne: true } };
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo) query.date.$lte = dateTo;
  }
  return AccVoucher.find(query).sort({ date: -1 }).lean();
}

// ─── Ledger Statement`,
  `  const query: any = scopeQuery({ financialYear, type: 'PAYMENT', isReversed: { $ne: true } }, ownerId);
  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo) query.date.$lte = dateTo;
  }
  return AccVoucher.find(query).sort({ date: -1 }).lean();
}

// ─── Ledger Statement`
);

// getLedgerStatement — scope
code = code.replace(
  `  const query: any = {
    financialYear,
    'entries.ledgerId': l._id,
    isReversed: { $ne: true },
  };`,
  `  const query: any = scopeQuery({
    financialYear,
    'entries.ledgerId': l._id,
    isReversed: { $ne: true },
  }, ownerId);`
);

// getCashBankLedgers — scope
code = code.replace(
  `  const ledgers = await AccLedger.find({
    financialYear,
    isActive: { $ne: false },
    subGroup: { $in: ['Cash-in-Hand', 'Bank Accounts', 'Bank OCC A/c', 'Bank OD A/c'] },
  }).select`,
  `  const ledgers = await AccLedger.find(scopeQuery({
    financialYear,
    isActive: { $ne: false },
    subGroup: { $in: ['Cash-in-Hand', 'Bank Accounts', 'Bank OCC A/c', 'Bank OD A/c'] },
  }, ownerId)).select`
);

// getAccountingSummary — scope all queries
code = code.replace(
  `    AccLedger.countDocuments({ financialYear, isActive: true }),
    AccVoucher.countDocuments({ financialYear, isReversed: { $ne: true } }),
    AccFinancialYear.findOne({ code: financialYear }).lean(),`,
  `    AccLedger.countDocuments(scopeQuery({ financialYear, isActive: true }, ownerId)),
    AccVoucher.countDocuments(scopeQuery({ financialYear, isReversed: { $ne: true } }, ownerId)),
    AccFinancialYear.findOne(scopeQuery({ code: financialYear }, ownerId)).lean(),`
);

code = code.replace(
  `    { $match: { financialYear, isReversed: { $ne: true } } },
    { $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$totalDebit' } } },
    { $sort: { _id: 1 } },
  ]);

  // Calculate opening balance`,
  `    { $match: scopeQuery({ financialYear, isReversed: { $ne: true } }, ownerId) },
    { $group: { _id: '$type', count: { $sum: 1 }, totalAmount: { $sum: '$totalDebit' } } },
    { $sort: { _id: 1 } },
  ]);

  // Calculate opening balance`
);

// getAccountingSummary — bank aggregate
code = code.replace(
  `        { $match: { financialYear, isReversed: { $ne: true } } },
        { $unwind: '$entries' },
        { $match: { 'entries.ledgerId': { $in: bankLedgerIds } } },`,
  `        { $match: scopeQuery({ financialYear, isReversed: { $ne: true } }, ownerId) },
        { $unwind: '$entries' },
        { $match: { 'entries.ledgerId': { $in: bankLedgerIds } } },`
);

// exportTallyXML — scope queries
code = code.replace(
  `  const fyDoc = await AccFinancialYear.findOne({ code: financialYear }).lean() as any;
  const companyName = fyDoc?.companyName || 'Swar Yoga';
  const fyStart = fyDoc?.startDate ? new Date(fyDoc.startDate) : new Date();
  const fyEnd = fyDoc?.endDate ? new Date(fyDoc.endDate) : new Date();

  const groups = await AccGroup.find({ financialYear }).lean() as any[];
  const ledgers = await AccLedger.find({ financialYear, isActive: true }).lean() as any[];
  const vouchers = await AccVoucher.find({ financialYear, isReversed: { $ne: true } }).sort({ date: 1 }).lean() as any[];`,
  `  const fyDoc = await AccFinancialYear.findOne(scopeQuery({ code: financialYear }, ownerId)).lean() as any;
  const companyName = fyDoc?.companyName || 'Swar Yoga';
  const fyStart = fyDoc?.startDate ? new Date(fyDoc.startDate) : new Date();
  const fyEnd = fyDoc?.endDate ? new Date(fyDoc.endDate) : new Date();

  const groups = await AccGroup.find(scopeQuery({ financialYear }, ownerId)).lean() as any[];
  const ledgers = await AccLedger.find(scopeQuery({ financialYear, isActive: true }, ownerId)).lean() as any[];
  const vouchers = await AccVoucher.find(scopeQuery({ financialYear, isReversed: { $ne: true } }, ownerId)).sort({ date: 1 }).lean() as any[];`
);

// exportTallyJSON — scope queries
code = code.replace(
  `  const fyDoc = await AccFinancialYear.findOne({ code: financialYear }).lean() as any;
  const groups = await AccGroup.find({ financialYear }).lean();
  const ledgers = await AccLedger.find({ financialYear, isActive: true }).lean();
  const vouchers = await AccVoucher.find({ financialYear, isReversed: { $ne: true } }).sort({ date: 1 }).lean();`,
  `  const fyDoc = await AccFinancialYear.findOne(scopeQuery({ code: financialYear }, ownerId)).lean() as any;
  const groups = await AccGroup.find(scopeQuery({ financialYear }, ownerId)).lean();
  const ledgers = await AccLedger.find(scopeQuery({ financialYear, isActive: true }, ownerId)).lean();
  const vouchers = await AccVoucher.find(scopeQuery({ financialYear, isReversed: { $ne: true } }, ownerId)).sort({ date: 1 }).lean();`
);

// generateMonthlyPL — scope queries
code = code.replace(
  `  const plLedgers = await AccLedger.find({
    financialYear,
    group: { $in: ['INCOME', 'EXPENSE'] },
    isActive: true,
  }).lean() as any[];`,
  `  const plLedgers = await AccLedger.find(scopeQuery({
    financialYear,
    group: { $in: ['INCOME', 'EXPENSE'] },
    isActive: true,
  }, ownerId)).lean() as any[];`
);

code = code.replace(
  `      $match: {
        financialYear,
        isReversed: { $ne: true },
        date: { $gte: fyStart, $lte: fyEnd },
      },`,
  `      $match: scopeQuery({
        financialYear,
        isReversed: { $ne: true },
        date: { $gte: fyStart, $lte: fyEnd },
      }, ownerId),`
);

// generateProfitLossForPeriod — scope queries
code = code.replace(
  `  const incomeLedgers = await AccLedger.find({ financialYear, group: 'INCOME', isActive: true }).lean();
  const expenseLedgers = await AccLedger.find({ financialYear, group: 'EXPENSE', isActive: true }).lean();`,
  `  const incomeLedgers = await AccLedger.find(scopeQuery({ financialYear, group: 'INCOME', isActive: true }, ownerId)).lean();
  const expenseLedgers = await AccLedger.find(scopeQuery({ financialYear, group: 'EXPENSE', isActive: true }, ownerId)).lean();`
);

// generateProfitLossForPeriod — scope aggregate $match (income)
code = code.replace(
  `        $match: {
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
    const amount = credit - debit; // income nature = credit`,
  `        $match: scopeQuery({
          financialYear,
          isReversed: { $ne: true },
          'entries.ledgerId': ledger._id,
          date: { $gte: dateFrom, $lte: dateTo },
        }, ownerId),
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
    const amount = credit - debit; // income nature = credit`
);

// generateProfitLossForPeriod — scope aggregate $match (expense)
code = code.replace(
  `        $match: {
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
    const amount = debit - credit; // expense nature = debit`,
  `        $match: scopeQuery({
          financialYear,
          isReversed: { $ne: true },
          'entries.ledgerId': ledger._id,
          date: { $gte: dateFrom, $lte: dateTo },
        }, ownerId),
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
    const amount = debit - credit; // expense nature = debit`
);

// createVoucher — scope FY check and add ownerId to create payload
code = code.replace(
  `  const fyDoc = await AccFinancialYear.findOne({ code: data.financialYear }).lean() as any;
  if (fyDoc?.isClosed) {
    throw new Error(\`FY \${data.financialYear} is locked. No new vouchers can be created in a closed financial year.\`);
  }`,
  `  const fyDoc = await AccFinancialYear.findOne(scopeQuery({ code: data.financialYear }, data.ownerId)).lean() as any;
  if (fyDoc?.isClosed) {
    throw new Error(\`FY \${data.financialYear} is locked. No new vouchers can be created in a closed financial year.\`);
  }`
);

code = code.replace(
  `  const voucherNumber = await generateVoucherNumber(data.type, data.financialYear);

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
  });`,
  `  const voucherNumber = await generateVoucherNumber(data.type, data.financialYear, data.ownerId);

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
    ...(data.ownerId && { ownerId: data.ownerId }),
  });`
);

// generateCAAuditReport — scope all queries
code = code.replace(
  `  const fyDoc = await AccFinancialYear.findOne({ code: financialYear }).lean() as any;
  const companyName = fyDoc?.companyName || 'Swar Yoga';

  // Generate all reports sharing a single balanceMap (2 DB queries replaces 70+)
  const balanceMap = await batchCalculateLedgerBalances(financialYear);`,
  `  const fyDoc = await AccFinancialYear.findOne(scopeQuery({ code: financialYear }, ownerId)).lean() as any;
  const companyName = fyDoc?.companyName || 'Swar Yoga';

  // Generate all reports sharing a single balanceMap (2 DB queries replaces 70+)
  const balanceMap = await batchCalculateLedgerBalances(financialYear, undefined, ownerId);`
);

// generateCAAuditReport — scope the parallel report calls
code = code.replace(
  `    generateTrialBalance(financialYear, undefined, balanceMap),
    generateProfitLoss(financialYear, undefined, balanceMap),
    generateMonthlyPL(financialYear),`,
  `    generateTrialBalance(financialYear, undefined, balanceMap, ownerId),
    generateProfitLoss(financialYear, undefined, balanceMap, ownerId),
    generateMonthlyPL(financialYear, ownerId),`
);

code = code.replace(
  `  const bs = await generateBalanceSheet(financialYear, undefined, balanceMap, pl);
  const cashBank = await getCashBankSummary(financialYear, balanceMap);

  // Inline voucher breakdown instead of calling getAccountingSummary (avoids duplicate batchCalculateLedgerBalances)
  const voucherBreakdown = await AccVoucher.aggregate([
    { $match: { financialYear, isReversed: { $ne: true } } },`,
  `  const bs = await generateBalanceSheet(financialYear, undefined, balanceMap, pl, ownerId);
  const cashBank = await getCashBankSummary(financialYear, balanceMap, ownerId);

  // Inline voucher breakdown instead of calling getAccountingSummary (avoids duplicate batchCalculateLedgerBalances)
  const voucherBreakdown = await AccVoucher.aggregate([
    { $match: scopeQuery({ financialYear, isReversed: { $ne: true } }, ownerId) },`
);

// generateCAAuditReport — bills audit
code = code.replace(
  `  const allVouchers = await AccVoucher.find({
    financialYear,
    isReversed: { $ne: true },
    type: { $in: ['PAYMENT', 'PURCHASE', 'RECEIPT', 'SALES', 'EXPENSE'] },
  }).lean() as any[];`,
  `  const allVouchers = await AccVoucher.find(scopeQuery({
    financialYear,
    isReversed: { $ne: true },
    type: { $in: ['PAYMENT', 'PURCHASE', 'RECEIPT', 'SALES', 'EXPENSE'] },
  }, ownerId)).lean() as any[];`
);

// getVouchersWithBills — scope
code = code.replace(
  `  const query: any = { financialYear, isReversed: { $ne: true }, receiptFileUrl: { $exists: true, $ne: '' } };`,
  `  const query: any = scopeQuery({ financialYear, isReversed: { $ne: true }, receiptFileUrl: { $exists: true, $ne: '' } }, ownerId);`
);

// seedDefaultGroups — scope and add ownerId
code = code.replace(
  `    const exists = await AccGroup.findOne({ name: g.name, financialYear });
    if (!exists) {
      await AccGroup.create({
        ...g,
        financialYear,
        isSystemDefault: true,
      });`,
  `    const exists = await AccGroup.findOne(scopeQuery({ name: g.name, financialYear }, ownerId));
    if (!exists) {
      await AccGroup.create({
        ...g,
        financialYear,
        isSystemDefault: true,
        ...(ownerId && { ownerId }),
      });`
);

// seedGSTLedgers — scope
code = code.replace(
  `    const exists = await AccLedger.findOne({ name: ledger.name, financialYear });
    if (!exists) {
      await AccLedger.create({ ...ledger, financialYear });`,
  `    const exists = await AccLedger.findOne(scopeQuery({ name: ledger.name, financialYear }, ownerId));
    if (!exists) {
      await AccLedger.create({ ...ledger, financialYear, ...(ownerId && { ownerId }) });`
);

// getDashboardAnalytics — scope queries
code = code.replace(
  `  const ledgers = await AccLedger.find({ financialYear, isActive: true }).lean() as any[];
  const vouchers = await AccVoucher.find({ financialYear, isReversed: { $ne: true } }).sort({ date: 1 }).lean() as any[];

  const nameToGroup`,
  `  const ledgers = await AccLedger.find(scopeQuery({ financialYear, isActive: true }, ownerId)).lean() as any[];
  const vouchers = await AccVoucher.find(scopeQuery({ financialYear, isReversed: { $ne: true } }, ownerId)).sort({ date: 1 }).lean() as any[];

  const nameToGroup`
);

// getCostCenters — scope
code = code.replace(
  'return AccCostCenter.find({ financialYear }).sort({ category: 1, name: 1 }).lean();',
  'return AccCostCenter.find(scopeQuery({ financialYear }, ownerId)).sort({ category: 1, name: 1 }).lean();'
);

// getCostCenterReport — scope
code = code.replace(
  `  const centers = await AccCostCenter.find({ financialYear, isActive: true }).lean() as any[];
  const vouchers = await AccVoucher.find({ financialYear, isReversed: { $ne: true } }).lean() as any[];`,
  `  const centers = await AccCostCenter.find(scopeQuery({ financialYear, isActive: true }, ownerId)).lean() as any[];
  const vouchers = await AccVoucher.find(scopeQuery({ financialYear, isReversed: { $ne: true } }, ownerId)).lean() as any[];`
);

// getTdsEntries — scope
code = code.replace(
  `  const filter: any = { financialYear, isActive: true };
  if (opts?.section) filter.section = opts.section;
  if (opts?.quarter) filter.quarter = opts.quarter;
  if (opts?.deducteeId) filter.deducteeId = opts.deducteeId;
  return AccTdsEntry.find(filter).sort({ date: -1 }).lean();`,
  `  const filter: any = scopeQuery({ financialYear, isActive: true }, ownerId);
  if (opts?.section) filter.section = opts.section;
  if (opts?.quarter) filter.quarter = opts.quarter;
  if (opts?.deducteeId) filter.deducteeId = opts.deducteeId;
  return AccTdsEntry.find(filter).sort({ date: -1 }).lean();`
);

// getTdsSummary — scope
code = code.replace(
  `  const entries = await AccTdsEntry.find({ financialYear, isActive: true }).lean() as any[];`,
  `  const entries = await AccTdsEntry.find(scopeQuery({ financialYear, isActive: true }, ownerId)).lean() as any[];`
);

// getStockGroups — scope
code = code.replace(
  `return AccStockGroup.find({ financialYear, isActive: true }).sort({ name: 1 }).lean();`,
  `return AccStockGroup.find(scopeQuery({ financialYear, isActive: true }, ownerId)).sort({ name: 1 }).lean();`
);

// getStockItems — scope
code = code.replace(
  `  const filter: any = { financialYear, isActive: true };
  if (opts?.groupId) filter.stockGroupId = opts.groupId;
  return AccStockItem.find(filter).sort({ name: 1 }).lean();`,
  `  const filter: any = scopeQuery({ financialYear, isActive: true }, ownerId);
  if (opts?.groupId) filter.stockGroupId = opts.groupId;
  return AccStockItem.find(filter).sort({ name: 1 }).lean();`
);

// getStockTransactions — scope
code = code.replace(
  `  const filter: any = { financialYear };
  if (opts?.stockItemId) filter.stockItemId = opts.stockItemId;
  return AccStockTxn.find(filter).sort({ date: -1 }).lean();`,
  `  const filter: any = scopeQuery({ financialYear }, ownerId);
  if (opts?.stockItemId) filter.stockItemId = opts.stockItemId;
  return AccStockTxn.find(filter).sort({ date: -1 }).lean();`
);

// getStockSummary — scope
code = code.replace(
  `  const items = await AccStockItem.find({ financialYear, isActive: true }).lean() as any[];
  const txns = await AccStockTxn.find({ financialYear }).lean() as any[];`,
  `  const items = await AccStockItem.find(scopeQuery({ financialYear, isActive: true }, ownerId)).lean() as any[];
  const txns = await AccStockTxn.find(scopeQuery({ financialYear }, ownerId)).lean() as any[];`
);

// getBudgetReport — scope
code = code.replace(
  `  const ledgers = await AccLedger.find({
    financialYear,
    budgetAmount: { $exists: true, $gt: 0 },
  }).lean() as any[];`,
  `  const ledgers = await AccLedger.find(scopeQuery({
    financialYear,
    budgetAmount: { $exists: true, $gt: 0 },
  }, ownerId)).lean() as any[];`
);

// getOutstandingReport — scope party ledger queries
code = code.replace(
  `  const partyLedgers = await AccLedger.find({
    financialYear,
    $or: [
      { subGroup: { $in: subGroupPatterns } },
      // Also catch ledgers that might be named differently but are in the right group
      { group: natureFilter, subGroup: { $regex: reportType === 'receivable' ? /debtor|receivable/i : /creditor|payable/i } },
    ],
  }).lean() as any[];`,
  `  const partyLedgers = await AccLedger.find(scopeQuery({
    financialYear,
    $or: [
      { subGroup: { $in: subGroupPatterns } },
      // Also catch ledgers that might be named differently but are in the right group
      { group: natureFilter, subGroup: { $regex: reportType === 'receivable' ? /debtor|receivable/i : /creditor|payable/i } },
    ],
  }, ownerId)).lean() as any[];`
);

// getOutstandingReport — scope the voucher date filter
code = code.replace(
  `  const dateFilter: any = { financialYear, isReversed: { $ne: true } };
  if (asOnDate) {
    dateFilter.date = { $lte: asOnDate };
  }
  dateFilter['entries.ledgerId'] = { $in: partyLedgerIds };`,
  `  const dateFilter: any = scopeQuery({ financialYear, isReversed: { $ne: true } }, ownerId);
  if (asOnDate) {
    dateFilter.date = { $lte: asOnDate };
  }
  dateFilter['entries.ledgerId'] = { $in: partyLedgerIds };`
);

// getOutstandingReceivables/Payables — pass ownerId to internal call
code = code.replace(
  `  return getOutstandingReport('receivable', financialYear, asOnDate);
}

/**
 * Get Outstanding Payables`,
  `  return getOutstandingReport('receivable', financialYear, asOnDate, ownerId);
}

/**
 * Get Outstanding Payables`
);
code = code.replace(
  `  return getOutstandingReport('payable', financialYear, asOnDate);`,
  `  return getOutstandingReport('payable', financialYear, asOnDate, ownerId);`
);

// getOutstandingByParty — pass ownerId
code = code.replace(
  `  const report = await getOutstandingReport(
    isReceivable ? 'receivable' : 'payable',
    financialYear,
    asOnDate
  );`,
  `  const report = await getOutstandingReport(
    isReceivable ? 'receivable' : 'payable',
    financialYear,
    asOnDate,
    ownerId,
  );`
);

// getBankReconciliation — scope
// Use a simpler approach: find the voucher query in getBankReconciliation and wrap it
code = code.replace(
  "  }).sort({ date: 1 }).lean() as any[];\n\n  const unreconciled",
  "  }, ownerId)).sort({ date: 1 }).lean() as any[];\n\n  const unreconciled"
);
// Scope the find query object start
code = code.replace(
  "  const vouchers = await AccVoucher.find({\n    financialYear,\n    'entries.ledgerName': { $regex:",
  "  const vouchers = await AccVoucher.find(scopeQuery({\n    financialYear,\n    'entries.ledgerName': { $regex:"
);

// generateGSTR1 — scope
code = code.replace(
  `  const vouchers = await AccVoucher.find({
    financialYear,
    type: { $in: ['SALES', 'DEBIT_NOTE', 'CREDIT_NOTE'] },
    date: { $gte: dateFrom, $lte: dateTo },
  }).sort({ date: 1 }).lean() as any[];

  // Build ledger map for GST info
  const ledgers = await AccLedger.find({ financialYear }).lean() as any[];`,
  `  const vouchers = await AccVoucher.find(scopeQuery({
    financialYear,
    type: { $in: ['SALES', 'DEBIT_NOTE', 'CREDIT_NOTE'] },
    date: { $gte: dateFrom, $lte: dateTo },
  }, ownerId)).sort({ date: 1 }).lean() as any[];

  // Build ledger map for GST info
  const ledgers = await AccLedger.find(scopeQuery({ financialYear }, ownerId)).lean() as any[];`
);

// generateGSTR3B — scope
code = code.replace(
  `  const ledgers = await AccLedger.find({ financialYear }).lean() as any[];
  const ledgerMap = new Map<string, any>();
  for (const l of ledgers) ledgerMap.set(l.name.toLowerCase(), l);

  // Outward supplies (Sales + Debit Notes)
  const salesVouchers = await AccVoucher.find({
    financialYear,
    type: { $in: ['SALES', 'DEBIT_NOTE'] },
    date: { $gte: dateFrom, $lte: dateTo },
  }).lean() as any[];`,
  `  const ledgers = await AccLedger.find(scopeQuery({ financialYear }, ownerId)).lean() as any[];
  const ledgerMap = new Map<string, any>();
  for (const l of ledgers) ledgerMap.set(l.name.toLowerCase(), l);

  // Outward supplies (Sales + Debit Notes)
  const salesVouchers = await AccVoucher.find(scopeQuery({
    financialYear,
    type: { $in: ['SALES', 'DEBIT_NOTE'] },
    date: { $gte: dateFrom, $lte: dateTo },
  }, ownerId)).lean() as any[];`
);

code = code.replace(
  `  const purchaseVouchers = await AccVoucher.find({
    financialYear,
    type: { $in: ['PURCHASE', 'CREDIT_NOTE'] },
    date: { $gte: dateFrom, $lte: dateTo },
  }).lean() as any[];`,
  `  const purchaseVouchers = await AccVoucher.find(scopeQuery({
    financialYear,
    type: { $in: ['PURCHASE', 'CREDIT_NOTE'] },
    date: { $gte: dateFrom, $lte: dateTo },
  }, ownerId)).lean() as any[];`
);

// getAuditTrail — scope
code = code.replace(
  `  const filter: any = { financialYear };
  if (opts?.entityType) filter.entityType = opts.entityType;
  if (opts?.entityId) filter.entityId = opts.entityId;
  if (opts?.userId) filter.userId = opts.userId;

  const total = await AccAuditTrail.countDocuments(filter);`,
  `  const filter: any = scopeQuery({ financialYear }, ownerId);
  if (opts?.entityType) filter.entityType = opts.entityType;
  if (opts?.entityId) filter.entityId = opts.entityId;
  if (opts?.userId) filter.userId = opts.userId;

  const total = await AccAuditTrail.countDocuments(filter);`
);

// ─── 5. Pass ownerId through internal function calls ─────────────────

// getAccountingSummary — pass ownerId to internal reports
code = code.replace(
  `  const balanceMap = await batchCalculateLedgerBalances(financialYear);

  // Generate P&L first, then pass it to BS to avoid double computation
  const pl = await generateProfitLoss(financialYear, undefined, balanceMap);
  const bs = await generateBalanceSheet(financialYear, undefined, balanceMap, pl);
  const cashBank = await getCashBankSummary(financialYear, balanceMap);`,
  `  const balanceMap = await batchCalculateLedgerBalances(financialYear, undefined, ownerId);

  // Generate P&L first, then pass it to BS to avoid double computation
  const pl = await generateProfitLoss(financialYear, undefined, balanceMap, ownerId);
  const bs = await generateBalanceSheet(financialYear, undefined, balanceMap, pl, ownerId);
  const cashBank = await getCashBankSummary(financialYear, balanceMap, ownerId);`
);

// generateTrialBalance — pass ownerId to batchCalc
code = code.replace(
  `  const balanceMap = _balanceMap || await batchCalculateLedgerBalances(financialYear, dateTo);

  const rows: TrialBalanceRow[] = [];`,
  `  const balanceMap = _balanceMap || await batchCalculateLedgerBalances(financialYear, dateTo, ownerId);

  const rows: TrialBalanceRow[] = [];`
);

// generateProfitLoss — pass ownerId to batchCalc
code = code.replace(
  `  const balanceMap = _balanceMap || await batchCalculateLedgerBalances(financialYear, dateTo);

  const income: ReportRow[] = [];`,
  `  const balanceMap = _balanceMap || await batchCalculateLedgerBalances(financialYear, dateTo, ownerId);

  const income: ReportRow[] = [];`
);

// generateBalanceSheet — pass ownerId through
code = code.replace(
  `  const balanceMap = _balanceMap || await batchCalculateLedgerBalances(financialYear, dateTo);

  const assets: ReportRow[] = [];`,
  `  const balanceMap = _balanceMap || await batchCalculateLedgerBalances(financialYear, dateTo, ownerId);

  const assets: ReportRow[] = [];`
);

code = code.replace(
  `  const pl = _plResult || await generateProfitLoss(financialYear, dateTo, balanceMap);

  totalAssets`,
  `  const pl = _plResult || await generateProfitLoss(financialYear, dateTo, balanceMap, ownerId);

  totalAssets`
);

// getCashBankSummary — pass ownerId to batchCalc
code = code.replace(
  `  const balanceMap = _balanceMap || await batchCalculateLedgerBalances(financialYear);

  const cashBankSubGroups`,
  `  const balanceMap = _balanceMap || await batchCalculateLedgerBalances(financialYear, undefined, ownerId);

  const cashBankSubGroups`
);

// getGroupSummary — pass ownerId to batchCalc
code = code.replace(
  'const balanceMap = await batchCalculateLedgerBalances(financialYear);',
  'const balanceMap = await batchCalculateLedgerBalances(financialYear, undefined, ownerId);'
);

// generateComparativePL — pass ownerId
code = code.replace(
  `  const currentPL = await generateProfitLoss(currentFY);
  const previousPL = await generateProfitLoss(previousFY);`,
  `  const currentPL = await generateProfitLoss(currentFY, undefined, undefined, ownerId);
  const previousPL = await generateProfitLoss(previousFY, undefined, undefined, ownerId);`
);

// generateComparativeBS — pass ownerId
code = code.replace(
  `  const currentBS = await generateBalanceSheet(currentFY);
  const previousBS = await generateBalanceSheet(previousFY);`,
  `  const currentBS = await generateBalanceSheet(currentFY, undefined, undefined, undefined, ownerId);
  const previousBS = await generateBalanceSheet(previousFY, undefined, undefined, undefined, ownerId);`
);

// carryForwardBalances — pass ownerId through internal calls
code = code.replace(
  `  const balanceMap = await batchCalculateLedgerBalances(currentFY);
  const pl = await generateProfitLoss(currentFY, undefined, balanceMap);

  // 2. Create next FY if not exists
  let nextFYDoc = await AccFinancialYear.findOne({ code: nextFY });`,
  `  const balanceMap = await batchCalculateLedgerBalances(currentFY, undefined, ownerId);
  const pl = await generateProfitLoss(currentFY, undefined, balanceMap, ownerId);

  // 2. Create next FY if not exists
  let nextFYDoc = await AccFinancialYear.findOne(scopeQuery({ code: nextFY }, ownerId));`
);

// carryForwardBalances — add ownerId to FY create
code = code.replace(
  `    nextFYDoc = await AccFinancialYear.create({
      code: nextFY,
      label: \`FY \${nextFY}\`,
      startDate: nextStartDate,
      endDate: nextEndDate,
      isCurrent: true,
      companyName: 'Upamnyu International Education Pvt. Ltd.',
      createdByUserId,
    });`,
  `    nextFYDoc = await AccFinancialYear.create({
      code: nextFY,
      label: \`FY \${nextFY}\`,
      startDate: nextStartDate,
      endDate: nextEndDate,
      isCurrent: true,
      companyName: 'Upamnyu International Education Pvt. Ltd.',
      createdByUserId,
      ...(ownerId && { ownerId }),
    });`
);

// carryForwardBalances — scope seedDefaultGroups call
code = code.replace(
  '  await seedDefaultGroups(nextFY);',
  '  await seedDefaultGroups(nextFY, ownerId);'
);

// carryForwardBalances — scope ledger find and create in carry forward
code = code.replace(
  `      const existing = await AccLedger.findOne({ name: bal.ledgerName, financialYear: nextFY });`,
  `      const existing = await AccLedger.findOne(scopeQuery({ name: bal.ledgerName, financialYear: nextFY }, ownerId));`
);

// closeFinancialYear — pass ownerId
code = code.replace(
  `  const result = await carryForwardBalances(currentFY, nextFY, nextStartDate, nextEndDate, createdByUserId);

  // 2. Mark current FY as closed (locked)
  await AccFinancialYear.updateOne({ code: currentFY }, { isClosed: true, isCurrent: false });`,
  `  const result = await carryForwardBalances(currentFY, nextFY, nextStartDate, nextEndDate, createdByUserId, ownerId);

  // 2. Mark current FY as closed (locked)
  await AccFinancialYear.updateOne(scopeQuery({ code: currentFY }, ownerId), { isClosed: true, isCurrent: false });`
);

// getBudgetReport — pass ownerId through batchCalcBalance
code = code.replace(
  `  const balanceMap = await batchCalculateLedgerBalances(financialYear);

  const rows: BudgetRow[] = [];`,
  `  const balanceMap = await batchCalculateLedgerBalances(financialYear, undefined, ownerId);

  const rows: BudgetRow[] = [];`
);

// Numbering functions — scope queries
code = code.replace(
  `  let config = await AccVoucherNumbering.findOne({ voucherType: type, financialYear }).lean();
  if (!config) {
    // Auto-create default config on first access
    config = await AccVoucherNumbering.create({
      voucherType: type,
      financialYear,`,
  `  let config = await AccVoucherNumbering.findOne(scopeQuery({ voucherType: type, financialYear }, ownerId)).lean();
  if (!config) {
    // Auto-create default config on first access
    config = await AccVoucherNumbering.create({
      voucherType: type,
      financialYear,
      ...(ownerId && { ownerId }),`
);

// generateVoucherNumber — scope
code = code.replace(
  `  // Ensure config exists
  await getNumberingConfig(type, financialYear);

  // Atomic increment
  const updated = await AccVoucherNumbering.findOneAndUpdate(
    { voucherType: type, financialYear },`,
  `  // Ensure config exists
  await getNumberingConfig(type, financialYear, ownerId);

  // Atomic increment
  const updated = await AccVoucherNumbering.findOneAndUpdate(
    scopeQuery({ voucherType: type, financialYear }, ownerId),`
);

// getAllNumberingSeries — scope
code = code.replace(
  `  const existing = await AccVoucherNumbering.find({ financialYear }).lean() as any[];
  const existingTypes = new Set(existing.map((c: any) => c.voucherType));

  // Create missing configs
  const missing = allTypes.filter(t => !existingTypes.has(t));
  for (const t of missing) {
    await getNumberingConfig(t, financialYear);
  }

  // Re-fetch all
  const configs = await AccVoucherNumbering.find({ financialYear }).sort`,
  `  const existing = await AccVoucherNumbering.find(scopeQuery({ financialYear }, ownerId)).lean() as any[];
  const existingTypes = new Set(existing.map((c: any) => c.voucherType));

  // Create missing configs
  const missing = allTypes.filter(t => !existingTypes.has(t));
  for (const t of missing) {
    await getNumberingConfig(t, financialYear, ownerId);
  }

  // Re-fetch all
  const configs = await AccVoucherNumbering.find(scopeQuery({ financialYear }, ownerId)).sort`
);

// updateNumberingSeries — scope
code = code.replace(
  `  await getNumberingConfig(voucherType, financialYear); // ensure exists

  const updated = await AccVoucherNumbering.findOneAndUpdate(
    { voucherType, financialYear },`,
  `  await getNumberingConfig(voucherType, financialYear, ownerId); // ensure exists

  const updated = await AccVoucherNumbering.findOneAndUpdate(
    scopeQuery({ voucherType, financialYear }, ownerId),`
);

// resetNumberingCounter — scope
code = code.replace(
  `  await AccVoucherNumbering.updateOne(
    { voucherType, financialYear },`,
  `  await AccVoucherNumbering.updateOne(
    scopeQuery({ voucherType, financialYear }, ownerId),`
);

// importTallyXML — scope find + add ownerId to creates
code = code.replace(
  `      const existing = await AccGroup.findOne({ name, financialYear });
      if (!existing) {
        await AccGroup.create({
          name,
          nature,
          report: isRevenue || nature === 'INCOME' || nature === 'EXPENSE' ? 'profit_loss' : 'balance_sheet',
          financialYear,
          isSystemDefault: false,
          createdByUserId,
        });`,
  `      const existing = await AccGroup.findOne(scopeQuery({ name, financialYear }, ownerId));
      if (!existing) {
        await AccGroup.create({
          name,
          nature,
          report: isRevenue || nature === 'INCOME' || nature === 'EXPENSE' ? 'profit_loss' : 'balance_sheet',
          financialYear,
          isSystemDefault: false,
          createdByUserId,
          ...(ownerId && { ownerId }),
        });`
);

// importTallyXML — ledger find + create
code = code.replace(
  `      const existing = await AccLedger.findOne({ name, financialYear });
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
        });`,
  `      const existing = await AccLedger.findOne(scopeQuery({ name, financialYear }, ownerId));
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
          ...(ownerId && { ownerId }),
        });`
);

// importTallyXML — refresh ledgers scope  
code = code.replace(
  `  const allLedgers = await AccLedger.find({ financialYear }).lean() as any[];
  for (const l of allLedgers) {
    ledgerNameMap[l.name] = String(l._id);
  }

  // ── Parse & Import Vouchers ──`,
  `  const allLedgers = await AccLedger.find(scopeQuery({ financialYear }, ownerId)).lean() as any[];
  for (const l of allLedgers) {
    ledgerNameMap[l.name] = String(l._id);
  }

  // ── Parse & Import Vouchers ──`
);

// importTallyXML — voucher create — add ownerId
code = code.replace(
  `      const voucherNumber = await generateVoucherNumber(vType, financialYear);
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
      });`,
  `      const voucherNumber = await generateVoucherNumber(vType, financialYear, ownerId);
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
        ...(ownerId && { ownerId }),
      });`
);

// importTallyJSON — scope find + add ownerId to creates
code = code.replace(
  `      const existing = await AccGroup.findOne({ name: g.name, financialYear });
      if (!existing) {
        await AccGroup.create({
          name: g.name,
          nature: g.nature || 'ASSET',
          report: g.report || 'balance_sheet',
          affectsGrossProfit: g.affectsGrossProfit || false,
          financialYear,
          isSystemDefault: false,
          createdByUserId,
        });`,
  `      const existing = await AccGroup.findOne(scopeQuery({ name: g.name, financialYear }, ownerId));
      if (!existing) {
        await AccGroup.create({
          name: g.name,
          nature: g.nature || 'ASSET',
          report: g.report || 'balance_sheet',
          affectsGrossProfit: g.affectsGrossProfit || false,
          financialYear,
          isSystemDefault: false,
          createdByUserId,
          ...(ownerId && { ownerId }),
        });`
);

// importTallyJSON — ledger find + create
code = code.replace(
  `      const existing = await AccLedger.findOne({ name: l.name, financialYear });
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
        });`,
  `      const existing = await AccLedger.findOne(scopeQuery({ name: l.name, financialYear }, ownerId));
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
          ...(ownerId && { ownerId }),
        });`
);

// importTallyJSON — refresh ledgers
code = code.replace(
  `  const allLedgers = await AccLedger.find({ financialYear }).lean() as any[];
  for (const l of allLedgers) ledgerNameMap[l.name] = String(l._id);

  // Import vouchers`,
  `  const allLedgers = await AccLedger.find(scopeQuery({ financialYear }, ownerId)).lean() as any[];
  for (const l of allLedgers) ledgerNameMap[l.name] = String(l._id);

  // Import vouchers`
);

// importTallyJSON — voucher create
code = code.replace(
  `      const voucherNumber = await generateVoucherNumber(v.type || 'JOURNAL', financialYear);
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
      });`,
  `      const voucherNumber = await generateVoucherNumber(v.type || 'JOURNAL', financialYear, ownerId);
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
        ...(ownerId && { ownerId }),
      });`
);

// ─── Write the transformed file ─────────────────────────────────────

fs.writeFileSync(ENGINE_PATH, code, 'utf-8');
console.log('✅ engine.ts transformed with ownerId support');
console.log(`   File size: ${code.length} characters`);
