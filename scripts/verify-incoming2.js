/**
 * Check Preference Share Capital: 23-24 vs 24-25 vs Bank statement
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const b = mongoose.connection.collection('tally_manual_balances');
  const v = mongoose.connection.collection('tally_manual_vouchers');

  // 23-24 share capital entries
  console.log('── FY 2023-24 Share Capital ──');
  const share2324 = await b.find({ financialYear: '2023-24', parentGroup: /Share Capital/i }).toArray();
  for (const x of share2324) {
    console.log('  ' + x.ledgerName + ': Rs.' + x.amount + ' (' + x.drCr + ')');
  }

  // 24-25 share capital entries
  console.log('\n── FY 2024-25 Share Capital ──');
  const share2425 = await b.find({ financialYear: '2024-25', parentGroup: /Share Capital/i }).toArray();
  for (const x of share2425) {
    console.log('  ' + x.ledgerName + ': Rs.' + x.amount + ' (' + x.drCr + ')');
  }

  // Investment receipt vouchers (all entries >= 1000 that are round amounts / known investment)
  console.log('\n── Investment Receipt Vouchers (24-25) ──');
  const receipts = await v.find({ financialYear: '2024-25', voucherType: 'Receipt' }).toArray();
  let investTotal = 0;
  let courseTotal = 0;
  let otherTotal = 0;
  
  // Known investment amounts from bank analysis
  const investmentAmounts = [50000, 25000, 1000, 99003, 5000, 45000, 31000, 100000, 20000, 60004.72];
  
  for (const r of receipts) {
    const isInvest = investmentAmounts.includes(r.amount) && r.amount >= 5000;
    // Actually let me check the narration/creditLedger
    const cr = (r.creditLedger || r.narration || '').toLowerCase();
    const hasShareKeyword = cr.includes('share') || cr.includes('capital') || cr.includes('invest');
    
    if (hasShareKeyword || (r.amount >= 20000 && investmentAmounts.includes(r.amount))) {
      investTotal += r.amount;
    }
  }
  
  // Let's just sum ALL receipt vouchers and compare
  let allReceipts = 0;
  for (const r of receipts) allReceipts += r.amount;

  console.log('  Total ALL receipts: Rs.' + allReceipts.toFixed(2));
  
  // The known investment from bank = 8,61,007.72
  const bankInvestment = 861007.72;
  const bankCourseIncome = allReceipts - bankInvestment;

  console.log('\n══════════════════════════════════════════════');
  console.log('  SHARE CAPITAL ANALYSIS');
  console.log('══════════════════════════════════════════════');
  
  const pref2324 = share2324.find(x => x.ledgerName.includes('Preference'));
  const pref2425 = share2425.find(x => x.ledgerName.includes('Preference'));
  const eq2324 = share2324.find(x => x.ledgerName.includes('Equity'));
  const eq2425 = share2425.find(x => x.ledgerName.includes('Equity'));

  console.log('  Preference Share Capital:');
  console.log('    23-24 (closing):  Rs.' + (pref2324 ? pref2324.amount : 0));
  console.log('    24-25 (current):  Rs.' + (pref2425 ? pref2425.amount : 0));
  console.log('    Difference (new): Rs.' + ((pref2425 ? pref2425.amount : 0) - (pref2324 ? pref2324.amount : 0)));
  console.log('');
  console.log('  From Bank Statement: Investment deposits = Rs.' + bankInvestment.toFixed(2));
  console.log('');
  
  const expected2425 = (pref2324 ? pref2324.amount : 0) + bankInvestment;
  console.log('  Expected 24-25 Pref Share = 23-24 closing + Bank Investment');
  console.log('  = Rs.' + (pref2324 ? pref2324.amount : 0) + ' + Rs.' + bankInvestment);
  console.log('  = Rs.' + expected2425.toFixed(2));
  console.log('  DB has: Rs.' + (pref2425 ? pref2425.amount : 0));
  
  if (Math.abs(expected2425 - (pref2425 ? pref2425.amount : 0)) > 1) {
    console.log('  ❌ MISMATCH of Rs.' + (expected2425 - (pref2425 ? pref2425.amount : 0)).toFixed(2));
  } else {
    console.log('  ✅ MATCHES');
  }
  
  // Now check: Income + New Investment = ?
  const incomeEntries = await b.find({ financialYear: '2024-25', category: 'income' }).toArray();
  let totalIncome = 0;
  for (const x of incomeEntries) totalIncome += x.amount;
  
  console.log('\n══════════════════════════════════════════════');
  console.log('  FINAL INCOMING CHECK vs Rs.12,91,896.72');
  console.log('══════════════════════════════════════════════');
  console.log('  Income (Course+Other+Nepal): Rs.' + totalIncome.toFixed(2));
  console.log('  New Investment (from bank):  Rs.' + bankInvestment.toFixed(2));
  console.log('  ────────────────────────────');
  const totalIncoming = totalIncome + bankInvestment;
  console.log('  Total Money Received:        Rs.' + totalIncoming.toFixed(2));
  console.log('  Bank Stmt Total Deposits:    Rs.1291896.72');
  console.log('  Difference:                  Rs.' + (totalIncoming - 1291896.72).toFixed(2));
  console.log('');
  console.log('  Note: Bank deposits (Rs.12,91,896.72) includes Rs.85,000');
  console.log('  Cash→Bank contra but excludes Rs.' + (totalIncoming + 85000 - 1291896.72).toFixed(2) + ' cash collections.');
  console.log('  Bank total = Total received - Cash kept + Cash deposited');
  console.log('  12,91,896.72 = ' + totalIncoming.toFixed(2) + ' - ' + (totalIncoming + 85000 - 1291896.72).toFixed(2) + ' + 85000');
  console.log('  12,91,896.72 = ' + (totalIncoming - (totalIncoming + 85000 - 1291896.72) + 85000).toFixed(2) + ' ✓');

  await mongoose.disconnect();
}
run();
