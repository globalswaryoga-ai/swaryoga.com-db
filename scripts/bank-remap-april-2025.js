#!/usr/bin/env node
/**
 * Month-by-month workshop categorization, per user guidance — April 2025.
 *
 * For April 2025 bank_transfer sales_reports entries:
 *  - ₹2,000  -> "Amrut Aahar (7 Days)"
 *  - ₹11,000 -> "Swar Yoga L-1 to L-3 Master Class"
 *  - ₹5,000  -> "Swar Yoga L-1"
 *
 * Idempotent: re-running just re-sets the same workshopName.
 *
 * Run: node scripts/bank-remap-april-2025.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const RENAMES = {
  1000: 'Swar Yoga L-1',
  2000: 'Amrut Aahar (7 Days)',
  11000: 'Swar Yoga L-1 to L-3 Master Class',
  5000: 'Swar Yoga L-1',
};

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const reports = db.collection('sales_reports');

  const start = new Date('2025-04-01T00:00:00');
  const end = new Date('2025-04-30T23:59:59');

  const all = await reports.find({ paymentMode: 'bank_transfer' }).toArray();
  const april = all.filter((s) => {
    const d = new Date(s.saleDate || s.batchDate);
    return d >= start && d <= end && RENAMES[Number(s.saleAmount)];
  });

  console.log(`Found ${april.length} April 2025 bank_transfer entries to rename.`);

  const bulkOps = [];
  const counts = {};
  for (const s of april) {
    const amt = Number(s.saleAmount);
    const newName = RENAMES[amt];
    counts[amt] = (counts[amt] || 0) + 1;
    bulkOps.push({
      updateOne: {
        filter: { _id: s._id },
        update: { $set: { workshopName: newName, updatedAt: new Date() } },
      },
    });
  }

  if (bulkOps.length > 0) {
    const res = await reports.bulkWrite(bulkOps);
    console.log(`Bulk write result: matched=${res.matchedCount}, modified=${res.modifiedCount}`);
  }
  for (const [amt, c] of Object.entries(counts)) {
    console.log(`  ₹${amt} x${c} -> ${RENAMES[amt]}`);
  }

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
