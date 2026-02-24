#!/usr/bin/env node
// Cross-check all DB balances against CA report for FY 2023-24 / FY 2024-25 opening
const { MongoClient } = require('mongodb');

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const uri = process.env.MONGODB_URI_MAIN;
const CRM_DB = 'swaryoga_admin_crm';

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(CRM_DB);

  // Get all balances for FY 2024-25 (these represent FY 2023-24 closing / 2024-25 opening)
  const balances = await db.collection('tally_manual_balances')
    .find({ financialYear: '2024-25' })
    .sort({ category: 1, ledgerName: 1 })
    .toArray();

  console.log(`\n=== FY 2024-25 Opening Balances (= FY 2023-24 Closing) ===`);
  console.log(`Total entries: ${balances.length}\n`);

  // CA Report figures (Rs in Hundreds → actual Rs)
  const CA_FIGURES = {
    // ASSETS
    'Computer': { amount: 242483, drCr: 'Dr', category: 'asset', note: 'WDV Note 7' },
    'Furniture and Fixture': { amount: 31202, drCr: 'Dr', category: 'asset', note: 'WDV Note 7' },
    'Software': { amount: 6631, drCr: 'Dr', category: 'asset', note: 'WDV Note 7' },
    'Machinery & Equipments': { amount: 30757, drCr: 'Dr', category: 'asset', note: 'WDV Note 7' },
    'JBL Speaker': { amount: 25847, drCr: 'Dr', category: 'asset', note: 'WDV Note 7' },
    'Mobile': { amount: 60799, drCr: 'Dr', category: 'asset', note: 'WDV Note 7' },
    'Cash in Hand': { amount: 291886, drCr: 'Dr', category: 'asset', note: 'Note 9' },
    'Kotak Bank A/c': { amount: 37441, drCr: 'Dr', category: 'asset', note: 'Note 9 (374.41)' },
    'Fees Receivable': { amount: 111769, drCr: 'Dr', category: 'asset', note: 'Note 10' },
    'Sundry Advances Paid': { amount: 28000, drCr: 'Dr', category: 'asset', note: 'Note 10' },

    // LIABILITIES
    'Equity Share Capital': { amount: 100000, drCr: 'Cr', category: 'liability', note: 'Note 1' },
    'Preference Share Capital': { amount: 510000, drCr: 'Cr', category: 'liability', note: 'Note 1' },
    'Profit & Loss A/c': { amount: 45192, drCr: 'Dr', category: 'liability', note: 'Note 2 (loss = Dr)' },
    'Deferred Tax Liability': { amount: 30493, drCr: 'Cr', category: 'liability', note: 'Note 4' },
    'Audit Fees Payable': { amount: 5000, drCr: 'Cr', category: 'liability', note: 'Note 5' },
    'Consulting Fees Payable': { amount: 2500, drCr: 'Cr', category: 'liability', note: 'Note 5' },
    'Sundry Advances Received': { amount: 325000, drCr: 'Cr', category: 'liability', note: 'Note 6 (From Directors)' },
  };

  // Group by category
  const byCategory = {};
  for (const b of balances) {
    const cat = b.category || 'unknown';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(b);
  }

  let mismatches = [];
  let matched = [];
  let notInCA = [];

  for (const b of balances) {
    const name = b.ledgerName;
    const ca = CA_FIGURES[name];
    if (ca) {
      const dbAmt = b.amount || 0;
      const dbDrCr = b.drCr || '?';
      const amtMatch = Math.abs(dbAmt - ca.amount) < 2; // allow rounding
      const drCrMatch = dbDrCr === ca.drCr;
      const status = (amtMatch && drCrMatch) ? '✅' : '❌';
      const line = `${status} ${name}: DB=₹${dbAmt} ${dbDrCr} | CA=₹${ca.amount} ${ca.drCr} (${ca.note})`;
      if (amtMatch && drCrMatch) {
        matched.push(line);
      } else {
        mismatches.push(line);
      }
      delete CA_FIGURES[name]; // mark as found
    } else {
      notInCA.push(`⚠️  ${name}: DB=₹${b.amount || 0} ${b.drCr || '?'} (${b.category}) — Not in CA report or name mismatch`);
    }
  }

  console.log('--- MATCHED (DB = CA) ---');
  matched.forEach(l => console.log(l));

  console.log('\n--- MISMATCHES (DB ≠ CA) ---');
  if (mismatches.length === 0) console.log('None! All matching entries are correct.');
  mismatches.forEach(l => console.log(l));

  console.log('\n--- IN DB BUT NOT IN CA REPORT ---');
  if (notInCA.length === 0) console.log('None.');
  notInCA.forEach(l => console.log(l));

  const remaining = Object.entries(CA_FIGURES);
  console.log('\n--- IN CA REPORT BUT NOT IN DB ---');
  if (remaining.length === 0) console.log('None.');
  remaining.forEach(([name, ca]) => {
    console.log(`❌ ${name}: CA=₹${ca.amount} ${ca.drCr} (${ca.note}) — MISSING from DB`);
  });

  // Balance sheet check
  console.log('\n--- BALANCE SHEET TOTALS ---');
  let totalAssetsDr = 0, totalLiabCr = 0, totalLiabDr = 0;
  for (const b of balances) {
    if (b.category === 'asset') totalAssetsDr += (b.amount || 0);
    else if (b.category === 'liability') {
      if (b.drCr === 'Cr') totalLiabCr += (b.amount || 0);
      else totalLiabDr += (b.amount || 0);
    }
  }
  console.log(`Total Assets (Dr): ₹${totalAssetsDr}`);
  console.log(`Total Liabilities (Cr): ₹${totalLiabCr}`);
  console.log(`Total Liabilities (Dr - losses): ₹${totalLiabDr}`);
  console.log(`Net Liabilities: ₹${totalLiabCr - totalLiabDr}`);
  console.log(`CA Balance Sheet Total: ₹866815`);
  console.log(`Match: ${Math.abs(totalAssetsDr - 866815) < 10 ? '✅' : '❌'} Assets, ${Math.abs((totalLiabCr - totalLiabDr) - 866815) < 10 ? '✅' : '❌'} Liabilities`);

  await client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
