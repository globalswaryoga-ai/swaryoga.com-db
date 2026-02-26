/**
 * Find all unique expense heads from payment vouchers and check which are missing as ledger accounts
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const b = mongoose.connection.collection('tally_manual_balances');
  const v = mongoose.connection.collection('tally_manual_vouchers');

  // Get existing expense ledgers
  const existing = await b.find({ financialYear: '2024-25', category: 'expense' }).toArray();
  const existingNames = new Set(existing.map(e => e.ledgerName.toLowerCase()));
  
  console.log('── EXISTING EXPENSE LEDGERS ──');
  for (const e of existing) {
    console.log('  ' + (e.parentGroup || '').padEnd(22) + '| ' + e.ledgerName + ' = Rs.' + e.amount);
  }

  // Get all payment vouchers and extract expense categories
  const payments = await v.find({ financialYear: '2024-25', voucherType: 'Payment' }).toArray();
  
  // Extract expense head from narration like "[Dr] TEACHER REMUNERATION | UPI/..."
  const expHeads = {};
  for (const p of payments) {
    const narr = p.narration || '';
    const match = narr.match(/\[Dr\]\s*([^|]+)/);
    let head = match ? match[1].trim() : (p.debitLedger || 'Unknown');
    
    // Normalize common heads
    if (head.startsWith('UPI/') || head.startsWith('SentIMPS') || head.startsWith('PCD/') || head.startsWith('PCI/') || head.startsWith('MB:') || head.startsWith('REV-') || head.startsWith('Chrg:')) {
      // These are raw bank narrations, not categorized
      head = 'UNCATEGORIZED';
    }
    
    if (!expHeads[head]) expHeads[head] = { count: 0, total: 0 };
    expHeads[head].count++;
    expHeads[head].total += p.amount;
  }

  console.log('\n── ALL EXPENSE HEADS FROM PAYMENT VOUCHERS ──');
  const sorted = Object.entries(expHeads).sort((a, b) => b[1].total - a[1].total);
  
  for (const [head, info] of sorted) {
    const inDB = existingNames.has(head.toLowerCase()) ? '✅' : '❌';
    console.log('  ' + inDB + ' ' + head.padEnd(35) + ' | ' + info.count + ' txns | Rs.' + info.total.toLocaleString('en-IN', {minimumFractionDigits: 2}));
  }

  // Map the categorized heads to Tally groups
  console.log('\n── SUGGESTED LEDGER ADDITIONS ──');
  const suggestions = [
    // Already exist:
    // Teacher Remuneration, Office Rent, MacBook EMI, Office Exp, Class Exp, 
    // Facebook Adv, Travelling Exp, Light Bill, Mobile Recharge, Bank Charges
    
    // Need to check what's missing
  ];

  // Get unique categorized heads
  const categorized = sorted.filter(([h]) => h !== 'UNCATEGORIZED');
  console.log('\nCategorized expense heads:');
  for (const [head, info] of categorized) {
    const matched = existing.find(e => e.ledgerName.toLowerCase() === head.toLowerCase());
    if (matched) {
      console.log('  ✅ ' + head + ' → exists as "' + matched.ledgerName + '" (' + matched.parentGroup + ')');
    } else {
      console.log('  ❌ MISSING: ' + head + ' (Rs.' + info.total.toLocaleString('en-IN') + ', ' + info.count + ' txns)');
    }
  }

  await mongoose.disconnect();
}
run();
