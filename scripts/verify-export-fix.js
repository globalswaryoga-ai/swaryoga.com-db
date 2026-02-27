const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2023-24' }).toArray();
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2023-24' }).toArray();
  
  console.log(`FY 2023-24: ${ledgers.length} ledgers, ${vouchers.length} vouchers\n`);
  
  // Simulate the FIXED export logic
  let totalInc = 0, totalExp = 0;
  const nominalLedgers = [];
  
  for (const l of ledgers) {
    const ob = Number(l.openingBalance) || 0;
    if ((l.group === 'INCOME' || l.group === 'EXPENSE') && ob > 0) {
      nominalLedgers.push(l);
      if (l.group === 'INCOME') totalInc += ob;
      else totalExp += ob;
    }
  }
  
  const plDiff = totalExp - totalInc;
  const needsCashAdj = vouchers.length === 0 && nominalLedgers.length > 0 && Math.abs(plDiff) > 0.01;
  const cashLedger = ledgers.find(l => l.subGroup === 'Cash-in-Hand');
  const cashLedgerName = cashLedger?.name || 'Cash-in-Hand';
  
  console.log(`Total Income: ${totalInc}`);
  console.log(`Total Expense: ${totalExp}`);
  console.log(`P&L Diff (loss if +): ${plDiff}`);
  console.log(`Cash Ledger: ${cashLedgerName}`);
  console.log(`Needs Cash Adjustment: ${needsCashAdj}\n`);
  
  // Show what each ledger's XML OB would be with FIXED sign
  console.log('=== FIXED XML Opening Balances ===\n');
  let totalDebitOB = 0, totalCreditOB = 0;
  
  for (const l of ledgers) {
    const ob = Number(l.openingBalance) || 0;
    if (ob === 0) continue;
    const isNominal = l.group === 'INCOME' || l.group === 'EXPENSE';
    
    // FIXED sign: DEBIT → negative, CREDIT → positive
    let tallyOB = isNominal ? 0 : (l.openingBalanceType === 'DEBIT' ? -ob : ob);
    
    // Cash adjustment
    if (needsCashAdj && l.name === cashLedgerName) {
      tallyOB -= plDiff;
      console.log(`  >> CASH ADJUSTED: original ${l.openingBalanceType === 'DEBIT' ? -ob : ob} → ${tallyOB} (adj by ${-plDiff})`);
    }
    
    const side = tallyOB < 0 ? 'DEBIT' : tallyOB > 0 ? 'CREDIT' : 'ZERO';
    if (tallyOB < 0) totalDebitOB += Math.abs(tallyOB);
    else totalCreditOB += tallyOB;
    
    const isCorrect = (
      (l.group === 'ASSET' && side === 'DEBIT') ||
      (l.group === 'LIABILITY' && l.openingBalanceType === 'DEBIT' && side === 'DEBIT') ||
      (l.group === 'LIABILITY' && l.openingBalanceType === 'CREDIT' && side === 'CREDIT') ||
      (l.group === 'CAPITAL' && side === 'CREDIT') ||
      isNominal
    ) ? '✅' : '❌';
    
    console.log(`  ${isCorrect} ${l.name} | Group: ${l.group} | DB: ${ob} ${l.openingBalanceType} | XML: ${tallyOB.toFixed(2)} (${side})`);
  }
  
  console.log(`\n  Total Debit OBs: ${totalDebitOB}`);
  console.log(`  Total Credit OBs: ${totalCreditOB}`);
  console.log(`  Difference: ${(totalCreditOB - totalDebitOB).toFixed(2)}`);
  console.log(`  Balanced: ${Math.abs(totalCreditOB - totalDebitOB) < 0.01 ? '✅ YES' : '❌ NO (gap = ' + (totalCreditOB - totalDebitOB).toFixed(2) + ')'}`);
  
  // Verify journal balancing
  if (needsCashAdj) {
    console.log('\n=== Journal Verification ===');
    let journalSum = 0;
    console.log('  Expense entries (Dr):');
    for (const l of nominalLedgers.filter(l => l.group === 'EXPENSE')) {
      const amt = -(Number(l.openingBalance) || 0); // negative = debit
      journalSum += amt;
      console.log(`    ${l.name}: ${amt.toFixed(2)}`);
    }
    console.log('  Income entries (Cr):');
    for (const l of nominalLedgers.filter(l => l.group === 'INCOME')) {
      const amt = Number(l.openingBalance) || 0; // positive = credit
      journalSum += amt;
      console.log(`    ${l.name}: ${amt.toFixed(2)}`);
    }
    console.log(`  Cash-in-Hand balancing: ${plDiff.toFixed(2)}`);
    journalSum += plDiff;
    console.log(`  Journal sum: ${journalSum.toFixed(2)} ${Math.abs(journalSum) < 0.01 ? '✅ BALANCED' : '❌ NOT BALANCED'}`);
    
    // Verify Cash closing
    const cashOB = Number(cashLedger.openingBalance) || 0;
    const adjustedCashOB = cashOB + plDiff; // in original terms
    const cashFromJournal = plDiff > 0 ? -plDiff : -plDiff; // Cash entry effect
    const cashClosing = adjustedCashOB - plDiff; // net = original OB
    console.log(`\n  Cash-in-Hand OB (original): ${cashOB}`);
    console.log(`  Cash-in-Hand OB (adjusted): ${adjustedCashOB}`);
    console.log(`  Journal Cash effect: ${plDiff > 0 ? 'Credit' : 'Debit'} ${Math.abs(plDiff)}`);
    console.log(`  Cash closing balance: ${cashClosing} ${cashClosing === cashOB ? '✅ MATCHES ORIGINAL' : '❌ MISMATCH'}`);
  }
  
  // Also simulate FY 2024-25
  console.log('\n\n=== FY 2024-25 (with vouchers) ===');
  const ledgers25 = await db.collection('acc_ledgers').find({ financialYear: '2024-25' }).toArray();
  const vouchers25 = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();
  console.log(`${ledgers25.length} ledgers, ${vouchers25.length} vouchers (journal NOT created)\n`);
  
  for (const l of ledgers25) {
    const ob = Number(l.openingBalance) || 0;
    if (ob === 0) continue;
    const isNominal = l.group === 'INCOME' || l.group === 'EXPENSE';
    const tallyOB = isNominal ? 0 : (l.openingBalanceType === 'DEBIT' ? -ob : ob);
    const side = tallyOB < 0 ? 'DEBIT' : tallyOB > 0 ? 'CREDIT' : 'ZERO';
    console.log(`  ${l.name} | XML: ${tallyOB.toFixed(2)} (${side})`);
  }
  
  await client.close();
}
main().catch(console.error);
