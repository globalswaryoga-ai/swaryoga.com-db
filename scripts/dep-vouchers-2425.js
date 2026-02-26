#!/usr/bin/env node
/**
 * Create depreciation journal vouchers for FY 2024-25
 * From depreciation chart (Companies Act 2013)
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const DEP_ENTRIES = [
  { asset: 'Computer',                    depLedger: 'Depreciation - Computer',                  amount: 151278 },
  { asset: 'Furniture and Fixture',        depLedger: 'Depreciation - Furniture & Fixture',       amount: 2821 },
  { asset: 'Software',                    depLedger: 'Depreciation - Software',                  amount: 7181 },
  { asset: 'Machinery & Equipments',       depLedger: 'Depreciation - Machinery & Equipment',     amount: 2781 },
  { asset: 'JBL Speaker',                 depLedger: 'Depreciation - JBL Speaker',               amount: 1653 },
  { asset: 'Mobile',                      depLedger: 'Depreciation - Mobile',                    amount: 7201 },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const FY = '2024-25';
  const now = new Date();
  const voucherDate = new Date('2025-03-31');

  // Check existing
  const existing = await db.collection('acc_vouchers').find({ financialYear: FY }).toArray();
  console.log(`FY ${FY}: ${existing.length} existing vouchers\n`);

  let num = existing.length + 1;
  let total = 0;

  for (const entry of DEP_ENTRIES) {
    // Check if already exists
    const already = existing.find(v => v.narration && v.narration.includes(entry.asset) && v.narration.includes('Depreciation'));
    if (already) {
      console.log(`  SKIP: ${entry.depLedger} (already exists)`);
      continue;
    }

    // Find ledger IDs
    const assetLedger = await db.collection('acc_ledgers').findOne({ financialYear: FY, name: entry.asset });
    const depLedger = await db.collection('acc_ledgers').findOne({ financialYear: FY, name: entry.depLedger });

    if (!assetLedger) { console.log(`  MISSING LEDGER: ${entry.asset}`); continue; }
    if (!depLedger) { console.log(`  MISSING LEDGER: ${entry.depLedger}`); continue; }

    await db.collection('acc_vouchers').insertOne({
      voucherNumber: `DEP-${String(num).padStart(3, '0')}`,
      type: 'JOURNAL',
      date: voucherDate,
      financialYear: FY,
      narration: `Depreciation on ${entry.asset} for FY 2024-25 (Companies Act 2013)`,
      entries: [
        { ledgerId: String(depLedger._id), ledgerName: entry.depLedger, amount: entry.amount, type: 'DEBIT' },
        { ledgerId: String(assetLedger._id), ledgerName: entry.asset, amount: entry.amount, type: 'CREDIT' },
      ],
      isReversed: false,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`  ✓ DEP-${String(num).padStart(3, '0')}: Dr ${entry.depLedger} / Cr ${entry.asset} = ${entry.amount}`);
    total += entry.amount;
    num++;
  }

  console.log(`\n  Total Depreciation: ${total}`);

  // Final count
  const finalV = await db.collection('acc_vouchers').countDocuments({ financialYear: FY });
  console.log(`  FY ${FY} now has ${finalV} vouchers`);

  await mongoose.disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
