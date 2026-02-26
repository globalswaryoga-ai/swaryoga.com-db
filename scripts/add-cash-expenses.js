const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const col = db.collection('tally_manual_balances');
  const vouCol = db.collection('tally_manual_vouchers');

  const TOTAL = 260000;

  // Cash expenses allocation
  const cashExpenses = [
    { ledger: 'Miscellaneous Expenses', amount: 100000, group: 'Indirect Expenses' },
    { ledger: 'Vehicle Maintenance', amount: 30000, group: 'Indirect Expenses' },
    { ledger: 'Food & Beverages', amount: 25000, group: 'Direct Expenses' },
    { ledger: 'Travelling Expenses', amount: 25000, group: 'Indirect Expenses' },
    { ledger: 'Workshop Expenses', amount: 25000, group: 'Direct Expenses' },
    { ledger: 'Office Expenses', amount: 20000, group: 'Indirect Expenses' },
    { ledger: 'Class Expenses', amount: 15000, group: 'Indirect Expenses' },
    { ledger: 'Fuel Expenses', amount: 10000, group: 'Indirect Expenses' },
    { ledger: 'Mobile Recharge', amount: 10000, group: 'Indirect Expenses' },
  ];

  const checkTotal = cashExpenses.reduce((s, e) => s + e.amount, 0);
  console.log('=== CASH EXPENSES JOURNAL ENTRY ===');
  console.log('Total: Rs.' + checkTotal + ' (should be Rs.' + TOTAL + ')');
  
  if (checkTotal !== TOTAL) {
    console.log('ERROR: Total mismatch');
    await client.close();
    return;
  }

  // 1. Reduce Cash Account
  const cash = await col.findOne({ financialYear: '2024-25', ledgerName: 'Cash Account' });
  const newCash = cash.amount - TOTAL;
  await col.updateOne({ _id: cash._id }, { $set: { amount: newCash, notes: 'Rs.3,73,886 - Rs.2,60,000 cash expenses = Rs.' + newCash, updatedAt: new Date() } });
  console.log('\nCash Account: Rs.' + cash.amount + ' → Rs.' + newCash);

  // 2. Add to expense accounts
  console.log('\nExpense entries (paid by cash):');
  for (const e of cashExpenses) {
    const existing = await col.findOne({ financialYear: '2024-25', ledgerName: e.ledger });
    if (existing) {
      const newAmt = existing.amount + e.amount;
      await col.updateOne({ _id: existing._id }, { $set: { amount: newAmt, notes: (existing.notes || '') + ' | +Rs.' + e.amount + ' cash expense', updatedAt: new Date() } });
      console.log('  ' + e.ledger.padEnd(30) + ' Rs.' + existing.amount + ' → Rs.' + newAmt + ' (+Rs.' + e.amount + ')');
    } else {
      console.log('  ' + e.ledger + ': NOT FOUND - skipping');
    }
  }

  // 3. Create journal voucher
  await vouCol.insertOne({
    voucherType: 'Journal',
    date: '2025-03-31',
    financialYear: '2024-25',
    narration: 'Cash expenses paid during FY 2024-25',
    entries: [
      { ledgerName: 'Cash Account', drCr: 'Cr', amount: TOTAL },
      ...cashExpenses.map(e => ({ ledgerName: e.ledger, drCr: 'Dr', amount: e.amount }))
    ],
    createdBy: 'cash-expenses-script',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('\nJournal voucher created.');

  // 4. Verify
  const updatedCash = await col.findOne({ financialYear: '2024-25', ledgerName: 'Cash Account' });
  console.log('\nVerification - Cash Account now: Rs.' + updatedCash.amount);

  await client.close();
})();
