/**
 * Parse Kotak Bank statement XLSX to analyze all transactions
 * Run: node scripts/parse-bank-statement.js
 */
const XLSX = require('xlsx');

const wb = XLSX.readFile('/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx');
console.log('Sheets:', wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  Sheet: ${name} — ${data.length} rows`);
  console.log(`${'═'.repeat(80)}`);
  
  // Print all rows
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    // Format for readability
    const parts = row.map((c, idx) => {
      if (c === null || c === undefined) return '';
      let s = String(c).replace(/\r\n/g, ' | ').replace(/\n/g, ' | ');
      if (s.length > 60) s = s.substring(0, 60) + '...';
      return s;
    });
    
    console.log(`  R${String(i).padStart(4)}: ${parts.join(' | ')}`);
  }
}
