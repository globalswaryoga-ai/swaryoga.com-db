/**
 * tally-expenses-v2.js
 * Parse ALL debit (Dr) entries from bank statement Excel
 * Column format: "amount(Dr)" or "amount(Cr)" in a SINGLE column
 */
const XLSX = require('xlsx');
const path = require('path');

const FILE = '/Users/mohankalburgi/Downloads/02XXXXX457_01-04-2024_31-03-202511111 (2).xlsx';

// Excel serial → JS Date
function excelDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const d = new Date((serial - 25569) * 86400 * 1000);
  return d;
}

function fmtDate(d) {
  if (!d) return '??';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
}

// Parse "10,500.00(Dr)" → { amount: 10500, type: 'Dr' }
function parseAmtCol(val) {
  if (!val || typeof val !== 'string') return null;
  const m = val.match(/^([\d,]+(?:\.\d+)?)\s*\((Dr|Cr)\)$/i);
  if (!m) return null;
  return { amount: parseFloat(m[1].replace(/,/g, '')), type: m[2] };
}

// Categorization rules
const CATEGORIES = [
  // Family / Directors
  { key: 'Mohan Kalburgi (Director)',   test: n => /mohan\s*(pandurang|kalburgi)|9654031327|mohankalburgi/i.test(n) && !/pandurang\s*kalburgi/i.test(n) },
  { key: 'Upamanyu Kalburgi (Director)',test: n => /upamnyu|upamanyu|upamany/i.test(n) },
  { key: 'Laxmi Kalburgi (Teacher)',    test: n => /laxmi\s*(mohan|kalburgi)|laxmikalburgi/i.test(n) },
  { key: 'Turya Kalburgi (Teacher)',    test: n => /turya/i.test(n) },
  { key: 'Pandurang Kalburgi (Expense)',test: n => /pandurang\s*kalburgi|pandurangkalburgi/i.test(n) },

  // Ads
  { key: 'Facebook Ads',  test: n => /facebook|meta\s*ad/i.test(n) },
  { key: 'Google Ads',    test: n => /google\s*(ads|india)/i.test(n) },

  // Software & Subscriptions
  { key: 'Zoom Subscription',  test: n => /zoom/i.test(n) },
  { key: 'Canva Subscription', test: n => /canva/i.test(n) },
  { key: 'Domain & Hosting',   test: n => /domain|hosting|cloudflare|namecheap|godaddy|netlify|vercel/i.test(n) },

  // Amazon
  { key: 'Amazon Purchases', test: n => /amazon/i.test(n) },

  // Travel & Transport
  { key: 'Travel Booking',       test: n => /irctc|makemytrip|redbus|ola|uber|rapido|flight/i.test(n) },
  { key: 'Fuel Expense',         test: n => /petrol|fuel|hp\s*pay|indian\s*oil|bharat\s*petro|bpcl|hindustan\s*petro/i.test(n) },
  { key: 'Vehicle Maintenance',  test: n => /vehicle|garage|tyre|puncture|service\s*center/i.test(n) },

  // Bank charges
  { key: 'Debit Card Fee',   test: n => /debit\s*card|annual\s*fee|card\s*fee/i.test(n) },
  { key: 'Bank Charges',     test: n => /bank\s*charge|service\s*charge|sms\s*alert|gst\s*on\s*chrg/i.test(n) },

  // Telecom
  { key: 'Mobile Recharge', test: n => /jio|airtel|vi\s*prepaid|recharge|vodafone/i.test(n) },

  // Food
  { key: 'Food & Beverages', test: n => /swiggy|zomato|restaurant|food|hotel\s*(food|bill)|mess|canteen/i.test(n) },

  // Medical
  { key: 'Medical Expenses', test: n => /medical|pharma|hospital|clinic|apollo|medplus|doctor/i.test(n) },

  // Govt
  { key: 'Government Fees', test: n => /govt|government|stamp|mca|roc|gst\s*payment|income\s*tax|tds|e-filing/i.test(n) },

  // Printing
  { key: 'Printing & Stationery', test: n => /print|stationery|xerox|copy|paper/i.test(n) },

  // Workshop
  { key: 'Workshop Expenses', test: n => /workshop|event|seminar|venue/i.test(n) },

  // Cash withdrawal
  { key: 'Cash Withdrawal', test: n => /cash\s*wdl|atm\s*wdl|cash\s*withdrawal|neft.*self|atm/i.test(n) },

  // NEFT / Fund Transfer to others
  { key: 'Fund Transfer (Others)', test: n => /neft|imps|rtgs|fund\s*transfer/i.test(n) },
];

function categorize(narration) {
  for (const cat of CATEGORIES) {
    if (cat.test(narration)) return cat.key;
  }
  return 'Uncategorized';
}

// ── main ──
const wb = XLSX.readFile(FILE, { cellDates: false });
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

const debits = [];
let totalDr = 0, totalCr = 0, drCount = 0, crCount = 0;

for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const narration = String(r[1] || '').replace(/\r\n/g, ' ').trim();
  const amtRaw = String(r[4] || '').trim();
  const parsed = parseAmtCol(amtRaw);
  if (!parsed) continue;

  if (parsed.type === 'Dr') {
    drCount++;
    totalDr += parsed.amount;
    const dt = excelDate(r[0]);
    const cat = categorize(narration);
    debits.push({ date: fmtDate(dt), amount: parsed.amount, narration: narration.substring(0, 60), category: cat });
  } else {
    crCount++;
    totalCr += parsed.amount;
  }
}

console.log(`\n=== Bank Statement Summary ===`);
console.log(`Total Cr (Deposits): ${crCount} entries, ₹${totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
console.log(`Total Dr (Withdrawals): ${drCount} entries, ₹${totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);

// ── Category Summary ──
const catTotals = {};
for (const d of debits) {
  if (!catTotals[d.category]) catTotals[d.category] = { count: 0, total: 0, items: [] };
  catTotals[d.category].count++;
  catTotals[d.category].total += d.amount;
  catTotals[d.category].items.push(d);
}

console.log(`\n=== Expense Category Summary ===`);
const sorted = Object.entries(catTotals).sort((a, b) => b[1].total - a[1].total);
let catTotal = 0;
for (const [cat, data] of sorted) {
  console.log(`  ${cat}: ${data.count} entries, ₹${data.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
  catTotal += data.total;
}
console.log(`  ────────────────────────────────`);
console.log(`  TOTAL: ₹${catTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);

// ── Show uncategorized entries ──
if (catTotals['Uncategorized']) {
  console.log(`\n=== Uncategorized Entries (need manual mapping) ===`);
  for (const d of catTotals['Uncategorized'].items) {
    console.log(`  ${d.date} | ₹${d.amount.toLocaleString('en-IN')} | ${d.narration}`);
  }
}
