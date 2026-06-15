#!/usr/bin/env node
/**
 * Reconcile Union Bank CR entries (FY2025-26) against sales_reports.
 * For "small/medium" unmatched bank credits (<=8000) that correspond to
 * known per-person workshop fee tiers, create matching sales_reports
 * entries (paymentMode: bank_transfer) using the real payer name from the
 * bank statement, so total income reconciles with bank credits.
 *
 * Idempotent: deletes previously inserted docs with label
 * 'bank-reconcile-fy2025-26' before re-inserting.
 *
 * Run: node scripts/bank-income-reconcile-fy2526.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const EXCLUDE_RE = /UPAMNYU|UPAMANYU|TURYA|LAXMI KALBURGI|MOHAN KALBURGI|SWAR SAKSHI INTERNAT|meera\.m\.kalbur|kalburgimohan|shubhamkalburg|8180898066|kalics51/i;
const NON_INCOME_RE = /CLEARING CORPORATION|CARDLESS DEPOSIT|Amazon|PhonePe/i;

// amount -> workshop, for the "small/medium" unmatched bucket (<=8000)
const AMOUNT_WORKSHOP_MAP = {
  2000: 'Swar Yoga L-1',
  1600: 'Swar Yoga',
  1200: 'Swar Yoga L-2',
  996: 'Swar Yoga L-1',
  900: 'Weight Loss',
  700: 'Aahar Shastra',
  500: 'Aahar Shastra',
  2400: 'Meditation Class',
  2500: 'Meditation Class',
  3100: 'Swar Yoga L-2',
  3300: 'Swar Yoga L-2',
  3400: 'Swar Yoga L-1',
  3501: 'Swar Yoga L-1',
  3600: 'Swar Yoga L-3',
  5001: 'Swar Yoga Master Class',
  5400: 'Swar Yoga Master Class',
  5690: 'Swar Yoga Master Class',
  6000: 'Swar Yoga Master Class',
  6130: 'Swar Yoga Master Class',
  7000: 'Swar Yoga Master Class',
  7200: 'Swar Yoga Master Class',
  8000: 'Swar Yoga Master Class',
};

// Hand-resolved real names for specific references (from UPI handle research)
const NAME_OVERRIDES = {
  '546752304663': 'Deepti Patel',
  '102990462350': 'Ghanshyam Chavan',
  '546792242126': 'Kanak Rawal',
};

function titleCase(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseDescription(desc, ref) {
  if (NAME_OVERRIDES[ref]) return { name: NAME_OVERRIDES[ref], phone: '' };
  const m = desc.match(/CR\/([A-Za-z .]+?)\/[A-Z]{4}\/\s*(\S+)/);
  let name = m ? titleCase(m[1]) : 'Bank Transfer';
  let phone = '';
  if (m) {
    const handle = m[2];
    const phoneMatch = handle.match(/^(\d{10})/);
    if (phoneMatch) phone = phoneMatch[1];
  }
  return { name, phone };
}

function refFromDescription(desc) {
  const m = desc.match(/UPIAB\/(\d+)\/CR/);
  return m ? m[1] : '';
}

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const bankEntries = db.collection('bank_income_entries');
  const reports = db.collection('sales_reports');

  const fyStart = new Date('2025-04-01');
  const fyEnd = new Date('2026-03-31T23:59:59');

  const allBank = await bankEntries.find({ bankName: /union/i }).sort({ date: 1 }).toArray();
  const sales = await reports.find({}).toArray();

  const fyBank = allBank.filter((e) => {
    const d = new Date(e.date);
    return d >= fyStart && d <= fyEnd;
  });

  const candidates = fyBank.filter((e) => {
    if (EXCLUDE_RE.test(e.description)) return false;
    if (NON_INCOME_RE.test(e.description)) return false;
    if (e.amount < 500) return false;
    return true;
  });

  const saleAmountCounts = new Map();
  for (const s of sales) {
    saleAmountCounts.set(s.saleAmount, (saleAmountCounts.get(s.saleAmount) || 0) + 1);
  }

  const unmatched = [];
  for (const e of candidates) {
    const cnt = saleAmountCounts.get(e.amount) || 0;
    if (cnt > 0) saleAmountCounts.set(e.amount, cnt - 1);
    else unmatched.push(e);
  }

  const toFix = unmatched.filter((e) => e.amount <= 8000);
  const stillLarge = unmatched.filter((e) => e.amount > 8000);

  const docs = toFix.map((e) => {
    const ref = refFromDescription(e.description);
    const { name, phone } = parseDescription(e.description, ref);
    const workshopName = AMOUNT_WORKSHOP_MAP[e.amount] || 'Swar Yoga';
    return {
      customerId: '',
      customerName: name,
      customerPhone: phone,
      workshopName,
      batchDate: e.date,
      saleAmount: e.amount,
      paymentMode: 'bank_transfer',
      saleDate: e.date,
      labels: ['bank-reconcile-fy2025-26'],
      reportedByUserId: 'admincrm',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  const del = await reports.deleteMany({ labels: 'bank-reconcile-fy2025-26' });
  console.log(`Removed ${del.deletedCount} previously inserted reconciliation entries`);

  const res = await reports.insertMany(docs);
  console.log(`Inserted ${res.insertedCount} new sales_reports entries (bank reconciliation)`);
  console.log(`Total added: ₹${docs.reduce((s, d) => s + d.saleAmount, 0).toLocaleString('en-IN')}`);

  const fySalesTotal = sales
    .filter((s) => {
      const d = new Date(s.saleDate || s.batchDate || s.createdAt);
      return d >= fyStart && d <= fyEnd;
    })
    .reduce((s, r) => s + (r.saleAmount || 0), 0);
  const newTotal = fySalesTotal + docs.reduce((s, d) => s + d.saleAmount, 0);
  console.log(`\nFY2025-26 total: ₹${fySalesTotal.toLocaleString('en-IN')} -> ₹${newTotal.toLocaleString('en-IN')}`);

  console.log(`\nStill-large unmatched bank credits (>₹8000, NOT added - needs review):`);
  console.log(`Count: ${stillLarge.length}, Total: ₹${stillLarge.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}`);
  const byAmount = new Map();
  for (const e of stillLarge) {
    if (!byAmount.has(e.amount)) byAmount.set(e.amount, []);
    byAmount.get(e.amount).push(e);
  }
  for (const amt of Array.from(byAmount.keys()).sort((a, b) => b - a)) {
    const list = byAmount.get(amt);
    console.log(`  ₹${amt.toLocaleString('en-IN')} x${list.length} = ₹${(amt * list.length).toLocaleString('en-IN')}`);
  }

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
