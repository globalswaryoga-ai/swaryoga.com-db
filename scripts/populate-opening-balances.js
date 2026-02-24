/**
 * Populate FY 2024-25 Opening Balance entries with actual amounts from vouchers
 * 
 * Maps voucher ledgerNames (like "FACEBOOK ADS") to balance ledger names 
 * (like "Advertisement Expenses") and updates the amounts.
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// ── MAPPING: Voucher ledgerName → Balance ledgerName ──
// Payment vouchers → Expense/Asset categories
const PAYMENT_MAP = {
  // Advertisement
  'FACEBOOK ADS':       'Advertisement Expenses',
  'FACEBOOK ADV':       'Advertisement Expenses',
  'GOOGLE ADS':         'Advertisement Expenses',
  'CANVA SUBSCRIPTION': 'Advertisement Expenses',

  // Rent
  'RENT':               'Office Rent',
  'OFFICE RENT':        'Office Rent',

  // Teachers
  'TEACHER REMUNERATION': 'Teachers Fees',
  'PANDURANG':            'Teachers Fees',
  'SHUBHAM':              'Teachers Fees',

  // Office
  'OFFICE EXP':         'Office Expenses',
  'MISCELLANEOUS':      'Office Expenses',
  'UPI PAYMENT':        'Office Expenses',  // catch-all for misc UPI spends

  // Electricity
  'ELECTRICITY':        'Electricity Expenses',
  'LIGHT BILL':         'Electricity Expenses',

  // Internet & Mobile
  'INTERNET / TELECOM': 'Internet & Mobile Expenses',
  'ZOOM SUBSCRIPTION':  'Internet & Mobile Expenses',
  'MOBILE RECHARGE':    'Internet & Mobile Expenses',
  'DOMAIN / GODADDY':   'Internet & Mobile Expenses',

  // Class
  'CLASS EXP':          'Class Expenses',

  // Travel
  'TRAVELLING EXP':     'Travelling Expenses',

  // Printing & Stationery
  'PRINTING & STATIONERY': 'Printing & Stationery',

  // Bank Charges
  'RAZORPAY':           'Bank Charges',

  // Tax
  'TAX / GST':          'SA Tax Paid',

  // Director/Professional payments → Professional Fees
  'MOHAN KALBURGI':     'Professional Fees',
  'UPAMNYU KALBURGI':   'Professional Fees',
  'TURYA MOHAN':        'Professional Fees',
  'DIVIDEND':           'Professional Fees',  // director dividend

  // Capital expenditure → respective asset ledger
  'MOBILE-ONE PLUS':    'Mobile',          // asset
  'MACBOOK EMI':        'Computer',        // asset
};

// Receipt vouchers → Income categories  
// All "Swar Yoga - Month Year" → Course Fees

async function main() {
  const uri = process.env.MONGODB_URI_MAIN;
  if (!uri) { console.error('No MONGODB_URI_MAIN'); process.exit(1); }

  await mongoose.connect(uri, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;

  const FY = '2024-25';

  // ─── 1. Aggregate vouchers by ledgerName ──────────────────────────
  const vouchers = await db.collection('tally_manual_vouchers').aggregate([
    { $match: { financialYear: FY } },
    { $group: { 
      _id: { ledgerName: '$ledgerName', voucherType: '$voucherType' }, 
      total: { $sum: '$amount' }, 
      count: { $sum: 1 } 
    }}
  ]).toArray();

  // ─── 2. Build target amounts ──────────────────────────────────────
  const targetAmounts = {};  // ledgerName → amount

  for (const v of vouchers) {
    const { ledgerName, voucherType } = v._id;

    if (voucherType === 'Contra') continue;  // contra doesn't affect P&L

    if (voucherType === 'Receipt') {
      // All receipts → Course Fees
      targetAmounts['Course Fees'] = (targetAmounts['Course Fees'] || 0) + v.total;
    } else if (voucherType === 'Payment') {
      const mapped = PAYMENT_MAP[ledgerName];
      if (mapped) {
        targetAmounts[mapped] = (targetAmounts[mapped] || 0) + v.total;
      } else {
        console.warn(`  ⚠️  Unmapped payment: ${ledgerName} (₹${v.total.toLocaleString('en-IN')}, ${v.count} txns)`);
      }
    }
  }

  console.log('\n=== Target Amounts to Update ===');
  for (const [name, amt] of Object.entries(targetAmounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${name.padEnd(40)} ₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  }

  // ─── 3. Update balance entries ────────────────────────────────────
  console.log('\n=== Updating Opening Balance Entries ===');
  let updated = 0;
  let notFound = [];

  for (const [ledgerName, amount] of Object.entries(targetAmounts)) {
    const result = await db.collection('tally_manual_balances').updateOne(
      { financialYear: FY, ledgerName },
      { $set: { amount: Math.round(amount * 100) / 100, notes: `Updated from FY ${FY} voucher data` } }
    );
    if (result.matchedCount > 0) {
      console.log(`  ✅ ${ledgerName.padEnd(40)} → ₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
      updated++;
    } else {
      notFound.push({ ledgerName, amount });
      console.log(`  ❌ NOT FOUND: ${ledgerName} (₹${amount.toLocaleString('en-IN')})`);
    }
  }

  // ─── 4. Show Training Expenses (no direct mapping but ₹0) ────────
  // Mark with note that no voucher data exists for these
  const zeroExpenses = await db.collection('tally_manual_balances').find({
    financialYear: FY, category: 'expense', amount: 0
  }).toArray();
  if (zeroExpenses.length > 0) {
    console.log('\n=== Expense Ledgers Still at ₹0 ===');
    for (const e of zeroExpenses) {
      console.log(`  ${e.ledgerName}`);
    }
  }

  // ─── 5. Verify final state ────────────────────────────────────────
  const finalBalances = await db.collection('tally_manual_balances').find({ financialYear: FY })
    .sort({ category: 1, ledgerName: 1 }).toArray();
  
  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║  FINAL BALANCE SHEET — FY 2024-25                                ║');
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  
  let totalDr = 0, totalCr = 0;
  let lastCat = '';
  for (const b of finalBalances) {
    if (b.category !== lastCat) {
      console.log(`║  ── ${b.category.toUpperCase()} ──`.padEnd(68) + '║');
      lastCat = b.category;
    }
    const amt = `₹${(b.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    console.log(`║  ${b.ledgerName.padEnd(40)} ${b.drCr} ${amt.padStart(18)}  ║`);
    if (b.drCr === 'Dr') totalDr += b.amount || 0;
    else totalCr += b.amount || 0;
  }
  console.log('╠═══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Dr: ₹${totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 }).padStart(15)}`.padEnd(68) + '║');
  console.log(`║  Total Cr: ₹${totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2 }).padStart(15)}`.padEnd(68) + '║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝');

  console.log(`\nUpdated ${updated} entries. ${notFound.length} not found.`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
