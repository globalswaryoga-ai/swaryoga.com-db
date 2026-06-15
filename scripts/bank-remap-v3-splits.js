#!/usr/bin/env node
/**
 * Phase 3: split lump-sum Nepal/international bank credits into per-student
 * sales_reports entries, per user guidance (April-June 2025).
 *
 * May 2025 splits (replace existing single placeholder doc with N docs):
 *  - ₹14,375 (Ashik P, 05-06)  -> 4 x ₹3,593.75 "Swar Yoga L-1 (Nepal Batch)"
 *  - ₹4,000  (Shambhu, 05-08)  -> 2 x ₹2,000   "Amrut Aahar (7 Days)"
 *  - ₹20,000 (Avinash, 05-25)  -> 4 x ₹5,000   "Swar Yoga Offline Workshop"
 *
 * May 2025 new entries (bank credits with no sales_reports doc at all):
 *  - ₹1,999 (05-24) -> "Amrut Aahar (7 Days)"
 *  - ₹1,001 (05-24) -> "Swar Yoga L-1" (repeater)
 *
 * June 2025 new entries (MOBFT "Swar Sakshi International" credits, none
 * currently represented in sales_reports):
 *  - ₹40,000 (06-02) -> 10 x ₹4,000  "Swar Yoga Residential Workshop"
 *  - ₹49,999 (06-20) -> 10 x ₹4,999.9 "Swar Yoga Residential Workshop (Dehradun - 4 Days)"
 *  - ₹10,000 x2 (06-07) -> "Swar Yoga L-1 to L-3 Master Class" (₹1,000 discount)
 *  - ₹15,000 (06-15) -> "Life IT"
 *  - ₹2,000  (06-24) -> "Amrut Aahar (7 Days)"
 *
 * Idempotent: each block is guarded by a unique label
 * (e.g. 'split-may-14375') and skipped if that label already exists.
 *
 * Run: node scripts/bank-remap-v3-splits.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

function baseDoc({ customerId, customerName, customerPhone, workshopName, saleAmount, date, labels }) {
  return {
    customerId,
    customerName,
    customerPhone: customerPhone || '',
    workshopName,
    saleAmount,
    paidAmount: saleAmount,
    dueAmount: 0,
    paymentType: 'full',
    currency: 'INR',
    status: 'completed',
    labels,
    paymentMode: 'bank_transfer',
    saleDate: date,
    batchDate: date,
    reportedByUserId: 'admincrm',
    targetAchieved: false,
    superAdminApproved: false,
    conversionPath: [],
    metadata: { reportedByUserId: 'admincrm', migratedFrom: 'bank-remap-v3' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const reports = db.collection('sales_reports');

  const toInsert = [];
  const toDelete = [];
  const skipped = [];

  async function alreadyDone(label) {
    return (await reports.countDocuments({ labels: label })) > 0;
  }

  // ── May: ₹14,375 -> 4 x ₹3,593.75 "Swar Yoga L-1 (Nepal Batch)" ──
  {
    const label = 'split-may-14375';
    if (await alreadyDone(label)) {
      skipped.push(label);
    } else {
      const src = await reports.findOne({ saleAmount: 14375, paymentMode: 'bank_transfer', labels: 'nepal-batch' });
      if (src) {
        toDelete.push(src._id);
        const date = new Date(src.saleDate);
        for (let i = 1; i <= 4; i++) {
          toInsert.push(baseDoc({
            customerId: `NP250506-L1-${i}`,
            customerName: `Nepal L1 Student ${i}`,
            workshopName: 'Swar Yoga L-1 (Nepal Batch)',
            saleAmount: 3593.75,
            date,
            labels: ['sales-2025-26', 'bank-remap-v3', 'new', 'nepal-batch', label],
          }));
        }
      }
    }
  }

  // ── May: ₹4,000 -> 2 x ₹2,000 "Amrut Aahar (7 Days)" ──
  {
    const label = 'split-may-4000';
    if (await alreadyDone(label)) {
      skipped.push(label);
    } else {
      const src = await reports.findOne({ saleAmount: 4000, paymentMode: 'bank_transfer', customerName: 'Shambhu Pokhrel' });
      if (src) {
        toDelete.push(src._id);
        const date = new Date(src.saleDate);
        for (let i = 1; i <= 2; i++) {
          toInsert.push(baseDoc({
            customerId: `NP250508-AA-${i}`,
            customerName: `Nepal Amrut Aahar Student ${i}`,
            workshopName: 'Amrut Aahar (7 Days)',
            saleAmount: 2000,
            date,
            labels: ['sales-2025-26', 'bank-remap-v3', 'new', 'nepal-batch', label],
          }));
        }
      }
    }
  }

  // ── May: ₹20,000 -> 4 x ₹5,000 "Swar Yoga Offline Workshop" ──
  {
    const label = 'split-may-20000';
    if (await alreadyDone(label)) {
      skipped.push(label);
    } else {
      const src = await reports.findOne({ saleAmount: 20000, paymentMode: 'bank_transfer', labels: 'nepal-batch' });
      if (src) {
        toDelete.push(src._id);
        const date = new Date(src.saleDate);
        for (let i = 1; i <= 4; i++) {
          toInsert.push(baseDoc({
            customerId: `NP250525-OW-${i}`,
            customerName: `Offline Workshop Student ${i}`,
            workshopName: 'Swar Yoga Offline Workshop',
            saleAmount: 5000,
            date,
            labels: ['sales-2025-26', 'bank-remap-v3', 'new', label],
          }));
        }
      }
    }
  }

  // ── May: ₹1,999 (new) -> "Amrut Aahar (7 Days)" ──
  {
    const label = 'split-may-1999';
    if (await alreadyDone(label)) {
      skipped.push(label);
    } else {
      const date = new Date('2025-05-24T18:30:00.000Z');
      toInsert.push(baseDoc({
        customerId: 'NP250524-AA-1',
        customerName: 'Nepal Student (Amrut Aahar)',
        workshopName: 'Amrut Aahar (7 Days)',
        saleAmount: 1999,
        date,
        labels: ['sales-2025-26', 'bank-remap-v3', 'new', 'nepal-batch', label],
      }));
    }
  }

  // ── May: ₹1,001 (new) -> "Swar Yoga L-1" (repeater) ──
  {
    const label = 'split-may-1001';
    if (await alreadyDone(label)) {
      skipped.push(label);
    } else {
      const date = new Date('2025-05-24T18:30:00.000Z');
      toInsert.push(baseDoc({
        customerId: 'NP250524-L1-1',
        customerName: 'Nepal Student (Repeater)',
        workshopName: 'Swar Yoga L-1',
        saleAmount: 1001,
        date,
        labels: ['sales-2025-26', 'bank-remap-v3', 'repeater', 'nepal-batch', label],
      }));
    }
  }

  // ── June: ₹40,000 -> 10 x ₹4,000 "Swar Yoga Residential Workshop" ──
  {
    const label = 'split-jun-40000';
    if (await alreadyDone(label)) {
      skipped.push(label);
    } else {
      const date = new Date('2025-06-02T18:30:00.000Z');
      for (let i = 1; i <= 10; i++) {
        toInsert.push(baseDoc({
          customerId: `NP250602-RES-${i}`,
          customerName: `Residential Workshop Student ${i}`,
          workshopName: 'Swar Yoga Residential Workshop',
          saleAmount: 4000,
          date,
          labels: ['sales-2025-26', 'bank-remap-v3', 'new', 'nepal-batch', label],
        }));
      }
    }
  }

  // ── June: ₹49,999 -> 10 x ₹4,999.9 "Swar Yoga Residential Workshop (Dehradun - 4 Days)" ──
  {
    const label = 'split-jun-49999';
    if (await alreadyDone(label)) {
      skipped.push(label);
    } else {
      const date = new Date('2025-06-20T18:30:00.000Z');
      for (let i = 1; i <= 10; i++) {
        toInsert.push(baseDoc({
          customerId: `NP250620-DEH-${i}`,
          customerName: `Dehradun Residential Student ${i}`,
          workshopName: 'Swar Yoga Residential Workshop (Dehradun - 4 Days)',
          saleAmount: 4999.9,
          date,
          labels: ['sales-2025-26', 'bank-remap-v3', 'new', 'nepal-batch', label],
        }));
      }
    }
  }

  // ── June: ₹10,000 x2 -> "Swar Yoga L-1 to L-3 Master Class" (₹1,000 discount) ──
  {
    const label = 'split-jun-10000';
    if (await alreadyDone(label)) {
      skipped.push(label);
    } else {
      const date = new Date('2025-06-07T18:30:00.000Z');
      for (let i = 1; i <= 2; i++) {
        toInsert.push(baseDoc({
          customerId: `NP250607-MC-${i}`,
          customerName: `Nepal Student (Master Class, ₹1000 discount) ${i}`,
          workshopName: 'Swar Yoga L-1 to L-3 Master Class',
          saleAmount: 10000,
          date,
          labels: ['sales-2025-26', 'bank-remap-v3', 'new', 'nepal-batch', 'discount', label],
        }));
      }
    }
  }

  // ── June: ₹15,000 -> "Life IT" ──
  {
    const label = 'split-jun-15000';
    if (await alreadyDone(label)) {
      skipped.push(label);
    } else {
      const date = new Date('2025-06-15T18:30:00.000Z');
      toInsert.push(baseDoc({
        customerId: 'NP250615-LIFEIT-1',
        customerName: 'Nepal Student (Life IT)',
        workshopName: 'Life IT',
        saleAmount: 15000,
        date,
        labels: ['sales-2025-26', 'bank-remap-v3', 'new', 'nepal-batch', label],
      }));
    }
  }

  // ── June: ₹2,000 -> "Amrut Aahar (7 Days)" ──
  {
    const label = 'split-jun-2000';
    if (await alreadyDone(label)) {
      skipped.push(label);
    } else {
      const date = new Date('2025-06-24T18:30:00.000Z');
      toInsert.push(baseDoc({
        customerId: 'NP250624-AA-1',
        customerName: 'Nepal Student (Amrut Aahar)',
        workshopName: 'Amrut Aahar (7 Days)',
        saleAmount: 2000,
        date,
        labels: ['sales-2025-26', 'bank-remap-v3', 'new', 'nepal-batch', label],
      }));
    }
  }

  console.log(`Skipped (already done): ${skipped.join(', ') || 'none'}`);
  console.log(`Deleting ${toDelete.length} old placeholder docs.`);
  console.log(`Inserting ${toInsert.length} new docs.`);

  if (toDelete.length > 0) {
    const res = await reports.deleteMany({ _id: { $in: toDelete } });
    console.log(`Deleted: ${res.deletedCount}`);
  }
  if (toInsert.length > 0) {
    const res = await reports.insertMany(toInsert);
    console.log(`Inserted: ${res.insertedCount}`);
  }

  const insertedTotal = toInsert.reduce((s, d) => s + d.saleAmount, 0);
  console.log(`New entries total: ₹${insertedTotal.toLocaleString('en-IN')}`);

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
