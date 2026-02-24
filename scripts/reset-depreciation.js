/**
 * Reset depreciation to 0 and restore asset WDV from CA report FY 2023-24
 * 
 * CA Report (31.03.2024) WDV values (amounts in hundreds × 100):
 * Computer: 2,424.83 → ₹2,42,483
 * Furniture: 312.02 → ₹31,202
 * Software: 66.31 → ₹6,631
 * Machinery: 307.57 → ₹30,757
 * JBL Speaker: 258.47 → ₹25,847
 * Mobile: 607.99 → ₹60,799
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;

  // 1. Reset all depreciation entries to 0
  const depEntries = [
    'Depreciation - Computer',
    'Depreciation - Furniture',
    'Depreciation - Software',
    'Depreciation - Machinery',
    'Depreciation - JBL Speaker',
    'Depreciation - Mobile',
  ];

  console.log('=== Resetting Depreciation to ₹0 ===');
  for (const name of depEntries) {
    const r = await db.collection('tally_manual_balances').updateOne(
      { financialYear: '2024-25', ledgerName: name },
      { $set: { amount: 0, notes: 'Depreciation not yet finalized by CA for FY 2024-25' } }
    );
    console.log(`  ${r.matchedCount ? '✅' : '❌'} ${name} → ₹0`);
  }

  // 2. Restore asset WDV from CA report (FY 2023-24 closing = FY 2024-25 opening)
  const assetWDV = {
    'Computer':              242483,   // 2,424.83 × 100
    'Furniture and Fixture': 31202,    // 312.02 × 100
    'Software':              6631,     // 66.31 × 100
    'Machinery & Equipment': 30757,    // 307.57 × 100
    'JBL Speaker':           25847,    // 258.47 × 100
    'Mobile':                60799,    // 607.99 × 100
  };

  console.log('\n=== Restoring Asset WDV (CA Report 31.03.2024) ===');
  for (const [name, amount] of Object.entries(assetWDV)) {
    const r = await db.collection('tally_manual_balances').updateOne(
      { financialYear: '2024-25', ledgerName: name },
      { $set: { amount, notes: 'Opening WDV from CA report FY 2023-24 (31.03.2024)' } }
    );
    console.log(`  ${r.matchedCount ? '✅' : '❌'} ${name.padEnd(30)} → ₹${amount.toLocaleString('en-IN')}`);
  }

  console.log('\nDone.');
  await mongoose.disconnect();
}
main().catch(console.error);
