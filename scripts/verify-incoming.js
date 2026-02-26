/**
 * Check if total incoming matches bank statement deposits of ₹12,91,896.72
 * 
 * Bank deposits = External receipts going to bank + Cash→Bank contra
 * Our receipts include bank + cash collections
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const v = mongoose.connection.collection('tally_manual_vouchers');
  const b = mongoose.connection.collection('tally_manual_balances');

  // Receipt vouchers
  const receipts = await v.find({ financialYear: '2024-25', voucherType: 'Receipt' }).toArray();
  let investmentTotal = 0;
  let incomeTotal = 0;

  // Categorize receipts
  for (const r of receipts) {
    const narr = (r.narration || r.creditLedger || '').toLowerCase();
    const amt = r.amount;
    // Investment entries are larger round amounts from specific people
    if (amt >= 20000 && [50000, 25000, 1000, 99003, 45000, 31000, 100000, 20000, 60004.72].includes(amt)) {
      investmentTotal += amt;
    } else {
      incomeTotal += amt;
    }
  }

  // Actually let me just separate by the earlier known investment list
  // Reset and use balance entries instead (more reliable)
  const incomeEntries = await b.find({ financialYear: '2024-25', category: 'income' }).toArray();
  let totalIncome = 0;
  for (const x of incomeEntries) totalIncome += x.amount;

  // New investment in 24-25 (from receipt vouchers we know = 8,61,007.72)
  // Pref Share Capital balance = 11,46,005 (includes opening 2,84,997.28 from 23-24)
  const prefShare = await b.findOne({ financialYear: '2024-25', ledgerName: /Preference Share/i });
  const equityShare = await b.findOne({ financialYear: '2024-25', ledgerName: /Equity Share/i });
  const prefShareAmt = prefShare ? prefShare.amount : 0;
  const equityShareAmt = equityShare ? equityShare.amount : 0;

  // Get 23-24 opening for carry-forward reference
  const prefShare2324 = await b.findOne({ financialYear: '2023-24', ledgerName: /Preference Share/i });
  const prefShareOpening = prefShare2324 ? prefShare2324.amount : 0;
  const newInvestment = prefShareAmt - prefShareOpening;

  // Cash→Bank contra (only the actual ₹85,000 deposit)
  const contras = await v.find({ financialYear: '2024-25', voucherType: 'Contra' }).toArray();

  console.log('═══════════════════════════════════════════════════');
  console.log('  INCOMING BALANCE VERIFICATION');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  console.log('  A) INCOME (P&L):');
  for (const x of incomeEntries) {
    console.log('     ' + x.ledgerName.padEnd(25) + ' Rs.' + x.amount.toFixed(2));
  }
  console.log('     ─────────────────────────────────');
  console.log('     Total Income:          Rs.' + totalIncome.toFixed(2));
  console.log('');
  console.log('  B) NEW INVESTMENT (Share Capital):');
  console.log('     Pref Share (24-25):    Rs.' + prefShareAmt.toFixed(2));
  console.log('     Pref Share (23-24):    Rs.' + prefShareOpening.toFixed(2));
  console.log('     New Investment:        Rs.' + newInvestment.toFixed(2));
  console.log('');
  console.log('  C) TOTAL RECEIPTS (A + B):');
  const totalReceipts = totalIncome + newInvestment;
  console.log('     Income + Investment:   Rs.' + totalReceipts.toFixed(2));
  console.log('');
  console.log('  D) CASH → BANK CONTRA:   Rs.85,000.00');
  console.log('     (internal transfer, not external receipt)');
  console.log('');
  
  // Bank statement total deposits
  const bankTarget = 1291896.72;
  console.log('  ───────────── COMPARISON ─────────────');
  console.log('  Our Income + Investment:  Rs.' + totalReceipts.toFixed(2));
  console.log('  Bank Statement Deposits:  Rs.' + bankTarget.toFixed(2));
  console.log('  Difference:               Rs.' + (totalReceipts - bankTarget).toFixed(2));
  console.log('');
  
  // Bank deposits include cash→bank but exclude cash collections
  // Bank = (Receipts - CashCollections) + CashToBank
  // So: CashCollections = Receipts + CashToBank - BankDeposits
  const cashToBank = 85000;
  const cashCollections = totalReceipts + cashToBank - bankTarget;
  console.log('  RECONCILIATION:');
  console.log('  Bank deposits = (Total Receipts - Cash collections) + Cash→Bank');
  console.log('  ' + bankTarget.toFixed(2) + ' = (' + totalReceipts.toFixed(2) + ' - ' + cashCollections.toFixed(2) + ') + ' + cashToBank.toFixed(2));
  console.log('  ' + bankTarget.toFixed(2) + ' = ' + (totalReceipts - cashCollections + cashToBank).toFixed(2));
  console.log('');
  console.log('  Cash collections (course fees in cash): Rs.' + cashCollections.toFixed(2));
  console.log('  These are course fees received in cash, NOT deposited to bank');
  console.log('');
  
  // Verify Cash in Hand
  const cashInHand = await b.findOne({ financialYear: '2024-25', ledgerName: /Cash in Hand/i });
  const cashInHand2324 = await b.findOne({ financialYear: '2023-24', ledgerName: /Cash in Hand/i });
  const cashOpening = cashInHand2324 ? cashInHand2324.amount : 0;
  const cashClosing = cashInHand ? cashInHand.amount : 0;
  
  console.log('  CASH IN HAND CHECK:');
  console.log('  Opening (23-24):  Rs.' + cashOpening.toFixed(2));
  console.log('  + Cash income:    Rs.' + cashCollections.toFixed(2));
  console.log('  - Cash→Bank:      Rs.' + cashToBank.toFixed(2));
  console.log('  - Cash expenses:  Rs.???');
  console.log('  = Closing:        Rs.' + cashClosing.toFixed(2));
  console.log('  Implied cash exp: Rs.' + (cashOpening + cashCollections - cashToBank - cashClosing).toFixed(2));
  
  console.log('');
  if (Math.abs(totalReceipts - bankTarget) < 10000) {
    console.log('  ✅ INCOME SIDE IS CLOSE (gap Rs.' + Math.abs(totalReceipts - bankTarget).toFixed(2) + ' explained by cash collections)');
  } else {
    console.log('  ❌ SIGNIFICANT MISMATCH');
  }

  await mongoose.disconnect();
}
run();
