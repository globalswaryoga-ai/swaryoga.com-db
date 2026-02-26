/**
 * Find all payments to Mohan, Upamanyu, Laxmi, Turya, Pandurang Kalburgi
 * from bank statement + DB vouchers
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const XLSX = require('xlsx');

async function run() {
  // 1. Parse bank statement for withdrawals
  const filePath = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';
  const wb = XLSX.readFile(filePath);
  
  // Sheet1 has the transactions
  const ws = wb.Sheets['Sheet1'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const names = ['mohan', 'upamanyu', 'laxmi', 'turya', 'pandurang', 'kalburgi'];
  
  console.log('══════════════════════════════════════════════════════════════════════════════');
  console.log('  PAYMENTS TO FAMILY MEMBERS (from Bank Statement)');
  console.log('══════════════════════════════════════════════════════════════════════════════\n');

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row.some(c => String(c).toLowerCase().includes('narration'))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) {
    // Try Table 1 sheet
    const ws2 = wb.Sheets['Table 1'];
    if (ws2) {
      const rows2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
      for (let i = 0; i < rows2.length; i++) {
        if (rows2[i] && rows2[i].some(c => String(c).toLowerCase().includes('narration'))) {
          headerIdx = i;
          break;
        }
      }
    }
  }

  // Parse all sheets to find transactions
  const allTxns = [];
  
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    let hIdx = -1;
    let dateCol = -1, narrCol = -1, debitCol = -1, creditCol = -1, balCol = -1;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row) continue;
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').toLowerCase().trim();
        if (cell.includes('narration') || cell === 'description') {
          hIdx = i;
          narrCol = j;
        }
        if (cell.includes('date') && cell.length < 15) dateCol = j;
        if (cell === 'debit' || cell.includes('withdrawal') || cell.includes('debit')) debitCol = j;
        if (cell === 'credit' || cell.includes('deposit') || cell.includes('credit')) creditCol = j;
        if (cell.includes('balance') || cell.includes('closing')) balCol = j;
      }
      if (hIdx >= 0) break;
    }
    
    if (hIdx < 0) continue;
    
    // Re-scan header row for exact columns
    const hRow = data[hIdx];
    for (let j = 0; j < hRow.length; j++) {
      const h = String(hRow[j] || '').toLowerCase().trim();
      if (h.includes('date')) dateCol = j;
      if (h === 'debit' || h.includes('debit') || h.includes('withdrawal')) debitCol = j;
      if (h === 'credit' || h.includes('credit') || h.includes('deposit')) creditCol = j;
      if (h.includes('narration') || h.includes('description')) narrCol = j;
      if (h.includes('closing') || h.includes('balance')) balCol = j;
    }
    
    for (let i = hIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[dateCol]) continue;
      
      const narr = String(row[narrCol] || '');
      const debit = parseFloat(row[debitCol]) || 0;
      const credit = parseFloat(row[creditCol]) || 0;
      const date = row[dateCol];
      
      if (debit === 0 && credit === 0) continue;
      
      allTxns.push({
        date: date,
        narration: narr,
        debit: debit,
        credit: credit,
        sheet: sheetName
      });
    }
  }

  // Now find family-related transactions
  const people = {
    'Mohan Kalburgi': [],
    'Upamanyu Kalburgi': [],
    'Laxmi': [],
    'Turya': [],
    'Pandurang Kalburgi': []
  };

  for (const txn of allTxns) {
    const narr = txn.narration.toLowerCase();
    
    if (narr.includes('mohan') && !narr.includes('upamanyu') && !narr.includes('turya')) {
      people['Mohan Kalburgi'].push(txn);
    }
    if (narr.includes('upamanyu') || narr.includes('upmanyu') || narr.includes('upamnyu')) {
      people['Upamanyu Kalburgi'].push(txn);
    }
    if (narr.includes('laxmi') || narr.includes('lakshmi')) {
      people['Laxmi'].push(txn);
    }
    if (narr.includes('turya')) {
      people['Turya'].push(txn);
    }
    if (narr.includes('pandurang') || narr.includes('panduranga')) {
      people['Pandurang Kalburgi'].push(txn);
    }
    // Also check kalburgi
    if (narr.includes('kalburgi') && !narr.includes('mohan') && !narr.includes('upamanyu') && 
        !narr.includes('upmanyu') && !narr.includes('upamnyu') && !narr.includes('laxmi') && 
        !narr.includes('turya') && !narr.includes('pandurang')) {
      // Unknown Kalburgi
      if (!people['Other Kalburgi']) people['Other Kalburgi'] = [];
      people['Other Kalburgi'].push(txn);
    }
  }

  let grandTotalDebit = 0;
  let grandTotalCredit = 0;

  for (const [name, txns] of Object.entries(people)) {
    if (txns.length === 0) continue;
    
    console.log('── ' + name.toUpperCase() + ' (' + txns.length + ' entries) ──');
    let totalDebit = 0, totalCredit = 0;
    
    for (const t of txns) {
      const type = t.debit > 0 ? 'PAID' : 'RECEIVED';
      const amt = t.debit > 0 ? t.debit : t.credit;
      console.log('  ' + String(t.date).padEnd(14) + ' | ' + type.padEnd(10) + ' | Rs.' + amt.toLocaleString('en-IN', {minimumFractionDigits: 2}).padStart(12) + ' | ' + t.narration.substring(0, 60));
      totalDebit += t.debit;
      totalCredit += t.credit;
    }
    console.log('  TOTAL PAID:     Rs.' + totalDebit.toLocaleString('en-IN', {minimumFractionDigits: 2}));
    console.log('  TOTAL RECEIVED: Rs.' + totalCredit.toLocaleString('en-IN', {minimumFractionDigits: 2}));
    console.log('  NET PAID:       Rs.' + (totalDebit - totalCredit).toLocaleString('en-IN', {minimumFractionDigits: 2}));
    console.log('');
    grandTotalDebit += totalDebit;
    grandTotalCredit += totalCredit;
  }

  console.log('══════════════════════════════════════════════════════════════════════════════');
  console.log('  GRAND TOTAL PAID to family:     Rs.' + grandTotalDebit.toLocaleString('en-IN', {minimumFractionDigits: 2}));
  console.log('  GRAND TOTAL RECEIVED from family:Rs.' + grandTotalCredit.toLocaleString('en-IN', {minimumFractionDigits: 2}));
  console.log('══════════════════════════════════════════════════════════════════════════════');

  // 2. Also check DB vouchers for these names
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  const v = mongoose.connection.collection('tally_manual_vouchers');

  console.log('\n══════════════════════════════════════════════════════════════════════════════');
  console.log('  PAYMENT VOUCHERS IN DB (FY 24-25)');
  console.log('══════════════════════════════════════════════════════════════════════════════\n');
  
  const payments = await v.find({ financialYear: '2024-25', voucherType: 'Payment' }).toArray();
  for (const p of payments) {
    const narr = (p.narration || p.debitLedger || p.creditLedger || '').toLowerCase();
    const matchesFamily = names.some(n => narr.includes(n));
    const marker = matchesFamily ? '👨‍👩‍👧‍👦' : '  ';
    console.log(marker + ' ' + (p.date || '').padEnd(12) + ' | ' + (p.debitLedger || '').padEnd(30) + ' | ' + (p.creditLedger || '').padEnd(25) + ' | Rs.' + (p.amount || 0).toLocaleString('en-IN') + ' | ' + (p.narration || '').substring(0, 40));
  }

  await mongoose.disconnect();
}
run();
