const XLSX = require('xlsx');
const wb = XLSX.readFile('/Users/mohankalburgi/Downloads/all data.xlsx');

// Print all Day Book rows
const dayBookWs = wb.Sheets['Day Book'];
const dayBook = XLSX.utils.sheet_to_json(dayBookWs, { header: 1, defval: '' });
console.log('=== DAY BOOK (all rows) ===');
dayBook.forEach((row, i) => console.log('R' + i + ':', JSON.stringify(row)));

console.log('\n\n=== LEDGER VOUCHERS (all rows) ===');
const ledgerWs = wb.Sheets['Ledger Vouchers'];
const ledger = XLSX.utils.sheet_to_json(ledgerWs, { header: 1, defval: '' });
ledger.forEach((row, i) => console.log('R' + i + ':', JSON.stringify(row)));
