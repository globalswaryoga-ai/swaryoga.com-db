const XLSX = require('xlsx');
const wb = XLSX.readFile('/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx', { cellDates: false });
const ws = wb.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

let numberCount = 0, crStringCount = 0, otherStringCount = 0, emptyCount = 0;
const otherExamples = [];

for (let i = 1; i < rows.length; i++) {
  const amt = rows[i][4];
  if (amt === '' || amt === undefined || amt === null) { emptyCount++; continue; }
  if (typeof amt === 'number') { numberCount++; continue; }
  if (typeof amt === 'string') {
    if (amt.includes('(Cr)')) { crStringCount++; continue; }
    otherStringCount++;
    if (otherExamples.length < 20) {
      otherExamples.push({ row: i+1, amt, narr: String(rows[i][2]||'').substring(0,50), exp: rows[i][5], month: rows[i][1] });
    }
  }
}

console.log('Amount column types:');
console.log('  Plain numbers (Dr):', numberCount);
console.log('  Strings with (Cr):', crStringCount);
console.log('  Other strings:', otherStringCount);
console.log('  Empty:', emptyCount);
console.log('  Total data rows:', numberCount + crStringCount + otherStringCount + emptyCount);

if (otherExamples.length > 0) {
  console.log('\nOther string examples:');
  for (const e of otherExamples) {
    console.log('  Row', e.row, '| month:', e.month, '| amt:', JSON.stringify(e.amt), '| exp:', e.exp);
  }
}

// Show rows 20-40 to see patterns
console.log('\n--- Rows 20-50 raw data ---');
for (let i = 20; i <= 50 && i < rows.length; i++) {
  const r = rows[i];
  if (!r[2] && !r[4]) continue; // skip empty
  console.log(`Row ${i+1}: month=${r[1]} | amt=${JSON.stringify(r[4])} (${typeof r[4]}) | exp=${r[5]} | inc=${r[6]} | narr=${String(r[2]||'').substring(0,40)}`);
}
