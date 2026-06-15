#!/usr/bin/env node
/**
 * Phase 3 of FY2025-26 reconciliation.
 *
 * The 42 entries remapped by bank-remap-fy2526-v2.js include 23 large,
 * irregular real bank credits (₹9,250 - ₹60,000) that don't fit the normal
 * per-person fee tiers. Per user instruction, these represent the
 * international "Nepal batch" Teacher Training income (Swar Sakshi
 * International transfers) and should be kept at their real amounts but
 * grouped under a single workshop name.
 *
 * Idempotent: only touches docs with label 'bank-remap-v2',
 * saleAmount > 8000 and != 11000, and workshopName != target.
 *
 * Run: node scripts/bank-remap-nepal-batch.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const TARGET_WORKSHOP = 'Swar Yoga Teacher Training (Nepal Batch)';

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const reports = db.collection('sales_reports');

  const docs = await reports
    .find({
      labels: 'bank-remap-v2',
      saleAmount: { $gt: 8000, $ne: 11000 },
    })
    .toArray();

  console.log(`Found ${docs.length} large bank-remap-v2 entries to re-tag as Nepal batch.`);

  let total = 0;
  const bulkOps = [];
  for (const d of docs) {
    total += Number(d.saleAmount) || 0;
    const newLabels = Array.isArray(d.labels) ? [...d.labels] : [];
    if (!newLabels.includes('nepal-batch')) newLabels.push('nepal-batch');
    bulkOps.push({
      updateOne: {
        filter: { _id: d._id },
        update: {
          $set: {
            workshopName: TARGET_WORKSHOP,
            labels: newLabels,
            updatedAt: new Date(),
          },
        },
      },
    });
  }

  if (bulkOps.length > 0) {
    const res = await reports.bulkWrite(bulkOps);
    console.log(`Bulk write result: matched=${res.matchedCount}, modified=${res.modifiedCount}`);
  } else {
    console.log('Nothing to update.');
  }

  console.log(`Total Nepal batch income: ₹${total.toLocaleString('en-IN')}`);
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
