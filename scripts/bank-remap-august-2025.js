#!/usr/bin/env node
/**
 * Month-by-month workshop categorization — August 2025.
 * Applies the established 1:1 patterns from April-July:
 *  - ₹2,000 -> "Amrut Aahar (7 Days)"
 *  - ₹1,000 repeater entries -> "Swar Yoga L-1" (fixes mislabeled L-2/L-3)
 *
 * Run: node scripts/bank-remap-august-2025.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const reports = db.collection('sales_reports');

  const start = new Date('2025-08-01T00:00:00');
  const end = new Date('2025-08-31T23:59:59');

  const all = await reports.find({ paymentMode: 'bank_transfer' }).toArray();
  const aug = all.filter((s) => {
    const d = new Date(s.saleDate || s.batchDate);
    return d >= start && d <= end;
  });

  const bulkOps = [];
  let count2000 = 0;
  let countFix1000 = 0;

  for (const s of aug) {
    const amt = Number(s.saleAmount);
    if (amt === 2000 && s.workshopName !== 'Amrut Aahar (7 Days)') {
      count2000++;
      bulkOps.push({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { workshopName: 'Amrut Aahar (7 Days)', updatedAt: new Date() } },
        },
      });
    } else if (amt === 1000 && Array.isArray(s.labels) && s.labels.includes('repeater') && s.workshopName !== 'Swar Yoga L-1') {
      countFix1000++;
      bulkOps.push({
        updateOne: {
          filter: { _id: s._id },
          update: { $set: { workshopName: 'Swar Yoga L-1', updatedAt: new Date() } },
        },
      });
    }
  }

  if (bulkOps.length > 0) {
    const res = await reports.bulkWrite(bulkOps);
    console.log(`Bulk write result: matched=${res.matchedCount}, modified=${res.modifiedCount}`);
  } else {
    console.log('Nothing to update.');
  }
  console.log(`  ₹2000 -> Amrut Aahar (7 Days): ${count2000} updated`);
  console.log(`  ₹1000 repeater -> Swar Yoga L-1: ${countFix1000} updated`);

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
