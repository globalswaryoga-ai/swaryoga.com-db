/**
 * Transform all 17 Tally API routes to add ownerId support.
 * 
 * Run: node scripts/transform-routes-ownerid.js
 * 
 * For each route:
 * 1. Add import for resolveTallyOwnerId, getTallyOwnerIdForWrite from @/lib/tally/access
 * 2. After auth check, extract ownerId
 * 3. Pass ownerId to all engine function calls
 * 4. Add ownerId to direct DB queries (groups, ledgers, vouchers, setup routes)
 */

const fs = require('fs');
const path = require('path');

const API_BASE = path.join(__dirname, '..', 'app', 'api', 'tally');

function transformFile(relPath, transforms) {
  const filePath = path.join(API_BASE, relPath);
  let code = fs.readFileSync(filePath, 'utf-8');
  let changeCount = 0;
  
  for (const [oldStr, newStr, label] of transforms) {
    if (code.includes(oldStr)) {
      code = code.replace(oldStr, newStr);
      changeCount++;
    } else {
      console.warn(`  ⚠ Pattern not found in ${relPath}: "${label || oldStr.substring(0, 60)}..."`);
    }
  }
  
  fs.writeFileSync(filePath, code, 'utf-8');
  console.log(`  ✅ ${relPath} — ${changeCount} changes`);
}

// ─── 1. analytics/route.ts ──────────────────────────────────────────
console.log('\n1. analytics/route.ts');
transformFile('analytics/route.ts', [
  [
    "import { getDashboardAnalytics } from '@/lib/tally/engine';",
    "import { getDashboardAnalytics } from '@/lib/tally/engine';\nimport { resolveTallyOwnerId } from '@/lib/tally/access';",
    'import'
  ],
  [
    "    const analytics = await getDashboardAnalytics(fy);",
    "    const ownerId = resolveTallyOwnerId(decoded);\n    const analytics = await getDashboardAnalytics(fy, ownerId);",
    'getDashboardAnalytics'
  ],
]);

// ─── 2. audit-trail/route.ts ────────────────────────────────────────
console.log('2. audit-trail/route.ts');
transformFile('audit-trail/route.ts', [
  [
    "import { getAuditTrail } from '@/lib/tally/engine';",
    "import { getAuditTrail } from '@/lib/tally/engine';\nimport { resolveTallyOwnerId } from '@/lib/tally/access';",
    'import'
  ],
  [
    "    const result = await getAuditTrail(fy, { entityType, entityId, limit, skip });",
    "    const ownerId = resolveTallyOwnerId(decoded);\n    const result = await getAuditTrail(fy, { entityType, entityId, limit, skip }, ownerId);",
    'getAuditTrail'
  ],
]);

// ─── 3. bills/route.ts ─────────────────────────────────────────────
console.log('3. bills/route.ts');
transformFile('bills/route.ts', [
  [
    "import { getVouchersWithBills } from '@/lib/tally/engine';",
    "import { getVouchersWithBills } from '@/lib/tally/engine';\nimport { resolveTallyOwnerId } from '@/lib/tally/access';",
    'import'
  ],
  [
    "    const bills = await getVouchersWithBills(fy, month, year);",
    "    const ownerId = resolveTallyOwnerId(decoded);\n    const bills = await getVouchersWithBills(fy, month, year, ownerId);",
    'getVouchersWithBills'
  ],
]);

// ─── 4. cost-centers/route.ts ───────────────────────────────────────
console.log('4. cost-centers/route.ts');
transformFile('cost-centers/route.ts', [
  [
    `import {
  getCostCenters,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  getCostCenterReport,
} from '@/lib/tally/engine';`,
    `import {
  getCostCenters,
  createCostCenter,
  updateCostCenter,
  deleteCostCenter,
  getCostCenterReport,
} from '@/lib/tally/engine';
import { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';`,
    'import'
  ],
  [
    "    const centers = await getCostCenters(fy);",
    "    const ownerId = resolveTallyOwnerId(decoded);\n    const centers = await getCostCenters(fy, ownerId);",
    'getCostCenters'
  ],
  [
    "      const doc = await createCostCenter({ name, category: category || 'department', financialYear, parentId, description, budgetAmount, createdByUserId: (decoded as any).userId });",
    "      const writeOwnerId = getTallyOwnerIdForWrite(decoded);\n      const doc = await createCostCenter({ name, category: category || 'department', financialYear, parentId, description, budgetAmount, createdByUserId: (decoded as any).userId, ownerId: writeOwnerId });",
    'createCostCenter'
  ],
  [
    "      const report = await getCostCenterReport(financialYear);",
    "      const ownerId = resolveTallyOwnerId(decoded);\n      const report = await getCostCenterReport(financialYear, ownerId);",
    'getCostCenterReport'
  ],
]);

// ─── 5. daybook/route.ts ───────────────────────────────────────────
console.log('5. daybook/route.ts');
transformFile('daybook/route.ts', [
  [
    "import { getDayBook, getReceiptsRegister, getPaymentsRegister, getDayBookLedgerSummary, getCashBankLedgers } from '@/lib/tally/engine';",
    "import { getDayBook, getReceiptsRegister, getPaymentsRegister, getDayBookLedgerSummary, getCashBankLedgers } from '@/lib/tally/engine';\nimport { resolveTallyOwnerId } from '@/lib/tally/access';",
    'import'
  ],
  [
    `    // Cash/Bank ledger list (for selector)
    if (register === 'cashbank') {
      const ledgers = await getCashBankLedgers(fy);`,
    `    const ownerId = resolveTallyOwnerId(decoded);

    // Cash/Bank ledger list (for selector)
    if (register === 'cashbank') {
      const ledgers = await getCashBankLedgers(fy, ownerId);`,
    'getCashBankLedgers'
  ],
  [
    `      const receipts = await getReceiptsRegister(
        fy,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined,
      );`,
    `      const receipts = await getReceiptsRegister(
        fy,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined,
        ownerId,
      );`,
    'getReceiptsRegister'
  ],
  [
    `      const payments = await getPaymentsRegister(
        fy,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined,
      );`,
    `      const payments = await getPaymentsRegister(
        fy,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined,
        ownerId,
      );`,
    'getPaymentsRegister'
  ],
  [
    `    const entries = await getDayBook(
      fy,
      date ? new Date(date) : undefined,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );`,
    `    const entries = await getDayBook(
      fy,
      date ? new Date(date) : undefined,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
      ownerId,
    );`,
    'getDayBook'
  ],
  [
    "      ledgerSummary = await getDayBookLedgerSummary(fy);",
    "      ledgerSummary = await getDayBookLedgerSummary(fy, ownerId);",
    'getDayBookLedgerSummary'
  ],
]);

// ─── 6. exchange/route.ts ───────────────────────────────────────────
console.log('6. exchange/route.ts');
transformFile('exchange/route.ts', [
  [
    "import { exportTallyXML, buildTallyXML, importTallyXML, exportTallyJSON, importTallyJSON, importExcelTally, importBankStatement } from '@/lib/tally/engine';",
    "import { exportTallyXML, buildTallyXML, importTallyXML, exportTallyJSON, importTallyJSON, importExcelTally, importBankStatement } from '@/lib/tally/engine';\nimport { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';",
    'import'
  ],
  [
    "      const xml = await exportTallyXML(fy);",
    "    const ownerId = resolveTallyOwnerId(decoded);\n\n      const xml = await exportTallyXML(fy, ownerId);",
    'exportTallyXML'
  ],
  [
    "      const json = await exportTallyJSON(fy);",
    "      const json = await exportTallyJSON(fy, ownerId);",
    'exportTallyJSON'
  ],
  [
    `          const result = await importBankStatement(text, bankName, fy, fromTxn, toTxn, openingBalance, (decoded as any)?.userId);
          return apiSuccess(result);
        } catch (e: any) {
          return apiError('VALIDATION_ERROR', \`Bank statement import failed: \${e.message}\`);
        }
      }

      // PDF Bank Statement`,
    `          const writeOwnerId = getTallyOwnerIdForWrite(decoded);
          const result = await importBankStatement(text, bankName, fy, fromTxn, toTxn, openingBalance, (decoded as any)?.userId, writeOwnerId);
          return apiSuccess(result);
        } catch (e: any) {
          return apiError('VALIDATION_ERROR', \`Bank statement import failed: \${e.message}\`);
        }
      }

      // PDF Bank Statement`,
    'importBankStatement txt'
  ],
  [
    `          const result = await importBankStatement(text, bankName, fy, fromTxn, toTxn, openingBalance, (decoded as any)?.userId);
          return apiSuccess(result);
        } catch (e: any) {
          return apiError('VALIDATION_ERROR', \`PDF bank statement import failed: \${e.message}\`);
        }
      }`,
    `          const writeOwnerId = getTallyOwnerIdForWrite(decoded);
          const result = await importBankStatement(text, bankName, fy, fromTxn, toTxn, openingBalance, (decoded as any)?.userId, writeOwnerId);
          return apiSuccess(result);
        } catch (e: any) {
          return apiError('VALIDATION_ERROR', \`PDF bank statement import failed: \${e.message}\`);
        }
      }`,
    'importBankStatement pdf'
  ],
  [
    "          const result = await importExcelTally(buffer, fy, (decoded as any)?.userId);",
    "          const writeOwnerId = getTallyOwnerIdForWrite(decoded);\n          const result = await importExcelTally(buffer, fy, (decoded as any)?.userId, writeOwnerId);",
    'importExcelTally'
  ],
  [
    "          const result = await importTallyJSON(jsonData, fy, (decoded as any)?.userId);",
    "          const writeOwnerId = getTallyOwnerIdForWrite(decoded);\n          const result = await importTallyJSON(jsonData, fy, (decoded as any)?.userId, writeOwnerId);",
    'importTallyJSON'
  ],
  [
    "    const result = await importTallyXML(xmlContent, fy, (decoded as any)?.userId);",
    "    const writeOwnerId = getTallyOwnerIdForWrite(decoded);\n    const result = await importTallyXML(xmlContent, fy, (decoded as any)?.userId, writeOwnerId);",
    'importTallyXML'
  ],
]);

// ─── 7. groups/route.ts ─────────────────────────────────────────────
console.log('7. groups/route.ts');
transformFile('groups/route.ts', [
  [
    "import { getAccGroup } from '@/lib/schemas/enterpriseSchemas';",
    "import { getAccGroup } from '@/lib/schemas/enterpriseSchemas';\nimport { resolveTallyOwnerId } from '@/lib/tally/access';\nimport { scopeQuery } from '@/lib/tally/access';",
    'import'
  ],
  [
    "    const query: any = { financialYear: fy };\n    if (nature) query.nature = nature;",
    "    const ownerId = resolveTallyOwnerId(decoded);\n    const query: any = ownerId ? { financialYear: fy, ownerId } : { financialYear: fy };\n    if (nature) query.nature = nature;",
    'query'
  ],
]);

// ─── 8. inventory/route.ts ──────────────────────────────────────────
console.log('8. inventory/route.ts');
transformFile('inventory/route.ts', [
  [
    `} from '@/lib/tally/engine';

function getAuth`,
    `} from '@/lib/tally/engine';
import { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';

function getAuth`,
    'import'
  ],
  // GET handler
  [
    `    const type = request.nextUrl.searchParams.get('type') || 'items';

    if (type === 'groups') {
      const groups = await getStockGroups(fy);`,
    `    const ownerId = resolveTallyOwnerId(decoded);
    const type = request.nextUrl.searchParams.get('type') || 'items';

    if (type === 'groups') {
      const groups = await getStockGroups(fy, ownerId);`,
    'getStockGroups'
  ],
  [
    "      const txns = await getStockTransactions(fy, { stockItemId });",
    "      const txns = await getStockTransactions(fy, { stockItemId }, ownerId);",
    'getStockTransactions'
  ],
  [
    `    if (type === 'summary') {
      const summary = await getStockSummary(fy);`,
    `    if (type === 'summary') {
      const summary = await getStockSummary(fy, ownerId);`,
    'getStockSummary GET'
  ],
  [
    "    const items = await getStockItems(fy, { groupId });",
    "    const items = await getStockItems(fy, { groupId }, ownerId);",
    'getStockItems'
  ],
  // POST handler
  [
    `      const doc = await createStockGroup({ name, financialYear, parentId, createdByUserId: (decoded as any).userId });`,
    `      const writeOwnerId = getTallyOwnerIdForWrite(decoded);\n      const doc = await createStockGroup({ name, financialYear, parentId, createdByUserId: (decoded as any).userId, ownerId: writeOwnerId });`,
    'createStockGroup'
  ],
  [
    "      const doc = await createStockItem({ name, financialYear, stockGroupId, stockGroupName, unit, hsnCode, gstRate, openingQty, openingRate, openingValue, sellingPrice, purchasePrice, reorderLevel, godown, createdByUserId: (decoded as any).userId });",
    "      const writeOwnerId = getTallyOwnerIdForWrite(decoded);\n      const doc = await createStockItem({ name, financialYear, stockGroupId, stockGroupName, unit, hsnCode, gstRate, openingQty, openingRate, openingValue, sellingPrice, purchasePrice, reorderLevel, godown, createdByUserId: (decoded as any).userId, ownerId: writeOwnerId });",
    'createStockItem'
  ],
  [
    "      const doc = await createStockTransaction({ stockItemId, stockItemName, txnType, qty, rate: rate || 0, value: value || qty * (rate || 0), date, voucherId, voucherNumber, godownFrom, godownTo, narration, financialYear, createdByUserId: (decoded as any).userId });",
    "      const writeOwnerId = getTallyOwnerIdForWrite(decoded);\n      const doc = await createStockTransaction({ stockItemId, stockItemName, txnType, qty, rate: rate || 0, value: value || qty * (rate || 0), date, voucherId, voucherNumber, godownFrom, godownTo, narration, financialYear, createdByUserId: (decoded as any).userId, ownerId: writeOwnerId });",
    'createStockTransaction'
  ],
  [
    `    if (action === 'summary') {
      const { financialYear } = body;
      if (!financialYear) return apiError('VALIDATION_ERROR', 'financialYear required');
      const summary = await getStockSummary(financialYear);`,
    `    if (action === 'summary') {
      const { financialYear } = body;
      if (!financialYear) return apiError('VALIDATION_ERROR', 'financialYear required');
      const ownerId = resolveTallyOwnerId(decoded);
      const summary = await getStockSummary(financialYear, ownerId);`,
    'getStockSummary POST'
  ],
]);

// ─── 9. ledgers/[id]/statement/route.ts ─────────────────────────────
console.log('9. ledgers/[id]/statement/route.ts');
transformFile('ledgers/[id]/statement/route.ts', [
  [
    "import { getLedgerStatement } from '@/lib/tally/engine';",
    "import { getLedgerStatement } from '@/lib/tally/engine';\nimport { resolveTallyOwnerId } from '@/lib/tally/access';",
    'import'
  ],
  [
    `    const statement = await getLedgerStatement(
      id,
      fy,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );`,
    `    const ownerId = resolveTallyOwnerId(decoded);
    const statement = await getLedgerStatement(
      id,
      fy,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
      ownerId,
    );`,
    'getLedgerStatement'
  ],
]);

// ─── 10. ledgers/route.ts ───────────────────────────────────────────
console.log('10. ledgers/route.ts');
transformFile('ledgers/route.ts', [
  [
    "import { calculateLedgerBalance, invalidateReportCache } from '@/lib/tally/engine';",
    "import { calculateLedgerBalance, invalidateReportCache } from '@/lib/tally/engine';\nimport { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';\nimport { scopeQuery } from '@/lib/tally/access';",
    'import'
  ],
  // GET — scope ledger query
  [
    "    const query: any = { financialYear: fy, isActive: true };\n    if (group) query.group = group;",
    "    const ownerId = resolveTallyOwnerId(decoded);\n    const query: any = ownerId ? { financialYear: fy, isActive: true, ownerId } : { financialYear: fy, isActive: true };\n    if (group) query.group = group;",
    'ledger query'
  ],
  [
    "        const bal = await calculateLedgerBalance(String(l._id), fy);",
    "        const bal = await calculateLedgerBalance(String(l._id), fy, undefined, undefined, ownerId);",
    'calculateLedgerBalance'
  ],
  // POST — scope duplicate check and create
  [
    "    const existing = await AccLedger.findOne({ name: name.trim(), financialYear });",
    "    const writeOwnerId = getTallyOwnerIdForWrite(decoded);\n    const existing = await AccLedger.findOne(writeOwnerId ? { name: name.trim(), financialYear, ownerId: writeOwnerId } : { name: name.trim(), financialYear });",
    'existing check'
  ],
  [
    "      createdByUserId: (decoded as any)?.userId,\n    });",
    "      createdByUserId: (decoded as any)?.userId,\n      ownerId: getTallyOwnerIdForWrite(decoded),\n    });",
    'create ledger'
  ],
]);

// ─── 11. numbering/route.ts ────────────────────────────────────────
console.log('11. numbering/route.ts');
transformFile('numbering/route.ts', [
  [
    `} from '@/lib/tally/engine';

function getAuth`,
    `} from '@/lib/tally/engine';
import { resolveTallyOwnerId } from '@/lib/tally/access';

function getAuth`,
    'import'
  ],
  [
    "    const series = await getAllNumberingSeries(fy);",
    "    const ownerId = resolveTallyOwnerId(decoded);\n    const series = await getAllNumberingSeries(fy, ownerId);",
    'getAllNumberingSeries'
  ],
  [
    "    const result = await updateNumberingSeries(voucherType, financialYear, safeUpdates);",
    "    const ownerId = resolveTallyOwnerId(decoded);\n    const result = await updateNumberingSeries(voucherType, financialYear, ownerId, safeUpdates);",
    'updateNumberingSeries'
  ],
  [
    "      await resetNumberingCounter(voucherType, financialYear, resetTo);",
    "      const ownerId = resolveTallyOwnerId(decoded);\n      await resetNumberingCounter(voucherType, financialYear, ownerId, resetTo);",
    'resetNumberingCounter'
  ],
]);

// ─── 12. reconcile/route.ts ────────────────────────────────────────
console.log('12. reconcile/route.ts');
transformFile('reconcile/route.ts', [
  [
    "import { reconcileVouchers, unreconcileVouchers, setBudget } from '@/lib/tally/engine';",
    "import { reconcileVouchers, unreconcileVouchers, setBudget } from '@/lib/tally/engine';\nimport { resolveTallyOwnerId } from '@/lib/tally/access';",
    'import'
  ],
  [
    `      const result = await reconcileVouchers(
        voucherIds,
        new Date(reconciledDate),
        bankDate ? new Date(bankDate) : undefined,
      );`,
    `      const ownerId = resolveTallyOwnerId(decoded);
      const result = await reconcileVouchers(
        voucherIds,
        new Date(reconciledDate),
        bankDate ? new Date(bankDate) : undefined,
        ownerId,
      );`,
    'reconcileVouchers'
  ],
  [
    "      const result = await unreconcileVouchers(voucherIds);",
    "      const ownerId = resolveTallyOwnerId(decoded);\n      const result = await unreconcileVouchers(voucherIds, ownerId);",
    'unreconcileVouchers'
  ],
  [
    "      const result = await setBudget(ledgerId, Number(budgetAmount));",
    "      const ownerId = resolveTallyOwnerId(decoded);\n      const result = await setBudget(ledgerId, Number(budgetAmount), ownerId);",
    'setBudget'
  ],
]);

// ─── 13. reports/route.ts ──────────────────────────────────────────
console.log('13. reports/route.ts');
transformFile('reports/route.ts', [
  [
    `} from '@/lib/tally/engine';

function getAuth`,
    `} from '@/lib/tally/engine';
import { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';

function getAuth`,
    'import'
  ],
  // Cache key includes ownerId
  [
    `    const cacheKey = \`\${reportType}:\${fy}:\${dateTo?.toISOString() || ''}\`;`,
    `    const ownerId = resolveTallyOwnerId(decoded);
    const cacheKey = \`\${reportType}:\${fy}:\${ownerId || 'all'}:\${dateTo?.toISOString() || ''}\`;`,
    'cacheKey'
  ],
  // All report function calls
  [
    "        const tb = await generateTrialBalance(fy, dateTo);",
    "        const tb = await generateTrialBalance(fy, dateTo, undefined, ownerId);",
    'generateTrialBalance'
  ],
  [
    `        const balanceMap = await batchCalculateLedgerBalances(fy, dateTo);
        const pl = await generateProfitLoss(fy, dateTo, balanceMap);
        result = { reportType: 'Profit & Loss', financialYear: fy, ...pl };`,
    `        const balanceMap = await batchCalculateLedgerBalances(fy, dateTo, ownerId);
        const pl = await generateProfitLoss(fy, dateTo, balanceMap, ownerId);
        result = { reportType: 'Profit & Loss', financialYear: fy, ...pl };`,
    'profit-loss'
  ],
  [
    `        const balanceMap = await batchCalculateLedgerBalances(fy, dateTo);
        const pl = await generateProfitLoss(fy, dateTo, balanceMap);
        const bs = await generateBalanceSheet(fy, dateTo, balanceMap, pl);`,
    `        const balanceMap = await batchCalculateLedgerBalances(fy, dateTo, ownerId);
        const pl = await generateProfitLoss(fy, dateTo, balanceMap, ownerId);
        const bs = await generateBalanceSheet(fy, dateTo, balanceMap, pl, ownerId);`,
    'balance-sheet'
  ],
  [
    "        const monthly = await generateMonthlyPL(fy);",
    "        const monthly = await generateMonthlyPL(fy, ownerId);",
    'monthly-pl'
  ],
  [
    "        const cb = await getCashBankSummary(fy);",
    "        const cb = await getCashBankSummary(fy, undefined, ownerId);",
    'cash-bank'
  ],
  [
    "        const summary = await getAccountingSummary(fy);",
    "        const summary = await getAccountingSummary(fy, ownerId);",
    'summary'
  ],
  [
    "        const audit = await generateCAAuditReport(fy);",
    "        const audit = await generateCAAuditReport(fy, ownerId);",
    'ca-audit'
  ],
  [
    "        const groups = await getGroupSummary(fy);",
    "        const groups = await getGroupSummary(fy, ownerId);",
    'group-summary'
  ],
  [
    "        result = await getOutstandingReceivables(fy, asOn);",
    "        result = await getOutstandingReceivables(fy, asOn, ownerId);",
    'outstanding-receivable'
  ],
  [
    "        result = await getOutstandingPayables(fy, asOn);",
    "        result = await getOutstandingPayables(fy, asOn, ownerId);",
    'outstanding-payable'
  ],
  [
    "        result = await generateGSTR1(fy, gstMonth, gstYear);",
    "        result = await generateGSTR1(fy, gstMonth, gstYear, ownerId);",
    'gstr1'
  ],
  [
    "        result = await generateGSTR3B(fy, g3bMonth, g3bYear);",
    "        result = await generateGSTR3B(fy, g3bMonth, g3bYear, ownerId);",
    'gstr3b'
  ],
  [
    "        result = await generateComparativePL(fy, prevFY);",
    "        result = await generateComparativePL(fy, prevFY, ownerId);",
    'comparative-pl'
  ],
  [
    `      case 'comparative-bs': {
        const prevFY = searchParams.get('prevFY') || '2023-24';
        result = await generateComparativeBS(fy, prevFY);`,
    `      case 'comparative-bs': {
        const prevFY = searchParams.get('prevFY') || '2023-24';
        result = await generateComparativeBS(fy, prevFY, ownerId);`,
    'comparative-bs'
  ],
  [
    "        result = await getBudgetReport(fy);",
    "        result = await getBudgetReport(fy, ownerId);",
    'budget'
  ],
  [
    "          const banks = await getCashBankLedgers(fy);",
    "          const banks = await getCashBankLedgers(fy, ownerId);",
    'bank-recon banks'
  ],
  [
    "          result = await getBankReconciliation(bankId, fy, asOn);",
    "          result = await getBankReconciliation(bankId, fy, asOn, ownerId);",
    'getBankReconciliation'
  ],
  // POST handler — carry-forward + close-year
  [
    `      const result = await carryForwardBalances(
        currentFY,
        nextFY,
        new Date(nextStartDate),
        new Date(nextEndDate),
        (decoded as any)?.userId,
      );`,
    `      const writeOwnerId = getTallyOwnerIdForWrite(decoded);
      const result = await carryForwardBalances(
        currentFY,
        nextFY,
        new Date(nextStartDate),
        new Date(nextEndDate),
        (decoded as any)?.userId,
        writeOwnerId,
      );`,
    'carryForwardBalances'
  ],
  [
    `    const result = await closeFinancialYear(
      currentFY,
      nextFY,
      new Date(nextStartDate),
      new Date(nextEndDate),
      (decoded as any)?.userId,
    );`,
    `    const writeOwnerId = getTallyOwnerIdForWrite(decoded);
    const result = await closeFinancialYear(
      currentFY,
      nextFY,
      new Date(nextStartDate),
      new Date(nextEndDate),
      (decoded as any)?.userId,
      writeOwnerId,
    );`,
    'closeFinancialYear'
  ],
]);

// ─── 14. setup/route.ts ────────────────────────────────────────────
console.log('14. setup/route.ts');
transformFile('setup/route.ts', [
  [
    "import { seedDefaultGroups, seedGSTLedgers } from '@/lib/tally/engine';",
    "import { seedDefaultGroups, seedGSTLedgers } from '@/lib/tally/engine';\nimport { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';\nimport { scopeQuery } from '@/lib/tally/access';",
    'import'
  ],
  // POST — scope FY lookup and create
  [
    "    let fy = await AccFinancialYear.findOne({ code });",
    "    const writeOwnerId = getTallyOwnerIdForWrite(decoded);\n    let fy = await AccFinancialYear.findOne(writeOwnerId ? { code, ownerId: writeOwnerId } : { code });",
    'findOne fy POST'
  ],
  [
    "      await AccFinancialYear.updateMany({}, { isCurrent: false });",
    "      await AccFinancialYear.updateMany(writeOwnerId ? { ownerId: writeOwnerId } : {}, { isCurrent: false });",
    'updateMany'
  ],
  [
    "        createdByUserId: (decoded as any)?.userId,\n      });\n    }\n\n    // Seed default groups\n    const groups = await seedDefaultGroups(code);",
    "        createdByUserId: (decoded as any)?.userId,\n        ownerId: writeOwnerId,\n      });\n    }\n\n    // Seed default groups\n    const groups = await seedDefaultGroups(code, writeOwnerId);",
    'create FY + seed'
  ],
  // GET — scope FY listing
  [
    "    const years = await AccFinancialYear.find().sort({ code: -1 }).lean();",
    "    const ownerId = resolveTallyOwnerId(decoded);\n    const years = await AccFinancialYear.find(ownerId ? { ownerId } : {}).sort({ code: -1 }).lean();",
    'find years'
  ],
  // PATCH — scope GST seeding and profile save
  [
    "      const result = await seedGSTLedgers(fy);",
    "      const writeOwnerId = getTallyOwnerIdForWrite(decoded);\n      const result = await seedGSTLedgers(fy, writeOwnerId);",
    'seedGSTLedgers'
  ],
  [
    "      const updated = await AccFinancialYear.findOneAndUpdate(\n        { code: fy },",
    "      const writeOwnerId2 = getTallyOwnerIdForWrite(decoded);\n      const updated = await AccFinancialYear.findOneAndUpdate(\n        writeOwnerId2 ? { code: fy, ownerId: writeOwnerId2 } : { code: fy },",
    'save-profile'
  ],
  [
    "      const fyDoc = await AccFinancialYear.findOne({ code: fy });\n      if (!fyDoc) return apiError('NOT_FOUND', `FY ${fy} not found`);\n      const newState = !(fyDoc as any).isClosed;\n      await AccFinancialYear.updateOne({ code: fy }, { $set: { isClosed: newState } });",
    "      const writeOwnerId3 = getTallyOwnerIdForWrite(decoded);\n      const fyDoc = await AccFinancialYear.findOne(writeOwnerId3 ? { code: fy, ownerId: writeOwnerId3 } : { code: fy });\n      if (!fyDoc) return apiError('NOT_FOUND', `FY ${fy} not found`);\n      const newState = !(fyDoc as any).isClosed;\n      await AccFinancialYear.updateOne(writeOwnerId3 ? { code: fy, ownerId: writeOwnerId3 } : { code: fy }, { $set: { isClosed: newState } });",
    'toggle-lock'
  ],
]);

// ─── 15. tds/route.ts ──────────────────────────────────────────────
console.log('15. tds/route.ts');
transformFile('tds/route.ts', [
  [
    "import { getTdsEntries, createTdsEntry, updateTdsEntry, getTdsSummary } from '@/lib/tally/engine';",
    "import { getTdsEntries, createTdsEntry, updateTdsEntry, getTdsSummary } from '@/lib/tally/engine';\nimport { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';",
    'import'
  ],
  [
    "    const entries = await getTdsEntries(fy, { section, quarter });",
    "    const ownerId = resolveTallyOwnerId(decoded);\n    const entries = await getTdsEntries(fy, { section, quarter }, ownerId);",
    'getTdsEntries'
  ],
  [
    "      const doc = await createTdsEntry({ deducteeId, deducteeName, deducteePan, section, tdsRate, grossAmount, tdsAmount, netAmount, date, voucherId, voucherNumber, financialYear, quarter, createdByUserId: (decoded as any).userId });",
    "      const writeOwnerId = getTallyOwnerIdForWrite(decoded);\n      const doc = await createTdsEntry({ deducteeId, deducteeName, deducteePan, section, tdsRate, grossAmount, tdsAmount, netAmount, date, voucherId, voucherNumber, financialYear, quarter, createdByUserId: (decoded as any).userId, ownerId: writeOwnerId });",
    'createTdsEntry'
  ],
  [
    `      const summary = await getTdsSummary(financialYear);`,
    `      const ownerId = resolveTallyOwnerId(decoded);\n      const summary = await getTdsSummary(financialYear, ownerId);`,
    'getTdsSummary'
  ],
]);

// ─── 16. vouchers/route.ts ─────────────────────────────────────────
console.log('16. vouchers/route.ts');
transformFile('vouchers/route.ts', [
  [
    "import { createVoucher, validateVoucherEntries, invalidateReportCache, updateVoucher, deleteVoucher, type VoucherType } from '@/lib/tally/engine';",
    "import { createVoucher, validateVoucherEntries, invalidateReportCache, updateVoucher, deleteVoucher, type VoucherType } from '@/lib/tally/engine';\nimport { resolveTallyOwnerId, getTallyOwnerIdForWrite } from '@/lib/tally/access';\nimport { scopeQuery } from '@/lib/tally/access';",
    'import'
  ],
  // GET — scope voucher list query
  [
    "    const query: any = { financialYear: fy, isReversed: { $ne: true } };\n    if (type) query.type = type;",
    "    const ownerId = resolveTallyOwnerId(decoded);\n    const query: any = ownerId ? { financialYear: fy, isReversed: { $ne: true }, ownerId } : { financialYear: fy, isReversed: { $ne: true } };\n    if (type) query.type = type;",
    'voucher list query'
  ],
  // POST — add ownerId to createVoucher
  [
    `    const voucher = await createVoucher({
      date: new Date(date),
      type,
      entries,
      narration,
      financialYear,
      partyLedgerId,
      partyName,
      createdByUserId: (decoded as any)?.userId,
      receiptFileUrl,
      receiptFileName,
    });`,
    `    const writeOwnerId = getTallyOwnerIdForWrite(decoded);
    const voucher = await createVoucher({
      date: new Date(date),
      type,
      entries,
      narration,
      financialYear,
      partyLedgerId,
      partyName,
      createdByUserId: (decoded as any)?.userId,
      receiptFileUrl,
      receiptFileName,
      ownerId: writeOwnerId,
    });`,
    'createVoucher'
  ],
  // PUT — pass ownerId to updateVoucher
  [
    `    const voucher = await updateVoucher(id, {
      date: date ? new Date(date) : undefined,
      type,
      entries,
      narration,
    });`,
    `    const ownerId = resolveTallyOwnerId(decoded);
    const voucher = await updateVoucher(id, {
      date: date ? new Date(date) : undefined,
      type,
      entries,
      narration,
    }, ownerId);`,
    'updateVoucher'
  ],
  // DELETE — pass ownerId to deleteVoucher
  [
    "    const result = await deleteVoucher(id);",
    "    const ownerId = resolveTallyOwnerId(decoded);\n    const result = await deleteVoucher(id, ownerId);",
    'deleteVoucher'
  ],
]);

// ─── 17. year-end/route.ts ─────────────────────────────────────────
console.log('17. year-end/route.ts');
transformFile('year-end/route.ts', [
  [
    "import { closeFinancialYear } from '@/lib/tally/engine';",
    "import { closeFinancialYear } from '@/lib/tally/engine';\nimport { getTallyOwnerIdForWrite } from '@/lib/tally/access';",
    'import'
  ],
  [
    "      const result = await closeFinancialYear(fromFY, toFY, nextStart, nextEnd, (decoded as any).userId);",
    "      const writeOwnerId = getTallyOwnerIdForWrite(decoded);\n      const result = await closeFinancialYear(fromFY, toFY, nextStart, nextEnd, (decoded as any).userId, writeOwnerId);",
    'closeFinancialYear'
  ],
]);

console.log('\n✅ All 17 API routes transformed with ownerId support');
