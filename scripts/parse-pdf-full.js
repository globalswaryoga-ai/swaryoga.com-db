/**
 * parse-pdf-full.js
 * Extract ALL transactions from PDF bank statement
 * Column positions (x): # ~2, Date ~4, Desc ~7, Chq ~17, Dr ~21-25, Cr ~26-29, Balance ~30-33
 */
const PDFParser = require('pdf2json');
const XLSX = require('xlsx');

const PDF_FILE = '/tmp/bank-statement-decrypted.pdf';
const EXCEL_FILE = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';

function fmt(n) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const pdfParser = new PDFParser();
pdfParser.on('pdfParser_dataError', e => console.error('Error:', e.parserError));

pdfParser.on('pdfParser_dataReady', pdfData => {
  // Extract all text items sorted by page, y, x
  const allItems = [];
  for (let p = 0; p < pdfData.Pages.length; p++) {
    for (const t of (pdfData.Pages[p].Texts || [])) {
      for (const r of (t.R || [])) {
        let txt;
        try { txt = decodeURIComponent(r.T).trim(); } catch(e) { txt = r.T.trim(); }
        if (txt) allItems.push({ page: p + 1, x: t.x, y: t.y, text: txt });
      }
    }
  }

  // Group items by row (same y-coordinate within tolerance of 0.3)
  // First collect all items per page, then group by y
  const transactions = [];
  
  for (let p = 1; p <= pdfData.Pages.length; p++) {
    const pageItems = allItems.filter(i => i.page === p).sort((a, b) => a.y - b.y || a.x - b.x);
    
    // Group by y (tolerance 0.3)
    const rows = [];
    let currentRow = [];
    let currentY = -999;
    
    for (const item of pageItems) {
      if (Math.abs(item.y - currentY) > 0.3) {
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [item];
        currentY = item.y;
      } else {
        currentRow.push(item);
      }
    }
    if (currentRow.length > 0) rows.push(currentRow);
    
    // Process rows to extract transactions
    for (const row of rows) {
      // Check if this row starts with a serial number (at x < 4)
      const serialItem = row.find(i => i.x < 4 && /^\d+$/.test(i.text));
      if (!serialItem) continue; // Not a transaction row
      
      const serial = parseInt(serialItem.text);
      const dateItem = row.find(i => i.x >= 4 && i.x < 7);
      const descItems = row.filter(i => i.x >= 7 && i.x < 16.5);
      const chqItem = row.find(i => i.x >= 16.5 && i.x < 21);
      
      // Amount columns: Dr is at x ~21-26, Cr at x ~26-30, Balance at x ~30-34
      const amountItems = row.filter(i => i.x >= 21 && /^[\d,]+\.\d{2}$/.test(i.text));
      
      let drAmt = null, crAmt = null, balance = null;
      
      for (const ai of amountItems) {
        const val = parseFloat(ai.text.replace(/,/g, ''));
        if (ai.x >= 30) {
          balance = val;
        } else if (ai.x >= 26) {
          crAmt = val;
        } else {
          drAmt = val;
        }
      }
      
      const date = dateItem ? dateItem.text : '';
      const desc = descItems.map(i => i.text).join(' ');
      const chq = chqItem ? chqItem.text : '';
      
      transactions.push({ serial, date, desc, chq, drAmt, crAmt, balance, page: p });
    }
  }
  
  // Sort by serial
  transactions.sort((a, b) => a.serial - b.serial);
  
  // Count and totals
  let drCount = 0, crCount = 0, drTotal = 0, crTotal = 0;
  const drEntries = [];
  const crEntries = [];
  
  for (const t of transactions) {
    if (t.drAmt !== null) {
      drCount++;
      drTotal += t.drAmt;
      drEntries.push(t);
    }
    if (t.crAmt !== null) {
      crCount++;
      crTotal += t.crAmt;
      crEntries.push(t);
    }
  }
  
  console.log(`\n=== PDF BANK STATEMENT EXTRACTION ===`);
  console.log(`Total transactions parsed: ${transactions.length}`);
  console.log(`Dr entries: ${drCount}, Total: ₹${fmt(drTotal)}`);
  console.log(`Cr entries: ${crCount}, Total: ₹${fmt(crTotal)}`);
  console.log(`Expected:   415 Dr = ₹12,85,586.53`);
  console.log(`Expected:   165 Cr = ₹12,91,896.72`);
  console.log(`Dr diff: ${415 - drCount} entries, ₹${fmt(1285586.53 - drTotal)}`);
  console.log(`Cr diff: ${165 - crCount} entries, ₹${fmt(1291896.72 - crTotal)}`);
  
  // ── Now compare with Sheet1 ──
  const wb = XLSX.readFile(EXCEL_FILE, { cellDates: false });
  const ws = wb.Sheets['Sheet1'];
  const excelRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  
  // Build set of Sheet1 chq refs
  const sheet1Chqs = new Set();
  const sheet1Entries = [];
  for (let i = 1; i < excelRows.length; i++) {
    const r = excelRows[i];
    const amtRaw = r[4];
    const chq = String(r[3] || '').trim();
    if (!amtRaw && amtRaw !== 0) continue;
    
    let isDr = false;
    if (typeof amtRaw === 'number') isDr = true;
    else if (typeof amtRaw === 'string') {
      const m = amtRaw.match(/\((Dr|Cr)\)$/i);
      isDr = m && m[1].toLowerCase() === 'dr';
    }
    
    if (isDr && chq) {
      sheet1Chqs.add(chq);
      sheet1Entries.push({ row: i + 1, chq });
    }
  }
  
  // Find PDF Dr entries NOT in Sheet1
  console.log(`\n=== DR ENTRIES IN PDF BUT NOT IN SHEET1 ===`);
  const missing = drEntries.filter(t => !sheet1Chqs.has(t.chq));
  let missingTotal = 0;
  
  if (missing.length === 0) {
    console.log(`All PDF Dr entries found in Sheet1 (by chq ref)`);
    
    // Try matching by amount + partial description
    console.log(`\nTrying serial number gaps...`);
    const pdfSerials = new Set(transactions.map(t => t.serial));
    const maxSerial = Math.max(...pdfSerials);
    const missingSerials = [];
    for (let s = 1; s <= maxSerial; s++) {
      if (!pdfSerials.has(s)) missingSerials.push(s);
    }
    console.log(`Missing serial numbers: ${missingSerials.join(', ')}`);
    console.log(`Total serials: 1–${maxSerial}, parsed: ${pdfSerials.size}`);
  } else {
    for (const t of missing) {
      console.log(`  #${t.serial} | ${t.date} | ₹${fmt(t.drAmt).padStart(12)} | ${t.desc.substring(0, 55)} | ${t.chq}`);
      missingTotal += t.drAmt;
    }
    console.log(`  ──────────────`);
    console.log(`  TOTAL: ${missing.length} entries, ₹${fmt(missingTotal)}`);
    console.log(`  Expected missing: 14 entries, ₹72,049.00`);
  }
  
  // Show serial number range
  const serials = transactions.map(t => t.serial).sort((a, b) => a - b);
  console.log(`\nSerial range: ${serials[0]} – ${serials[serials.length - 1]}`);
  console.log(`Total unique serials: ${new Set(serials).size}`);
});

pdfParser.loadPDF(PDF_FILE);
