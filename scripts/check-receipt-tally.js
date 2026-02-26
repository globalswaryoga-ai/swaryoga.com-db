require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const v = mongoose.connection.collection('tally_manual_vouchers');

  const receipts = await v.find({ financialYear: '2024-25', voucherType: 'Receipt' }).sort({ date: 1 }).toArray();

  let investTotal = 0, courseTotal = 0, otherTotal = 0;
  let grandTotal = 0;

  console.log('=== ALL RECEIPT VOUCHERS FY 2024-25 ===');
  console.log('');

  for (const r of receipts) {
    const amt = Math.abs(r.amount || 0);
    grandTotal += amt;
    const party = (r.partyName || '').toString();
    const narr = (r.narration || '').toString();
    const combined = (party + ' ' + narr).toLowerCase();
    const isInvest = /invest|capital|share|preference/i.test(combined);
    const isCourse = /course|swar yoga/i.test(combined);

    let type = 'OTHER';
    if (isInvest) { investTotal += amt; type = 'INVEST'; }
    else if (isCourse) { courseTotal += amt; type = 'COURSE'; }
    else { otherTotal += amt; type = 'OTHER'; }

    console.log(
      (r.date || '').padEnd(12) + ' | ' +
      type.padEnd(7) + ' | ' +
      party.substring(0, 30).padEnd(32) + ' | Rs.' +
      amt.toFixed(2).padStart(12) + ' | ' +
      (r.paymentMode || '').padEnd(6) + ' | ' +
      (narr || '').substring(0, 50)
    );
  }

  console.log('');
  console.log('=== TOTALS ===');
  console.log('Investment (Capital):  Rs.' + investTotal.toFixed(2));
  console.log('Course Income:         Rs.' + courseTotal.toFixed(2));
  console.log('Other:                 Rs.' + otherTotal.toFixed(2));
  console.log('GRAND TOTAL (vouchers):Rs.' + grandTotal.toFixed(2));
  console.log('');
  console.log('=== COMPARISON WITH TALLY ===');
  const tallyTotal = 1291896.72;
  console.log('Tally says total:      Rs.' + tallyTotal.toFixed(2));
  console.log('Our voucher total:     Rs.' + grandTotal.toFixed(2));
  console.log('DIFFERENCE:            Rs.' + (tallyTotal - grandTotal).toFixed(2));
  console.log('');
  
  if (Math.abs(tallyTotal - grandTotal) > 1) {
    console.log('⚠️  MISSING RECEIPTS: Rs.' + (tallyTotal - grandTotal).toFixed(2) + ' worth of receipts are NOT in our voucher database');
  } else {
    console.log('✅ Tallies!');
  }

  // Also check: are there any duplicate vouchers?
  console.log('');
  console.log('=== DUPLICATE CHECK ===');
  const seen = {};
  for (const r of receipts) {
    const key = r.date + '|' + r.partyName + '|' + r.amount;
    if (seen[key]) {
      console.log('  DUPLICATE: ' + key);
    }
    seen[key] = (seen[key] || 0) + 1;
  }
  const dups = Object.entries(seen).filter(([k, c]) => c > 1);
  if (dups.length === 0) console.log('  No duplicates found');
  else {
    for (const [k, c] of dups) {
      console.log('  DUPLICATE (' + c + 'x): ' + k);
    }
  }

  await mongoose.disconnect();
}
run();
