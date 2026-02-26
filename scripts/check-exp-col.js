/**
 * Show unique EXP column values and how entries are distributed
 */
const XLSX = require('xlsx');
const FILE = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';
const wb = XLSX.readFile(FILE, { cellDates: false, sheetRows: 0 });
const ws = wb.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

const expValues = {};
let drCount = 0;

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const rawAmt = row[4];
  let isDr = false;
  if (typeof rawAmt === 'number' && rawAmt > 0) isDr = true;
  else if (typeof rawAmt === 'string' && rawAmt.match(/\(Dr\)/i)) isDr = true;
  if (!isDr) continue;
  drCount++;

  const exp = (row[5] || '').toString().trim();
  if (!expValues[exp]) expValues[exp] = 0;
  expValues[exp]++;
}

console.log('Total Dr entries:', drCount);
console.log('\nEXP Column Values:');
const sorted = Object.entries(expValues).sort((a,b) => b[1] - a[1]);
for (const [val, count] of sorted) {
  console.log(`  "${val}" → ${count} entries`);
}
