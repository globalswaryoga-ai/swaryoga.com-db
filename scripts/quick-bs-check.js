#!/usr/bin/env node
// Quick expense summary - minimal output
const { MongoClient } = require('mongodb');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
  const c = new MongoClient(process.env.MONGODB_URI_MAIN);
  await c.connect();
  const db = c.db('swaryoga_admin_crm');

  const bal = await db.collection('tally_manual_balances').find({ financialYear: '2024-25' }).toArray();
  const exp = bal.filter(b => b.category === 'expense');
  const inc = bal.filter(b => b.category === 'income');
  const assets = bal.filter(b => b.category === 'asset');
  const liab = bal.filter(b => b.category === 'liability');

  console.log('EXPENSES:');
  let eT = 0;
  for (const e of exp) { const a = Math.abs(e.amount||0); eT += a; console.log(`  ${(e.ledgerName||'').padEnd(30)} ${e.drCr} ${a}`); }
  console.log(`  TOTAL: ${eT}`);

  console.log('INCOME:');
  let iT = 0;
  for (const e of inc) { const a = Math.abs(e.amount||0); iT += a; console.log(`  ${(e.ledgerName||'').padEnd(30)} ${e.drCr} ${a}`); }
  console.log(`  TOTAL: ${iT}`);

  console.log('ASSETS:');
  let aT = 0;
  for (const e of assets) {
    const a = e.drCr === 'Cr' ? -Math.abs(e.amount||0) : Math.abs(e.amount||0);
    aT += a; console.log(`  ${(e.ledgerName||'').padEnd(30)} ${e.drCr} ${Math.abs(e.amount||0)}  eff=${a}`);
  }
  console.log(`  TOTAL: ${aT}`);

  console.log('LIABILITIES:');
  let lT = 0;
  for (const e of liab) {
    const a = e.drCr === 'Dr' ? -Math.abs(e.amount||0) : Math.abs(e.amount||0);
    lT += a; console.log(`  ${(e.ledgerName||'').padEnd(30)} ${e.drCr} ${Math.abs(e.amount||0)}  eff=${a}`);
  }
  console.log(`  TOTAL: ${lT}`);

  console.log(`\nP&L: Income ${iT} - Expense ${eT} = ${iT - eT}`);
  console.log(`BS check: Assets ${aT} should = Liab ${lT} + P&L ${iT-eT} = ${lT + iT - eT}`);

  await c.close();
}
main().catch(console.error);
