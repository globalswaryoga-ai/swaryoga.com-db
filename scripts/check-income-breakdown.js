require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const v = mongoose.connection.collection('tally_manual_vouchers');

  const receipts = await v.find({ financialYear: '2024-25', voucherType: 'Receipt' }).sort({ amount: -1 }).toArray();

  let investTotal = 0, courseTotal = 0;
  const investList = [];
  const courseList = [];

  for (const r of receipts) {
    const amt = Math.abs(r.amount || 0);
    const party = (r.partyName || '').toString();
    const ledger = (r.ledgerName || '').toString();
    const narr = (r.narration || '').toString();
    const combined = (party + ' ' + ledger + ' ' + narr).toLowerCase();
    const mode = r.paymentMode || '';
    const isInvest = /invest|capital|loan|share|preference/i.test(combined);

    if (isInvest) {
      investTotal += amt;
      investList.push({ date: r.date, party, ledger, amount: amt, mode, narr });
    } else {
      courseTotal += amt;
      courseList.push({ date: r.date, party, ledger, amount: amt, mode, narr });
    }
  }

  console.log('=== FY 2024-25 RECEIPT BREAKDOWN ===');
  console.log('Total Receipts: Rs.' + (investTotal + courseTotal).toLocaleString('en-IN'));
  console.log('');
  
  console.log('1) INVESTMENT / PREFERENCE SHARE CAPITAL: Rs.' + investTotal.toLocaleString('en-IN'));
  console.log('   Count: ' + investList.length);
  for (const r of investList) {
    console.log('   ' + (r.date||'').padEnd(12) + ' | ' + r.party.substring(0,30).padEnd(32) + ' | Rs.' + r.amount.toLocaleString('en-IN').padStart(10) + ' | ' + r.mode + ' | ' + (r.narr||'').substring(0,40));
  }
  
  console.log('');
  console.log('2) WORKSHOP / COURSE INCOME: Rs.' + courseTotal.toLocaleString('en-IN'));
  console.log('   Count: ' + courseList.length);
  for (const r of courseList) {
    console.log('   ' + (r.date||'').padEnd(12) + ' | ' + r.party.substring(0,30).padEnd(32) + ' | Rs.' + r.amount.toLocaleString('en-IN').padStart(10) + ' | ' + r.mode + ' | ' + (r.narr||'').substring(0,40));
  }

  await mongoose.disconnect();
}
run();
