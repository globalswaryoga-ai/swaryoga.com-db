#!/usr/bin/env node
/**
 * Generate 2025-26 sales entries that sum EXACTLY to per-workshop income
 * targets, using REAL participant names pulled from the leads collection.
 * Idempotent: deletes prior labels:['sales-2025-26'] before inserting.
 *
 * Run: node scripts/generate-sales-2025-26.js
 */
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const WINDOW_START = new Date(2025, 3, 1);   // 1 Apr 2025
const WINDOW_END = new Date(2026, 5, 15);    // 15 Jun 2026
const WINDOW_DAYS = Math.round((WINDOW_END - WINDOW_START) / 86400000);

// workshopName, fee/head, repeater fee (0=none), target; varMin/varMax => random
// per-head fee in that range; fixedName => use this label instead of a pool name
const TARGETS = [
  { workshopName: 'Swar Yoga L-1',          fee: 3500, repFee: 1000, target: 693000 },
  { workshopName: 'Swar Yoga L-2',          fee: 3000, repFee: 1000, target: 181500, reuseL1: true },
  { workshopName: 'Swar Yoga L-3',          fee: 3000, repFee: 1000, target: 108900, reuseL1: true },
  { workshopName: 'Swar Yoga Master Class', varMin: 4000, varMax: 5000, repFee: 0, target: 204000, reuseL1: true },
  { workshopName: 'Weight Loss',            fee: 3500, repFee: 1000, target: 80500  },
  { workshopName: 'Amrut aahat',            fee: 2200, repFee: 0,    target: 44000  },
  { workshopName: 'Meditation Class',       fee: 2250, repFee: 0,    target: 45000  },
  { workshopName: 'From Company Account',   fee: 75000, repFee: 0,   target: 75000, fixedName: 'From Company Account' },
];

// Build amounts that sum EXACTLY to target (every 4th = repeater, final balances)
function buildAmounts(cfg) {
  const { target, fee, repFee, varMin, varMax } = cfg;
  const pick = () => {
    if (varMin && varMax) {
      const steps = Math.floor((varMax - varMin) / 100) + 1;
      return varMin + Math.floor(Math.random() * steps) * 100;
    }
    return fee;
  };
  const amounts = [];
  let sum = 0, i = 0;
  while (true) {
    const amt = (repFee && i % 4 === 3) ? repFee : pick();
    if (sum + amt >= target) break;
    amounts.push(amt); sum += amt; i++;
  }
  if (sum < target) amounts.push(target - sum); // final balancer -> exact total
  return amounts;
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function run() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  if (!uri) { console.error('No Mongo URI'); process.exit(1); }
  await mongoose.connect(uri);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  const leadsCol = db.collection('leads');
  const salesCol = db.collection('sales');

  // Real participant pool: leads with a usable name (prefer swar yoga family)
  const rawLeads = await leadsCol.find(
    { name: { $exists: true, $nin: [null, ''] } },
    { projection: { name: 1, phoneNumber: 1, workshopName: 1 } }
  ).toArray();

  // Keep only real human names (latin/devanagari letters, no digits/junk)
  const isRealName = (nm) => {
    if (/\d/.test(nm)) return false;
    if (nm.length < 3 || nm.length > 30) return false;
    if (!/^[A-Za-zऀ-ॿ .'-]+$/.test(nm)) return false;
    const words = nm.split(/\s+/).filter(Boolean);
    if (words.length < 1 || words.length > 3) return false; // names are 1-3 words
    // Reject camelCase gibberish: no uppercase allowed after a word's first char
    for (const w of words) {
      if (/[A-Z]/.test(w.slice(1))) return false;
    }
    const low = nm.toLowerCase();
    if (/(workshop|swar\s*yoga|residential|sadhak|signup|test|account|kkk|vidhya|meditation|program|website|youth|kids|retreat|business|group|batch|main|weight|loss|class|english|hindi|nepal|company|done)/.test(low)) return false;
    return true;
  };
  // Dedupe by name, keep phone
  const seen = new Set();
  const pool = [];
  for (const l of rawLeads) {
    const nm = (l.name || '').trim();
    if (!nm || seen.has(nm.toLowerCase()) || !isRealName(nm)) continue;
    seen.add(nm.toLowerCase());
    pool.push({ name: nm, phone: l.phoneNumber || '' });
  }
  shuffle(pool);
  console.log(`Name pool: ${pool.length} unique real participants`);
  if (pool.length === 0) { console.error('No names found'); process.exit(1); }

  // Idempotent clear
  const del = await salesCol.deleteMany({ labels: 'sales-2025-26' });
  console.log(`Cleared ${del.deletedCount} prior sales-2025-26 entries`);

  let poolIdx = 0;
  const allRecords = [];
  const summary = {};
  const l1Names = []; // names used in L-1, reused for L-2/L-3/Master

  for (const t of TARGETS) {
    const amounts = buildAmounts(t);
    const n = amounts.length;
    let wsSum = 0;
    for (let i = 0; i < n; i++) {
      let person;
      if (t.fixedName) {
        person = { name: t.fixedName, phone: '' };
      } else if (t.reuseL1 && l1Names.length) {
        person = l1Names[i % l1Names.length]; // same L-1 people advance
      } else {
        person = pool[poolIdx % pool.length];
        poolIdx++;
      }
      if (t.workshopName === 'Swar Yoga L-1') l1Names.push(person);
      const amt = amounts[i];
      wsSum += amt;
      // Even date spread across window + small deterministic jitter
      const frac = n > 1 ? i / (n - 1) : 0.5;
      const jitter = Math.floor((Math.random() - 0.5) * (WINDOW_DAYS / n));
      let dayOffset = Math.round(frac * WINDOW_DAYS) + jitter;
      dayOffset = Math.max(0, Math.min(WINDOW_DAYS, dayOffset));
      const saleDate = new Date(WINDOW_START.getTime() + dayOffset * 86400000);
      saleDate.setHours(12, 0, 0, 0); // noon, avoid TZ day-rollover
      const isRepeater = t.repFee && amt === t.repFee;
      allRecords.push({
        customerName: person.name,
        customerPhone: person.phone,
        workshopName: t.workshopName,
        saleAmount: amt,
        paidAmount: amt,
        dueAmount: 0,
        saleDate,
        paymentType: 'full',
        paymentMode: 'bank_transfer',
        status: 'completed',
        labels: ['sales-2025-26', isRepeater ? 'repeater' : 'new'],
        createdAt: new Date(),
        createdByUserId: 'admin-generate',
      });
    }
    summary[t.workshopName] = { count: n, total: wsSum, target: t.target, match: wsSum === t.target };
  }

  const res = await salesCol.insertMany(allRecords);
  console.log(`\nInserted ${res.insertedCount} sales entries\n`);
  console.log('=== Per-workshop verification ===');
  let grand = 0;
  for (const [ws, s] of Object.entries(summary)) {
    grand += s.total;
    console.log(`${s.match ? 'OK ' : 'XX '} ${ws.padEnd(24)} ${s.count} entries  total ₹${s.total.toLocaleString('en-IN')}  (target ₹${s.target.toLocaleString('en-IN')})`);
  }
  console.log(`\nGRAND TOTAL: ₹${grand.toLocaleString('en-IN')}`);
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
