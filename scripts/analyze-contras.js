/**
 * analyze-contras.js
 * Separate real contras (own account transfers) from real expenses
 * UBINX3879 = swar yoga UBI account (own company = CONTRA)
 * UBINX0674 = Upamnyu ka UBI account (director payment)
 */
const XLSX = require('xlsx');
const FILE = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';
const wb = XLSX.readFile(FILE, { cellDates: false });
const ws = wb.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

function fmt(n) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function excelDate(s) { return s && typeof s === 'number' ? new Date((s - 25569) * 86400 * 1000) : null; }
function fmtDate(d) { return d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '??'; }

const debits = [];
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const amtRaw = r[4];
  const narr = String(r[2] || '').replace(/\r\n/g, ' ').trim();
  const exp = String(r[5] || '').trim();
  const dt = excelDate(r[0]);

  if (!amtRaw && amtRaw !== 0) continue;
  let amount = null, isDr = false;
  if (typeof amtRaw === 'number') { amount = amtRaw; isDr = true; }
  else if (typeof amtRaw === 'string') {
    const m = amtRaw.match(/^([\d,]+(?:\.\d+)?)\s*\((Dr|Cr)\)$/i);
    if (m) { amount = parseFloat(m[1].replace(/,/g, '')); isDr = m[2].toLowerCase() === 'dr'; }
  }
  if (amount === null || !isDr) continue;
  debits.push({ row: i + 1, date: fmtDate(dt), amount, narr, exp });
}

// Analyze IMPS to swar yoga UBI account (UBINX3879) = TRUE CONTRA (own account)
console.log('=== TRUE CONTRAS (Kotak → Swar Yoga UBI A/c UBINX3879) ===');
const trueContras = debits.filter(d => /UBINX3879/i.test(d.narr));
let trueContraTotal = 0;
for (const d of trueContras) {
  const purpose = d.narr.match(/\/([\w\s]+)$/)?.[1]?.trim() || '';
  console.log(`  Row ${d.row} | ${d.date} | ₹${fmt(d.amount).padStart(10)} | ${purpose.padEnd(15)} | ${d.narr.substring(0, 65)}`);
  trueContraTotal += d.amount;
}
console.log(`  TOTAL: ${trueContras.length} entries, ₹${fmt(trueContraTotal)}`);

// IMPS to Upamnyu UBI account (UBINX0674) = Director payment
console.log('\n=== UPAMANYU TRANSFERS (Kotak → Upamnyu UBI A/c UBINX0674) ===');
const upamTransfers = debits.filter(d => /UBINX0674/i.test(d.narr));
let upamTotal = 0;
for (const d of upamTransfers) {
  console.log(`  Row ${d.row} | ${d.date} | ₹${fmt(d.amount).padStart(10)} | ${d.narr.substring(0, 65)}`);
  upamTotal += d.amount;
}
console.log(`  TOTAL: ${upamTransfers.length} entries, ₹${fmt(upamTotal)}`);

// IMPS to HDFC accounts = Director/others
console.log('\n=== HDFC TRANSFERS ===');
const hdfcTransfers = debits.filter(d => /HDFCX/i.test(d.narr));
let hdfcTotal = 0;
for (const d of hdfcTransfers) {
  console.log(`  Row ${d.row} | ${d.date} | ₹${fmt(d.amount).padStart(10)} | ${d.narr.substring(0, 65)}`);
  hdfcTotal += d.amount;
}
console.log(`  TOTAL: ${hdfcTransfers.length} entries, ₹${fmt(hdfcTotal)}`);

// Other SentIMPS
console.log('\n=== OTHER IMPS TRANSFERS ===');
const otherIMPS = debits.filter(d => /SentIMPS/i.test(d.narr) && !/UBINX3879|UBINX0674|HDFCX/i.test(d.narr));
let otherTotal = 0;
for (const d of otherIMPS) {
  console.log(`  Row ${d.row} | ${d.date} | ₹${fmt(d.amount).padStart(10)} | ${d.narr.substring(0, 65)}`);
  otherTotal += d.amount;
}
console.log(`  TOTAL: ${otherIMPS.length} entries, ₹${fmt(otherTotal)}`);

// Row 68 - Contra via UPI to Mohan
console.log('\n=== UPI CONTRA ENTRIES ===');
const upiContra = debits.filter(d => /contra/i.test(d.narr) && !/SentIMPS/i.test(d.narr));
for (const d of upiContra) {
  console.log(`  Row ${d.row} | ${d.date} | ₹${fmt(d.amount)} | ${d.narr.substring(0, 65)} | EXP: ${d.exp}`);
}

console.log('\n=== SUMMARY ===');
console.log(`Total Dr entries: ${debits.length}, ₹${fmt(debits.reduce((s, d) => s + d.amount, 0))}`);
console.log(`True Contras (own a/c):     ${trueContras.length} entries, ₹${fmt(trueContraTotal)}`);
console.log(`Upamnyu IMPS:               ${upamTransfers.length} entries, ₹${fmt(upamTotal)}`);
console.log(`HDFC transfers:             ${hdfcTransfers.length} entries, ₹${fmt(hdfcTotal)}`);
console.log(`Other IMPS:                 ${otherIMPS.length} entries, ₹${fmt(otherTotal)}`);
console.log(`UPI Contra:                 ${upiContra.length} entries`);
