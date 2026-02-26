/**
 * Summarize payments to Mohan, Upamanyu, Laxmi, Turya, Pandurang from DB vouchers
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const v = mongoose.connection.collection('tally_manual_vouchers');

  const payments = await v.find({ financialYear: '2024-25', voucherType: 'Payment' }).toArray();

  const people = {
    'MOHAN KALBURGI': { txns: [], total: 0 },
    'UPAMANYU KALBURGI': { txns: [], total: 0 },
    'LAXMI': { txns: [], total: 0 },
    'TURYA': { txns: [], total: 0 },
    'PANDURANG': { txns: [], total: 0 }
  };

  for (const p of payments) {
    const narr = ((p.narration || '') + ' ' + (p.debitLedger || '')).toUpperCase();
    
    if (narr.includes('MOHAN PA') || narr.includes('MOHAN KALB') || (narr.includes('MOHAN') && narr.includes('PANDURANG'))) {
      people['MOHAN KALBURGI'].txns.push(p);
      people['MOHAN KALBURGI'].total += p.amount;
    } else if (narr.includes('UPAMANYU') || narr.includes('UPAMNYU') || narr.includes('UPMANYU')) {
      people['UPAMANYU KALBURGI'].txns.push(p);
      people['UPAMANYU KALBURGI'].total += p.amount;
    } else if (narr.includes('LAXMI')) {
      people['LAXMI'].txns.push(p);
      people['LAXMI'].total += p.amount;
    } else if (narr.includes('TURYA')) {
      people['TURYA'].txns.push(p);
      people['TURYA'].total += p.amount;
    } else if (narr.includes('PANDURANG') && !narr.includes('MOHAN')) {
      people['PANDURANG'].txns.push(p);
      people['PANDURANG'].total += p.amount;
    }
  }

  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  FAMILY MEMBER PAYMENTS - FY 2024-25 (from DB Payment Vouchers)');
  console.log('══════════════════════════════════════════════════════════════════════\n');

  let grandTotal = 0;

  for (const [name, data] of Object.entries(people)) {
    if (data.txns.length === 0) {
      console.log('── ' + name + ' ── (No payments found)\n');
      continue;
    }
    
    console.log('── ' + name + ' (' + data.txns.length + ' payments, Total: Rs.' + data.total.toLocaleString('en-IN', {minimumFractionDigits: 2}) + ') ──');
    
    // Group by category/debitLedger
    const byCat = {};
    for (const t of data.txns) {
      const cat = t.debitLedger || t.narration.split('|')[0].replace('[Dr]','').trim().substring(0, 30);
      if (!byCat[cat]) byCat[cat] = { count: 0, total: 0, items: [] };
      byCat[cat].count++;
      byCat[cat].total += t.amount;
      byCat[cat].items.push(t);
    }
    
    for (const [cat, info] of Object.entries(byCat)) {
      console.log('  Category: ' + cat);
      for (const t of info.items) {
        console.log('    ' + (t.date || '').padEnd(12) + ' | Rs.' + t.amount.toLocaleString('en-IN', {minimumFractionDigits: 2}).padStart(12) + ' | ' + (t.narration || '').substring(0, 55));
      }
      console.log('    Subtotal: Rs.' + info.total.toLocaleString('en-IN', {minimumFractionDigits: 2}));
    }
    console.log('');
    grandTotal += data.total;
  }

  console.log('══════════════════════════════════════════════════════════════════════');
  console.log('  GRAND TOTAL PAID TO FAMILY: Rs.' + grandTotal.toLocaleString('en-IN', {minimumFractionDigits: 2}));
  console.log('══════════════════════════════════════════════════════════════════════');

  // Also check: what categories are these booked under?
  console.log('\n── BREAKDOWN BY EXPENSE CATEGORY ──');
  const catTotals = {};
  for (const [name, data] of Object.entries(people)) {
    for (const t of data.txns) {
      const narr = t.narration || '';
      // Extract category from narration like "[Dr] TEACHER REMUNERATION"
      const match = narr.match(/\[Dr\]\s*([^|]+)/);
      const cat = match ? match[1].trim() : (t.debitLedger || 'Unknown');
      if (!catTotals[cat]) catTotals[cat] = { total: 0, people: {} };
      catTotals[cat].total += t.amount;
      if (!catTotals[cat].people[name]) catTotals[cat].people[name] = 0;
      catTotals[cat].people[name] += t.amount;
    }
  }

  for (const [cat, info] of Object.entries(catTotals).sort((a, b) => b[1].total - a[1].total)) {
    console.log('  ' + cat.padEnd(30) + ' Rs.' + info.total.toLocaleString('en-IN', {minimumFractionDigits: 2}).padStart(12));
    for (const [person, amt] of Object.entries(info.people)) {
      console.log('    → ' + person.padEnd(22) + ' Rs.' + amt.toLocaleString('en-IN', {minimumFractionDigits: 2}).padStart(12));
    }
  }

  await mongoose.disconnect();
}
run();
