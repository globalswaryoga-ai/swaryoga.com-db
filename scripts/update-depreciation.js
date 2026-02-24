/**
 * Update FY 2024-25 depreciation entries + verify CA P&L figures
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const db = mongoose.connection.db;

  // Depreciation FY 2024-25 from CA report
  const depreciations = {
    'Depreciation - Computer':    70836,
    'Depreciation - Furniture':   2091,
    'Depreciation - Software':    2645,
    'Depreciation - Machinery':   5902,
    'Depreciation - JBL Speaker': 0,
    'Depreciation - Mobile':      14688,  // Apple 15 (NEW) - mapped to Mobile category
  };

  console.log('=== Updating Depreciation Entries ===');
  for (const [name, amount] of Object.entries(depreciations)) {
    const r = await db.collection('tally_manual_balances').updateOne(
      { financialYear: '2024-25', ledgerName: name },
      { $set: { amount, notes: 'FY 2024-25 depreciation from CA report' } }
    );
    console.log(`  ${r.matchedCount ? '✅' : '❌'} ${name.padEnd(35)} → ₹${amount.toLocaleString('en-IN')}`);
  }

  // Also update asset closing WDV values (opening WDV was carry-forward from 2023-24)
  // Computer: Opening 2,42,483 + 10,500 (Macbook EMI purchase) = 2,52,983 → minus depreciation
  // Actually CA report shows Opening WDV. Let's update asset amounts to Closing WDV
  const assetWDV = {
    'Computer':                 41317,   // Closing WDV
    'Furniture and Fixture':    5986,
    'Software':                 1543,
    'Machinery & Equipment':    16894,
    'JBL Speaker':              0,
    'Mobile':                   50312,   // Apple 15 NEW: 65,000 - 14,688 = 50,312
  };

  console.log('\n=== Updating Asset Closing WDV ===');
  for (const [name, amount] of Object.entries(assetWDV)) {
    const r = await db.collection('tally_manual_balances').updateOne(
      { financialYear: '2024-25', ledgerName: name },
      { $set: { amount, notes: 'Closing WDV from CA depreciation report FY 2024-25' } }
    );
    console.log(`  ${r.matchedCount ? '✅' : '❌'} ${name.padEnd(35)} → ₹${amount.toLocaleString('en-IN')}`);
  }

  // Verify total depreciation
  const depTotal = Object.values(depreciations).reduce((s, v) => s + v, 0);
  console.log(`\nTotal Depreciation: ₹${depTotal.toLocaleString('en-IN')}`);

  await mongoose.disconnect();
}
main().catch(console.error);
