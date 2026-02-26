/**
 * parse-pdf-v2.js
 * Use pdf2json to parse the decrypted PDF bank statement
 */
const fs = require('fs');
const PDFParser = require('pdf2json');

const PDF_FILE = '/tmp/bank-statement-decrypted.pdf';

function fmt(n) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const pdfParser = new PDFParser();

pdfParser.on('pdfParser_dataError', errData => {
  console.error('PDF Error:', errData.parserError);
});

pdfParser.on('pdfParser_dataReady', pdfData => {
  // Get raw text from all pages
  const allText = pdfParser.getRawTextContent();
  
  console.log('Total pages:', pdfData.Pages.length);
  console.log('\n=== FIRST 4000 CHARS ===');
  console.log(allText.substring(0, 4000));
  
  // Find all amount patterns
  const lines = allText.split('\n');
  console.log(`\nTotal lines: ${lines.length}`);
  
  // Find Dr/Cr amounts
  const amtPattern = /([\d,]+\.\d{2})\s*\((Dr|Cr)\)/g;
  let drCount = 0, crCount = 0, drTotal = 0, crTotal = 0;
  // Track balance entries (they also match the pattern)
  // Balance pattern: amount at end of line after another Dr/Cr amount
  
  let match;
  const fullText = allText;
  const drAmounts = [];
  const crAmounts = [];
  
  while ((match = amtPattern.exec(fullText)) !== null) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    if (match[2] === 'Dr') { 
      drCount++; drTotal += amount; 
      drAmounts.push(amount);
    } else { 
      crCount++; crTotal += amount; 
      crAmounts.push(amount);
    }
  }
  
  console.log(`\n=== RAW AMOUNT COUNT ===`);
  console.log(`Dr: ${drCount}, ₹${fmt(drTotal)}`);
  console.log(`Cr: ${crCount}, ₹${fmt(crTotal)}`);
  console.log(`Expected: 415 Dr = ₹12,85,586.53`);
  console.log(`Expected: 165 Cr = ₹12,91,896.72`);
  
  // Note: the balance column also contains (Cr) values, so Cr count will be higher
  // We need to separate transaction amounts from balance amounts
  // Every transaction line has: Date | Narration | Chq | Amount(Dr/Cr) | Balance(Cr)
  // So balance entries are the EXTRA Cr entries
  
  console.log(`\nExtra Cr (balance column): ${crCount - 165} entries`);
  console.log(`Extra Dr (if any): ${drCount - 415} entries`);
});

pdfParser.loadPDF(PDF_FILE);
