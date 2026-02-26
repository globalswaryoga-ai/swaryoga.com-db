#!/usr/bin/env node
/**
 * Full BS diagnostic and fix for FY 2024-25
 * Step 1: Show 23-24 reference
 * Step 2: Calculate correct 24-25 P&L
 * Step 3: Fix P&L Account, Preference Share Capital, Fees Receivable
 * Step 4: Verify BS balance
 * 
 * Run: node scripts/full-bs-diagnostic.js
 * Fix: FIX=1 node scripts/full-bs-diagnostic.js
 */
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const FIX = process.env.FIX === '1';

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  const bColl = db.collection('tally_manual_balances');

  console.log('═'.repeat(70));
  console.log('  FULL BS DIAGNOSTIC — FY 2024-25' + (FIX ? ' (FIX MODE)' : ''));
  console.log('═'.repeat(70));

  // ─── 1. FY 2023-24 Reference ───
  const entries2324 = await bColl.find({ financialYear: '2023-24' })
    .sort({ category: 1, parentGroup: 1, ledgerName: 1 }).toArray();
  
  console.log('\n── FY 2023-24 BALANCE SHEET (Reference) ──');
  let a23 = 0, l23 = 0, inc23 = 0, exp23 = 0;
  let plAccount23 = null;
  let prefShare23 = 0;
  
  for (const e of entries2324) {
    const amt = Math.abs(e.amount || 0);
    if (e.category === 'asset') {
      const eff = e.drCr === 'Cr' ? -amt : amt;
      a23 += eff;
    } else if (e.category === 'liability') {
      const eff = e.drCr === 'Dr' ? -amt : amt;
      l23 += eff;
      if (/P.*L|Profit.*Loss/i.test(e.ledgerName)) plAccount23 = { amount: amt, drCr: e.drCr, eff: e.drCr === 'Dr' ? -amt : amt };
      if (/Preference.*Share/i.test(e.ledgerName)) prefShare23 = eff;
    } else if (e.category === 'income') inc23 += amt;
    else if (e.category === 'expense') exp23 += amt;
  }
  
  console.log(`  Assets: ${a23}  |  Liabilities: ${l23}  |  Diff: ${a23 - l23}`);
  console.log(`  Income: ${inc23}  |  Expenses: ${exp23}  |  Net P&L: ${inc23 - exp23}`);
  console.log(`  P&L Account (23-24): ${plAccount23 ? `${plAccount23.drCr} ${plAccount23.amount} (eff=${plAccount23.eff})` : 'NOT FOUND'}`);
  console.log(`  Preference Share Capital (23-24): ${prefShare23}`);

  // ─── 2. FY 2024-25 Current State ───
  const entries2425 = await bColl.find({ financialYear: '2024-25' })
    .sort({ category: 1, parentGroup: 1, ledgerName: 1 }).toArray();

  console.log('\n── FY 2024-25 CURRENT STATE ──');
  let a25 = 0, l25 = 0, inc25 = 0, exp25 = 0;
  let plAccount25 = null;
  let plAccountEntry = null;
  let prefShare25 = null;
  let prefShareEntry = null;
  let dividendEntry = null;
  let feesRecEntry = null;
  
  const assetItems = [];
  const liabItems = [];
  const incItems = [];
  const expItems = [];

  for (const e of entries2425) {
    const amt = Math.abs(e.amount || 0);
    if (e.category === 'asset') {
      const eff = e.drCr === 'Cr' ? -amt : amt;
      a25 += eff;
      assetItems.push({ name: e.ledgerName, amt, drCr: e.drCr, eff });
      if (/Fees.*Receiv/i.test(e.ledgerName)) feesRecEntry = e;
    } else if (e.category === 'liability') {
      const eff = e.drCr === 'Dr' ? -amt : amt;
      l25 += eff;
      liabItems.push({ name: e.ledgerName, amt, drCr: e.drCr, eff });
      if (/P.*L|Profit.*Loss/i.test(e.ledgerName)) { plAccount25 = { amount: amt, drCr: e.drCr, eff }; plAccountEntry = e; }
      if (/Preference.*Share/i.test(e.ledgerName)) { prefShare25 = { amount: amt, drCr: e.drCr, eff }; prefShareEntry = e; }
      if (/Dividend/i.test(e.ledgerName)) dividendEntry = e;
    } else if (e.category === 'income') { inc25 += amt; incItems.push({ name: e.ledgerName, amt }); }
    else if (e.category === 'expense') { exp25 += amt; expItems.push({ name: e.ledgerName, amt }); }
  }

  console.log('  ASSETS:');
  for (const a of assetItems) console.log(`    ${a.name.padEnd(35)} ${a.drCr} ${a.amt.toString().padStart(10)} eff=${a.eff}`);
  console.log(`    TOTAL: ${a25}`);
  
  console.log('  LIABILITIES:');
  for (const a of liabItems) console.log(`    ${a.name.padEnd(35)} ${a.drCr} ${a.amt.toString().padStart(10)} eff=${a.eff}`);
  console.log(`    TOTAL: ${l25}`);
  
  console.log('  INCOME:');
  for (const a of incItems) console.log(`    ${a.name.padEnd(35)} Cr ${a.amt.toString().padStart(10)}`);
  console.log(`    TOTAL: ${inc25}`);
  
  console.log('  EXPENSES:');
  for (const a of expItems) console.log(`    ${a.name.padEnd(35)} Dr ${a.amt.toString().padStart(10)}`);
  console.log(`    TOTAL: ${exp25}`);

  // ─── 3. Analysis ───
  console.log('\n── ANALYSIS ──');
  const currentLoss = inc25 - exp25; // negative = loss
  console.log(`  Current P&L: ${inc25} - ${exp25} = ${currentLoss}`);
  
  // P&L Account should be: opening accumulated P&L + current year P&L
  const openingPL = plAccount23 ? plAccount23.eff : 0;
  console.log(`  Opening P&L from 23-24: ${openingPL}`);
  
  const correctPLaccount = openingPL + currentLoss;
  console.log(`  Correct P&L Account for 24-25: ${correctPLaccount}`);
  const currentPLentry = plAccount25 ? plAccount25.eff : 0;
  console.log(`  Current P&L Account entry: ${currentPLentry}`);
  console.log(`  P&L Account adjustment needed: ${correctPLaccount - currentPLentry}`);

  // Preference Share Capital check  
  // 23-24 closing + new investments - dividends = 24-25 closing
  // New investments in 24-25 = ₹8,61,008 (from receipt vouchers)
  const investmentReceipts = await db.collection('tally_manual_vouchers').aggregate([
    { $match: { financialYear: '2024-25', voucherType: 'Receipt', ledgerName: { $nin: ['Course Fees', 'Nepal Dues Received', 'Other Income'] } } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).toArray();
  const newInvestments = investmentReceipts[0]?.total || 0;
  console.log(`\n  New investments in 24-25: ${newInvestments}`);
  
  // Dividends should reduce Pref Share Capital not be expense/liability
  const dividendAmt = dividendEntry ? Math.abs(dividendEntry.amount) : 0;
  console.log(`  Dividends paid: ${dividendAmt}`);
  
  const correctPrefShare = prefShare23 + newInvestments - dividendAmt;
  console.log(`  Correct Pref Share Cap: ${prefShare23} + ${newInvestments} - ${dividendAmt} = ${correctPrefShare}`);
  console.log(`  Current Pref Share Cap: ${prefShare25?.eff || 0}`);
  console.log(`  Adjustment needed: ${correctPrefShare - (prefShare25?.eff || 0)}`);

  // ─── 4. What SHOULD the BS look like? ───
  console.log('\n── CORRECT BALANCE SHEET ──');

  // Remove P&L Account and Dividends from current liabilities, recalculate
  let correctedLiab = 0;
  for (const item of liabItems) {
    if (/P.*L|Profit.*Loss/i.test(item.name) || /Dividend/i.test(item.name)) continue; // skip these
    if (/Preference.*Share/i.test(item.name)) {
      correctedLiab += correctPrefShare;
      console.log(`  [FIX] Pref Share Capital: ${item.eff} → ${correctPrefShare}`);
    } else {
      correctedLiab += item.eff;
    }
  }
  // Add corrected P&L Account
  correctedLiab += correctPLaccount;
  console.log(`  [FIX] P&L Account: ${currentPLentry} → ${correctPLaccount}`);
  // Dividends absorbed into Pref Share Capital, not separate
  console.log(`  [FIX] Dividends entry removed (absorbed into Pref Share Capital)`)

  console.log(`\n  Corrected Assets: ${a25}`);
  console.log(`  Corrected Liabilities: ${correctedLiab}`);
  console.log(`  Difference: ${a25 - correctedLiab}`);

  // ─── 5. Apply Fixes ───
  if (FIX && plAccountEntry) {
    console.log('\n── APPLYING FIXES ──');
    
    // Fix P&L Account
    const newPLamount = Math.abs(correctPLaccount);
    const newPLdrCr = correctPLaccount < 0 ? 'Dr' : 'Cr';
    await bColl.updateOne(
      { _id: plAccountEntry._id },
      { $set: { amount: newPLamount, drCr: newPLdrCr, notes: `Recalculated: Opening(${openingPL}) + Current(${currentLoss})` } }
    );
    console.log(`  ✅ P&L Account: ${plAccountEntry.drCr} ${plAccountEntry.amount} → ${newPLdrCr} ${newPLamount}`);

    // Fix Preference Share Capital
    if (prefShareEntry) {
      const newPrefAmt = Math.abs(correctPrefShare);
      const newPrefDrCr = correctPrefShare >= 0 ? 'Cr' : 'Dr';
      await bColl.updateOne(
        { _id: prefShareEntry._id },
        { $set: { amount: newPrefAmt, drCr: newPrefDrCr, notes: `Opening(${prefShare23}) + Investment(${newInvestments}) - Dividends(${dividendAmt})` } }
      );
      console.log(`  ✅ Pref Share Capital: ${prefShareEntry.drCr} ${prefShareEntry.amount} → ${newPrefDrCr} ${newPrefAmt}`);
    }

    // Remove Dividends Paid entry (absorbed into Pref Share Capital)
    if (dividendEntry) {
      await bColl.deleteOne({ _id: dividendEntry._id });
      console.log(`  ✅ Deleted Dividends Paid entry (absorbed into Pref Share Capital)`);
    }

    // Verify
    const verifyEntries = await bColl.find({ financialYear: '2024-25' }).toArray();
    let vA = 0, vL = 0, vI = 0, vE = 0;
    for (const e of verifyEntries) {
      const amt = Math.abs(e.amount || 0);
      if (e.category === 'asset') vA += e.drCr === 'Cr' ? -amt : amt;
      else if (e.category === 'liability') vL += e.drCr === 'Dr' ? -amt : amt;
      else if (e.category === 'income') vI += amt;
      else if (e.category === 'expense') vE += amt;
    }
    console.log(`\n── VERIFIED BALANCE SHEET ──`);
    console.log(`  Assets: ${vA}  |  Liabilities: ${vL}  |  Diff: ${vA - vL}`);
    console.log(`  Income: ${vI}  |  Expenses: ${vE}  |  P&L: ${vI - vE}`);
  }

  console.log('\n' + '═'.repeat(70));
  await client.close();
}

main().catch(console.error);
