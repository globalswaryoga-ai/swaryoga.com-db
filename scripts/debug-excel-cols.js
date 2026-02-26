/**
 * Debug: check how debit amounts appear in the Excel
 */
const XLSX = require('xlsx');
const filePath = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';
const wb = XLSX.readFile(filePath);

for (const sheetName of wb.SheetNames) {
  const sheet = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('=== Sheet: ' + sheetName + ' ===');
  
  // Find header
  let hIdx = -1;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    const rowStr = row.map(c => String(c || '')).join(' | ');
    if (rowStr.toLowerCase().includes('narration') || rowStr.toLowerCase().includes('description')) {
      hIdx = i;
      console.log('Header row ' + i + ': ' + rowStr);
      break;
    }
  }
  
  if (hIdx < 0) { console.log('No header found\n'); continue; }
  
  // Show first 10 data rows with ALL columns
  console.log('\nFirst 15 data rows:');
  let count = 0;
  for (let i = hIdx + 1; i < data.length && count < 15; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    console.log('Row ' + i + ':');
    for (let j = 0; j < row.length; j++) {
      const hdr = data[hIdx][j] || ('Col' + j);
      console.log('  [' + j + '] ' + hdr + ' = ' + JSON.stringify(row[j]) + ' (type: ' + typeof row[j] + ')');
    }
    count++;
  }
  console.log('');
}
