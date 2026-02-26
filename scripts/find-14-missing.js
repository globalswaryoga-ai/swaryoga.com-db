/**
 * find-14-missing.js
 * Table 1 has only 21 rows (first page of raw bank).
 * Sheet1 has 401 Dr entries = ₹12,13,537.53
 * Bank says 415 Dr = ₹12,85,586.53
 * Missing: 14 entries = ₹72,049.00
 *
 * Strategy: Check the actual cell range in Table 1 - it may have more data.
 * Also check if any rows in Sheet1 have amount=0 or amount in a different cell.
 */
const XLSX = require('xlsx');
const FILE = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';
const wb = XLSX.readFile(FILE, { cellDates: false, sheetRows: 0 });

// Check the actual range of Table 1
const ws1 = wb.Sheets['Table 1'];
console.log('Table 1 ref:', ws1['!ref']);
const rows1 = XLSX.utils.sheet_to_json(ws1, { header: 1, defval: '' });
console.log('Table 1 total rows:', rows1.length);

// Check all sheets for any hidden data
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  console.log(`Sheet "${name}": ref=${ws['!ref']}, rows=${XLSX.utils.sheet_to_json(ws, {header:1}).length}`);
}

// Now let's check Sheet1 more carefully
const ws2 = wb.Sheets['Sheet1'];
const allRows = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: '', raw: true });

console.log('\n=== Sheet1 All Columns Check ===');
console.log('Header row:', JSON.stringify(allRows[0]));
console.log('Total columns in header:', allRows[0].length);

// Check all 9 columns for any data we might have missed
let found = 0;
for (let i = 1; i < allRows.length; i++) {
  const r = allRows[i];
  // Check column 8 (index 8) and beyond for hidden amounts
  for (let c = 8; c < r.length; c++) {
    if (r[c] !== '' && r[c] !== undefined) {
      found++;
      if (found <= 5) console.log(`  Row ${i+1} col ${c}: ${JSON.stringify(r[c])}`);
    }
  }
}
console.log(`Extra data in columns 8+: ${found} cells`);

// Full accounting of ALL rows
console.log('\n=== FULL ROW-BY-ROW ACCOUNTING ===');
let drNum = 0, drStr = 0, crStr = 0, emptyAmt = 0, zeroAmt = 0;
let drNumTotal = 0, drStrTotal = 0, crTotal = 0;
const drNumEntries = [];
const drStrEntries = [];

for (let i = 1; i < allRows.length; i++) {
  const r = allRows[i];
  const amt = r[4];
  const narr = String(r[2] || '').replace(/\r\n/g, ' ').trim();

  if (amt === '' || amt === undefined || amt === null) { emptyAmt++; continue; }
  if (amt === 0) { zeroAmt++; continue; }

  if (typeof amt === 'number') {
    drNum++;
    drNumTotal += amt;
    drNumEntries.push({ row: i+1, amount: amt, narr: narr.substring(0, 60) });
  } else if (typeof amt === 'string') {
    const m = amt.match(/^([\d,]+(?:\.\d+)?)\s*\((Dr|Cr)\)$/i);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (m[2].toLowerCase() === 'dr') {
        drStr++;
        drStrTotal += val;
        drStrEntries.push({ row: i+1, amount: val, narr: narr.substring(0, 60) });
      } else {
        crStr++;
        crTotal += val;
      }
    }
  }
}

console.log(`Plain number Dr:   ${drNum} entries, ₹${drNumTotal.toLocaleString('en-IN', {minimumFractionDigits:2})}`);
console.log(`String "(Dr)":     ${drStr} entries, ₹${drStrTotal.toLocaleString('en-IN', {minimumFractionDigits:2})}`);
console.log(`String "(Cr)":     ${crStr} entries, ₹${crTotal.toLocaleString('en-IN', {minimumFractionDigits:2})}`);
console.log(`Empty amount:      ${emptyAmt}`);
console.log(`Zero amount:       ${zeroAmt}`);
console.log(`\nTotal Dr: ${drNum + drStr} entries, ₹${(drNumTotal + drStrTotal).toLocaleString('en-IN', {minimumFractionDigits:2})}`);
console.log(`Expected: 415 entries, ₹12,85,586.53`);
console.log(`Missing:  ${415 - drNum - drStr} entries, ₹${(1285586.53 - drNumTotal - drStrTotal).toLocaleString('en-IN', {minimumFractionDigits:2})}`);

// List ALL plain number entries (these are the "only amount" Dr entries)
console.log(`\n=== ALL PLAIN NUMBER ENTRIES (${drNum}) ===`);
for (const e of drNumEntries) {
  console.log(`  Row ${e.row} | ₹${e.amount.toLocaleString('en-IN', {minimumFractionDigits:2}).padStart(12)} | ${e.narr}`);
}
