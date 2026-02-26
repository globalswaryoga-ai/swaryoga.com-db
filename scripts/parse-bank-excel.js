/**
 * Parse bank statement Excel and compare with receipt vouchers
 * to find missing entries for FY 2024-25
 */
require('dotenv').config({ path: '.env.local' });
const XLSX = require('xlsx');
const mongoose = require('mongoose');

const FILE_PATH = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';

async function run() {
  // Step 1: Read Excel
  console.log('Reading Excel file...');
  const workbook = XLSX.readFile(FILE_PATH);
  
  console.log('Sheet names:', workbook.SheetNames);
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`\n=== Sheet: ${sheetName} ===`);
    console.log(`Rows: ${data.length}`);
    
    // Print first 30 rows to understand structure
    const maxRows = Math.min(data.length, 30);
    for (let i = 0; i < maxRows; i++) {
      console.log(`Row ${i}: ${JSON.stringify(data[i])}`);
    }
    
    if (data.length > 30) {
      console.log(`... (${data.length - 30} more rows)`);
      // Print last 5 rows
      for (let i = data.length - 5; i < data.length; i++) {
        console.log(`Row ${i}: ${JSON.stringify(data[i])}`);
      }
    }
  }
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
