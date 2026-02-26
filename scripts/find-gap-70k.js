/**
 * Find the ₹70,000 gap between bank credits and vouchers
 * Bank credits: ₹12,91,896.72; Income+Capital vouchers: ₹12,21,896.72
 */
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb('swaryoga_admin_crm');

  // Parse bank statement credits
  const content = fs.readFileSync('/tmp/bank_statement.txt', 'utf-8');
  const lines = content.split('\n');
  const allTxs = [];
  let currentTx = null;
  
  for (const line of lines) {
    const txMatch = line.match(/^\s*(\d{1,3})\s+(\d{2}\s+\w{3}\s+\d{4})\s+(.+)/);
    if (txMatch) {
      if (currentTx) allTxs.push(currentTx);
      const amounts = [];
      const re = /(\d{1,3}(?:,\d{2,3})*\.\d{2})/g;
      let m;
      while ((m = re.exec(txMatch[3])) !== null) amounts.push(parseFloat(m[1].replace(/,/g, '')));
      currentTx = { serial: parseInt(txMatch[1]), date: txMatch[2].trim(), desc: txMatch[3].split(/\d{1,3}(?:,\d{2,3})*\.\d{2}/)[0].trim(), amounts };
    } else if (currentTx && line.trim()) {
      currentTx.desc += ' ' + line.trim();
    }
  }
  if (currentTx) allTxs.push(currentTx);

  const bankCredits = [];
  const bankDebits = [];
  for (let i = 0; i < allTxs.length; i++) {
    const tx = allTxs[i];
    if (tx.amounts.length < 2) continue;
    const bal = tx.amounts[tx.amounts.length - 1];
    const prevBal = i > 0 ? allTxs[i-1].amounts[allTxs[i-1].amounts.length - 1] : 37440.78;
    const amt = tx.amounts[0];
    if (bal > prevBal) bankCredits.push({ ...tx, amount: amt });
    else bankDebits.push({ ...tx, amount: amt });
  }

  // Get voucher Kotak debits
  const vouchers = await db.collection('acc_vouchers').find({ financialYear: '2024-25' }).toArray();
  const ledgers = await db.collection('acc_ledgers').find({ financialYear: '2024-25' }).toArray();
  const kotak = ledgers.find(l => l.name === 'Kotak Mahindra Bank');
  
  const vKotakDebits = [];
  for (const v of vouchers) {
    for (const e of v.entries) {
      if (e.ledgerId && e.ledgerId.toString() === kotak._id.toString() && e.type === 'DEBIT') {
        vKotakDebits.push({ vn: v.voucherNumber, amount: e.amount, narration: v.narration || '' });
      }
    }
  }

  const bankTotal = bankCredits.reduce((s, c) => s + c.amount, 0);
  const vTotal = vKotakDebits.reduce((s, v) => s + v.amount, 0);
  console.log('Bank Credits:', bankTotal.toFixed(2), '(' + bankCredits.length + ' txns)');
  console.log('Voucher Kotak Dr:', vTotal.toFixed(2), '(' + vKotakDebits.length + ' entries)');
  console.log('Gap:', (bankTotal - vTotal).toFixed(2));

  // Match by amount
  const usedV = new Set();
  const matchedB = new Set();
  for (let i = 0; i < bankCredits.length; i++) {
    for (let j = 0; j < vKotakDebits.length; j++) {
      if (usedV.has(j)) continue;
      if (Math.abs(bankCredits[i].amount - vKotakDebits[j].amount) < 0.01) {
        matchedB.add(i);
        usedV.add(j);
        break;
      }
    }
  }

  console.log('\n=== BANK CREDITS NOT IN VOUCHERS ===');
  let unmatchedBankTotal = 0;
  for (let i = 0; i < bankCredits.length; i++) {
    if (!matchedB.has(i)) {
      const c = bankCredits[i];
      console.log('  #' + c.serial + ' | ' + c.date + ' | Rs ' + c.amount.toFixed(2) + ' | ' + c.desc.substring(0, 80));
      unmatchedBankTotal += c.amount;
    }
  }
  console.log('  TOTAL:', unmatchedBankTotal.toFixed(2));

  console.log('\n=== VOUCHERS NOT IN BANK ===');
  let unmatchedVTotal = 0;
  for (let j = 0; j < vKotakDebits.length; j++) {
    if (!usedV.has(j)) {
      const v = vKotakDebits[j];
      console.log('  ' + v.vn + ' | Rs ' + v.amount.toFixed(2) + ' | ' + v.narration.substring(0, 80));
      unmatchedVTotal += v.amount;
    }
  }
  console.log('  TOTAL:', unmatchedVTotal.toFixed(2));

  // Bank debits summary
  const bankDebitTotal = bankDebits.reduce((s, d) => s + d.amount, 0);
  console.log('\n=== COMPLETE BANK SUMMARY ===');
  console.log('Opening Balance: Rs 37,440.78');
  console.log('Total Deposits (Credits): Rs', bankTotal.toFixed(2));
  console.log('Total Withdrawals (Debits): Rs', bankDebitTotal.toFixed(2));
  console.log('Closing Balance: Rs', (37440.78 + bankTotal - bankDebitTotal).toFixed(2));

  await mongoose.disconnect();
})();
