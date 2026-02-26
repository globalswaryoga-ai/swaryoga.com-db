/**
 * tally-expenses-v3.js
 * Parse ALL debit (expense) entries from Sheet1 of bank statement
 * Uses the user's own EXP column for categorization
 * DR entries = plain numbers, CR entries = "amount(Cr)" strings
 */
const XLSX = require('xlsx');

const FILE = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';

function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  return new Date((serial - 25569) * 86400 * 1000);
}
function fmtDate(d) {
  if (!d) return '??';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}
function fmt(n) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

// ── Read Sheet1 ──
const wb = XLSX.readFile(FILE, { cellDates: false });
const ws = wb.Sheets['Sheet1'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Headers: DATE(0), MONTH(1), narration(2), chq(3), amount(4), EXP(5), INCOME DETAILS(6), balance(7)
const debits = [];
const credits = [];
let totalDr = 0, totalCr = 0;

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const amtRaw = r[4];
  const narration = String(r[2] || '').replace(/\r\n/g, ' ').trim();
  const expCat = String(r[5] || '').trim();
  const incomeCat = String(r[6] || '').trim();
  const dt = excelDate(r[0]);
  const month = String(r[1] || '').trim();

  if (!amtRaw && amtRaw !== 0) continue;

  // Detect Dr/Cr and parse amount
  let amount = null, isDr = false, isCr = false;

  if (typeof amtRaw === 'number') {
    // Plain number = always a Debit (checked: EXP column populated, no INCOME column)
    amount = amtRaw;
    isDr = true;
  } else if (typeof amtRaw === 'string') {
    const m = amtRaw.match(/^([\d,]+(?:\.\d+)?)\s*\((Dr|Cr)\)$/i);
    if (m) {
      amount = parseFloat(m[1].replace(/,/g, ''));
      isDr = m[2].toLowerCase() === 'dr';
      isCr = m[2].toLowerCase() === 'cr';
    }
  }

  if (amount === null) continue;

  if (isDr) {
    totalDr += amount;
    debits.push({ date: fmtDate(dt), month, amount, narration: narration.substring(0, 65), expCat });
  } else if (isCr) {
    totalCr += amount;
    credits.push({ date: fmtDate(dt), month, amount, narration: narration.substring(0, 65), incomeCat });
  }
}

console.log(`\n╔══════════════════════════════════════════════════════╗`);
console.log(`║    BANK STATEMENT FY 2024-25 — EXPENSE ANALYSIS     ║`);
console.log(`╠══════════════════════════════════════════════════════╣`);
console.log(`║  Total Credits (Deposits):  ${String(credits.length).padStart(3)} entries  ₹${fmt(totalCr).padStart(14)} ║`);
console.log(`║  Total Debits (Expenses):   ${String(debits.length).padStart(3)} entries  ₹${fmt(totalDr).padStart(14)} ║`);
console.log(`╚══════════════════════════════════════════════════════╝`);

// ── Expense Category Summary (using EXP column) ──
const catMap = {};
for (const d of debits) {
  const cat = d.expCat || 'UNCATEGORIZED';
  if (!catMap[cat]) catMap[cat] = { count: 0, total: 0, items: [] };
  catMap[cat].count++;
  catMap[cat].total += d.amount;
  catMap[cat].items.push(d);
}

const sorted = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);
console.log(`\n=== EXPENSE HEADS (from EXP column) ===`);
console.log(`${'Category'.padEnd(40)} ${'Count'.padStart(5)} ${'Amount (₹)'.padStart(14)}`);
console.log(`${'─'.repeat(40)} ${'─'.repeat(5)} ${'─'.repeat(14)}`);

let runTotal = 0;
for (const [cat, data] of sorted) {
  console.log(`${cat.padEnd(40)} ${String(data.count).padStart(5)} ${fmt(data.total).padStart(14)}`);
  runTotal += data.total;
}
console.log(`${'─'.repeat(40)} ${'─'.repeat(5)} ${'─'.repeat(14)}`);
console.log(`${'GRAND TOTAL'.padEnd(40)} ${String(debits.length).padStart(5)} ${fmt(runTotal).padStart(14)}`);

// ── Monthly breakdown ──
const monthMap = {};
for (const d of debits) {
  if (!monthMap[d.month]) monthMap[d.month] = { count: 0, total: 0 };
  monthMap[d.month].count++;
  monthMap[d.month].total += d.amount;
}
const MONTH_ORDER = ['APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER','JANUARY','FEBRUARY','MARCH'];
console.log(`\n=== MONTHLY EXPENSE TOTALS ===`);
for (const m of MONTH_ORDER) {
  if (monthMap[m]) console.log(`  ${m.padEnd(12)} ${String(monthMap[m].count).padStart(4)} entries  ₹${fmt(monthMap[m].total).padStart(12)}`);
}

// ── Show uncategorized entries ──
if (catMap['UNCATEGORIZED']) {
  console.log(`\n=== UNCATEGORIZED ENTRIES (${catMap['UNCATEGORIZED'].count}) ===`);
  for (const d of catMap['UNCATEGORIZED'].items) {
    console.log(`  ${d.date} | ₹${fmt(d.amount).padStart(10)} | ${d.narration}`);
  }
}

// ── Income summary too ──
const incMap = {};
for (const c of credits) {
  const cat = c.incomeCat || 'UNCATEGORIZED';
  if (!incMap[cat]) incMap[cat] = { count: 0, total: 0 };
  incMap[cat].count++;
  incMap[cat].total += c.amount;
}
console.log(`\n=== INCOME HEADS (from INCOME DETAILS column) ===`);
for (const [cat, data] of Object.entries(incMap).sort((a, b) => b[1].total - a[1].total)) {
  console.log(`  ${cat.padEnd(35)} ${String(data.count).padStart(4)} entries  ₹${fmt(data.total).padStart(12)}`);
}
