const XLSX = require('xlsx');
const wb = XLSX.readFile('/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx', { cellDates: false });
const ws = wb.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Check all unique MONTH values
const monthVals = {};
for (let i = 1; i < rows.length; i++) {
  const m = String(rows[i][1] || '').trim();
  if (!monthVals[m]) monthVals[m] = 0;
  monthVals[m]++;
}
console.log('Unique MONTH values:');
for (const [k, v] of Object.entries(monthVals).sort((a, b) => b[1] - a[1])) {
  console.log(`  "${k}": ${v} rows`);
}

// Check rows where month is empty but has data
console.log('\nRows with empty month but has amount:');
let count = 0;
for (let i = 1; i < rows.length; i++) {
  const m = String(rows[i][1] || '').trim();
  const amt = rows[i][4];
  if (!m && amt) {
    count++;
    if (count <= 5) console.log(`  Row ${i+1}: date=${rows[i][0]} amt=${JSON.stringify(amt)} narr=${String(rows[i][2]||'').substring(0,50)}`);
  }
}
console.log(`  Total empty-month rows with data: ${count}`);
