#!/usr/bin/env node
/**
 * Generate monthly WorkshopEvent records from existing sales_reports entries,
 * so the Sales > Events page shows a "perfect account" view grouped by
 * month + workshop, each with its participant list.
 *
 * Idempotent: removes previously auto-generated events (label
 * 'auto-generated-from-sales') before recreating them. Does not modify
 * sales_reports.
 *
 * Run: node scripts/generate-workshop-events.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Default batch duration (days) per workshop, used to compute endDate.
const DURATION_DAYS = {
  'Swar Yoga': 14,
  'Swar Yoga L-1': 14,
  'Swar Yoga L-1 (Offline - Solapur)': 14,
  'Swar Yoga L-1 (Offline - Samner)': 14,
  'Swar Yoga L-2': 15,
  'Swar Yoga L-3': 30,
  'Swar Yoga Master Class': 45,
  'Teacher Training': 30,
  'Advance': 15,
  'Aahar Shastra': 7,
  'Amrut aahat': 7,
  'Meditation Class': 7,
  'Weight Loss': 7,
  'From Company Account': 1,
};

const DEFAULT_TIME = '6:00 AM - 8:00 AM';

function durationFor(workshopName) {
  return DURATION_DAYS[workshopName] || 7;
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

  // Group by (month, workshopName)
  const groups = new Map();
  for (const s of sales) {
    const date = new Date(s.saleDate || s.batchDate || s.createdAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const workshopName = (s.workshopName || 'Unspecified').trim();
    const key = `${month}__${workshopName}`;
    if (!groups.has(key)) groups.set(key, { month, workshopName, sales: [] });
    groups.get(key).sales.push(s);
  }

  console.log(`Grouped into ${groups.size} month/workshop event groups`);

  const docs = [];
  for (const { month, workshopName, sales: groupSales } of groups.values()) {
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

    const duration = durationFor(workshopName);
    const endDate = addDays(startDate, duration);

    const amounts = groupSales.map((s) => Number(s.saleAmount) || 0).filter((n) => n > 0);
    const workshopFees = amounts.length > 0 ? mode(amounts) : 0;

    const participants = groupSales.map((s) => ({
      customerId: s.customerId || '',
      customerName: s.customerName || '',
      customerPhone: s.customerPhone || '',
      workshopName: s.workshopName || workshopName,
      amount: Number(s.saleAmount) || 0,
      paymentMode: s.paymentMode || '',
      saleId: s._id,
    }));

    const totalAmount = participants.reduce((sum, p) => sum + p.amount, 0);

    docs.push({
      startDate,
      endDate,
      workshopName,
      workshopTime: DEFAULT_TIME,
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
    if (!byMonth.has(d.month)) byMonth.set(d.month, { count: 0, total: 0 });
    byMonth.get(d.month).count += 1;
    byMonth.get(d.month).total += d.totalAmount;
  }
  for (const month of Array.from(byMonth.keys()).sort()) {
    const { count, total } = byMonth.get(month);
    console.log(`  ${month}: ${count} events, ₹${total.toLocaleString('en-IN')}`);
  }

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
