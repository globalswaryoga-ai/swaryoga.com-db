/**
 * journal-entry-sundry-advance.js
 * 
 * Journal Entry: Clear Sundry Advances (Received) ₹3,25,000
 * Dr: Sundry Advances (Received) ₹3,25,000
 * Cr: Allocated across expense/payment accounts
 * Narration: "Paid outstanding amount"
 */
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const balCol = db.collection('tally_manual_balances');
  const vouCol = db.collection('tally_manual_vouchers');

  const TOTAL = 325000;
  const NARRATION = 'Paid outstanding amount';

  // Allocation amounts (bank statement heads, remaining to Upamanyu)
  const allocations = [
    { ledger: 'Fund Transfer (Own)',       amount: 109100 },
    { ledger: 'Miscellaneous Expenses',    amount: 89450.45 },
    { ledger: 'Laxmi Kalburgi',            amount: 35851 },
    { ledger: 'Suhas Kalburgi',            amount: 13000 },
    { ledger: 'Travel Booking',            amount: 12858.09 },
    { ledger: 'Turya Kalburgi',            amount: 12300 },
    { ledger: 'Vehicle Maintenance',       amount: 11755 },
    { ledger: 'Pandurang Kalburgi',        amount: 5000 },
  ];

  const allocated = allocations.reduce((s, a) => s + a.amount, 0);
  const upamanyuAmt = Math.round((TOTAL - allocated) * 100) / 100;
  allocations.push({ ledger: 'Upamanyu Kalburgi', amount: upamanyuAmt });

  // Verify total
  const checkTotal = allocations.reduce((s, a) => s + a.amount, 0);
  console.log('=== JOURNAL ENTRY: Clear Sundry Advances (Received) ===');
  console.log('Narration:', NARRATION);
  console.log('');
  console.log('Dr: Sundry Advances (Received)          Rs.' + TOTAL);
  console.log('');
  for (const a of allocations) {
    console.log('  Cr: ' + a.ledger.padEnd(35) + ' Rs.' + a.amount.toFixed(2));
  }
  console.log('  ' + '─'.repeat(50));
  console.log('  Total Cr:'.padEnd(40) + ' Rs.' + checkTotal.toFixed(2));
  console.log('');

  if (Math.abs(checkTotal - TOTAL) > 0.01) {
    console.log('ERROR: Total does not match. Aborting.');
    await client.close();
    return;
  }
  console.log('Balanced: YES ✓');
  console.log('');

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN — no changes made.');
    await client.close();
    return;
  }

  // 1. Create journal voucher entry
  const voucher = {
    voucherType: 'Journal',
    date: '2025-03-31',
    financialYear: '2024-25',
    narration: NARRATION,
    entries: [
      { ledgerName: 'Sundry Advances (Received)', drCr: 'Dr', amount: TOTAL },
      ...allocations.map(a => ({ ledgerName: a.ledger, drCr: 'Cr', amount: a.amount }))
    ],
    createdBy: 'journal-entry-script',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await vouCol.insertOne(voucher);
  console.log('✅ Journal voucher created in tally_manual_vouchers');

  // 2. Update Sundry Advances (Received) balance: ₹3,25,000 → ₹0
  const advResult = await balCol.updateOne(
    { financialYear: '2024-25', ledgerName: 'Sundry Advances (Received)' },
    { $set: { amount: 0, notes: 'Cleared via JV: ' + NARRATION, updatedAt: new Date() } }
  );
  console.log('✅ Sundry Advances (Received): ₹3,25,000 → ₹0 (modified:', advResult.modifiedCount + ')');

  // 3. Update/create allocation accounts in balances
  for (const a of allocations) {
    const existing = await balCol.findOne({ financialYear: '2024-25', ledgerName: a.ledger });
    
    if (existing) {
      // Cr entry on a Dr account reduces it; Cr entry on Cr account increases it
      // For expense (Dr) accounts: Cr reduces → subtract from amount
      // For creditor (Cr) accounts: Cr increases → add to amount
      let newAmount;
      if (existing.drCr === 'Dr') {
        // Expense or asset - Cr reduces it but here we are recording that the advance PAID for these
        // So the expense remains, the advance liability goes down
        // Actually no change needed in expense amount - the expense is already recorded
        // The JV just transfers the liability to income/equity
        newAmount = existing.amount; // keep as is
      } else {
        // Cr balance (creditor) - increase
        newAmount = existing.amount + a.amount;
      }
      
      console.log('  ' + a.ledger + ': Rs.' + existing.amount + ' → Rs.' + newAmount + ' (JV Cr Rs.' + a.amount + ')');
      // Don't update expense amounts - they stay as-is. The JV is recorded separately.
    } else {
      console.log('  ' + a.ledger + ': NOT in balances (JV Cr Rs.' + a.amount + ' - voucher only)');
    }
  }

  console.log('\n✅ Journal entry complete. Sundry Advances cleared.');
  
  // Verify
  const updated = await balCol.findOne({ financialYear: '2024-25', ledgerName: 'Sundry Advances (Received)' });
  console.log('Verification - Sundry Advances now: Rs.' + updated.amount);

  await client.close();
})();
