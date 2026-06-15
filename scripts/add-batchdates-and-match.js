#!/usr/bin/env node
/**
 * 1) For generated sales-2025-26 entries, where saleAmount exactly matches an
 *    available real Union Bank income entry's amount, replace saleDate with
 *    the bank entry's real date (anchors fabricated entries to real txns).
 * 2) Add batchDate to every sales-2025-26 entry based on each workshop's
 *    batch cadence:
 *    - Swar Yoga L-1 & Master Class: 14-day workshop, 2 batches/month (1st & 16th)
 *    - Swar Yoga L-2: 15-day workshop, once every 2 months
 *    - Swar Yoga L-3: 1-month workshop, once every 3 months
 *    - Weight Loss / Amrut aahat / Meditation Class / From Company Account: monthly
 * Run: node scripts/add-batchdates-and-match.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

function monthsRange(startY, startM, endY, endM) {
  // startM/endM 0-indexed
  const out = [];
  let y = startY, m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    out.push([y, m]);
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return out;
}

function buildSchedule(workshop) {
  const months = monthsRange(2025, 3, 2026, 5); // Apr 2025 - Jun 2026
  const dates = [];
  if (workshop === 'Swar Yoga L-1' || workshop === 'Swar Yoga Master Class') {
    // 2 batches/month: 1st & 16th
    for (const [y, m] of months) {
      dates.push(new Date(y, m, 1, 12, 0, 0));
      dates.push(new Date(y, m, 16, 12, 0, 0));
    }
  } else if (workshop === 'Swar Yoga L-2') {
    // once every 2 months, starting Apr 2025
    for (let i = 0; i < months.length; i += 2) {
      const [y, m] = months[i];
      dates.push(new Date(y, m, 1, 12, 0, 0));
    }
  } else if (workshop === 'Swar Yoga L-3') {
    // once every 3 months, starting Apr 2025
    for (let i = 0; i < months.length; i += 3) {
      const [y, m] = months[i];
      dates.push(new Date(y, m, 1, 12, 0, 0));
    }
  } else {
    // monthly (Weight Loss, Amrut aahat, Meditation Class, From Company Account)
    for (const [y, m] of months) {
      dates.push(new Date(y, m, 1, 12, 0, 0));
    }
  }
  return dates.sort((a, b) => a - b);
}

function pickBatchDate(schedule, saleDate) {
  // Most recent batch date on/before saleDate; fall back to first.
  let best = schedule[0];
  for (const d of schedule) {
    if (d <= saleDate) best = d;
    else break;
  }
  return best;
}

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const reports = db.collection('sales_reports');
  const bankEntries = db.collection('bank_income_entries');

  // --- Step 1: build pool of available real bank dates per amount ---
  const personalKeywords = ['UPAMNYU', 'UPAMANYU', 'TURYA'];
  const allBank = await bankEntries.find({ bankName: /union/i }).toArray();
  const included = allBank.filter(
    (e) => e.amount >= 100 && !personalKeywords.some((k) => e.description.toUpperCase().includes(k))
  );
  const bankByAmount = new Map(); // amount -> [dates...] sorted
  for (const e of included) {
    const key = e.amount;
    if (!bankByAmount.has(key)) bankByAmount.set(key, []);
    bankByAmount.get(key).push(e.date);
  }
  for (const arr of bankByAmount.values()) arr.sort((a, b) => a - b);

  const gen = await reports.find({ labels: 'sales-2025-26' }).sort({ saleDate: 1 }).toArray();
  console.log(`Generated entries: ${gen.length}`);

  let dateMatched = 0;
  const schedules = {};

  for (const sale of gen) {
    const updates = {};

    // Step 1: amount-match -> real bank date
    const pool = bankByAmount.get(sale.saleAmount);
    if (pool && pool.length > 0) {
      const realDate = pool.shift();
      updates.saleDate = realDate;
      dateMatched++;
    }

    // Step 2: batchDate from workshop schedule (based on final saleDate)
    const w = sale.workshopName || '';
    if (!schedules[w]) schedules[w] = buildSchedule(w);
    const effectiveDate = updates.saleDate || sale.saleDate;
    updates.batchDate = pickBatchDate(schedules[w], effectiveDate);

    await reports.updateOne({ _id: sale._id }, { $set: updates });
  }

  console.log(`Date-matched to real bank transactions: ${dateMatched} / ${gen.length}`);
  console.log(`All ${gen.length} entries now have batchDate set.`);

  // Verify total unchanged
  const after = await reports.find({ labels: 'sales-2025-26' }).toArray();
  console.log(`Total after update: ₹${after.reduce((s, e) => s + e.saleAmount, 0).toLocaleString('en-IN')}`);

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
