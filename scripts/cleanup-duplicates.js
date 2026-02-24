#!/usr/bin/env node
/**
 * Clean up FY 2023-24 balances:
 * - Remove old excel-import entries (superseded by ca-report-import)
 * - Keep ca-report-import entries (CA-audited, correct)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const { MongoClient } = require('mongodb');

async function main() {
  const DRY_RUN = process.argv.includes('--dry-run');
  
  const c = new MongoClient(process.env.MONGODB_URI_MAIN);
  await c.connect();
  const db = c.db('swaryoga_admin_crm');
  const col = db.collection('tally_manual_balances');

  // Get all FY 2023-24 entries
  const all = await col.find({ financialYear: '2023-24' }).toArray();
  const excelEntries = all.filter(e => e.createdBy === 'excel-import');
  const caEntries = all.filter(e => e.createdBy === 'ca-report-import');

  console.log(`FY 2023-24 total: ${all.length} entries`);
  console.log(`  excel-import: ${excelEntries.length} entries`);
  console.log(`  ca-report-import: ${caEntries.length} entries`);

  console.log('\n=== EXCEL-IMPORT entries to DELETE ===');
  excelEntries.forEach(e => console.log(`  ${e._id} | ${e.ledgerName} | ${e.parentGroup} | Rs ${e.amount} ${e.drCr}`));

  console.log('\n=== CA-REPORT-IMPORT entries to KEEP ===');
  caEntries.forEach(e => console.log(`  ${e._id} | ${e.ledgerName} | ${e.parentGroup} | Rs ${e.amount} ${e.drCr}`));

  if (DRY_RUN) {
    console.log('\n--- DRY RUN: No changes made. Remove --dry-run to execute. ---');
    await c.close();
    return;
  }

  // Delete all excel-import entries for FY 2023-24
  const result = await col.deleteMany({ financialYear: '2023-24', createdBy: 'excel-import' });
  console.log(`\nDeleted ${result.deletedCount} excel-import entries`);

  // Verify
  const remaining = await col.countDocuments({ financialYear: '2023-24' });
  console.log(`FY 2023-24 remaining: ${remaining} entries (should be ${caEntries.length})`);

  await c.close();
}

main().catch(e => { console.error(e); process.exit(1); });
