/**
 * verify-dr-total.js
 * 1. Parse ALL debits from BOTH sheets (Table 1 = raw bank, Sheet1 = user categorized)
 * 2. Find duplicates
 * 3. Find entries in Table 1 missing from Sheet1 (or vice versa)
 * 4. Verify total = ₹12,85,586.53
 */
const XLSX = require('xlsx');

const FILE = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';
const wb = XLSX.readFile(FILE, { cellDates: false });

function fmt(n) { return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  return new Date((serial - 25569) * 86400 * 1000);
}
function fmtDate(d) {
  if (!d) return '??';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

// ═══ PARSE TABLE 1 (Raw bank statement) ═══
const ws1 = wb.Sheets['Table 1'];
const rows1 = XLSX.utils.sheet_to_json(ws1, { header: 1, defval: '' });

const t1Debits = [];
let t1DrTotal = 0, t1CrTotal = 0;

for (let i = 1; i < rows1.length; i++) {
  const r = rows1[i];
  const amtStr = String(r[4] || '').trim();
  const m = amtStr.match(/^([\d,]+(?:\.\d+)?)\s*\((Dr|Cr)\)$/i);
  if (!m) continue;
  const amount = parseFloat(m[1].replace(/,/g, ''));
  const type = m[2];
  const narr = String(r[1] || '').replace(/\r\n/g, ' ').trim();
  const chq = String(r[2] || '').trim();
  const dt = excelDate(r[0]);

  if (type === 'Dr') {
    t1DrTotal += amount;
    t1Debits.push({ row: i + 1, date: fmtDate(dt), amount, narr: narr.substring(0, 65), chq });
  } else {
    t1CrTotal += amount;
  }
}

console.log(`\n═══ TABLE 1 (Raw Bank Statement) ═══`);
console.log(`Total rows: ${rows1.length - 1}`);
console.log(`Dr entries: ${t1Debits.length}, Total: ₹${fmt(t1DrTotal)}`);
console.log(`Cr Total: ₹${fmt(t1CrTotal)}`);

// ═══ PARSE SHEET1 (User categorized) ═══
const ws2 = wb.Sheets['Sheet1'];
const rows2 = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: '' });

const s1Debits = [];
let s1DrTotal = 0, s1CrTotal = 0;

for (let i = 1; i < rows2.length; i++) {
  const r = rows2[i];
  const amtRaw = r[4];
  const narr = String(r[2] || '').replace(/\r\n/g, ' ').trim();
  const chq = String(r[3] || '').trim();
  const dt = excelDate(r[0]);
  const expLabel = String(r[5] || '').trim();

  if (!amtRaw && amtRaw !== 0) continue;

  let amount = null, isDr = false;
  if (typeof amtRaw === 'number') {
    amount = amtRaw; isDr = true;
  } else if (typeof amtRaw === 'string') {
    const m = amtRaw.match(/^([\d,]+(?:\.\d+)?)\s*\((Dr|Cr)\)$/i);
    if (m) {
      amount = parseFloat(m[1].replace(/,/g, ''));
      isDr = m[2].toLowerCase() === 'dr';
    }
  }
  if (amount === null) continue;

  if (isDr) {
    s1DrTotal += amount;
    s1Debits.push({ row: i + 1, date: fmtDate(dt), amount, narr: narr.substring(0, 65), chq, expLabel });
  } else {
    s1CrTotal += amount;
  }
}

console.log(`\n═══ SHEET1 (User Categorized) ═══`);
console.log(`Total rows: ${rows2.length - 1}`);
console.log(`Dr entries: ${s1Debits.length}, Total: ₹${fmt(s1DrTotal)}`);
console.log(`Cr Total: ₹${fmt(s1CrTotal)}`);

// ═══ EXPECTED vs ACTUAL ═══
const EXPECTED = 1285586.53;
console.log(`\n═══ EXPECTED TOTAL ═══`);
console.log(`Expected Dr Total:  ₹${fmt(EXPECTED)}`);
console.log(`Table 1 Dr Total:   ₹${fmt(t1DrTotal)}  (diff: ₹${fmt(t1DrTotal - EXPECTED)})`);
console.log(`Sheet1 Dr Total:    ₹${fmt(s1DrTotal)}  (diff: ₹${fmt(s1DrTotal - EXPECTED)})`);

// ═══ CHECK DUPLICATES in Sheet1 ═══
console.log(`\n═══ DUPLICATE CHECK (Sheet1) ═══`);
const seen = {};
const duplicates = [];
for (const d of s1Debits) {
  const key = `${d.date}|${d.amount}|${d.chq}`;
  if (seen[key]) {
    duplicates.push({ first: seen[key], dup: d });
  } else {
    seen[key] = d;
  }
}
if (duplicates.length === 0) {
  console.log(`No exact duplicates found (matching date + amount + chq ref)`);
} else {
  console.log(`Found ${duplicates.length} potential duplicates:`);
  for (const { first, dup } of duplicates) {
    console.log(`  Row ${first.row} & ${dup.row}: ${first.date} ₹${fmt(first.amount)} | ${first.narr}`);
  }
}

// ═══ CHECK DUPLICATES by narration similarity ═══
console.log(`\n═══ SAME-DATE SAME-AMOUNT PAIRS (possible duplicates) ═══`);
const dayAmtMap = {};
for (const d of s1Debits) {
  const key = `${d.date}|${d.amount}`;
  if (!dayAmtMap[key]) dayAmtMap[key] = [];
  dayAmtMap[key].push(d);
}
let pairCount = 0;
for (const [key, items] of Object.entries(dayAmtMap)) {
  if (items.length > 1) {
    pairCount++;
    console.log(`  ${items[0].date} ₹${fmt(items[0].amount)} — ${items.length} entries:`);
    for (const d of items) {
      console.log(`    Row ${d.row}: ${d.narr} | chq: ${d.chq}`);
    }
  }
}
if (pairCount === 0) console.log(`  None found.`);

// ═══ Find entries in Table 1 NOT in Sheet1 ═══
console.log(`\n═══ ENTRIES IN TABLE 1 BUT NOT IN SHEET1 ═══`);
const s1ChqSet = new Set(s1Debits.map(d => d.chq));
const missing = t1Debits.filter(d => !s1ChqSet.has(d.chq));
if (missing.length === 0) {
  console.log(`All Table 1 entries found in Sheet1`);
} else {
  console.log(`${missing.length} entries missing from Sheet1:`);
  let missingTotal = 0;
  for (const d of missing) {
    console.log(`  Row ${d.row} | ${d.date} | ₹${fmt(d.amount)} | ${d.narr} | ${d.chq}`);
    missingTotal += d.amount;
  }
  console.log(`  Missing total: ₹${fmt(missingTotal)}`);
}

// ═══ TABLE 10 (statement summary) ═══
const ws10 = wb.Sheets['Table 10'];
if (ws10) {
  const rows10 = XLSX.utils.sheet_to_json(ws10, { header: 1, defval: '' });
  console.log(`\n═══ TABLE 10 (Statement Summary) ═══`);
  for (const r of rows10) {
    const vals = r.filter(v => v !== '');
    if (vals.length > 0) console.log(`  ${vals.join(' | ')}`);
  }
}
