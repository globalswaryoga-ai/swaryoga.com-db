const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const col = db.collection('tally_manual_balances');
  const vouchers = db.collection('tally_manual_vouchers');

  const fy = '2024-25';
  const all = await col.find({ financialYear: fy }).sort({ parentGroup: 1, ledgerName: 1 }).toArray();
  const jvs = await vouchers.find({ financialYear: fy }).toArray();

  // Categorize
  const income = all.filter(x => x.category === 'Income');
  const directExp = all.filter(x => x.category === 'Direct Expenses');
  const indirectExp = all.filter(x => x.category === 'Indirect Expenses');
  const assets = all.filter(x => ['Fixed Assets', 'Current Assets', 'Bank Accounts', 'Cash-in-Hand', 'Cash & Cash Equivalents', 'Investments'].includes(x.parentGroup) || x.category === 'asset');
  const liabilities = all.filter(x => ['Share Capital', 'Unsecured Loans', 'Secured Loans', 'Sundry Creditors', 'Current Liabilities', 'Non-Current Liabilities', 'Capital Account', 'Reserves & Surplus'].includes(x.parentGroup) || x.category === 'liability');
  const depreciation = all.filter(x => x.parentGroup === 'Depreciation');

  // Group by parentGroup
  function groupBy(arr) {
    const g = {};
    arr.forEach(x => {
      if (!g[x.parentGroup]) g[x.parentGroup] = [];
      g[x.parentGroup].push(x);
    });
    return g;
  }

  // P&L
  const totalIncome = income.reduce((s, x) => s + x.amount, 0);
  const totalDirect = directExp.reduce((s, x) => s + x.amount, 0);
  const totalIndirect = indirectExp.reduce((s, x) => s + x.amount, 0);
  const totalDep = depreciation.reduce((s, x) => s + x.amount, 0);
  const totalExp = totalDirect + totalIndirect + totalDep;
  const netPL = totalIncome - totalExp;

  // BS
  const totalAssets = assets.reduce((s, x) => s + (x.drCr === 'Dr' ? x.amount : -x.amount), 0);
  const totalLiab = liabilities.reduce((s, x) => s + (x.drCr === 'Cr' ? x.amount : -x.amount), 0);

  // Print
  console.log('='.repeat(80));
  console.log('  UPAMNYU INTERNATIONAL EDUCATION PVT. LTD.');
  console.log('  TALLY PRIME - COMPLETE HEALTH CARD & CA AUDIT REPORT');
  console.log('  Financial Year: 2024-25 (01-Apr-2024 to 31-Mar-2025)');
  console.log('  Generated: ' + new Date().toLocaleString('en-IN'));
  console.log('='.repeat(80));

  // ========== SECTION 1: BALANCE SHEET ==========
  console.log('\n' + '━'.repeat(80));
  console.log('  SECTION 1: BALANCE SHEET (as on 31-Mar-2025)');
  console.log('━'.repeat(80));

  console.log('\n  ── ASSETS ──');
  const assetGroups = groupBy(assets);
  let assetTotal = 0;
  for (const [grp, items] of Object.entries(assetGroups).sort()) {
    const grpTotal = items.reduce((s, x) => s + x.amount, 0);
    assetTotal += grpTotal;
    console.log(`\n  ${grp} (${items.length} items)`.padEnd(50) + `₹${grpTotal.toLocaleString('en-IN')}`);
    items.sort((a, b) => b.amount - a.amount).forEach(x => {
      const line = `    ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`.padStart(15) + `  [${x.drCr}]`;
      console.log(line);
    });
  }
  console.log('\n  ' + '─'.repeat(60));
  console.log(`  TOTAL ASSETS`.padEnd(50) + `₹${assetTotal.toLocaleString('en-IN')}`);

  console.log('\n  ── LIABILITIES & CAPITAL ──');
  const liabGroups = groupBy(liabilities);
  let liabTotal = 0;
  for (const [grp, items] of Object.entries(liabGroups).sort()) {
    const grpTotal = items.reduce((s, x) => s + (x.drCr === 'Cr' ? x.amount : -x.amount), 0);
    liabTotal += grpTotal;
    console.log(`\n  ${grp} (${items.length} items)`.padEnd(50) + `₹${grpTotal.toLocaleString('en-IN')}`);
    items.sort((a, b) => b.amount - a.amount).forEach(x => {
      const sign = x.drCr === 'Dr' ? '-' : '';
      const line = `    ${x.ledgerName}`.padEnd(48) + `${sign}₹${x.amount.toLocaleString('en-IN')}`.padStart(15) + `  [${x.drCr}]`;
      console.log(line);
    });
  }
  console.log('\n  ' + '─'.repeat(60));
  console.log(`  TOTAL LIABILITIES & CAPITAL`.padEnd(50) + `₹${liabTotal.toLocaleString('en-IN')}`);
  console.log('\n  ' + '─'.repeat(60));
  const bsDiff = assetTotal - liabTotal;
  console.log(`  BS DIFFERENCE`.padEnd(50) + `₹${bsDiff.toLocaleString('en-IN')}` + (bsDiff === 0 ? '  ✅ BALANCED' : '  ⚠️  NEEDS FIX'));

  // ========== SECTION 2: PROFIT & LOSS ==========
  console.log('\n\n' + '━'.repeat(80));
  console.log('  SECTION 2: PROFIT & LOSS ACCOUNT (01-Apr-2024 to 31-Mar-2025)');
  console.log('━'.repeat(80));

  console.log('\n  ── INCOME ──');
  income.sort((a, b) => b.amount - a.amount).forEach(x => {
    console.log(`    ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`.padStart(15));
  });
  console.log('  ' + '─'.repeat(60));
  console.log(`  TOTAL INCOME`.padEnd(50) + `₹${totalIncome.toLocaleString('en-IN')}`);

  console.log('\n  ── DIRECT EXPENSES ──');
  if (directExp.length === 0) console.log('    (None)');
  directExp.filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount).forEach(x => {
    console.log(`    ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`.padStart(15));
  });
  console.log(`  Total Direct Expenses`.padEnd(50) + `₹${totalDirect.toLocaleString('en-IN')}`);

  console.log('\n  ── INDIRECT EXPENSES ──');
  indirectExp.filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount).forEach(x => {
    console.log(`    ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`.padStart(15));
  });
  console.log('  ' + '─'.repeat(60));
  console.log(`  Total Indirect Expenses`.padEnd(50) + `₹${totalIndirect.toLocaleString('en-IN')}`);

  console.log('\n  ── DEPRECIATION ──');
  depreciation.sort((a, b) => b.amount - a.amount).forEach(x => {
    console.log(`    ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`.padStart(15));
  });
  console.log('  ' + '─'.repeat(60));
  console.log(`  Total Depreciation`.padEnd(50) + `₹${totalDep.toLocaleString('en-IN')}`);

  console.log('\n  ' + '═'.repeat(60));
  console.log(`  TOTAL EXPENSES (Direct+Indirect+Dep)`.padEnd(50) + `₹${totalExp.toLocaleString('en-IN')}`);
  console.log(`  TOTAL INCOME`.padEnd(50) + `₹${totalIncome.toLocaleString('en-IN')}`);
  console.log('  ' + '─'.repeat(60));
  if (netPL >= 0) {
    console.log(`  NET PROFIT`.padEnd(50) + `₹${netPL.toLocaleString('en-IN')}  ✅`);
  } else {
    console.log(`  NET LOSS`.padEnd(50) + `₹${Math.abs(netPL).toLocaleString('en-IN')}  🔴`);
  }

  // ========== SECTION 3: JOURNAL VOUCHERS ==========
  console.log('\n\n' + '━'.repeat(80));
  console.log('  SECTION 3: JOURNAL VOUCHERS');
  console.log('━'.repeat(80));
  if (jvs.length === 0) {
    console.log('  No journal vouchers found.');
  }
  jvs.forEach((jv, i) => {
    console.log(`\n  JV #${i + 1}: ${jv.voucherType || 'Journal'} | Date: ${jv.date || jv.createdAt}`);
    console.log(`  Narration: ${jv.narration || jv.notes || 'N/A'}`);
    if (jv.entries) {
      jv.entries.forEach(e => {
        console.log(`    ${e.drCr.padEnd(3)} ${e.ledgerName.padEnd(40)} ₹${e.amount.toLocaleString('en-IN')}`);
      });
    }
  });

  // ========== SECTION 4: HEALTH CHECK ==========
  console.log('\n\n' + '━'.repeat(80));
  console.log('  SECTION 4: HEALTH CHECK & AUDIT OBSERVATIONS');
  console.log('━'.repeat(80));

  const issues = [];
  const warnings = [];
  const ok = [];

  // Check BS balance
  if (bsDiff === 0) ok.push('Balance Sheet is balanced (Assets = Liabilities)');
  else issues.push(`BS Difference: ₹${bsDiff.toLocaleString('en-IN')} (Assets ≠ Liabilities)`);

  // Check zero-amount entries
  const zeroEntries = all.filter(x => x.amount === 0 && !['Capital Account'].includes(x.parentGroup));
  if (zeroEntries.length > 0) {
    warnings.push(`${zeroEntries.length} ledgers with ₹0 balance: ${zeroEntries.map(x => x.ledgerName).join(', ')}`);
  }

  // Check negative amounts
  const negative = all.filter(x => x.amount < 0);
  if (negative.length > 0) {
    warnings.push(`${negative.length} negative balances: ${negative.map(x => `${x.ledgerName} (₹${x.amount})`).join(', ')}`);
  }

  // Check duplicate ledger names
  const names = all.map(x => x.ledgerName);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length > 0) {
    issues.push(`Duplicate ledger names: ${[...new Set(dupes)].join(', ')}`);
  }

  // Check high expense items (> 50K)
  const highExp = [...indirectExp, ...directExp].filter(x => x.amount >= 50000).sort((a, b) => b.amount - a.amount);
  if (highExp.length > 0) {
    warnings.push(`${highExp.length} high-value expenses (≥₹50K): ${highExp.map(x => `${x.ledgerName} ₹${x.amount.toLocaleString('en-IN')}`).join(', ')}`);
  }

  // Check Reserves & Surplus (P&L Account)
  const plAccount = all.find(x => x.ledgerName === 'Profit & Loss Account' || x.ledgerName === 'P&L Account');
  if (plAccount) {
    ok.push(`P&L Account (Reserves): ₹${plAccount.amount.toLocaleString('en-IN')} [${plAccount.drCr}]`);
  }

  // Check total entries count
  ok.push(`Total entries: ${all.length}`);
  ok.push(`Journal vouchers: ${jvs.length}`);

  // Income ratio
  const expRatio = totalExp > 0 ? (totalExp / totalIncome * 100).toFixed(1) : 0;
  if (expRatio > 150) {
    warnings.push(`Expense-to-Income ratio: ${expRatio}% (expenses are ${expRatio}% of income)`);
  }

  // Print health
  console.log('\n  ✅ PASSED:');
  ok.forEach(x => console.log(`    • ${x}`));
  
  if (warnings.length > 0) {
    console.log('\n  ⚠️  WARNINGS:');
    warnings.forEach(x => console.log(`    • ${x}`));
  }
  
  if (issues.length > 0) {
    console.log('\n  🔴 ISSUES:');
    issues.forEach(x => console.log(`    • ${x}`));
  }

  // ========== SECTION 5: CA AUDIT REPORT ==========
  console.log('\n\n' + '━'.repeat(80));
  console.log('  SECTION 5: CA AUDIT REPORT - NOTES TO ACCOUNTS');
  console.log('  UPAMNYU INTERNATIONAL EDUCATION PVT. LTD.');
  console.log('  For the FY ended 31st March 2025');
  console.log('━'.repeat(80));

  // Note 1: Share Capital
  const shareCap = all.filter(x => x.parentGroup === 'Share Capital');
  console.log('\n  Note 1: SHARE CAPITAL');
  shareCap.forEach(x => console.log(`    ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`));
  console.log(`    Total`.padEnd(48) + `₹${shareCap.reduce((s, x) => s + x.amount, 0).toLocaleString('en-IN')}`);

  // Note 2: Reserves & Surplus
  const reserves = all.filter(x => x.parentGroup === 'Reserves & Surplus');
  console.log('\n  Note 2: RESERVES & SURPLUS');
  reserves.forEach(x => {
    const sign = x.drCr === 'Dr' ? '(' : '';
    const end = x.drCr === 'Dr' ? ')' : '';
    console.log(`    ${x.ledgerName}`.padEnd(48) + `${sign}₹${x.amount.toLocaleString('en-IN')}${end}`);
  });

  // Note 3: Unsecured Loans
  const unsec = all.filter(x => x.parentGroup === 'Unsecured Loans');
  console.log('\n  Note 3: UNSECURED LOANS');
  unsec.forEach(x => console.log(`    ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`));
  console.log(`    Total`.padEnd(48) + `₹${unsec.reduce((s, x) => s + x.amount, 0).toLocaleString('en-IN')}`);

  // Note 4: Current Liabilities
  const currLiab = all.filter(x => ['Current Liabilities', 'Sundry Creditors', 'Non-Current Liabilities'].includes(x.parentGroup));
  console.log('\n  Note 4: CURRENT & NON-CURRENT LIABILITIES');
  const clGroups = groupBy(currLiab);
  for (const [grp, items] of Object.entries(clGroups)) {
    console.log(`    ${grp}:`);
    items.forEach(x => {
      const sign = x.drCr === 'Dr' ? '-' : '';
      console.log(`      ${x.ledgerName}`.padEnd(48) + `${sign}₹${x.amount.toLocaleString('en-IN')}`);
    });
  }

  // Note 5: Fixed Assets
  const fa = all.filter(x => x.parentGroup === 'Fixed Assets');
  console.log('\n  Note 5: FIXED ASSETS (Net of Depreciation)');
  fa.sort((a, b) => b.amount - a.amount).forEach(x => {
    console.log(`    ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`);
  });
  console.log(`    Total`.padEnd(48) + `₹${fa.reduce((s, x) => s + x.amount, 0).toLocaleString('en-IN')}`);

  // Note 6: Depreciation
  console.log('\n  Note 6: DEPRECIATION SCHEDULE');
  depreciation.sort((a, b) => b.amount - a.amount).forEach(x => {
    console.log(`    ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`);
  });
  console.log(`    Total`.padEnd(48) + `₹${totalDep.toLocaleString('en-IN')}`);

  // Note 7: Revenue
  console.log('\n  Note 7: REVENUE FROM OPERATIONS');
  income.forEach(x => console.log(`    ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`));
  console.log(`    Total`.padEnd(48) + `₹${totalIncome.toLocaleString('en-IN')}`);

  // Note 8: Expenses
  console.log('\n  Note 8: EXPENSES');
  console.log('    A. Direct Expenses:');
  if (directExp.filter(x => x.amount > 0).length === 0) console.log('       (None)');
  directExp.filter(x => x.amount > 0).forEach(x => console.log(`       ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`));
  console.log('    B. Indirect Expenses:');
  indirectExp.filter(x => x.amount > 0).sort((a, b) => b.amount - a.amount).forEach(x => {
    console.log(`       ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`);
  });

  // Note 9: Cash & Bank
  const bank = all.filter(x => x.parentGroup === 'Bank Accounts');
  const cash = all.filter(x => ['Cash-in-Hand', 'Cash & Cash Equivalents'].includes(x.parentGroup));
  console.log('\n  Note 9: CASH & BANK BALANCES');
  console.log('    Bank Accounts:');
  bank.forEach(x => console.log(`      ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`));
  console.log('    Cash:');
  cash.forEach(x => console.log(`      ${x.ledgerName}`.padEnd(48) + `₹${x.amount.toLocaleString('en-IN')}`));

  // SUMMARY TABLE
  console.log('\n\n' + '━'.repeat(80));
  console.log('  FINAL SUMMARY');
  console.log('━'.repeat(80));
  console.log(`  Total Income`.padEnd(45) + `₹${totalIncome.toLocaleString('en-IN')}`);
  console.log(`  Total Expenses (excl. depreciation)`.padEnd(45) + `₹${(totalDirect + totalIndirect).toLocaleString('en-IN')}`);
  console.log(`  Depreciation`.padEnd(45) + `₹${totalDep.toLocaleString('en-IN')}`);
  console.log(`  Total Expenses (incl. depreciation)`.padEnd(45) + `₹${totalExp.toLocaleString('en-IN')}`);
  console.log('  ' + '─'.repeat(60));
  if (netPL >= 0) {
    console.log(`  NET PROFIT FOR THE YEAR`.padEnd(45) + `₹${netPL.toLocaleString('en-IN')}`);
  } else {
    console.log(`  NET LOSS FOR THE YEAR`.padEnd(45) + `(₹${Math.abs(netPL).toLocaleString('en-IN')})`);
  }
  console.log('  ' + '─'.repeat(60));
  console.log(`  Total Assets`.padEnd(45) + `₹${assetTotal.toLocaleString('en-IN')}`);
  console.log(`  Total Liabilities & Capital`.padEnd(45) + `₹${liabTotal.toLocaleString('en-IN')}`);
  console.log(`  Balance Sheet Difference`.padEnd(45) + `₹${bsDiff.toLocaleString('en-IN')}` + (bsDiff === 0 ? ' ✅' : ' ⚠️'));
  console.log(`  Total Ledger Entries`.padEnd(45) + `${all.length}`);
  console.log(`  Journal Vouchers`.padEnd(45) + `${jvs.length}`);
  console.log('  ' + '─'.repeat(60));

  // All entries dump
  console.log('\n\n' + '━'.repeat(80));
  console.log('  APPENDIX: COMPLETE LEDGER LIST (ALL ENTRIES)');
  console.log('━'.repeat(80));
  console.log('  #'.padEnd(5) + 'Ledger Name'.padEnd(40) + 'Parent Group'.padEnd(25) + 'Category'.padEnd(20) + 'Amount'.padStart(12) + '  Dr/Cr');
  console.log('  ' + '─'.repeat(105));
  all.sort((a, b) => a.parentGroup.localeCompare(b.parentGroup) || a.ledgerName.localeCompare(b.ledgerName));
  all.forEach((x, i) => {
    console.log(`  ${(i + 1).toString().padEnd(4)} ${x.ledgerName.padEnd(39)} ${x.parentGroup.padEnd(24)} ${x.category.padEnd(19)} ₹${x.amount.toLocaleString('en-IN').padStart(11)}  ${x.drCr}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('  END OF REPORT');
  console.log('='.repeat(80));

  await client.close();
}
main().catch(console.error);
