#!/usr/bin/env node
/**
 * Generate monthly WorkshopEvent records from existing sales_reports entries,
 * so the Sales > Events page shows a "perfect account" view: each month has
 * at most a handful of real batches (Morning 15-day, Evening/Workshop
 * 15-day, Residential Offline 4-day, plus Teacher Training when present),
 * each with its participant list - matching how Swar Yoga actually runs
 * batches (3 batches/month, 15-30 people each).
 *
 * Idempotent: removes previously auto-generated events (label
 * 'auto-generated-from-sales') before recreating them. Does not modify
 * sales_reports.
 *
 * Run: node scripts/generate-workshop-events.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Map each workshopName to the real-world batch category it belongs to.
const CATEGORY_MAP = {
  'Swar Yoga L-1': 'morning',
  'Swar Yoga': 'evening',
  'Swar Yoga L-2': 'evening',
  'Swar Yoga L-3': 'evening',
  'Swar Yoga Master Class': 'evening',
  'Meditation Class': 'evening',
  'Aahar Shastra': 'evening',
  'Amrut aahat': 'evening',
  'Weight Loss': 'evening',
  'Advance': 'evening',
  'Swar Yoga L-1 (Offline - Solapur)': 'residential',
  'Swar Yoga L-1 (Offline - Samner)': 'residential',
  'Swar Yoga L-1 (Nepal Batch)': 'morning',
  'Amrut Aahar (7 Days)': 'evening',
  'Swar Yoga L-1 to L-3 Master Class': 'evening',
  'Swar Yoga Offline Workshop': 'residential',
  'Swar Yoga Residential Workshop': 'residential',
  'Swar Yoga Residential Workshop (Dehradun - 4 Days)': 'residential',
  'Life IT': 'other',
  'Teacher Training': 'teacher_training',
  'Swar Yoga Teacher Training (Nepal Batch)': 'teacher_training',
  'From Company Account': 'other',
};

// Per-category batch config: display name, duration (days), time slot.
const CATEGORY_CONFIG = {
  morning: { workshopName: 'Swar Yoga L-1 (Morning Batch)', duration: 15, time: '6:00 AM - 8:00 AM' },
  evening: { workshopName: 'Evening Batch & Workshops', duration: 15, time: '6:00 PM - 8:00 PM' },
  residential: { workshopName: 'Swar Yoga L-1 (Residential - Offline)', duration: 4, time: 'Thu - Sun (Residential)' },
  teacher_training: { workshopName: 'Teacher Training', duration: 30, time: '6:00 AM - 8:00 AM' },
  other: { workshopName: 'Other Income', duration: 1, time: '-' },
};

function categoryFor(workshopName) {
  return CATEGORY_MAP[(workshopName || '').trim()] || 'evening';
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function mode(numbers) {
  const counts = new Map();
  for (const n of numbers) counts.set(n, (counts.get(n) || 0) + 1);
  let best = numbers[0];
  let bestCount = 0;
  for (const [n, c] of counts) {
    if (c > bestCount) { best = n; bestCount = c; }
  }
  return best;
}

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const reports = db.collection('sales_reports');
  const events = db.collection('crm_workshop_events');

  const sales = await reports.find({}).toArray();
  console.log(`Loaded ${sales.length} sales_reports entries`);

  // Group by (month, category)
  const groups = new Map();
  for (const s of sales) {
    const date = new Date(s.saleDate || s.batchDate || s.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const category = categoryFor(s.workshopName);
    const key = `${month}__${category}`;
    if (!groups.has(key)) groups.set(key, { month, category, sales: [] });
    groups.get(key).sales.push(s);
  }

  console.log(`Grouped into ${groups.size} month/batch event groups`);

  const docs = [];
  for (const { month, category, sales: groupSales } of groups.values()) {
    const config = CATEGORY_CONFIG[category];

    // Anchor startDate to the earliest batchDate/saleDate in the group; fall back to 1st of month.
    const dates = groupSales
      .map((s) => s.batchDate || s.saleDate || s.createdAt)
      .filter(Boolean)
      .map((d) => new Date(d))
      .filter((d) => !isNaN(d.getTime()));
    const [y, m] = month.split('-').map(Number);
    const startDate = dates.length > 0
      ? new Date(Math.min(...dates.map((d) => d.getTime())))
      : new Date(y, m - 1, 1, 12, 0, 0);

    const endDate = addDays(startDate, config.duration);

    const amounts = groupSales.map((s) => Number(s.saleAmount) || 0).filter((n) => n > 0);
    const workshopFees = amounts.length > 0 ? mode(amounts) : 0;

    const participants = groupSales.map((s) => ({
      customerId: s.customerId || '',
      customerName: s.customerName || '',
      customerPhone: s.customerPhone || '',
      workshopName: s.workshopName || config.workshopName,
      amount: Number(s.saleAmount) || 0,
      paymentMode: s.paymentMode || '',
      saleId: s._id,
    }));

    const totalAmount = participants.reduce((sum, p) => sum + p.amount, 0);

    docs.push({
      startDate,
      endDate,
      workshopName: config.workshopName,
      workshopTime: config.time,
      workshopFees,
      month,
      notes: '',
      participants,
      totalAmount,
      participantCount: participants.length,
      labels: ['sales-2025-26', 'auto-generated-from-sales'],
      reportedByUserId: 'admincrm',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const del = await events.deleteMany({ labels: 'auto-generated-from-sales' });
  console.log(`Removed ${del.deletedCount} previously auto-generated events`);

  const res = await events.insertMany(docs);
  console.log(`Inserted ${res.insertedCount} workshop events`);

  const grandTotal = docs.reduce((sum, d) => sum + d.totalAmount, 0);
  const grandParticipants = docs.reduce((sum, d) => sum + d.participantCount, 0);
  console.log(`Total across events: ₹${grandTotal.toLocaleString('en-IN')}, ${grandParticipants} participants`);

  // Per-month summary
  const byMonth = new Map();
  for (const d of docs) {
    if (!byMonth.has(d.month)) byMonth.set(d.month, []);
    byMonth.get(d.month).push(d);
  }
  for (const month of Array.from(byMonth.keys()).sort()) {
    console.log(`  ${month}:`);
    for (const d of byMonth.get(month)) {
      console.log(`    ${d.workshopName}: ${d.participantCount} people, ₹${d.totalAmount.toLocaleString('en-IN')}`);
    }
  }

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
