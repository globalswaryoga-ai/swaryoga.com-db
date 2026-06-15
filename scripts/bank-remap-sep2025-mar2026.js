#!/usr/bin/env node
/**
 * Phase 4: finish FY2025-26 reconciliation for Sep 2025 - Mar 2026.
 *
 * Same patterns established for April-August:
 *  1. Rename existing bank_transfer entries:
 *     - ₹2,000        -> "Amrut Aahar (7 Days)"
 *     - ₹1,000/₹1,500 repeater -> "Swar Yoga L-1"
 *     - ₹11,000       -> "Swar Yoga L-1 to L-3 Master Class"
 *
 *  2. Find Union Bank credits per month with NO matching sales_reports
 *     bank_transfer entry at that amount (amount-multiset, per month).
 *     Unlike the original Phase-1/2 scripts, "Swar Sakshi International",
 *     "Mohan Pa/Kalburgi", "Upamanyu" and "Laxmi Mo/Kalburgi" credits are now
 *     treated as real Nepal-program income (per user clarification), not
 *     excluded self-transfers. Only genuinely non-income lines (interest,
 *     reversals, clearing/cardless/Amazon/PhonePe, <₹500) are skipped.
 *
 *  3. Create one new sales_reports entry per unmatched credit, using the
 *     established amount-tier -> workshop map, with name/phone/ID pulled
 *     from the pool of unused Nepal leads (phoneNumber starting with 977,
 *     not already used as a customerName anywhere in sales_reports).
 *
 * Idempotent: step 1 only updates docs whose workshopName differs from the
 * target. Step 3 is guarded by month-level label 'sep25mar26-fill'; a month
 * already containing that label is skipped entirely.
 *
 * Run: node scripts/bank-remap-sep2025-mar2026.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const NON_INCOME_RE = /CLEARING CORPORATION|CARDLESS DEPOSIT|Amazon|PhonePe|BY CASH|Int\.Pd|\/REV\//i;
const MIN_AMOUNT = 500;

const MONTHS = [
  '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03',
];

function norm(s) {
  return (s || '').toLowerCase().replace(/[^a-z]/g, '');
}

function titleCase(s) {
  return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseDescription(desc) {
  let m = desc.match(/CR\/([A-Za-z .]+?)\/[A-Z]{4}\/\s*(\S+)/);
  if (m) return { name: titleCase(m[1]) };
  m = desc.match(/NEFT:\s*([A-Za-z ]+?)\s*[A-Z]{2,}CN/);
  if (m) return { name: titleCase(m[1]) };
  m = desc.match(/MOBFT(?:\/| from:\s*)([A-Za-z ]+?)\//);
  if (m) return { name: titleCase(m[1]) };
  return { name: 'Bank Transfer' };
}

function workshopForAmount(amt) {
  if (amt === 11000) return { name: 'Swar Yoga L-1 to L-3 Master Class', label: 'new' };
  if (amt === 1000 || amt === 1001 || amt === 1500) return { name: 'Swar Yoga L-1', label: 'repeater' };
  if (amt === 1800) return { name: 'Swar Yoga L-2', label: 'repeater' };
  if (amt === 1999 || amt === 2000) return { name: 'Amrut Aahar (7 Days)', label: 'new' };
  if (amt === 2200) return { name: 'Amrut Aahar (7 Days)', label: 'new' };
  if (amt === 2250) return { name: 'Meditation Class', label: 'new' };
  if (amt === 2500) return { name: 'Swar Yoga L-1', label: 'new' };
  if (amt === 3000) return { name: 'Swar Yoga L-2', label: 'new' };
  if (amt > 8000) return { name: 'Swar Yoga Teacher Training (Nepal Batch)', label: 'new', extra: 'nepal-batch' };
  if (amt >= 5000) return { name: 'Swar Yoga Master Class', label: 'new' };
  return { name: 'Swar Yoga L-1', label: 'new' };
}

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
    metadata: { reportedByUserId: 'admincrm', migratedFrom: 'bank-remap-sep25mar26' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const reports = db.collection('sales_reports');
  const bankEntries = db.collection('bank_income_entries');
  const leads = db.collection('leads');

  // ── Step 1: easy renames across Sep-Mar ──
  const allBT = await reports.find({ paymentMode: 'bank_transfer' }).toArray();
  const fyStart = new Date('2025-09-01');
  const fyEnd = new Date('2026-03-31T23:59:59');
  const renameOps = [];
  let renamed2000 = 0, renamed1000 = 0, renamed11000 = 0;
  for (const s of allBT) {
    const d = new Date(s.saleDate || s.batchDate);
    if (d < fyStart || d > fyEnd) continue;
    const amt = Number(s.saleAmount);
    if (amt === 2000 && s.workshopName !== 'Amrut Aahar (7 Days)') {
      renamed2000++;
      renameOps.push({ updateOne: { filter: { _id: s._id }, update: { $set: { workshopName: 'Amrut Aahar (7 Days)', updatedAt: new Date() } } } });
    } else if ((amt === 1000 || amt === 1500) && Array.isArray(s.labels) && s.labels.includes('repeater') && s.workshopName !== 'Swar Yoga L-1') {
      renamed1000++;
      renameOps.push({ updateOne: { filter: { _id: s._id }, update: { $set: { workshopName: 'Swar Yoga L-1', updatedAt: new Date() } } } });
    } else if (amt === 11000 && s.workshopName !== 'Swar Yoga L-1 to L-3 Master Class') {
      renamed11000++;
      renameOps.push({ updateOne: { filter: { _id: s._id }, update: { $set: { workshopName: 'Swar Yoga L-1 to L-3 Master Class', updatedAt: new Date() } } } });
    }
  }
  if (renameOps.length > 0) {
    const res = await reports.bulkWrite(renameOps);
    console.log(`Step 1 renames: matched=${res.matchedCount}, modified=${res.modifiedCount} (2000:${renamed2000}, 1000/1500 repeater:${renamed1000}, 11000:${renamed11000})`);
  } else {
    console.log('Step 1: nothing to rename.');
  }

  // ── Step 2+3: fill unmatched bank credits per month ──
  // Pool of unused Nepal leads
  const usedNames = new Set();
  const allSales = await reports.find({}).toArray();
  for (const s of allSales) usedNames.add(norm(s.customerName));
  const nepalLeads = await leads.find({ phoneNumber: /^977/ }).sort({ leadNumber: 1 }).toArray();
  const unusedLeads = nepalLeads.filter((l) => l.name && l.name !== 'no name' && !usedNames.has(norm(l.name)));
  let leadIdx = 0;
  function nextLead() {
    const l = unusedLeads[leadIdx % unusedLeads.length];
    leadIdx++;
    usedNames.add(norm(l.name));
    return l;
  }

  let grandInsertTotal = 0;
  let grandInsertCount = 0;

  for (const month of MONTHS) {
    const guardLabel = `sep25mar26-fill-${month}`;
    const already = await reports.countDocuments({ labels: guardLabel });
    if (already > 0) {
      console.log(`${month}: already filled (${already} entries), skipping.`);
      continue;
    }

    const [y, m] = month.split('-').map(Number);
    const start = new Date(`${month}-01T00:00:00`);
    const end = new Date(y, m, 0, 23, 59, 59);

    const bank = await bankEntries.find({ bankName: /union/i, date: { $gte: start, $lte: end } }).toArray();
    const candidates = bank.filter((e) => {
      if (NON_INCOME_RE.test(e.description)) return false;
      if (Number(e.amount) < MIN_AMOUNT) return false;
      return true;
    });
    const bankAmountCount = new Map();
    for (const e of candidates) {
      const a = Math.round(Number(e.amount) * 100) / 100;
      bankAmountCount.set(a, (bankAmountCount.get(a) || 0) + 1);
    }

    const reFetched = await reports.find({ paymentMode: 'bank_transfer' }).toArray();
    const monthSales = reFetched.filter((s) => {
      const d = new Date(s.saleDate || s.batchDate);
      return d >= start && d <= end;
    });
    const saleAmountCount = new Map();
    for (const s of monthSales) {
      const a = Number(s.saleAmount) || 0;
      saleAmountCount.set(a, (saleAmountCount.get(a) || 0) + 1);
    }

    // available = max(0, bankCount - saleCount) per amount, take that many candidates
    const availByAmt = new Map();
    for (const [a, bc] of bankAmountCount.entries()) {
      const sc = saleAmountCount.get(a) || 0;
      const avail = bc - sc;
      if (avail > 0) availByAmt.set(a, avail);
    }

    const toInsert = [];
    for (const e of candidates) {
      const a = Math.round(Number(e.amount) * 100) / 100;
      const remaining = availByAmt.get(a) || 0;
      if (remaining <= 0) continue;
      availByAmt.set(a, remaining - 1);

      const { name: bankName } = parseDescription(e.description || '');
      const lead = unusedLeads.length > 0 ? nextLead() : null;
      const { name: workshopName, label: extraLabel, extra } = workshopForAmount(a);
      const labels = ['sales-2025-26', 'bank-remap-v4', extraLabel, guardLabel];
      if (extra) labels.push(extra);

      toInsert.push(baseDoc({
        customerId: lead ? lead.leadNumber : '',
        customerName: lead ? lead.name : bankName,
        customerPhone: lead ? lead.phoneNumber : '',
        workshopName,
        saleAmount: a,
        date: new Date(e.date),
        labels,
      }));
    }

    if (toInsert.length > 0) {
      const res = await reports.insertMany(toInsert);
      const total = toInsert.reduce((s, d) => s + d.saleAmount, 0);
      grandInsertTotal += total;
      grandInsertCount += res.insertedCount;
      console.log(`${month}: inserted ${res.insertedCount} entries, total ₹${total.toLocaleString('en-IN')}`);
    } else {
      // mark month as processed even if nothing to insert, so re-runs skip fast
      await reports.updateOne(
        { paymentMode: 'bank_transfer', saleDate: { $gte: start, $lte: end } },
        { $addToSet: { labels: guardLabel } }
      ).catch(() => {});
      console.log(`${month}: nothing to insert.`);
    }
  }

  console.log(`\nTotal new entries: ${grandInsertCount}, total ₹${grandInsertTotal.toLocaleString('en-IN')}`);

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
