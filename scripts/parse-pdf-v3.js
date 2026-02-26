/**
 * parse-pdf-v3.js
 * Extract text from PDF using pdf2json's page text elements
 */
const PDFParser = require('pdf2json');
const PDF_FILE = '/tmp/bank-statement-decrypted.pdf';

function fmt(n) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

const pdfParser = new PDFParser();

pdfParser.on('pdfParser_dataError', errData => console.error('Error:', errData.parserError));

pdfParser.on('pdfParser_dataReady', pdfData => {
  console.log('Pages:', pdfData.Pages.length);
  
  // Extract all text items from all pages
  const allItems = [];
  for (let p = 0; p < pdfData.Pages.length; p++) {
    const page = pdfData.Pages[p];
    const texts = page.Texts || [];
    for (const t of texts) {
      const runs = t.R || [];
      for (const r of runs) {
        let txt;
        try { txt = decodeURIComponent(r.T).trim(); } catch(e) { txt = r.T.trim(); }
        if (txt) allItems.push({ page: p + 1, x: t.x, y: t.y, text: txt });
      }
    }
  }
  
  console.log(`Total text items: ${allItems.length}`);
  
  // Show first 50 items from page 1
  console.log('\n=== PAGE 1 — first 50 text items ===');
  const p1items = allItems.filter(i => i.page === 1).sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 0; i < Math.min(50, p1items.length); i++) {
    console.log(`  y=${p1items[i].y.toFixed(1)} x=${p1items[i].x.toFixed(1)}: "${p1items[i].text}"`);
  }
  
  // Show page 2 items (likely has transaction data)
  console.log('\n=== PAGE 2 — first 80 text items ===');
  const p2items = allItems.filter(i => i.page === 2).sort((a, b) => a.y - b.y || a.x - b.x);
  for (let i = 0; i < Math.min(80, p2items.length); i++) {
    console.log(`  y=${p2items[i].y.toFixed(1)} x=${p2items[i].x.toFixed(1)}: "${p2items[i].text}"`);
  }
  
  // Find all text that looks like amounts with Dr/Cr
  const drCrItems = allItems.filter(i => /\(Dr\)|\(Cr\)/i.test(i.text));
  console.log(`\nItems containing (Dr) or (Cr): ${drCrItems.length}`);
  
  // Also just find number patterns
  const amountTexts = allItems.filter(i => /^\d[\d,]*\.\d{2}$/.test(i.text));
  console.log(`Pure amount items (no Dr/Cr suffix): ${amountTexts.length}`);
  
  // Show first 20 Dr/Cr items
  if (drCrItems.length > 0) {
    console.log('\nFirst 20 Dr/Cr items:');
    for (let i = 0; i < Math.min(20, drCrItems.length); i++) {
      console.log(`  p${drCrItems[i].page} y=${drCrItems[i].y.toFixed(1)} x=${drCrItems[i].x.toFixed(1)}: "${drCrItems[i].text}"`);
    }
  }
});

pdfParser.loadPDF(PDF_FILE);
