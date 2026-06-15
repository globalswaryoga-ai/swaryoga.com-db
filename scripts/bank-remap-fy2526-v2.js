#!/usr/bin/env node
/**
 * Phase 2 reconciliation for FY2025-26.
 *
 * The first pass (bank-income-reconcile-fy2526.js) added 74 entries for
 * unmatched SMALL bank credits. But 351 of the existing 'new,sales-2025-26'
 * bank_transfer entries (₹10.4L) use round placeholder amounts that don't
 * correspond to ANY real Union Bank credit line.
 *
 * This script:
 *  - Finds those "fake" excess entries (sales count > bank count, for a
 *    given amount), restricted to label 'new' + paymentMode 'bank_transfer'.
 *  - Finds real, unconsumed Union Bank credit lines (amount >= 500, not
 *    self/family transfers, not non-income) that have no matching sales
 *    entry yet.
 *  - Pairs the largest "fake" entries with the largest real credits
 *    (1:1), rewriting customerName/phone, saleAmount, batchDate, saleDate
 *    and workshopName from the real bank line. Tags with 'bank-remap-v2'.
 *  - Any fake entries left over (no real credit available) are kept as-is
 *    but switched from paymentMode 'bank_transfer' -> 'cash', tagged
 *    'bank-remap-v2-cash'.
 *
 * Idempotent: only docs still carrying label 'new' + paymentMode
 * 'bank_transfer' are considered "fake" candidates, so a second run is a
 * no-op once everything has been remapped/recashed.
 *
 * Run: node scripts/bank-remap-fy2526-v2.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const EXCLUDE_RE = /UPAMNYU|UPAMANYU|TURYA|LAXMI KALBURGI|MOHAN KALBURGI|MOHAN PA|SWAR SAKSHI INTERNAT|meera\.m\.kalbur|kalburgimohan|shubhamkalburg|8180898066|kalics51/i;
const NON_INCOME_RE = /CLEARING CORPORATION|CARDLESS DEPOSIT|Amazon|PhonePe|BY CASH/i;

function titleCase(s) {
  return s.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseDescription(desc) {
  let m = desc.match(/CR\/([A-Za-z .]+?)\/[A-Z]{4}\/\s*(\S+)/);
  if (m) {
    const name = titleCase(m[1]);
    const handle = m[2];
    const pm = handle.match(/^(\d{10})/);
    return { name, phone: pm ? pm[1] : '' };
  }
  m = desc.match(/NEFT:\s*([A-Za-z ]+?)\s*[A-Z]{2,}CN/);
  if (m) return { name: titleCase(m[1]), phone: '' };
  m = desc.match(/MOBFT(?:\/| from:\s*)([A-Za-z ]+?)\//);
  if (m) return { name: titleCase(m[1]), phone: '' };
  return { name: 'Bank Transfer', phone: '' };
}

// 500-1999 -> repeater Swar Yoga L-1, 2000-5000 -> new-participant Swar Yoga L-1
// 11000 -> Residential (Offline - Solapur), other 5001-9999 -> Master Class,
// other 10000-15000 -> Teacher Training
function workshopForAmount(amt) {
  if (amt === 11000) return 'Swar Yoga L-1 (Offline - Solapur)';
  if (amt <= 5000) return 'Swar Yoga L-1';
  if (amt <= 9999) return 'Swar Yoga Master Class';
  return 'Teacher Training';
}

function extraLabel(amt) {
  return amt < 2000 ? 'repeater' : 'new';
}

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const reports = db.collection('sales_reports');
  const bankEntries = db.collection('bank_income_entries');

  const fyStart = new Date('2025-04-01');
  const fyEnd = new Date('2026-03-31T23:59:59');

  const allSales = await reports.find({}).toArray();
  const fySales = allSales.filter((s) => {
    const d = new Date(s.saleDate || s.batchDate || s.createdAt);
    return d >= fyStart && d <= fyEnd;
  });

  const allBank = await bankEntries.find({ bankName: /union/i }).toArray();
  const fyBank = allBank.filter((e) => {
    const d = new Date(e.date);
    return d >= fyStart && d <= fyEnd;
  });

  // Multiset of sale amounts (all FY sales, regardless of label)
  const saleAmountCount = new Map();
  for (const s of fySales) {
    const a = Number(s.saleAmount) || 0;
    saleAmountCount.set(a, (saleAmountCount.get(a) || 0) + 1);
  }
  // Multiset of bank credit amounts (candidates only)
  const bankCandidates = fyBank.filter((e) => {
    if (EXCLUDE_RE.test(e.description)) return false;
    if (NON_INCOME_RE.test(e.description)) return false;
    if (e.amount < 500) return false;
    return true;
  });
  const bankAmountCount = new Map();
  for (const e of bankCandidates) {
    const a = Math.round(Number(e.amount) * 100) / 100;
    bankAmountCount.set(a, (bankAmountCount.get(a) || 0) + 1);
  }

  // "Fake" sales: label 'new' + bank_transfer, amount has no matching bank credit
  const fakeCandidates = fySales.filter(
    (s) => s.paymentMode === 'bank_transfer' && Array.isArray(s.labels) && s.labels.includes('new')
  );
  const fake = [];
  const fakeCountByAmt = new Map();
  for (const s of fakeCandidates) {
    const a = Number(s.saleAmount) || 0;
    const bc = bankAmountCount.get(a) || 0;
    const used = fakeCountByAmt.get(a) || 0;
    const sc = saleAmountCount.get(a) || 0; // total sales at this amount
    // excess sales beyond bank availability
    if (used < sc - bc) {
      fake.push(s);
      fakeCountByAmt.set(a, used + 1);
    }
  }

  // "Available" bank credits: for each amount, available count = max(0, bankCount - saleCount)
  const available = [];
  const availByAmt = new Map();
  for (const [a, bc] of bankAmountCount.entries()) {
    const sc = saleAmountCount.get(a) || 0;
    const avail = bc - sc;
    if (avail > 0) availByAmt.set(a, avail);
  }
  for (const e of bankCandidates) {
    const a = Math.round(Number(e.amount) * 100) / 100;
    const remaining = availByAmt.get(a) || 0;
    if (remaining > 0) {
      available.push(e);
      availByAmt.set(a, remaining - 1);
    }
  }

  console.log(`Fake (unbacked) entries found: ${fake.length}`);
  console.log(`Available real bank credits found: ${available.length}`);

  // Pair largest-fake with largest-available
  fake.sort((a, b) => (Number(b.saleAmount) || 0) - (Number(a.saleAmount) || 0));
  available.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));

  const pairCount = Math.min(fake.length, available.length);
  let remappedTotal = 0;
  let removedTotal = 0;
  const bulkOps = [];

  for (let i = 0; i < pairCount; i++) {
    const saleDoc = fake[i];
    const credit = available[i];
    const { name, phone } = parseDescription(credit.description || '');
    const amt = Math.round(Number(credit.amount) * 100) / 100;
    const newLabels = ['sales-2025-26', 'bank-remap-v2', extraLabel(amt)];
    removedTotal += Number(saleDoc.saleAmount) || 0;
    remappedTotal += amt;
    bulkOps.push({
      updateOne: {
        filter: { _id: saleDoc._id },
        update: {
          $set: {
            customerName: name,
            customerPhone: phone,
            workshopName: workshopForAmount(amt),
            saleAmount: amt,
            batchDate: credit.date,
            saleDate: credit.date,
            labels: newLabels,
            updatedAt: new Date(),
          },
        },
      },
    });
  }

  // Remaining fake entries -> switch to cash
  let cashCount = 0;
  let cashTotal = 0;
  for (let i = pairCount; i < fake.length; i++) {
    const saleDoc = fake[i];
    const newLabels = (saleDoc.labels || []).filter((l) => l !== 'new');
    if (!newLabels.includes('bank-remap-v2-cash')) newLabels.push('bank-remap-v2-cash');
    cashCount++;
    cashTotal += Number(saleDoc.saleAmount) || 0;
    bulkOps.push({
      updateOne: {
        filter: { _id: saleDoc._id },
        update: {
          $set: {
            paymentMode: 'cash',
            labels: newLabels,
            updatedAt: new Date(),
          },
        },
      },
    });
  }

  if (bulkOps.length > 0) {
    const res = await reports.bulkWrite(bulkOps);
    console.log(`\nBulk write result: matched=${res.matchedCount}, modified=${res.modifiedCount}`);
  } else {
    console.log('\nNothing to update.');
  }

  console.log(`\nRemapped ${pairCount} entries to real bank lines:`);
  console.log(`  Old (fake) total: ₹${removedTotal.toLocaleString('en-IN')}`);
  console.log(`  New (real) total: ₹${remappedTotal.toLocaleString('en-IN')}`);
  console.log(`Switched ${cashCount} entries to Cash (no real bank line available): ₹${cashTotal.toLocaleString('en-IN')}`);

  const oldFYTotal = fySales.reduce((s, r) => s + (Number(r.saleAmount) || 0), 0);
  const newFYTotal = oldFYTotal - removedTotal + remappedTotal; // cash switches don't change amount
  console.log(`\nFY2025-26 total revenue: ₹${oldFYTotal.toLocaleString('en-IN')} -> ₹${newFYTotal.toLocaleString('en-IN')}`);

  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
