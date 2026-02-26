/**
 * find-missing-dr.js
 * Bank says 415 Dr entries = ₹12,85,586.53
 * Sheet1 has 401 Dr entries = ₹12,13,537.53
 * Missing: 14 entries = ₹72,049.00
 *
 * All Cr entries (165 bank says, we got 163) also need checking.
 * Let's look at empty/skipped rows and any rows where amount might be
 * stored differently or lost.
 */
const XLSX = require('xlsx');
const FILE = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';
const wb = XLSX.readFile(FILE, { cellDates: false });
const ws = wb.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

function fmt(n) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// Check ALL rows - what type is each amount cell?
let parsed = { dr_num: 0, dr_str: 0, cr_str: 0, empty: 0, unparsed: 0 };
let drTotal = 0, crTotal = 0;
const unparsedRows = [];
const emptyWithNarration = [];

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const amt = r[4];
  const narr = String(r[2] || '').replace(/\r\n/g, ' ').trim();
  const exp = String(r[5] || '').trim();
  const inc = String(r[6] || '').trim();

  if (amt === '' || amt === undefined || amt === null) {
    parsed.empty++;
    if (narr) emptyWithNarration.push({ row: i + 1, narr: narr.substring(0, 70), exp, inc });
    continue;
  }

  if (typeof amt === 'number') {
    parsed.dr_num++;
    drTotal += amt;
  } else if (typeof amt === 'string') {
    const m = amt.match(/^([\d,]+(?:\.\d+)?)\s*\((Dr|Cr)\)$/i);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ''));
      if (m[2].toLowerCase() === 'dr') {
        parsed.dr_str++;
        drTotal += val;
      } else {
        parsed.cr_str++;
        crTotal += val;
      }
    } else {
      parsed.unparsed++;
      unparsedRows.push({ row: i + 1, amt: JSON.stringify(amt), narr: narr.substring(0, 60), exp, inc });
    }
  }
}

console.log('=== ROW PARSING SUMMARY ===');
console.log(`  Dr (number):  ${parsed.dr_num}`);
console.log(`  Dr (string):  ${parsed.dr_str}`);
console.log(`  Cr (string):  ${parsed.cr_str}`);
console.log(`  Empty:        ${parsed.empty}`);
console.log(`  Unparsed:     ${parsed.unparsed}`);
console.log(`  Total rows:   ${rows.length - 1}`);
console.log(`  Dr count:     ${parsed.dr_num + parsed.dr_str} (bank says 415, diff: ${415 - parsed.dr_num - parsed.dr_str})`);
console.log(`  Cr count:     ${parsed.cr_str} (bank says 165, diff: ${165 - parsed.cr_str})`);
console.log(`  Dr total:     ₹${fmt(drTotal)} (expected: ₹12,85,586.53, diff: ₹${fmt(1285586.53 - drTotal)})`);
console.log(`  Cr total:     ₹${fmt(crTotal)} (expected: ₹12,91,896.72, diff: ₹${fmt(1291896.72 - crTotal)})`);

if (unparsedRows.length > 0) {
  console.log(`\n=== UNPARSED AMOUNT CELLS (${unparsedRows.length}) ===`);
  for (const u of unparsedRows) {
    console.log(`  Row ${u.row}: amt=${u.amt} | narr: ${u.narr} | exp: ${u.exp} | inc: ${u.inc}`);
  }
}

if (emptyWithNarration.length > 0) {
  console.log(`\n=== ROWS WITH NARRATION BUT NO AMOUNT (${emptyWithNarration.length}) ===`);
  for (const e of emptyWithNarration) {
    console.log(`  Row ${e.row}: ${e.narr} | exp: ${e.exp} | inc: ${e.inc}`);
  }
}

// Check if any amounts are in column 5 (EXP) or 6 (INCOME) that look like numbers
console.log(`\n=== CHECK FOR AMOUNTS IN WRONG COLUMNS ===`);
let wrongCol = 0;
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const exp = r[5];
  const inc = r[6];
  // Check if EXP or INCOME column has a number
  if (typeof exp === 'number' && exp > 0) {
    wrongCol++;
    console.log(`  Row ${i+1}: EXP col has number ${exp} | narr: ${String(r[2]||'').substring(0,50)}`);
  }
  if (typeof inc === 'number' && inc > 0) {
    wrongCol++;
    console.log(`  Row ${i+1}: INCOME col has number ${inc} | narr: ${String(r[2]||'').substring(0,50)}`);
  }
}
if (wrongCol === 0) console.log(`  None found.`);
