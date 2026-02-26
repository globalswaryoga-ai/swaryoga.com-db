/**
 * check-wrong-entries.js
 * Check for entries that might be wrong/shouldn't be expenses:
 * 1. Contra entries (Cash→Bank or Bank→Cash transfers) - NOT expenses
 * 2. Investment returns to same company - NOT expenses
 * 3. Fund transfers to own accounts - NOT expenses  
 * 4. Reversed transactions
 */
const XLSX = require('xlsx');
const FILE = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';
const wb = XLSX.readFile(FILE, { cellDates: false });
const ws = wb.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

function fmt(n) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  return new Date((serial - 25569) * 86400 * 1000);
}
function fmtDate(d) {
  if (!d) return '??';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

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

console.log(`Total Dr entries: ${debits.length}, ₹${fmt(debits.reduce((s, d) => s + d.amount, 0))}`);

// ── Check for CONTRA / own-account transfers ──
console.log(`\n=== CONTRA / OWN-ACCOUNT TRANSFERS (not real expenses) ===`);
const contraPatterns = /swar\s*yoga.*ubinx|contra|kkbktrans|cash\s*wdl/i;
const contras = debits.filter(d => contraPatterns.test(d.narr));
let contraTotal = 0;
for (const d of contras) {
  console.log(`  Row ${d.row} | ${d.date} | ₹${fmt(d.amount).padStart(12)} | ${d.narr.substring(0, 60)} | EXP: ${d.exp}`);
  contraTotal += d.amount;
}
console.log(`  TOTAL: ${contras.length} entries, ₹${fmt(contraTotal)}`);

// ── Check for REVERSED transactions ──
console.log(`\n=== REVERSED TRANSACTIONS ===`);
const revPatterns = /^rev[-\s]*upi|reversal|reversed/i;
const revs = debits.filter(d => revPatterns.test(d.narr));
if (revs.length === 0) console.log(`  None found.`);
else for (const d of revs) console.log(`  Row ${d.row} | ${d.date} | ₹${fmt(d.amount)} | ${d.narr.substring(0, 60)}`);

// ── Show all UNIQUE expense labels and count ──
console.log(`\n=== ALL UNIQUE EXP LABELS ===`);
const expLabels = {};
for (const d of debits) {
  const key = d.exp || '(empty)';
  if (!expLabels[key]) expLabels[key] = { count: 0, total: 0 };
  expLabels[key].count++;
  expLabels[key].total += d.amount;
}
for (const [k, v] of Object.entries(expLabels).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${k.padEnd(40)} ${String(v.count).padStart(4)} entries  ₹${fmt(v.total).padStart(12)}`);
}

// ── Expected vs actual difference analysis ──
const BANK_TOTAL = 1285586.53;
const SHEET_TOTAL = debits.reduce((s, d) => s + d.amount, 0);
console.log(`\n=== RECONCILIATION ===`);
console.log(`Bank statement total (415 Dr):  ₹${fmt(BANK_TOTAL)}`);
console.log(`Sheet1 total (${debits.length} Dr):         ₹${fmt(SHEET_TOTAL)}`);
console.log(`Missing from Sheet1:            ₹${fmt(BANK_TOTAL - SHEET_TOTAL)} (14 entries)`);
console.log(`\nIf we remove Contras (own transfers) from expenses:`);
console.log(`  Contra total:                 ₹${fmt(contraTotal)}`);
console.log(`  Net expenses (Sheet1):        ₹${fmt(SHEET_TOTAL - contraTotal)}`);
console.log(`  Net expenses (with missing):  ₹${fmt(BANK_TOTAL - contraTotal)}`);
