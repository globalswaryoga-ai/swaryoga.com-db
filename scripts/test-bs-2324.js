// Test the actual engine output for FY 2023-24 BS and P&L
// This calls the engine functions directly like the API does
require('dotenv').config({ path: '.env.local' });

async function main() {
  // We need to use tsx to run TypeScript engine
  // Instead, let's call the local API with a valid token
  const http = require('http');
  
  // First, let's check what the deployed site would show
  // by calling localhost:3000 API (needs auth)
  
  // Actually, let's just simulate what the engine does by querying MongoDB directly
  const { MongoClient, ObjectId } = require('mongodb');
  const client = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = client.db('swaryogaDB');
  
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2023-24', isActive: true }).toArray();
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2023-24' }).toArray();
  
  console.log('=== FY 2023-24 ENGINE SIMULATION ===');
  console.log('Ledgers:', ledgers.length, '| Vouchers:', vouchers.length);
  
  // Simulate calculateLedgerBalance for each ledger
  // With 0 vouchers, closing = opening
  
  // === BALANCE SHEET ===
  console.log('\n=== BALANCE SHEET ===');
  
  const assetLedgers = ledgers.filter(l => l.group === 'ASSET');
  const liabilityLedgers = ledgers.filter(l => l.group === 'LIABILITY');
  const capitalLedgers = ledgers.filter(l => l.group === 'CAPITAL');
  const incomeLedgers = ledgers.filter(l => l.group === 'INCOME');
  const expenseLedgers = ledgers.filter(l => l.group === 'EXPENSE');
  
  // Assets - normal balance is DEBIT
  let totalAssets = 0;
  console.log('\nASSETS:');
  assetLedgers.forEach(l => {
    // With 0 vouchers, closingBalance = openingBalance, closingType = openingType
    const cb = l.openingBalance || 0;
    const cbt = l.openingBalanceType || 'DEBIT';
    
    if (cb > 0.01) {
      // Engine logic: Asset DEBIT = positive, Asset CREDIT (contra) = negative
      const signedAmount = cbt === 'DEBIT' ? cb : -cb;
      totalAssets += signedAmount;
      console.log('  ' + l.name.padEnd(40) + ' Rs ' + cb.toFixed(2).padStart(12) + ' ' + cbt + ' -> signed: ' + signedAmount.toFixed(2));
    }
  });
  console.log('  TOTAL ASSETS: Rs ' + totalAssets.toFixed(2));
  
  // Liabilities - normal balance is CREDIT
  let totalLiabilities = 0;
  console.log('\nLIABILITIES:');
  liabilityLedgers.forEach(l => {
    const cb = l.openingBalance || 0;
    const cbt = l.openingBalanceType || 'CREDIT';
    
    if (cb > 0.01) {
      // Engine logic: Liability CREDIT = positive, Liability DEBIT (contra) = negative
      const signedAmount = cbt === 'CREDIT' ? cb : -cb;
      totalLiabilities += signedAmount;
      console.log('  ' + l.name.padEnd(40) + ' Rs ' + cb.toFixed(2).padStart(12) + ' ' + cbt + ' -> signed: ' + signedAmount.toFixed(2));
    }
  });
  console.log('  TOTAL LIABILITIES: Rs ' + totalLiabilities.toFixed(2));
  
  // Capital - normal balance is CREDIT  
  let totalCapital = 0;
  console.log('\nCAPITAL:');
  capitalLedgers.forEach(l => {
    const cb = l.openingBalance || 0;
    const cbt = l.openingBalanceType || 'CREDIT';
    
    if (cb > 0.01) {
      // Engine logic: Capital CREDIT = positive, Capital DEBIT (contra) = negative
      const signedAmount = cbt === 'CREDIT' ? cb : -cb;
      totalCapital += signedAmount;
      console.log('  ' + l.name.padEnd(40) + ' Rs ' + cb.toFixed(2).padStart(12) + ' ' + cbt + ' -> signed: ' + signedAmount.toFixed(2));
    }
  });
  console.log('  TOTAL CAPITAL: Rs ' + totalCapital.toFixed(2));
  
  // P&L
  let totalIncome = 0;
  console.log('\nINCOME (for P&L):');
  incomeLedgers.forEach(l => {
    // Income normal = CREDIT. amount = credit - debit
    // With 0 vouchers: openingCredit = OB (if CREDIT type), openingDebit = OB (if DEBIT type)
    const ob = l.openingBalance || 0;
    const obt = l.openingBalanceType || 'CREDIT';
    // Income: closingCredit - closingDebit
    const amount = obt === 'CREDIT' ? ob : -ob;
    if (Math.abs(amount) > 0.01) {
      totalIncome += Math.abs(amount);
      console.log('  ' + l.name.padEnd(40) + ' Rs ' + ob.toFixed(2).padStart(12) + ' ' + obt + ' -> amount: ' + Math.abs(amount).toFixed(2));
    }
  });
  console.log('  TOTAL INCOME: Rs ' + totalIncome.toFixed(2));
  
  let totalExpense = 0;
  console.log('\nEXPENSES (for P&L):');
  expenseLedgers.forEach(l => {
    const ob = l.openingBalance || 0;
    const obt = l.openingBalanceType || 'DEBIT';
    const amount = obt === 'DEBIT' ? ob : -ob;
    if (Math.abs(amount) > 0.01) {
      totalExpense += Math.abs(amount);
      console.log('  ' + l.name.padEnd(40) + ' Rs ' + ob.toFixed(2).padStart(12) + ' ' + obt + ' -> amount: ' + Math.abs(amount).toFixed(2));
    }
  });
  console.log('  TOTAL EXPENSES: Rs ' + totalExpense.toFixed(2));
  
  const netProfit = totalIncome - totalExpense;
  console.log('\n  NET P&L: Rs ' + netProfit.toFixed(2) + (netProfit >= 0 ? ' (Profit)' : ' (Loss)'));
  
  // BS equation
  // capitalAdjusted = totalCapital + netProfit
  const capitalAdjusted = totalCapital + netProfit;
  const liabPlusCap = totalLiabilities + capitalAdjusted;
  
  console.log('\n=== BS EQUATION ===');
  console.log('  Total Assets:                Rs ' + totalAssets.toFixed(2));
  console.log('  Total Liabilities:           Rs ' + totalLiabilities.toFixed(2));
  console.log('  Total Capital:               Rs ' + totalCapital.toFixed(2));
  console.log('  Net P&L:                     Rs ' + netProfit.toFixed(2));
  console.log('  Capital Adjusted (Cap+PL):   Rs ' + capitalAdjusted.toFixed(2));
  console.log('  Liab + Cap Adjusted:         Rs ' + liabPlusCap.toFixed(2));
  console.log('  Difference (A - L+C):        Rs ' + (totalAssets - liabPlusCap).toFixed(2));
  console.log('  BALANCED: ' + (Math.abs(totalAssets - liabPlusCap) < 1 ? 'YES' : 'NO'));
  
  // Now check: does the engine have a bug where Reserves & Surplus CREDIT=3771 
  // gets the WRONG auto P&L line added?
  // In closeFinancialYear(), the Reserves & Surplus OB for 2024-25 = 3771 - 48963 = -45192 (DEBIT)
  // But that's 2024-25, not 2023-24
  
  // For 2023-24: Reserves & Surplus = 3771 CREDIT
  // Auto P&L line = "Current Year Loss" = 48963 (as a capital item)
  // But how does the engine add it?
  // Engine code: capital.push({ amount: Math.abs(pl.netProfit) }) <-- always positive
  // capitalAdjusted = totalCapital + pl.netProfit <-- netProfit is NEGATIVE for loss
  // So capitalAdjusted = 613771 + (-48963) = 564808
  // liabPlusCap = 302007 + 564808 = 866815 = totalAssets = 866815 ✅
  
  console.log('\n=== VERIFICATION COMPLETE ===');
  
  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
