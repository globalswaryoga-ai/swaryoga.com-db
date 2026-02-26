/**
 * parse-pdf-bank.js
 * Parse the decrypted PDF bank statement and extract ALL Dr entries
 * Then compare with Sheet1 to find the 14 missing entries
 */
const fs = require('fs');
const pdfParse = require('pdf-parse/lib/pdf-parse.js');
const XLSX = require('xlsx');

const PDF_FILE = '/tmp/bank-statement-decrypted.pdf';
const EXCEL_FILE = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';

function fmt(n) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

async function main() {
  // ── Parse PDF ──
  const dataBuffer = fs.readFileSync(PDF_FILE);
  const data = await pdfParse(dataBuffer);
  
  console.log('PDF pages:', data.numpages);
  
  // Show first 3000 chars to understand format
  const text = data.text;
  console.log('\n=== FIRST 3000 CHARS ===');
  console.log(text.substring(0, 3000));
  
  console.log('\n=== LAST 2000 CHARS ===');
  console.log(text.substring(text.length - 2000));
  
  // Try to find amount patterns like "1,234.56(Dr)" or "1,234.56(Cr)"
  const amtPattern = /([\d,]+\.\d{2})\s*\((Dr|Cr)\)/g;
  let drCount = 0, crCount = 0, drTotal = 0, crTotal = 0;
  let match;
  while ((match = amtPattern.exec(text)) !== null) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    if (match[2] === 'Dr') { drCount++; drTotal += amount; }
    else { crCount++; crTotal += amount; }
  }
  
  console.log(`\n=== PDF AMOUNT SUMMARY ===`);
  console.log(`Dr entries: ${drCount}, Total: ₹${fmt(drTotal)}`);
  console.log(`Cr entries: ${crCount}, Total: ₹${fmt(crTotal)}`);
  console.log(`Expected: 415 Dr = ₹12,85,586.53, 165 Cr = ₹12,91,896.72`);
}

main().catch(console.error);
